import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edge-invoke";
import type { AiAnalysisAttachmentPayload } from "@/lib/ai-attachments";

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
}

export interface TasteCompatibility {
  compatibility: number | null;
  label: string;
  reason: string;
}

export interface WineInsight {
  insight: string;
  recommendation: string;
}

// ── Error Classification ──

export type AiErrorType = "network" | "timeout" | "auth" | "ai_fail" | "empty" | "unknown";

export interface ClassifiedError {
  type: AiErrorType;
  message: string;
  usedFallback?: boolean;
}

function classifyError(err: unknown): ClassifiedError {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (err instanceof EdgeFunctionError && err.status === 401) {
    return { type: "auth", message: "Sessão expirada. Faça login novamente." };
  }
  if (err instanceof EdgeFunctionError && err.code === "AUTH_REQUIRED") {
    return { type: "auth", message: "Sessão expirada. Faça login novamente." };
  }
  if (lower.includes("tempo limite") || lower.includes("timeout") || lower.includes("demorou mais")) {
    return { type: "timeout", message: "A busca demorou mais que o esperado. Tente novamente." };
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
    };
  }
  if (lower.includes("failed to send")) {
    return { type: "ai_fail", message: "A solicitação não pôde ser enviada. Tente novamente." };
  }
  if (lower.includes("créditos") || lower.includes("esgotados") || lower.includes("ai gateway error") || lower.includes("não conseguimos")) {
    return { type: "ai_fail", message: "Não conseguimos gerar a sugestão agora. Tente novamente em instantes." };
  }
  return { type: "unknown", message: "Não conseguimos gerar a sugestão agora." };
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
  return (
    message.startsWith("A análise não ficou específica o suficiente.") ||
    message.startsWith("A análise do cardápio não ficou específica o suficiente.")
  );
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
    if (pairings.length < 3) return false;
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
    if (suggestions.length < 3) return false;
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
        item.pairings.length >= 3 &&
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
    if (dishes.length < 5) return false;
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
}

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

function fallbackPairingsForWine(_wine: { name?: string; style?: string | null; grape?: string | null; region?: string | null; producer?: string | null }): PairingResult[] {
  return [];
}

// ── Validation helpers ──

function isValidPairings(data: unknown): data is PairingResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.pairings) || d.pairings.length < 3 || d.pairings.length > 5) return false;
  return d.pairings.every((p: any) => typeof p.dish === "string" && p.dish.length > 0);
}

function isValidSuggestions(data: unknown): data is SuggestionResponse {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.suggestions) || d.suggestions.length < 3 || d.suggestions.length > 5) return false;
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
  try {
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
      { timeoutMs: 55_000, retries: 1 },
    );
    const data = await request();
    const pairingContext = {
      wineName: wine.name,
      producer: wine.producer ?? null,
      region: wine.region ?? null,
      country: wine.country ?? null,
      style: wine.style ?? null,
      vintage: wine.vintage ?? null,
      grape: wine.grape ?? null,
    };
    if (isValidPairings(data) && validateWineSpecificity(data, "pairings", pairingContext.wineName, pairingContext)) {
      return data;
    }

    const retryData = await request().catch(() => null);
    if (retryData && isValidPairings(retryData) && validateWineSpecificity(retryData, "pairings", pairingContext.wineName, pairingContext)) {
      return retryData;
    }

    throw new Error("A análise não ficou específica o suficiente. Tente novamente com uma imagem mais nítida.");
  } catch (err) {
    if (err instanceof Error && isUserFacingAnalysisError(err.message)) {
      throw err;
    }
    const classified = classifyError(err);
    console.warn("[sommelier-ai] getWinePairings error:", classified.type, classified.message);
    throw new Error(classified.message);
  }
}

export async function getDishWineSuggestions(
  dish: string,
  userWines?: WineSummary[],
): Promise<SuggestionResponse> {
  try {
    const request = () => invokeEdgeFunction<{ suggestions: WineSuggestion[] }>(
      "wine-pairings",
      {
        mode: "food-to-wine",
        dish,
        userWines: userWines?.slice(0, 30)?.map((w) => ({
          name: w.name,
          style: w.style,
          grape: w.grape,
          region: w.region,
          country: w.country,
          vintage: w.vintage,
          producer: w.producer,
        })),
      },
      { timeoutMs: 55_000, retries: 1 },
    );
    const data = await request();
    if (isValidSuggestions(data) && validateWineSpecificity(data, "suggestions", undefined, { dish })) {
      return data;
    }

    const retryData = await request().catch(() => null);
    if (retryData && isValidSuggestions(retryData) && validateWineSpecificity(retryData, "suggestions", undefined, { dish })) {
      return retryData;
    }

    throw new Error("A análise não ficou específica o suficiente. Tente novamente com uma imagem mais nítida.");
  } catch (err) {
    if (err instanceof Error && isUserFacingAnalysisError(err.message)) {
      throw err;
    }
    const classified = classifyError(err);
    console.warn("[sommelier-ai] getDishWineSuggestions error:", classified.type, classified.message);
    throw new Error(classified.message);
  }
}

export async function analyzeWineList(
  attachment: AiAnalysisAttachmentPayload,
  userProfile?: {
    topStyles?: string[];
    topGrapes?: string[];
    topCountries?: string[];
    avgPrice?: number;
  },
): Promise<WineListAnalysis> {
  try {
    const request = () => invokeEdgeFunction<WineListAnalysis>(
      "analyze-wine-list",
      { ...attachment, userProfile },
      { timeoutMs: 45_000, retries: 1 },
    );
    const data = await request();
    if (data && Array.isArray(data.wines) && data.wines.length > 0 && validateWineSpecificity(data, "wineList")) {
      return data;
    }
    const retryData = await request().catch(() => null);
    if (retryData && Array.isArray(retryData.wines) && retryData.wines.length > 0 && validateWineSpecificity(retryData, "wineList")) {
      return retryData;
    }
    throw new Error("A análise não ficou específica o suficiente. Tente novamente com uma imagem mais nítida.");
  } catch (err) {
    if (err instanceof Error && isUserFacingAnalysisError(err.message)) {
      throw err;
    }
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
    throw new Error(classified.message);
  }
}

export async function analyzeMenuForWine(
  attachment: AiAnalysisAttachmentPayload,
  wineName: string,
): Promise<MenuAnalysis> {
  try {
    const request = () => invokeEdgeFunction<MenuAnalysis>(
      "analyze-wine-list",
      { ...attachment, mode: "menu-for-wine", wineName },
      { timeoutMs: 45_000, retries: 1 },
    );
    const data = await request();
    if (data && Array.isArray(data.dishes) && data.dishes.length > 0 && validateWineSpecificity(data, "menu", { wineName })) {
      return data;
    }
    const retryData = await request().catch(() => null);
    if (retryData && Array.isArray(retryData.dishes) && retryData.dishes.length > 0 && validateWineSpecificity(retryData, "menu", { wineName })) {
      return retryData;
    }
    throw new Error("A análise do cardápio não ficou específica o suficiente. Tente novamente com uma imagem mais nítida.");
  } catch (err) {
    if (err instanceof Error && isUserFacingAnalysisError(err.message)) {
      throw err;
    }
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
    throw new Error(classified.message);
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
      { timeoutMs: 8_000, retries: 1 },
    );
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
      { timeoutMs: 8_000, retries: 1 },
    );
    const data = await request();
    if (data && validateWineSpecificity(data, "insight")) {
      return data;
    }
    const retryData = await request().catch(() => null);
    if (retryData && validateWineSpecificity(retryData, "insight")) {
      return retryData;
    }
    return {
      insight: wine.alertType === "drink_now"
        ? "Este vinho está em sua janela ideal de consumo."
        : "Este vinho pode ter passado do seu período ideal.",
      recommendation: "Considere abri-lo em breve para aproveitar melhor.",
    };
  } catch (err) {
    const classified = classifyError(err);
    if (classified.type === "auth") throw new Error(classified.message);
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
