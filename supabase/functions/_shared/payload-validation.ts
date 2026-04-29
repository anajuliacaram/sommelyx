export const INVALID_INPUT_ERROR = {
  code: "INVALID_INPUT",
  message: "Arquivo inválido ou muito grande.",
} as const;

export type ValidatedBinaryPayload = {
  mimeType: string;
  base64: string;
  byteLength: number;
};

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

function decodeBase64(input: string) {
  const cleaned = input.replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function extractDataUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("data:") || !trimmed.includes(";base64,")) return null;
  const mime = trimmed.slice(5, trimmed.indexOf(";base64,")).trim();
  const base64 = normalizeBase64(trimmed.slice(trimmed.indexOf("base64,") + "base64,".length));
  return { mime, base64 };
}

function isAllowedMime(mimeType: string, allowedMimeTypes: string[]) {
  return allowedMimeTypes.includes(mimeType.toLowerCase());
}

function invalid(reason?: string) {
  return {
    ok: false as const,
    error: INVALID_INPUT_ERROR,
    reason: reason || "invalid_input",
  };
}

function valid(mimeType: string, base64: string, byteLength: number) {
  return {
    ok: true as const,
    mimeType,
    base64,
    byteLength,
  };
}

function parseBinaryPayload(
  value: unknown,
  options: {
    allowedMimeTypes: string[];
    fallbackMimeType?: string | null;
    maxBytes: number;
    requireDataUrlPrefix?: boolean;
  },
) {
  if (typeof value !== "string") return invalid("missing_string");
  const raw = value.trim();
  if (!raw) return invalid("empty_string");

  const dataUrl = extractDataUrl(raw);
  let mimeType = options.fallbackMimeType?.trim().toLowerCase() || "";
  let base64 = raw;

  if (dataUrl) {
    mimeType = dataUrl.mime.toLowerCase();
    base64 = dataUrl.base64;
  } else if (options.requireDataUrlPrefix) {
    return invalid("missing_data_url_prefix");
  }

  if (!mimeType) return invalid("missing_mime_type");
  if (!isAllowedMime(mimeType, options.allowedMimeTypes.map((mime) => mime.toLowerCase()))) {
    return invalid("unsupported_mime_type");
  }

  base64 = normalizeBase64(base64);
  if (!isValidBase64(base64)) return invalid("invalid_base64");

  const bytes = decodeBase64(base64);
  if (bytes.length > options.maxBytes) return invalid("payload_too_large");

  return valid(mimeType, base64, bytes.length);
}

export function validateImagePayload(
  value: unknown,
  fallbackMimeType: string | null | undefined,
  options?: { maxBytes?: number; requireDataUrlPrefix?: boolean },
) {
  return parseBinaryPayload(value, {
    allowedMimeTypes: ["image/jpeg", "image/png"],
    fallbackMimeType,
    maxBytes: options?.maxBytes ?? 1 * 1024 * 1024,
    requireDataUrlPrefix: options?.requireDataUrlPrefix ?? false,
  });
}

export function validatePdfPayload(
  value: unknown,
  fallbackMimeType: string | null | undefined,
  options?: { maxBytes?: number; maxPages?: number; requireDataUrlPrefix?: boolean },
) {
  return parseBinaryPayload(value, {
    allowedMimeTypes: ["application/pdf"],
    fallbackMimeType,
    maxBytes: options?.maxBytes ?? 2 * 1024 * 1024,
    requireDataUrlPrefix: options?.requireDataUrlPrefix ?? false,
  });
}

export function validateTextPayload(value: unknown, maxLength = 10_000) {
  if (typeof value !== "string") return invalid("missing_text");
  const text = value.trim();
  if (!text || text.length > maxLength) return invalid("text_too_large");
  return {
    ok: true as const,
    text,
  };
}

export function detectPdfPageCount(bytes: Uint8Array) {
  const binary = new TextDecoder("latin1").decode(bytes);
  const pageMatches = binary.match(/\/Type\s*\/Page\b(?!s)/g);
  if (pageMatches?.length) return pageMatches.length;

  const counts = Array.from(binary.matchAll(/\/Count\s+(\d+)/g), (match) => Number(match[1])).filter((value) => Number.isFinite(value) && value > 0);
  if (counts.length) return Math.max(...counts);

  return null;
}

export function bytesFromBase64(base64: string) {
  const cleaned = base64.replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
