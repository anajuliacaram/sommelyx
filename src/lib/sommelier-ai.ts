import { invokeEdgeFunction } from "@/lib/edge-invoke";

// ── Types ──

export interface PairingResult {
  dish: string;
  reason: string;
  match: "perfeito" | "muito bom" | "bom";
}

export interface WineSuggestion {
  wineName: string;
  style: string;
  reason: string;
  fromCellar: boolean;
  match: "perfeito" | "muito bom" | "bom";
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

// ── Compact wine summary for AI context ──

interface WineSummary {
  name: string;
  style?: string | null;
  grape?: string | null;
  country?: string | null;
  region?: string | null;
  producer?: string | null;
  quantity?: number;
}

// ── API Functions ──

export async function getWinePairings(wine: {
  name: string;
  style?: string | null;
  grape?: string | null;
  region?: string | null;
}): Promise<PairingResult[]> {
  const data = await invokeEdgeFunction<{ pairings: PairingResult[] }>(
    "wine-pairings",
    {
      mode: "wine-to-food",
      wineName: wine.name,
      wineStyle: wine.style,
      wineGrape: wine.grape,
      wineRegion: wine.region,
    },
    { timeoutMs: 30_000, retries: 1 },
  );
  return data?.pairings || [];
}

export async function getDishWineSuggestions(
  dish: string,
  userWines?: WineSummary[],
): Promise<WineSuggestion[]> {
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
      })),
    },
    { timeoutMs: 30_000, retries: 1 },
  );
  return data?.suggestions || [];
}

export async function analyzeWineList(
  imageBase64: string,
  userProfile?: {
    topStyles?: string[];
    topGrapes?: string[];
    topCountries?: string[];
    avgPrice?: number;
  },
): Promise<WineListAnalysis> {
  const data = await invokeEdgeFunction<WineListAnalysis>(
    "analyze-wine-list",
    { imageBase64, userProfile },
    { timeoutMs: 60_000, retries: 1 },
  );
  return data || { wines: [], topPick: null, bestValue: null };
}

export async function analyzeMenuForWine(
  imageBase64: string,
  wineName: string,
): Promise<MenuAnalysis> {
  const data = await invokeEdgeFunction<MenuAnalysis>(
    "analyze-wine-list",
    { imageBase64, mode: "menu-for-wine", wineName },
    { timeoutMs: 60_000, retries: 1 },
  );
  return data || { dishes: [], summary: "" };
}

export async function getTasteCompatibility(
  targetWine: WineSummary,
  userCellar: WineSummary[],
): Promise<TasteCompatibility> {
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
    { timeoutMs: 20_000, retries: 1 },
  );
  return data || { compatibility: null, label: "Não disponível", reason: "" };
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
