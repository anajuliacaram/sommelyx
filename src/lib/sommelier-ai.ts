import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edge-invoke";
import type { AiAnalysisAttachmentPayload } from "@/lib/ai-attachments";

// ── Types ──

export interface PairingResult {
  dish: string;
  reason: string;
  match: "perfeito" | "muito bom" | "bom";
  harmony_type?: "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza";
  harmony_label?: string;
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
  pairings?: string[];
  verdict: string;
  compatibility: number;
  highlight?: "best-value" | "top-pick" | "adventurous" | null;
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
}

export interface MenuAnalysis {
  dishes: MenuDishItem[];
  summary: string;
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
  if (
    lower.includes("tempo limite") ||
    lower.includes("timeout") ||
    lower.includes("demorou mais")
  ) {
    return { type: "timeout", message: "A busca demorou mais que o esperado. Tente novamente." };
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("sem conexão")
  ) {
    return { type: "network", message: "Sem conexão. Verifique sua internet." };
  }
  if (lower.includes("failed to send")) {
    return { type: "ai_fail", message: "A solicitação não pôde ser enviada. Tente novamente." };
  }
  if (
    lower.includes("créditos") ||
    lower.includes("esgotados") ||
    lower.includes("ai gateway error") ||
    lower.includes("não conseguimos")
  ) {
    return { type: "ai_fail", message: "Não conseguimos gerar a sugestão agora. Tente novamente em instantes." };
  }
  return { type: "unknown", message: "Não conseguimos gerar a sugestão agora." };
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

// Analysis helpers for building dish-aware explanations
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
  const parts: string[] = [];

  // Wine-specific opening
  if (grape && region) {
    parts.push(`${w.name}, um ${style} de ${grape} da região de ${region}, traz um perfil sensorial distinto para esta harmonização.`);
  } else if (grape) {
    parts.push(`A uva ${grape} confere a este ${style} características que interagem de forma específica com "${dish}".`);
  } else {
    parts.push(`Este ${style || "vinho"} possui estrutura que dialoga com os componentes de "${dish}".`);
  }

  // Dish-specific interaction based on harmony type
  if (harmonyType === "contraste") {
    if (analysis.fat === "alta" || analysis.fat === "moderada") {
      parts.push(`A acidez do vinho funciona em contraste com a ${analysis.fat === "alta" ? "gordura pronunciada" : "textura untuosa"} do prato, limpando o paladar entre cada garfada.`);
    } else {
      parts.push(`O corpo do vinho cria um contraste de texturas com a leveza do prato, adicionando camadas de complexidade.`);
    }
  } else if (harmonyType === "semelhança") {
    if (style === "branco" && analysis.intensity === "leve") {
      parts.push(`A delicadeza deste branco espelha a leveza do prato — ambos se encontram na mesma faixa de intensidade, sem que um se sobreponha ao outro.`);
    } else {
      parts.push(`O peso e a intensidade do vinho espelham a robustez do prato, criando uma experiência onde nenhum elemento domina.`);
    }
  } else if (harmonyType === "complemento") {
    if (analysis.flavors.length > 0) {
      parts.push(`Os aromas do vinho complementam ${analysis.flavors[0]}, criando uma experiência mais completa e integrada no paladar.`);
    } else {
      parts.push(`As notas aromáticas do vinho adicionam uma dimensão extra aos sabores do prato, completando a experiência gustativa.`);
    }
  } else if (harmonyType === "equilíbrio") {
    parts.push(`O corpo ${style === "tinto" ? "encorpado" : "médio"} do vinho mantém proporção equilibrada com a intensidade de "${dish}", sem dominar nem desaparecer.`);
  } else {
    parts.push(`A acidez natural do vinho reseta o paladar entre cada mordida, renovando a percepção dos sabores do prato.`);
  }

  // Vintage context
  if (w.vintage) {
    const age = new Date().getFullYear() - w.vintage;
    if (age > 5) parts.push(`Com ${age} anos de evolução, seus taninos estão mais integrados e suaves.`);
    else if (age <= 2) parts.push(`Sendo um vinho jovem, preserva frescor e vivacidade que complementam o prato.`);
  }

  return parts.join(" ");
}

function fallbackPairingsForDish(dish: string, cellarWines?: WineSummary[]): WineSuggestion[] {
  const lower = dish.toLowerCase();
  const matchedRules = PAIRING_RULES.filter((r) => r.keywords.some((k) => lower.includes(k)));
  // If no keyword matches, use versatile/generic rules instead of defaulting to meat
  const rules = matchedRules.length > 0 ? matchedRules : [
    { keywords: [], styles: ["branco", "rosé", "tinto"], explanation: "Para pratos do dia a dia, vinhos versáteis de corpo leve a médio são seguros" },
  ];

  const matchedStyles = new Set(rules.flatMap((r) => r.styles));

  const harmonyTypes = ["equilíbrio", "complemento", "contraste", "semelhança", "limpeza"] as const;
  const harmonyLabels = ["peso proporcional", "aromas complementares", "opostos que equilibram", "texturas semelhantes", "paladar renovado"];

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
      }));
    }
  }

  const analysis = analyzeDish(dish);
  const genericSuggestions: WineSuggestion[] = [];
  const styleDetails: Record<string, { name: string; reason: string }> = {
    tinto: { name: "Vinho tinto de corpo médio", reason: `Para "${dish}" (intensidade ${analysis.intensity}), um tinto de corpo médio oferece taninos suaves que ${analysis.protein === "ovo" ? "contrastam com a cremosidade do ovo" : analysis.fat === "alta" ? "equilibram a gordura da proteína" : "complementam os sabores sem dominar"}. ${analysis.flavors.length > 0 ? `A ${analysis.flavors[0]} do prato se beneficia da estrutura do vinho.` : "Procure exemplares com boa acidez para manter o frescor."}` },
    branco: { name: "Vinho branco seco", reason: `A acidez cítrica de um branco seco ${analysis.protein === "ovo" ? "corta a textura rica do ovo, trazendo leveza" : analysis.protein === "peixe" ? "realça a frescura do peixe sem competir" : `traz frescor e contraste para "${dish}"`}. ${analysis.cooking ? `O preparo ${analysis.cooking} do prato pede essa vivacidade mineral.` : "Prefira exemplares com boa mineralidade."}` },
    rosé: { name: "Vinho rosé seco", reason: `Um rosé seco oferece o equilíbrio ideal para "${dish}" — ${analysis.intensity === "leve" ? "sua delicadeza espelha a leveza do prato" : "corpo suficiente para acompanhar sem dominar"}. ${analysis.protein === "ovo" ? "A frutosidade sutil complementa a simplicidade reconfortante do ovo." : "Versatilidade que se adapta aos diferentes componentes."}` },
    espumante: { name: "Espumante brut", reason: `A perlage fina funciona como limpador natural do paladar entre cada garfada de "${dish}". ${analysis.fat !== "leve" ? "As bolhas cortam a untuosidade e renovam a percepção gustativa." : "A acidez viva traz energia e contraste ao prato."}` },
    sobremesa: { name: "Vinho de sobremesa", reason: `A doçura residual equilibra e complementa os sabores de "${dish}", criando um final harmonioso.` },
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
    });
    if (genericSuggestions.length >= 3) break;
  }

  while (genericSuggestions.length < 3) {
    const idx = genericSuggestions.length;
    const fallbacks = [
      { name: "Vinho branco aromático", style: "branco", reason: `Para "${dish}", um branco aromático traz frescor e notas frutadas que complementam pratos do cotidiano sem competir com os sabores principais.` },
      { name: "Rosé seco e fresco", style: "rosé", reason: `A versatilidade de um rosé seco se adapta naturalmente a "${dish}" — corpo leve o suficiente para não dominar, mas com personalidade.` },
      { name: "Espumante brut", style: "espumante", reason: `As bolhas finas de um espumante brut limpam o paladar e adicionam uma dimensão de frescor a qualquer refeição.` },
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
    });
  }

  return genericSuggestions;
}

function fallbackPairingsForWine(wine: { style?: string | null }): PairingResult[] {
  const style = (wine.style || "tinto").toLowerCase();
  const pairingMap: Record<string, PairingResult[]> = {
    tinto: [
      { dish: "Picanha na brasa", reason: "Carnes vermelhas grelhadas são clássicas com tintos encorpados", match: "perfeito" },
      { dish: "Risoto de cogumelos", reason: "Cogumelos e tintos compartilham notas terrosas", match: "muito bom" },
      { dish: "Queijos maturados", reason: "Taninos equilibram a gordura do queijo", match: "bom" },
    ],
    branco: [
      { dish: "Salmão grelhado", reason: "Brancos realçam a delicadeza do peixe", match: "perfeito" },
      { dish: "Frutos do mar", reason: "Acidez e frescor complementam frutos do mar", match: "muito bom" },
      { dish: "Salada Caesar", reason: "Brancos leves harmonizam com saladas", match: "bom" },
    ],
    rosé: [
      { dish: "Salada mediterrânea", reason: "Rosés frescos combinam com refeições leves", match: "perfeito" },
      { dish: "Sushi variado", reason: "Versatilidade do rosé acompanha a culinária japonesa", match: "muito bom" },
      { dish: "Pizza margherita", reason: "Rosé é perfeito para pizzas leves", match: "bom" },
    ],
    espumante: [
      { dish: "Ostras frescas", reason: "Espumante é o par perfeito para ostras", match: "perfeito" },
      { dish: "Salmão defumado", reason: "As borbulhas limpam o paladar entre as mordidas", match: "muito bom" },
      { dish: "Frutas frescas", reason: "Espumante com frutas é uma combinação clássica", match: "bom" },
    ],
  };

  return pairingMap[style] || pairingMap["tinto"]!;
}

// ── Validation helpers ──

function isValidPairings(data: unknown): data is { pairings: PairingResult[] } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.pairings) || d.pairings.length === 0) return false;
  return d.pairings.every(
    (p: any) => typeof p.dish === "string" && p.dish.length > 0,
  );
}

function isValidSuggestions(data: unknown): data is { suggestions: WineSuggestion[] } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.suggestions) || d.suggestions.length === 0) return false;
  return d.suggestions.every(
    (s: any) => typeof s.wineName === "string" && s.wineName.length > 0,
  );
}

// ── API Functions with Fallback ──

export async function getWinePairings(wine: {
  name: string;
  style?: string | null;
  grape?: string | null;
  region?: string | null;
}): Promise<PairingResult[]> {
  try {
    const data = await invokeEdgeFunction<{ pairings: PairingResult[] }>(
      "wine-pairings",
      {
        mode: "wine-to-food",
        wineName: wine.name,
        wineStyle: wine.style,
        wineGrape: wine.grape,
        wineRegion: wine.region,
      },
      { timeoutMs: 20_000, retries: 1 },
    );

    if (isValidPairings(data)) {
      return data.pairings;
    }

    // Invalid AI response → fallback
    console.warn("[sommelier-ai] Invalid AI pairing response, using fallback");
    return fallbackPairingsForWine(wine);
  } catch (err) {
    const classified = classifyError(err);
    console.warn("[sommelier-ai] getWinePairings error:", classified.type, classified.message);

    // Auth errors should propagate
    if (classified.type === "auth") throw new Error(classified.message);

    // All other errors → fallback
    return fallbackPairingsForWine(wine);
  }
}

export async function getDishWineSuggestions(
  dish: string,
  userWines?: WineSummary[],
): Promise<WineSuggestion[]> {
  try {
    const data = await invokeEdgeFunction<{ suggestions: WineSuggestion[] }>(
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
      { timeoutMs: 20_000, retries: 1 },
    );

    if (isValidSuggestions(data)) {
      return data.suggestions;
    }

    console.warn("[sommelier-ai] Invalid AI suggestion response, using fallback");
    return fallbackPairingsForDish(dish, userWines);
  } catch (err) {
    const classified = classifyError(err);
    console.warn("[sommelier-ai] getDishWineSuggestions error:", classified.type, classified.message);

    if (classified.type === "auth") throw new Error(classified.message);

    return fallbackPairingsForDish(dish, userWines);
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
    const data = await invokeEdgeFunction<WineListAnalysis>(
      "analyze-wine-list",
      { ...attachment, userProfile },
      { timeoutMs: 45_000, retries: 1 },
    );
    if (data && Array.isArray(data.wines) && data.wines.length > 0) {
      return data;
    }
    throw new Error("Resposta vazia da análise");
  } catch (err) {
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
    const data = await invokeEdgeFunction<MenuAnalysis>(
      "analyze-wine-list",
      { ...attachment, mode: "menu-for-wine", wineName },
      { timeoutMs: 45_000, retries: 1 },
    );
    if (data && Array.isArray(data.dishes) && data.dishes.length > 0) {
      return data;
    }
    throw new Error("Nenhum prato encontrado no cardápio");
  } catch (err) {
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
    const data = await invokeEdgeFunction<WineInsight>(
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
    if (data && (data.insight || data.recommendation)) {
      return data;
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
