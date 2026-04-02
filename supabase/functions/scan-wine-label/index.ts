import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 120_000);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB base64
const FUNCTION_NAME = "scan-wine-label";

function normalizeStyle(value: unknown) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!v) return null;
  if (["tinto", "branco", "rose", "espumante", "sobremesa", "fortificado"].includes(v)) return v;
  if (v.includes("ros")) return "rose";
  if (v.includes("spark") || v.includes("espum") || v.includes("champ")) return "espumante";
  if (v.includes("fort") || v.includes("porto") || v.includes("sherry")) return "fortificado";
  if (v.includes("dess") || v.includes("sobrem")) return "sobremesa";
  if (v.includes("white") || v.includes("branc")) return "branco";
  if (v.includes("red") || v.includes("tint")) return "tinto";
  return v;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function logAudit(
  userId: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: FUNCTION_NAME,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata || {},
    });
  } catch (e) {
    console.error("Audit log failed:", e instanceof Error ? e.message : "unknown");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId = "anonymous";

  try {
    // ── JWT Authentication ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = user.id;

    // ── Rate Limiting ──
    if (!checkRateLimit(userId)) {
      await logAudit(userId, 429, "rate_limited", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // ── Input Validation ──
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { reason: "missing_image" });
      return new Response(JSON.stringify({ error: "Imagem não fornecida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (imageBase64.length > MAX_IMAGE_SIZE) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, {
        reason: "image_too_large",
        size_bytes: imageBase64.length,
      });
      return new Response(JSON.stringify({ error: "Imagem muito grande. Máximo 10MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("Missing required API key configuration");
      await logAudit(userId, 500, "internal_error", Date.now() - startTime, { reason: "missing_api_key" });
      return new Response(JSON.stringify({ error: "Erro de configuração do serviço." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em leitura de rótulos de vinho. Analise a imagem do rótulo e extraia o máximo de informações com precisão.

Regras:
- Responda APENAS via tool_call.
- "style" DEVE ser: tinto, branco, rose, espumante, sobremesa, fortificado.
- País em português (França, Itália, Argentina, Portugal, Espanha, Chile etc).
- Se safra for desconhecida, deixe vintage/drink_from/drink_until como null.
- tasting_notes: 1-2 frases curtas em português (perfil esperado).
- food_pairing: 2-3 sugestões em português.
- Leia todo texto visível no rótulo (frente e verso, se aparecer).`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise este rótulo de vinho e extraia todas as informações possíveis.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_wine",
                description: "Extrair dados estruturados de um rótulo de vinho",
                parameters: {
                  type: "object",
                  properties: {
                    wine: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        producer: { type: "string" },
                        vintage: { type: "number" },
                        style: { type: "string" },
                        country: { type: "string" },
                        region: { type: "string" },
                        grape: { type: "string" },
                        food_pairing: { type: "string" },
                        tasting_notes: { type: "string" },
                        cellar_location: { type: "string" },
                        purchase_price: { type: "number" },
                        drink_from: { type: "number" },
                        drink_until: { type: "number" },
                      },
                      required: ["name"],
                    },
                  },
                  required: ["wine"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_wine" } },
          temperature: 0.1,
          max_tokens: 900,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        await logAudit(userId, 429, "ai_error", Date.now() - startTime, { reason: "ai_rate_limit" });
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
      if (response.status === 402) {
        await logAudit(userId, 402, "ai_error", Date.now() - startTime, { reason: "credits_exhausted" });
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI Gateway error:", response.status);
      await logAudit(userId, 502, "ai_error", Date.now() - startTime, { ai_status: response.status });
      return new Response(JSON.stringify({ error: "Serviço de análise indisponível. Tente novamente." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await logAudit(userId, 422, "ai_error", Date.now() - startTime, { reason: "no_tool_call" });
      return new Response(JSON.stringify({ error: "Não foi possível extrair dados do rótulo." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const wine = parsed?.wine ?? {};

    const normalizedWine = {
      name: typeof wine.name === "string" ? wine.name.trim() : null,
      producer: typeof wine.producer === "string" ? wine.producer.trim() : null,
      vintage: normalizeNumber(wine.vintage),
      style: normalizeStyle(wine.style),
      country: typeof wine.country === "string" ? wine.country.trim() : null,
      region: typeof wine.region === "string" ? wine.region.trim() : null,
      grape: typeof wine.grape === "string" ? wine.grape.trim() : null,
      food_pairing: typeof wine.food_pairing === "string" ? wine.food_pairing.trim() : null,
      tasting_notes: typeof wine.tasting_notes === "string" ? wine.tasting_notes.trim() : null,
      cellar_location: typeof wine.cellar_location === "string" ? wine.cellar_location.trim() : null,
      purchase_price: normalizeNumber(wine.purchase_price),
      drink_from: normalizeNumber(wine.drink_from),
      drink_until: normalizeNumber(wine.drink_until),
    };

    await logAudit(userId, 200, "success", Date.now() - startTime, {
      wine_name: normalizedWine.name || "unknown",
    });

    return new Response(JSON.stringify({ wine: normalizedWine }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in scan-wine-label:", error instanceof Error ? error.message : "unknown");
    await logAudit(userId, 500, "internal_error", Date.now() - startTime);
    return new Response(
      JSON.stringify({ error: "Falha ao analisar o rótulo. Tente novamente." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
