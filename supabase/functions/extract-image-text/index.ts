import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";
import { callOpenAIResponses } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNCTION_NAME = "extract-image-text";
const AI_TIMEOUT_MS = 35_000;
const MAX_IMAGE_BASE64_LENGTH = 1_400_000;

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

function normalizeBase64(input: string) {
  const trimmed = input.trim();
  const idx = trimmed.indexOf("base64,");
  if (idx !== -1) return trimmed.slice(idx + "base64,".length).trim();
  return trimmed.replace(/\s+/g, "");
}

function isValidBase64(input: string) {
  const cleaned = input.replace(/\s+/g, "");
  if (!cleaned || cleaned.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) return false;
  try {
    atob(cleaned);
    return true;
  } catch {
    return false;
  }
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
      return jsonResponse(400, { success: false, code: "INVALID_REQUEST", message: "Invalid request payload", requestId, retryable: false });
    }

    const mimeType = parsedBody.data.mimeType || "image/jpeg";
    const fileName = parsedBody.data.fileName || "image";
    const imageBase64 = normalizeBase64(parsedBody.data.imageBase64);
    trace("request_received", {
      request_id: requestId,
      fileName,
      mimeType,
      imageBase64Length: imageBase64.length,
    });

    if (!mimeType.startsWith("image/")) {
      return jsonResponse(400, { success: false, code: "INVALID_IMAGE", message: "Unsupported image format", requestId, retryable: false });
    }
    if (!isValidBase64(imageBase64)) {
      return jsonResponse(400, { success: false, code: "INVALID_IMAGE_BASE64", message: "Invalid image payload", requestId, retryable: false });
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return jsonResponse(413, { success: false, code: "FILE_TOO_LARGE", message: "Image too large", requestId, retryable: false });
    }

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
    return jsonResponse(200, { success: true, text, extractedText: text, requestId });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] fatal_error`, error instanceof Error ? error.message : String(error));
    await logAudit(userId, 500, "fatal_error", Date.now() - startTime, { request_id: requestId, error: error instanceof Error ? error.message : String(error) });
    return jsonResponse(500, { success: false, code: "AI_UNAVAILABLE", message: "O serviço está temporariamente indisponível", requestId, retryable: true });
  }
});
