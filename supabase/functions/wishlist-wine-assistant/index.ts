import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { INVALID_INPUT_ERROR, validateImagePayload, validateTextPayload } from "../_shared/payload-validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTION_NAME = "wishlist-wine-assistant";
const MAX_IMAGE_SIZE = 1 * 1024 * 1024;
const MAX_QUERY_LENGTH = 10_000;
const MAX_TOTAL_DURATION_MS = 10_000;

type AssistantResult = {
  wine_name: string | null;
  producer: string | null;
  vintage: number | null;
  style: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  target_price: number | null;
  ai_summary: string | null;
  notes: string | null;
  image_url: string | null;
};

async function logAudit(
  userId: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>,
) {
  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: FUNCTION_NAME,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata ?? {},
    });
  } catch (error) {
    console.error("Audit log failed:", error instanceof Error ? error.message : "unknown");
  }
}

function normalizeValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

async function getImageFromOpenFoodFacts(query: string, deadlineAt: number) {
  if (Date.now() > deadlineAt) return null;
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,image_url,image_front_url,categories_tags`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), 2_500);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) return null;

  const data = await response.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  const best = products
    .map((product: Record<string, unknown>) => {
      const productName = String(product.product_name ?? "").toLowerCase();
      const brands = String(product.brands ?? "").toLowerCase();
      const categories = Array.isArray(product.categories_tags) ? product.categories_tags.join(" ").toLowerCase() : "";
      const imageUrl = String(product.image_url ?? product.image_front_url ?? "");
      const score = tokens.reduce((sum, token) => sum + (productName.includes(token) ? 3 : 0) + (brands.includes(token) ? 2 : 0), 0)
        + (/wine|vin|champagne|espumante/.test(categories) ? 2 : 0)
        + (imageUrl ? 2 : 0);

      return { imageUrl, score };
    })
    .filter((product: { imageUrl: string; score: number }) => product.imageUrl && product.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)[0];

  return best?.imageUrl ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const deadlineAt = startTime + MAX_TOTAL_DURATION_MS;
  let userId = "anonymous";

  try {
    const authorization = req.headers.get("Authorization");
    if (Deno.env.get("EDGE_DEBUG") === "true") console.log("AUTH HEADER:", !!authorization);
    if (!authorization) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "AUTH_REQUIRED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization")!,
          },
        },
      },
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error("AUTH ERROR:", error);
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = user.id;

    const rateLimit = await checkRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logAudit(userId, rateLimit.degraded ? 503 : 429, "rate_limited", Date.now() - startTime, {
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
      });
      return new Response(JSON.stringify({
        error: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
        code: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
        retryable: true,
      }), {
        status: rateLimit.degraded ? 503 : 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": rateLimit.degraded ? "30" : "60" },
      });
    }

    if (Date.now() > deadlineAt) {
      return new Response(JSON.stringify({ error: "Tempo excedido", code: "TIMEOUT" }), {
        status: 408,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return new Response(JSON.stringify({ error: INVALID_INPUT_ERROR.message, code: INVALID_INPUT_ERROR.code }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, imageBase64 } = rawBody as Record<string, unknown>;
    const safeQuery = typeof query === "string" ? query.trim() : "";
    if (safeQuery.length > MAX_QUERY_LENGTH) {
      return new Response(JSON.stringify({ error: INVALID_INPUT_ERROR.message, code: INVALID_INPUT_ERROR.code }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!safeQuery && (!imageBase64 || typeof imageBase64 !== "string")) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { reason: "missing_input" });
      return new Response(JSON.stringify({ error: "Informe um texto ou imagem." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof imageBase64 === "string") {
      const validation = validateImagePayload(imageBase64, "image/jpeg", { maxBytes: MAX_IMAGE_SIZE });
      if (!validation.ok) {
        await logAudit(userId, 400, "validation_error", Date.now() - startTime, { reason: validation.reason });
        return new Response(JSON.stringify({
          error: INVALID_INPUT_ERROR.message,
          code: INVALID_INPUT_ERROR.code,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const queryValidation = validateTextPayload(safeQuery, MAX_QUERY_LENGTH);
    if (safeQuery && !queryValidation.ok) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { reason: "query_too_large" });
      return new Response(JSON.stringify({
        error: INVALID_INPUT_ERROR.message,
        code: INVALID_INPUT_ERROR.code,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (Date.now() > deadlineAt) {
      return new Response(JSON.stringify({ error: "Tempo excedido", code: "TIMEOUT" }), {
        status: 408,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeImage = typeof imageBase64 === "string" ? validateImagePayload(imageBase64, "image/jpeg", { maxBytes: MAX_IMAGE_SIZE }) : null;
    const normalizedImageBase64 = safeImage?.ok ? safeImage.base64 : null;
    if (typeof imageBase64 === "string" && !normalizedImageBase64) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { reason: "invalid_image" });
      return new Response(JSON.stringify({ error: INVALID_INPUT_ERROR.message, code: INVALID_INPUT_ERROR.code }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const openaiModel = "gpt-4o-mini";
    console.log(`[wishlist-wine-assistant] openai_key=${maskSecret(openaiKey)} model=${openaiModel}`);
    if (!openaiKey) {
      await logAudit(userId, 500, "internal_error", Date.now() - startTime, { reason: "missing_api_key" });
      return new Response(JSON.stringify({ error: "Erro de configuração do serviço." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages: Array<Record<string, unknown>> = [
      {
        role: "system",
        content: `Você é um especialista em vinhos e assistente de wishlist premium. Receba um texto livre do cliente e, opcionalmente, uma foto do rótulo. Devolva APENAS via tool_call com os campos abaixo. Use null quando não souber com boa confiança.

{
  "wine_name": "Nome principal do vinho",
  "producer": "Vinicola/produtor",
  "vintage": 2020,
  "style": "tinto|branco|rose|espumante|sobremesa|fortificado",
  "country": "Pais em portugues",
  "region": "Regiao",
  "grape": "Uva ou corte",
  "target_price": 199.9,
  "ai_summary": "Resumo curto em portugues explicando por que este vinho e interessante para wishlist",
  "notes": "Frase curta para pre-preencher observacoes do usuario"
}

Regras:
- "style" deve ser: tinto, branco, rose, espumante, sobremesa, fortificado.
- Se o texto vier incompleto, infira apenas o que for razoavelmente confiável.
- Em ai_summary, escreva no máximo 2 frases curtas e elegantes.
- Em notes, escreva algo curto como oportunidade de compra, ocasião de consumo ou diferencial do rótulo.
- Se houver foto, priorize a foto sobre o texto.`,
      },
    ];

    const userContent: Array<Record<string, unknown>> = [];
    if (safeQuery) {
      userContent.push({
        type: "text",
        text: `Texto informado pelo cliente: ${safeQuery}`,
      });
    }
    if (normalizedImageBase64) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${normalizedImageBase64}`,
        },
      });
    }

    messages.push({
      role: "user",
      content: userContent,
    });

    let parsed: Record<string, unknown>;
    {
      const result = await callOpenAIResponses<any>({
        functionName: FUNCTION_NAME,
        requestId: crypto.randomUUID(),
        model: openaiModel,
        timeoutMs: 10_000,
        temperature: 0.2,
        instructions: String(messages[0].content),
        input: [
          {
            role: "user",
            content: userContent.map((part) => {
              if ((part as any).type === "text") {
                return { type: "input_text" as const, text: String((part as any).text ?? "") };
              }
              return { type: "input_image" as const, image_url: String((part as any).image_url?.url ?? ""), detail: "high" as const };
            }).filter((item) => item.type === "input_text" ? (item as any).text.trim().length > 0 : Boolean((item as any).image_url)),
          },
        ],
        schema: {
          type: "object",
          properties: {
            suggestion: {
              type: "object",
              properties: {
                wine_name: { type: "string" },
                producer: { type: "string" },
                vintage: { type: "number" },
                style: { type: "string" },
                country: { type: "string" },
                region: { type: "string" },
                grape: { type: "string" },
                target_price: { type: "number" },
                ai_summary: { type: "string" },
                notes: { type: "string" },
              },
              required: [
                "wine_name",
                "producer",
                "vintage",
                "style",
                "country",
                "region",
                "grape",
                "target_price",
                "ai_summary",
                "notes",
              ],
              additionalProperties: false,
            },
          },
          required: ["suggestion"],
          additionalProperties: false,
        },
        maxOutputTokens: 500,
      });

      if (!result.ok) {
        if (result.status === 429) {
          await logAudit(userId, 429, "ai_error", Date.now() - startTime, { reason: "ai_rate_limit" });
          return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
          });
        }
        if (result.status === 422) {
          await logAudit(userId, 422, "ai_error", Date.now() - startTime, { ai_status: result.status, reason: "invalid_ai_response" });
          return new Response(JSON.stringify({ error: "INVALID_AI_RESPONSE" }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await logAudit(userId, 502, "ai_error", Date.now() - startTime, { ai_status: result.status });
        return new Response(JSON.stringify({ error: "Serviço de IA indisponível." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      parsed = result.parsed;
    }
    const suggestionRaw = (parsed.suggestion ?? {}) as Record<string, unknown>;

    const searchBasis = [normalizeValue(suggestionRaw.wine_name), normalizeValue(suggestionRaw.producer), normalizeValue(suggestionRaw.vintage)]
      .filter(Boolean)
      .join(" ")
      || safeQuery;

    const imageUrl = await getImageFromOpenFoodFacts(searchBasis, deadlineAt);

    const result: AssistantResult = {
      wine_name: normalizeValue(suggestionRaw.wine_name),
      producer: normalizeValue(suggestionRaw.producer),
      vintage: normalizeNumber(suggestionRaw.vintage),
      style: normalizeStyle(suggestionRaw.style),
      country: normalizeValue(suggestionRaw.country),
      region: normalizeValue(suggestionRaw.region),
      grape: normalizeValue(suggestionRaw.grape),
      target_price: normalizeNumber(suggestionRaw.target_price),
      ai_summary: normalizeValue(suggestionRaw.ai_summary),
      notes: normalizeValue(suggestionRaw.notes),
      image_url: imageUrl,
    };

    await logAudit(userId, 200, "success", Date.now() - startTime, {
      query: safeQuery || "image_only",
      found_image: !!imageUrl,
      wine_name: result.wine_name,
    });

    return new Response(JSON.stringify({ suggestion: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Erro interno";
    const isAbort = errMsg.toLowerCase().includes("abort");
    const sanitizedMsg = isAbort
      ? "A análise demorou mais que o esperado. Tente novamente."
      : /api_key|lovable|config|supabase/i.test(errMsg)
        ? "Erro interno no serviço. Tente novamente."
        : errMsg;
    await logAudit(userId, isAbort ? 504 : 500, "internal_error", Date.now() - startTime, { message: errMsg });
    return new Response(JSON.stringify({ error: sanitizedMsg }), {
      status: isAbort ? 504 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
