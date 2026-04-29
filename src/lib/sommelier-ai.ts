import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edge-invoke";
import { normalizeWineData } from "@/lib/wine-normalization";
import { normalizeWineListOcrText } from "@/lib/wine-ocr-normalization";

const ANALYSIS_FALLBACK_MESSAGE = "Não conseguimos concluir a leitura agora. Verifique sua conexão e tente novamente em instantes.";
const ANALYZE_WINE_LIST_TIMEOUT_MS = 12_000;
const PAIRING_TIMEOUT_MS = 10_000;

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function logTiming(flow: string, stage: string, startedAt: number, metadata?: Record<string, unknown>) {
  console.info("[sommelier-ai] timing", {
    flow,
    stage,
    durationMs: Math.round(nowMs() - startedAt),
    ...(metadata || {}),
  });
}

// ── Types ──

export interface WineTechnicalProfile {
  wineName: string;
  producer?: string | null;
  country?: string | null;
  region?: string | null;
  vintage?: number | null;
  grapes?: string[];
  wineType?: "tinto" | "branco" | "rosé" | "espumante" | "fortificado";
  body?: "leve" | "médio" | "encorpado";
  acidity?: "baixa" | "média" | "alta";
  tannin?: "baixo" | "médio" | "alto";
  alcohol?: "baixo" | "médio" | "alto";
  complexity?: "baixa" | "média" | "alta";
  style?: string;
  aromaticProfile?: string[];
  serviceMoment?: string;
  culinaryAffinity?: string[];
  pairingLogic?: string[];
  confidence?: "baixa" | "média" | "alta";
  inferenceBasis?: string[];
}

export interface WineProfile {
  body?: string | null;
  acidity?: string | null;
  tannin?: string | null;
  style?: string | null;
  complexity?: string | null;
  summary?: string | null;
}

export interface DishProfile {
  protein?: string | null;
  cooking?: string | null;
  fat?: string | null;
  intensity?: string | null;
}

export interface DishItemProfile {
  intensity?: string | null;
  texture?: string | null;
  highlight?: string | null;
}

export interface Recipe {
  description: string;
  ingredients: string[];
  steps: string[];
  wine_reason: string;
}

export interface PairingResult {
  dish: string;
  reason: string;
  match: "perfeito" | "muito bom" | "bom";
  harmony_type?: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label?: string;
  category?: "classico" | "afinidade" | "contraste";
  dish_profile?: DishItemProfile | null;
  recipe?: Recipe | null;
}

export interface WineSuggestionProfile {
  body?: string | null;
  acidity?: string | null;
  tannin?: string | null;
  style?: string | null;
}

export interface WineSuggestion {
  wineName: string;
  style: string;
  reason: string;
  fromCellar: boolean;
  match: "perfeito" | "muito bom" | "bom";
  harmony_type?: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label?: string;
  grape?: string;
  vintage?: number;
  region?: string;
  country?: string;
  compatibilityLabel?: string;
  wineProfile?: WineSuggestionProfile | null;
}

export interface WineListPairing {
  dish: string;
  why: string;
}

export interface WineListItem {
  name: string;
  producer?: string;
  vintage?: number;
  style?: string;
  grape?: string;
  region?: string;
  price?: number | null;
  rating: number;
  description?: string;
  reasoning?: string | null;
  pairings?: WineListPairing[];
  verdict: string;
  compatibilityLabel: string;
  highlight?: "best-value" | "top-pick" | "adventurous" | "lightest" | "boldest" | "most-complex" | "easiest" | null;
  body?: string | null;
  acidity?: string | null;
  tannin?: string | null;
  occasion?: string | null;
  comparativeLabels?: string[];
}

export interface WineListAnalysis {
  wines: WineListItem[];
  topPick: string | null;
  bestValue: string | null;
  fallback?: boolean;
  fallbackReason?: string | null;
}

export interface WineListAnalysisTextInput {
  text: string;
  mimeType?: string;
  fileName?: string;
}

type WineListTagKind = "primary" | "secondary";

function normalizeWineListTag(label?: string | null): { label: string; kind: WineListTagKind } | null {
  const value = (label || "").trim().toLowerCase();
  if (!value) return null;

  if (/melhor escolha|excelente escolha|combinação perfeita|alta compatibilidade|top[-\s]?pick/.test(value)) {
    return { label: "Melhor escolha", kind: "primary" };
  }
  if (/melhor custo[-\s]?benef[ií]cio|custo[-\s]?benef[ií]cio|best value/.test(value)) {
    return { label: "Melhor custo-benefício", kind: "primary" };
  }
  if (/mais encorpado|encorpado|corpo maior/.test(value)) return { label: "Mais encorpado", kind: "secondary" };
  if (/mais leve|leve/.test(value)) return { label: "Mais leve", kind: "secondary" };
  if (/mais complexo|complexo/.test(value)) return { label: "Mais complexo", kind: "secondary" };
  if (/mais fácil de beber|facil de beber|fácil de beber/.test(value)) return { label: "Mais fácil de beber", kind: "secondary" };
  if (/boa opção|funciona bem|harmonização elegante/.test(value)) return { label: "Boa opção", kind: "secondary" };
  if (/escolha ousada|adventurous|adventure/.test(value)) return { label: "Escolha ousada", kind: "secondary" };
  return { label: label.trim(), kind: "secondary" };
}

function normalizeWineListTags<T extends Pick<WineListItem, "comparativeLabels" | "compatibilityLabel">>(item: T): T {
  const originalComparativeLabels = Array.isArray(item.comparativeLabels) ? item.comparativeLabels.filter((label): label is string => typeof label === "string" && label.trim().length > 0) : [];
  const normalized = [
    item.compatibilityLabel,
    ...originalComparativeLabels,
  ]
    .map(normalizeWineListTag)
    .filter((tag): tag is { label: string; kind: WineListTagKind } => Boolean(tag));

  const seen = new Set<string>();
  const unique = normalized.filter((tag) => {
    const key = tag.label.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const primary = unique.find((tag) => tag.kind === "primary")?.label ?? null;
  const secondary = unique.find((tag) => tag.kind === "secondary" && tag.label !== primary)?.label ?? null;
  const cleaned = [primary, secondary].filter((label): label is string => Boolean(label));

  return {
    ...item,
    compatibilityLabel: primary ?? item.compatibilityLabel,
    comparativeLabels: cleaned.length > 0 ? cleaned : originalComparativeLabels,
  };
}

export interface MenuDishItem {
  name: string;
  price?: number | null;
  match: "perfeito" | "muito bom" | "bom";
  reason: string;
  highlight?: "top-pick" | "best-value" | null;
  compatibilityLabel?: string | null;
  harmony_type?: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label?: string | null;
  dish_profile?: DishItemProfile | null;
  recipe?: Recipe | null;
}

export interface MenuAnalysis {
  dishes: MenuDishItem[];
  summary: string;
  wineProfile?: WineProfile | null;
  fallback?: boolean;
  fallbackReason?: string | null;
}

export interface TasteCompatibility {
  compatibility: number | null;
  label: string;
  reason: string;
  fallback?: boolean;
}

export interface WineInsight {
  insight: string;
  recommendation: string;
}

export interface WinePairingAnalysisBlock {
  fat: string;
  acidity: string;
  texture: string;
  flavor_profile: string;
  cooking_method: string;
}

export interface WinePairingSuggestionBlock {
  wine: string;
  style: string;
  why_it_works: string;
  structure_match: {
    acidity: string;
    tannin: string;
    body: string;
  };
  extra_tip: string;
}

export interface GeneratedWinePairing {
  analysis: WinePairingAnalysisBlock;
  pairings: WinePairingSuggestionBlock[];
  fallback?: boolean;
  note?: string;
}

export type WinePairingInput =
  | string
  | {
      userInputDish?: string | null;
      extractedDishFromImage?: string | null;
      ocrText?: string | null;
      dish?: string | null;
      text?: string | null;
      imageText?: string | null;
      wineName?: string | null;
      wineStyle?: string | null;
      wineGrape?: string | null;
      wineRegion?: string | null;
      wineProducer?: string | null;
      wineVintage?: number | string | null;
      wineCountry?: string | null;
      cellarWines?: WineSummary[] | null;
      intent?: PairingIntent;
    };

// ── Error Classification ──

export type AiErrorType = "network" | "timeout" | "auth" | "invalid_file" | "ai_fail" | "empty" | "unknown";

export interface ClassifiedError {
  type: AiErrorType;
  message: string;
  usedFallback?: boolean;
  code?: string;
  status?: number;
  requestId?: string;
  retryable?: boolean;
}

function classifyError(err: unknown): ClassifiedError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  const code = err instanceof EdgeFunctionError ? err.code : undefined;
  const status = err instanceof EdgeFunctionError ? err.status : undefined;
  const requestId = err instanceof EdgeFunctionError ? err.requestId : undefined;
  const retryable = err instanceof EdgeFunctionError ? err.retryable : undefined;

  if (status === 401 || code === "AUTH_REQUIRED" || code === "AUTH_INVALID") {
    return { type: "auth", message: "Sua sessão expirou. Faça login novamente.", code: code ?? "AUTH_INVALID", status, requestId, retryable };
  }
  if (status === 408 || code === "AI_TIMEOUT" || lower.includes("tempo limite") || lower.includes("timeout") || lower.includes("demorou mais") || lower.includes("tempo de resposta excedido") || lower.includes("signal is aborted") || lower.includes("abort")) {
    return { type: "timeout", message: "Tempo excedido. Tente novamente em instantes.", code: code ?? "AI_TIMEOUT", status, requestId, retryable };
  }
  if (code === "INVALID_FILE_TYPE" || code === "FILE_INVALID" || lower.includes("tipo de arquivo inválido")) {
    return { type: "invalid_file", message: "Tipo de arquivo inválido. Envie uma imagem ou PDF compatível.", code: code ?? "INVALID_FILE_TYPE", status, requestId, retryable };
  }
  if (code === "FILE_TOO_LARGE" || code === "IMAGE_TOO_LARGE" || lower.includes("arquivo muito grande") || lower.includes("imagem está muito grande")) {
    return { type: "invalid_file", message: code === "IMAGE_TOO_LARGE" ? "A imagem está muito grande. Tente uma foto mais leve." : "Arquivo inválido. Envie uma imagem ou PDF legível.", code: code ?? "FILE_TOO_LARGE", status, requestId, retryable };
  }
  if (code === "EMPTY_EXTRACTION") {
    return { type: "empty", message: "PDF não contém texto legível. Tente outro arquivo ou uma imagem da carta.", code, status, requestId, retryable };
  }
  if (code === "OCR_FAILED" || code === "PDF_PARSE_FAILED") {
    return { type: "ai_fail", message: "Não foi possível ler o PDF. Tente um arquivo mais nítido ou uma imagem da carta.", code, status, requestId, retryable };
  }
  if (code === "AI_PARSE_ERROR" || code === "ANALYSIS_NOT_SPECIFIC") {
    return { type: "ai_fail", message: "A resposta da IA veio em um formato inválido. Tente novamente em instantes.", code, status, requestId, retryable };
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("sem conexão") ||
    lower.includes("failed to send")
  ) {
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return {
      type: "network",
      message: offline
        ? "Sem conexão com servidor. Verifique sua internet."
        : "Sem conexão com servidor. Tente novamente em instantes.",
      code,
      status,
      requestId,
      retryable,
    };
  }
  if (lower.includes("failed to send")) {
    return { type: "ai_fail", message: "A solicitação não pôde ser enviada. Tente novamente.", code, status, requestId, retryable };
  }
  if (lower.includes("invalid_ai_response") || lower.includes("empty_ai_response")) {
    return { type: "ai_fail", message: ANALYSIS_FALLBACK_MESSAGE, code, status, requestId, retryable };
  }
  if (lower.includes("créditos") || lower.includes("esgotados") || lower.includes("ai gateway error") || lower.includes("não conseguimos")) {
    return { type: "ai_fail", message: ANALYSIS_FALLBACK_MESSAGE, code, status, requestId, retryable };
  }
  return { type: "unknown", message: ANALYSIS_FALLBACK_MESSAGE, code, status, requestId, retryable };
}

function createClassifiedError(classified: ClassifiedError, fallbackCode = "AI_UNAVAILABLE") {
  const error = new Error(classified.message) as Error & {
    code?: string;
    status?: number;
    requestId?: string;
    retryable?: boolean;
  };
  error.code = classified.code ?? fallbackCode;
  error.status = classified.status;
  error.requestId = classified.requestId;
  error.retryable = classified.retryable;
  return error;
}

const GENERIC_RESPONSE_PHRASES = [
  "combina bem",
  "harmoniza bem",
  "boa opção",
  "bom para acompanhar",
  "bom vinho para o dia a dia",
  "complementa os sabores",
  "acidez do vinho combina",
  "ideal para",
  "ideal com",
  "para carnes vermelhas",
  "para pratos leves",
  "carne vermelha",
  "frutas frescas",
  "frutas vermelhas",
  "frutas escuras",
  "paladar",
  "equilibrado",
  "versátil",
  "clássico",
  "vinho branco seco",
  "espumante brut",
  "dia a dia",
];

function hasGenericWineLanguage(text?: string | null) {
  if (!text) return false;
  const normalized = text.toLowerCase();
  if (normalized.length < 30) return true;
  return GENERIC_RESPONSE_PHRASES.some((phrase) => normalized.includes(phrase));
}

const TECHNICAL_TERMS = [
  /acidez/i,
  /tanin/i,
  /corpo/i,
  /estrutura/i,
  /intensidad/i,
  /textur/i,
  /gordur/i,
  /prote[ií]na/i,
  /molho/i,
  /umami/i,
  /frescor/i,
  /paladar/i,
];

const COMPARATIVE_TERMS = [
  /compar/i,
  /\bcarta\b/i,
  /\boutros\b/i,
  /\bentre\b/i,
  /\bmelhor\b/i,
  /\bmenos\b/i,
  /\bmais\b/i,
  /\bdentro da carta\b/i,
];

function hasTechnicalWineLanguage(text?: string | null) {
  if (!text) return false;
  return TECHNICAL_TERMS.some((pattern) => pattern.test(text));
}

function hasComparativeWineLanguage(text?: string | null) {
  if (!text) return false;
  return COMPARATIVE_TERMS.some((pattern) => pattern.test(text));
}

interface WineSpecificityContext {
  wineName?: string;
  producer?: string | null;
  region?: string | null;
  country?: string | null;
  style?: string | null;
  vintage?: number | null;
  grape?: string | null;
  dish?: string | null;
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

function collectSpecificAnchors(context?: WineSpecificityContext) {
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

function hasSpecificLabelContext(texts: string[], context?: WineSpecificityContext) {
  const combined = texts.filter(Boolean).join(" ");
  if (!combined.trim()) return false;

  const { strong, weak } = collectSpecificAnchors(context);
  if (strong.length > 0) {
    return countAnchorHits(combined, strong) >= 1;
  }

  return countAnchorHits(combined, weak) >= 1;
}

function hasDishContext(text: string, dish?: string | null) {
  if (!dish) return true;
  const dishTokens = normalizeForMatch(dish).split(" ").filter((t) => t.length > 3);
  const normalizedText = normalizeForMatch(text);
  if (dishTokens.length === 0) {
    return normalizedText.includes("prato") || normalizedText.includes("receita");
  }
  return dishTokens.some((token) => normalizedText.includes(token));
}

function isUserFacingAnalysisError(message: string) {
  if (!message) return false;
  if (message.startsWith(ANALYSIS_FALLBACK_MESSAGE)) return true;
  // Mensagens consultivas vindas do backend (degradação elegante).
  return /Não conseguimos sugerir (pratos|vinhos)/i.test(message)
    || /Tente reformular o prato/i.test(message)
    || /informe um vinho com mais detalhes/i.test(message);
}

function isValidLenientMenu(data: any, wineName: string): boolean {
  const dishes = Array.isArray(data?.dishes) ? data.dishes : [];
  if (dishes.length < 1) return false;
  return dishes.every((item: any) =>
    typeof item?.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item?.reason === "string" &&
    item.reason.trim().length >= 35 &&
    !hasGenericWineLanguage(item.reason) &&
    hasTechnicalWineLanguage(item.reason) &&
    hasSpecificLabelContext([item.reason, data?.summary], { wineName }),
  );
}

function isValidLenientWineList(data: any): boolean {
  const wines = Array.isArray(data?.wines) ? data.wines : [];
  if (wines.length < 1) return false;
  return wines.every((item: any) => {
    const itemContext = {
      wineName: item.name,
      producer: item.producer ?? null,
      region: item.region ?? null,
      country: item.country ?? null,
      style: item.style ?? null,
      vintage: item.vintage ?? null,
      grape: item.grape ?? null,
    };

    const reasoning = typeof item?.reasoning === "string" ? item.reasoning.trim() : "";
    const description = typeof item?.description === "string" ? item.description.trim() : "";
    const hasCoreText = (reasoning.length >= 60 || description.length >= 60) &&
      hasTechnicalWineLanguage(reasoning || description) &&
      !hasGenericWineLanguage(reasoning || description) &&
      hasSpecificLabelContext([reasoning, description, item?.verdict], itemContext);

    const pairings = Array.isArray(item?.pairings) ? item.pairings : [];
    const pairingsOk = pairings.length >= 1 && pairings.every((pairing: any) =>
      typeof pairing?.dish === "string" &&
      typeof pairing?.why === "string" &&
      pairing.dish.trim().length > 0 &&
      pairing.why.trim().length >= 20 &&
      hasTechnicalWineLanguage(pairing.why) &&
      !hasGenericWineLanguage(pairing.why) &&
      hasSpecificLabelContext([pairing.why, pairing.dish], itemContext)
    );

    const compatOk = typeof item?.compatibilityLabel === "string" &&
      ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"].includes(item.compatibilityLabel);

    const labelsOk = Array.isArray(item?.comparativeLabels) && item.comparativeLabels.length >= 1;

    return (
      typeof item?.name === "string" &&
      item.name.trim().length > 0 &&
      hasCoreText &&
      pairingsOk &&
      compatOk &&
      labelsOk
    );
  });
}

function validateWineSpecificity(
  data: any,
  kind: "pairings" | "suggestions" | "wineList" | "menu" | "insight",
  context?: WineSpecificityContext | string,
  extraContext?: WineSpecificityContext,
): boolean {
  const resolvedContext: WineSpecificityContext | undefined =
    extraContext ?? (typeof context === "object" ? context : context ? { wineName: context } : undefined);
  if (!data || typeof data !== "object") return false;

  if (kind === "pairings") {
    const pairings = Array.isArray(data.pairings) ? data.pairings : [];
    if (pairings.length < 1) return false;
    return pairings.every((item: any) =>
      typeof item?.dish === "string" &&
      typeof item?.reason === "string" &&
      typeof item?.match === "string" &&
      item.dish.trim().length > 0 &&
      item.reason.trim().length >= 55 &&
      !hasGenericWineLanguage(item.reason) &&
      hasTechnicalWineLanguage(item.reason) &&
      !hasGenericWineLanguage(item.harmony_label) &&
      hasSpecificLabelContext([item.reason, item.harmony_label, item?.dish], resolvedContext),
    );
  }

  if (kind === "suggestions") {
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    if (suggestions.length < 1) return false;
    return suggestions.every((item: any) =>
      typeof item?.wineName === "string" &&
      typeof item?.reason === "string" &&
      item.wineName.trim().length > 0 &&
      item.reason.trim().length >= 55 &&
      !hasGenericWineLanguage(item.reason) &&
      hasTechnicalWineLanguage(item.reason) &&
      !hasGenericWineLanguage(item.harmony_label) &&
      hasDishContext(item.reason, resolvedContext?.dish ?? null) &&
      hasSpecificLabelContext(
        [item.reason, item.harmony_label, item?.wineName],
        {
          wineName: item?.wineName,
          producer: null,
          region: item?.region ?? null,
          country: item?.country ?? null,
          style: item?.style ?? null,
          vintage: item?.vintage ?? null,
          grape: item?.grape ?? null,
        },
      ),
    );
  }

  if (kind === "wineList") {
    const wines = Array.isArray(data.wines) ? data.wines : [];
    if (wines.length === 0) return false;
    return wines.every((item: any) => {
      const itemContext = {
        wineName: item.name,
        producer: item.producer ?? null,
        region: item.region ?? null,
        country: item.country ?? null,
        style: item.style ?? null,
        vintage: item.vintage ?? null,
        grape: item.grape ?? null,
      };

      return (
        typeof item?.name === "string" &&
        item.name.trim().length > 0 &&
        typeof item?.verdict === "string" &&
        typeof item?.compatibilityLabel === "string" &&
        typeof item?.reasoning === "string" &&
        item.reasoning.trim().length >= 80 &&
        hasComparativeWineLanguage(item.reasoning) &&
        hasTechnicalWineLanguage(item.reasoning) &&
        hasSpecificLabelContext(
          [item.reasoning, item.verdict, item.description],
          itemContext,
        ) &&
        !hasGenericWineLanguage(item.verdict) &&
        item.verdict.trim().length >= 30 &&
        Array.isArray(item.pairings) &&
        item.pairings.length >= 1 &&
        item.pairings.every((pairing: any) =>
          typeof pairing?.dish === "string" &&
          typeof pairing?.why === "string" &&
          pairing.dish.trim().length > 0 &&
          pairing.why.trim().length >= 25 &&
          hasTechnicalWineLanguage(pairing.why) &&
          hasSpecificLabelContext([pairing.why, pairing.dish], itemContext) &&
          !hasGenericWineLanguage(pairing.why)
        ) &&
        Array.isArray(item.comparativeLabels) &&
        item.comparativeLabels.length >= 1
      );
    });
  }

  if (kind === "menu") {
    const dishes = Array.isArray(data.dishes) ? data.dishes : [];
    if (dishes.length < 1) return false;
    return dishes.every((item: any) =>
      typeof item?.name === "string" &&
      item.name.trim().length > 0 &&
      typeof item?.reason === "string" &&
      item.reason.trim().length >= 55 &&
      !hasGenericWineLanguage(item.reason) &&
      hasTechnicalWineLanguage(item.reason) &&
      hasSpecificLabelContext([item.reason, data.summary], resolvedContext),
    );
  }

  if (kind === "insight") {
    return (
      typeof data.insight === "string" &&
      data.insight.trim().length >= 20 &&
      !hasGenericWineLanguage(data.insight) &&
      typeof data.recommendation === "string" &&
      data.recommendation.trim().length >= 20 &&
      !hasGenericWineLanguage(data.recommendation)
    );
  }

  return false;
}

// ── Local Fallback Rules ──

interface WineSummary {
  name: string;
  style?: string | null;
  grape?: string | null;
  country?: string | null;
  region?: string | null;
  producer?: string | null;
  quantity?: number;
  vintage?: number | null;
  purchase_price?: number | null;
  current_value?: number | null;
}

export type PairingIntent = "everyday" | "value" | "special";

const PAIRING_RULES: { keywords: string[]; styles: string[]; explanation: string }[] = [
  { keywords: ["carne", "churrasco", "picanha", "costela", "bife", "cordeiro", "assado", "hambúrguer", "burger"], styles: ["tinto"], explanation: "Taninos estruturados equilibram a gordura e a proteína de carnes vermelhas" },
  { keywords: ["peixe", "salmão", "atum", "bacalhau", "camarão", "frutos do mar", "marisco", "lula", "lagosta", "polvo"], styles: ["branco", "espumante", "rosé"], explanation: "A acidez mineral de brancos realça a delicadeza de peixes e frutos do mar" },
  { keywords: ["massa", "pasta", "risoto", "lasanha", "nhoque", "macarrão", "espaguete"], styles: ["tinto", "branco"], explanation: "Massas e risotos pedem vinhos com corpo médio que acompanhem o molho" },
  { keywords: ["pizza"], styles: ["tinto", "rosé"], explanation: "Pizzas pedem tintos jovens e frutados ou rosés refrescantes" },
  { keywords: ["salada", "legume", "vegetal", "vegetariano", "verdura"], styles: ["branco", "rosé", "espumante"], explanation: "Vegetais e saladas combinam com vinhos de acidez viva e corpo leve" },
  { keywords: ["queijo", "fondue", "tábua"], styles: ["tinto", "branco", "espumante"], explanation: "Queijos harmonizam com tintos maduros ou espumantes pela gordura e sal" },
  { keywords: ["sobremesa", "chocolate", "doce", "torta", "bolo", "pudim", "brigadeiro"], styles: ["sobremesa", "tinto"], explanation: "A doçura residual do vinho equilibra sobremesas" },
  { keywords: ["frango", "ave", "peru", "pato"], styles: ["branco", "rosé", "tinto"], explanation: "Aves são versáteis e aceitam brancos encorpados ou tintos leves" },
  { keywords: ["sushi", "japonesa", "oriental", "tailandesa"], styles: ["branco", "espumante", "rosé"], explanation: "Culinária oriental combina com brancos minerais e espumantes secos" },
  { keywords: ["ovo", "omelete", "fritada", "torta de ovo"], styles: ["branco", "rosé", "espumante"], explanation: "A textura cremosa do ovo pede vinhos com boa acidez que limpem o paladar" },
  { keywords: ["arroz", "paella", "pilaf", "biryani"], styles: ["branco", "rosé", "tinto"], explanation: "Arroz é neutro e versátil — o vinho deve complementar o acompanhamento" },
  { keywords: ["feijoada", "feijão", "bean"], styles: ["tinto"], explanation: "Pratos com feijão pedem tintos com corpo e acidez para equilibrar a densidade" },
  { keywords: ["porco", "leitão", "lombo", "pernil", "bacon", "linguiça", "salsicha"], styles: ["tinto", "branco", "rosé"], explanation: "A gordura suculenta do porco harmoniza com tintos médios ou brancos encorpados" },
  { keywords: ["curry", "picante", "apimentado", "pimenta"], styles: ["branco", "rosé", "espumante"], explanation: "Pratos picantes pedem vinhos com açúcar residual ou baixo álcool para não amplificar a ardência" },
  { keywords: ["sopa", "caldo", "creme"], styles: ["branco", "espumante"], explanation: "Sopas cremosas pedem brancos com textura que espelhem a untuosidade" },
  { keywords: ["empadão", "empanada", "torta salgada", "quiche"], styles: ["branco", "rosé", "tinto"], explanation: "Tortas salgadas combinam com vinhos de acidez moderada que equilibrem a massa amanteigada" },
  { keywords: ["strogonoff", "stroganoff"], styles: ["tinto", "branco"], explanation: "O molho cremoso do strogonoff pede tintos de acidez alta ou brancos encorpados" },
  { keywords: ["moqueca", "bobó", "acarajé", "baiana"], styles: ["branco", "rosé"], explanation: "Pratos com leite de coco pedem brancos aromáticos que complementem a tropicalidade" },
];

function analyzeDish(dish: string): { intensity: string; fat: string; protein: string; cooking: string; flavors: string[] } {
  const lower = dish.toLowerCase();
  const result = { intensity: "média", fat: "moderada", protein: "", cooking: "", flavors: [] as string[] };
  
  if (lower.match(/grelhad|brasa|churras|assad|frit[oa]/)) { result.cooking = "grelhado/assado"; result.intensity = "alta"; }
  else if (lower.match(/cozid|vapor|refogad/)) { result.cooking = "cozido"; result.intensity = "média"; }
  else if (lower.match(/cru|tartare|ceviche/)) { result.cooking = "cru"; result.intensity = "leve"; }
  
  if (lower.match(/carne|picanha|costela|bife|cordeiro/)) { result.protein = "vermelha"; result.fat = "alta"; }
  else if (lower.match(/frango|ave|peru/)) { result.protein = "branca"; result.fat = "moderada"; }
  else if (lower.match(/peixe|salmão|atum|camarão/)) { result.protein = "peixe"; result.fat = "leve"; }
  else if (lower.match(/ovo|omelete/)) { result.protein = "ovo"; result.fat = "moderada"; result.flavors.push("cremosidade"); }
  else if (lower.match(/queijo|fondue/)) { result.protein = "laticínio"; result.fat = "alta"; }
  
  if (lower.match(/arroz/)) result.flavors.push("neutralidade do arroz");
  if (lower.match(/molho|creme/)) result.flavors.push("untuosidade do molho");
  if (lower.match(/erva|tempero|alho|cebola/)) result.flavors.push("aromaticidade");
  if (lower.match(/limão|cítric|vinagre/)) result.flavors.push("acidez cítrica");
  if (lower.match(/tomate/)) result.flavors.push("acidez do tomate");
  
  return result;
}

function buildCellarReason(w: WineSummary, dish: string, harmonyType: string): string {
  const analysis = analyzeDish(dish);
  const style = (w.style || "").toLowerCase();
  const grape = w.grape || "";
  const region = w.region || "";
  const producer = w.producer || "";
  const parts: string[] = [];

  // Always start with the wine's name for specificity
  const contextParts: string[] = [];
  if (producer) contextParts.push(`produzido por ${producer}`);
  if (grape && region) contextParts.push(`um ${style || "vinho"} de ${grape} da região de ${region}`);
  else if (grape) contextParts.push(`de ${grape}`);
  else if (region) contextParts.push(`da região de ${region}`);
  
  const intro = contextParts.length > 0
    ? `${w.name}, ${contextParts.join(", ")},`
    : `${w.name}`;

  if (harmonyType === "contraste") {
    if (analysis.fat === "alta" || analysis.fat === "moderada") {
      parts.push(`${intro} tende a ter acidez que funciona em contraste com a ${analysis.fat === "alta" ? "gordura pronunciada" : "textura untuosa"} de "${dish}", limpando o paladar entre cada garfada.`);
    } else {
      parts.push(`${intro} cria um contraste de texturas com a leveza de "${dish}", adicionando camadas de complexidade.`);
    }
  } else if (harmonyType === "semelhança") {
    if (style === "branco" && analysis.intensity === "leve") {
      parts.push(`A delicadeza de ${intro} espelha a leveza de "${dish}" — ambos se encontram na mesma faixa de intensidade.`);
    } else {
      parts.push(`O peso e a intensidade de ${intro} espelham a robustez de "${dish}", criando uma experiência onde nenhum elemento domina.`);
    }
  } else if (harmonyType === "complemento") {
    if (analysis.flavors.length > 0) {
      parts.push(`Os aromas de ${intro} complementam ${analysis.flavors[0]} de "${dish}", criando uma experiência mais integrada.`);
    } else {
      parts.push(`As notas aromáticas de ${intro} adicionam dimensão extra aos sabores de "${dish}".`);
    }
  } else if (harmonyType === "equilíbrio") {
    parts.push(`${intro} mantém proporção equilibrada entre seu corpo e a intensidade de "${dish}".`);
  } else {
    parts.push(`A acidez natural de ${intro} reseta o paladar entre cada mordida de "${dish}", renovando a percepção dos sabores.`);
  }

  if (w.vintage) {
    const age = new Date().getFullYear() - w.vintage;
    if (age > 5) parts.push(`Com ${age} anos de evolução, ${w.name} apresenta taninos mais integrados e suaves.`);
    else if (age <= 2) parts.push(`Sendo um vinho jovem, ${w.name} preserva frescor e vivacidade que complementam o prato.`);
  }

  return parts.join(" ");
}

function buildFallbackDishSuggestionStyle(dish: string): { style: string; explanation: string }[] {
  const lower = normalizeForMatch(dish);
  const rule = PAIRING_RULES.find((candidate) => candidate.keywords.some((keyword) => lower.includes(normalizeForMatch(keyword))));
  const styles = rule?.styles || ["tinto", "branco", "rosé", "espumante", "fortificado"];
  return styles.slice(0, 5).map((style) => ({
    style,
    explanation: rule?.explanation || "A leitura foi simplificada, então priorizamos equilíbrio entre corpo, acidez e intensidade do prato.",
  }));
}

function fallbackPairingsForDish(dish: string, cellarWines?: WineSummary[]): WineSuggestion[] {
  const safeDish = dish?.trim() || "desconhecido";
  const normalized = normalizeForMatch(safeDish);
  const matchedRule = PAIRING_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(normalizeForMatch(keyword))));
  const styleHints = buildFallbackDishSuggestionStyle(safeDish);
  const cellarCandidates = (cellarWines || [])
    .filter((wine) => wine?.name?.trim())
    .slice(0, 5);

  const cellarSuggestions = cellarCandidates.map((wine, index) => {
    const hint = styleHints[index % styleHints.length] || styleHints[0] || { style: wine.style || "tinto", explanation: matchedRule?.explanation || "Harmonização simplificada baseada no prato informado." };
    const style = wine.style || hint.style;
    return {
      wineName: wine.name,
      style,
      reason: `${wine.name} é uma alternativa segura para "${safeDish}". ${hint.explanation} O corpo e a acidez ajudam a manter o prato em equilíbrio.`,
      fromCellar: true,
      match: "bom" as const,
      harmony_type: matchedRule?.styles?.includes(style) ? "equilíbrio" : "contraste",
      harmony_label: matchedRule ? matchedRule.explanation : "harmonia simplificada",
      grape: wine.grape || undefined,
      vintage: wine.vintage || undefined,
      region: wine.region || undefined,
      country: wine.country || undefined,
      compatibilityLabel: "Sugestão revisável",
      wineProfile: null,
    };
  });

  const genericSuggestions = styleHints.map((hint, index) => ({
    wineName: `Sugestão padrão ${index + 1}`,
    style: hint.style,
    reason: `Baseado em "${safeDish}", a opção ${hint.style} preserva a leitura estrutural do prato. ${hint.explanation} Se quiser precisão maior, ajuste a escolha manualmente.`,
    fromCellar: false,
    match: index === 0 ? ("perfeito" as const) : index < 3 ? ("muito bom" as const) : ("bom" as const),
    harmony_type: "equilíbrio" as const,
    harmony_label: "análise simplificada",
    compatibilityLabel: "Sugestão padrão",
    wineProfile: null,
  }));

  return dedupeSuggestions([...cellarSuggestions, ...genericSuggestions]).slice(0, 5);
}

function createFallbackPairing(
  dish: string,
  reason: string,
  match: PairingResult["match"],
  harmony_type: NonNullable<PairingResult["harmony_type"]>,
  harmony_label: string,
): PairingResult {
  return {
    dish,
    reason,
    match,
    harmony_type,
    harmony_label,
    category: "classico",
  };
}

function dedupePairings(pairings: PairingResult[]) {
  const seen = new Set<string>();
  return pairings.filter((pairing) => {
    const key = normalizeForMatch(pairing.dish);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeSuggestions(suggestions: WineSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = normalizeForMatch(`${suggestion.wineName}|${suggestion.style}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeWinePairingInput(input: WinePairingInput): string {
  if (typeof input === "string") {
    return input.trim() || "prato não especificado";
  }

  const rawDish =
    input?.userInputDish ||
    input?.extractedDishFromImage ||
    input?.ocrText ||
    input?.dish ||
    input?.text ||
    input?.imageText ||
    "";

  const dishText = String(rawDish).trim();
  if (dishText) return dishText;

  const wineDescriptor = [
    input?.wineName ? `Vinho: ${input.wineName}` : null,
    input?.wineStyle ? `Estilo: ${input.wineStyle}` : null,
    input?.wineGrape ? `Uva: ${input.wineGrape}` : null,
    input?.wineRegion ? `Região: ${input.wineRegion}` : null,
    input?.wineProducer ? `Produtor: ${input.wineProducer}` : null,
    input?.wineVintage ? `Safra: ${input.wineVintage}` : null,
    input?.wineCountry ? `País: ${input.wineCountry}` : null,
  ]
    .filter(Boolean)
    .join(" | ")
    .trim();

  return wineDescriptor || "prato não especificado";
}

function safeParse<T>(response: string): T | null {
  try {
    return JSON.parse(response) as T;
  } catch {
    return null;
  }
}

function dishStructureFromAnalysis(dish: string): WinePairingAnalysisBlock {
  const analysis = analyzeDish(dish);
  const fat = analysis.fat === "alta" ? "alta" : analysis.fat === "moderada" ? "média" : "baixa";
  const acidity =
    analysis.flavors.some((flavor) => /limão|cítric|vinagre|tomate/i.test(flavor))
      ? "alta"
      : analysis.flavors.some((flavor) => /creme|molho|manteiga/i.test(flavor))
        ? "média"
        : "média";

  return {
    fat,
    acidity,
    texture: analysis.intensity === "leve" ? "delicada" : analysis.intensity === "forte" ? "estruturada" : "equilibrada",
    flavor_profile: analysis.flavors.length > 0 ? analysis.flavors.join(", ") : "perfil equilibrado e pouco específico",
    cooking_method: analysis.cooking || "não identificado",
  };
}

function pairingStructureForStyle(style?: string | null, dish?: string | null) {
  const normalizedStyle = normalizeForMatch(style);
  const normalizedDish = normalizeForMatch(dish);
  const hasFattyDish = /gordura|creme|queijo|manteiga|costela|picanha|cordeiro|salmão/i.test(normalizedDish);
  const hasDelicateDish = /salada|sushi|peixe|camar[aã]o|frango|frutos do mar|legumes/i.test(normalizedDish);

  if (/\btinto|red|malbec|cabernet|syrah|merlot|tempranillo|nebbiolo|sangiovese|pinot noir\b/i.test(normalizedStyle)) {
    return {
      acidity: hasFattyDish ? "média a alta" : "média",
      tannin: "médio a alto",
      body: hasFattyDish ? "médio a encorpado" : "médio",
    };
  }

  if (/\bbranco|white|chardonnay|sauvignon|riesling|alvarinho|verdejo|pinot gris|moscato\b/i.test(normalizedStyle)) {
    return {
      acidity: "alta",
      tannin: "baixo",
      body: hasDelicateDish ? "leve a médio" : "médio",
    };
  }

  if (/\bros[eé]|rose\b/i.test(normalizedStyle)) {
    return {
      acidity: "média a alta",
      tannin: "baixo",
      body: "leve a médio",
    };
  }

  if (/\bespumante|sparkling|champagne|prosecco|cava|brut\b/i.test(normalizedStyle)) {
    return {
      acidity: "alta",
      tannin: "baixo",
      body: "leve",
    };
  }

  if (/\bfortificado|porto|madeira|xerez|sherry\b/i.test(normalizedStyle)) {
    return {
      acidity: "média",
      tannin: "baixo",
      body: "encorpado",
    };
  }

  return {
    acidity: hasFattyDish ? "média" : "média a alta",
    tannin: "médio",
    body: hasDelicateDish ? "leve a médio" : "médio",
  };
}

function buildGeneratedPairingsFromSuggestions(
  dish: string,
  suggestions: WineSuggestion[],
  fallback = false,
): GeneratedWinePairing {
  const analysis = dishStructureFromAnalysis(dish);
  const normalizedSuggestions = dedupeSuggestions(suggestions)
    .map((suggestion) => ({
      wine: suggestion.wineName,
      style: suggestion.style,
      why_it_works: suggestion.reason,
      structure_match: pairingStructureForStyle(suggestion.style, dish),
      extra_tip: suggestion.compatibilityLabel || suggestion.harmony_label || "Você pode ajustar manualmente",
    }))
    .filter((item) => item.wine.trim().length > 0);

  const fallbackSuggestions = fallbackPairingsForDish(dish).map((suggestion) => ({
    wine: suggestion.wineName,
    style: suggestion.style,
    why_it_works: suggestion.reason,
    structure_match: pairingStructureForStyle(suggestion.style, dish),
    extra_tip: suggestion.compatibilityLabel || suggestion.harmony_label || "Você pode ajustar manualmente",
  }));

  const merged: WinePairingSuggestionBlock[] = [];
  const seen = new Set<string>();
  const pushSuggestion = (item: WinePairingSuggestionBlock) => {
    const key = normalizeForMatch(`${item.wine}|${item.style}`);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  };

  normalizedSuggestions.forEach(pushSuggestion);
  fallbackSuggestions.forEach(pushSuggestion);

  while (merged.length < 5) {
    const index = merged.length;
    const style = ["tinto", "branco", "rosé", "espumante", "fortificado"][index % 5];
    pushSuggestion({
      wine: `Sugestão padrão ${index + 1}`,
      style,
      why_it_works: `Baseado em "${dish}", esta opção preserva o equilíbrio entre corpo, acidez e intensidade do prato.`,
      structure_match: pairingStructureForStyle(style, dish),
      extra_tip: "Você pode ajustar manualmente",
    });
  }

  return {
    analysis,
    pairings: merged.slice(0, 5),
    fallback: fallback || normalizedSuggestions.length === 0,
    note: fallback || normalizedSuggestions.length === 0 ? "análise simplificada" : undefined,
  };
}

function fallbackPairing(dish: string): GeneratedWinePairing {
  return {
    analysis: {
      fat: "médio",
      acidity: "média",
      texture: "equilibrada",
      flavor_profile: "genérico",
      cooking_method: "não identificado",
    },
    pairings: fallbackPairingsForDish(dish)
      .slice(0, 5)
      .map((suggestion) => ({
        wine: suggestion.wineName,
        style: suggestion.style,
        why_it_works: suggestion.reason,
        structure_match: pairingStructureForStyle(suggestion.style, dish),
        extra_tip: suggestion.compatibilityLabel || suggestion.harmony_label || "Você pode ajustar manualmente",
      })),
    fallback: true,
    note: "análise simplificada",
  };
}

function normalizeGeneratedPairingResponse(data: unknown, dish: string): GeneratedWinePairing {
  if (!data || typeof data !== "object") {
    return fallbackPairing(dish);
  }

  const payload = data as Record<string, unknown>;
  const fallback = fallbackPairing(dish);
  const fallbackAnalysis = fallback.analysis;
  const analysis = payload.analysis && typeof payload.analysis === "object"
    ? {
        fat: typeof (payload.analysis as Record<string, unknown>).fat === "string" && String((payload.analysis as Record<string, unknown>).fat).trim().length > 0
          ? String((payload.analysis as Record<string, unknown>).fat)
          : fallbackAnalysis.fat,
        acidity: typeof (payload.analysis as Record<string, unknown>).acidity === "string" && String((payload.analysis as Record<string, unknown>).acidity).trim().length > 0
          ? String((payload.analysis as Record<string, unknown>).acidity)
          : fallbackAnalysis.acidity,
        texture: typeof (payload.analysis as Record<string, unknown>).texture === "string" && String((payload.analysis as Record<string, unknown>).texture).trim().length > 0
          ? String((payload.analysis as Record<string, unknown>).texture)
          : fallbackAnalysis.texture,
        flavor_profile: typeof (payload.analysis as Record<string, unknown>).flavor_profile === "string" && String((payload.analysis as Record<string, unknown>).flavor_profile).trim().length > 0
          ? String((payload.analysis as Record<string, unknown>).flavor_profile)
          : fallbackAnalysis.flavor_profile,
        cooking_method: typeof (payload.analysis as Record<string, unknown>).cooking_method === "string" && String((payload.analysis as Record<string, unknown>).cooking_method).trim().length > 0
          ? String((payload.analysis as Record<string, unknown>).cooking_method)
          : fallbackAnalysis.cooking_method,
      }
    : fallbackAnalysis;

  const strictPairings = Array.isArray(payload.pairings)
    ? payload.pairings
        .filter((pairing): pairing is Record<string, unknown> => Boolean(pairing) && typeof pairing === "object")
        .map((pairing) => ({
          wine: typeof pairing.wine === "string" && pairing.wine.trim().length > 0 ? pairing.wine.trim() : "",
          style: typeof pairing.style === "string" && pairing.style.trim().length > 0 ? pairing.style.trim() : "Médio corpo",
          why_it_works: typeof pairing.why_it_works === "string" && pairing.why_it_works.trim().length > 0
            ? pairing.why_it_works.trim()
            : "Sugestão simplificada com base no equilíbrio do prato.",
          structure_match: {
            acidity: typeof pairing.structure_match === "object" && pairing.structure_match !== null && typeof (pairing.structure_match as Record<string, unknown>).acidity === "string" && String((pairing.structure_match as Record<string, unknown>).acidity).trim().length > 0
              ? String((pairing.structure_match as Record<string, unknown>).acidity)
              : "média",
            tannin: typeof pairing.structure_match === "object" && pairing.structure_match !== null && typeof (pairing.structure_match as Record<string, unknown>).tannin === "string" && String((pairing.structure_match as Record<string, unknown>).tannin).trim().length > 0
              ? String((pairing.structure_match as Record<string, unknown>).tannin)
              : "médio",
            body: typeof pairing.structure_match === "object" && pairing.structure_match !== null && typeof (pairing.structure_match as Record<string, unknown>).body === "string" && String((pairing.structure_match as Record<string, unknown>).body).trim().length > 0
              ? String((pairing.structure_match as Record<string, unknown>).body)
              : "médio",
          },
          extra_tip: typeof pairing.extra_tip === "string" && pairing.extra_tip.trim().length > 0
            ? pairing.extra_tip.trim()
            : "Você pode ajustar manualmente",
        }))
        .filter((pairing) => pairing.wine.trim().length > 0)
    : [];

  if (strictPairings.length > 0) {
    const merged = dedupePairings(
      strictPairings.concat(fallback.pairings)
        .map((pairing) => ({
          dish: pairing.wine,
          reason: pairing.why_it_works,
          match: "bom" as const,
          harmony_type: "equilíbrio" as const,
          harmony_label: pairing.extra_tip,
          category: "classico" as const,
        })),
    );

    const normalized = merged.slice(0, 5).map((pairing, index) => ({
      wine: pairing.dish,
      style: strictPairings[index]?.style || "Médio corpo",
      why_it_works: pairing.reason,
      structure_match: {
        acidity: strictPairings[index]?.structure_match.acidity || "média",
        tannin: strictPairings[index]?.structure_match.tannin || "médio",
        body: strictPairings[index]?.structure_match.body || "médio",
      },
      extra_tip: strictPairings[index]?.extra_tip || "Você pode ajustar manualmente",
    }));

    while (normalized.length < 5) {
      const fallbackSuggestion = fallback.pairings[normalized.length];
      normalized.push(fallbackSuggestion || {
        wine: `Sugestão padrão ${normalized.length + 1}`,
        style: "Médio corpo",
        why_it_works: `Baseado em "${dish}", esta opção preserva o equilíbrio entre corpo, acidez e intensidade do prato.`,
        structure_match: { acidity: "média", tannin: "médio", body: "médio" },
        extra_tip: "Você pode ajustar manualmente",
      });
    }

    return {
      analysis,
      pairings: normalized.slice(0, 5),
      fallback: Boolean(payload.fallback) || strictPairings.length < 5,
      note: typeof payload.note === "string" && payload.note.trim().length > 0
        ? payload.note
        : Boolean(payload.fallback) || strictPairings.length < 5
          ? "análise simplificada"
          : undefined,
    };
  }

  if (Array.isArray(payload.suggestions)) {
    return buildGeneratedPairingsFromSuggestions(dish, payload.suggestions as WineSuggestion[], Boolean(payload.fallback));
  }

  return fallbackPairing(dish);
}

export async function generateWinePairing(input: WinePairingInput): Promise<GeneratedWinePairing> {
  const finalDish = normalizeWinePairingInput(input);
  console.log("dish:", finalDish);

  try {
    const hasWineContext = typeof input !== "string" && Boolean(
      input?.wineName ||
      input?.wineStyle ||
      input?.wineGrape ||
      input?.wineRegion ||
      input?.wineProducer ||
      input?.wineVintage ||
      input?.wineCountry,
    );
    const requestPayload = typeof input === "string"
      ? {
          mode: "food-to-wine",
          dish: finalDish,
          intent: "everyday",
          cellarWines: undefined,
        }
      : hasWineContext
        ? {
            mode: "wine-to-food",
            wineName: input.wineName,
            wineStyle: input.wineStyle,
            wineGrape: input.wineGrape,
            wineRegion: input.wineRegion,
            wineProducer: input.wineProducer,
            wineVintage: input.wineVintage,
            wineCountry: input.wineCountry,
            dish: finalDish,
            intent: input.intent,
            cellarWines: input.cellarWines ?? undefined,
          }
        : {
            mode: "food-to-wine",
            dish: finalDish,
            intent: input.intent ?? "everyday",
            cellarWines: input.cellarWines ?? undefined,
          };

    const response = await invokeEdgeFunction<any>(
      "wine-pairings",
      requestPayload,
      { timeoutMs: PAIRING_TIMEOUT_MS, retries: 1 },
    );
    console.log("ai_response:", response);
    const parsed = safeParse<GeneratedWinePairing>(JSON.stringify(response));
    console.log("parsed:", parsed);

    const normalized = normalizeGeneratedPairingResponse(parsed ?? response, finalDish);
    return normalized;
  } catch (error) {
    console.warn("[generateWinePairing] fallback used", error);
    return fallbackPairing(finalDish);
  }
}

export async function analyzeWineList(
  analysis: WineListAnalysisTextInput,
  userProfile?: {
    topStyles?: string[];
    topGrapes?: string[];
    topCountries?: string[];
    avgPrice?: number;
  },
): Promise<WineListAnalysis> {
  const totalStartedAt = nowMs();
  try {
    const normalizedOcr = normalizeWineListOcrText(String(analysis.text || ""), {
      fileName: analysis.fileName,
      mimeType: analysis.mimeType,
    });
    const text = normalizedOcr.normalizedText.trim();
    console.info("[sommelier-ai] pairing_request_started", {
      mode: "external-wine-list",
      hasText: Boolean(text),
      mimeType: analysis.mimeType,
      fileName: analysis.fileName,
      textLength: text.length,
      detectedCandidates: normalizedOcr.structured.candidates.length,
    });
    console.info("[AI_PIPELINE] step: analysis_started", {
      flow: "analyze-wine-list",
      fileName: analysis.fileName,
      textLength: text.length,
      detectedCandidates: normalizedOcr.structured.candidates.length,
    });
    const request = () => invokeEdgeFunction<WineListAnalysis>(
      "analyze-wine-list",
      {
        extractedText: text,
        fileName: analysis.fileName,
        mimeType: analysis.mimeType,
        userProfile,
        normalizedOcr: {
          structured: normalizedOcr.structured,
          structuredJson: normalizedOcr.structuredJson,
        },
      },
      { timeoutMs: PAIRING_TIMEOUT_MS, retries: 1 },
    );
    const requestStartedAt = nowMs();
    const data = await request();
    logTiming("analyze-wine-list", "edge_request", requestStartedAt, {
      fileName: analysis.fileName,
      textLength: text.length,
      wineCount: Array.isArray((data as any)?.wines) ? (data as any).wines.length : 0,
      fallback: Boolean((data as any)?.fallback),
    });
    if (data && (data as any).fallback === true) {
      logTiming("analyze-wine-list", "total", totalStartedAt, { fileName: analysis.fileName, outcome: "fallback" });
      return data;
    }
    if (data && Array.isArray(data.wines) && data.wines.length > 0) {
      const normalizeStartedAt = nowMs();
      const normalized = { ...data, wines: data.wines.map((wine) => normalizeWineListTags(normalizeWineData(wine, { log: false }))) };
      logTiming("analyze-wine-list", "normalization", normalizeStartedAt, { fileName: analysis.fileName, wineCount: normalized.wines.length });
      logTiming("analyze-wine-list", "total", totalStartedAt, { fileName: analysis.fileName, outcome: "success", wineCount: normalized.wines.length });
      return normalized;
    }
    if (data && isValidLenientWineList(data)) {
      const normalizeStartedAt = nowMs();
      const normalized = { ...data, wines: (data.wines || []).map((wine) => normalizeWineListTags(normalizeWineData(wine, { log: false }))) };
      logTiming("analyze-wine-list", "normalization", normalizeStartedAt, { fileName: analysis.fileName, wineCount: normalized.wines.length, lenient: true });
      logTiming("analyze-wine-list", "total", totalStartedAt, { fileName: analysis.fileName, outcome: "lenient_success", wineCount: normalized.wines.length });
      return normalized;
    }
    throw new Error(ANALYSIS_FALLBACK_MESSAGE);
  } catch (err) {
    const classified = classifyError(err);
    logTiming("analyze-wine-list", "total", totalStartedAt, {
      fileName: analysis.fileName,
      outcome: "fallback",
      code: classified.code,
      type: classified.type,
    });
    const normalizedOcr = normalizeWineListOcrText(String(analysis.text || ""), {
      fileName: analysis.fileName,
      mimeType: analysis.mimeType,
    });
    const lines = normalizedOcr.cleanText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);
    const fallbackWineName = lines[0] || "Não identificado";
    return {
      wines: [
        {
          name: fallbackWineName,
          producer: null,
          vintage: null,
          style: null,
          grape: null,
          region: null,
          price: null,
          rating: 50,
          description: lines.join(" ") || "Leitura simplificada",
          reasoning: "A análise automática não concluiu com segurança. Mantivemos uma leitura simples para revisão manual.",
          pairings: lines.slice(0, 2).map((line) => ({ dish: line, why: "Linha preservada para revisão manual." })),
          verdict: "Leitura simplificada",
          compatibilityLabel: "Revisar",
          highlight: null,
          body: null,
          acidity: null,
          tannin: null,
          occasion: null,
          comparativeLabels: [],
        },
      ],
      topPick: fallbackWineName,
      bestValue: fallbackWineName,
      fallback: true,
      fallbackReason: classified.message,
    };
  }
}

export async function analyzeMenuForWine(
  analysis: WineListAnalysisTextInput,
  wineName: string,
): Promise<MenuAnalysis> {
  const totalStartedAt = nowMs();
  try {
    const normalizedOcr = normalizeWineListOcrText(String(analysis.text || ""), {
      fileName: analysis.fileName,
      mimeType: analysis.mimeType,
    });
    const text = normalizedOcr.cleanText.trim();
    console.info("[sommelier-ai] pairing_request_started", {
      mode: "external-menu",
      wineName,
      hasText: Boolean(text),
      mimeType: analysis.mimeType,
      fileName: analysis.fileName,
      textLength: text.length,
      detectedCandidates: normalizedOcr.structured.candidates.length,
    });
    console.info("[AI_PIPELINE] step: analysis_started", {
      flow: "analyze-menu-for-wine",
      fileName: analysis.fileName,
      textLength: text.length,
      wineName,
      detectedCandidates: normalizedOcr.structured.candidates.length,
    });
    const request = () => invokeEdgeFunction<MenuAnalysis>(
      "analyze-wine-list",
      {
        extractedText: text,
        fileName: analysis.fileName,
        mimeType: analysis.mimeType,
        mode: "menu-for-wine",
        wineName,
        normalizedOcr: {
          structured: normalizedOcr.structured,
          structuredJson: normalizedOcr.structuredJson,
        },
      },
      { timeoutMs: PAIRING_TIMEOUT_MS, retries: 1 },
    );
    const requestStartedAt = nowMs();
    const data = await request();
    logTiming("analyze-menu-for-wine", "edge_request", requestStartedAt, {
      fileName: analysis.fileName,
      wineName,
      textLength: text.length,
      dishCount: Array.isArray((data as any)?.dishes) ? (data as any).dishes.length : 0,
      fallback: Boolean((data as any)?.fallback),
    });
    if (data && (data as any).fallback === true) {
      logTiming("analyze-menu-for-wine", "total", totalStartedAt, { fileName: analysis.fileName, wineName, outcome: "fallback" });
      return data;
    }
    if (data && Array.isArray(data.dishes) && data.dishes.length > 0) {
      logTiming("analyze-menu-for-wine", "total", totalStartedAt, { fileName: analysis.fileName, wineName, outcome: "success", dishCount: data.dishes.length });
      return data;
    }
    if (data && isValidLenientMenu(data, wineName)) {
      logTiming("analyze-menu-for-wine", "total", totalStartedAt, { fileName: analysis.fileName, wineName, outcome: "lenient_success", dishCount: data.dishes?.length || 0 });
      return data;
    }
    throw new Error(ANALYSIS_FALLBACK_MESSAGE);
  } catch (err) {
    const classified = classifyError(err);
    logTiming("analyze-menu-for-wine", "total", totalStartedAt, {
      fileName: analysis.fileName,
      wineName,
      outcome: "fallback",
      code: classified.code,
      type: classified.type,
    });
    const normalizedOcr = normalizeWineListOcrText(String(analysis.text || ""), {
      fileName: analysis.fileName,
      mimeType: analysis.mimeType,
    });
    const lines = normalizedOcr.cleanText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);
    const detectedDish = lines[0] || "desconhecido";
    return {
      dishes: lines.length > 0
        ? lines.map((line, index) => ({
            name: line,
            match: index === 0 ? "muito bom" : "bom",
            reason: `Leitura simplificada da linha "${line}". Mantivemos a análise útil enquanto refinamos a interpretação automática.`,
            highlight: index === 0 ? "top-pick" : null,
            compatibilityLabel: "Revisar",
            harmony_type: "equilíbrio",
            harmony_label: "análise simplificada",
            dish_profile: null,
            recipe: null,
          }))
        : [{
            name: detectedDish,
            match: "bom",
            reason: "Não foi possível analisar a imagem com segurança. Mantivemos um resultado simples para não bloquear a revisão.",
            highlight: "top-pick",
            compatibilityLabel: "Revisar",
            harmony_type: "equilíbrio",
            harmony_label: "análise simplificada",
            dish_profile: null,
            recipe: null,
          }],
      summary: `Leitura simplificada para ${wineName || "o vinho selecionado"}.`,
      wineProfile: null,
      fallback: true,
      fallbackReason: classified.message,
    };
  }
}

export async function getTasteCompatibility(
  targetWine: WineSummary,
  userCellar: WineSummary[],
): Promise<TasteCompatibility> {
  try {
    const data = await invokeEdgeFunction<TasteCompatibility>(
      "taste-compatibility",
      {
        targetWine: {
          name: targetWine.name,
          style: targetWine.style,
          grape: targetWine.grape,
          country: targetWine.country,
          region: targetWine.region,
          producer: targetWine.producer,
        },
        userCellar: userCellar.slice(0, 40).map((w) => ({
          name: w.name,
          style: w.style,
          grape: w.grape,
          country: w.country,
          region: w.region,
          quantity: w.quantity,
        })),
      },
      { timeoutMs: 12_000, retries: 1 },
    );
    if (data && (data as any).fallback === true) {
      return data;
    }
    if (data && typeof data.compatibility === "number") {
      return data;
    }
    return { compatibility: null, label: "Não disponível", reason: "Não foi possível calcular a compatibilidade" };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
    return { compatibility: null, label: "Não disponível", reason: classified.message };
  }
}

export async function getWineInsight(wine: {
  name: string;
  alertType: "drink_now" | "past_peak";
  style?: string | null;
  grape?: string | null;
  region?: string | null;
  country?: string | null;
  vintage?: number | null;
  drinkFrom?: number | null;
  drinkUntil?: number | null;
}): Promise<WineInsight> {
  const totalStartedAt = nowMs();
  try {
    const request = () => invokeEdgeFunction<WineInsight>(
      "wine-insight",
      {
        alertType: wine.alertType,
        wineName: wine.name,
        style: wine.style,
        grape: wine.grape,
        region: wine.region,
        country: wine.country,
        vintage: wine.vintage,
        drinkFrom: wine.drinkFrom,
        drinkUntil: wine.drinkUntil,
      },
      { timeoutMs: 12_000, retries: 1 },
    );
    const requestStartedAt = nowMs();
    const data = await request();
    logTiming("wine-insight", "edge_request", requestStartedAt, {
      wineName: wine.name,
      alertType: wine.alertType,
    });
    if (data && validateWineSpecificity(data, "insight")) {
      logTiming("wine-insight", "total", totalStartedAt, { wineName: wine.name, outcome: "success" });
      return data;
    }
    logTiming("wine-insight", "total", totalStartedAt, { wineName: wine.name, outcome: "fallback-local" });
    return {
      insight: wine.alertType === "drink_now"
        ? "Este vinho está em sua janela ideal de consumo."
        : "Este vinho pode ter passado do seu período ideal.",
      recommendation: "Considere abri-lo em breve para aproveitar melhor.",
    };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
    logTiming("wine-insight", "total", totalStartedAt, {
      wineName: wine.name,
      outcome: "error_fallback",
      code: classified.code,
      type: classified.type,
    });
    return {
      insight: wine.alertType === "drink_now"
        ? "Este vinho está em sua janela ideal de consumo."
        : "Este vinho pode ter passado do seu período ideal.",
      recommendation: "Considere abri-lo em breve para aproveitar melhor.",
    };
  }
}

// ── Helpers ──

export function buildUserProfile(wines: WineSummary[]) {
  const styleCount: Record<string, number> = {};
  const grapeCount: Record<string, number> = {};
  const countryCount: Record<string, number> = {};

  wines.forEach((w) => {
    if (w.style) styleCount[w.style] = (styleCount[w.style] || 0) + (w.quantity || 1);
    if (w.grape) grapeCount[w.grape] = (grapeCount[w.grape] || 0) + (w.quantity || 1);
    if (w.country) countryCount[w.country] = (countryCount[w.country] || 0) + (w.quantity || 1);
  });

  const topN = (obj: Record<string, number>, n: number) =>
    Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([k]) => k);

  return {
    topStyles: topN(styleCount, 3),
    topGrapes: topN(grapeCount, 5),
    topCountries: topN(countryCount, 3),
  };
}

export function compatibilityColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-emerald-500";
  if (score >= 50) return "text-amber-500";
  return "text-muted-foreground";
}

export function compatibilityBg(score: number | null): string {
  if (score === null) return "bg-muted/30";
  if (score >= 85) return "bg-green-500/8";
  if (score >= 70) return "bg-emerald-500/8";
  if (score >= 50) return "bg-amber-500/8";
  return "bg-muted/30";
}
