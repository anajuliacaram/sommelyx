import { invokeEdgeFunction } from "@/lib/edge-invoke";

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

export type AttachmentPrepErrorCode =
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "IMAGE_DECODE_FAILED"
  | "IMAGE_PROCESSING_FAILED"
  | "IMAGE_TOO_LARGE"
  | "UNSUPPORTED_IMAGE_FORMAT"
  | "PDF_PARSE_FAILED"
  | "PDF_TOO_LARGE"
  | "OCR_FAILED"
  | "EMPTY_EXTRACTION";

export class AttachmentPrepError extends Error {
  code: AttachmentPrepErrorCode;
  details?: Record<string, unknown>;

  constructor(code: AttachmentPrepErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AttachmentPrepError";
    this.code = code;
    this.details = details;
  }
}

const MAX_IMAGE_DIMENSION_DESKTOP = 1120;
const MAX_IMAGE_DIMENSION_MOBILE = 840;
const MAX_IMAGE_DIMENSION_SCAN = 1024;
const MAX_IMAGE_QUALITY_DESKTOP = 0.74;
const MAX_IMAGE_QUALITY_MOBILE = 0.64;
const MAX_IMAGE_QUALITY_SCAN = 0.7;
const MAX_IMAGE_BASE64_LENGTH_DESKTOP = 1_500_000;
const MAX_IMAGE_BASE64_LENGTH_MOBILE = 900_000;
const MAX_IMAGE_BASE64_LENGTH_SCAN = 950_000;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_PDF_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_PDF_PAGES_FOR_TEXT = 10;
const MAX_PDF_PAGES_FOR_RENDER = 2;
const MIN_PDF_TEXT_LENGTH = 120;
const MAX_EXTRACTED_TEXT_LENGTH = 12000;

let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
const attachmentPreparationCache = new Map<string, Promise<PreparedAiAnalysisAttachment>>();

type ImageAttachmentPreset = {
  maxDimension?: number;
  baseQuality?: number;
  maxBase64Length?: number;
  tracePrefix?: string;
};

async function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist");
  }

  return pdfJsPromise;
}

function inferMimeType(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".heic")) return file.type || "image/heic";
  if (name.endsWith(".heif")) return file.type || "image/heif";
  if (file.type) return file.type;
  return "image/jpeg";
}

function trace(stage: string, metadata?: Record<string, unknown>) {
  console.info(`[ai-attachments] ${stage}`, metadata || {});
}

function createAttachmentError(code: AttachmentPrepErrorCode, message: string, details?: Record<string, unknown>) {
  return new AttachmentPrepError(code, message, details);
}

export function getAttachmentErrorMessage(error: unknown, fallback = "Não foi possível preparar o arquivo."): string {
  const code = (error as any)?.code as AttachmentPrepErrorCode | undefined;
  switch (code) {
    case "INVALID_FILE_TYPE":
      return "Envie uma imagem ou PDF válido.";
    case "FILE_TOO_LARGE":
      return "O arquivo está muito grande para processar no celular. Tente uma imagem/PDF menor.";
    case "IMAGE_DECODE_FAILED":
      return "Não conseguimos ler essa imagem no celular. Tente outra foto ou use a câmera.";
    case "IMAGE_PROCESSING_FAILED":
      return "Não conseguimos processar essa imagem. Tente outra foto mais nítida.";
    case "IMAGE_TOO_LARGE":
      return "A imagem ficou pesada demais depois do preparo. Tente uma foto mais leve.";
    case "UNSUPPORTED_IMAGE_FORMAT":
      return "Esse formato de imagem não foi aceito no celular. Tente converter para JPG ou use a câmera.";
    case "PDF_PARSE_FAILED":
      return "Não conseguimos ler esse PDF no celular. Tente uma versão menor ou uma foto da carta.";
    case "PDF_TOO_LARGE":
      return "O PDF está muito grande para processar no celular. Tente um arquivo menor.";
    case "OCR_FAILED":
      return "Não conseguimos extrair o texto desse arquivo. Tente outra foto ou um PDF mais nítido.";
    case "EMPTY_EXTRACTION":
      return "Não conseguimos identificar vinhos válidos nesse arquivo.";
    default:
      return error instanceof Error && error.message ? error.message : fallback;
  }
}

function isLikelyMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 1 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isImageBitmapSource(source: CanvasImageSource): source is ImageBitmap {
  return typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap;
}

function isProblematicMobileImageFormat(mimeType: string, fileName: string) {
  const lower = `${mimeType} ${fileName.toLowerCase()}`;
  return lower.includes("heic") || lower.includes("heif");
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(createAttachmentError("IMAGE_PROCESSING_FAILED", "Não conseguimos converter a imagem."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(createAttachmentError("IMAGE_PROCESSING_FAILED", "Não conseguimos otimizar a imagem."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function estimateBase64Length(blobSize: number) {
  return Math.ceil((blobSize * 4) / 3);
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

async function exportOptimizedJpeg(
  sourceCanvas: HTMLCanvasElement,
  {
    maxWidth = MAX_IMAGE_DIMENSION_DESKTOP,
    maxHeight = MAX_IMAGE_DIMENSION_DESKTOP,
    baseQuality = MAX_IMAGE_QUALITY_DESKTOP,
    maxBase64Length = MAX_IMAGE_BASE64_LENGTH_DESKTOP,
  }: {
    maxWidth?: number;
    maxHeight?: number;
    baseQuality?: number;
    maxBase64Length?: number;
  } = {},
) {
  const qualities = [baseQuality, 0.7, 0.6, 0.52];
  let workingCanvas = downscaleCanvas(sourceCanvas, maxWidth, maxHeight);
  let fallbackBlob: Blob | null = null;
  let fallbackQuality = baseQuality;

  for (let pass = 0; pass < 4; pass++) {
    for (const quality of qualities) {
      const blob = await canvasToBlob(workingCanvas, quality);
      fallbackBlob = blob;
      fallbackQuality = quality;
      const estimatedBase64Length = estimateBase64Length(blob.size);
      if (estimatedBase64Length <= maxBase64Length) {
        const previewUrl = await blobToDataUrl(blob);
        const imageBase64 = dataUrlToBase64(previewUrl);
        return { previewUrl, imageBase64, width: workingCanvas.width, height: workingCanvas.height, blobSize: blob.size, quality };
      }
    }

    const nextMaxWidth = Math.max(720, Math.round(workingCanvas.width * 0.82));
    const nextMaxHeight = Math.max(720, Math.round(workingCanvas.height * 0.82));
    if (nextMaxWidth === workingCanvas.width && nextMaxHeight === workingCanvas.height) break;
    workingCanvas = downscaleCanvas(workingCanvas, nextMaxWidth, nextMaxHeight);
  }

  if (fallbackBlob) {
    const previewUrl = await blobToDataUrl(fallbackBlob);
    const imageBase64 = dataUrlToBase64(previewUrl);
    if (imageBase64.length <= maxBase64Length) {
      return {
        previewUrl,
        imageBase64,
        width: workingCanvas.width,
        height: workingCanvas.height,
        blobSize: fallbackBlob.size,
        quality: fallbackQuality,
      };
    }
  }

  throw createAttachmentError("IMAGE_TOO_LARGE", "A imagem continua grande demais para envio seguro no celular.");
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(createAttachmentError("IMAGE_PROCESSING_FAILED", "Não conseguimos ler esse arquivo."));
    reader.readAsDataURL(file);
  });
}

async function fileToArrayBuffer(file: File) {
  return await file.arrayBuffer();
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await fileToArrayBuffer(file));
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadImageBitmap(file: File) {
  if (typeof createImageBitmap !== "function") {
    throw createAttachmentError("IMAGE_DECODE_FAILED", "Seu navegador não suporta a leitura otimizada dessa imagem.", {
      path: "bitmap_unavailable",
    });
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" as any });
    trace("image_decode_success", {
      fileName: file.name,
      path: "bitmap",
      width: bitmap.width,
      height: bitmap.height,
    });
    return bitmap;
  } catch (error) {
    trace("image_decode_failed", {
      fileName: file.name,
      path: "bitmap",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function loadHtmlImage(file: File, mode: "object-url" | "data-url") {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    let sourceUrl = "";

    const cleanup = () => {
      if (sourceUrl.startsWith("blob:")) {
        URL.revokeObjectURL(sourceUrl);
      }
    };

    img.onload = () => {
      trace("image_decode_success", {
        fileName: file.name,
        path: mode,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      trace("image_decode_failed", {
        fileName: file.name,
        path: mode,
      });
      reject(createAttachmentError(
        "IMAGE_DECODE_FAILED",
        "Não conseguimos ler essa imagem.",
        {
          path: mode,
          problematicMobileFormat: isProblematicMobileImageFormat(file.type || "", file.name),
        },
      ));
    };

    if (mode === "object-url") {
      sourceUrl = URL.createObjectURL(file);
      img.src = sourceUrl;
    } else {
      fileToDataUrl(file)
        .then((dataUrl) => {
          sourceUrl = dataUrl;
          img.src = dataUrl;
        })
        .catch((error) => {
          cleanup();
          reject(error);
        });
    }
  });
}

async function decodeImageFile(file: File) {
  const mobile = isLikelyMobileDevice();
  const attempts: Array<{ path: string; run: () => Promise<HTMLImageElement | ImageBitmap> }> = [
    ...(mobile
      ? [
          { path: "object-url", run: () => loadHtmlImage(file, "object-url") },
          { path: "data-url", run: () => loadHtmlImage(file, "data-url") },
          { path: "bitmap", run: () => loadImageBitmap(file) },
        ]
      : [
          { path: "bitmap", run: () => loadImageBitmap(file) },
          { path: "object-url", run: () => loadHtmlImage(file, "object-url") },
          { path: "data-url", run: () => loadHtmlImage(file, "data-url") },
        ]),
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      const source = await attempt.run();
      return { source, path: attempt.path };
    } catch (error) {
      lastError = error;
    }
  }

  throw createAttachmentError(
    "IMAGE_DECODE_FAILED",
    "Não conseguimos ler essa imagem no celular.",
    {
      fileName: file.name,
      mimeType: inferMimeType(file),
      lastError: lastError instanceof Error ? lastError.message : String(lastError ?? ""),
      problematicMobileFormat: isProblematicMobileImageFormat(file.type || "", file.name),
    },
  );
}

async function prepareImageAttachment(
  file: File,
  preset: ImageAttachmentPreset = {},
): Promise<PreparedAiAnalysisAttachment> {
  const startedAt = nowMs();
  const tracePrefix = preset.tracePrefix || "upload";
  trace(`${tracePrefix}_received`, { fileName: file.name, mimeType: file.type || "unknown", sizeBytes: file.size });
  const mimeType = inferMimeType(file);
  const mobile = isLikelyMobileDevice();
  const maxDimension = preset.maxDimension ?? (mobile ? MAX_IMAGE_DIMENSION_MOBILE : MAX_IMAGE_DIMENSION_DESKTOP);
  const baseQuality = preset.baseQuality ?? (mobile ? MAX_IMAGE_QUALITY_MOBILE : MAX_IMAGE_QUALITY_DESKTOP);
  const maxBase64Length = preset.maxBase64Length ?? (mobile ? MAX_IMAGE_BASE64_LENGTH_MOBILE : MAX_IMAGE_BASE64_LENGTH_DESKTOP);

  if (!mimeType.startsWith("image/")) {
    throw createAttachmentError("INVALID_FILE_TYPE", "Tipo de arquivo inválido.", { mimeType });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw createAttachmentError("FILE_TOO_LARGE", "Arquivo muito grande.", { sizeBytes: file.size });
  }
  if (isProblematicMobileImageFormat(mimeType, file.name)) {
    trace("image_format_detected", { fileName: file.name, mimeType, note: "problematic_mobile_format" });
  }
  trace("image_prepare_started", {
    fileName: file.name,
    mimeType,
    sizeBytes: file.size,
    mobile,
    maxDimension,
    baseQuality,
    maxBase64Length,
  });

  const decodeStartedAt = nowMs();
  const decoded = await decodeImageFile(file);
  trace("attachment_timing", {
    stage: "image_decode",
    fileName: file.name,
    durationMs: Math.round(nowMs() - decodeStartedAt),
    decodePath: decoded.path,
  });

  const preprocessStartedAt = nowMs();
  const sourceWidth = isImageBitmapSource(decoded.source) ? decoded.source.width : decoded.source.naturalWidth || decoded.source.width;
  const sourceHeight = isImageBitmapSource(decoded.source) ? decoded.source.height : decoded.source.naturalHeight || decoded.source.height;
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if (isImageBitmapSource(decoded.source)) {
      decoded.source.close();
    }
    throw createAttachmentError("IMAGE_PROCESSING_FAILED", "Não foi possível processar a imagem.", { fileName: file.name });
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(decoded.source as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if (isImageBitmapSource(decoded.source)) {
    decoded.source.close();
  }

  const optimized = await exportOptimizedJpeg(canvas, {
    maxWidth: maxDimension,
    maxHeight: maxDimension,
    baseQuality,
    maxBase64Length,
  });

  trace("image_preprocessed", {
    fileName: file.name,
    imageBase64Length: optimized.imageBase64.length,
    estimatedPayloadBytes: Math.round((optimized.imageBase64.length * 3) / 4),
    previewLength: optimized.previewUrl.length,
    sourceWidth,
    sourceHeight,
    resizedWidth: optimized.width,
    resizedHeight: optimized.height,
    blobSize: optimized.blobSize,
    quality: optimized.quality,
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

async function prepareScanImageAttachment(file: File): Promise<PreparedAiAnalysisAttachment> {
  return await prepareImageAttachment(file, {
    tracePrefix: "scan_upload",
    maxDimension: MAX_IMAGE_DIMENSION_SCAN,
    baseQuality: MAX_IMAGE_QUALITY_SCAN,
    maxBase64Length: MAX_IMAGE_BASE64_LENGTH_SCAN,
  });
}

async function extractPdfText(file: File) {
  trace("pdf_text_extraction_started", { fileName: file.name, sizeBytes: file.size });
  const startedAt = nowMs();
  try {
    const pdfjs = await getPdfJs();
    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as any).promise;
    const maxPages = isLikelyMobileDevice() ? 6 : MAX_PDF_PAGES_FOR_TEXT;

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, maxPages); pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const line = (content.items || [])
        .map((item: any) => String(item.str || "").trim())
        .filter(Boolean)
        .join(" ");

      if (line) pages.push(line);
    }

    const extracted = pages.join("\n").replace(/\s+/g, " ").trim().slice(0, MAX_EXTRACTED_TEXT_LENGTH);
    trace("pdf_text_extracted", { fileName: file.name, textLength: extracted.length, pages: Math.min(doc.numPages, maxPages), durationMs: Math.round(nowMs() - startedAt) });
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
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as any).promise;
  const blocks: PdfTextBlock[] = [];
  const maxPages = isLikelyMobileDevice() ? 6 : MAX_PDF_PAGES_FOR_TEXT;

  for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, maxPages); pageNumber++) {
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
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as any).promise;
    const renderedPages: HTMLCanvasElement[] = [];
    const maxPages = isLikelyMobileDevice() ? 1 : MAX_PDF_PAGES_FOR_RENDER;

    for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, maxPages); pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: isLikelyMobileDevice() ? 0.92 : 1.05 });
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

    const rendered = await exportOptimizedJpeg(combined, {
      maxWidth: isLikelyMobileDevice() ? 1024 : 1200,
      maxHeight: isLikelyMobileDevice() ? 1440 : 1700,
      baseQuality: isLikelyMobileDevice() ? 0.66 : 0.74,
      maxBase64Length: isLikelyMobileDevice() ? MAX_IMAGE_BASE64_LENGTH_MOBILE : MAX_IMAGE_BASE64_LENGTH_DESKTOP,
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
  const pdfBase64 = await fileToBase64(file);
  trace("ocr_payload_ready", { fileName: file.name, base64Length: pdfBase64.length });
  let data: any;
  try {
    data = await invokeEdgeFunction<any>(
      "parse-pdf-ocr",
      {
        pdfBase64,
        fileName: file.name,
        mimeType: inferMimeType(file),
      },
      { timeoutMs: 45_000, retries: 1, retryOnAbort: false },
    );
  } catch (error) {
    const err: any = createAttachmentError(
      ((error as any)?.code as AttachmentPrepErrorCode) || ((error as any)?.name as AttachmentPrepErrorCode) || "OCR_FAILED",
      (error as any)?.message || "Não conseguimos aplicar OCR neste PDF.",
    );
    err.status = (error as any)?.status || (error as any)?.statusCode;
    err.requestId = (error as any)?.requestId || (error as any)?.request_id;
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
    const mobile = isLikelyMobileDevice();
    trace("file_validated", { fileName: file.name, mimeType, sizeBytes: file.size, mobile });

    if (mimeType === "application/pdf") {
      if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
        throw createAttachmentError("PDF_TOO_LARGE", "PDF muito grande para processar com segurança.", {
          sizeBytes: file.size,
        });
      }
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
        throw createAttachmentError(
          error?.code === "FILE_TOO_LARGE" ? "PDF_TOO_LARGE" : "PDF_PARSE_FAILED",
          error?.code === "FILE_TOO_LARGE"
            ? "PDF muito grande para processar com segurança."
            : "Não foi possível processar o PDF.",
          { fileName: file.name, reason: error?.message || String(error) },
        );
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

export async function prepareWineLabelScanAttachment(file: File): Promise<PreparedAiAnalysisAttachment> {
  const cacheKey = `scan:${fileCacheKey(file)}`;
  const cached = attachmentPreparationCache.get(cacheKey);
  if (cached) {
    trace("attachment_cache_hit", { fileName: file.name, cacheKey });
    return cached;
  }

  const pending = (async () => {
    const startedAt = nowMs();
    const mimeType = inferMimeType(file);
    trace("file_validated", {
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
      mobile: isLikelyMobileDevice(),
      preset: "scan",
    });

    if (!mimeType.startsWith("image/")) {
      throw createAttachmentError("INVALID_FILE_TYPE", "Tipo de arquivo inválido.", { mimeType });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw createAttachmentError("FILE_TOO_LARGE", "Arquivo muito grande.", { sizeBytes: file.size });
    }

    const prepared = await prepareScanImageAttachment(file);
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
  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    throw createAttachmentError("PDF_TOO_LARGE", "PDF muito grande para importar com segurança.", {
      sizeBytes: file.size,
    });
  }

  const { blocks, extractedText } = await extractPdfTextBlocks(file).catch(async () => {
    const fallbackText = await extractPdfText(file).catch(() => "");
    return { blocks: [] as PdfTextBlock[], extractedText: fallbackText };
  });

  console.log("PDF_TEXT_LENGTH:", extractedText.length);

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
  console.log("FINAL_TEXT_LENGTH:", finalText.length);

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
