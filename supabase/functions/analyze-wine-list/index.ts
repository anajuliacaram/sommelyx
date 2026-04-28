import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";
import { callOpenAIResponses } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const FUNCTION_NAME = "analyze-wine-list";
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const ANALYSIS_CACHE_TTL_MS = 10 * 60_000;
const analysisCache = new Map<string, { expiresAt: number; payload: unknown }>();
const UserProfileSchema = z.object({
  topStyles: z.array(z.string()).optional(),
  topGrapes: z.array(z.string()).optional(),
  topCountries: z.array(z.string()).optional(),
  avgPrice: z.number().optional(),
}).optional();

const BodySchema = z.object({
  imageBase64: z.never().optional(),
  extractedText: z.string().min(20),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  userProfile: UserProfileSchema,
  mode: z.enum(["menu-for-wine"]).optional(),
  wineName: z.string().min(1).max(200).optional(),
}).refine((value) => value.mode !== "menu-for-wine" || Boolean(value.wineName), {
  message: "Informe o vinho para analisar o cardápio",
  path: ["wineName"],
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function trace(stage: string, metadata?: Record<string, unknown>) {
  console.info(`[${FUNCTION_NAME}] step: ${stage}`, metadata || {});
}

function elapsed(startedAt: number) {
  return Date.now() - startedAt;
}

function pruneCache(cache: Map<string, { expiresAt: number; payload: unknown }>) {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) cache.delete(key);
  }
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function buildAnalysisCacheKey(input: {
  mode?: string;
  wineName?: string;
  extractedText?: string;
  mimeType?: string;
  fileName?: string;
}) {
  const normalized = JSON.stringify({
    mode: input.mode || "wine-list",
    wineName: input.wineName || "",
    mimeType: input.mimeType || "",
    fileName: input.fileName || "",
    extractedTextHash: input.extractedText ? await sha256Hex(input.extractedText) : null,
  });
  return await sha256Hex(normalized);
}

async function logToDb(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  functionName: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>,
) {
  try {
    const adminClient = createClient(supabaseUrl, serviceKey);
    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: functionName,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata || {},
    });
  } catch {
    // silent on logging failures
  }
}

// ── Anti-Genericity Validation (same as wine-pairings) ──
const GENERIC_PATTERNS = [
  /cabernet sauvignon (?:possui|tem|apresenta|é conhecid)/i,
  /merlot (?:possui|tem|apresenta|é conhecid)/i,
  /chardonnay (?:possui|tem|apresenta|é conhecid)/i,
  /pinot noir (?:possui|tem|apresenta|é conhecid)/i,
  /sauvignon blanc (?:possui|tem|apresenta|é conhecid)/i,
  /carmenère (?:possui|tem|apresenta|é conhecid)/i,
  /malbec (?:possui|tem|apresenta|é conhecid)/i,
  /sangiovese (?:possui|tem|apresenta|é conhecid)/i,
  /syrah (?:possui|tem|apresenta|é conhecid)/i,
  /tempranillo (?:possui|tem|apresenta|é conhecid)/i,
  /nebbiolo (?:possui|tem|apresenta|é conhecid)/i,
  /combina (?:muito )?bem/i,
  /harmoniza perfeitamente/i,
  /complementa os sabores/i,
  /é? um vinho (?:versátil|equilibrado|elegante) que/i,
  /notas? de frutas (?:vermelhas|escuras|tropicais|cítricas) e/i,
  /bom para acompanhar/i,
  /bom vinho para o dia a dia/i,
  /ideal para/i,
  /ideal com/i,
  /carne vermelha/i,
  /para pratos leves/i,
  /frutas vermelhas/i,
  /frutas escuras/i,
];

const TECHNICAL_PATTERNS = [
  /acidez/i,
  /tanin/i,
  /corpo/i,
  /estrutura/i,
  /intensid/i,
  /textur/i,
  /gordur/i,
  /prote[ií]na/i,
  /molho/i,
  /umami/i,
  /paladar/i,
  /gastron/i,
];

const COMPARATIVE_PATTERNS = [
  /compar/i,
  /\bcarta\b/i,
  /\boutros\b/i,
  /\bentre\b/i,
  /\bmelhor\b/i,
  /\bmenos\b/i,
  /\bmais\b/i,
  /\bdentro da carta\b/i,
];

interface SpecificityContext {
  wineName?: string;
  producer?: string | null;
  region?: string | null;
  country?: string | null;
  style?: string | null;
  vintage?: number | null;
  grape?: string | null;
}

function normalizeForMatch(value?: string | number | null) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectSpecificAnchors(context?: SpecificityContext) {
  const strong = [
    context?.producer,
    context?.region,
    context?.country,
    context?.style,
    context?.vintage != null ? String(context.vintage) : null,
  ]
    .map(normalizeForMatch)
    .filter((anchor) => anchor.length > 2);

  const weak = [context?.wineName, context?.grape]
    .map(normalizeForMatch)
    .filter((anchor) => anchor.length > 2);

  return { strong, weak };
}

function countAnchorHits(text: string, anchors: string[]) {
  const normalized = normalizeForMatch(text);
  return anchors.filter((anchor) => normalized.includes(anchor)).length;
}

function hasSpecificLabelContext(texts: string[], context?: SpecificityContext) {
  const combined = texts.filter(Boolean).join(" ");
  if (!combined.trim()) return false;

  const { strong, weak } = collectSpecificAnchors(context);
  if (strong.length > 0) {
    return countAnchorHits(combined, strong) >= 1;
  }

  return countAnchorHits(combined, weak) >= 1;
}

function validateWineSpecificity(
  texts: string[],
  wineName: string,
  grape?: string | null,
  context?: SpecificityContext,
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const wineNameLower = wineName.toLowerCase();
  const grapeClean = grape?.toLowerCase().replace(/\s+/g, " ").trim() || "";

  for (const text of texts) {
    if (!text || text.length < 20) continue;
    const lower = text.toLowerCase();

    const mentionsWine = lower.includes(wineNameLower) ||
      wineNameLower.split(" ").filter(w => w.length > 3).some(w => lower.includes(w));

    if (!mentionsWine && texts.length <= 10) {
      failures.push(`Missing wine name reference: "${text.slice(0, 60)}..."`);
    }

    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(text)) {
        failures.push(`Generic pattern found: "${text.slice(0, 60)}..."`);
        break;
      }
    }

    if (grapeClean && grapeClean.length > 3) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
      const genericSentences = sentences.filter(s => {
        const sl = s.toLowerCase();
        return sl.includes(grapeClean) && !mentionsWine &&
          !sl.match(/regiã|produtor|safra|rótulo|vinícola|região|vale |serra |douro|bordeaux|toscana|mendoza|napa|rioja|barossa|maipo|casablanca|colchagua/i);
      });
      if (genericSentences.length > sentences.length / 2) {
        failures.push(`Grape-only description without label context`);
      }
    }
  }

  if (!hasSpecificLabelContext(texts, context ?? { wineName, grape })) {
    failures.push("Missing label-specific anchor");
  }

  return { passed: failures.length === 0, failures };
}

function hasTechnicalLanguage(text?: string | null) {
  if (!text) return false;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

function hasGenericWineLanguage(text?: string | null) {
  if (!text) return false;
  return GENERIC_PATTERNS.some((pattern) => pattern.test(text));
}

function hasComparativeLanguage(text?: string | null) {
  if (!text) return false;
  return COMPARATIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function isLenientMenuAnalysis(data: any, wineName?: string | null): boolean {
  const dishes = Array.isArray(data?.dishes) ? data.dishes : [];
  if (dishes.length < 1) return false;
  return dishes.every((item: any) =>
    typeof item?.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item?.reason === "string" &&
    item.reason.trim().length >= 35 &&
    !hasGenericWineLanguage(item.reason) &&
    hasTechnicalLanguage(item.reason) &&
    hasSpecificLabelContext([item.reason, data?.summary], { wineName: wineName || "" }),
  );
}

function isLenientWineListAnalysis(data: any): boolean {
  const wines = Array.isArray(data?.wines) ? data.wines : [];
  if (wines.length < 1) return false;
  return wines.every((w: any) => {
    const reasoning = typeof w?.reasoning === "string" ? w.reasoning.trim() : "";
    const description = typeof w?.description === "string" ? w.description.trim() : "";
    const coreText = reasoning || description;
    const itemContext = {
      wineName: w.name,
      producer: w.producer ?? null,
      region: w.region ?? null,
      country: (w as any).country ?? null,
      style: w.style ?? null,
      vintage: w.vintage ?? null,
      grape: w.grape ?? null,
    };
    const hasCoreText = coreText.length >= 60 &&
      hasTechnicalLanguage(coreText) &&
      !hasGenericWineLanguage(coreText) &&
      hasSpecificLabelContext([coreText, w?.verdict], itemContext);

    const pairings = Array.isArray(w?.pairings) ? w.pairings : [];
    const pairingsOk = pairings.length >= 2 && pairings.every((pairing: any) => {
      const why = typeof pairing?.why === "string" ? pairing.why : "";
      return (
        typeof pairing?.dish === "string" &&
        pairing.dish.trim().length > 0 &&
        why.trim().length >= 20 &&
        hasTechnicalLanguage(why) &&
        !hasGenericWineLanguage(why) &&
        hasSpecificLabelContext([why, pairing.dish], itemContext)
      );
    });

    const compatOk = typeof w?.compatibilityLabel === "string" &&
      ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"].includes(w.compatibilityLabel);

    const labelsOk = Array.isArray(w?.comparativeLabels) && w.comparativeLabels.length >= 1;

    return (
      typeof w?.name === "string" &&
      w.name.trim().length > 0 &&
      hasCoreText &&
      pairingsOk &&
      compatOk &&
      labelsOk
    );
  });
}

function normalizeWineListPayload(payload: any) {
  const rawWines = Array.isArray(payload?.wines) ? payload.wines : [];
  const validCompatLabels = ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"];

  const wines = rawWines.map((wine: any) => ({
    name: String(wine?.name || "Vinho não identificado"),
    producer: wine?.producer ? String(wine.producer) : null,
    vintage: typeof wine?.vintage === "number" ? wine.vintage : null,
    style: wine?.style ? String(wine.style) : null,
    grape: wine?.grape ? String(wine.grape) : null,
    region: wine?.region ? String(wine.region) : null,
    price: typeof wine?.price === "number" ? wine.price : null,
    rating: typeof wine?.rating === "number" ? Math.max(0, Math.min(5, wine.rating)) : 0,
    description: wine?.description ? String(wine.description) : null,
    reasoning: wine?.reasoning ? String(wine.reasoning) : null,
    pairings: (Array.isArray(wine?.pairings) ? wine.pairings : []).slice(0, 5).map((p: any) => {
      if (typeof p === "object" && p !== null) {
        return { dish: String(p.dish || ""), why: String(p.why || p.reason || "") };
      }
      return { dish: String(p), why: "" };
    }),
    verdict: wine?.verdict ? String(wine.verdict) : "Sem resumo",
    compatibilityLabel: validCompatLabels.includes(wine?.compatibilityLabel) ? wine.compatibilityLabel : "Boa opção",
    highlight: ["best-value", "top-pick", "adventurous", "lightest", "boldest", "most-complex", "easiest"].includes(wine?.highlight) ? wine.highlight : null,
    body: wine?.body ? String(wine.body) : null,
    acidity: wine?.acidity ? String(wine.acidity) : null,
    tannin: wine?.tannin ? String(wine.tannin) : null,
    occasion: wine?.occasion ? String(wine.occasion) : null,
    comparativeLabels: Array.isArray(wine?.comparativeLabels) ? wine.comparativeLabels.filter((l: any) => typeof l === "string").slice(0, 3) : [],
  }));

  const normalizeToken = (value?: string | null) => (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const bodyRank = (value?: string | null) => {
    const v = normalizeToken(value);
    if (v.includes("leve")) return 0;
    if (v.includes("encorp")) return 2;
    if (v.includes("médio") || v.includes("medio") || v.includes("medium")) return 1;
    return null;
  };
  const tanninRank = (value?: string | null) => {
    const v = normalizeToken(value);
    if (v.includes("suave") || v.includes("sedos") || v.includes("baixo")) return 0;
    if (v.includes("firme") || v.includes("estrutur") || v.includes("robust") || v.includes("alto")) return 2;
    if (v.includes("médio") || v.includes("medio") || v.includes("moderad")) return 1;
    return null;
  };
  const scoreForTopPick = (wine: any) => (wine.rating || 0) * 10 + (wine.highlight === "top-pick" ? 8 : 0) + (wine.highlight === "best-value" ? 4 : 0);
  const scoreForValue = (wine: any) => {
    if (typeof wine.price !== "number" || wine.price <= 0) return wine.rating || 0;
    return (wine.rating || 0) * 10 + Math.max(0, 600 / wine.price);
  };

  const wineNames = new Set(wines.map((wine: any) => wine.name));
  const derivedTopPick = wines.slice().sort((a: any, b: any) => scoreForTopPick(b) - scoreForTopPick(a))[0]?.name || null;
  const derivedBestValue = wines.slice().sort((a: any, b: any) => scoreForValue(b) - scoreForValue(a))[0]?.name || null;
  const finalTopPick = payload?.topPick && wineNames.has(String(payload.topPick)) ? String(payload.topPick) : derivedTopPick;
  const finalBestValue = payload?.bestValue && wineNames.has(String(payload.bestValue)) ? String(payload.bestValue) : derivedBestValue;

  const bodyRanks = wines
    .map((wine: any, index: number) => ({ index, rank: bodyRank(wine.body) }))
    .filter((entry: any) => entry.rank !== null);
  const tanninRanks = wines
    .map((wine: any, index: number) => ({ index, rank: tanninRank(wine.tannin) }))
    .filter((entry: any) => entry.rank !== null);

  const lightestIndex = bodyRanks.length > 0 ? bodyRanks.slice().sort((a: any, b: any) => a.rank - b.rank)[0].index : -1;
  const boldestIndex = bodyRanks.length > 0 ? bodyRanks.slice().sort((a: any, b: any) => b.rank - a.rank)[0].index : -1;
  const easiestIndex = tanninRanks.length > 0 ? tanninRanks.slice().sort((a: any, b: any) => a.rank - b.rank)[0].index : -1;
  const complexIndex = wines
    .map((wine: any, index: number) => ({ index, score: (wine.highlight === "most-complex" ? 3 : 0) + (wine.rating || 0) }))
    .sort((a: any, b: any) => b.score - a.score)[0]?.index ?? -1;

  return {
    wines: wines.map((wine: any, index: number) => {
      const derivedLabels = new Set<string>(Array.isArray(wine.comparativeLabels) ? wine.comparativeLabels : []);
      if (wine.name === finalTopPick) derivedLabels.add("melhor escolha da carta");
      if (wine.name === finalBestValue) derivedLabels.add("melhor custo-benefício");
      if (index === lightestIndex) derivedLabels.add("mais leve");
      if (index === boldestIndex) derivedLabels.add("mais encorpado");
      if (index === easiestIndex) derivedLabels.add("mais fácil de beber");
      if (index === complexIndex) derivedLabels.add("mais complexo");
      return {
        ...wine,
        comparativeLabels: Array.from(derivedLabels).slice(0, 3),
      };
    }),
    topPick: finalTopPick,
    bestValue: finalBestValue,
  };
}

function normalizeMenuPayload(payload: any) {
  const dishes = Array.isArray(payload?.dishes) ? payload.dishes : [];
  const validCompatLabels = ["Combinação perfeita", "Alta compatibilidade", "Harmonização elegante", "Boa opção", "Escolha ousada", "Pouco indicado"];
  return {
    dishes: dishes.map((dish: any) => ({
      name: String(dish?.name || "Prato não identificado"),
      price: typeof dish?.price === "number" ? dish.price : null,
      match: ["perfeito", "muito bom", "bom"].includes(dish?.match) ? dish.match : "bom",
      reason: dish?.reason ? String(dish.reason) : "Boa compatibilidade geral.",
      highlight: ["top-pick", "best-value"].includes(dish?.highlight) ? dish.highlight : null,
      compatibilityLabel: validCompatLabels.includes(dish?.compatibilityLabel) ? dish.compatibilityLabel : null,
      harmony_type: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"].includes(dish?.harmony_type) ? dish.harmony_type : null,
      harmony_label: dish?.harmony_label ? String(dish.harmony_label) : null,
      dish_profile: dish?.dish_profile ? {
        intensity: dish.dish_profile.intensity ? String(dish.dish_profile.intensity) : null,
        texture: dish.dish_profile.texture ? String(dish.dish_profile.texture) : null,
        highlight: dish.dish_profile.highlight ? String(dish.dish_profile.highlight) : null,
      } : null,
      recipe: dish?.recipe ? {
        description: String(dish.recipe.description || ""),
        ingredients: Array.isArray(dish.recipe.ingredients) ? dish.recipe.ingredients.map(String) : [],
        steps: Array.isArray(dish.recipe.steps) ? dish.recipe.steps.map(String) : [],
        wine_reason: String(dish.recipe.wine_reason || ""),
      } : null,
    })),
    summary: payload?.summary ? String(payload.summary) : "",
    wineProfile: payload?.wineProfile ? {
      body: payload.wineProfile.body ? String(payload.wineProfile.body) : null,
      acidity: payload.wineProfile.acidity ? String(payload.wineProfile.acidity) : null,
      tannin: payload.wineProfile.tannin ? String(payload.wineProfile.tannin) : null,
      style: payload.wineProfile.style ? String(payload.wineProfile.style) : null,
      complexity: payload.wineProfile.complexity ? String(payload.wineProfile.complexity) : null,
      summary: payload.wineProfile.summary ? String(payload.wineProfile.summary) : null,
    } : null,
  };
}

function splitFallbackEntries(text?: string | null) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 3)
    .slice(0, 5);
}

function inferFallbackStyle(text: string) {
  const lower = text.toLowerCase();
  if (/(branco|sauvignon blanc|chardonnay|riesling|pinot grigio|albariño|albarino)/.test(lower)) return "Branco";
  if (/(ros[eé]|rosado)/.test(lower)) return "Rosé";
  if (/(espumante|champagne|cava|prosecco|brut)/.test(lower)) return "Espumante";
  return "Tinto";
}

function buildFallbackPairings(style: string) {
  if (style.toLowerCase().includes("branco")) {
    return [
      { dish: "Peixe grelhado", why: "A acidez ajuda a cortar a untuosidade do prato e mantém o conjunto leve." },
      { dish: "Frutos do mar", why: "A frescura do vinho preserva a delicadeza dos sabores marinhos." },
      { dish: "Queijos leves", why: "A textura limpa do vinho acompanha a cremosidade sem pesar." },
    ];
  }
  if (style.toLowerCase().includes("espumante")) {
    return [
      { dish: "Entradas salgadas", why: "As borbulhas limpam o paladar e deixam a harmonização mais vibrante." },
      { dish: "Frituras", why: "A acidez e a efervescência equilibram a gordura e renovam a boca." },
      { dish: "Petiscos variados", why: "A versatilidade do espumante acompanha diferentes texturas com leveza." },
    ];
  }
  return [
    { dish: "Carne grelhada", why: "O tanino e a estrutura do vinho sustentam a proteína e a caramelização da grelha." },
    { dish: "Massas com molho", why: "A acidez equilibra o molho e mantém o conjunto mais vivo." },
    { dish: "Queijos curados", why: "A força do vinho acompanha a intensidade e a salinidade do queijo." },
  ];
}

function buildFallbackWineListAnalysis(input: { extractedText?: string | null; fileName?: string | null }) {
  const source = [input.fileName, input.extractedText].filter(Boolean).join("\n").trim();
  const entries = splitFallbackEntries(source);
  const wineLines = entries.length > 0 ? entries : [input.fileName || "Vinho não identificado"];

  const wines = wineLines.map((line, index) => {
    const style = inferFallbackStyle(line);
    const name = line.replace(/\s+/g, " ").trim().slice(0, 120);
    return {
      name,
      producer: null,
      vintage: null,
      style,
      grape: null,
      region: null,
      price: null,
      rating: Math.max(0, 4 - index * 0.25),
      body: style === "Branco" ? "Leve" : style === "Espumante" ? "Médio" : "Médio",
      acidity: style === "Tinto" ? "Média" : "Alta",
      tannin: style === "Tinto" ? "Médio" : "Suave",
      occasion: style === "Espumante" ? "Aperitivo" : "Jantar casual",
      description: `Fallback estruturado a partir do texto extraído${input.fileName ? ` de ${input.fileName}` : ""}.`,
      reasoning: `Sem resposta parseável do modelo, o sistema gerou uma análise de contingência para manter a carta legível.`,
      pairings: buildFallbackPairings(style),
      verdict: `Boa opção dentro da leitura automática disponível neste momento.`,
      compatibilityLabel: index === 0 ? "Excelente escolha" : index === 1 ? "Alta compatibilidade" : "Boa opção",
      highlight: index === 0 ? "top-pick" : index === 1 ? "best-value" : null,
      comparativeLabels: index === 0 ? ["melhor escolha da carta"] : ["melhor custo-benefício"],
    } as Record<string, unknown>;
  });

  return {
    wines,
    topPick: wines[0]?.name || "Vinho não identificado",
    bestValue: wines[Math.min(1, wines.length - 1)]?.name || wines[0]?.name || "Vinho não identificado",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "unknown";
  const requestId = crypto.randomUUID();

  try {
    const authorization = req.headers.get("Authorization");
    if (Deno.env.get("EDGE_DEBUG") === "true") console.log("AUTH HEADER:", !!authorization);
    if (!authorization) {
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 401, "unauthorized", Date.now() - startTime, { request_id: requestId, reason: "missing_or_invalid_authorization_header" });
      return jsonResponse({ error: "AUTH_REQUIRED" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization")!,
          },
        },
      },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    const validatedUserId = user?.id;
    console.log(`[${FUNCTION_NAME}] auth_validation request_id=${requestId} valid=${Boolean(validatedUserId)}`);
    if (error || !validatedUserId) {
      console.error("AUTH ERROR:", error);
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 401, "unauthorized", Date.now() - startTime, { request_id: requestId, reason: "invalid_token" });
      return jsonResponse({ error: "AUTH_INVALID" }, 401);
    }
    userId = validatedUserId;
    trace("auth_ok", { request_id: requestId, user_id: userId });
    trace("auth_timing", { request_id: requestId, durationMs: elapsed(startTime) });


    const rawBody = await req.json().catch(() => null);
    trace("upload_received", {
      request_id: requestId,
      mimeType: rawBody?.mimeType,
      fileName: rawBody?.fileName,
      hasImageBase64: Boolean(rawBody?.imageBase64),
      hasExtractedText: Boolean(rawBody?.extractedText),
    });

    if (rawBody?.mimeType && typeof rawBody.mimeType === "string") {
      const mime = rawBody.mimeType as string;
      const validMime = mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/");
      trace("file_type_detected", { request_id: requestId, mimeType: mime, validMime });
      if (!validMime) {
        return jsonResponse({ success: false, code: "INVALID_FILE_TYPE", message: "Unsupported file type", requestId, retryable: false }, 400);
      }
    }

    if (typeof rawBody?.imageBase64 === "string") {
      trace("image_rejected", { request_id: requestId, reason: "image_payload_not_supported" });
      return jsonResponse({ success: false, code: "INVALID_IMAGE", message: "Este fluxo aceita apenas texto extraído. Envie o texto da carta.", requestId, retryable: false }, 400);
    }

    const parsedBody = BodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return jsonResponse({ success: false, code: "INVALID_REQUEST", message: "Invalid request payload", requestId, retryable: false }, 400);
    }

    const { extractedText, mimeType, fileName, userProfile, mode, wineName } = parsedBody.data;
    const normalizedText = extractedText.trim();
    trace("request_parsed", { request_id: requestId, mimeType, fileName, mode, wineName, extractedTextLength: normalizedText.length });
    trace("payload_validation_timing", {
      request_id: requestId,
      durationMs: elapsed(startTime),
      hasExtractedText: Boolean(normalizedText),
    });

    pruneCache(analysisCache);
    const cacheKey = await buildAnalysisCacheKey({
      mode,
      wineName,
      extractedText: normalizedText,
      mimeType,
      fileName,
    });
    const cached = analysisCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      trace("analysis_cache_hit", {
        request_id: requestId,
        cacheKey,
        durationMs: elapsed(startTime),
      });
      return jsonResponse(cached.payload);
    }
    trace("analysis_cache_miss", { request_id: requestId, cacheKey });

    const isMenuMode = mode === "menu-for-wine";
    const externalPayloadShape = {
      hasExtractedText: Boolean(normalizedText),
      mimeType,
      fileName,
    };
    trace("pairing_payload_shape", { request_id: requestId, externalPayloadShape, mode: isMenuMode ? "menu" : "wine-list" });
    const inputSummary = [
      fileName ? `Arquivo: ${fileName}` : null,
      mimeType ? `Tipo: ${mimeType}` : null,
      normalizedText ? "Entrada principal: texto extraído de OCR" : null,
    ].filter(Boolean).join("\n");

    let systemPrompt: string;
    let userInstructions: string;
    let tools: unknown[];
    let toolChoice: Record<string, unknown>;

    if (isMenuMode) {
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

REGRA #1 — FALE DO RÓTULO, NUNCA DA UVA GENÉRICA:
Ao explicar cada harmonização, cite o vinho "${wineName}" PELO NOME. Não diga "este vinho" ou descreva a uva genericamente.

ANTES DE ANALISAR O CARDÁPIO, construa um PERFIL MENTAL do vinho "${wineName}":
1. O que se sabe sobre o produtor? (escala, filosofia)
2. O que a região/país implica sobre o estilo?
3. Corpo, acidez, taninos PROVÁVEIS
4. Qual o posicionamento do vinho? (entrada de linha, reserva, ícone)

PARA CADA PRATO DO CARDÁPIO:
- Explique a INTERAÇÃO FÍSICA entre "${wineName}" e o prato (acidez × gordura, tanino × proteína, intensidade × intensidade)
- Use uma lógica de harmonização DIFERENTE por prato: Contraste / Semelhança / Complemento / Equilíbrio / Limpeza
- Forneça perfil do prato (intensidade, textura, destaque)
- Inclua receita resumida para cada prato

CLASSIFICAÇÃO (usar toda a escala):
- Combinação perfeita / Alta compatibilidade / Harmonização elegante / Boa opção / Escolha ousada / Pouco indicado

ORDENAR do melhor para o pior. Nem todos devem ser positivos.

PROIBIDO: "[Uva] possui notas de...", "combina bem", frases genéricas.
Use apenas pratos LEGÍVEIS no cardápio. Não invente itens.`;

      userInstructions = `Analise o cardápio anexado como sommelier para o vinho "${wineName}". Selecione 5-8 pratos, ordene por qualidade de harmonização, forneça explicações técnicas citando "${wineName}" pelo nome, perfil do prato e receita resumida.`;
      tools = [{
        type: "function",
        function: {
          name: "return_menu_analysis",
          description: "Retorna os pratos do cardápio que harmonizam com o vinho informado, com análise de sommelier.",
          parameters: {
            type: "object",
            properties: {
              wineProfile: {
                type: "object",
                description: "Perfil técnico do vinho analisado",
                properties: {
                  body: { type: "string", enum: ["leve", "médio", "encorpado"] },
                  acidity: { type: "string", enum: ["baixa", "média", "alta"] },
                  tannin: { type: "string", enum: ["n/a", "sedosos", "firmes", "estruturados"] },
                  style: { type: "string" },
                  complexity: { type: "string", enum: ["simples", "moderado", "complexo"] },
                  summary: { type: "string", description: "2-3 frases sobre o perfil ESPECÍFICO deste rótulo" },
                },
                required: ["body", "acidity", "tannin", "style", "complexity", "summary"],
                additionalProperties: false,
              },
              dishes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    reason: { type: "string", description: "2-3 frases técnicas citando o NOME do vinho e explicando a interação" },
                    highlight: { type: "string", enum: ["top-pick", "best-value"] },
                    compatibilityLabel: { type: "string", enum: ["Combinação perfeita", "Alta compatibilidade", "Harmonização elegante", "Boa opção", "Escolha ousada", "Pouco indicado"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string", description: "Frase curta (ex: 'acidez que corta a gordura')" },
                    dish_profile: {
                      type: "object",
                      properties: {
                        intensity: { type: "string", enum: ["leve", "média", "alta"] },
                        texture: { type: "string" },
                        highlight: { type: "string" },
                      },
                      required: ["intensity", "texture", "highlight"],
                      additionalProperties: false,
                    },
                    recipe: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        ingredients: { type: "array", items: { type: "string" } },
                        steps: { type: "array", items: { type: "string" } },
                        wine_reason: { type: "string" },
                      },
                      required: ["description", "ingredients", "steps", "wine_reason"],
                      additionalProperties: false,
                    },
                  },
                  required: ["name", "price", "match", "reason", "highlight", "compatibilityLabel", "harmony_type", "harmony_label", "dish_profile", "recipe"],
                  additionalProperties: false,
                },
              },
              summary: { type: "string" },
            },
            required: ["wineProfile", "dishes", "summary"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_menu_analysis" } };
    } else {
      const profileContext = userProfile
        ? `\nPerfil do usuário:
- Estilos preferidos: ${userProfile.topStyles?.join(", ") || "variado"}
- Uvas preferidas: ${userProfile.topGrapes?.join(", ") || "variado"}
- Países preferidos: ${userProfile.topCountries?.join(", ") || "variado"}
- Faixa de preço habitual: R$ ${userProfile.avgPrice || "variado"}`
        : "";

      systemPrompt = `Você é um sommelier profissional analisando uma carta de vinhos para ajudar o cliente a decidir rapidamente o que pedir.${profileContext}

REGRA #1 — FALE DO RÓTULO, NUNCA DA UVA GENÉRICA:
- ERRADO: "Sauvignon Blanc possui notas cítricas e minerais"
- CERTO: "O Cloudy Bay Sauvignon Blanc, da região de Marlborough na Nova Zelândia, é referência mundial nessa uva — espere um perfil intensamente aromático com maracujá e capim-limão, corpo leve-médio e acidez cortante"

PARA CADA VINHO da carta, construa um PERFIL MENTAL:
1. O que se sabe sobre ESTE produtor/vinícola?
2. O que a REGIÃO de origem implica sobre o estilo?
3. Qual o POSICIONAMENTO do vinho? (entrada de linha, premium, ícone)
4. Como ele se compara aos OUTROS vinhos desta carta?

REGRAS DE ANÁLISE:
1. DESCRIÇÃO ESPECÍFICA: Corpo, acidez, taninos, estilo gastronômico e ocasião ideal. Cite o NOME do vinho, não "este vinho". Referencie o que diferencia ESTE rótulo de outros da mesma uva.
   Em cada explicação, mencione pelo menos um anchor do rótulo (produtor, região, país, safra ou linha/posicionamento). Se faltar dado, faça inferência cautelosa e diga que está estimando pelo contexto do rótulo.

2. COMPARAÇÃO RELATIVA: Compare dentro da carta. Atribua labels comparativas derivadas do conjunto analisado e use no máximo 3 por vinho. Priorize: "melhor escolha da carta", "melhor custo-benefício", "mais leve", "mais encorpado", "mais complexo", "mais fácil de beber".

3. COMPATIBILIDADE SEMÂNTICA: "Excelente escolha", "Alta compatibilidade", "Boa opção" ou "Funciona bem". Nem todos podem ser "Excelente".

4. REASONING OBRIGATÓRIO: escreva uma justificativa comparativa curta, 2-4 frases, com lógica técnica real. O reasoning precisa:
   - comparar este vinho com outros da carta
   - citar acidez, tanino, corpo, estrutura ou ocasião
   - citar pelo menos um anchor específico do rótulo (produtor, região, país, safra ou linha/posicionamento)
   - explicar quando escolher este rótulo versus os demais

5. HARMONIZAÇÃO: 3-5 pratos com lógica sensorial real (ex: "a acidez do [nome] corta a gordura da picanha"). Cada prato precisa ter uma justificativa específica e diferente.

6. VEREDICTO: Frase opinativa DIRETA como sommelier falaria. Ex: "O [nome] é a escolha óbvia se você vai pedir carne — estrutura para aguentar e taninos que pedem gordura" ou "Honestamente, o [nome] está caro para o que entrega — prefira o [outro] por metade do preço".

7. JULGAMENTO HONESTO: Nem todo vinho merece nota alta. Se um vinho é mediano, diga.

PROIBIDO: "bom equilíbrio entre fruta e madeira", "[Uva] possui notas de...", qualquer frase que sirva para qualquer vinho da mesma uva.
Use apenas conteúdo legível do anexo. Não invente rótulos.`;

      userInstructions = "Analise a carta de vinhos como sommelier. Para cada vinho, fale do RÓTULO ESPECÍFICO (não da uva genérica), compare com os demais, dê veredicto opinativo e sugira 3-5 harmonizações citando o nome do vinho na explicação.";

      tools = [{
        type: "function",
        function: {
          name: "return_wine_list_analysis",
          description: "Retorna a análise estruturada e comparativa da carta de vinhos.",
          parameters: {
            type: "object",
            properties: {
              wines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    producer: { type: "string" },
                    vintage: { type: "number" },
                    style: { type: "string", description: "Ex: Tinto, Branco, Rosé, Espumante" },
                    grape: { type: "string" },
                    region: { type: "string" },
                    price: { type: "number" },
                    rating: { type: "number", description: "0-5" },
                    body: { type: "string", description: "Leve, Médio, Encorpado" },
                    acidity: { type: "string", description: "Baixa, Média, Alta, Vibrante" },
                    tannin: { type: "string", description: "Suave, Médio, Firme, Robusto (tintos)" },
                    occasion: { type: "string", description: "Breve descrição da ocasião ideal. Ex: 'Aperitivo descontraído', 'Jantar especial', 'Almoço casual'" },
                    description: { type: "string", description: "Análise técnica útil para decisão — evite genéricos" },
                    reasoning: { type: "string", description: "2-4 frases comparando este vinho com outros da carta e explicando a decisão técnica" },
                    pairings: {
                      type: "array",
                      minItems: 3,
                      maxItems: 5,
                      items: {
                        type: "object",
                        properties: {
                          dish: { type: "string" },
                          why: { type: "string", description: "Lógica sensorial breve" },
                        },
                        required: ["dish", "why"],
                        additionalProperties: false,
                      },
                      description: "3-5 harmonizações com explicação",
                    },
                    verdict: { type: "string", description: "Frase direta opinativa como sommelier falaria ao cliente" },
                    compatibilityLabel: { type: "string", enum: ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"] },
                    highlight: { type: "string", enum: ["best-value", "top-pick", "adventurous", "lightest", "boldest", "most-complex", "easiest"] },
                    comparativeLabels: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: ["melhor escolha da carta", "melhor custo-benefício", "mais leve", "mais encorpado", "mais complexo", "mais fácil de beber"],
                      },
                      minItems: 1,
                      maxItems: 3,
                      description: "Labels comparativas derivadas do conjunto analisado",
                    },
                  },
                  required: ["name", "producer", "vintage", "style", "grape", "region", "price", "rating", "body", "acidity", "tannin", "occasion", "description", "reasoning", "pairings", "verdict", "compatibilityLabel", "highlight", "comparativeLabels"],
                  additionalProperties: false,
                },
              },
              topPick: { type: "string" },
              bestValue: { type: "string" },
            },
            required: ["wines", "topPick", "bestValue"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_wine_list_analysis" } };
    }

    const userContent: Array<{ type: "text"; text: string }> = [
      { type: "text", text: `${userInstructions}\n\n${inputSummary}` },
    ];

    trace("pairing_request_started", {
      request_id: requestId,
      mode: isMenuMode ? "menu" : "wine-list",
      hasText: Boolean(normalizedText),
    });

    // ── Retry loop with anti-genericity validation ──
    // Keep total runtime under edge function/client timeout (~60s).
    const MAX_ATTEMPTS = 1;
    let lastParsed: any = null;
    let validationResult: { passed: boolean; failures: string[] } = { passed: false, failures: [] };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const aiStartedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);

      const retryHint = attempt > 0
        ? `\n\n⚠️ ATENÇÃO: Sua resposta anterior foi REJEITADA pela validação anti-genericidade. Problemas detectados:\n${validationResult.failures.map(f => `- ${f}`).join("\n")}\n\nREESSCREVA com mais especificidade sobre cada rótulo. Cite nomes dos vinhos, mencione produtores/regiões/posicionamento. Mesmo com leitura parcial, devolva a melhor análise possível mantendo a estrutura.`
        : "";

      const userMessageContent = retryHint
        ? [...userContent, { type: "text" as const, text: retryHint }]
        : userContent;
      let parsed: any = null;
      let responseStatus = 200;
      let responseBodyPreview: string | null = null;

      const openaiResult = await callOpenAIResponses<any>({
        functionName: "analyze-wine-list",
        requestId: crypto.randomUUID(),
        model: "gpt-4o-mini",
        timeoutMs: 25_000,
        temperature: 0.2,
        instructions: systemPrompt,
        input: [{
          role: "user" as const,
          content: Array.isArray(userMessageContent)
            ? userMessageContent.map((part: { type: "text"; text: string }) => ({ type: "input_text" as const, text: String(part.text || "") })).filter((part: any) => part.text.trim().length > 0)
            : [{ type: "input_text" as const, text: String(userMessageContent || "") }],
        }],
        schema: (tools[0] as any)?.function?.parameters || {},
        maxOutputTokens: 560,
      });

      if (!openaiResult.ok) {
        responseStatus = openaiResult.status;
        responseBodyPreview = openaiResult.error;
        trace("pairing_request_failed", {
          request_id: requestId,
          mode: isMenuMode ? "menu" : "wine-list",
          status: responseStatus,
          durationMs: elapsed(aiStartedAt),
          body: responseBodyPreview ? String(responseBodyPreview).slice(0, 240) : null,
        });

        if (responseStatus === 429) {
          return jsonResponse({ success: false, code: "AI_RATE_LIMIT", message: "Muitas requisições. Tente novamente em instantes.", requestId, retryable: true }, 429);
        }
        if (responseStatus === 402) {
          return jsonResponse({ success: false, code: "AI_UNAVAILABLE", message: "Service temporarily unavailable", requestId, retryable: true }, 502);
        }
        if (responseStatus === 422) {
          const fallback = isMenuMode
            ? normalizeMenuPayload(buildFallbackWineListAnalysis({ extractedText: normalizedText, fileName }))
            : normalizeWineListPayload(buildFallbackWineListAnalysis({ extractedText: normalizedText, fileName }));
          trace("parse_failed", { request_id: requestId, reason: "openai_parse_error_fallback" });
          trace("response_fallback", {
            request_id: requestId,
            mode: isMenuMode ? "menu" : "wine-list",
            count: isMenuMode ? (fallback as any).dishes?.length || 0 : (fallback as any).wines?.length || 0,
          });
          return jsonResponse(fallback);
        }
        return jsonResponse({ success: false, code: responseStatus === 504 ? "AI_TIMEOUT" : "AI_UNAVAILABLE", message: responseStatus === 504 ? "A análise demorou mais que o esperado. Tente novamente em instantes." : "Service temporarily unavailable", requestId, retryable: true }, responseStatus === 504 ? 408 : 502);
      }

      parsed = openaiResult.parsed;
      responseStatus = 200;

      clearTimeout(timeout);

      if (!parsed) {
        console.error("AI parse error on attempt", attempt);
        trace("parse_failed", { request_id: requestId, reason: "empty_parsed_output" });
        continue;
      }

      lastParsed = parsed;
      trace("ai_response_received", { request_id: requestId, durationMs: elapsed(aiStartedAt), rawPreview: String(openaiResult.raw ? JSON.stringify(openaiResult.raw).slice(0, 500) : "").slice(0, 500) });
      const parseStartedAt = Date.now();
      trace("parse_started", { request_id: requestId });

      // ── Validate anti-genericity ──
      const textsToValidate: string[] = [];
      if (isMenuMode) {
        if (lastParsed.wineProfile?.summary) textsToValidate.push(lastParsed.wineProfile.summary);
        for (const d of (lastParsed.dishes || [])) {
          if (d.reason) textsToValidate.push(d.reason);
        }
        validationResult = validateWineSpecificity(textsToValidate, wineName || "", null, { wineName });
        if (!validationResult.passed || !Array.isArray(lastParsed.dishes) || lastParsed.dishes.length < 1) {
          if (Array.isArray(lastParsed.dishes) && lastParsed.dishes.length < 1) {
            validationResult.failures.push(`Expected at least 1 dish, received ${lastParsed.dishes.length}`);
          }
          validationResult.passed = false;
        }
        if (!validationResult.passed && isLenientMenuAnalysis(lastParsed, wineName || "")) {
          validationResult.passed = true;
        }
      } else {
        for (const w of (lastParsed.wines || [])) {
          if (w.description) textsToValidate.push(w.description);
          if (w.verdict) textsToValidate.push(w.verdict);
          if (w.reasoning) textsToValidate.push(w.reasoning);
          for (const p of (Array.isArray(w.pairings) ? w.pairings : [])) {
            if (p?.why) textsToValidate.push(p.why);
          }
        }
        // For wine list, validate each wine individually
        const allPassed: boolean[] = [];
        for (const w of (lastParsed.wines || [])) {
          const wTexts = [w.description, w.verdict, w.reasoning, ...(Array.isArray(w.pairings) ? w.pairings.map((p: any) => p?.why).filter(Boolean) : [])].filter(Boolean);
          if (wTexts.length > 0) {
            const v = validateWineSpecificity(wTexts, w.name || "", w.grape, {
              wineName: w.name,
              producer: w.producer ?? null,
              region: w.region ?? null,
              country: (w as any).country ?? null,
              style: w.style ?? null,
              vintage: w.vintage ?? null,
              grape: w.grape ?? null,
            });
            const wineSpecificFailures: string[] = [...v.failures];

            if (typeof w.reasoning !== "string" || w.reasoning.trim().length < 80) {
              wineSpecificFailures.push(`Reasoning too short or missing for ${w.name || "vinho"}`);
            } else if (!hasComparativeLanguage(w.reasoning) || !hasTechnicalLanguage(w.reasoning)) {
              wineSpecificFailures.push(`Reasoning lacks comparative or technical language for ${w.name || "vinho"}`);
            }

            if (!Array.isArray(w.pairings) || w.pairings.length < 1) {
              wineSpecificFailures.push(`Expected at least 1 pairing for ${w.name || "vinho"}`);
            } else {
              for (const pairing of w.pairings) {
                const why = typeof pairing?.why === "string" ? pairing.why : "";
                if (why.trim().length < 25 || !hasTechnicalLanguage(why) || hasGenericWineLanguage(why)) {
                  wineSpecificFailures.push(`Pairing explanation too generic for ${w.name || "vinho"} -> ${String(pairing?.dish || "")}`);
                }
              }
            }

            if (!Array.isArray(w.comparativeLabels) || w.comparativeLabels.length < 1) {
              wineSpecificFailures.push(`Comparative labels missing for ${w.name || "vinho"}`);
            }

            const compatOk = typeof w.compatibilityLabel === "string" && ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"].includes(w.compatibilityLabel);
            if (!compatOk) {
              wineSpecificFailures.push(`Compatibility label invalid for ${w.name || "vinho"}`);
            }

            const passed = v.passed && wineSpecificFailures.length === 0;
            allPassed.push(passed);
            if (!passed) validationResult.failures.push(...wineSpecificFailures);
          }
        }
        validationResult.passed = allPassed.length > 0 && allPassed.every(Boolean);
        if (!validationResult.passed && isLenientWineListAnalysis(lastParsed)) {
          validationResult.passed = true;
        }
      }

      console.log(`Attempt ${attempt + 1}: validation ${validationResult.passed ? "PASSED" : "FAILED"} (${validationResult.failures.length} failures)`);
      trace("parse_completed", {
        request_id: requestId,
        durationMs: elapsed(parseStartedAt),
        validationPassed: validationResult.passed,
        failures: validationResult.failures.length,
      });

      if (validationResult.passed) break;

      if (attempt === MAX_ATTEMPTS - 1) {
        console.log("Max retries reached, no valid analysis produced");
      }
    }

    if (!lastParsed) {
      trace("parse_failed", { request_id: requestId, reason: "no_parsed_output" });
      return jsonResponse({ success: false, code: "AI_PARSE_ERROR", message: "AI response could not be parsed", requestId, retryable: true }, 422);
    }

    const parsedCount = isMenuMode
      ? Array.isArray(lastParsed.dishes) ? lastParsed.dishes.length : 0
      : Array.isArray(lastParsed.wines) ? lastParsed.wines.length : 0;

    if (!validationResult.passed && parsedCount > 0) {
      trace("wines_extracted", { request_id: requestId, count: parsedCount, degraded: true });
      const normalized = isMenuMode ? normalizeMenuPayload(lastParsed) : normalizeWineListPayload(lastParsed);
      trace("extraction_completed", { request_id: requestId, count: isMenuMode ? normalized.dishes.length : normalized.wines.length });
      analysisCache.set(cacheKey, { expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS, payload: normalized });
      trace("response_serialization_timing", { request_id: requestId, durationMs: elapsed(startTime), cached: true, degraded: true });
      return jsonResponse(normalized);
    }

    if (!validationResult.passed) {
      trace("parse_failed", { request_id: requestId, reason: "empty_or_invalid_extraction", failures: validationResult.failures.slice(0, 12) });
      const friendlyMessage = isMenuMode
        ? "Não conseguimos analisar este cardápio agora. Tente uma foto com melhor iluminação e foco nos pratos, ou tente novamente em instantes."
        : "Não conseguimos analisar esta carta de vinhos agora. Tente uma foto mais nítida da carta ou tente novamente em instantes.";
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 422, "validation_error", 0, {
        reason: friendlyMessage,
        validation_failures: validationResult.failures.slice(0, 12),
        mode,
      });
      return jsonResponse({ success: false, code: "EMPTY_EXTRACTION", message: friendlyMessage, requestId, retryable: true }, 422);
    }

    trace("wines_extracted", { request_id: requestId, count: parsedCount, degraded: false });
    const normalized = isMenuMode ? normalizeMenuPayload(lastParsed) : normalizeWineListPayload(lastParsed);
    trace("extraction_completed", { request_id: requestId, count: isMenuMode ? normalized.dishes.length : normalized.wines.length });
    analysisCache.set(cacheKey, { expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS, payload: normalized });
    trace("response_serialization_timing", { request_id: requestId, durationMs: elapsed(startTime), cached: true, degraded: false });
    trace("total_function_duration", { request_id: requestId, durationMs: elapsed(startTime) });
    return jsonResponse(normalized);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Erro interno";
    const isAbort = errMsg.toLowerCase().includes("abort");
    console.error("analyze-wine-list error:", errMsg);
    if (isAbort) {
      return jsonResponse({ success: false, code: "AI_TIMEOUT", message: "A análise demorou mais que o esperado. Tente novamente em instantes.", requestId, retryable: true }, 504);
    }
    return jsonResponse({ success: false, code: "AI_UNAVAILABLE", message: "Service temporarily unavailable", requestId, retryable: true }, 502);
  }
});
