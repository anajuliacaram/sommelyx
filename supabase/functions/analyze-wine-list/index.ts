import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";
import { callOpenAIResponses } from "../_shared/openai.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";
import { INVALID_INPUT_ERROR, validateTextPayload } from "../_shared/payload-validation.ts";

const FUNCTION_NAME = "analyze-wine-list";
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const UserProfileSchema = z.object({
  topStyles: z.array(z.string()).optional(),
  topGrapes: z.array(z.string()).optional(),
  topCountries: z.array(z.string()).optional(),
  avgPrice: z.number().optional(),
}).optional();

const BodySchema = z.object({
  imageBase64: z.never().optional(),
  extractedText: z.string().min(1).max(10_000),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  userProfile: UserProfileSchema,
  mode: z.enum(["menu-for-wine"]).optional(),
  wineName: z.string().min(1).max(200).optional(),
}).refine((value) => value.mode !== "menu-for-wine" || Boolean(value.wineName), {
  message: "Informe o vinho para analisar o cardápio",
  path: ["wineName"],
});

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...createCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function trace(stage: string, metadata?: Record<string, unknown>) {
  console.info(`[${FUNCTION_NAME}] step: ${stage}`, metadata || {});
}

function elapsed(startedAt: number) {
  return Date.now() - startedAt;
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
  const allowedCategories = new Set(["red", "white", "sparkling", "rose"]);
  const normalizeString = (value: unknown) => String(value ?? "").trim();
  const normalizePrice = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value * 100) / 100;
    const numeric = Number(String(value ?? "").replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 100) / 100 : null;
  };
  const normalizeConfidence = (value: unknown) => {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return 0.35;
    return Math.max(0, Math.min(1, numeric));
  };
  const mapCategoryToStyle = (category: string) => {
    switch (category) {
      case "red":
        return "Tinto";
      case "white":
        return "Branco";
      case "sparkling":
        return "Espumante";
      case "rose":
        return "Rosé";
      default:
        return null;
    }
  };
  const completenessScore = (wine: any) => (
    [wine.producer, wine.grape, wine.country, wine.region, wine.price]
      .filter((value) => value !== null && value !== "")
      .length
  );
  const priceConsistencyScore = (wine: any) => {
    if (typeof wine.price !== "number" || wine.price <= 0) return 0;
    const priceText = [wine.name, wine.producer, wine.region].filter(Boolean).join(" ");
    return /\b(r\$|€|\$|\d{2,4})/i.test(priceText) ? 1 : 0.7;
  };

  const wines = rawWines
    .map((wine: any) => {
      const name = normalizeString(wine?.name);
      const producer = normalizeString(wine?.producer) || null;
      const grape = normalizeString(wine?.grape) || null;
      const country = normalizeString(wine?.country) || null;
      const region = normalizeString(wine?.region) || null;
      const price = normalizePrice(wine?.price);
      const category = allowedCategories.has(String(wine?.category || "").toLowerCase())
        ? String(wine.category).toLowerCase()
        : "red";
      const confidence = normalizeConfidence(wine?.confidence);

      return {
        name: name || "Vinho não identificado",
        producer,
        grape,
        country,
        region,
        price,
        category,
        confidence,
        style: mapCategoryToStyle(category),
      };
    })
    .filter((wine: any) => wine.name.trim().length > 0);

  const sorted = wines.sort((a: any, b: any) => {
    const confidenceDelta = b.confidence - a.confidence;
    if (confidenceDelta !== 0) return confidenceDelta;
    const priceConsistencyDelta = priceConsistencyScore(b) - priceConsistencyScore(a);
    if (priceConsistencyDelta !== 0) return priceConsistencyDelta;
    return completenessScore(b) - completenessScore(a);
  });

  const topPick = sorted[0]?.name || null;
  const bestValue = sorted
    .filter((wine: any) => typeof wine.price === "number" && wine.price > 0)
    .sort((a: any, b: any) => {
      const aScore = a.confidence + completenessScore(a) / 10 - a.price / 10_000;
      const bScore = b.confidence + completenessScore(b) / 10 - b.price / 10_000;
      return bScore - aScore;
    })[0]?.name || topPick;

  return { wines: sorted, topPick, bestValue };
}

function normalizeOcrValue(value?: string | number | null) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePriceTokens(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const rounded = Math.round(value * 100) / 100;
    const integer = Math.round(rounded);
    return Array.from(new Set([
      String(integer),
      rounded.toFixed(2).replace(/\.00$/, ""),
      rounded.toFixed(2),
    ]));
  }

  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const numeric = Number(raw.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return [];
  return normalizePriceTokens(numeric);
}

function lineLooksLikeWine(line: string) {
  const normalized = normalizeOcrValue(line);
  if (normalized.length < 8) return false;
  const hasVintage = /\b(19|20)\d{2}\b/.test(line);
  const hasPrice = /\b\d{2,4}(?:[.,]\d{2})?\b/.test(line);
  const hasWineToken = /\b(malbec|cabernet|merlot|pinot|chardonnay|riesling|syrah|shiraz|tempranillo|sauvignon|cava|brut|prosecco|rose|ros[eé]|torrontes|nebbiolo|sangiovese)\b/i.test(line);
  return hasPrice || hasVintage || hasWineToken;
}

function buildGroundingContext(ocrText: string) {
  const lines = String(ocrText || "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    rawText: ocrText,
    normalizedText: normalizeOcrValue(ocrText),
    lines,
    normalizedLines: lines.map((line) => normalizeOcrValue(line)),
    likelyWineLines: lines.filter(lineLooksLikeWine),
  };
}

function scoreOcrMatch(target: string, source: string) {
  const normalizedTarget = normalizeOcrValue(target);
  if (!normalizedTarget || normalizedTarget.length < 3) return false;
  if (source.includes(normalizedTarget)) return true;

  const tokens = normalizedTarget.split(" ").filter((token) => token.length > 2);
  if (tokens.length >= 2) {
    const hits = tokens.filter((token) => source.includes(token)).length;
    return hits >= Math.min(tokens.length, 3);
  }

  return false;
}

function applyGroundedWineExtraction(payload: any, ocrText: string) {
  const normalized = normalizeWineListPayload(payload);
  const grounding = buildGroundingContext(ocrText);
  const filtered = normalized.wines
    .map((wine) => {
      const nameMatched = scoreOcrMatch(wine.name, grounding.normalizedText);
      const producerMatched = scoreOcrMatch(wine.producer, grounding.normalizedText);
      const priceMatched = normalizePriceTokens(wine.price).some((token) =>
        grounding.lines.some((line) => line.includes(token))
      );

      if (!nameMatched && !producerMatched) {
        return null;
      }

      let confidence = Math.min(1, Math.max(0.15, Number(wine.confidence) || 0.35));
      if (nameMatched && priceMatched) {
        confidence = Math.max(confidence, 0.9);
      } else if (nameMatched || producerMatched) {
        confidence = Math.min(confidence, 0.68);
      } else {
        confidence = Math.min(confidence, 0.42);
      }

      return {
        ...wine,
        confidence,
      };
    })
    .filter((wine): wine is NonNullable<typeof wine> => Boolean(wine));

  const grounded = normalizeWineListPayload({
    wines: filtered,
    topPick: normalized.topPick,
    bestValue: normalized.bestValue,
  });

  return {
    grounded,
    candidateLineCount: grounding.likelyWineLines.length,
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
      grape: null,
      country: null,
      region: null,
      price: null,
      category: style === "Branco" ? "white" : style === "Rosé" ? "rose" : style === "Espumante" ? "sparkling" : "red",
      confidence: Math.max(0.2, 0.72 - index * 0.08),
    } as Record<string, unknown>;
  });

  return {
    wines,
    topPick: wines[0]?.name || "Vinho não identificado",
    bestValue: wines[Math.min(1, wines.length - 1)]?.name || wines[0]?.name || "Vinho não identificado",
  };
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "unknown";
  const requestId = crypto.randomUUID();

  try {
    const authorization = req.headers.get("Authorization");
    if (Deno.env.get("EDGE_DEBUG") === "true") console.log("AUTH HEADER:", !!authorization);
    if (!authorization) {
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 401, "unauthorized", Date.now() - startTime, { request_id: requestId, reason: "missing_or_invalid_authorization_header", input_size_bytes: 0, error_type: "AUTH_REQUIRED" });
      return jsonResponse(req, { error: "AUTH_REQUIRED" }, 401);
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
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 401, "unauthorized", Date.now() - startTime, { request_id: requestId, reason: "invalid_token", input_size_bytes: 0, error_type: "AUTH_INVALID" });
      return jsonResponse(req, { error: "AUTH_INVALID" }, 401);
    }
    userId = validatedUserId;
    trace("auth_ok", { request_id: requestId, user_id: userId });
    trace("auth_timing", { request_id: requestId, durationMs: elapsed(startTime) });

    const rawBody = await req.json().catch(() => null);
    const inputSizeBytes = new TextEncoder().encode(JSON.stringify(rawBody ?? {})).length;
    trace("request_received", {
      request_id: requestId,
      image_size: inputSizeBytes,
      input_size_bytes: inputSizeBytes,
      mimeType: rawBody?.mimeType,
      fileName: rawBody?.fileName,
      hasImageBase64: Boolean(rawBody?.imageBase64),
      hasExtractedText: Boolean(rawBody?.extractedText),
    });
    trace("upload_received", {
      request_id: requestId,
      mimeType: rawBody?.mimeType,
      fileName: rawBody?.fileName,
      hasImageBase64: Boolean(rawBody?.imageBase64),
      hasExtractedText: Boolean(rawBody?.extractedText),
      input_size_bytes: inputSizeBytes,
    });

    if (rawBody?.mimeType && typeof rawBody.mimeType === "string") {
      const mime = rawBody.mimeType as string;
      const validMime = mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/");
      trace("file_type_detected", { request_id: requestId, mimeType: mime, validMime });
      if (!validMime) {
        return jsonResponse(req, { success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message, requestId, retryable: false }, 400);
      }
    }

    if (typeof rawBody?.imageBase64 === "string" || typeof rawBody?.base64Pdf === "string") {
      trace("image_rejected", { request_id: requestId, reason: "binary_payload_not_supported" });
      return jsonResponse(req, { success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message, requestId, retryable: false }, 400);
    }

    const parsedBody = BodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return jsonResponse(req, { success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message, requestId, retryable: false }, 400);
    }

    const { extractedText, mimeType, fileName, userProfile, mode, wineName } = parsedBody.data;
    const textValidation = validateTextPayload(extractedText, 10_000);
    trace("validation_result", {
      request_id: requestId,
      ok: textValidation.ok,
      extractedTextLength: String(extractedText || "").length,
      normalizedTextLength: textValidation.ok ? textValidation.text.length : 0,
      mimeType,
      fileName,
    });
    if (!textValidation.ok) {
      return jsonResponse(req, { success: false, code: INVALID_INPUT_ERROR.code, message: INVALID_INPUT_ERROR.message, requestId, retryable: false }, 400);
    }
    const normalizedText = textValidation.text;
    trace("request_parsed", { request_id: requestId, mimeType, fileName, mode, wineName, extractedTextLength: normalizedText.length });
    trace("payload_validation_timing", {
      request_id: requestId,
      durationMs: elapsed(startTime),
      hasExtractedText: Boolean(normalizedText),
      input_size_bytes: inputSizeBytes,
    });

    const isMenuMode = mode === "menu-for-wine";
    const cacheInput = {
      mode,
      wineName,
      mimeType,
      fileName,
      userProfile,
      text: normalizedText,
      isMenuMode,
    };
    const cached = await getCachedAiResponse("analyze-wine-list", cacheInput);
    if (cached.hit && cached.payload) {
      trace("analysis_cache_hit", {
        request_id: requestId,
        inputHash: cached.inputHash,
        durationMs: elapsed(startTime),
        input_size_bytes: inputSizeBytes,
      });
      return jsonResponse(req, cached.payload);
    }
    trace("analysis_cache_miss", { request_id: requestId, inputHash: cached.inputHash, degraded: cached.degraded, input_size_bytes: inputSizeBytes });

    const rateLimit = await checkRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 429, "rate_limited", Date.now() - startTime, {
        request_id: requestId,
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
        input_size_bytes: inputSizeBytes,
        error_type: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
      });
      return jsonResponse(req, 
        rateLimit.degraded
          ? {
            success: false,
            code: "AI_RATE_LIMIT_UNAVAILABLE",
            message: "Serviço temporariamente indisponível.",
            requestId,
            retryable: true,
          }
          : {
            success: false,
            code: "RATE_LIMIT_EXCEEDED",
            message: "Limite de uso atingido.",
            requestId,
            retryable: true,
          },
        rateLimit.degraded ? 503 : 429,
      );
    }

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

      systemPrompt = `Você está fazendo EXTRAÇÃO LITERAL de uma carta de vinhos em OCR bruto.${profileContext}
Extraia a carta como uma LISTA ESTRUTURADA de vinhos. Não escreva análise sensorial, veredictos, harmonizações ou resumo livre.

TRATE O TEXTO como um menu/carta de vinhos.

REGRAS:
1. Extraia TODOS os vinhos individualmente.
2. Cada vinho deve ser um objeto em "wines".
3. Se o OCR mostrar várias linhas de rótulos ou preços, devolva vários vinhos. Nunca colapse a carta em um único resultado.
4. Não invente campos ausentes. Use string vazia quando faltar texto e 0 apenas quando o preço estiver realmente ausente.
5. Normalize a categoria para: "red", "white", "sparkling" ou "rose".
6. Confidence deve ser um número de 0 a 1 baseado na clareza do OCR e na completude daquele item.
7. Quando houver produtor, uva, país ou região parcialmente legíveis, preserve o que estiver seguro. Não complete com fantasia.
8. Você NÃO pode usar conhecimento externo, fama de rótulos ou inferência de mercado.
9. Você só pode retornar vinhos que estejam explicitamente visíveis no OCR.
10. Se um nome, produtor ou preço não estiver no texto, deixe vazio ou 0. Nunca substitua por um vinho famoso.
11. Trate a entrada como TEXTO BRUTO. Extraia linhas que pareçam vinhos com safra, uva, região ou preço.

PROIBIDO:
- responder com um único vinho se houver várias entradas detectáveis
- inventar vinhos famosos como Château Margaux, Romanée-Conti, Veuve Clicquot ou qualquer outro rótulo não presente no OCR
- completar nomes, produtores ou regiões com fantasia
- escrever explicações longas
- retornar qualquer campo fora do schema`;

      userInstructions = "Considere a entrada como uma carta de vinhos. Extraia todos os vinhos individualmente e devolva apenas o JSON estruturado.";

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
                    grape: { type: "string" },
                    country: { type: "string" },
                    region: { type: "string" },
                    price: { type: "number" },
                    category: { type: "string", enum: ["red", "white", "sparkling", "rose"] },
                    confidence: { type: "number" },
                  },
                  required: ["name", "producer", "grape", "country", "region", "price", "category", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["wines"],
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
    const likelyMultipleEntries = !isMenuMode && buildGroundingContext(normalizedText).likelyWineLines.length >= 3;
    const MAX_ATTEMPTS = isMenuMode ? 1 : 2;
    let lastParsed: any = null;
    let validationResult: { passed: boolean; failures: string[] } = { passed: false, failures: [] };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const aiStartedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);

      const retryHint = attempt > 0
        ? `\n\n⚠️ A resposta anterior não trouxe vinhos suficientes de forma estruturada. Problemas detectados:\n${validationResult.failures.map(f => `- ${f}`).join("\n")}\n\nReextraia a carta. Se houver várias linhas de vinhos, devolva vários objetos em "wines". Não colapse em um único item.`
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
        timeoutMs: 12_000,
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
          return jsonResponse(req, { success: false, code: "AI_RATE_LIMIT", message: "Muitas requisições. Tente novamente em instantes.", requestId, retryable: true }, 429);
        }
        if (responseStatus === 402) {
          return jsonResponse(req, { success: false, code: "AI_UNAVAILABLE", message: "Service temporarily unavailable", requestId, retryable: true }, 502);
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
          return jsonResponse(req, fallback);
        }
        return jsonResponse(req, { success: false, code: responseStatus === 504 ? "AI_TIMEOUT" : "AI_UNAVAILABLE", message: responseStatus === 504 ? "A análise demorou mais que o esperado. Tente novamente em instantes." : "Service temporarily unavailable", requestId, retryable: true }, responseStatus === 504 ? 408 : 502);
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
        const extractedWines = Array.isArray(lastParsed.wines) ? lastParsed.wines : [];
        validationResult.failures = [];
        if (extractedWines.length === 0) {
          validationResult.failures.push("Nenhum vinho extraído");
        }
        for (const wine of extractedWines) {
          if (typeof wine?.name !== "string" || wine.name.trim().length < 2) {
            validationResult.failures.push("Vinho sem nome suficiente");
          }
          if (!["red", "white", "sparkling", "rose"].includes(String(wine?.category || ""))) {
            validationResult.failures.push(`Categoria inválida para ${wine?.name || "vinho"}`);
          }
          const confidence = typeof wine?.confidence === "number" ? wine.confidence : Number(wine?.confidence);
          if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
            validationResult.failures.push(`Confidence inválido para ${wine?.name || "vinho"}`);
          }
        }
        if (likelyMultipleEntries && extractedWines.length < 3) {
          validationResult.failures.push(`Esperados pelo menos 3 vinhos estruturados, recebidos ${extractedWines.length}`);
        }
        validationResult.passed = validationResult.failures.length === 0;
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
      const fallback = isMenuMode
        ? normalizeMenuPayload(buildFallbackWineListAnalysis({ extractedText: normalizedText, fileName }))
        : normalizeWineListPayload(buildFallbackWineListAnalysis({ extractedText: normalizedText, fileName }));
      trace("fallback_used", {
        request_id: requestId,
        reason: "no_parsed_output",
        count: isMenuMode ? (fallback as any).dishes?.length || 0 : (fallback as any).wines?.length || 0,
      });
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 200, "fallback_used", Date.now() - startTime, {
        request_id: requestId,
        reason: "no_parsed_output",
        mode,
        fallback: true,
        input_size_bytes: inputSizeBytes,
        error_type: "PARSE_ERROR",
      });
      return jsonResponse(req, { ...fallback, fallback: true, fallbackReason: "NO_PARSED_OUTPUT", note: "análise simplificada" });
    }

    const parsedCount = isMenuMode
      ? Array.isArray(lastParsed.dishes) ? lastParsed.dishes.length : 0
      : Array.isArray(lastParsed.wines) ? lastParsed.wines.length : 0;
    let finalParsedCount = parsedCount;

    if (!isMenuMode) {
      console.log("OCR_TEXT", normalizedText);
      const groundingResult = applyGroundedWineExtraction(lastParsed, normalizedText);
      const filteredWines = groundingResult.grounded.wines;
      console.log("FILTERED_WINES", filteredWines);
      lastParsed = groundingResult.grounded;
      validationResult.failures = validationResult.failures.filter((failure) =>
        !failure.startsWith("Esperados pelo menos 3 vinhos estruturados")
      );

      if (filteredWines.length === 0) {
        validationResult.failures.push("Nenhum vinho permaneceu ancorado no OCR");
      }
      if (filteredWines.length < 3) {
        validationResult.failures.push(`Grounding insuficiente: ${filteredWines.length} vinhos ancorados para ${groundingResult.candidateLineCount} linhas candidatas`);
      }
      finalParsedCount = filteredWines.length;
      validationResult.passed = validationResult.failures.length === 0;
    }

    if (!validationResult.passed && !isMenuMode) {
      trace("parse_failed", {
        request_id: requestId,
        reason: "low_confidence_extraction",
        failures: validationResult.failures.slice(0, 12),
        count: finalParsedCount,
      });
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 422, "parse_failed", Date.now() - startTime, {
        request_id: requestId,
        reason: "low_confidence_extraction",
        validation_failures: validationResult.failures.slice(0, 12),
        mode,
        input_size_bytes: inputSizeBytes,
        error_type: "LOW_CONFIDENCE_EXTRACTION",
      });
      return jsonResponse(req, {
        success: false,
        code: "LOW_CONFIDENCE_EXTRACTION",
        message: "Não conseguimos extrair vinhos suficientes com confiança desta carta. Tente outra imagem mais nítida.",
        requestId,
        retryable: true,
      }, 422);
    }

    if (!validationResult.passed) {
      trace("parse_failed", { request_id: requestId, reason: "empty_or_invalid_extraction", failures: validationResult.failures.slice(0, 12) });
      const fallback = isMenuMode
        ? normalizeMenuPayload(buildFallbackWineListAnalysis({ extractedText: normalizedText, fileName }))
        : normalizeWineListPayload(buildFallbackWineListAnalysis({ extractedText: normalizedText, fileName }));
      trace("fallback_used", {
        request_id: requestId,
        reason: "empty_or_invalid_extraction",
        count: isMenuMode ? (fallback as any).dishes?.length || 0 : (fallback as any).wines?.length || 0,
      });
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 200, "fallback_used", Date.now() - startTime, {
        reason: "empty_or_invalid_extraction",
        validation_failures: validationResult.failures.slice(0, 12),
        mode,
        fallback: true,
        input_size_bytes: inputSizeBytes,
        error_type: "PARSE_ERROR",
      });
      return jsonResponse(req, { ...fallback, fallback: true, fallbackReason: "EMPTY_OR_INVALID_EXTRACTION", note: "análise simplificada" });
    }

    trace("wines_extracted", { request_id: requestId, count: finalParsedCount, degraded: false });
    const normalized = isMenuMode ? normalizeMenuPayload(lastParsed) : normalizeWineListPayload(lastParsed);
    trace("extraction_completed", { request_id: requestId, count: isMenuMode ? normalized.dishes.length : normalized.wines.length });
    trace("parse_success", { request_id: requestId, mode, count: finalParsedCount, degraded: false });
    await setCachedAiResponse("analyze-wine-list", cacheInput, normalized);
    trace("response_serialization_timing", { request_id: requestId, durationMs: elapsed(startTime), cached: true, degraded: false });
    trace("total_function_duration", { request_id: requestId, durationMs: elapsed(startTime), input_size_bytes: inputSizeBytes, user_id: userId });
    return jsonResponse(req, normalized);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Erro interno";
    const isAbort = errMsg.toLowerCase().includes("abort");
    console.error("analyze-wine-list error:", errMsg);
    const fallback = isMenuMode
      ? normalizeMenuPayload(buildFallbackWineListAnalysis({ extractedText: normalizedText, fileName }))
      : normalizeWineListPayload(buildFallbackWineListAnalysis({ extractedText: normalizedText, fileName }));
    trace("fallback_used", {
      request_id: requestId,
      reason: isAbort ? "timeout" : "internal_error",
      count: isMenuMode ? (fallback as any).dishes?.length || 0 : (fallback as any).wines?.length || 0,
    });
    await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", userId, FUNCTION_NAME, 200, "fallback_used", Date.now() - startTime, {
      reason: isAbort ? "timeout" : "internal_error",
      mode,
      fallback: true,
      input_size_bytes: inputSizeBytes,
      error_type: isAbort ? "AI_TIMEOUT" : "AI_UNAVAILABLE",
    });
    return jsonResponse(req, { ...fallback, fallback: true, fallbackReason: isAbort ? "TIMEOUT" : "INTERNAL_ERROR", note: "análise simplificada" });
  }
});
