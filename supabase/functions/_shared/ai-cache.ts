import { createClient } from "npm:@supabase/supabase-js@2.49.1";

export type AiCacheLookupResult<T = unknown> = {
  hit: boolean;
  degraded: boolean;
  inputHash: string;
  inputNormalized: string;
  payload?: T;
};

export type AiCacheScope = "global" | "user";

const STOPWORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas",
  "de", "da", "do", "das", "dos",
  "e", "em", "no", "na", "nos", "nas",
  "para", "por", "com", "sem", "ao", "aos", "à", "às",
  "the", "and", "of", "for", "to", "with",
  "vinho", "wine",
]);

const ENDPOINT_TTLS: Record<string, number | null> = {
  "analyze-wine-list": 7 * 24 * 60 * 60,
  "wine-pairings": 30 * 24 * 60 * 60,
  "scan-wine-label": null,
  "extract-image-text": null,
  "parse-pdf-ocr": null,
  "taste-compatibility": 7 * 24 * 60 * 60,
  "estimate-wine-price": 7 * 24 * 60 * 60,
  "wine-insight": 7 * 24 * 60 * 60,
  "parse-csv-wines": 7 * 24 * 60 * 60,
  "wishlist-wine-assistant": 7 * 24 * 60 * 60,
};

const ENDPOINT_SCOPES: Record<string, AiCacheScope> = {
  "analyze-wine-list": "global",
  "wine-pairings": "global",
  "scan-wine-label": "user",
  "extract-image-text": "user",
  "parse-pdf-ocr": "user",
  "taste-compatibility": "user",
  "estimate-wine-price": "user",
  "wine-insight": "user",
  "parse-csv-wines": "user",
  "wishlist-wine-assistant": "user",
};

function adminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

function stripDiacritics(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeFreeText(input: string) {
  const base = normalizeWhitespace(stripDiacritics(String(input ?? "").toLowerCase()));
  if (!base) return "";
  const tokens = base
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
  if (!tokens.length) return "";
  return Array.from(new Set(tokens)).sort().join(" ");
}

function stableCanonicalize(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string") return normalizeFreeText(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => stableCanonicalize(item)).filter((item) => item != null)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = stableCanonicalize((value as Record<string, unknown>)[key]);
      if (child != null && child !== "") out[key] = child;
    }
    return out;
  }
  return String(value);
}

function compactNormalizedString(value: unknown) {
  const canonical = stableCanonicalize(value);
  const json = JSON.stringify(canonical ?? null);
  if (json.length <= 2_000) return json;
  return `${json.slice(0, 2_000)}…`;
}

export async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function getAiCacheTtlSeconds(endpoint: string) {
  return ENDPOINT_TTLS[endpoint] ?? 7 * 24 * 60 * 60;
}

export function getAiCacheScope(endpoint: string, override?: AiCacheScope) {
  return override ?? ENDPOINT_SCOPES[endpoint] ?? "user";
}

export async function buildAiCacheKey(endpoint: string, input: unknown, options?: { scope?: AiCacheScope; userId?: string | null }) {
  const inputNormalized = compactNormalizedString(input);
  const scope = getAiCacheScope(endpoint, options?.scope);
  const userId = scope === "user" ? String(options?.userId || "").trim() : "";
  const hashBase = scope === "global"
    ? `${scope}:${endpoint}:${inputNormalized}`
    : `${scope}:${userId}:${endpoint}:${inputNormalized}`;
  const inputHash = await sha256Hex(hashBase);
  return { inputHash, inputNormalized, scope, userId: scope === "user" ? userId || null : null };
}

export async function getCachedAiResponse<T = unknown>(endpoint: string, input: unknown, options?: { scope?: AiCacheScope; userId?: string | null }): Promise<AiCacheLookupResult<T>> {
  const { inputHash, inputNormalized, scope, userId } = await buildAiCacheKey(endpoint, input, options);
  const client = adminClient();
  if (!client) {
    return { hit: false, degraded: true, inputHash, inputNormalized };
  }

  try {
    const { data, error } = await client
      .from("ai_cache")
      .select("response, expires_at")
      .eq("input_hash", inputHash)
      .maybeSingle();

    if (error) {
      console.warn("[AI_CACHE_MISS]", { endpoint, inputHash, reason: error.message });
      return { hit: false, degraded: true, inputHash, inputNormalized };
    }

    if (!data) {
      console.info("[AI_CACHE_MISS]", { endpoint, scope, userId, inputHash });
      return { hit: false, degraded: false, inputHash, inputNormalized };
    }

    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      console.info("[AI_CACHE_MISS]", { endpoint, scope, userId, inputHash, reason: "expired" });
      return { hit: false, degraded: false, inputHash, inputNormalized };
    }

    console.info("[AI_CACHE_HIT]", { endpoint, scope, userId, inputHash });
    return { hit: true, degraded: false, inputHash, inputNormalized, payload: data.response as T };
  } catch (error) {
    console.warn("[AI_CACHE_MISS]", { endpoint, scope, userId, inputHash, reason: error instanceof Error ? error.message : "unknown" });
    return { hit: false, degraded: true, inputHash, inputNormalized };
  }
}

export async function setCachedAiResponse<T = unknown>(endpoint: string, input: unknown, response: T, options?: { scope?: AiCacheScope; userId?: string | null }) {
  const client = adminClient();
  if (!client) return false;

  const { inputHash, inputNormalized, scope, userId } = await buildAiCacheKey(endpoint, input, options);
  const ttlSeconds = getAiCacheTtlSeconds(endpoint);
  const expiresAt = ttlSeconds == null ? null : new Date(Date.now() + ttlSeconds * 1000).toISOString();

  try {
    const { error } = await client.from("ai_cache").upsert({
      endpoint,
      cache_scope: scope,
      user_id: userId,
      input_hash: inputHash,
      input_normalized: inputNormalized,
      response,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }, { onConflict: "input_hash" });
    if (error) {
      console.warn("[AI_CACHE_WRITE_FAILED]", { endpoint, scope, userId, inputHash, reason: error.message });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[AI_CACHE_WRITE_FAILED]", { endpoint, scope, userId, inputHash, reason: error instanceof Error ? error.message : "unknown" });
    return false;
  }
}

export { normalizeFreeText, stableCanonicalize };
