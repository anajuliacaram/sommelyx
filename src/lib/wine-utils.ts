export const WINE_TYPE_COLORS: Record<string, string> = {
  tinto: "#7B1E2B",
  branco: "#C9B469",
  rose: "#D89BA0",
  "rosé": "#D89BA0",
  espumante: "#B8C49A",
  sobremesa: "#C47B3A",
  fortificado: "#8B6914",
};

function normalizeWineType(style: string | null | undefined): string {
  return (style || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getWineTypeColor(style: string | null | undefined): string {
  const normalized = normalizeWineType(style);
  if (normalized.includes("tinto") || normalized.includes("red")) return WINE_TYPE_COLORS.tinto;
  if (normalized.includes("branco") || normalized.includes("white")) return WINE_TYPE_COLORS.branco;
  if (normalized.includes("rose") || normalized.includes("rosado")) return WINE_TYPE_COLORS.rose;
  if (normalized.includes("espumante") || normalized.includes("sparkling") || normalized.includes("champagne")) return WINE_TYPE_COLORS.espumante;
  if (normalized.includes("sobremesa") || normalized.includes("dessert")) return WINE_TYPE_COLORS.sobremesa;
  if (normalized.includes("fortificado") || normalized.includes("fortified") || normalized.includes("porto")) return WINE_TYPE_COLORS.fortificado;
  return WINE_TYPE_COLORS[normalized] ?? "#AEA79F";
}

export function getWineTypeBg(style: string | null | undefined): string {
  const color = getWineTypeColor(style);
  return `${color}1A`;
}
