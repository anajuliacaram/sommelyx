import { AppError } from "@/lib/app-error";

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

const MAX_IMAGE_DIMENSION = 1280;
const MAX_IMAGE_QUALITY = 0.78;
const MAX_IMAGE_BASE64_LENGTH = 1_800_000;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_PDF_PAGES_FOR_TEXT = 10;
const MAX_PDF_PAGES_FOR_RENDER = 2;
const MIN_PDF_TEXT_LENGTH = 120;
const MAX_EXTRACTED_TEXT_LENGTH = 12000;

let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }

  return pdfJsPromise;
}

function inferMimeType(file: File) {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
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
    reader.onerror = () => reject(new AppError("INVALID_FILE", "Não conseguimos ler esse arquivo. Tente outra imagem ou PDF mais nítido."));
    reader.readAsDataURL(file);
  });
}

async function prepareImageAttachment(file: File): Promise<PreparedAiAnalysisAttachment> {
  const dataUrl = await fileToDataUrl(file);

  const optimized = await new Promise<{ previewUrl: string; imageBase64: string }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new AppError("PARSE_ERROR", "Não foi possível processar essa imagem. Tente outra versão."));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(exportOptimizedJpeg(canvas));
    };
    img.onerror = () => reject(new AppError("INVALID_FILE", "Não foi possível carregar essa imagem. Tente outra foto."));
    img.src = dataUrl;
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
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

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

  return pages.join("\n").replace(/\s+/g, " ").trim().slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

async function renderPdfAsImage(file: File) {
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const renderedPages: HTMLCanvasElement[] = [];

  for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_PDF_PAGES_FOR_RENDER); pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.05 });
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = Math.round(viewport.width);
    pageCanvas.height = Math.round(viewport.height);

    const ctx = pageCanvas.getContext("2d");
    if (!ctx) throw new AppError("PARSE_ERROR", "Não foi possível processar esse PDF.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas: pageCanvas }).promise;
    renderedPages.push(pageCanvas);
  }

  if (renderedPages.length === 0) throw new AppError("EMPTY_RESULT", "Esse PDF não possui páginas legíveis para análise.");

  const gap = 16;
  const combined = document.createElement("canvas");
  combined.width = Math.max(...renderedPages.map((canvas) => canvas.width));
  combined.height = renderedPages.reduce((sum, canvas) => sum + canvas.height, 0) + gap * (renderedPages.length - 1);

  const combinedCtx = combined.getContext("2d");
  if (!combinedCtx) throw new AppError("PARSE_ERROR", "Não foi possível processar esse PDF.");

  combinedCtx.fillStyle = "#ffffff";
  combinedCtx.fillRect(0, 0, combined.width, combined.height);

  let y = 0;
  for (const pageCanvas of renderedPages) {
    combinedCtx.drawImage(pageCanvas, 0, y);
    y += pageCanvas.height + gap;
  }

  return exportOptimizedJpeg(combined, {
    maxWidth: 1200,
    maxHeight: 1700,
    baseQuality: 0.74,
  });
}

export async function prepareAiAnalysisAttachment(file: File): Promise<PreparedAiAnalysisAttachment> {
  const mimeType = inferMimeType(file);

  if (!file || !(file instanceof File)) {
    throw new AppError("FILE_MISSING", "Selecione um arquivo para continuar.");
  }

  if (file.size <= 0) {
    throw new AppError("INVALID_FILE", "Esse arquivo está vazio. Escolha outro arquivo.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "Esse arquivo é grande demais. Envie uma versão menor.");
  }

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  if (!isPdf && !isImage) {
    throw new AppError("INVALID_FILE_TYPE", "Formato não suportado. Envie uma imagem ou PDF.");
  }

  if (isPdf) {
    const extractedText = await extractPdfText(file).catch(() => "");

    if (extractedText.length >= MIN_PDF_TEXT_LENGTH) {
      return {
        extractedText,
        mimeType,
        fileName: file.name,
        sourceType: "pdf-text",
      };
    }

    const rendered = await renderPdfAsImage(file);
    return {
      ...rendered,
      mimeType,
      fileName: file.name,
      sourceType: "pdf-image",
    };
  }

  return await prepareImageAttachment(file);
}
