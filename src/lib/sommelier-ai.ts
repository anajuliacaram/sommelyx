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
  "complementa os sabores",
  "acidez do vinho combina",
  "frutas frescas",
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

function isUserFacingAnalysisError(message: string) {
  return (
    message.startsWith("A análise não ficou específica o suficiente.") ||
    message.startsWith("A análise do cardápio não ficou específica o suficiente.")
  );
}

function validateWineSpecificity<T extends Record<string, unknown>>(data: T, kind: "pairings" | "suggestions" | "wineList" | "menu" | "insight"): boolean {
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
      !hasGenericWineLanguage(item.harmony_label),
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
      !hasGenericWineLanguage(item.harmony_label),
    );
  }

  if (kind === "wineList") {
    const wines = Array.isArray(data.wines) ? data.wines : [];
    if (wines.length === 0) return false;
    return wines.every((item: any) =>
      typeof item?.name === "string" &&
      item.name.trim().length > 0 &&
      typeof item?.verdict === "string" &&
      typeof item?.compatibilityLabel === "string" &&
      typeof item?.reasoning === "string" &&
      item.reasoning.trim().length >= 80 &&
      hasComparativeWineLanguage(item.reasoning) &&
      hasTechnicalWineLanguage(item.reasoning) &&
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
        !hasGenericWineLanguage(pairing.why)
      ) &&
      Array.isArray(item.comparativeLabels) &&
      item.comparativeLabels.length >= 1,
    );
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
      hasTechnicalWineLanguage(item.reason),
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

function fallbackPairingsForDish(dish: string, cellarWines?: WineSummary[]): WineSuggestion[] {
  const lower = dish.toLowerCase();
  const matchedRules = PAIRING_RULES.filter((r) => r.keywords.some((k) => lower.includes(k)));
  const rules = matchedRules.length > 0 ? matchedRules : [
    { keywords: [], styles: ["branco", "rosé", "tinto"], explanation: "Para pratos do dia a dia, vinhos versáteis de corpo leve a médio são seguros" },
  ];

  const matchedStyles = new Set(rules.flatMap((r) => r.styles));
  const harmonyTypes = ["equilíbrio", "complemento", "contraste", "semelhança", "limpeza"] as const;
  const harmonyLabels = ["peso proporcional", "aromas complementares", "opostos que equilibram", "texturas semelhantes", "paladar renovado"];
  const compatLabels = ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem", "Funciona bem"];

  if (cellarWines?.length) {
    const cellarMatches = cellarWines.filter(
      (w) => w.style && matchedStyles.has(w.style.toLowerCase()),
    );

    if (cellarMatches.length > 0) {
      const seen = new Set<string>();
      const unique = cellarMatches.filter(w => {
        if (seen.has(w.name)) return false;
        seen.add(w.name);
        return true;
      });
      return unique.slice(0, 5).map((w, i) => ({
        wineName: w.name,
        style: w.style || "tinto",
        grape: w.grape || undefined,
        vintage: w.vintage || undefined,
        region: w.region || undefined,
        country: w.country || undefined,
        reason: buildCellarReason(w, dish, harmonyTypes[i % 5]),
        fromCellar: true,
        match: i === 0 ? "muito bom" : "bom",
        harmony_type: harmonyTypes[i % 5],
        harmony_label: harmonyLabels[i % 5],
        compatibilityLabel: compatLabels[i],
      }));
    }
  }

  const analysis = analyzeDish(dish);
  const genericSuggestions: WineSuggestion[] = [];
  const styleDetails: Record<string, { name: string; reason: string }> = {
    tinto: { name: "Vinho tinto de corpo médio", reason: `Para "${dish}" (intensidade ${analysis.intensity}), um tinto de corpo médio oferece taninos suaves que ${analysis.protein === "ovo" ? "contrastam com a cremosidade do ovo" : analysis.fat === "alta" ? "equilibram a gordura da proteína" : "complementam os sabores sem dominar"}.` },
    branco: { name: "Vinho branco seco", reason: `A acidez cítrica de um branco seco ${analysis.protein === "peixe" ? "realça a frescura do peixe sem competir" : `traz frescor e contraste para "${dish}"`}.` },
    rosé: { name: "Vinho rosé seco", reason: `Um rosé seco oferece o equilíbrio ideal para "${dish}" — ${analysis.intensity === "leve" ? "sua delicadeza espelha a leveza do prato" : "corpo suficiente para acompanhar sem dominar"}.` },
    espumante: { name: "Espumante brut", reason: `A perlage fina funciona como limpador natural do paladar entre cada garfada de "${dish}".` },
    sobremesa: { name: "Vinho de sobremesa", reason: `A doçura residual equilibra e complementa os sabores de "${dish}".` },
  };

  for (const style of matchedStyles) {
    const detail = styleDetails[style] || { name: `Vinho ${style}`, reason: `Sugestão clássica para "${dish}".` };
    genericSuggestions.push({
      wineName: detail.name,
      style,
      reason: detail.reason,
      fromCellar: false,
      match: genericSuggestions.length === 0 ? "muito bom" : "bom",
      harmony_type: harmonyTypes[genericSuggestions.length % 5],
      harmony_label: harmonyLabels[genericSuggestions.length % 5],
      compatibilityLabel: compatLabels[genericSuggestions.length],
    });
    if (genericSuggestions.length >= 3) break;
  }

  while (genericSuggestions.length < 3) {
    const idx = genericSuggestions.length;
    const fallbacks = [
      { name: "Vinho branco aromático", style: "branco", reason: `Para "${dish}", um branco aromático traz frescor e notas frutadas que complementam sem competir.` },
      { name: "Rosé seco e fresco", style: "rosé", reason: `A versatilidade de um rosé seco se adapta naturalmente a "${dish}".` },
      { name: "Espumante brut", style: "espumante", reason: `As bolhas finas limpam o paladar e adicionam frescor a qualquer refeição.` },
    ];
    const fb = fallbacks[idx] || fallbacks[0];
    genericSuggestions.push({
      wineName: fb.name,
      style: fb.style,
      reason: fb.reason,
      fromCellar: false,
      match: "bom",
      harmony_type: harmonyTypes[idx % 5],
      harmony_label: harmonyLabels[idx % 5],
      compatibilityLabel: compatLabels[Math.min(idx, 3)],
    });
  }

  return genericSuggestions;
}

function fallbackPairingsForWine(wine: { name?: string; style?: string | null; grape?: string | null; region?: string | null; producer?: string | null }): PairingResult[] {
  const style = (wine.style || "tinto").toLowerCase();
  const name = wine.name || "Este vinho";
  const grape = wine.grape || "";
  const region = wine.region || "";
  const producer = wine.producer || "";

  const contextParts: string[] = [];
  if (producer) contextParts.push(`produzido por ${producer}`);
  if (grape) contextParts.push(`de ${grape}`);
  if (region) contextParts.push(`da região de ${region}`);
  const context = contextParts.length > 0 ? `${name}, ${contextParts.join(", ")},` : `${name}`;

  const pairingMap: Record<string, PairingResult[]> = {
    tinto: [
      { dish: "Picanha na brasa com sal grosso", reason: `${context} tende a ter taninos que encontram na gordura intramuscular da picanha um parceiro natural — a proteína suaviza a adstringência enquanto o sal amplifica a percepção aromática.`, match: "perfeito", category: "classico", harmony_type: "equilíbrio", harmony_label: "gordura que suaviza taninos" },
      { dish: "Risoto de cogumelos porcini", reason: `As notas terrosas dos cogumelos porcini dialogam com o perfil de ${context} — a manteiga do risoto envolve o vinho e a umami dos funghi amplifica a complexidade.`, match: "perfeito", category: "afinidade", harmony_type: "semelhança", harmony_label: "notas terrosas em sintonia" },
      { dish: "Cordeiro assado com ervas e alho", reason: `A intensidade aromática do cordeiro pede a estrutura que ${context} oferece. Os taninos cortam a gordura natural da carne, renovando o paladar.`, match: "muito bom", category: "classico", harmony_type: "limpeza", harmony_label: "taninos que cortam gordura" },
      { dish: "Ragu de carne com pappardelle", reason: `O cozimento longo do ragu concentra umami e gordura — ${context} funciona como contraponto com sua acidez, renovando o paladar entre garfadas.`, match: "muito bom", category: "classico", harmony_type: "contraste", harmony_label: "acidez vs untuosidade do molho" },
      { dish: "Tábua de queijos maturados", reason: `A gordura e o sal dos queijos maturados neutralizam a adstringência dos taninos de ${context}, revelando camadas aromáticas mais sutis.`, match: "bom", category: "contraste", harmony_type: "complemento", harmony_label: "sal que revela fruta" },
      { dish: "Berinjela à parmegiana gratinada", reason: `A textura macia da berinjela e a acidez do tomate criam uma base que acolhe ${context} sem competir — equilíbrio de peso e intensidade.`, match: "bom", category: "afinidade", harmony_type: "equilíbrio", harmony_label: "peso proporcional" },
    ],
    branco: [
      { dish: "Salmão grelhado com molho de limão siciliano", reason: `A acidez mineral de ${context} espelha o limão do molho, enquanto sua textura realça a delicadeza do salmão sem mascará-la.`, match: "perfeito", category: "afinidade", harmony_type: "semelhança", harmony_label: "citricidade em sintonia" },
      { dish: "Camarão ao alho e óleo com ervas frescas", reason: `O alho dourado e o azeite criam uma gordura sutil que a acidez de ${context} corta com precisão, renovando o paladar.`, match: "perfeito", category: "classico", harmony_type: "limpeza", harmony_label: "acidez que limpa o azeite" },
      { dish: "Ceviche de peixe branco com coentro", reason: `A frescura ácida do ceviche encontra em ${context} um espelho de leveza e vivacidade — ambos trabalham na mesma frequência.`, match: "muito bom", category: "afinidade", harmony_type: "semelhança", harmony_label: "frescor que se espelha" },
      { dish: "Risoto de limão e ervas finas", reason: `A manteiga do risoto pede a acidez de ${context} para equilibrar, enquanto as ervas encontram complemento nos aromas do vinho.`, match: "muito bom", category: "contraste", harmony_type: "complemento", harmony_label: "ervas que se completam" },
      { dish: "Frango ao molho de mostarda e estragão", reason: `A cremosidade do molho de mostarda encontra na acidez de ${context} um contraponto que equilibra sem dominar.`, match: "bom", category: "contraste", harmony_type: "contraste", harmony_label: "acidez vs cremosidade" },
      { dish: "Salada de folhas com queijo de cabra e nozes", reason: `A acidez de ${context} liga os elementos: amargura das folhas, tanginess do queijo de cabra e oleosidade das nozes.`, match: "bom", category: "classico", harmony_type: "equilíbrio", harmony_label: "peso equilibrado" },
    ],
    rosé: [
      { dish: "Salada mediterrânea com azeite e orégano", reason: `A leveza frutada de ${context} espelha a frescura dos vegetais, enquanto sua acidez corta o azeite sem competir.`, match: "perfeito", category: "classico", harmony_type: "semelhança", harmony_label: "frescor mediterrâneo" },
      { dish: "Sushi variado com sashimi", reason: `A versatilidade de ${context} acompanha a variedade textural do sushi sem dominar nenhum elemento individual.`, match: "muito bom", category: "afinidade", harmony_type: "equilíbrio", harmony_label: "versatilidade textural" },
      { dish: "Bruschetta de tomate fresco com manjericão", reason: `A acidez natural do tomate encontra em ${context} um parceiro de mesma intensidade — harmonia despretensiosa e precisa.`, match: "muito bom", category: "afinidade", harmony_type: "semelhança", harmony_label: "acidez em sintonia" },
      { dish: "Frango grelhado com limão e alcaparras", reason: `A proteína branca e o toque ácido das alcaparras pedem ${context} — corpo suficiente para acompanhar sem peso excessivo.`, match: "bom", category: "classico", harmony_type: "complemento", harmony_label: "leveza que complementa" },
      { dish: "Pizza margherita com mozzarella fresca", reason: `A gordura da mozzarella e a acidez do tomate encontram em ${context} o equilíbrio entre frescor e substância.`, match: "bom", category: "contraste", harmony_type: "limpeza", harmony_label: "frescor que limpa gordura" },
    ],
    espumante: [
      { dish: "Ostras frescas com limão", reason: `A salinidade mineral das ostras amplifica a perlage de ${context}, criando uma explosão de frescor — a acidez corta a cremosidade do molusco.`, match: "perfeito", category: "classico", harmony_type: "contraste", harmony_label: "bolhas que amplificam salinidade" },
      { dish: "Salmão defumado com cream cheese e alcaparras", reason: `As bolhas de ${context} agem como micro-limpadores entre a gordura do salmão e a untuosidade do cream cheese.`, match: "perfeito", category: "classico", harmony_type: "limpeza", harmony_label: "perlage que renova o paladar" },
      { dish: "Canapés de patê de foie gras", reason: `A riqueza concentrada do foie gras precisa da acidez vibrante e das bolhas de ${context} para não saturar o paladar.`, match: "muito bom", category: "classico", harmony_type: "contraste", harmony_label: "acidez vs riqueza" },
      { dish: "Tempura de legumes com molho ponzu", reason: `A crocância da tempura e a leveza do ponzu encontram nas bolhas finas de ${context} um parceiro que adiciona textura sem peso.`, match: "muito bom", category: "afinidade", harmony_type: "complemento", harmony_label: "texturas que se complementam" },
      { dish: "Frutas frescas com calda de maracujá", reason: `A acidez tropical do maracujá espelha a vivacidade de ${context}, criando uma sobremesa leve onde ambos se elevam.`, match: "bom", category: "afinidade", harmony_type: "semelhança", harmony_label: "acidez tropical em sintonia" },
      { dish: "Risoto de açafrão com parmesão", reason: `O umami do parmesão e a elegância do açafrão pedem ${context} com corpo para acompanhar sem ser ofuscado.`, match: "bom", category: "contraste", harmony_type: "equilíbrio", harmony_label: "peso proporcional ao umami" },
    ],
  };

  return pairingMap[style] || pairingMap["tinto"]!;
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
    if (isValidPairings(data) && validateWineSpecificity(data, "pairings")) {
      return data;
    }

    const retryData = await request().catch(() => null);
    if (retryData && isValidPairings(retryData) && validateWineSpecificity(retryData, "pairings")) {
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
    if (isValidSuggestions(data) && validateWineSpecificity(data, "suggestions")) {
      return data;
    }

    const retryData = await request().catch(() => null);
    if (retryData && isValidSuggestions(retryData) && validateWineSpecificity(retryData, "suggestions")) {
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
    if (data && Array.isArray(data.dishes) && data.dishes.length > 0 && validateWineSpecificity(data, "menu")) {
      return data;
    }
    const retryData = await request().catch(() => null);
    if (retryData && Array.isArray(retryData.dishes) && retryData.dishes.length > 0 && validateWineSpecificity(retryData, "menu")) {
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
