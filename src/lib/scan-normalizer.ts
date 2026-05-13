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

const USELESS_SCAN_TEXT = new Set([
  "null",
  "undefined",
  "unknown",
  "unidentified",
  "não identificado",
  "nao identificado",
  "n/a",
  "na",
  "vinho não identificado",
  "vinho nao identificado",
  "vinho sem nome",
  "wine without name",
  "unidentified wine",
  "linha x",
]);

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (USELESS_SCAN_TEXT.has(lowered)) {
    return "";
  }
  if (/^linha\s+[a-z0-9]+$/i.test(text)) return "";
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

export function normalizeScanResult(raw: unknown): NormalizedScanResult {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name =
    normalizeText(source.name) ||
    normalizeText(source.wine_name) ||
    normalizeText(source.wineName);
  const grape =
    normalizeText(source.grape) ||
    normalizeText(source.grapes) ||
    normalizeText(source.varietal) ||
    normalizeText(source.varieties);
  return {
    ...source,
    name,
    producer: normalizeText(source.producer) || normalizeText(source.producer_name) || normalizeText(source.producerName) || normalizeText(source.winery) || null,
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

export function isMeaningfulScanValue(value: unknown) {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value);
  return Boolean(normalizeText(value));
}

export function getMeaningfulScanFields(result: Partial<CanonicalScanResult> & Record<string, unknown>) {
  return ([
    "name",
    "producer",
    "country",
    "region",
    "grape",
    "vintage",
    "style",
    "drink_from",
    "drink_until",
    "estimated_price",
    "purchase_price",
    "food_pairing",
    "cellar_location",
  ] as const).filter((field) => isMeaningfulScanValue(result[field]));
}

export function hasIdentifyingScanResult(result: Partial<CanonicalScanResult> & Record<string, unknown>) {
  const hasName = isMeaningfulScanValue(result.name);
  const hasProducer = isMeaningfulScanValue(result.producer);
  const strongAnchors = [
    result.country,
    result.region,
    result.grape,
  ].filter(isMeaningfulScanValue).length;
  const supportingAnchors = [
    result.vintage,
    result.style,
  ].filter(isMeaningfulScanValue).length;

  return hasName || hasProducer || (strongAnchors >= 1 && strongAnchors + supportingAnchors >= 2);
}

export function hasMeaningfulScanResult(result: CanonicalScanResult) {
  return hasIdentifyingScanResult(result);
}
