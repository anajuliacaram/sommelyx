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

const MAX_IMAGE_DIMENSION = 1400;
const MAX_IMAGE_QUALITY = 0.8;
const MAX_PDF_PAGES_FOR_TEXT = 10;
const MAX_PDF_PAGES_FOR_RENDER = 2;
const MIN_PDF_TEXT_LENGTH = 120;
const MAX_EXTRACTED_TEXT_LENGTH = 16000;

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

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não conseguimos ler esse arquivo."));
    reader.readAsDataURL(file);
  });
}

async function prepareImageAttachment(file: File): Promise<PreparedAiAnalysisAttachment> {
  const dataUrl = await fileToDataUrl(file);

  const previewUrl = await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const scale = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", MAX_IMAGE_QUALITY));
    };
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = dataUrl;
  });

  return {
    imageBase64: dataUrlToBase64(previewUrl),
    previewUrl,
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
    const viewport = page.getViewport({ scale: 1.2 });
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = Math.round(viewport.width);
    pageCanvas.height = Math.round(viewport.height);

    const ctx = pageCanvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar o PDF.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas: pageCanvas }).promise;
    renderedPages.push(pageCanvas);
  }

  if (renderedPages.length === 0) throw new Error("O PDF não possui páginas legíveis.");

  const gap = 16;
  const combined = document.createElement("canvas");
  combined.width = Math.max(...renderedPages.map((canvas) => canvas.width));
  combined.height = renderedPages.reduce((sum, canvas) => sum + canvas.height, 0) + gap * (renderedPages.length - 1);

  const combinedCtx = combined.getContext("2d");
  if (!combinedCtx) throw new Error("Não foi possível processar o PDF.");

  combinedCtx.fillStyle = "#ffffff";
  combinedCtx.fillRect(0, 0, combined.width, combined.height);

  let y = 0;
  for (const pageCanvas of renderedPages) {
    combinedCtx.drawImage(pageCanvas, 0, y);
    y += pageCanvas.height + gap;
  }

  const optimized = downscaleCanvas(combined, 1400, 1800);
  const previewUrl = optimized.toDataURL("image/jpeg", 0.82);

  return {
    previewUrl,
    imageBase64: dataUrlToBase64(previewUrl),
  };
}

export async function prepareAiAnalysisAttachment(file: File): Promise<PreparedAiAnalysisAttachment> {
  const mimeType = inferMimeType(file);

  if (mimeType === "application/pdf") {
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