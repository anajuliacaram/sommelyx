import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const BUCKET = "wishlist-images";
const SEARCH_TIMEOUT_MS = 12_000;
const DOWNLOAD_TIMEOUT_MS = 15_000;
const MIN_IMAGE_BYTES = 6_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type WineRow = {
  id: string;
  user_id: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  style: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  image_url: string | null;
};

function normalizeText(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") || "";
}

function getTone(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("branco")) return { a: "#E9DFAF", b: "#B9984F", c: "#FFF8E7" };
  if (s.includes("espum")) return { a: "#EDE0BC", b: "#C5A45D", c: "#FFF8E7" };
  if (s.includes("rose")) return { a: "#DDA2B4", b: "#A34C68", c: "#FFF6F8" };
  if (s.includes("fort")) return { a: "#C58A49", b: "#7D4D23", c: "#FFF4E7" };
  return { a: "#7B1E2B", b: "#4A101A", c: "#FFF2F3" };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvgFallback(row: WineRow) {
  const tone = getTone(row.style);
  const name = escapeXml(normalizeText(row.name) || "Wine");
  const producer = escapeXml(normalizeText(row.producer) || "Sommelyx");
  const grape = escapeXml(normalizeText(row.grape) || "Rótulo ilustrativo");
  const region = escapeXml([normalizeText(row.region), normalizeText(row.country)].filter(Boolean).join(" · ") || "Cellar view");
  const vintage = row.vintage ? String(row.vintage) : "Safra n/i";

  const svg = `
    <svg width="900" height="1200" viewBox="0 0 900 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="110" y1="80" x2="790" y2="1120" gradientUnits="userSpaceOnUse">
          <stop stop-color="${tone.a}" />
          <stop offset="0.52" stop-color="#F8F2EA" />
          <stop offset="1" stop-color="${tone.b}" />
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(450 250) rotate(90) scale(330 270)">
          <stop stop-color="${tone.c}" stop-opacity="0.92" />
          <stop offset="1" stop-color="${tone.c}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="900" height="1200" rx="56" fill="url(#bg)" />
      <rect x="68" y="68" width="764" height="1064" rx="44" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.22)" />
      <rect x="120" y="120" width="660" height="960" rx="34" fill="rgba(255,255,255,0.34)" />
      <circle cx="450" cy="275" r="188" fill="url(#glow)" />
      <circle cx="450" cy="275" r="126" fill="rgba(255,255,255,0.32)" />
      <circle cx="450" cy="275" r="82" fill="rgba(255,255,255,0.52)" />
      <text x="450" y="552" text-anchor="middle" font-size="28" font-family="Inter, Arial, sans-serif" letter-spacing="0.28em" fill="rgba(53,36,42,0.58)">SOMMELYX</text>
      <text x="450" y="642" text-anchor="middle" font-size="54" font-weight="700" font-family="Georgia, 'Times New Roman', serif" fill="#1B1417">${name}</text>
      <text x="450" y="714" text-anchor="middle" font-size="32" font-family="Inter, Arial, sans-serif" fill="rgba(27,20,23,0.72)">${producer}</text>
      <text x="450" y="782" text-anchor="middle" font-size="32" font-family="Inter, Arial, sans-serif" font-weight="600" fill="rgba(27,20,23,0.66)">${escapeXml(vintage)}</text>
      <text x="450" y="852" text-anchor="middle" font-size="28" font-family="Inter, Arial, sans-serif" fill="rgba(27,20,23,0.62)">${grape}</text>
      <text x="450" y="918" text-anchor="middle" font-size="26" font-family="Inter, Arial, sans-serif" fill="rgba(27,20,23,0.58)">${region}</text>
      <rect x="266" y="972" width="368" height="58" rx="29" fill="rgba(255,255,255,0.60)" />
      <text x="450" y="1009" text-anchor="middle" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700" fill="rgba(27,20,23,0.66)">Imagem ilustrativa</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildSearchQuery(row: WineRow): string {
  const parts = [
    normalizeText(row.producer),
    normalizeText(row.name),
    row.vintage ? String(row.vintage) : "",
    "wine bottle label",
  ].filter(Boolean);
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      dedup.push(p);
    }
  }
  return dedup.join(" ");
}

function buildSearchQueries(row: WineRow): string[] {
  const producer = normalizeText(row.producer);
  const name = normalizeText(row.name);
  const vintage = row.vintage ? String(row.vintage) : "";

  const variants = [
    [producer, name, vintage, "wine bottle label"].filter(Boolean).join(" "),
    [producer, name, vintage, "wine"].filter(Boolean).join(" "),
    [producer, name, "wine label"].filter(Boolean).join(" "),
    [name, vintage, "wine"].filter(Boolean).join(" "),
    [name, "wine label"].filter(Boolean).join(" "),
  ];

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean)));
}

function buildWineDotComQueries(row: WineRow): string[] {
  const producer = normalizeText(row.producer);
  const name = normalizeText(row.name);
  const vintage = row.vintage ? String(row.vintage) : "";

  const variants = [
    `site:wine.com/product "${producer} ${name}" ${vintage} wine`,
    `site:wine.com/product "${name}" ${vintage} wine`,
    `site:wine.com/product "${producer} ${name}" wine`,
    `site:wine.com/list/wine "${producer}" "${name}" wine`,
    `site:wine.com/list/wine "${producer}" wine`,
    `site:wine.com "${producer} ${name}" ${vintage} "Front Bottle Shot"`,
    `site:wine.com "${producer} ${name}" ${vintage} "Front Label"`,
  ];

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean)));
}

const BLOCKED_HOST_PATTERNS = [/wine-searcher\.com/i, /\.gif($|\?)/i];
const ACCEPTED_MIME = /^image\/(jpeg|jpg|png|webp|avif)$/i;

function extractStoragePath(value?: string | null) {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url || /^(data|blob):/i.test(url)) return null;
  if (!/^https?:\/\//i.test(url)) return url.replace(/^\/+/, "");

  const patterns = [
    /\/storage\/v1\/object\/sign\/(?:wine-label-images|wishlist-images)\/([^?]+)/i,
    /\/storage\/v1\/object\/public\/(?:wine-label-images|wishlist-images)\/([^?]+)/i,
    /\/storage\/v1\/object\/authenticated\/(?:wine-label-images|wishlist-images)\/([^?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }

  return null;
}

function isLikelyValidImageUrl(u: string): boolean {
  if (!u || !/^https?:\/\//i.test(u)) return false;
  if (/^https?:\/\/cellar\.db\.wine\/attachments\//i.test(u)) return false;
  if (BLOCKED_HOST_PATTERNS.some((rx) => rx.test(u))) return false;
  if (/alert\.jpg|placeholder|notfound|not[-_]?found|404\.|missing|sprite|favicon/i.test(u)) return false;
  return true;
}

async function toClientImageUrl(adminClient: ReturnType<typeof createClient>, value?: string | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (/^data:image\//i.test(raw)) return raw;

  const storagePath = extractStoragePath(raw);
  if (!storagePath) return raw;

  const { data } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath);
  if (data?.publicUrl) return data.publicUrl;
  return raw;
}

async function searchWithGoogleCSE(query: string): Promise<string[]> {
  const key = Deno.env.get("GOOGLE_CSE_API_KEY")?.trim();
  const cx = Deno.env.get("GOOGLE_CSE_ID")?.trim();
  if (!key || !cx) return [];
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "10");
  url.searchParams.set("safe", "active");
  url.searchParams.set("imgType", "photo");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url.toString(), { signal: ctrl.signal });
    if (!resp.ok) return [];
    const json = await resp.json().catch(() => null) as any;
    const items: any[] = Array.isArray(json?.items) ? json.items : [];
    return items.map((it) => typeof it?.link === "string" ? it.link : "").filter(isLikelyValidImageUrl);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function searchWithDuckDuckGo(query: string): Promise<string[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
  try {
    const tokenResp = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
    const html = await tokenResp.text();
    const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/) || html.match(/vqd=([\d-]+)&/);
    const vqd = vqdMatch?.[1];
    if (!vqd) return [];
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,&p=1`;
    const resp = await fetch(apiUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://duckduckgo.com/",
      },
    });
    if (!resp.ok) return [];
    const json = await resp.json().catch(() => null) as any;
    const results: any[] = Array.isArray(json?.results) ? json.results : [];
    return results.map((r) => typeof r?.image === "string" ? r.image : "").filter(isLikelyValidImageUrl).slice(0, 15);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function searchWithDuckDuckGoWeb(query: string): Promise<string[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
  try {
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const results = new Set<string>();
    const linkMatches = html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/gi);
    for (const match of linkMatches) {
      const raw = match[1] || "";
      try {
        const url = new URL(raw, "https://html.duckduckgo.com");
        const redirected = url.searchParams.get("uddg");
        const finalUrl = redirected ? decodeURIComponent(redirected) : url.toString();
        if (isLikelyValidImageUrl(finalUrl) || /^https?:\/\//i.test(finalUrl)) {
          results.add(finalUrl);
        }
      } catch {
        continue;
      }
      if (results.size >= 8) break;
    }
    return Array.from(results);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

function decodeHtmlEntity(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absolutizeUrl(raw: string, baseUrl: string) {
  try {
    return new URL(decodeHtmlEntity(raw.trim()), baseUrl).toString();
  } catch {
    return null;
  }
}

function normalizeCandidateImageUrl(url: string) {
  if (!/assets\.wine\.com\/winecom\/image\/upload/i.test(url)) return url;

  return url.replace(
    /\/w_\d+,h_\d+,c_fit,q_auto:best,fl_progressive\//i,
    "/w_420,h_840,c_fit,q_auto:best,fl_progressive/",
  );
}

function extractUrlsFromJsonLd(value: unknown, baseUrl: string, output: Set<string>) {
  if (!value) return;
  if (typeof value === "string") {
    const abs = absolutizeUrl(value, baseUrl);
    if (abs && isLikelyValidImageUrl(abs)) output.add(normalizeCandidateImageUrl(abs));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => extractUrlsFromJsonLd(entry, baseUrl, output));
    return;
  }
  if (typeof value === "object") {
    const imageValue = (value as Record<string, unknown>).image;
    if (imageValue) extractUrlsFromJsonLd(imageValue, baseUrl, output);
  }
}

function scoreImageCandidate(url: string) {
  const lower = url.toLowerCase();
  let score = 0;
  if (/front|bottle|label|product|winecom\/image\/upload/.test(lower)) score += 4;
  if (/front bottle shot|front label/.test(lower)) score += 3;
  if (/assets\.wine\.com/.test(lower)) score += 4;
  if (/upload|cdn|assets/.test(lower)) score += 2;
  if (/icon|logo|sprite|avatar|favicon|app-store|google-play|social/.test(lower)) score -= 5;
  if (!/\.(jpg|jpeg|png|webp|avif)(\?|$)/.test(lower) && !/image\/upload/.test(lower)) score -= 1;
  return score;
}

function extractImageCandidatesFromHtml(html: string, pageUrl: string): string[] {
  const results = new Set<string>();
  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/gi,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/gi,
  ];

  for (const pattern of metaPatterns) {
    for (const match of html.matchAll(pattern)) {
      const abs = absolutizeUrl(match[1] || "", pageUrl);
      if (abs && isLikelyValidImageUrl(abs)) {
        results.add(normalizeCandidateImageUrl(abs));
      }
    }
  }

  const scriptMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      extractUrlsFromJsonLd(parsed, pageUrl, results);
    } catch {
      continue;
    }
  }

  const attributeMatches = html.matchAll(/(?:src|data-src|data-original|href)=["']([^"']+)["']/gi);
  for (const match of attributeMatches) {
    const abs = absolutizeUrl(match[1] || "", pageUrl);
    if (!abs || !isLikelyValidImageUrl(abs)) continue;
    if (scoreImageCandidate(abs) <= 0) continue;
    results.add(normalizeCandidateImageUrl(abs));
  }

  return Array.from(results).sort((a, b) => scoreImageCandidate(b) - scoreImageCandidate(a));
}

async function collectImagesFromProductPages(pageUrls: string[]): Promise<string[]> {
  const images = new Set<string>();
  for (const pageUrl of pageUrls.slice(0, 5)) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
    try {
      const resp = await fetch(pageUrl, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const candidates = extractImageCandidatesFromHtml(html, resp.url || pageUrl);
      for (const candidate of candidates) {
        images.add(candidate);
        if (images.size >= 12) break;
      }
    } catch {
      // keep trying other pages
    } finally {
      clearTimeout(t);
    }
    if (images.size >= 12) break;
  }

  return Array.from(images);
}

async function searchViaProductPages(query: string): Promise<string[]> {
  const pageUrls = await searchWithDuckDuckGoWeb(query);
  if (pageUrls.length === 0) return [];
  return collectImagesFromProductPages(pageUrls);
}

async function searchWineDotComPages(row: WineRow): Promise<string[]> {
  const queries = buildWineDotComQueries(row);
  const pageUrls = new Set<string>();

  for (const query of queries) {
    const urls = await searchWithDuckDuckGoWeb(query);
    for (const url of urls) {
      if (/^https?:\/\/www\.wine\.com\/(product|list)\//i.test(url)) {
        pageUrls.add(url);
      }
      if (pageUrls.size >= 8) break;
    }
    if (pageUrls.size >= 8) break;
  }

  if (pageUrls.size === 0) return [];

  console.log("wine-image-resolver wine_dot_com_pages", {
    wineId: row.id,
    wineName: row.name,
    pageUrls: Array.from(pageUrls),
  });

  return collectImagesFromProductPages(Array.from(pageUrls));
}

async function downloadImage(url: string): Promise<{ ok: true; bytes: Uint8Array; mime: string } | { ok: false; error: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!resp.ok) return { ok: false, error: `download status ${resp.status}` };
    const ct = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!ACCEPTED_MIME.test(ct)) return { ok: false, error: `bad mime: ${ct}` };
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.length < MIN_IMAGE_BYTES) return { ok: false, error: `too small (${buf.length}b)` };
    if (buf.length > MAX_IMAGE_BYTES) return { ok: false, error: `too large (${buf.length}b)` };
    return { ok: true, bytes: buf, mime: ct };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "download failed" };
  } finally {
    clearTimeout(t);
  }
}

async function persistDownloadedImage(
  adminClient: ReturnType<typeof createClient>,
  row: WineRow,
  image: { bytes: Uint8Array; mime: string },
) {
  const ext = image.mime.includes("jpeg") ? "jpg" : image.mime.includes("webp") ? "webp" : image.mime.includes("avif") ? "avif" : "png";
  const path = `${row.user_id}/web/${row.id}-${Date.now()}.${ext}`;
  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(path, new Blob([image.bytes], { type: image.mime }), {
      cacheControl: "31536000",
      upsert: true,
      contentType: image.mime,
    });

  if (uploadError) {
    return { ok: false as const, error: `upload_failed:${uploadError.message}` };
  }

  const finalUrl = await toClientImageUrl(adminClient, path);
  if (!finalUrl) {
    return { ok: false as const, error: "signed_url_generation_failed" };
  }

  const { error: persistError } = await adminClient
    .from("wines")
    .update({ image_url: finalUrl })
    .eq("id", row.id)
    .eq("user_id", row.user_id);

  if (persistError) {
    return { ok: false as const, error: `persist_failed:${persistError.message}` };
  }

  return { ok: true as const, path, finalUrl };
}

async function findRealLabelImage(
  row: WineRow,
  options?: { excludeUrls?: string[] },
): Promise<{ ok: true; bytes: Uint8Array; mime: string; sourceUrl: string } | { ok: false; error: string }> {
  const queries = buildSearchQueries(row);
  if (queries.length === 0) return { ok: false, error: "empty query" };
  const excluded = new Set((options?.excludeUrls ?? []).filter(Boolean).map((value) => value.trim()));

  let lastError = "no search results";
  for (const query of queries) {
    let candidates = await searchWineDotComPages(row);
    if (candidates.length === 0) candidates = await searchWithGoogleCSE(query);
    if (candidates.length === 0) candidates = await searchWithDuckDuckGo(query);
    if (candidates.length === 0) candidates = await searchViaProductPages(query);
    if (candidates.length === 0) {
      lastError = `no search results for query: ${query}`;
      continue;
    }

    for (const url of candidates.slice(0, 8)) {
      if (excluded.has(url.trim())) {
        lastError = `${query} -> excluded candidate`;
        continue;
      }
      const dl = await downloadImage(url);
      if (dl.ok) return { ok: true, bytes: dl.bytes, mime: dl.mime, sourceUrl: url };
      lastError = `${query} -> ${dl.error}`;
    }
  }

  return { ok: false, error: lastError };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Sessão expirada. Faça login novamente.", code: "AUTH_REQUIRED" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Sessão expirada. Faça login novamente.", code: "AUTH_REQUIRED" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const wineId = typeof body?.wineId === "string" ? body.wineId.trim() : "";
    const failedUrl = typeof body?.failedUrl === "string" ? body.failedUrl.trim() : "";
    const force = body?.force === true || body?.regenerate === true;
    if (!wineId) return jsonResponse({ error: "Wine ID inválido." }, 400);

    console.log("wine-image-resolver request_received", {
      wineId,
      force,
      failedUrl: failedUrl || null,
      hasAuthHeader: Boolean(authHeader),
      userId: user.id,
    });

    const { data: wine, error: wineError } = await adminClient
      .from("wines")
      .select("id,user_id,name,producer,vintage,style,country,region,grape,image_url")
      .eq("id", wineId)
      .eq("user_id", user.id)
      .single();

    if (wineError || !wine) {
      return jsonResponse({ error: "Vinho não encontrado." }, 404);
    }

    const row = wine as WineRow;

    const url = row.image_url || "";
    const storagePath = extractStoragePath(url);
    const isBadPlaceholder = /alert\.jpg|placeholder|notfound|not[-_]?found|404\.|missing/i.test(url);
    const isSvgFallback = url.startsWith("data:image/svg+xml");
    const isRejectedUrl = !!failedUrl && url.trim() === failedUrl;
    const hasRealImage = !!url && !isBadPlaceholder && !isSvgFallback && !isRejectedUrl && (!!storagePath || isLikelyValidImageUrl(url));
    if (hasRealImage && !force) {
      const clientUrl = await toClientImageUrl(adminClient, url);
      console.log("wine-image-resolver cached_image_reused", {
        wineId: row.id,
        imageUrl: row.image_url,
        clientUrl,
      });
      return jsonResponse({ ok: true, image_url: clientUrl, source: "cached" });
    }

    const proxyCandidateUrl = failedUrl || (storagePath ? "" : url);
    if (proxyCandidateUrl && isLikelyValidImageUrl(proxyCandidateUrl)) {
      const proxyDownload = await downloadImage(proxyCandidateUrl);
      if (proxyDownload.ok) {
        const persisted = await persistDownloadedImage(adminClient, row, proxyDownload);
        if (persisted.ok) {
          console.log("wine-image-resolver proxied_current_image", {
            wineId: row.id,
            sourceUrl: proxyCandidateUrl,
            persistedPath: persisted.path,
            finalUrl: persisted.finalUrl,
            durationMs: Date.now() - startTime,
          });

          return jsonResponse({
            ok: true,
            image_url: persisted.finalUrl,
            source: "proxied-current",
            source_url: proxyCandidateUrl,
            duration_ms: Date.now() - startTime,
          });
        }

        console.warn("wine-image-resolver proxy persist failed:", {
          wineId: row.id,
          sourceUrl: proxyCandidateUrl,
          error: persisted.error,
        });
      } else {
        console.warn("wine-image-resolver proxy download failed:", {
          wineId: row.id,
          sourceUrl: proxyCandidateUrl,
          error: proxyDownload.error,
        });
      }
    }

    // Busca imagem REAL do rótulo na web (Google CSE → DuckDuckGo)
    const found = await findRealLabelImage(row, { excludeUrls: failedUrl ? [failedUrl] : [] });
    if (found.ok) {
      let persistenceError: string | null = null;
      const persisted = await persistDownloadedImage(adminClient, row, found);
      if (persisted.ok) {
          console.log("wine-image-resolver resolved_image_persisted", {
            wineId: row.id,
            sourceUrl: found.sourceUrl,
            persistedPath: persisted.path,
            finalUrl: persisted.finalUrl,
            durationMs: Date.now() - startTime,
          });

          return jsonResponse({
            ok: true,
            image_url: persisted.finalUrl,
            source: "web-search",
            source_url: found.sourceUrl,
            duration_ms: Date.now() - startTime,
          });
      }
      persistenceError = persisted.error;

      if (isLikelyValidImageUrl(found.sourceUrl)) {
        const { error: directPersistError } = await adminClient
          .from("wines")
          .update({ image_url: found.sourceUrl })
          .eq("id", row.id)
          .eq("user_id", user.id);

        if (!directPersistError) {
          console.log("wine-image-resolver external_url_persisted", {
            wineId: row.id,
            sourceUrl: found.sourceUrl,
            previousPersistenceError: persistenceError,
            durationMs: Date.now() - startTime,
          });

          return jsonResponse({
            ok: true,
            image_url: found.sourceUrl,
            source: "web-search-direct",
            source_url: found.sourceUrl,
            debug_reason: persistenceError,
            duration_ms: Date.now() - startTime,
          });
        }

        console.warn("wine-image-resolver direct url persist failed:", directPersistError.message);
        persistenceError = `${persistenceError ?? "persist_failed"}|direct_persist_failed:${directPersistError.message}`;
      }

      console.warn("wine-image-resolver found image but could not persist it:", {
        wineId: row.id,
        sourceUrl: found.sourceUrl,
        persistenceError,
      });

      return jsonResponse({
        ok: true,
        image_url: found.sourceUrl,
        source: "web-search-direct-ephemeral",
        source_url: found.sourceUrl,
        debug_reason: persistenceError,
        duration_ms: Date.now() - startTime,
      });
    } else {
      console.warn("wine-image-resolver web search failed:", found.error);
    }

    // Fallback final: SVG ilustrativo transitório.
    // Não persiste o SVG em image_url para não contaminar o campo com um placeholder.
    const fallback = buildSvgFallback(row);
    console.log("wine-image-resolver fallback_svg_returned", {
      wineId: row.id,
      reason: found.ok ? "sign_or_upload_failed" : found.error,
      durationMs: Date.now() - startTime,
    });

    return jsonResponse({
      ok: true,
      image_url: fallback,
      source: "fallback-svg",
      debug_reason: found.ok ? "sign_or_upload_failed" : found.error,
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("wine-image-resolver error:", error);
    return jsonResponse({
      error: "Não foi possível resolver a imagem do vinho. Tente novamente em instantes.",
    }, 500);
  }
});
