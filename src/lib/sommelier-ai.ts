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
    lower.includes("sem conexão") ||
    lower.includes("failed to send")
  ) {
    return { type: "network", message: "Sem conexão. Verifique sua internet." };
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
}

const PAIRING_RULES: { keywords: string[]; styles: string[]; explanation: string }[] = [
  { keywords: ["carne", "churrasco", "picanha", "costela", "bife", "cordeiro", "assado"], styles: ["tinto"], explanation: "Vinhos tintos encorpados complementam carnes vermelhas grelhadas" },
  { keywords: ["peixe", "salmão", "atum", "bacalhau", "camarão", "frutos do mar", "marisco", "lula"], styles: ["branco", "espumante", "rosé"], explanation: "Brancos e espumantes realçam a delicadeza de peixes e frutos do mar" },
  { keywords: ["massa", "pasta", "risoto", "lasanha", "nhoque"], styles: ["tinto", "branco"], explanation: "Massas são versáteis e harmonizam com tintos de corpo médio ou brancos encorpados" },
  { keywords: ["pizza"], styles: ["tinto", "rosé"], explanation: "Pizzas pedem tintos jovens e frutados ou rosés refrescantes" },
  { keywords: ["salada", "legume", "vegetal", "vegetariano"], styles: ["branco", "rosé", "espumante"], explanation: "Saladas e vegetais combinam com vinhos leves e frescos" },
  { keywords: ["queijo", "fondue", "tábua"], styles: ["tinto", "branco", "espumante"], explanation: "Queijos harmonizam bem com tintos maduros ou espumantes" },
  { keywords: ["sobremesa", "chocolate", "doce", "torta", "bolo"], styles: ["sobremesa", "tinto"], explanation: "Sobremesas pedem vinhos doces ou tintos com notas frutadas" },
  { keywords: ["frango", "ave", "peru"], styles: ["branco", "rosé", "tinto"], explanation: "Aves são versáteis e aceitam brancos encorpados ou tintos leves" },
  { keywords: ["sushi", "japonesa", "oriental"], styles: ["branco", "espumante", "rosé"], explanation: "Culinária japonesa combina com brancos minerais e espumantes secos" },
];

function fallbackPairingsForDish(dish: string, cellarWines?: WineSummary[]): WineSuggestion[] {
  const lower = dish.toLowerCase();
  const matchedRules = PAIRING_RULES.filter((r) => r.keywords.some((k) => lower.includes(k)));
  const rules = matchedRules.length > 0 ? matchedRules : PAIRING_RULES.slice(0, 2);

  const matchedStyles = new Set(rules.flatMap((r) => r.styles));
  const explanation = rules[0]?.explanation || "Sugestão baseada em regras clássicas de harmonização";

  // Try cellar wines first
  if (cellarWines?.length) {
    const cellarMatches = cellarWines.filter(
      (w) => w.style && matchedStyles.has(w.style.toLowerCase()),
    );

    if (cellarMatches.length > 0) {
      return cellarMatches.slice(0, 5).map((w, i) => ({
        wineName: w.name,
        style: w.style || "tinto",
        reason: explanation,
        fromCellar: true,
        match: i === 0 ? "muito bom" : "bom",
      }));
    }
  }

  // Generic suggestions
  const genericSuggestions: WineSuggestion[] = [];
  const styleNames: Record<string, string> = {
    tinto: "Vinho tinto encorpado",
    branco: "Vinho branco seco",
    rosé: "Vinho rosé refrescante",
    espumante: "Espumante brut",
    sobremesa: "Vinho de sobremesa",
  };

  for (const style of matchedStyles) {
    genericSuggestions.push({
      wineName: styleNames[style] || `Vinho ${style}`,
      style,
      reason: explanation,
      fromCellar: false,
      match: genericSuggestions.length === 0 ? "muito bom" : "bom",
    });
    if (genericSuggestions.length >= 3) break;
  }

  // Ensure at least 3
  while (genericSuggestions.length < 3) {
    const fallbacks = ["Vinho tinto de corpo médio", "Vinho branco frutado", "Espumante seco"];
    const fb = fallbacks[genericSuggestions.length] || "Vinho versátil";
    genericSuggestions.push({
      wineName: fb,
      style: "tinto",
      reason: "Sugestão versátil que harmoniza com diversos pratos",
      fromCellar: false,
      match: "bom",
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
