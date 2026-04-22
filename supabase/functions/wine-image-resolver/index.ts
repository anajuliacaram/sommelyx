import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "wine-label-images";
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

const BLOCKED_HOST_PATTERNS = [/wine-searcher\.com/i, /\.gif($|\?)/i];
const ACCEPTED_MIME = /^image\/(jpeg|jpg|png|webp)$/i;

function isLikelyValidImageUrl(u: string): boolean {
  if (!u || !/^https?:\/\//i.test(u)) return false;
  if (BLOCKED_HOST_PATTERNS.some((rx) => rx.test(u))) return false;
  if (/alert\.jpg|placeholder|notfound|not[-_]?found|404\.|missing|sprite|favicon/i.test(u)) return false;
  return true;
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

async function findRealLabelImage(row: WineRow): Promise<{ ok: true; bytes: Uint8Array; mime: string; sourceUrl: string } | { ok: false; error: string }> {
  const query = buildSearchQuery(row);
  if (!query) return { ok: false, error: "empty query" };
  let candidates = await searchWithGoogleCSE(query);
  if (candidates.length === 0) candidates = await searchWithDuckDuckGo(query);
  if (candidates.length === 0) return { ok: false, error: "no search results" };
  for (const url of candidates.slice(0, 5)) {
    const dl = await downloadImage(url);
    if (dl.ok) return { ok: true, bytes: dl.bytes, mime: dl.mime, sourceUrl: url };
  }
  return { ok: false, error: "all candidates failed" };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
    const force = body?.force === true || body?.regenerate === true;
    if (!wineId) return jsonResponse({ error: "Wine ID inválido." }, 400);

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

    // Considera "imagem real" apenas o que está no nosso bucket privado.
    const url = row.image_url || "";
    const isOurBucket = url.includes("/storage/v1/object/public/wine-label-images/")
      || url.includes("/storage/v1/object/sign/wine-label-images/");
    const isBadPlaceholder = /alert\.jpg|placeholder|notfound|not[-_]?found|404\.|missing/i.test(url);
    const isSvgFallback = url.startsWith("data:image/svg+xml");
    const hasRealImage = !!url && isOurBucket && !isBadPlaceholder && !isSvgFallback;
    if (hasRealImage && !force) {
      return jsonResponse({ ok: true, image_url: row.image_url, source: "cached" });
    }

    // Busca imagem REAL do rótulo na web (Google CSE → DuckDuckGo)
    const found = await findRealLabelImage(row);
    if (found.ok) {
      const ext = found.mime.includes("jpeg") ? "jpg" : found.mime.includes("webp") ? "webp" : "png";
      const path = `${row.user_id}/web/${row.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await adminClient.storage
        .from(BUCKET)
        .upload(path, found.bytes, {
          cacheControl: "31536000",
          upsert: true,
          contentType: found.mime,
        });

      if (!uploadError) {
        const { data: signed, error: signErr } = await adminClient.storage
          .from(BUCKET)
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        const finalUrl = signed?.signedUrl;
        if (finalUrl) {
          await adminClient
            .from("wines")
            .update({ image_url: finalUrl })
            .eq("id", row.id)
            .eq("user_id", user.id);

          return jsonResponse({
            ok: true,
            image_url: finalUrl,
            source: "web-search",
            source_url: found.sourceUrl,
            duration_ms: Date.now() - startTime,
          });
        }
        console.warn("wine-image-resolver sign failed:", signErr?.message);
      } else {
        console.warn("wine-image-resolver upload failed:", uploadError.message);
      }
    } else {
      console.warn("wine-image-resolver web search failed:", found.error);
    }

    // Fallback final: SVG ilustrativo (sem geração via IA)
    const fallback = buildSvgFallback(row);
    await adminClient
      .from("wines")
      .update({ image_url: fallback })
      .eq("id", row.id)
      .eq("user_id", user.id);

    return jsonResponse({
      ok: true,
      image_url: fallback,
      source: "fallback-svg",
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("wine-image-resolver error:", error);
    return jsonResponse({
      error: "Não foi possível resolver a imagem do vinho. Tente novamente em instantes.",
    }, 500);
  }
});
