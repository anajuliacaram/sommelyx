import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ABACATEPAY_API = "https://api.abacatepay.com/v2";

const PLAN_CONFIG: Record<string, { productId: string; amount: number; label: string }> = {
  pro: { productId: "prod_sommelyx_pro", amount: 2900, label: "Sommelyx Pro" },
  business: { productId: "prod_sommelyx_business", amount: 5900, label: "Sommelyx Business" },
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

    // ── Create checkout on AbacatePay ──
    const checkoutResponse = await fetch(`${ABACATEPAY_API}/checkouts/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ id: config.productId, quantity: 1 }],
        methods: ["PIX"],
        externalId,
        returnUrl,
        completionUrl,
        metadata: {
          userId,
          plan,
          source: "sommelyx",
        },
      }),
    });

    if (!checkoutResponse.ok) {
      const errText = await checkoutResponse.text();
      console.error("AbacatePay error:", checkoutResponse.status, errText);
      statusCode = 502;
      outcome = "provider_error";
      return jsonResponse({ error: "Erro ao criar checkout. Tente novamente." }, 502);
    }

    const checkoutData = await checkoutResponse.json();
    if (!checkoutData?.success || !checkoutData?.data) {
      statusCode = 502;
      outcome = "provider_error";
      return jsonResponse({ error: "Resposta inesperada do gateway de pagamento." }, 502);
    }

    const bill = checkoutData.data;

    // ── Save payment record ──
    const { error: insertError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        plan,
        status: "pending",
        external_id: externalId,
        provider_id: bill.id,
        provider_url: bill.url,
        amount: config.amount,
        dev_mode: bill.devMode ?? true,
        metadata: { items: bill.items, frequency: "ONE_TIME" },
      });

    if (insertError) {
      console.error("Insert payment error:", insertError);
      statusCode = 500;
      outcome = "internal_error";
      return jsonResponse({ error: "Erro ao registrar pagamento." }, 500);
    }

    return jsonResponse({
      checkoutUrl: bill.url,
      externalId,
      paymentId: bill.id,
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    if (statusCode === 200) statusCode = 500;
    if (outcome === "success") outcome = "internal_error";
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro interno" }, statusCode);
  } finally {
    // ── Audit log ──
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
