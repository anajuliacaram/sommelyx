import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getCachedAiResponse, setCachedAiResponse, sha256Hex } from "../_shared/ai-cache.ts";
import { INVALID_INPUT_ERROR, validateImagePayload, validateTextPayload } from "../_shared/payload-validation.ts";


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
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const deadlineAt = startTime + MAX_TOTAL_DURATION_MS;
  const requestId = req.headers.get("X-Client-Request-Id") || crypto.randomUUID();
  let userId = "anonymous";
  let inputSizeBytes = 0;
  let safeQueryForError = "";
  let hasImageInput = false;

  const errorResponse = (status: number, code: string, message: string, retryable = false) =>
    new Response(JSON.stringify({ success: false, code, message, requestId, retryable }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authorization = req.headers.get("Authorization");
    if (Deno.env.get("EDGE_DEBUG") === "true") console.log("AUTH HEADER:", !!authorization);
    if (!authorization) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        input_size_bytes: 0,
        error_type: "AUTH_REQUIRED",
      });
      return errorResponse(401, "AUTH_REQUIRED", "Sessão expirada. Faça login novamente.");
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
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        input_size_bytes: 0,
        error_type: "AUTH_REQUIRED",
      });
      return errorResponse(401, "AUTH_REQUIRED", "Sessão expirada. Faça login novamente.");
    }

    userId = user.id;

    if (Date.now() > deadlineAt) {
      await logAudit(userId, 408, "fallback_used", Date.now() - startTime, {
        request_id: requestId,
        input_size_bytes: inputSizeBytes,
        error_type: "AI_TIMEOUT",
      });
      return errorResponse(408, "AI_TIMEOUT", "Tempo excedido. Tente novamente.", true);
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return errorResponse(400, INVALID_INPUT_ERROR.code, INVALID_INPUT_ERROR.message);
    }

    const { query, imageBase64 } = rawBody as Record<string, unknown>;
    const safeQuery = typeof query === "string" ? query.trim() : "";
    safeQueryForError = safeQuery;
    hasImageInput = typeof imageBase64 === "string";
    inputSizeBytes =
      new TextEncoder().encode(safeQuery).length +
      (typeof imageBase64 === "string" ? imageBase64.length : 0);
    console.info(`[${FUNCTION_NAME}] request_received`, {
      request_id: requestId,
      user_id: userId,
      input_size_bytes: inputSizeBytes,
      has_image: typeof imageBase64 === "string",
      query_length: safeQuery.length,
      attachment_type: typeof imageBase64 === "string" ? "image/jpeg" : "text",
      ocr_length: safeQuery.length,
      model: "gpt-4o-mini",
      retries: 0,
      timeout_source: "none",
      retryable: false,
    });
    if (safeQuery.length > MAX_QUERY_LENGTH) {
      return errorResponse(400, INVALID_INPUT_ERROR.code, INVALID_INPUT_ERROR.message);
    }

    if (!safeQuery && (!imageBase64 || typeof imageBase64 !== "string")) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, {
        request_id: requestId,
        reason: "missing_input",
        input_size_bytes: inputSizeBytes,
        error_type: "INVALID_INPUT",
      });
      return errorResponse(400, "INVALID_REQUEST", "Informe um texto ou imagem.");
    }

    if (typeof imageBase64 === "string") {
      const validation = validateImagePayload(imageBase64, "image/jpeg", { maxBytes: MAX_IMAGE_SIZE });
      if (!validation.ok) {
        await logAudit(userId, 400, "validation_error", Date.now() - startTime, {
          request_id: requestId,
          reason: validation.reason,
          input_size_bytes: inputSizeBytes,
          error_type: validation.reason === "invalid_base64" ? "INVALID_IMAGE_BASE64" : "INVALID_IMAGE",
        });
        return errorResponse(400, INVALID_INPUT_ERROR.code, INVALID_INPUT_ERROR.message);
      }
    }

    const queryValidation = validateTextPayload(safeQuery, MAX_QUERY_LENGTH);
    if (safeQuery && !queryValidation.ok) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, {
        request_id: requestId,
        reason: "query_too_large",
        input_size_bytes: inputSizeBytes,
        error_type: "INVALID_INPUT",
      });
      return errorResponse(400, INVALID_INPUT_ERROR.code, INVALID_INPUT_ERROR.message);
    }

    if (Date.now() > deadlineAt) {
      return errorResponse(408, "AI_TIMEOUT", "Tempo excedido. Tente novamente.", true);
    }

    const safeImage = typeof imageBase64 === "string" ? validateImagePayload(imageBase64, "image/jpeg", { maxBytes: MAX_IMAGE_SIZE }) : null;
    const normalizedImageBase64 = safeImage?.ok ? safeImage.base64 : null;
    if (typeof imageBase64 === "string" && !normalizedImageBase64) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, {
        request_id: requestId,
        reason: "invalid_image",
        input_size_bytes: inputSizeBytes,
        error_type: "INVALID_IMAGE",
      });
      return errorResponse(400, INVALID_INPUT_ERROR.code, INVALID_INPUT_ERROR.message);
    }

    const cacheInput = {
      query: safeQuery || "",
      imageHash: normalizedImageBase64 ? await sha256Hex(normalizedImageBase64) : null,
    };
    const cached = await getCachedAiResponse<AssistantResult>("wishlist-wine-assistant", cacheInput, { userId });
    if (cached.hit && cached.payload) {
      await logAudit(userId, 200, "cache_hit", Date.now() - startTime, {
        request_id: requestId,
        cached: true,
        input_size_bytes: inputSizeBytes,
        error_type: null,
      });
      return new Response(JSON.stringify(cached.payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimit = await checkRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logAudit(userId, rateLimit.degraded ? 503 : 429, "rate_limited", Date.now() - startTime, {
        request_id: requestId,
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
        input_size_bytes: inputSizeBytes,
        error_type: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
      });
      return new Response(JSON.stringify({
        success: false,
        code: rateLimit.degraded ? "AI_UNAVAILABLE" : "RATE_LIMIT",
        message: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
        requestId,
        retryable: true,
      }), {
        status: rateLimit.degraded ? 503 : 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": rateLimit.degraded ? "30" : "60" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const openaiModel = "gpt-4o-mini";
    console.log(`[wishlist-wine-assistant] request_id=${requestId} openai_key=${maskSecret(openaiKey)} model=${openaiModel} attachment_type=${normalizedImageBase64 ? "image/jpeg" : "text"} ocr_length=${safeQuery.length} retries=0`);
    if (!openaiKey) {
      await logAudit(userId, 500, "internal_error", Date.now() - startTime, {
        request_id: requestId,
        reason: "missing_api_key",
        input_size_bytes: inputSizeBytes,
        error_type: "AI_UNAVAILABLE",
      });
      return errorResponse(500, "AI_UNAVAILABLE", "Serviço de IA indisponível.", true);
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
        requestId,
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
          await logAudit(userId, 429, "ai_error", Date.now() - startTime, {
            request_id: requestId,
            reason: "ai_rate_limit",
            input_size_bytes: inputSizeBytes,
            error_type: "RATE_LIMIT_EXCEEDED",
          });
          return new Response(JSON.stringify({ success: false, code: "RATE_LIMIT", message: "Muitas requisições. Tente novamente em alguns segundos.", requestId, retryable: true }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
          });
        }
        if (result.status === 422) {
          await logAudit(userId, 422, "ai_error", Date.now() - startTime, {
            request_id: requestId,
            ai_status: result.status,
            reason: "invalid_ai_response",
            input_size_bytes: inputSizeBytes,
            error_type: "PARSE_ERROR",
          });
          return errorResponse(422, "PARSE_ERROR", "A resposta da IA veio em um formato inválido. Tente novamente.", true);
        }
        await logAudit(userId, 502, "ai_error", Date.now() - startTime, {
          request_id: requestId,
          ai_status: result.status,
          input_size_bytes: inputSizeBytes,
          error_type: "AI_UNAVAILABLE",
        });
        return errorResponse(result.status === 504 ? 408 : 502, result.status === 504 ? "AI_TIMEOUT" : "AI_UNAVAILABLE", result.status === 504 ? "A análise demorou muito. Tente novamente." : "Serviço de IA indisponível.", true);
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

    await setCachedAiResponse("wishlist-wine-assistant", cacheInput, result, { userId });

    await logAudit(userId, 200, "success", Date.now() - startTime, {
      request_id: requestId,
      query: safeQuery || "image_only",
      found_image: !!imageUrl,
      wine_name: result.wine_name,
      input_size_bytes: inputSizeBytes,
      error_type: null,
    });
    console.log("[wishlist-wine-assistant] success", { request_id: requestId, latency_ms: Date.now() - startTime, found_image: !!imageUrl, retryable: false });

    return new Response(JSON.stringify({ suggestion: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Erro interno";
    const isAbort = errMsg.toLowerCase().includes("abort");
    const sanitizedMsg = isAbort
      ? "A análise demorou mais que o esperado. Tente novamente."
      : "Serviço de IA indisponível. Tente novamente.";
    await logAudit(userId, isAbort ? 504 : 500, "internal_error", Date.now() - startTime, {
      request_id: requestId,
      message: errMsg,
      input_size_bytes: inputSizeBytes,
      error_type: isAbort ? "AI_TIMEOUT" : "AI_UNAVAILABLE",
      has_image_input: hasImageInput,
      query: safeQueryForError || null,
    });
    return errorResponse(isAbort ? 408 : 500, isAbort ? "AI_TIMEOUT" : "AI_UNAVAILABLE", sanitizedMsg, true);
  }
});
