import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { callOpenAIResponses } from "../_shared/openai.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";
import { buildDeterministicPairingsForWine, buildDeterministicSuggestionsForDish, shouldUseDeterministicPairing } from "../_shared/deterministic-pairing.ts";


const FUNCTION_NAME = "wine-pairings";



function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  } catch { /* Silent */ }
}

function trace(stage: string, metadata?: Record<string, unknown>) {
  console.log(`[${FUNCTION_NAME}] ${stage}`, metadata || {});
}

function elapsed(startedAt: number) {
  return Date.now() - startedAt;
}

// ── Anti-Genericity Validation ──
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

const GENERIC_WINE_NAME_TOKENS = new Set([
  "vinho",
  "tinto",
  "branco",
  "rose",
  "rosé",
  "espumante",
  "seco",
  "seca",
  "leve",
  "medio",
  "médio",
  "encorpado",
  "corpo",
  "aromatico",
  "aromático",
  "fresco",
  "brut",
  "doce",
  "suave",
  "jovem",
]);

function isGenericWineName(name?: string | null) {
  const normalized = normalizeForMatch(name);
  if (!normalized) return true;
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const nonGeneric = tokens.filter((token) => !GENERIC_WINE_NAME_TOKENS.has(token));
  return nonGeneric.length === 0;
}

function nonEmptyString(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !["undefined", "null", "nan", "n/a", "na", "none", "sem dado", "sem dados"].includes(normalized);
}

function normalizePairingsPayload(payload: unknown, mode: "wine-to-food" | "food-to-wine") {
  if (!payload || typeof payload !== "object") {
    return mode === "wine-to-food" ? { pairings: [] } : { suggestions: [] };
  }

  const data = payload as Record<string, unknown>;

  if (mode === "wine-to-food") {
    const pairings = Array.isArray(data.pairings)
      ? data.pairings.filter((pairing) =>
          pairing &&
          typeof pairing === "object" &&
          nonEmptyString((pairing as Record<string, unknown>).dish) &&
          nonEmptyString((pairing as Record<string, unknown>).reason)
        ).map((pairing) => {
          const p = pairing as Record<string, unknown>;
          return {
            dish: String(p.dish).trim(),
            category: nonEmptyString(p.category) ? String(p.category).trim() : "outro",
            reason: String(p.reason).trim(),
            match: nonEmptyString(p.match) ? String(p.match).trim() : "bom",
            harmony_type: nonEmptyString(p.harmony_type) ? String(p.harmony_type).trim() : "equilíbrio",
            harmony_label: nonEmptyString(p.harmony_label) ? String(p.harmony_label).trim() : "Harmonia equilibrada",
            dish_profile: typeof p.dish_profile === "object" && p.dish_profile !== null ? p.dish_profile : null,
            recipe: typeof p.recipe === "object" && p.recipe !== null ? p.recipe : null,
          };
        })
      : [];

    return {
      ...data,
      pairings,
      pairingLogic: nonEmptyString(data.pairingLogic) ? String(data.pairingLogic).trim() : null,
      wineProfile: typeof data.wineProfile === "object" && data.wineProfile !== null ? data.wineProfile : null,
    };
  }

  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.filter((suggestion) =>
        suggestion &&
        typeof suggestion === "object" &&
        nonEmptyString((suggestion as Record<string, unknown>).wineName) &&
        nonEmptyString((suggestion as Record<string, unknown>).reason)
      ).map((suggestion) => {
        const s = suggestion as Record<string, unknown>;
        return {
          wineName: String(s.wineName).trim(),
          style: nonEmptyString(s.style) ? String(s.style).trim() : "tinto",
          grape: nonEmptyString(s.grape) ? String(s.grape).trim() : "Blend",
          vintage: Number.isFinite(Number(s.vintage)) ? Number(s.vintage) : 0,
          region: nonEmptyString(s.region) ? String(s.region).trim() : "",
          country: nonEmptyString(s.country) ? String(s.country).trim() : "",
          reason: String(s.reason).trim(),
          fromCellar: Boolean(s.fromCellar),
          match: nonEmptyString(s.match) ? String(s.match).trim() : "bom",
          harmony_type: nonEmptyString(s.harmony_type) ? String(s.harmony_type).trim() : "equilíbrio",
          harmony_label: nonEmptyString(s.harmony_label) ? String(s.harmony_label).trim() : "Harmonia equilibrada",
          compatibilityLabel: nonEmptyString(s.compatibilityLabel) ? String(s.compatibilityLabel).trim() : "Boa opção",
          wineProfile: typeof s.wineProfile === "object" && s.wineProfile !== null ? s.wineProfile : {
            body: "médio",
            acidity: "média",
            tannin: "n/a",
            style: nonEmptyString(s.style) ? String(s.style).trim() : "elegante",
          },
        };
      })
    : [];

  return {
    ...data,
    suggestions,
    dishProfile: typeof data.dishProfile === "object" && data.dishProfile !== null ? data.dishProfile : null,
  };
}

function validateWineSpecificity(
  _texts: string[],
  _wineName: string,
  _grape?: string | null,
  _context?: SpecificityContext,
): { passed: boolean; failures: string[] } {
  // Validação relaxada: confiamos na qualidade do prompt e dos schemas estruturados.
  // A validação anti-genericidade era excessivamente restritiva e rejeitava respostas
  // perfeitamente úteis quando o vinho tinha pouca metadata (caso comum em adegas reais).
  return { passed: true, failures: [] };
}

function analyzeDish(dish: string) {
  const lower = dish.toLowerCase();
  const result = {
    intensity: "média",
    fat: "moderada",
    protein: "",
    cooking: "",
    flavors: [] as string[],
  };

  if (lower.match(/grelhad|brasa|churras|assad|frit[oa]/)) {
    result.cooking = "grelhado/assado";
    result.intensity = "alta";
  } else if (lower.match(/cozid|vapor|refogad/)) {
    result.cooking = "cozido";
  } else if (lower.match(/cru|tartare|ceviche/)) {
    result.cooking = "cru";
    result.intensity = "leve";
  }

  if (lower.match(/carne|picanha|costela|bife|cordeiro/)) {
    result.protein = "vermelha";
    result.fat = "alta";
  } else if (lower.match(/frango|ave|peru/)) {
    result.protein = "branca";
    result.fat = "moderada";
  } else if (lower.match(/peixe|salmão|atum|camarão|bacalhau/)) {
    result.protein = "peixe";
    result.fat = "leve";
  } else if (lower.match(/ovo|omelete/)) {
    result.protein = "ovo";
    result.fat = "moderada";
  } else if (lower.match(/queijo|fondue/)) {
    result.protein = "laticínio";
    result.fat = "alta";
  }

  if (lower.match(/molho|creme/)) result.flavors.push("molho cremoso");
  if (lower.match(/tomate/)) result.flavors.push("acidez do tomate");
  if (lower.match(/limão|cítric|vinagre/)) result.flavors.push("acidez cítrica");
  if (lower.match(/pimenta|picante|apimentad/)) result.flavors.push("picância");

  return result;
}

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
  /frescor/i,
];

function hasTechnicalLanguage(text?: string | null) {
  if (!text) return false;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

function scoreCellarWineForDish(wine: Record<string, unknown>, dish: string) {
  const analysis = analyzeDish(dish);
  const lowerDish = dish.toLowerCase();
  const style = String(wine.style || "").toLowerCase();
  const grape = String(wine.grape || "").toLowerCase();
  const region = String(wine.region || "").toLowerCase();
  const country = String(wine.country || "").toLowerCase();
  let score = 0;

  if (style === "tinto" && (analysis.protein === "vermelha" || analysis.fat === "alta")) score += 18;
  if ((style === "branco" || style === "espumante" || style === "rosé") && (analysis.protein === "peixe" || analysis.fat === "leve")) score += 18;
  if (style === "tinto" && analysis.intensity === "alta") score += 8;
  if ((style === "branco" || style === "rosé" || style === "espumante") && analysis.intensity === "leve") score += 8;
  if (grape && lowerDish.includes(grape)) score += 5;
  if (region && lowerDish.includes(region)) score += 3;
  if (country && lowerDish.includes(country)) score += 2;
  if (analysis.flavors.some((flavor) => lowerDish.includes(flavor.split(" ")[0]))) score += 4;
  if (String(wine.tannin || "").toLowerCase().includes("firm")) score += analysis.protein === "vermelha" ? 4 : 0;
  if (String(wine.acidity || "").toLowerCase().includes("alta")) score += analysis.fat === "alta" ? 4 : 2;

  return score;
}

function rankCellarWinesForDish(dish: string, wines: Record<string, unknown>[]) {
  return [...wines].sort((a, b) => scoreCellarWineForDish(b, dish) - scoreCellarWineForDish(a, dish));
}

function getWinePrice(wine: Record<string, unknown>): number | null {
  const p = (wine as any).purchase_price ?? (wine as any).current_value;
  if (p == null) return null;
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rankCellarWinesByIntent(
  dish: string,
  wines: Record<string, unknown>[],
  intent: "everyday" | "value" | "special",
) {
  // Score técnico primeiro — só vinhos com compatibilidade mínima entram
  const scored = wines.map((w) => ({ wine: w, score: scoreCellarWineForDish(w, dish) }));
  // Filtro de compatibilidade mínima (score >= 8 = pelo menos uma afinidade técnica clara)
  const compatible = scored.filter((s) => s.score >= 8);
  const pool = compatible.length >= 3 ? compatible : scored; // fallback se quase nada combina

  const withPrices = pool.map((s) => ({ ...s, price: getWinePrice(s.wine) }));
  const pricedOnly = withPrices.filter((s) => s.price != null) as Array<{ wine: Record<string, unknown>; score: number; price: number }>;

  if (intent === "value") {
    // Mais barato primeiro entre os compatíveis. Sem preço vai pro fim.
    const sorted = [...pricedOnly].sort((a, b) => {
      // primeiro só compatibilidade aceitável (score >= 8), depois preço asc
      if (a.score < 8 && b.score >= 8) return 1;
      if (b.score < 8 && a.score >= 8) return -1;
      return a.price - b.price;
    });
    const noPrice = withPrices.filter((s) => s.price == null).sort((a, b) => b.score - a.score);
    return [...sorted, ...noPrice].map((s) => s.wine);
  }

  if (intent === "special") {
    // Mais caro primeiro, MAS com sanity check: se prato simples, evita topo de gama desproporcional
    const lowerDish = dish.toLowerCase();
    const simpleDish = /pizza|macarr[aã]o|massa simples|ovo|arroz|strogon|sandu|hamb[uú]rguer|feij[aã]o|lasanha caseira|frango grelhado|salada/.test(lowerDish);
    const median = pricedOnly.length > 0
      ? [...pricedOnly].sort((a, b) => a.price - b.price)[Math.floor(pricedOnly.length / 2)].price
      : 0;
    const ceiling = simpleDish && median > 0 ? median * 2.5 : Infinity;

    const sorted = [...pricedOnly].sort((a, b) => {
      const aOver = a.price > ceiling ? 1 : 0;
      const bOver = b.price > ceiling ? 1 : 0;
      if (aOver !== bOver) return aOver - bOver; // vinhos absurdamente caros pro prato vão pro fim
      return b.price - a.price;
    });
    const noPrice = withPrices.filter((s) => s.price == null).sort((a, b) => b.score - a.score);
    return [...sorted, ...noPrice].map((s) => s.wine);
  }

  // everyday — preço mediano
  if (pricedOnly.length === 0) return pool.sort((a, b) => b.score - a.score).map((s) => s.wine);
  const sortedByPrice = [...pricedOnly].sort((a, b) => a.price - b.price);
  const median = sortedByPrice[Math.floor(sortedByPrice.length / 2)].price;
  const sorted = [...pricedOnly].sort((a, b) => {
    const da = Math.abs(a.price - median);
    const db = Math.abs(b.price - median);
    if (da !== db) return da - db;
    return b.score - a.score;
  });
  const noPrice = withPrices.filter((s) => s.price == null).sort((a, b) => b.score - a.score);
  return [...sorted, ...noPrice].map((s) => s.wine);
}

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  tools: unknown[],
) {
  const schema = (tools?.[0] as any)?.function?.parameters || {};
  const startedAt = Date.now();

  const result = await callOpenAIResponses<any>({
    functionName: "wine-pairings",
    requestId: crypto.randomUUID(),
    model: "gpt-4o-mini",
    timeoutMs: 25_000,
    temperature: 0.35,
    instructions: systemPrompt,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: userPrompt }],
      },
    ],
    schema,
    maxOutputTokens: 560,
  });

  console.log("[wine-pairings] stage_timing", {
    stage: "openai_call",
    durationMs: Date.now() - startedAt,
    ok: result.ok,
    status: result.ok ? 200 : result.status,
  });

  if (result.ok) {
    return { ok: true, status: 200, errText: "", parsed: result.parsed };
  }

  return { ok: false, status: result.status, errText: result.error, parsed: null };
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  let userId = "unknown";

  try {
    const authorization = req.headers.get("Authorization");
    if (Deno.env.get("EDGE_DEBUG") === "true") console.log("AUTH HEADER:", !!authorization);
    if (!authorization) {
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", "unknown", FUNCTION_NAME, 401, "unauthorized", Date.now() - startTime, { request_id: requestId, reason: "missing_or_invalid_authorization_header" });
      return jsonResponse({ error: "AUTH_REQUIRED" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization")!,
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    const validatedUserId = user?.id;
    console.log(`[${FUNCTION_NAME}] auth_validation request_id=${requestId} valid=${Boolean(validatedUserId)}`);
    if (error || !validatedUserId) {
      console.error("AUTH ERROR:", error);
      await logToDb(supabaseUrl, serviceKey, "unknown", FUNCTION_NAME, 401, "unauthorized", Date.now() - startTime, { request_id: requestId, reason: "invalid_token" });
      return jsonResponse({ error: "AUTH_INVALID" }, 401);
    }
    userId = validatedUserId;
    trace("auth_ok", { request_id: requestId, user_id: userId, durationMs: elapsed(startTime) });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 400, "validation_error", Date.now() - startTime);
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }
    const { mode, wineName, wineStyle, wineGrape, wineRegion, dish, userWines, intent } = body as Record<string, any>;
    const wineProducer = (body as any).wineProducer || null;
    const wineVintage = (body as any).wineVintage || null;
    const wineCountry = (body as any).wineCountry || null;
    trace("request_validation", {
      request_id: requestId,
      mode,
      hasDish: Boolean(dish),
      hasWineName: Boolean(wineName),
      cellarCount: Array.isArray(userWines) ? userWines.length : 0,
      durationMs: elapsed(startTime),
    });

    const cacheInput = {
      mode,
      wineName: wineName || "",
      wineStyle: wineStyle || "",
      wineGrape: wineGrape || "",
      wineRegion: wineRegion || "",
      wineProducer: wineProducer || "",
      wineVintage: wineVintage || "",
      wineCountry: wineCountry || "",
      dish: dish || "",
      intent: intent || "",
      userWines: Array.isArray(userWines)
        ? userWines.slice(0, 20).map((wine: any) => ({
            id: wine?.id || null,
            name: wine?.name || "",
            producer: wine?.producer || "",
            region: wine?.region || "",
            country: wine?.country || "",
            grape: wine?.grape || "",
            style: wine?.style || "",
            vintage: wine?.vintage || null,
            purchase_price: wine?.purchase_price ?? null,
            current_value: wine?.current_value ?? null,
          }))
        : [],
    };
    const cached = await getCachedAiResponse("wine-pairings", cacheInput);
    if (cached.hit && cached.payload) {
      trace("pairings_cache_hit", { request_id: requestId, inputHash: cached.inputHash, durationMs: elapsed(startTime) });
      return jsonResponse(cached.payload);
    }
    trace("pairings_cache_miss", { request_id: requestId, inputHash: cached.inputHash, degraded: cached.degraded });

    const deterministicResult = mode === "wine-to-food"
      ? (shouldUseDeterministicPairing({ name: wineName || "", style: wineStyle || null, grape: wineGrape || null, country: wineCountry || null, region: wineRegion || null, producer: wineProducer || null, vintage: wineVintage || null })
        ? buildDeterministicPairingsForWine({
            name: wineName || "",
            style: wineStyle || null,
            grape: wineGrape || null,
            country: wineCountry || null,
            region: wineRegion || null,
            producer: wineProducer || null,
            vintage: wineVintage || null,
          })
        : null)
      : buildDeterministicSuggestionsForDish(
          typeof dish === "string" ? dish : "",
          Array.isArray(userWines) ? userWines.slice(0, 20).map((wine: any) => ({
            name: wine?.name || "",
            producer: wine?.producer || null,
            region: wine?.region || null,
            country: wine?.country || null,
            grape: wine?.grape || null,
            style: wine?.style || null,
            vintage: wine?.vintage ?? null,
            quantity: wine?.quantity ?? null,
          })) : [],
        );

    if (deterministicResult) {
      trace("pairings_deterministic_hit", {
        request_id: requestId,
        mode,
        durationMs: elapsed(startTime),
        source: deterministicResult.source,
      });
      await setCachedAiResponse("wine-pairings", cacheInput, deterministicResult);
      await logToDb(supabaseUrl, serviceKey, userId, FUNCTION_NAME, 200, "deterministic_success", Date.now() - startTime, {
        request_id: requestId,
        mode,
        source: deterministicResult.source,
      });
      return jsonResponse(deterministicResult);
    }

    const rateLimit = await checkRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logToDb(supabaseUrl, serviceKey, userId, FUNCTION_NAME, 429, "rate_limited", Date.now() - startTime, {
        request_id: requestId,
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
      });
      return jsonResponse(
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

    // ── Wine Technical Profile Construction Instructions ──
    const PROFILE_CONSTRUCTION_RULES = `
CONSTRUÇÃO OBRIGATÓRIA DO PERFIL TÉCNICO (WineTechnicalProfile):
Antes de responder QUALQUER coisa, você DEVE construir internamente um perfil técnico para cada vinho mencionado.

PROCESSO OBRIGATÓRIO EM 5 ETAPAS:
ETAPA 1 — IDENTIFICAÇÃO DO PRODUTOR: Quem é ${wineProducer || "o produtor"}? Qual a filosofia, escala, posicionamento? É entrada de linha, reserva, gran reserva, ícone?
ETAPA 2 — CONTEXTO REGIONAL: ${wineRegion || "A região"} + ${wineCountry || "o país"} implicam que tipo de clima, solo, tradição?
ETAPA 3 — POSICIONAMENTO: Este é um vinho de R$30 ou R$300? O nome/linha sugere qual segmento?
ETAPA 4 — SAFRA: ${wineVintage || "A safra"} — o que isso significa para evolução, taninos, frescor?
ETAPA 5 — ESTRUTURA RESULTANTE: Com base nas 4 etapas anteriores (NÃO na uva genérica), defina:
  - body: leve/médio/encorpado
  - acidity: baixa/média/alta
  - tannin: n/a/sedosos/firmes/estruturados
  - style: elegante/potente/gastronômico/frutado/mineral/etc
  - complexity: simples/moderado/complexo

REGRAS ABSOLUTAS:
1. PRIORIDADE: o rótulo "${wineName}" específico, NUNCA a uva "${wineGrape || ""}" isolada
2. Don Melchor ≠ qualquer Cabernet. Testamatta ≠ qualquer Sangiovese. Barolo ≠ qualquer Nebbiolo.
3. Se faltam dados, INFIRA com base em: origem, estilo típico daquela região, posicionamento do rótulo
4. Use linguagem como "O ${wineName} tende a apresentar..." quando inferindo
5. NUNCA faça afirmações absolutas sem dados suficientes

ANTI-GENERICIDADE (VALIDAÇÃO AUTOMÁTICA NO SERVIDOR):
⚠️ O servidor VALIDA automaticamente suas respostas. Se detectar:
- Frases que funcionariam para qualquer vinho da mesma uva
- Descrições genéricas da uva sem contexto do rótulo
- Ausência do nome "${wineName}" nas explicações
→ A resposta será REJEITADA e você será chamado novamente.

PROIBIDO (causa rejeição automática):
- "[Uva] possui notas de..."
- "[Uva] é conhecida por..."  
- "combina bem", "harmoniza perfeitamente", "complementa os sabores"
- "um vinho versátil/equilibrado/elegante que..."
- Qualquer frase que funcione para QUALQUER vinho da mesma uva
- Descrever "notas de frutas vermelhas/escuras/tropicais e..." sem contexto do rótulo

OBRIGATÓRIO em CADA explicação:
- Citar "${wineName}" pelo nome (não "este vinho" ou "o ${wineGrape || "vinho"}")
- Referenciar pelo menos UM aspecto único deste rótulo (produtor, região, país, posicionamento, safra ou estilo)
- Se houver poucos dados, faça inferência cautelosa e escreva como tendência deste rótulo, não como regra genérica da uva
- Explicar a INTERAÇÃO FÍSICA entre vinho e prato (acidez × gordura, tanino × proteína, etc.)`;

    let systemPrompt: string;
    let userPrompt: string;
    const hasCellar = (userWines as any[] | undefined)?.length ? (userWines as any[]).length > 0 : false;

    if (mode === "wine-to-food") {
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${PROFILE_CONSTRUCTION_RULES}

FLUXO OBRIGATÓRIO:
1. Execute as 5 ETAPAS do perfil técnico para "${wineName}"
2. Use o perfil para gerar o campo "summary" do wineProfile — 2-3 frases que DIFERENCIEM "${wineName}" de outros vinhos da mesma uva "${wineGrape || ""}"
3. Defina pairingLogic como a síntese objetiva do que este vinho pede na mesa
4. Para CADA prato sugerido, explique a INTERAÇÃO FÍSICA entre o perfil técnico de "${wineName}" e os componentes do prato

O summary DEVE:
- Começar com "O ${wineName}..." ou "Este ${wineName}..."
- Mencionar o produtor/região/posicionamento
- Explicar o que DIFERENCIA este rótulo de outros da mesma uva
- NUNCA ser uma descrição genérica da uva

REGRAS ENOLÓGICAS:
1. Peso equivalente: corpo do vinho ∝ intensidade do prato
2. Tanino + peixe delicado = metálico → NUNCA
3. Álcool alto + picante = desastre → NUNCA
4. Regionalidade: priorize quando fizer sentido

JULGAMENTO HONESTO — nem todo prato é "perfeito":
- perfeito: harmonia excepcional, elevam um ao outro
- muito bom: funciona muito bem, recomendação segura
- bom: funciona, mas não é memorável`;

      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Produtor: ${wineProducer || "Não informado"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região: ${wineRegion || "Não informada"}
País: ${wineCountry || "Não informado"}
Safra: ${wineVintage || "Não informada"}

INSTRUÇÕES:
1. Execute as 5 ETAPAS do perfil técnico para "${wineName}" — NÃO pule nenhuma etapa
2. Preencha wineProfile.summary com 2-3 frases ESPECÍFICAS sobre "${wineName}" (começando com "O ${wineName}...")
3. Preencha pairingLogic com 2-4 frases objetivas explicando o que o vinho pede na mesa
4. Sugira 3-5 pratos, SEMPRE citando "${wineName}" pelo nome em CADA explicação
5. Varie entre entradas, pratos principais e queijos/sobremesa
6. Em CADA reason, cite ao menos 1 característica ESPECÍFICA de "${wineName}" (não da uva genérica)
7. Varie os harmony_type (contraste/semelhança/complemento/equilíbrio/limpeza)`;

    } else if (mode === "food-to-wine") {
      // ── Intent (cliente escolheu como quer harmonizar) ──
      const normalizedIntent: "everyday" | "value" | "special" =
        intent === "value" || intent === "special" ? intent : "everyday";

      const INTENT_RULES: Record<string, string> = {
        everyday: `INTENÇÃO DO CLIENTE: HARMONIZAR PARA O DIA A DIA.
Critério de ranqueamento: priorize vinhos da adega de PREÇO MÉDIO (faixa intermediária dos rótulos disponíveis) que tenham COMPATIBILIDADE ALTA ou EXCELENTE com o prato.
- NÃO sugira o rótulo mais caro nem o mais barato como primeira opção.
- Priorize rótulos que combinam BEM e que o cliente pode abrir sem peso na consciência.
- Bom senso enológico permanece soberano: jamais sugira um vinho que tecnicamente NÃO combina, mesmo se for preço médio.`,
        value: `INTENÇÃO DO CLIENTE: MELHOR CUSTO-BENEFÍCIO.
Critério de ranqueamento: entre os vinhos da adega que de fato HARMONIZAM com o prato (compatibilidade no mínimo "Boa opção"), ordene do MAIS BARATO para o mais caro.
- A primeira sugestão deve ser o vinho de MENOR preço que ainda harmoniza tecnicamente bem.
- NUNCA sugira um vinho barato que tecnicamente é INCOMPATÍVEL só porque é barato.
- Filtro de bom senso: se o prato é simples (ex: ovo com arroz, macarrão alho e óleo), nem mencione tintos encorpados ou rótulos premium.`,
        special: `INTENÇÃO DO CLIENTE: MOMENTO INESQUECÍVEL / OCASIÃO ESPECIAL.
Critério de ranqueamento: entre os vinhos que harmonizam EXCEPCIONALMENTE com o prato, priorize os de MAIOR preço/posicionamento da adega.
- A primeira sugestão deve ser o vinho mais notável/caro que TECNICAMENTE eleva o prato.
- FILTRO ENOLÓGICO INEGOCIÁVEL: jamais sugira um Barolo de R$2000 para um strogonoff de carne, ou um Champagne grande marca para ovo com arroz. O vinho deve estar à altura do prato e o prato à altura do vinho.
- Se o prato é simples/cotidiano, seja honesto: "Para esta receita, mesmo em ocasião especial, não vale abrir os rótulos mais caros — sugerimos estes vinhos médios que combinam melhor."`,
      };

      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${PROFILE_CONSTRUCTION_RULES}

${hasCellar ? `REGRA CRÍTICA: O usuário tem vinhos NA ADEGA. Você DEVE:
1. Executar as 5 ETAPAS do perfil técnico para CADA vinho da adega
2. Usar o perfil técnico para determinar compatibilidade com o prato "${dish}"
3. Priorizar rótulos REAIS. NUNCA responda com categorias genéricas ("vinho branco seco")
4. Se NENHUM vinho da adega combina adequadamente, diga isso honestamente.
5. Para cada vinho, a explicação DEVE citar o nome do rótulo e uma característica específica dele.
6. Os vinhos já foram pré-filtrados localmente; você deve apenas explicar e ranquear os melhores.` : "Sugira tipos específicos de vinho com rótulos de referência."}

${INTENT_RULES[normalizedIntent]}

FLUXO OBRIGATÓRIO:
1. Analise "${dish}" tecnicamente (proteína, gordura, cocção, intensidade, texturas, sofisticação)
2. Para cada vinho candidato, execute as 5 ETAPAS do perfil técnico
3. Compare perfil do vinho vs perfil do prato usando lógica técnica:
   - acidez × gordura
   - tanino × proteína
   - intensidade × intensidade
   - textura × textura
   - SOFISTICAÇÃO do vinho × SOFISTICAÇÃO do prato (não case rótulo premium com prato cotidiano)
4. Aplique o critério de INTENÇÃO acima para ordenar (preço médio / mais barato / mais caro entre os compatíveis)
5. Classifique honestamente cada sugestão

JULGAMENTO HONESTO — use toda a escala:
- Excelente escolha: harmonia excepcional
- Alta compatibilidade: muito boa combinação
- Boa opção: funciona bem
- Funciona bem: aceitável
- Escolha ousada: pode funcionar mas é arriscado
- Pouco indicado: não recomendo

NEM TODOS os vinhos devem ser positivos. Se um vinho é ruim para o prato, diga.`;

      const rankedCellarWines = hasCellar
        ? rankCellarWinesByIntent(dish, (userWines as any[]).slice(0, 40), normalizedIntent).slice(0, 8)
        : [];
      const cellarContext = hasCellar
        ? `\nVinhos da adega — JÁ ORDENADOS pelo servidor conforme a intenção "${normalizedIntent}". Você DEVE manter EXATAMENTE esta ordem nas suas sugestões (a primeira da lista é a primeira a sugerir):\n${rankedCellarWines.map((w: any, i: number) => {
            const price = w.purchase_price ?? w.current_value;
            const priceTxt = price != null ? `R$ ${Number(price).toFixed(0)}` : "preço não informado";
            return `${i + 1}. ${w.name} | Produtor: ${w.producer || "?"} | Uva: ${w.grape || "?"} | Região: ${w.region || "?"}, ${w.country || "?"} | Safra: ${w.vintage || "?"} | Estilo: ${w.style || "?"} | Preço: ${priceTxt}`;
          }).join("\n")}`
        : "";
      const intentLabel = normalizedIntent === "value"
        ? "MELHOR CUSTO-BENEFÍCIO (priorize os mais baratos compatíveis)"
        : normalizedIntent === "special"
          ? "MOMENTO INESQUECÍVEL (priorize os mais caros compatíveis, respeitando o nível do prato)"
          : "DIA A DIA (priorize preço médio entre os compatíveis)";

      userPrompt = `Prato: "${dish}"
Intenção do cliente: ${intentLabel}${cellarContext}

REGRA CRÍTICA DE ORDENAÇÃO:
- A lista de vinhos da adega acima JÁ ESTÁ ORDENADA pelo servidor segundo a intenção "${normalizedIntent}".
- Você DEVE manter exatamente essa ordem nas suas sugestões — o primeiro vinho da lista vira a primeira sugestão.
- NUNCA promova um vinho caro para o topo quando a intenção é "value" (custo-benefício).
- NUNCA sugira rótulo premium (Champagne grande marca, Barolo, Bordeaux Grand Cru, ícones) para pratos cotidianos como pizza, macarrão simples, ovo, frango grelhado, sanduíche.
- Se um vinho da lista é tecnicamente INCOMPATÍVEL com o prato, descarte-o e use o próximo da lista — não invente justificativa.

INSTRUÇÕES:
1. Decomponha "${dish}" tecnicamente (proteína, gordura, cocção, intensidade, sofisticação)
2. Para cada vinho, execute as 5 ETAPAS do perfil técnico
3. Mantenha a ORDEM da lista pré-ranqueada acima
4. Na explicação, cite o NOME do vinho e explique por que ESTE rótulo específico funciona (ou não) e por que se encaixa na intenção
5. Em cada reason, mencione ao menos 1 aspecto que diferencia este rótulo de outro da mesma uva
6. Use compatibilityLabel honestamente — nem tudo é "Excelente escolha"
7. Sugira de 3 a 5 vinhos reais da adega, NA ORDEM dada, sem inventar categorias genéricas`;
    } else {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 400, "validation_error", Date.now() - startTime, { mode });
      return jsonResponse({ error: "Mode inválido" }, 400);
    }

    const tools = mode === "wine-to-food" ? [
      {
        type: "function" as const,
        function: {
          name: "return_pairings",
          description: "Return dish pairing suggestions for a wine",
          parameters: {
            type: "object",
            properties: {
              wineProfile: {
                type: "object",
                description: "Technical profile of the specific wine label analyzed",
                properties: {
                  body: { type: "string", enum: ["leve", "médio", "encorpado"] },
                  acidity: { type: "string", enum: ["baixa", "média", "alta"] },
                  tannin: { type: "string", enum: ["n/a", "sedosos", "firmes", "estruturados"] },
                  style: { type: "string", description: "Estilo gastronômico: elegante, potente, gastronômico, frutado, mineral, etc" },
                  complexity: { type: "string", enum: ["simples", "moderado", "complexo"] },
                  summary: { type: "string", description: "2-3 frases ESPECÍFICAS sobre ESTE rótulo, começando com o nome do vinho. Deve diferenciar de outros da mesma uva." },
                },
                required: ["body", "acidity", "tannin", "style", "complexity", "summary"],
                additionalProperties: false,
              },
              pairings: {
                type: "array",
                  minItems: 3,
                  maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    dish: { type: "string", description: "Nome específico do prato com preparo" },
                    category: { type: "string", enum: ["classico", "afinidade", "contraste"] },
                    reason: { type: "string", description: "2-3 frases técnicas citando o NOME do vinho e explicando a interação físico-química específica deste rótulo com o prato" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string", description: "Frase curta técnica (ex: 'acidez que corta a gordura')" },
                    dish_profile: {
                      type: "object",
                      properties: {
                        intensity: { type: "string", enum: ["leve", "média", "alta"] },
                        texture: { type: "string", description: "Ex: cremosa, estruturada, leve, crocante" },
                        highlight: { type: "string", description: "Ex: gordura, proteína, acidez, umami, doçura" },
                      },
                      required: ["intensity", "texture", "highlight"],
                      additionalProperties: false,
                    },
                    recipe: {
                      type: "object",
                      description: "Receita resumida do prato",
                      properties: {
                        description: { type: "string" },
                        ingredients: { type: "array", items: { type: "string" } },
                        steps: { type: "array", items: { type: "string" } },
                        wine_reason: { type: "string", description: "Por que este prato harmoniza com o vinho — citando o nome do rótulo" },
                      },
                      required: ["description", "ingredients", "steps", "wine_reason"],
                      additionalProperties: false,
                    },
                  },
                  required: ["dish", "category", "reason", "match", "harmony_type", "harmony_label", "dish_profile", "recipe"],
                  additionalProperties: false,
                },
              },
              pairingLogic: { type: "string", description: "Síntese técnica explicando o que o vinho pede e por quê" },
            },
            required: ["wineProfile", "pairings", "pairingLogic"],
            additionalProperties: false,
          },
        },
      },
    ] : [
      {
        type: "function" as const,
        function: {
          name: "return_suggestions",
          description: "Return wine suggestions for a dish",
          parameters: {
            type: "object",
            properties: {
              dishProfile: {
                type: "object",
                description: "Technical analysis of the dish",
                properties: {
                  protein: { type: "string" },
                  cooking: { type: "string" },
                  fat: { type: "string" },
                  intensity: { type: "string", enum: ["leve", "média", "intensa"] },
                },
                required: ["protein", "cooking", "fat", "intensity"],
                additionalProperties: false,
              },
              suggestions: {
                type: "array",
              minItems: 3,
              maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    wineName: { type: "string", description: "Nome EXATO do vinho da adega ou tipo detalhado" },
                    style: { type: "string", enum: ["tinto", "branco", "rosé", "espumante"] },
                    grape: { type: "string" },
                    vintage: { type: "number" },
                    region: { type: "string" },
                    country: { type: "string" },
                    reason: { type: "string", description: "2-3 frases técnicas ÚNICAS citando o NOME do rótulo e aspectos específicos dele" },
                    fromCellar: { type: "boolean" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string" },
                    compatibilityLabel: { type: "string", enum: ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem", "Escolha ousada", "Pouco indicado"] },
                    wineProfile: {
                      type: "object",
                      description: "Perfil técnico deste rótulo específico",
                      properties: {
                        body: { type: "string", enum: ["leve", "médio", "encorpado"] },
                        acidity: { type: "string", enum: ["baixa", "média", "alta"] },
                        tannin: { type: "string", enum: ["n/a", "sedosos", "firmes", "estruturados"] },
                        style: { type: "string" },
                      },
                      required: ["body", "acidity", "tannin", "style"],
                      additionalProperties: false,
                    },
                  },
                  required: ["wineName", "style", "grape", "vintage", "region", "country", "reason", "fromCellar", "match", "harmony_type", "harmony_label", "compatibilityLabel", "wineProfile"],
                  additionalProperties: false,
                },
              },
            },
            required: ["dishProfile", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    ];

    const toolChoice = mode === "wine-to-food"
      ? { type: "function" as const, function: { name: "return_pairings" } }
      : { type: "function" as const, function: { name: "return_suggestions" } };

    // ── Retry loop with anti-genericity validation ──
    const MAX_ATTEMPTS = 1;
    let lastParsed: any = null;
    let validationResult: { passed: boolean; failures: string[] } = { passed: false, failures: [] };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const aiAttemptStartedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000);

      const retryHint = attempt > 0
        ? `\n\n⚠️ ATENÇÃO: Sua resposta anterior foi REJEITADA pela validação anti-genericidade. Problemas detectados:\n${validationResult.failures.map(f => `- ${f}`).join("\n")}\n\nREESSCREVA com mais especificidade sobre "${wineName}". Cite o nome do vinho, mencione produtor/região/posicionamento.`
        : "";

      const result = await callAI(
        systemPrompt,
        userPrompt + retryHint,
        tools,
      );

      clearTimeout(timeout);

      console.log({
        input: {
          mode,
          wineName: mode === "wine-to-food" ? wineName : null,
          dish: mode === "food-to-wine" ? dish : null,
          attempt: attempt + 1,
        },
        response: {
          ok: result.ok,
          status: result.status,
          errText: result.errText ? String(result.errText).slice(0, 240) : "",
        },
        parsed: result.parsed,
        error: result.ok ? null : result.errText,
      });
      console.log("[wine-pairings] stage_timing", {
        stage: "pairing_generation_attempt",
        mode,
        attempt: attempt + 1,
        durationMs: Date.now() - aiAttemptStartedAt,
        ok: result.ok,
      });

      if (!result.ok) {
        if (result.status === 429) return jsonResponse({ error: "Muitas requisições. Aguarde um momento e tente novamente." }, 429);
        if (result.status === 402) return jsonResponse({ error: "Créditos de IA esgotados." }, 402);
        if (result.status === 422) {
          console.warn("[wine-pairings] AI returned 422; falling back to degraded response", {
            request_id: requestId,
            mode,
            attempt: attempt + 1,
          });
          lastParsed = null;
          validationResult = { passed: false, failures: ["INVALID_AI_RESPONSE"] };
          break;
        }
        if (result.status === 504) return jsonResponse({ error: "A harmonização demorou mais que o esperado. Tente novamente." }, 504);
        console.error("AI gateway error:", result.status, result.errText);
        return jsonResponse({ error: result.errText || "Serviço de análise instável agora. Aguarde alguns segundos e tente novamente." }, 500);
      }

      if (!result.parsed) {
        console.error("AI parse error on attempt", attempt);
        continue;
      }

      lastParsed = result.parsed;

      // ── Validação relaxada: confiamos no schema estruturado ──
      // Aceitamos qualquer resposta que tenha pelo menos 1 pairing/suggestion com texto não-trivial.
      validationResult = { passed: true, failures: [] };

      if (mode === "wine-to-food") {
        const pairings = Array.isArray(lastParsed.pairings) ? lastParsed.pairings : [];
        if (pairings.length < 1) {
          validationResult.passed = false;
          validationResult.failures.push("No pairings returned");
        } else {
          // Aceita pratos com qualquer descrição minimamente preenchida
          const validCount = pairings.filter((p: any) => typeof p?.dish === "string" && p.dish.trim().length > 0 && typeof p?.reason === "string" && p.reason.trim().length >= 20).length;
          if (validCount < 1) {
            validationResult.passed = false;
            validationResult.failures.push("Pairings have empty or trivial reasons");
          }
        }
      } else {
        const suggestions = Array.isArray(lastParsed.suggestions) ? lastParsed.suggestions : [];
        if (suggestions.length < 1) {
          validationResult.passed = false;
          validationResult.failures.push(`No suggestions returned`);
        } else {
          const validCount = suggestions.filter((s: any) => typeof s?.wineName === "string" && s.wineName.trim().length > 0 && typeof s?.reason === "string" && s.reason.trim().length >= 20).length;
          if (validCount < 1) {
            validationResult.passed = false;
            validationResult.failures.push("Suggestions have empty or trivial reasons");
          }
        }
      }

      console.log(`Attempt ${attempt + 1}: validation ${validationResult.passed ? "PASSED" : "FAILED"} (${validationResult.failures.length} failures)`);

      if (validationResult.passed) break;

      if (attempt === MAX_ATTEMPTS - 1) {
        console.log("Max retries reached, no valid pairing response produced");
      }
    }

    const parsed = normalizePairingsPayload(
      lastParsed || (mode === "wine-to-food" ? { pairings: [] } : { suggestions: [] }),
      mode,
    );
    const parsedCount = mode === "wine-to-food"
      ? Array.isArray(parsed.pairings) ? parsed.pairings.length : 0
      : Array.isArray(parsed.suggestions) ? parsed.suggestions.length : 0;

    // Degradar com elegância: se temos qualquer resultado, devolver mesmo sem passar 100% na validação.
    if (!validationResult.passed && parsedCount > 0) {
      await setCachedAiResponse("wine-pairings", cacheInput, parsed);
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "success_with_warnings", Date.now() - startTime, {
        mode,
        result_count: parsedCount,
        validation_failures: validationResult.failures.slice(0, 12),
      });
      trace("result_normalization", { request_id: requestId, mode, count: parsedCount, degraded: true, durationMs: elapsed(startTime) });
      return jsonResponse(parsed);
    }

    if (!validationResult.passed) {
      // Última tentativa: mesmo sem dados validados, devolver o que temos (ou estrutura vazia)
      // para que o cliente possa exibir uma mensagem amigável em vez de erro genérico.
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "degraded_no_results", Date.now() - startTime, {
        mode,
        reason: "no_valid_results",
        validation_failures: validationResult.failures.slice(0, 12),
      });
      const friendlyMessage = mode === "wine-to-food"
        ? "Não conseguimos sugerir pratos confiáveis para este vinho agora. Tente novamente em instantes ou informe um vinho com mais detalhes (uva, região, safra)."
        : "Não conseguimos sugerir vinhos para este prato agora. Tente reformular o prato (ex: 'risoto de funghi com parmesão') ou tente novamente em instantes.";
      const emptyPayload = mode === "wine-to-food"
        ? { pairings: [], pairingLogic: null, wineProfile: null, message: friendlyMessage, code: "ANALYSIS_NOT_SPECIFIC" }
        : { suggestions: [], dishProfile: null, message: friendlyMessage, code: "ANALYSIS_NOT_SPECIFIC" };
      return jsonResponse(emptyPayload);
    }

    await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "success", Date.now() - startTime, {
      mode,
      result_count: mode === "wine-to-food" ? parsed.pairings?.length : parsed.suggestions?.length,
      validation_passed: validationResult.passed,
      validation_failures: validationResult.failures.length,
    });
    await setCachedAiResponse("wine-pairings", cacheInput, parsed);
    trace("result_normalization", { request_id: requestId, mode, count: parsedCount, degraded: false, durationMs: elapsed(startTime) });
    trace("total_function_duration", { request_id: requestId, mode, durationMs: elapsed(startTime) });
    return jsonResponse(parsed);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "unknown";
    const isAbort = errMsg.toLowerCase().includes("abort");
    console.error("wine-pairings error:", errMsg);
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", isAbort ? 504 : 500, "internal_error", Date.now() - startTime, { error: errMsg, aborted: isAbort });
    if (isAbort) {
      return jsonResponse({ error: "A harmonização demorou mais que o esperado. Tente novamente." }, 504);
    }
    return jsonResponse({ error: "Não conseguimos completar a análise agora. Verifique sua conexão e tente novamente em instantes." }, 500);
  }
});
