import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { INVALID_INPUT_ERROR, bytesFromBase64, detectPdfPageCount, validatePdfPayload } from "../_shared/payload-validation.ts";


const FUNCTION_NAME = "parse-pdf-ocr";
const MAX_PDF_BYTES = 2 * 1024 * 1024;
const MAX_PDF_PAGES = 10;
const MAX_EXTRACTED_TEXT_LENGTH = 5000;
const PROCESSING_TIMEOUT_MS = 10_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "AUTH_REQUIRED" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "CONFIG_ERROR" }, 500);
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
    return jsonResponse({ error: "AUTH_INVALID" }, 401);
  }

  const requestId = crypto.randomUUID();
  const rateLimit = await checkRateLimit(user.id, FUNCTION_NAME);
  if (!rateLimit.allowed) {
    return jsonResponse({
      success: false,
      code: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
      message: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
      requestId,
      retryable: true,
    }, rateLimit.degraded ? 503 : 429);
  }

  const startedAt = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const pdfBase64Raw = String(body?.pdfBase64 || body?.base64Pdf || "").trim();
    const fileName = String(body?.fileName || "pdf").trim();
    const mimeType = String(body?.mimeType || "").trim().toLowerCase();

    if (mimeType !== "application/pdf") {
      return jsonResponse({ success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message }, 400);
    }

    const validation = validatePdfPayload(pdfBase64Raw, mimeType, { maxBytes: MAX_PDF_BYTES });
    if (!validation.ok) {
      return jsonResponse({ success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message }, 400);
    }

    const bytes = bytesFromBase64(validation.base64);
    console.log(`[${FUNCTION_NAME}] file=${fileName} mime=${mimeType} bytes=${bytes.length}`);
    const pageCount = detectPdfPageCount(bytes);
    if (typeof pageCount === "number" && pageCount > MAX_PDF_PAGES) {
      return jsonResponse({ success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message }, 400);
    }

    const deadlineAt = Date.now() + PROCESSING_TIMEOUT_MS;
    let finalText = "";
    try {
      finalText = extractTextFromPdfBytes(bytes, deadlineAt);
    } catch (error) {
      if (error instanceof Error && error.message === "PDF_TIMEOUT") {
        return jsonResponse({ success: false, code: "TIMEOUT", message: "Tempo excedido" }, 408);
      }
      throw error;
    }
    console.log("FINAL_TEXT_LENGTH:", finalText.length);
    console.log(`[${FUNCTION_NAME}] duration_ms=${Date.now() - startedAt}`);

    if (!finalText || finalText.length < 20) {
      return jsonResponse({ success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message }, 400);
    }

    return jsonResponse({
      text: finalText,
      extractedText: finalText,
      ocrUsed: false,
      pageCount: null,
      textLength: finalText.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao processar PDF.";
    console.error(`[${FUNCTION_NAME}] error:`, message);
    const lower = message.toLowerCase();
    const code = lower.includes("invalid") || lower.includes("base64") ? "INVALID_INPUT" : "PDF_PARSE_FAILED";
    const status = code === "INVALID_INPUT" ? 400 : 500;
    return jsonResponse({ success: false, code, message: code === "INVALID_INPUT" ? "Arquivo inválido ou muito grande." : message }, status);
  }
});
