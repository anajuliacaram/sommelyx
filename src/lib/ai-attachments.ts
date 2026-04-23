import { supabase } from "@/integrations/supabase/client";

export interface AiAnalysisAttachmentPayload {
  imageBase64?: string;
  extractedText?: string;
  mimeType?: string;
  fileName?: string;
}

export interface PreparedAiAnalysisAttachment extends AiAnalysisAttachmentPayload {
  previewUrl?: string;
  sourceType: "image" | "pdf-text" | "pdf-image";
}

export interface PdfTextBlock {
  pageNumber: number;
  lineNumber: number;
  text: string;
  x: number;
  y: number;
}

export interface PreparedSmartPdfImportAttachment {
  extractedText: string;
  textBlocks: PdfTextBlock[];
  mimeType: string;
  fileName?: string;
  sourceType: "pdf-smart";
  ocrUsed: boolean;
}

const MAX_IMAGE_DIMENSION = 1120;
const MAX_IMAGE_QUALITY = 0.74;
const MAX_IMAGE_BASE64_LENGTH = 1_500_000;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES_FOR_TEXT = 10;
const MAX_PDF_PAGES_FOR_RENDER = 2;
const MIN_PDF_TEXT_LENGTH = 120;
const MAX_EXTRACTED_TEXT_LENGTH = 12000;

let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
const attachmentPreparationCache = new Map<string, Promise<PreparedAiAnalysisAttachment>>();

async function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist");
  }

  return pdfJsPromise;
}

function inferMimeType(file: File) {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

function trace(stage: string, metadata?: Record<string, unknown>) {
  console.info(`[ai-attachments] ${stage}`, metadata || {});
}

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function fileCacheKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}:${inferMimeType(file)}`;
}

function dataUrlToBase64(dataUrl: string) {
  return dataUrl.split(",")[1] ?? dataUrl;
}

function downscaleCanvas(canvas: HTMLCanvasElement, maxWidth: number, maxHeight: number) {
  if (canvas.width <= maxWidth && canvas.height <= maxHeight) return canvas;

  const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
  const resized = document.createElement("canvas");
  resized.width = Math.max(1, Math.round(canvas.width * scale));
  resized.height = Math.max(1, Math.round(canvas.height * scale));

  const ctx = resized.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar o anexo.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, resized.width, resized.height);
  ctx.drawImage(canvas, 0, 0, resized.width, resized.height);
  return resized;
}

function exportOptimizedJpeg(
  sourceCanvas: HTMLCanvasElement,
  {
    maxWidth = MAX_IMAGE_DIMENSION,
    maxHeight = MAX_IMAGE_DIMENSION,
    baseQuality = MAX_IMAGE_QUALITY,
  }: {
    maxWidth?: number;
    maxHeight?: number;
    baseQuality?: number;
  } = {},
) {
  const qualities = [baseQuality, 0.7, 0.6, 0.52];
  let workingCanvas = downscaleCanvas(sourceCanvas, maxWidth, maxHeight);
  let fallbackPreviewUrl = workingCanvas.toDataURL("image/jpeg", 0.5);

  for (let pass = 0; pass < 4; pass++) {
    for (const quality of qualities) {
      const previewUrl = workingCanvas.toDataURL("image/jpeg", quality);
      const imageBase64 = dataUrlToBase64(previewUrl);
      fallbackPreviewUrl = previewUrl;

      if (imageBase64.length <= MAX_IMAGE_BASE64_LENGTH) {
        return { previewUrl, imageBase64 };
      }
    }

    const nextMaxWidth = Math.max(720, Math.round(workingCanvas.width * 0.82));
    const nextMaxHeight = Math.max(720, Math.round(workingCanvas.height * 0.82));
    if (nextMaxWidth === workingCanvas.width && nextMaxHeight === workingCanvas.height) break;
    workingCanvas = downscaleCanvas(workingCanvas, nextMaxWidth, nextMaxHeight);
  }

  return {
    previewUrl: fallbackPreviewUrl,
    imageBase64: dataUrlToBase64(fallbackPreviewUrl),
  };
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não conseguimos ler esse arquivo."));
    reader.readAsDataURL(file);
  });
}

async function prepareImageAttachment(file: File): Promise<PreparedAiAnalysisAttachment> {
  const startedAt = nowMs();
  trace("upload_received", { fileName: file.name, mimeType: file.type || "unknown", sizeBytes: file.size });
  if (!file.type.startsWith("image/")) {
    throw Object.assign(new Error("Tipo de arquivo inválido."), { code: "INVALID_FILE_TYPE" });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw Object.assign(new Error("Arquivo muito grande."), { code: "FILE_TOO_LARGE" });
  }
  const readStartedAt = nowMs();
  const dataUrl = await fileToDataUrl(file);
  trace("attachment_timing", {
    stage: "image_read",
    fileName: file.name,
    durationMs: Math.round(nowMs() - readStartedAt),
  });

  const preprocessStartedAt = nowMs();
  const optimized = await new Promise<{ previewUrl: string; imageBase64: string }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(Object.assign(new Error("Não foi possível processar a imagem."), { code: "OCR_FAILED" }));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(exportOptimizedJpeg(canvas));
    };
    img.onerror = () => reject(Object.assign(new Error("Não foi possível carregar a imagem."), { code: "OCR_FAILED" }));
    img.src = dataUrl;
  });

  trace("image_preprocessed", {
    fileName: file.name,
    imageBase64Length: optimized.imageBase64.length,
    previewLength: optimized.previewUrl.length,
    durationMs: Math.round(nowMs() - preprocessStartedAt),
  });

  trace("attachment_timing", {
    stage: "image_total",
    fileName: file.name,
    durationMs: Math.round(nowMs() - startedAt),
  });

  return {
    imageBase64: optimized.imageBase64,
    previewUrl: optimized.previewUrl,
    mimeType: "image/jpeg",
    fileName: file.name,
    sourceType: "image",
  };
}

async function extractPdfText(file: File) {
  trace("pdf_text_extraction_started", { fileName: file.name, sizeBytes: file.size });
  const startedAt = nowMs();
  try {
    const pdfjs = await getPdfJs();
    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_PDF_PAGES_FOR_TEXT); pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const line = (content.items || [])
        .map((item: any) => String(item.str || "").trim())
        .filter(Boolean)
        .join(" ");

      if (line) pages.push(line);
    }

    const extracted = pages.join("\n").replace(/\s+/g, " ").trim().slice(0, MAX_EXTRACTED_TEXT_LENGTH);
    trace("pdf_text_extracted", { fileName: file.name, textLength: extracted.length, pages: Math.min(doc.numPages, MAX_PDF_PAGES_FOR_TEXT), durationMs: Math.round(nowMs() - startedAt) });
    return extracted;
  } catch (error) {
    const err: any = error instanceof Error ? error : new Error("PDF_PARSE_FAILED");
    err.code = err.code || "PDF_PARSE_FAILED";
    trace("pdf_extraction_failed", { fileName: file.name, error: err.code || err.message });
    throw err;
  }
}

async function extractPdfTextBlocks(file: File) {
  trace("pdf_blocks_extraction_started", { fileName: file.name, sizeBytes: file.size });
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
  const blocks: PdfTextBlock[] = [];

  for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_PDF_PAGES_FOR_TEXT); pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = (content.items || [])
      .map((item: any) => ({
        text: String(item.str || "").trim(),
        x: Number(item.transform?.[4] ?? item.x ?? 0),
        y: Number(item.transform?.[5] ?? item.y ?? 0),
      }))
      .filter((item) => item.text.length > 0);

    if (items.length === 0) continue;

    const lineBuckets = new Map<string, { y: number; items: typeof items }>();
    for (const item of items) {
      const yKey = Math.round(item.y / 4) * 4;
      const key = `${pageNumber}:${yKey}`;
      const existing = lineBuckets.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        lineBuckets.set(key, { y: item.y, items: [item] });
      }
    }

    const lines = Array.from(lineBuckets.entries())
      .sort((a, b) => b[1].y - a[1].y)
      .map(([, bucket], lineIndex) => ({
        pageNumber,
        lineNumber: lineIndex + 1,
        text: bucket.items
          .sort((a, b) => a.x - b.x)
          .map((item) => item.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
        x: Math.min(...bucket.items.map((item) => item.x)),
        y: bucket.y,
      }))
      .filter((line) => line.text.length > 0);

    blocks.push(...lines);
  }

  const extractedText = blocks
    .map((block) => `[p${block.pageNumber} l${block.lineNumber} x=${Math.round(block.x)} y=${Math.round(block.y)}] ${block.text}`)
    .join("\n")
    .slice(0, MAX_EXTRACTED_TEXT_LENGTH * 2);

  return { blocks, extractedText };
}

async function renderPdfAsImage(file: File) {
  trace("pdf_render_started", { fileName: file.name, sizeBytes: file.size });
  const startedAt = nowMs();
  try {
    const pdfjs = await getPdfJs();
    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
    const renderedPages: HTMLCanvasElement[] = [];

    for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_PDF_PAGES_FOR_RENDER); pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.05 });
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = Math.round(viewport.width);
      pageCanvas.height = Math.round(viewport.height);

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("INVALID_PDF");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas: pageCanvas }).promise;
      renderedPages.push(pageCanvas);
    }

    if (renderedPages.length === 0) throw new Error("INVALID_PDF");

    const gap = 16;
    const combined = document.createElement("canvas");
    combined.width = Math.max(...renderedPages.map((canvas) => canvas.width));
    combined.height = renderedPages.reduce((sum, canvas) => sum + canvas.height, 0) + gap * (renderedPages.length - 1);

    const combinedCtx = combined.getContext("2d");
    if (!combinedCtx) throw new Error("INVALID_PDF");

    combinedCtx.fillStyle = "#ffffff";
    combinedCtx.fillRect(0, 0, combined.width, combined.height);

    let y = 0;
    for (const pageCanvas of renderedPages) {
      combinedCtx.drawImage(pageCanvas, 0, y);
      y += pageCanvas.height + gap;
    }

    const rendered = exportOptimizedJpeg(combined, {
      maxWidth: 1200,
      maxHeight: 1700,
      baseQuality: 0.74,
    });
    trace("attachment_timing", {
      stage: "pdf_render_to_image",
      fileName: file.name,
      durationMs: Math.round(nowMs() - startedAt),
      imageBase64Length: rendered.imageBase64.length,
    });
    return rendered;
  } catch (error) {
    const err: any = error instanceof Error ? error : new Error("INVALID_PDF");
    err.code = err.code || (String(err.message || "").includes("INVALID_PDF") ? "INVALID_PDF" : "PDF_PARSE_FAILED");
    trace("pdf_render_failed", { fileName: file.name, error: err.code || err.message });
    throw err;
  }
}

function normalizeOcrText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/-\n\s*/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .trim();
}

async function extractPdfOcrText(file: File) {
  trace("ocr_started", { fileName: file.name, sizeBytes: file.size });
  const pdfBase64 = dataUrlToBase64(await fileToDataUrl(file));
  const { data, error } = await supabase.functions.invoke("parse-pdf-ocr", {
    body: {
      pdfBase64,
      fileName: file.name,
      mimeType: inferMimeType(file),
    },
  });

  if (error) {
    const err: any = new Error(error.message || "Não conseguimos aplicar OCR neste PDF.");
    err.code = (error as any).code || (error as any).name || "OCR_FAILED";
    err.status = (error as any).status || (error as any).statusCode;
    err.requestId = (error as any).requestId || (error as any).request_id;
    throw err;
  }

  const text = normalizeOcrText(String(data?.text ?? data?.extractedText ?? ""));
  trace("ocr_completed", { fileName: file.name, textLength: text.length });
  return text;
}

export async function prepareAiAnalysisAttachment(file: File): Promise<PreparedAiAnalysisAttachment> {
  const cacheKey = fileCacheKey(file);
  const cached = attachmentPreparationCache.get(cacheKey);
  if (cached) {
    trace("attachment_cache_hit", { fileName: file.name, cacheKey });
    return cached;
  }

  const pending = (async () => {
    const startedAt = nowMs();
    const mimeType = inferMimeType(file);
    trace("file_validated", { fileName: file.name, mimeType, sizeBytes: file.size });

    if (mimeType === "application/pdf") {
      let extractedText = "";
      try {
        extractedText = await extractPdfText(file);
      } catch (error: any) {
        if (error?.code === "INVALID_PDF" || error?.code === "PDF_PARSE_FAILED") {
          throw error;
        }
        extractedText = "";
      }

      if (extractedText.length >= MIN_PDF_TEXT_LENGTH) {
        trace("attachment_timing", {
          stage: "prepare_attachment_total",
          fileName: file.name,
          sourceType: "pdf-text",
          durationMs: Math.round(nowMs() - startedAt),
        });
        return {
          extractedText,
          mimeType,
          fileName: file.name,
          sourceType: "pdf-text" as const,
        };
      }

      try {
        const rendered = await renderPdfAsImage(file);
        trace("attachment_timing", {
          stage: "prepare_attachment_total",
          fileName: file.name,
          sourceType: "pdf-image",
          durationMs: Math.round(nowMs() - startedAt),
        });
        return {
          ...rendered,
          mimeType,
          fileName: file.name,
          sourceType: "pdf-image" as const,
        };
      } catch (error: any) {
        if (error?.code === "INVALID_PDF" || error?.code === "PDF_PARSE_FAILED") {
          throw error;
        }
        throw Object.assign(new Error("Não foi possível processar o PDF."), { code: "PDF_PARSE_FAILED" });
      }
    }

    const prepared = await prepareImageAttachment(file);
    trace("attachment_timing", {
      stage: "prepare_attachment_total",
      fileName: file.name,
      sourceType: prepared.sourceType,
      durationMs: Math.round(nowMs() - startedAt),
    });
    return prepared;
  })();

  attachmentPreparationCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (error) {
    attachmentPreparationCache.delete(cacheKey);
    throw error;
  }
}

export async function prepareSmartPdfImportAttachment(file: File): Promise<PreparedSmartPdfImportAttachment> {
  const mimeType = inferMimeType(file);
  if (mimeType !== "application/pdf") {
    throw new Error("O modo de importação inteligente é exclusivo para PDFs.");
  }

  const { blocks, extractedText } = await extractPdfTextBlocks(file).catch(async () => {
    const fallbackText = await extractPdfText(file).catch(() => "");
    return { blocks: [] as PdfTextBlock[], extractedText: fallbackText };
  });

  console.log("PDF_TEXT_LENGTH:", extractedText.length);
  console.log("PDF_TEXT_SAMPLE:", extractedText.slice(0, 1000));

  let finalText = extractedText;
  let ocrUsed = false;
  let ocrText: string | null = null;

  if (!finalText || finalText.length < 1000) {
    ocrUsed = true;
    ocrText = await extractPdfOcrText(file).catch(() => "");
    finalText = ocrText || "";
  }

  console.log("OCR_USED:", ocrUsed);
  console.log("OCR_TEXT_LENGTH:", ocrText?.length);
  console.log("OCR_SAMPLE:", ocrText?.slice(0, 1000));
  console.log("FINAL_TEXT_LENGTH:", finalText.length);
  console.log("FINAL_TEXT_SAMPLE:", finalText.slice(0, 1000));

  if (!finalText || finalText.length < 1000) {
    const rendered = await renderPdfAsImage(file);
    return {
      ...rendered,
      extractedText: finalText || "",
      textBlocks: blocks,
      mimeType,
      fileName: file.name,
      sourceType: "pdf-smart",
      ocrUsed,
    };
  }

  return {
    extractedText: finalText,
    textBlocks: blocks,
    mimeType,
    fileName: file.name,
    sourceType: "pdf-smart",
    ocrUsed,
  };
}
