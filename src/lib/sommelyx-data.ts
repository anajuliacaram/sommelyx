export type SommelyxStyle = "tinto" | "branco" | "rosé" | "espumante" | "sobremesa";

export const styleColor: Record<SommelyxStyle, string> = {
  tinto: "#7B1E2B",
  branco: "#C9B469",
  rosé: "#D89BA0",
  espumante: "#B8C49A",
  sobremesa: "#B4793F",
};

export function normalizeStyleFamily(style?: string | null) {
  const value = (style ?? "").trim().toLowerCase();
  if (value.includes("tint")) return "tinto";
  if (value.includes("branc") || value.includes("white")) return "branco";
  if (value.includes("ros")) return "rosé";
  if (value.includes("espum") || value.includes("champ")) return "espumante";
  if (value.includes("sobrem") || value.includes("fort")) return "sobremesa";
  return null;
}

export function getStyleColor(style?: string | null) {
  const family = normalizeStyleFamily(style);
  if (!family) return "#C5BAAA";
  return styleColor[family];
}

export interface SommelyxWine {
  id: string;
  name: string;
  producer: string;
  country: string;
  region: string;
  grape: string;
  vintage: number;
  style: SommelyxStyle;
  quantity: number;
  purchase_price: number;
  current_value: number;
  rating: number;
  drink_from: number;
  drink_until: number;
  location: string;
  pairing?: string;
  image_url?: string | null;
}

export interface SommelyxConsumption {
  wineId: string;
  wine_name: string;
  consumed_at: string;
  occasion: string;
  rating?: number | null;
}

export interface SommelyxData {
  YEAR?: number;
  wines?: SommelyxWine[];
  consumption?: SommelyxConsumption[];
  countries?: string[];
  styles?: string[];
  metrics?: (list: SommelyxWine[]) => {
    totalBottles: number;
    totalValue: number;
    drinkNow: number;
    inGuard: number;
    pastPeak: number;
  };
  styleColor?: Record<SommelyxStyle, string>;
}

declare global {
  interface Window {
    SOMMELYX_DATA?: SommelyxData;
  }
}

export function getSommelyxData() {
  if (typeof window === "undefined") return null;
  return window.SOMMELYX_DATA ?? null;
}
