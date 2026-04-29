import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { enforceAiRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNCTION_NAME = "parse-pdf-ocr";
const MAX_PDF_BYTES = 20 * 1024 * 1024;

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

function base64ToBytes(input: string) {
  const clean = input.includes(",") ? input.split(",").pop() || "" : input;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

function extractTextFromPdfBytes(bytes: Uint8Array) {
  const binary = new TextDecoder("latin1").decode(bytes);
  const chunks: string[] = [];

  const tjRegex = /\((?:\\.|[^\\()])*\)\s*T[Jj]/g;
  for (const match of binary.matchAll(tjRegex)) {
    const raw = match[0];
    const textMatch = raw.match(/\(((?:\\.|[^\\()])*)\)\s*T[Jj]/);
    if (textMatch?.[1]) chunks.push(decodePdfString(textMatch[1]));
  }

  const arrayTjRegex = /\[(.*?)\]\s*TJ/gs;
  for (const match of binary.matchAll(arrayTjRegex)) {
    const inner = match[1];
    const innerStrings = Array.from(inner.matchAll(/\(((?:\\.|[^\\()])*)\)/g), (m) => decodePdfString(m[1]));
    if (innerStrings.length > 0) chunks.push(innerStrings.join(" "));
  }

  const text = normalizeText(chunks.join("\n"));
  console.log(`[${FUNCTION_NAME}] extracted_text_length=${text.length}`);
  return text;
}

serve(async (req) => {
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
  const rateLimit = await enforceAiRateLimit(user.id, FUNCTION_NAME);
  if (!rateLimit.allowed) {
    return jsonResponse({
      success: false,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Limite de uso atingido. Tente novamente em breve.",
      requestId,
      retryable: true,
    }, 429);
  }

  const startedAt = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const pdfBase64 = String(body?.pdfBase64 || body?.base64Pdf || "").trim();
    const fileName = String(body?.fileName || "pdf").trim();
    const mimeType = String(body?.mimeType || "application/pdf").trim();

    if (!pdfBase64) {
      return jsonResponse({ success: false, code: "INVALID_FILE_TYPE", message: "pdfBase64 is required" }, 400);
    }

    const bytes = base64ToBytes(pdfBase64);
    if (bytes.length > MAX_PDF_BYTES) {
      return jsonResponse({ success: false, code: "FILE_TOO_LARGE", message: "PDF file is too large" }, 413);
    }
    console.log(`[${FUNCTION_NAME}] file=${fileName} mime=${mimeType} bytes=${bytes.length}`);

    const finalText = extractTextFromPdfBytes(bytes);
    console.log("FINAL_TEXT_LENGTH:", finalText.length);
    console.log(`[${FUNCTION_NAME}] duration_ms=${Date.now() - startedAt}`);

    if (!finalText || finalText.length < 20) {
      return jsonResponse({ success: false, code: "EMPTY_EXTRACTION", message: "No readable text found in PDF" }, 422);
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
    const code = lower.includes("invalid") ? "INVALID_FILE_TYPE" : lower.includes("pdf") ? "PDF_PARSE_FAILED" : "PDF_PARSE_FAILED";
    return jsonResponse({ success: false, code, message }, 500);
  }
});
