import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";
import { callOpenAIResponses } from "../_shared/openai.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { getCachedAiResponse, setCachedAiResponse, sha256Hex } from "../_shared/ai-cache.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { INVALID_INPUT_ERROR, validateImagePayload } from "../_shared/payload-validation.ts";


const FUNCTION_NAME = "extract-image-text";
const AI_TIMEOUT_MS = 35_000;

const BodySchema = z.object({
  imageBase64: z.string().min(64),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
});

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function trace(stage: string, metadata?: Record<string, unknown>) {
  console.info(`[AI_PIPELINE] step: ${stage}`, metadata || {});
}

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
      metadata: metadata || {},
    });
  } catch {
    // silent
  }
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "unknown";
  const requestId = crypto.randomUUID();

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      await logAudit(userId, 401, "unauthorized", Date.now() - startTime, { request_id: requestId, reason: "missing_authorization" });
      return jsonResponse(401, { success: false, code: "AUTH_REQUIRED", message: "Authorization header missing", requestId, retryable: false });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.id) {
      await logAudit(userId, 401, "unauthorized", Date.now() - startTime, { request_id: requestId, reason: "invalid_token" });
      return jsonResponse(401, { success: false, code: "AUTH_INVALID", message: "Invalid auth token", requestId, retryable: false });
    }

    userId = user.id;
    trace("auth_ok", { request_id: requestId, user_id: userId });

    const rawBody = await req.json().catch(() => null);
    const parsedBody = BodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return jsonResponse(400, { success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message, requestId, retryable: false });
    }

    const fileName = parsedBody.data.fileName || "image";
    const validation = validateImagePayload(parsedBody.data.imageBase64, parsedBody.data.mimeType || "image/jpeg", { maxBytes: 1 * 1024 * 1024 });
    if (!validation.ok) {
      await logAudit(userId, 400, "invalid_input", Date.now() - startTime, {
        request_id: requestId,
        fileName,
        reason: validation.reason,
      });
      return jsonResponse(400, {
        success: false,
        code: INVALID_INPUT_ERROR.code,
        message: INVALID_INPUT_ERROR.message,
        requestId,
        retryable: false,
      });
    }

    const mimeType = validation.mimeType;
    const imageBase64 = validation.base64;
    const cacheInput = {
      imageHash: await sha256Hex(imageBase64),
      mimeType,
    };
    const cached = await getCachedAiResponse<{ text: string }>(FUNCTION_NAME, cacheInput);
    if (cached.hit && cached.payload) {
      trace("ocr_cache_hit", { request_id: requestId, fileName, inputHash: cached.inputHash });
      await logAudit(userId, 200, "cache_hit", Date.now() - startTime, { request_id: requestId, fileName, mimeType, cached: true });
      return jsonResponse(200, { success: true, text: cached.payload.text, extractedText: cached.payload.text, requestId });
    }
    trace("ocr_cache_miss", { request_id: requestId, fileName, inputHash: cached.inputHash, degraded: cached.degraded });

    const rateLimit = await checkRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logAudit(userId, 429, "rate_limited", Date.now() - startTime, {
        request_id: requestId,
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
      });
      return jsonResponse(rateLimit.degraded ? 503 : 429, {
        success: false,
        code: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
        message: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
        requestId,
        retryable: true,
      });
    }

    trace("request_received", {
      request_id: requestId,
      fileName,
      mimeType,
      imageBase64Length: imageBase64.length,
    });

    trace("image_ocr_started", { request_id: requestId, fileName, mimeType });

    const systemPrompt = `Você é um OCR especializado em cartas de vinhos e menus.
Transcreva fielmente todo texto legível da imagem.
Regras:
- preserve nomes próprios, preços e quebras de linha relevantes
- não invente texto
- não resuma
- se algum trecho estiver ilegível, omita-o
- responda apenas com JSON válido no schema solicitado`;

    const userPrompt = `Extraia o texto visível da imagem anexada. Nome do arquivo: ${fileName}.`;

    const result = await callOpenAIResponses<{ text: string }>({
      functionName: FUNCTION_NAME,
      requestId,
      apiKey: Deno.env.get("OPENAI_API_KEY") || undefined,
      model: Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini",
      timeoutMs: AI_TIMEOUT_MS,
      temperature: 0,
      instructions: systemPrompt,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: userPrompt },
          { type: "input_image", image_url: `data:${mimeType};base64,${imageBase64}`, detail: "high" as const },
        ],
      }],
      schema: {
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
        additionalProperties: false,
      },
      maxOutputTokens: 1200,
    });

    if (!result.ok) {
      const code = result.status === 504 ? "AI_TIMEOUT" : "AI_UNAVAILABLE";
      trace("ocr_failed", { request_id: requestId, fileName, status: result.status, error: result.error });
      await logAudit(userId, result.status, code, Date.now() - startTime, { request_id: requestId, fileName, mimeType, error: result.error });
      return jsonResponse(result.status === 504 ? 408 : 502, {
        success: false,
        code,
        message: result.status === 504 ? "Tempo excedido" : "O serviço está temporariamente indisponível",
        requestId,
        retryable: true,
      });
    }

    const text = String(result.parsed?.text || "").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    trace("image_ocr_success", { request_id: requestId, fileName, textLength: text.length });

    if (!text) {
      await logAudit(userId, 422, "image_ocr_empty", Date.now() - startTime, { request_id: requestId, fileName, mimeType });
      return jsonResponse(422, {
        success: false,
        code: "IMAGE_OCR_EMPTY",
        message: "Não foi possível ler a imagem. Tente uma foto mais nítida ou um PDF.",
        requestId,
        retryable: false,
      });
    }

    await logAudit(userId, 200, "success", Date.now() - startTime, { request_id: requestId, fileName, mimeType, textLength: text.length });
    await setCachedAiResponse(FUNCTION_NAME, cacheInput, { text });
    return jsonResponse(200, { success: true, text, extractedText: text, requestId });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] fatal_error`, error instanceof Error ? error.message : String(error));
    await logAudit(userId, 500, "fatal_error", Date.now() - startTime, { request_id: requestId, error: error instanceof Error ? error.message : String(error) });
    return jsonResponse(500, { success: false, code: "AI_UNAVAILABLE", message: "O serviço está temporariamente indisponível", requestId, retryable: true });
  }
});
