import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edge-invoke";
import { normalizeWineData } from "@/lib/wine-normalization";
import { normalizeWineListOcrText } from "@/lib/wine-ocr-normalization";

const ANALYSIS_FALLBACK_MESSAGE = "Não conseguimos concluir a leitura agora. Verifique sua conexão e tente novamente em instantes.";
const ANALYZE_WINE_LIST_TIMEOUT_MS = 65_000;

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

export interface PairingResponse {
  pairings: PairingResult[];
  wineProfile?: WineProfile | null;
  pairingLogic?: string | null;
  fallback?: boolean;
  fallbackReason?: string | null;
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

export interface SuggestionResponse {
  suggestions: WineSuggestion[];
  dishProfile?: DishProfile | null;
  fallback?: boolean;
  fallbackReason?: string | null;
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
        ? "Sem conexão. Verifique sua internet."
        : "O serviço está temporariamente indisponível. Tente novamente em instantes.",
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

// Legacy fallback stubs retained for reference only. Never used as final output.
function fallbackPairingsForDish(_dish: string, _cellarWines?: WineSummary[]): WineSuggestion[] {
  return [];
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

function fallbackPairingsForWine(wine: { name?: string; style?: string | null; grape?: string | null; region?: string | null; producer?: string | null }): PairingResult[] {
  const style = normalizeForMatch(wine.style).replace(/\s+/g, " ");
  const isRed = /\btinto|red|malbec|cabernet|syrah|merlot|tempranillo|nebbiolo|sangiovese|pinot noir\b/i.test(style);
  const isWhite = /\bbranco|white|chardonnay|sauvignon|riesling|alvarinho|verdejo|pinot gris|moscato\b/i.test(style);
  const isRose = /\bros[eé]|rose\b/i.test(style);
  const isSparkling = /\bespumante|sparkling|champagne|prosecco|cava|brut\b/i.test(style);

  if (isRed) {
    return [
      createFallbackPairing("Picanha grelhada", "A gordura da carne pede taninos firmes e boa acidez para limpar o paladar.", "perfeito", "contraste", "gordura + taninos"),
      createFallbackPairing("Cordeiro assado", "A textura suculenta do cordeiro encontra estrutura e presença no vinho.", "perfeito", "equilíbrio", "estrutura + intensidade"),
      createFallbackPairing("Massa ao molho vermelho", "A acidez do molho pede um vinho com corpo e frescor suficiente para acompanhar o tomate.", "muito bom", "complemento", "tomate + acidez"),
      createFallbackPairing("Queijo curado", "O sal e a gordura do queijo ganham frescor quando o vinho tem taninos e acidez em boa medida.", "muito bom", "contraste", "sal + taninos"),
      createFallbackPairing("Hambúrguer artesanal", "A untuosidade e o sabor tostado pedem vinho de corpo médio e taninos que sustentem a mordida.", "bom", "equilíbrio", "gordura + estrutura"),
    ];
  }

  if (isWhite) {
    return [
      createFallbackPairing("Peixe grelhado", "A delicadeza do peixe pede acidez viva e textura leve para não pesar no prato.", "perfeito", "limpeza", "leveza + frescor"),
      createFallbackPairing("Frutos do mar", "A salinidade pede frescor e mineralidade para manter o conjunto preciso.", "perfeito", "contraste", "sal + mineralidade"),
      createFallbackPairing("Risoto de limão", "A cremosidade do risoto ganha corte com acidez e final mais tenso.", "muito bom", "equilíbrio", "cremosidade + acidez"),
      createFallbackPairing("Queijo de cabra", "O caráter ácido e lácteo do queijo acompanha bem um branco de frescor marcante.", "muito bom", "contraste", "laticínio + frescor"),
      createFallbackPairing("Frango ao molho leve", "Pratos mais delicados pedem vinhos de corpo médio e acidez suficiente para sustentar o molho.", "bom", "complemento", "molho leve + corpo médio"),
    ];
  }

  if (isRose) {
    return [
      createFallbackPairing("Sushi", "A acidez e a leveza do rosé limpam o paladar sem sobrepor o peixe cru.", "perfeito", "limpeza", "textura delicada + frescor"),
      createFallbackPairing("Pizza margherita", "O tomate e a mozzarella pedem frescor e fruta, sem tanino dominante.", "muito bom", "equilíbrio", "tomate + fruta"),
      createFallbackPairing("Salada com frutas", "A acidez da fruta e o perfil leve do prato combinam com um rosé refrescante.", "muito bom", "semelhança", "frescor + delicadeza"),
      createFallbackPairing("Tábua de frios", "O sal e a variedade de texturas funcionam com um vinho versátil e pouco agressivo.", "bom", "contraste", "sal + versatilidade"),
      createFallbackPairing("Frango grelhado", "A proteína leve precisa de vinho com frescor e fruta sem excesso de peso.", "bom", "complemento", "proteína leve + frescor"),
    ];
  }

  if (isSparkling) {
    return [
      createFallbackPairing("Canapés e entradas", "A efervescência e a acidez preparam o paladar antes do prato principal.", "perfeito", "limpeza", "gás + entrada"),
      createFallbackPairing("Frituras leves", "A espuma e a acidez limpam a gordura e deixam a sensação mais seca.", "perfeito", "limpeza", "gordura + acidez"),
      createFallbackPairing("Camarão empanado", "A textura crocante pede um vinho que corte a fritura sem dominar o sabor.", "muito bom", "contraste", "crosta + frescor"),
      createFallbackPairing("Omelete", "A textura macia combina com a vibração do espumante e sua acidez refrescante.", "muito bom", "equilíbrio", "textura macia + acidez"),
      createFallbackPairing("Sobremesas delicadas", "Quando a doçura é leve, o gás traz leveza e mantém o conjunto elegante.", "bom", "semelhança", "doçura leve + leveza"),
    ];
  }

  return [
    createFallbackPairing("Tábua de frios", "Uma harmonização versátil que respeita sal, gordura e textura sem exigir muita intensidade.", "muito bom", "contraste", "versatilidade"),
    createFallbackPairing("Peixe grelhado", "A acidez ajuda a manter frescor e a preservar a leitura do prato.", "muito bom", "limpeza", "frescor"),
    createFallbackPairing("Massa leve", "A massa pede equilíbrio de corpo e acidez para não perder a forma.", "bom", "equilíbrio", "equilíbrio"),
    createFallbackPairing("Queijos suaves", "A cremosidade funciona com vinhos de perfil delicado e boa precisão.", "bom", "complemento", "cremosidade"),
    createFallbackPairing("Legumes assados", "A caramelização pede um vinho que acompanhe a doçura natural sem pesar.", "bom", "semelhança", "caramelização"),
  ];
}

function fallbackPairingLogicForWine(wine: { style?: string | null; grape?: string | null; region?: string | null; producer?: string | null }) {
  const style = normalizeForMatch(wine.style);
  if (/\btinto|red|malbec|cabernet|syrah|merlot|tempranillo|nebbiolo|sangiovese|pinot noir\b/i.test(style)) {
    return "Taninos, corpo e acidez pedem pratos com gordura, proteína e preparo mais intenso para que o vinho mantenha presença sem dominar o prato.";
  }
  if (/\bbranco|white|chardonnay|sauvignon|riesling|alvarinho|verdejo|pinot gris|moscato\b/i.test(style)) {
    return "A acidez e o frescor pedem pratos mais delicados, com gordura moderada ou textura cremosa para criar contraste limpo e elegante.";
  }
  if (/\bros[eé]|rose\b/i.test(style)) {
    return "A fruta e a leveza do rosé funcionam melhor com pratos frescos, salgados e de intensidade média, sem excesso de gordura.";
  }
  if (/\bespumante|sparkling|champagne|prosecco|cava|brut\b/i.test(style)) {
    return "A acidez e a efervescência limpam gordura e destacam entradas, frituras leves e pratos delicados com textura mais macia.";
  }
  return "A avaliação privilegia o equilíbrio entre corpo, acidez, taninos e intensidade do prato para sugerir combinações mais precisas.";
}

// ── Validation helpers ──

function isValidPairings(data: unknown): data is PairingResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.pairings) || d.pairings.length < 1) return false;
  return d.pairings.every((p: any) => typeof p.dish === "string" && p.dish.length > 0);
}

function isValidSuggestions(data: unknown): data is SuggestionResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.suggestions) || d.suggestions.length < 1) return false;
  return d.suggestions.every((s: any) => typeof s.wineName === "string" && s.wineName.length > 0);
}

// ── API Functions with Fallback ──

export async function getWinePairings(wine: {
  name: string;
  style?: string | null;
  grape?: string | null;
  region?: string | null;
  producer?: string | null;
  vintage?: number | null;
  country?: string | null;
}): Promise<PairingResponse> {
  const totalStartedAt = nowMs();
  try {
    console.info("[sommelier-ai] pairing_request_started", {
      mode: "wine-to-food",
      source: "cellar",
      wineName: wine.name,
      hasProducer: Boolean(wine.producer),
      hasRegion: Boolean(wine.region),
      hasCountry: Boolean(wine.country),
      hasVintage: wine.vintage != null,
    });
    const request = () => invokeEdgeFunction<{ pairings: PairingResult[] }>(
      "wine-pairings",
      {
        mode: "wine-to-food",
        wineName: wine.name,
        wineStyle: wine.style,
        wineGrape: wine.grape,
        wineRegion: wine.region,
        wineProducer: wine.producer,
        wineVintage: wine.vintage,
        wineCountry: wine.country,
      },
      { timeoutMs: 30_000, retries: 1 },
    );
    const requestStartedAt = nowMs();
    const data = await request();
    logTiming("wine-to-food", "edge_request", requestStartedAt, {
      wineName: wine.name,
      pairings: Array.isArray((data as any)?.pairings) ? (data as any).pairings.length : 0,
      fallback: Boolean((data as any)?.fallback),
    });
    if (data && (data as any).fallback === true) {
      logTiming("wine-to-food", "total", totalStartedAt, { wineName: wine.name, outcome: "fallback" });
      return data;
    }
    if (data && Array.isArray(data.pairings)) {
      const mergedPairings = dedupePairings([
        ...data.pairings,
        ...fallbackPairingsForWine(wine).filter((fallback) =>
          !data.pairings.some((existing) => normalizeForMatch(existing.dish) === normalizeForMatch(fallback.dish)),
        ),
      ]).slice(0, 5);

      const response: PairingResponse = {
        ...data,
        pairings: mergedPairings,
        pairingLogic: typeof data.pairingLogic === "string" && data.pairingLogic.trim().length > 0
          ? data.pairingLogic
          : fallbackPairingLogicForWine(wine),
      };

      logTiming("wine-to-food", "total", totalStartedAt, {
        wineName: wine.name,
        outcome: mergedPairings.length >= 5 ? "success" : "lenient_success",
        pairings: mergedPairings.length,
        filledFromFallback: mergedPairings.length - data.pairings.length,
      });
      return response;
    }
    if (data && typeof (data as any).message === "string" && Array.isArray((data as any).pairings)) {
      throw new Error((data as any).message);
    }
    if (isValidPairings(data)) {
      logTiming("wine-to-food", "total", totalStartedAt, { wineName: wine.name, outcome: "lenient_success", pairings: data.pairings.length });
      return data;
    }

    throw new Error(ANALYSIS_FALLBACK_MESSAGE);
  } catch (err) {
    if (err instanceof Error && isUserFacingAnalysisError(err.message)) {
      throw err;
    }
    const classified = classifyError(err);
    console.warn("[sommelier-ai] getWinePairings error:", classified.type, classified.message);
    logTiming("wine-to-food", "total", totalStartedAt, {
      wineName: wine.name,
      outcome: "error",
      code: classified.code,
      type: classified.type,
    });
    throw new Error(classified.message);
  }
}

export async function getDishWineSuggestions(
  dish: string,
  userWines?: WineSummary[],
  intent?: PairingIntent,
): Promise<SuggestionResponse> {
  const totalStartedAt = nowMs();
  try {
    console.info("[sommelier-ai] pairing_request_started", {
      mode: "food-to-wine",
      source: "cellar",
      dish,
      userWineCount: userWines?.length || 0,
      intent: intent ?? "everyday",
    });
    const request = () => invokeEdgeFunction<{ suggestions: WineSuggestion[] }>(
      "wine-pairings",
      {
        mode: "food-to-wine",
        dish,
        intent: intent ?? "everyday",
        userWines: userWines?.slice(0, 30)?.map((w) => ({
          name: w.name,
          style: w.style,
          grape: w.grape,
          region: w.region,
          country: w.country,
          vintage: w.vintage,
          producer: w.producer,
          purchase_price: w.purchase_price ?? null,
          current_value: w.current_value ?? null,
        })),
      },
      { timeoutMs: 30_000, retries: 1 },
    );
    const requestStartedAt = nowMs();
    const data = await request();
    logTiming("food-to-wine", "edge_request", requestStartedAt, {
      dish,
      suggestions: Array.isArray((data as any)?.suggestions) ? (data as any).suggestions.length : 0,
      fallback: Boolean((data as any)?.fallback),
    });
    if (data && (data as any).fallback === true) {
      logTiming("food-to-wine", "total", totalStartedAt, { dish, outcome: "fallback" });
      return data;
    }
    if (isValidSuggestions(data)) {
      logTiming("food-to-wine", "total", totalStartedAt, { dish, outcome: "success", suggestions: data.suggestions.length });
      return data;
    }
    if (data && typeof (data as any).message === "string" && Array.isArray((data as any).suggestions)) {
      throw new Error((data as any).message);
    }

    throw new Error(ANALYSIS_FALLBACK_MESSAGE);
  } catch (err) {
    if (err instanceof Error && isUserFacingAnalysisError(err.message)) {
      throw err;
    }
    const classified = classifyError(err);
    console.warn("[sommelier-ai] getDishWineSuggestions error:", classified.type, classified.message);
    logTiming("food-to-wine", "total", totalStartedAt, {
      dish,
      outcome: "error",
      code: classified.code,
      type: classified.type,
    });
    throw new Error(classified.message);
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
      { timeoutMs: ANALYZE_WINE_LIST_TIMEOUT_MS, retries: 1 },
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
    if (err instanceof Error && isUserFacingAnalysisError(err.message)) {
      throw err;
    }
    const classified = classifyError(err);
    logTiming("analyze-wine-list", "total", totalStartedAt, {
      fileName: analysis.fileName,
      outcome: "error",
      code: classified.code,
      type: classified.type,
    });
    if (classified.type === "auth") throw createClassifiedError(classified, "AUTH_INVALID");
    throw createClassifiedError(classified);
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
      { timeoutMs: ANALYZE_WINE_LIST_TIMEOUT_MS, retries: 1 },
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
    if (err instanceof Error && isUserFacingAnalysisError(err.message)) {
      throw err;
    }
    const classified = classifyError(err);
    logTiming("analyze-menu-for-wine", "total", totalStartedAt, {
      fileName: analysis.fileName,
      wineName,
      outcome: "error",
      code: classified.code,
      type: classified.type,
    });
    if (classified.type === "auth") throw createClassifiedError(classified, "AUTH_INVALID");
    throw createClassifiedError(classified);
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
      { timeoutMs: 4_000, retries: 1 },
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
      { timeoutMs: 4_000, retries: 1 },
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
