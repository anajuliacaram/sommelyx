import { normalizeWineText, normalizeWineSearchText } from "@/lib/wine-normalization";

export interface WineOcrCandidate {
  name: string;
  producer?: string | null;
  vintage?: number | null;
  country?: string | null;
  region?: string | null;
  grape?: string | null;
  style?: string | null;
  price?: string | null;
  confidence: number;
  sourceLines: string[];
}

export interface NormalizedWineOcrResult {
  originalText: string;
  cleanText: string;
  structuredJson: string;
  structured: {
    candidates: WineOcrCandidate[];
    removedLines: string[];
    dedupedLines: number;
    mergedLines: number;
    noiseLines: number;
  };
  normalizedText: string;
}

const COUNTRY_MAP: Array<{ key: string; country: string }> = [
  { key: "casa valduga", country: "Brasil" },
  { key: "catena zapata", country: "Argentina" },
  { key: "concha y toro", country: "Chile" },
  { key: "veuve clicquot", country: "França" },
  { key: "moet chandon", country: "França" },
  { key: "moët & chandon", country: "França" },
  { key: "cloudy bay", country: "Nova Zelândia" },
  { key: "sassicaia", country: "Itália" },
  { key: "tenuta san guido", country: "Itália" },
  { key: "almaviva", country: "Chile" },
  { key: "pizzato", country: "Brasil" },
  { key: "salton", country: "Brasil" },
  { key: "miolo", country: "Brasil" },
  { key: "salentein", country: "Argentina" },
];

const COUNTRY_NAMES = [
  "Argentina",
  "Brasil",
  "Chile",
  "França",
  "Itália",
  "Portugal",
  "Espanha",
  "Uruguai",
  "Alemanha",
  "Nova Zelândia",
  "Estados Unidos",
  "África do Sul",
];

const NOISE_PATTERNS = [
  /\bbarcode\b/i,
  /\bean\b/i,
  /\blegal\b/i,
  /\bcopyright\b/i,
  /\ball rights reserved\b/i,
  /\bvolume\b/i,
  /\bml\b/i,
  /\blitros?\b/i,
  /\bvol\.?\b/i,
  /\bconte[úu]do\b/i,
  /\bservir\b/i,
  /\btemperatura\b/i,
  /\bwww\./i,
  /\bhttps?:\/\//i,
  /^\s*page\s+\d+/i,
  /^\s*p[aá]gina\s+\d+/i,
  /^\s*\d{8,}\s*$/,
  /^\s*[\d\s-]{10,}$/,
];

const GRAPE_PATTERNS: Array<{ pattern: RegExp; grape: string }> = [
  { pattern: /\bcabernet sauvignon\b/i, grape: "Cabernet Sauvignon" },
  { pattern: /\bmalbec\b/i, grape: "Malbec" },
  { pattern: /\bmerlot\b/i, grape: "Merlot" },
  { pattern: /\bpinot noir\b/i, grape: "Pinot Noir" },
  { pattern: /\bchardonnay\b/i, grape: "Chardonnay" },
  { pattern: /\bsauvignon blanc\b/i, grape: "Sauvignon Blanc" },
  { pattern: /\briesling\b/i, grape: "Riesling" },
  { pattern: /\bsyrah\b/i, grape: "Syrah" },
  { pattern: /\btempranillo\b/i, grape: "Tempranillo" },
  { pattern: /\bsangiovese\b/i, grape: "Sangiovese" },
  { pattern: /\bnebbiolo\b/i, grape: "Nebbiolo" },
  { pattern: /\bmoscato\b/i, grape: "Moscato" },
  { pattern: /\bpinot grigio\b/i, grape: "Pinot Grigio" },
  { pattern: /\balvarinho\b/i, grape: "Alvarinho" },
  { pattern: /\bmoscatel\b/i, grape: "Moscatel" },
  { pattern: /\bblend\b/i, grape: "Blend" },
];

function squeeze(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeSearch(value?: string | null) {
  return normalizeWineSearchText(value);
}

function looksLikeNoise(line: string) {
  const cleaned = squeeze(line);
  if (!cleaned) return true;
  if (cleaned.length < 2) return true;
  if (NOISE_PATTERNS.some((pattern) => pattern.test(cleaned))) return true;
  if (/^\d+([.,]\d+)?\s?(ml|l|cl|g|kg)?$/i.test(cleaned)) return true;
  if (/^\d{1,4}([.,]\d{2})?$/i.test(cleaned)) return true;
  return false;
}

function mergeBrokenWords(text: string) {
  return text
    .replace(/([A-Za-zÀ-ÿ])-\n([A-Za-zÀ-ÿ])/g, "$1$2")
    .replace(/([A-Za-zÀ-ÿ])-\s+([A-Za-zÀ-ÿ])/g, "$1$2");
}

function splitRawLines(text: string) {
  return mergeBrokenWords(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => squeeze(line))
    .filter(Boolean);
}

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];
  let removed = 0;

  for (const line of lines) {
    const key = normalizeSearch(line);
    if (!key) continue;
    if (seen.has(key)) {
      removed++;
      continue;
    }
    seen.add(key);
    deduped.push(line);
  }

  return { lines: deduped, removed };
}

function mergeContinuationLines(lines: string[]) {
  const merged: string[] = [];
  let buffer = "";
  let mergedCount = 0;

  for (const line of lines) {
    if (!buffer) {
      buffer = line;
      continue;
    }

    const shouldJoin =
      !/[.:;!?]$/.test(buffer) &&
      (line.length < 45 || /^[a-zà-ÿ0-9]/.test(line) || /\b(?:safra|uva|blend|r[óo]tulo|vinho|producer|produtor)\b/i.test(line));

    if (shouldJoin) {
      buffer = `${buffer} ${line}`.replace(/\s+/g, " ").trim();
      mergedCount++;
    } else {
      merged.push(buffer);
      buffer = line;
    }
  }

  if (buffer) merged.push(buffer);
  return { lines: merged, mergedCount };
}

function inferCountryFromProducer(text: string, producer?: string | null) {
  const haystack = normalizeSearch(`${text} ${producer || ""}`);
  for (const entry of COUNTRY_MAP) {
    if (haystack.includes(entry.key)) return entry.country;
  }
  return null;
}

function inferExplicitCountry(text: string) {
  const haystack = normalizeSearch(text);
  const match = COUNTRY_NAMES.find((country) => haystack.includes(normalizeSearch(country)));
  return match || null;
}

function inferVintage(text: string) {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function inferPrice(text: string) {
  const match = text.match(/(?:R\$|BRL|\$|€|£)\s?(\d+[.,]\d{2})/i) || text.match(/\b\d+[.,]\d{2}\b/);
  return match ? match[1].replace(".", ",") : null;
}

function inferGrape(text: string) {
  const lower = normalizeSearch(text);
  const hits = GRAPE_PATTERNS.filter(({ pattern }) => pattern.test(text));
  if (hits.length === 0) return null;
  if (hits.length > 1) return "Blend";
  const grape = hits[0].grape;
  if (grape === "Blend") return "Blend";
  const hasMultipleGrapes = /[,/+\-&]|blend|assemblage|corte/i.test(lower) && hits.length >= 1;
  return hasMultipleGrapes ? "Blend" : grape;
}

function inferProducer(line: string) {
  const segments = line.split(/\s+[|•·-]\s+|\s{2,}/).map((part) => squeeze(part)).filter(Boolean);
  if (segments.length < 2) return null;
  const candidate = segments[0];
  if (candidate.length < 2) return null;
  if (/\b(?:r[óo]tulo|safra|uva|blend|branco|tinto|espumante)\b/i.test(candidate)) return null;
  return normalizeWineText(candidate) || candidate;
}

function inferName(line: string, producer?: string | null) {
  let name = line;
  if (producer) {
    const escaped = producer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    name = name.replace(new RegExp(`^${escaped}\\s*[|•·\\-:]?\\s*`, "i"), "");
  }
  name = name.replace(/\b(19|20)\d{2}\b/g, "").replace(/(?:R\$|BRL|\$|€|£)\s?\d+[.,]\d{2}/gi, "").replace(/\s{2,}/g, " ").trim();
  return normalizeWineText(name) || name || "";
}

function scoreCandidate(candidate: WineOcrCandidate) {
  let score = 0.2;
  if (candidate.name?.trim()) score += 0.25;
  if (candidate.producer?.trim()) score += 0.15;
  if (candidate.vintage) score += 0.1;
  if (candidate.country?.trim()) score += 0.08;
  if (candidate.grape?.trim()) score += 0.12;
  if (candidate.price?.trim()) score += 0.1;
  if (candidate.style?.trim()) score += 0.05;
  if (candidate.sourceLines.length > 1) score += 0.05;
  return Number(Math.min(1, score).toFixed(2));
}

export function normalizeWineListOcrText(rawText: string, options?: { fileName?: string; mimeType?: string }) {
  const originalText = String(rawText || "");
  const rawLines = splitRawLines(originalText);
  const cleanedLines = rawLines.filter((line) => !looksLikeNoise(line));
  const { lines: dedupedLines, removed: dedupedCount } = dedupeLines(cleanedLines);
  const { lines: mergedLines, mergedCount } = mergeContinuationLines(dedupedLines);

  const candidates: WineOcrCandidate[] = [];
  const candidateBlocks: string[] = [];
  let block: string[] = [];

  const flushBlock = () => {
    if (block.length === 0) return;
    const text = block.join(" ").replace(/\s+/g, " ").trim();
    if (text.length < 4) {
      block = [];
      return;
    }
    const price = inferPrice(text);
    const producer = inferProducer(text);
    const country = inferExplicitCountry(text) || inferCountryFromProducer(text, producer);
    const vintage = inferVintage(text);
    const grape = inferGrape(text);
    const style =
      /\bespumante|champagne|prosecco|cava|brut\b/i.test(text) ? "Espumante" :
      /\bbranco|white\b/i.test(text) ? "Branco" :
      /\bros[eé]|rose\b/i.test(text) ? "Rosé" :
      /\bfortificado|fortified\b/i.test(text) ? "Fortificado" :
      /\bsobremesa|dessert\b/i.test(text) ? "Sobremesa" :
      /\btinto|red\b/i.test(text) ? "Tinto" :
      null;
    const name = inferName(text, producer);
    const candidate: WineOcrCandidate = {
      name,
      producer: producer || null,
      vintage,
      country,
      region: null,
      grape: grape || null,
      style,
      price,
      confidence: 0,
      sourceLines: [...block],
    };
    candidate.confidence = scoreCandidate(candidate);
    if (candidate.name && candidate.confidence >= 0.45) {
      candidates.push(candidate);
      candidateBlocks.push(text);
    }
    block = [];
  };

  for (const line of mergedLines) {
    const looksLikeBoundary =
      /(?:\bR\$|\bBRL\b|[$€£]\s?\d)/i.test(line) ||
      /\b(19|20)\d{2}\b/.test(line) ||
      /^[•·\-*]/.test(line) ||
      /[\|\u2022]/.test(line) ||
      /\b(?:tinto|branco|ros[eé]|espumante|blend|cabernet|merlot|malbec|chardonnay|sauvignon|riesling|syrah|tempranillo)\b/i.test(line);

    if (looksLikeBoundary && block.length > 0) flushBlock();
    block.push(line);
    if (looksLikeBoundary) flushBlock();
  }
  flushBlock();

  const fallbackLines = mergedLines.filter(Boolean);
  const cleanText = fallbackLines.join("\n").trim();
  const structured = {
    candidates,
    removedLines: rawLines.filter((line) => !dedupedLines.includes(line) && !mergedLines.includes(line)),
    dedupedLines: dedupedCount,
    mergedLines: mergedCount,
    noiseLines: rawLines.length - cleanedLines.length,
  };
  const structuredJson = JSON.stringify(
    {
      source: {
        fileName: options?.fileName || null,
        mimeType: options?.mimeType || null,
      },
      candidates,
      summary: {
        detectedItems: candidates.length,
        dedupedLines: dedupedCount,
        mergedLines: mergedCount,
        noiseLines: structured.noiseLines,
      },
    },
    null,
    2,
  );

  const normalizedText = [
    "[WINE_OCR_NORMALIZED_JSON]",
    structuredJson,
    "",
    "[WINE_OCR_CLEAN_TEXT]",
    cleanText,
  ].join("\n");

  return {
    originalText,
    cleanText,
    structuredJson,
    structured,
    normalizedText,
  } satisfies NormalizedWineOcrResult;
}
