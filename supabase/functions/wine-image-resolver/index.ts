import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "wine-label-images";
const AI_TIMEOUT_MS = 45_000;
const AI_MODEL = "google/gemini-2.5-flash-image";

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

function buildImagePrompt(row: WineRow) {
  const parts: string[] = [];
  parts.push(
    "Editorial product photography of a single full wine bottle standing upright, centered, hero shot, studio lighting, soft warm key light, gentle vignette, ultra-realistic, 4k, no text overlay, no watermark, no logos other than the wine label itself, photorealistic, premium magazine style, neutral elegant background (soft gradient: warm cream to deep wine).",
  );
  const wineDescriptor: string[] = [];
  if (row.producer) wineDescriptor.push(`producer: ${row.producer}`);
  if (row.name) wineDescriptor.push(`wine name: ${row.name}`);
  if (row.vintage) wineDescriptor.push(`vintage: ${row.vintage}`);
  if (row.style) wineDescriptor.push(`style: ${row.style}`);
  if (row.country) wineDescriptor.push(`country: ${row.country}`);
  if (row.region) wineDescriptor.push(`region: ${row.region}`);
  if (row.grape) wineDescriptor.push(`grape: ${row.grape}`);
  parts.push(`The bottle should look like a real ${row.style || "wine"} bottle from a real producer with this identity — ${wineDescriptor.join(", ")}.`);
  parts.push(
    "Render the actual front label legibly with the producer name and the wine name typed elegantly — but do NOT invent extra disclaimers. Bottle glass color must match the style (dark green/black for tinto, clear for branco/espumante, light pink for rosé, dark amber for fortificado). Foil capsule must look premium. Composition: 3:4 portrait, bottle filling 70% of the frame, centered, slightly tilted shadow on the surface.",
  );
  return parts.join("\n");
}

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function generateBottleImage(row: WineRow): Promise<{ ok: true; bytes: Uint8Array; mime: string } | { ok: false; error: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
  if (!apiKey) return { ok: false, error: "LOVABLE_API_KEY missing" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        modalities: ["image", "text"],
        messages: [
          { role: "user", content: buildImagePrompt(row) },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { ok: false, error: `AI image gen status ${resp.status}: ${text.slice(0, 240)}` };
    }

    const json = await resp.json().catch(() => null) as any;
    const dataUrl: string | undefined = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || typeof dataUrl !== "string") {
      return { ok: false, error: "AI returned no image" };
    }

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return { ok: false, error: "Invalid image data url" };
    const mime = match[1];
    const bytes = decodeBase64(match[2]);
    if (!bytes.length) return { ok: false, error: "Decoded image empty" };
    return { ok: true, bytes, mime };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "AI fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
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

    // Considera "imagem real" apenas o que está no nosso bucket (upload manual ou IA),
    // ignorando SVG ilustrativo, placeholders quebrados (wine-searcher alert.jpg, etc.) e fontes externas não confiáveis.
    const url = row.image_url || "";
    const isOurBucket = url.includes("/storage/v1/object/public/wine-label-images/");
    const isBadPlaceholder = /alert\.jpg|placeholder|notfound|not[-_]?found|404\.|missing/i.test(url);
    const isSvgFallback = url.startsWith("data:image/svg+xml");
    const hasRealImage = !!url && isOurBucket && !isBadPlaceholder && !isSvgFallback;
    if (hasRealImage && !force) {
      return jsonResponse({ ok: true, image_url: row.image_url, source: "cached" });
    }

    // Tenta gerar via IA (Nano Banana) e fazer upload no bucket
    const aiResult = await generateBottleImage(row);
    if (aiResult.ok) {
      const ext = aiResult.mime === "image/jpeg" ? "jpg" : aiResult.mime === "image/webp" ? "webp" : "png";
      const path = `${row.user_id}/ai/${row.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await adminClient.storage
        .from(BUCKET)
        .upload(path, aiResult.bytes, {
          cacheControl: "31536000",
          upsert: true,
          contentType: aiResult.mime,
        });

      if (!uploadError) {
        const { data: pub } = adminClient.storage.from(BUCKET).getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        await adminClient
          .from("wines")
          .update({ image_url: publicUrl })
          .eq("id", row.id)
          .eq("user_id", user.id);

        return jsonResponse({
          ok: true,
          image_url: publicUrl,
          source: "ai-generated",
          duration_ms: Date.now() - startTime,
        });
      }

      console.warn("wine-image-resolver upload failed:", uploadError.message);
    } else {
      console.warn("wine-image-resolver AI failed:", aiResult.error);
    }

    // Fallback final: SVG ilustrativo
    const fallback = buildSvgFallback(row);
    await adminClient
      .from("wines")
      .update({ image_url: fallback })
      .eq("id", row.id)
      .eq("user_id", user.id);

    return jsonResponse({
      ok: true,
      image_url: fallback,
      source: "generated",
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("wine-image-resolver error:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Falha ao resolver imagem.",
    }, 500);
  }
});
