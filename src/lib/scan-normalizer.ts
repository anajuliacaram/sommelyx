export type CanonicalScanResult = {
  name: string;
  producer: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  vintage: number | null;
  style: string | null;
  drink_from: number | null;
  drink_until: number | null;
  estimated_price: number | null;
  purchase_price: number | null;
  food_pairing: string | null;
  cellar_location: string | null;
};

export type NormalizedScanResult = CanonicalScanResult & Record<string, unknown>;

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (["null", "undefined", "unknown", "unidentified", "não identificado", "nao identificado", "n/a", "na"].includes(lowered)) {
    return "";
  }
  if (text.length === 1 && /[a-z0-9]/i.test(text)) return "";
  return text;
}

function parseMaybeNumber(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value
    .trim()
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitTextLines(value: unknown) {
  if (typeof value !== "string") return [] as string[];
  return value
    .split(/\r?\n+/)
    .map((line) => normalizeText(line))
    .filter((line): line is string => !!line);
}

function looksLikeWineLine(line: string) {
  const normalized = line.toLowerCase();
  return /reserva|reserve|riserva|chianti|malbec|cabernet|merlot|pinot|syrah|shiraz|chardonnay|sauvignon|riesling|brut|rosso|bianco|classico|gran|grand/i.test(normalized)
    || /^[A-ZÀ-Ý0-9'’\-\s]{6,}$/.test(line);
}

function extractNameFromRawText(source: Record<string, unknown>) {
  const primary = [
    source.wineName,
    source.wine_name,
    source.label_text,
    source.labelText,
    source.primary_text,
  ].map((value) => normalizeText(value)).find(Boolean);
  if (primary) return primary;

  const fullTextLines = splitTextLines(source.full_text || source.fullText || source.ocr_text || source.text);
  const bestLine = fullTextLines.find(looksLikeWineLine);
  if (bestLine) return bestLine;
  return fullTextLines[0] || "";
}

function extractProducerFromRawText(source: Record<string, unknown>) {
  const explicit = [
    source.producer,
    source.producer_name,
    source.producerName,
    source.winery,
    source.winery_name,
    source.winemaker,
  ].map((value) => normalizeText(value)).find(Boolean);
  if (explicit) return explicit;

  const fullTextLines = splitTextLines(source.full_text || source.fullText || source.ocr_text || source.text);
  return (
    fullTextLines.find((line) => /vinicola|vinícola|winery|bodega|cantina|estate|vineyards|produtor|producer/i.test(line)) ||
    ""
  );
}

export function normalizeScanResult(raw: unknown): NormalizedScanResult {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name =
    normalizeText(source.name) ||
    normalizeText(source.wine_name) ||
    normalizeText(source.wineName) ||
    extractNameFromRawText(source);
  const grape =
    normalizeText(source.grape) ||
    normalizeText(source.grapes) ||
    normalizeText(source.varietal) ||
    normalizeText(source.varieties);
  return {
    ...source,
    name,
    producer: normalizeText(source.producer) || normalizeText(source.producer_name) || normalizeText(source.producerName) || normalizeText(source.winery) || extractProducerFromRawText(source) || null,
    country: normalizeText(source.country) || normalizeText(source.pais) || normalizeText(source["país"]) || normalizeText(source.origin) || null,
    region: normalizeText(source.region) || normalizeText(source.regiao) || normalizeText(source["região"]) || normalizeText(source.appellation) || null,
    grape: grape || null,
    vintage: parseMaybeNumber(source.vintage) ?? parseMaybeNumber(source.year) ?? parseMaybeNumber(source.vintage_year),
    style: normalizeText(source.style) || normalizeText(source.wine_style) || normalizeText(source.type) || null,
    drink_from: parseMaybeNumber(source.drink_from) ?? parseMaybeNumber(source.drinkFrom),
    drink_until: parseMaybeNumber(source.drink_until) ?? parseMaybeNumber(source.drinkUntil),
    estimated_price: parseMaybeNumber(source.estimated_price) ?? parseMaybeNumber(source.estimatedPrice),
    purchase_price: parseMaybeNumber(source.purchase_price) ?? parseMaybeNumber(source.price),
    food_pairing: normalizeText(source.food_pairing) || normalizeText(source.foodPairing) || null,
    cellar_location: normalizeText(source.cellar_location) || normalizeText(source.location) || null,
  };
}

export function hasMeaningfulScanResult(result: CanonicalScanResult) {
  return Boolean(
    result.name ||
      result.producer ||
      result.country ||
      result.region ||
      result.grape ||
      result.vintage != null ||
      result.style ||
      result.drink_from != null ||
      result.drink_until != null ||
      result.estimated_price != null ||
      result.purchase_price != null ||
      result.food_pairing ||
      result.cellar_location,
  );
}
