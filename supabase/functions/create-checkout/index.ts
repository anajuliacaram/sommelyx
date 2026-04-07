import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── AbacatePay v1 billing endpoint ──
const ABACATEPAY_API = "https://api.abacatepay.com/v1";

const PLAN_CONFIG: Record<string, { externalId: string; name: string; description: string; amount: number; label: string }> = {
  pro: {
    externalId: "prod_sommelyx_pro",
    name: "Sommelyx Pro",
    description: "Plano Pro – garrafas ilimitadas, alertas, insights e exportação CSV.",
    amount: 2900,
    label: "Sommelyx Pro",
  },
  business: {
    externalId: "prod_sommelyx_business",
    name: "Sommelyx Business",
    description: "Plano Business – tudo do Pro + vendas, estoque, relatórios financeiros, curva ABC.",
    amount: 5900,
    label: "Sommelyx Business",
  },
};

const BodySchema = z.object({
  plan: z.enum(["pro", "business"]),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateExternalId(userId: string, plan: string) {
  const ts = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  return `smx_${plan}_${userId.slice(0, 8)}_${ts}_${rand}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "unknown";
  let outcome = "success";
  let statusCode = 200;

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      statusCode = 401;
      outcome = "unauthorized";
      return jsonResponse({ error: "Autenticação necessária" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      statusCode = 401;
      outcome = "unauthorized";
      return jsonResponse({ error: "Sessão inválida" }, 401);
    }
    userId = user.id;

    // ── Validate body ──
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      statusCode = 400;
      outcome = "validation_error";
      return jsonResponse({ error: "Plano inválido" }, 400);
    }

    const { plan } = parsed.data;
    const config = PLAN_CONFIG[plan];

    // ── Check for active pending payment ──
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id, provider_url, status")
      .eq("user_id", userId)
      .eq("plan", plan)
      .eq("status", "pending")
      .maybeSingle();

    if (existing?.provider_url) {
      console.log(`[create-checkout] Reusing pending payment ${existing.id} for user ${userId}`);
      return jsonResponse({
        checkoutUrl: existing.provider_url,
        paymentId: existing.id,
        reused: true,
      });
    }

    // ── API Key ──
    const ABACATEPAY_API_KEY = Deno.env.get("ABACATEPAY_API_KEY");
    if (!ABACATEPAY_API_KEY) {
      statusCode = 500;
      outcome = "internal_error";
      throw new Error("ABACATEPAY_API_KEY not configured");
    }

    // ── Generate external ID ──
    const externalId = generateExternalId(userId, plan);

    // ── Determine URLs ──
    const baseUrl = Deno.env.get("APP_URL") || "https://sommelyx.lovable.app";
    const returnUrl = `${baseUrl}/dashboard/plans`;
    const completionUrl = `${baseUrl}/dashboard/plans?payment=success&plan=${plan}`;

    // ── Build v1 billing payload ──
    const billingPayload = {
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: config.externalId,
          name: config.name,
          description: config.description,
          quantity: 1,
          price: config.amount,
        },
      ],
      returnUrl,
      completionUrl,
    };

    const billingEndpoint = `${ABACATEPAY_API}/billing/create`;

    console.log(`[create-checkout] Calling AbacatePay v1 billing API`);
    console.log(`[create-checkout] Endpoint: ${billingEndpoint}`);
    console.log(`[create-checkout] Payload:`, JSON.stringify({ ...billingPayload, _externalId: externalId, _userId: userId }));

    // ── Create billing on AbacatePay v1 ──
    const billingResponse = await fetch(billingEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(billingPayload),
    });

    const responseText = await billingResponse.text();
    console.log(`[create-checkout] AbacatePay response status: ${billingResponse.status}`);
    console.log(`[create-checkout] AbacatePay response body: ${responseText}`);

    if (!billingResponse.ok) {
      console.error(`[create-checkout] AbacatePay v1 error: ${billingResponse.status} ${responseText}`);
      statusCode = 502;
      outcome = "provider_error";
      return jsonResponse({ error: "Erro ao criar cobrança. Tente novamente." }, 502);
    }

    let billingData: any;
    try {
      billingData = JSON.parse(responseText);
    } catch {
      statusCode = 502;
      outcome = "provider_error";
      return jsonResponse({ error: "Resposta inválida do gateway de pagamento." }, 502);
    }

    // v1 response: { success: true, error: null, data: { id, url, status, devMode, methods, products, frequency, ... } }
    if (!billingData?.success || !billingData?.data) {
      console.error(`[create-checkout] Unexpected v1 response structure:`, JSON.stringify(billingData));
      statusCode = 502;
      outcome = "provider_error";
      return jsonResponse({ error: "Resposta inesperada do gateway de pagamento." }, 502);
    }

    const bill = billingData.data;
    const paymentUrl = bill.url;

    console.log(`[create-checkout] Billing created successfully`);
    console.log(`[create-checkout] Provider ID: ${bill.id}`);
    console.log(`[create-checkout] Payment URL: ${paymentUrl}`);
    console.log(`[create-checkout] Dev mode: ${bill.devMode}`);

    // ── Save payment record ──
    const { error: insertError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        plan,
        status: "pending",
        external_id: externalId,
        provider_id: bill.id,
        provider_url: paymentUrl,
        amount: config.amount,
        dev_mode: bill.devMode ?? true,
        metadata: {
          products: bill.products,
          frequency: bill.frequency ?? "ONE_TIME",
          methods: bill.methods,
          apiVersion: "v1",
        },
      });

    if (insertError) {
      console.error("[create-checkout] Insert payment error:", insertError);
      statusCode = 500;
      outcome = "internal_error";
      return jsonResponse({ error: "Erro ao registrar pagamento." }, 500);
    }

    console.log(`[create-checkout] Payment record saved. externalId=${externalId}`);

    return jsonResponse({
      checkoutUrl: paymentUrl,
      externalId,
      paymentId: bill.id,
    });
  } catch (e) {
    console.error("[create-checkout] error:", e);
    if (statusCode === 200) statusCode = 500;
    if (outcome === "success") outcome = "internal_error";
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro interno" }, statusCode);
  } finally {
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabaseAdmin.from("edge_function_logs").insert({
        function_name: "create-checkout",
        user_id: userId,
        status_code: statusCode,
        outcome,
        duration_ms: Date.now() - startTime,
        metadata: {},
      });
    } catch { /* ignore audit failures */ }
  }
});
