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

export function normalizeScanResult(raw: unknown): CanonicalScanResult {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name = normalizeText(source.name) || normalizeText(source.wine_name);
  const grape = normalizeText(source.grape) || normalizeText(source.grapes);
  return {
    name,
    producer: normalizeText(source.producer) || null,
    country: normalizeText(source.country) || null,
    region: normalizeText(source.region) || null,
    grape: grape || null,
    vintage: parseMaybeNumber(source.vintage),
    style: normalizeText(source.style) || null,
    drink_from: parseMaybeNumber(source.drink_from),
    drink_until: parseMaybeNumber(source.drink_until),
    estimated_price: parseMaybeNumber(source.estimated_price),
    purchase_price: parseMaybeNumber(source.purchase_price),
    food_pairing: normalizeText(source.food_pairing) || null,
    cellar_location: normalizeText(source.cellar_location) || null,
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
