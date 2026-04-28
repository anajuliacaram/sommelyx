import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNCTION_NAME = "parse-pdf-ocr";
const MAX_TEXT_PAGES = 12;
const MAX_OCR_PAGES = 8;
const MIN_TEXT_LENGTH_FOR_OCR_SKIP = 1000;
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

async function getPdfJs() {
  const mod = await import("npm:pdfjs-dist@5.6.205");
  return mod.default || mod;
}

async function extractTextFromPdf(bytes: Uint8Array) {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_TEXT_PAGES); pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = (content.items || [])
      .map((item: any) => String(item.str || "").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) pages.push(text);
  }

  const finalText = normalizeText(pages.join("\n"));
  console.log("PDF_TEXT_LENGTH:", finalText.length);
  return { text: finalText, pageCount: Math.min(doc.numPages, MAX_TEXT_PAGES) };
}

async function renderPageToBlob(page: any) {
  const OffscreenCanvasCtor = (globalThis as any).OffscreenCanvas as any;
  if (!OffscreenCanvasCtor) return null;

  const viewport = page.getViewport({ scale: 1.8 });
  const canvas = new OffscreenCanvasCtor(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return await canvas.convertToBlob({ type: "image/png" });
}

async function extractTextByOcr(bytes: Uint8Array) {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const { createWorker } = await import("npm:tesseract.js@7.0.0");
  const worker = await createWorker("por+eng", 1, { logger: () => {} });

  const pageTexts: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_OCR_PAGES); pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const blob = await renderPageToBlob(page);
      if (!blob) continue;

      const result = await worker.recognize(blob as Blob);
      const text = normalizeText(String(result?.data?.text || ""));
      if (text) pageTexts.push(`[[PAGE ${pageNumber} OCR]]\n${text}`);
    }
  } finally {
    await worker.terminate();
  }

  const ocrText = normalizeText(pageTexts.join("\n\n"));
  console.log("OCR_USED:", true);
  console.log("OCR_TEXT_LENGTH:", ocrText.length);
  return ocrText;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (Deno.env.get("EDGE_DEBUG") === "true") console.log("AUTH HEADER:", !!authHeader);

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

    const extracted = await extractTextFromPdf(bytes);
    let finalText = extracted.text;
    let ocrUsed = false;

    if (!finalText || finalText.length < MIN_TEXT_LENGTH_FOR_OCR_SKIP) {
      ocrUsed = true;
      finalText = await extractTextByOcr(bytes);
    }

    console.log("FINAL_TEXT_LENGTH:", finalText.length);
    console.log(`[${FUNCTION_NAME}] duration_ms=${Date.now() - startedAt} ocr_used=${ocrUsed}`);

    if (!finalText || finalText.length < 20) {
      return jsonResponse({ success: false, code: "EMPTY_EXTRACTION", message: "No readable text found in PDF" }, 422);
    }

    return jsonResponse({
      text: finalText,
      extractedText: finalText,
      ocrUsed,
      pageCount: extracted.pageCount,
      textLength: finalText.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao processar PDF.";
    console.error(`[${FUNCTION_NAME}] error:`, message);
    const lower = message.toLowerCase();
    const code = lower.includes("invalid") ? "INVALID_FILE_TYPE" : lower.includes("ocr") ? "OCR_FAILED" : lower.includes("pdf") ? "PDF_PARSE_FAILED" : "OCR_FAILED";
    return jsonResponse({ success: false, code, message }, code === "FILE_TOO_LARGE" ? 413 : 500);
  }
});
