import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { getCachedAiResponse, setCachedAiResponse, sha256Hex } from "../_shared/ai-cache.ts";
import { bytesFromBase64, detectPdfPageCount, validatePdfPayload } from "../_shared/payload-validation.ts";


const FUNCTION_NAME = "parse-pdf-ocr";
const MAX_PDF_BYTES = 2 * 1024 * 1024;
const MAX_PDF_PAGES = 10;
const MAX_EXTRACTED_TEXT_LENGTH = 5000;
const PROCESSING_TIMEOUT_MS = 10_000;

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...createCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function errorPayload(code: string, message: string, retryable = false) {
  return { success: false, code, message, retryable };
}

async function logAudit(
  userId: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>,
) {
  if (!userId || userId === "anonymous") return;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: FUNCTION_NAME,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] audit_log_failed`, error instanceof Error ? error.message : String(error));
  }
}

function trace(stage: string, metadata?: Record<string, unknown>) {
  console.info(`[AI_PIPELINE] step: ${stage}`, metadata || {});
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/-\n\s*/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function decodePdfString(input: string) {
  return input
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\\/g, "\\")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")");
}

function extractTextFromPdfBytes(bytes: Uint8Array, deadlineAt: number) {
  const binary = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];
  let totalLength = 0;

  const pushChunk = (value: string) => {
    if (!value) return false;
    if (Date.now() > deadlineAt) {
      throw new Error("PDF_TIMEOUT");
    }
    const remaining = MAX_EXTRACTED_TEXT_LENGTH - totalLength;
    if (remaining <= 0) {
      return true;
    }
    const chunk = value.slice(0, remaining);
    chunks.push(chunk);
    totalLength += chunk.length;
    return totalLength >= MAX_EXTRACTED_TEXT_LENGTH;
  };

  const tjRegex = /\((?:\\.|[^\\()])*\)\s*T[Jj]/g;
  for (const match of binary.matchAll(tjRegex)) {
    if (Date.now() > deadlineAt) {
      throw new Error("PDF_TIMEOUT");
    }
    const raw = match[0];
    const textMatch = raw.match(/\(((?:\\.|[^\\()])*)\)\s*T[Jj]/);
    if (textMatch?.[1] && pushChunk(decodePdfString(textMatch[1]))) break;
  }

  const arrayTjRegex = /\[(.*?)\]\s*TJ/gs;
  for (const match of binary.matchAll(arrayTjRegex)) {
    if (Date.now() > deadlineAt) {
      throw new Error("PDF_TIMEOUT");
    }
    const inner = match[1];
    const innerStrings = Array.from(inner.matchAll(/\(((?:\\.|[^\\()])*)\)/g), (m) => decodePdfString(m[1]));
    if (innerStrings.length > 0 && pushChunk(innerStrings.join(" "))) break;
  }

  const text = normalizeText(chunks.join("\n"));
  console.log(`[${FUNCTION_NAME}] extracted_text_length=${text.length}`);
  return text;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let userId = "anonymous";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    await logAudit("anonymous", 401, "unauthorized", Date.now() - startedAt, { request_id: requestId, reason: "missing_authorization", input_size_bytes: 0, error_type: "AUTH_REQUIRED" });
    return jsonResponse(req, { error: "AUTH_REQUIRED" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(req, { error: "CONFIG_ERROR" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    await logAudit("anonymous", 401, "unauthorized", Date.now() - startedAt, { request_id: requestId, reason: "invalid_token", input_size_bytes: 0, error_type: "AUTH_INVALID" });
    return jsonResponse(req, { error: "AUTH_INVALID" }, 401);
  }

  userId = user.id;
  trace("auth_ok", { request_id: requestId, user_id: userId });
  await logAudit(userId, 200, "auth_ok", 0, { request_id: requestId });
  try {
    const body = await req.json().catch(() => ({}));
    const pdfBase64Raw = String(body?.pdfBase64 || body?.base64Pdf || "").trim();
    const fileName = String(body?.fileName || "pdf").trim();
    const mimeType = String(body?.mimeType || "").trim().toLowerCase();
    const inputSizeBytes = bytesFromBase64(pdfBase64Raw).length;
    console.info(`[${FUNCTION_NAME}] request_received`, { request_id: requestId, user_id: userId, fileName, mimeType, input_size_bytes: inputSizeBytes });

    if (mimeType !== "application/pdf") {
      return jsonResponse(req, errorPayload("INVALID_PDF", "Não conseguimos ler este PDF. Tente enviar outro arquivo ou uma foto da carta."), 400);
    }

    const validation = validatePdfPayload(pdfBase64Raw, mimeType, { maxBytes: MAX_PDF_BYTES });
    if (!validation.ok) {
      const code = validation.reason === "payload_too_large"
        ? "PDF_TOO_LARGE"
        : validation.reason === "invalid_base64"
          ? "INVALID_IMAGE_BASE64"
          : validation.reason === "unsupported_mime_type"
            ? "UNSUPPORTED_FILE_TYPE"
            : "INVALID_PDF";
      await logAudit(userId, 400, "invalid_input", Date.now() - startedAt, {
        request_id: requestId,
        fileName,
        reason: validation.reason,
        input_size_bytes: inputSizeBytes,
        error_type: code,
      });
      return jsonResponse(req, errorPayload(
        code,
        code === "PDF_TOO_LARGE"
          ? "O arquivo está muito pesado. Envie uma versão menor."
          : code === "INVALID_IMAGE_BASE64"
            ? "Não conseguimos processar este PDF. O conteúdo enviado parece inválido."
            : code === "UNSUPPORTED_FILE_TYPE"
              ? "Este formato ainda não é suportado. Envie JPG, PNG, PDF ou CSV."
              : "Não conseguimos ler este PDF. Tente enviar outro arquivo ou uma foto da carta.",
      ), code === "PDF_TOO_LARGE" ? 413 : 400);
    }

    const bytes = bytesFromBase64(validation.base64);
    trace("input_validated", { request_id: requestId, fileName, mimeType, input_size_bytes: bytes.length });
    const pageCount = detectPdfPageCount(bytes);
    trace("pages_processed", { request_id: requestId, fileName, pages_processed: typeof pageCount === "number" ? pageCount : null });
    if (typeof pageCount === "number" && pageCount > MAX_PDF_PAGES) {
      await logAudit(userId, 400, "invalid_input", Date.now() - startedAt, {
        request_id: requestId,
        fileName,
        reason: "too_many_pages",
        pages_processed: pageCount,
        input_size_bytes: bytes.length,
        error_type: "PDF_TOO_LARGE",
      });
      return jsonResponse(req, errorPayload("PDF_TOO_LARGE", "O arquivo está muito pesado. Envie uma versão menor."), 413);
    }

    const cacheInput = {
      pdfHash: await sha256Hex(validation.base64),
      mimeType,
      pageCount: typeof pageCount === "number" ? pageCount : null,
    };
    const cached = await getCachedAiResponse<{
      text: string;
      extractedText: string;
      ocrUsed: boolean;
      pageCount: number | null;
      textLength: number;
    }>(FUNCTION_NAME, cacheInput, { userId: user.id });
    if (cached.hit && cached.payload) {
      trace("cache_hit", { request_id: requestId, input_hash: cached.inputHash, fileName });
      await logAudit(userId, 200, "cache_hit", Date.now() - startedAt, {
        request_id: requestId,
        fileName,
        input_size_bytes: bytes.length,
        pages_processed: typeof pageCount === "number" ? pageCount : null,
        cached: true,
        error_type: null,
      });
      return jsonResponse(req, {
        ...cached.payload,
      });
    }
    trace("cache_miss", { request_id: requestId, input_hash: cached.inputHash, degraded: cached.degraded, fileName });

    const rateLimit = await checkRateLimit(user.id, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logAudit(userId, rateLimit.degraded ? 503 : 429, "rate_limited", Date.now() - startedAt, {
        request_id: requestId,
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
        input_size_bytes: bytes.length,
        pages_processed: typeof pageCount === "number" ? pageCount : null,
        error_type: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
      });
      return jsonResponse(req, {
        success: false,
        code: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
        message: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
        requestId,
        retryable: true,
      }, rateLimit.degraded ? 503 : 429);
    }

    const deadlineAt = Date.now() + PROCESSING_TIMEOUT_MS;
    let finalText = "";
    try {
      trace("parse_started", { request_id: requestId, fileName, input_size_bytes: bytes.length, pages_processed: typeof pageCount === "number" ? pageCount : null });
      finalText = extractTextFromPdfBytes(bytes, deadlineAt);
    } catch (error) {
      if (error instanceof Error && error.message === "PDF_TIMEOUT") {
        trace("parse_failed", { request_id: requestId, fileName, reason: "timeout" });
        await logAudit(userId, 408, "fallback_used", Date.now() - startedAt, {
          request_id: requestId,
          fileName,
          step_failed: "timeout",
          input_size_bytes: bytes.length,
          pages_processed: typeof pageCount === "number" ? pageCount : null,
          error_type: "AI_TIMEOUT",
        });
        return jsonResponse(req, errorPayload("AI_TIMEOUT", "A leitura demorou mais que o esperado. Tente novamente.", true), 408);
      }
      trace("parse_failed", { request_id: requestId, fileName, reason: error instanceof Error ? error.message : String(error) });
      throw error;
    }
    if (!finalText || finalText.length < 20) {
      trace("fallback_used", { request_id: requestId, fileName, reason: "empty_extraction" });
      await logAudit(userId, 400, "fallback_used", Date.now() - startedAt, {
        request_id: requestId,
        fileName,
        step_failed: "empty_extraction",
        input_size_bytes: bytes.length,
        pages_processed: typeof pageCount === "number" ? pageCount : null,
        error_type: "PDF_TEXT_EMPTY",
      });
      return jsonResponse(req, errorPayload("PDF_TEXT_EMPTY", "Este PDF parece não ter texto legível. Vamos tentar leitura por imagem."), 422);
    }

    trace("parse_success", {
      request_id: requestId,
      fileName,
      textLength: finalText.length,
      input_size_bytes: bytes.length,
      pages_processed: typeof pageCount === "number" ? pageCount : null,
    });
    await logAudit(userId, 200, "parse_success", Date.now() - startedAt, {
      request_id: requestId,
      fileName,
      input_size_bytes: bytes.length,
      pages_processed: typeof pageCount === "number" ? pageCount : null,
      text_length: finalText.length,
      error_type: null,
    });

    await setCachedAiResponse(FUNCTION_NAME, cacheInput, {
      text: finalText,
      extractedText: finalText,
      ocrUsed: false,
      pageCount: null,
      textLength: finalText.length,
    }, { userId: user.id });

    return jsonResponse(req, {
      text: finalText,
      extractedText: finalText,
      ocrUsed: false,
      pageCount: null,
      textLength: finalText.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao processar PDF.";
    trace("fallback_used", {
      request_id: requestId,
      reason: "internal_error",
      message: String(message).slice(0, 200),
    });
    await logAudit(userId, 500, "fallback_used", Date.now() - startedAt, {
      request_id: requestId,
      step_failed: "internal_error",
      error_code: "PDF_PARSE_FAILED",
      input_size_bytes: 0,
      error_type: "PDF_PARSE_FAILED",
    });
    console.error(`[${FUNCTION_NAME}] error:`, message);
    const lower = message.toLowerCase();
    const code = lower.includes("timeout") ? "AI_TIMEOUT" : lower.includes("invalid") || lower.includes("base64") ? "INVALID_PDF" : "PDF_PARSE_FAILED";
    const status = code === "AI_TIMEOUT" ? 408 : code === "INVALID_PDF" ? 400 : 500;
    return jsonResponse(req, {
      success: false,
      code,
      message: code === "INVALID_PDF"
        ? "Não conseguimos ler este PDF. Tente enviar outro arquivo ou uma foto da carta."
        : code === "AI_TIMEOUT"
          ? "A leitura demorou mais que o esperado. Tente novamente."
          : "Não foi possível ler o PDF. Tente outro arquivo ou uma imagem da carta.",
      retryable: code !== "INVALID_PDF",
    }, status);
  }
});
