import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

type ResolverCandidate = {
  image_url: string;
  score: number;
  source: "vivino" | "wine-searcher" | "google-images";
};

function normalizeText(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") || "";
}

function normalizeForMatch(value?: string | null) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string) {
  return normalizeForMatch(text)
    .split(" ")
    .filter((token) => token.length > 2 && !["wine", "vinho", "label", "rótulo", "rotulo"].includes(token));
}

function buildQuery(row: Pick<WineRow, "name" | "producer" | "vintage" | "style" | "country" | "region" | "grape">) {
  return [
    normalizeText(row.name),
    normalizeText(row.producer),
    row.vintage ? String(row.vintage) : "",
    normalizeText(row.style),
    normalizeText(row.country),
    normalizeText(row.region),
    normalizeText(row.grape),
  ].filter(Boolean).join(" ");
}

function getTone(style?: string | null) {
  const s = normalizeForMatch(style);
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

function buildGeneratedPlaceholder(row: WineRow) {
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
      <path d="M450 214c-16 0-30 14-30 30v56c0 18 10 34 26 42v86h-4c-8 0-14 6-14 14v10h20v18h20v-18h20v-10c0-8-6-14-14-14h-4v-86c16-8 26-24 26-42v-56c0-16-14-30-30-30Z" fill="${tone.b}" fill-opacity="0.84" />
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

function scoreCandidate(candidate: string, row: WineRow, sourceBonus: number) {
  const haystack = normalizeForMatch(candidate);
  const queryTokens = tokenize(buildQuery(row));
  let score = sourceBonus;

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += token.length >= 6 ? 4 : 2;
    }
  }

  const vintage = row.vintage ? String(row.vintage) : "";
  if (vintage && haystack.includes(vintage)) score += 6;

  if (normalizeForMatch(row.name) && haystack.includes(normalizeForMatch(row.name))) score += 8;
  if (normalizeForMatch(row.producer) && haystack.includes(normalizeForMatch(row.producer))) score += 6;
  if (normalizeForMatch(row.style) && haystack.includes(normalizeForMatch(row.style))) score += 2;
  if (normalizeForMatch(row.country) && haystack.includes(normalizeForMatch(row.country))) score += 2;
  if (normalizeForMatch(row.region) && haystack.includes(normalizeForMatch(row.region))) score += 2;
  if (normalizeForMatch(row.grape) && haystack.includes(normalizeForMatch(row.grape))) score += 2;

  return score;
}

async function fetchText(url: string, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SommelyxBot/1.0)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractCandidates(html: string, source: ResolverCandidate["source"], row: WineRow, sourceBonus: number) {
  const candidates: ResolverCandidate[] = [];
  const patterns = [
    /<meta[^>]+property=["']og:image(?:secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image(?:\:src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["'][^>]*>/gi,
    /<source[^>]+srcset=["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const rawUrl = match[1]?.trim();
      if (!rawUrl) continue;
      const imageUrl = rawUrl.split(",")[0].trim().split(" ")[0];
      if (!/^https?:\/\//i.test(imageUrl)) continue;
      if (!/(jpg|jpeg|png|webp|gif)(\?|$)/i.test(imageUrl) && !/gstatic|vivino|wine-searcher/i.test(imageUrl)) continue;
      const index = match.index ?? html.indexOf(match[0]);
      const snippet = html.slice(Math.max(0, index - 180), Math.min(html.length, index + 280));
      const score = scoreCandidate(`${snippet} ${imageUrl}`, row, sourceBonus);
      candidates.push({ image_url: imageUrl, score, source });
    }
  }

  return candidates;
}

async function searchVivino(row: WineRow) {
  const query = encodeURIComponent(buildQuery(row));
  const html = await fetchText(`https://www.vivino.com/search/wines?q=${query}`);
  if (!html) return [];
  return extractCandidates(html, "vivino", row, 8);
}

async function searchWineSearcher(row: WineRow) {
  const query = encodeURIComponent(buildQuery(row));
  const html = await fetchText(`https://www.wine-searcher.com/find/${query}`);
  if (!html) return [];
  return extractCandidates(html, "wine-searcher", row, 6);
}

async function searchGoogleImages(row: WineRow) {
  const query = encodeURIComponent(buildQuery(row));
  const html = await fetchText(`https://www.google.com/search?tbm=isch&q=${query}`);
  if (!html) return [];
  return extractCandidates(html, "google-images", row, 4);
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

    const { wineId } = await req.json();
    if (typeof wineId !== "string" || !wineId.trim()) {
      return jsonResponse({ error: "Wine ID inválido." }, 400);
    }

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
    if (row.image_url) {
      return jsonResponse({
        ok: true,
        image_url: row.image_url,
        source: row.image_url.startsWith("data:image/svg+xml") ? "generated" : "cached",
      });
    }

    const searchOrder = [
      { runner: searchVivino, source: "vivino" as const },
      { runner: searchWineSearcher, source: "wine-searcher" as const },
      { runner: searchGoogleImages, source: "google-images" as const },
    ];

    const allCandidates: ResolverCandidate[] = [];
    for (const step of searchOrder) {
      try {
        const candidates = await step.runner(row);
        allCandidates.push(...candidates);
        const best = candidates.sort((a, b) => b.score - a.score)[0];
        if (best?.image_url) {
          const { error: updateError } = await adminClient
            .from("wines")
            .update({ image_url: best.image_url })
            .eq("id", row.id)
            .eq("user_id", user.id);

          if (!updateError) {
            return jsonResponse({ ok: true, image_url: best.image_url, source: best.source });
          }
        }
      } catch (error) {
        console.warn("wine image source failed", step.source, error instanceof Error ? error.message : error);
      }
    }

    const fallback = buildGeneratedPlaceholder(row);
    await adminClient
      .from("wines")
      .update({ image_url: fallback })
      .eq("id", row.id)
      .eq("user_id", user.id);

    return jsonResponse({
      ok: true,
      image_url: fallback,
      source: "generated",
      candidates: allCandidates.length,
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("wine-image-resolver error:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Falha ao resolver imagem.",
    }, 500);
  }
});
