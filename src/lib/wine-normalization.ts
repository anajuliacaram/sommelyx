type WineTextInput = string | null | undefined;

export type WineLike = Record<string, any>;

function squeezeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) =>
      part
        .split(/([-/])/)
        .map((segment) => {
          if (segment === "-" || segment === "/") return segment;
          if (!segment) return segment;
          return segment
            .split("'")
            .map((token) => {
              if (!token) return token;
              return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
            })
            .join("'");
        })
        .join("")
    )
    .join(" ");
}

export function normalizeWineSearchText(value?: WineTextInput) {
  if (typeof value !== "string") return "";
  return squeezeWhitespace(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWineText(value?: WineTextInput) {
  if (typeof value !== "string") return undefined;
  const cleaned = squeezeWhitespace(value);
  return cleaned ? toTitleCase(cleaned) : undefined;
}

export function normalizeWineData<T extends WineLike>(wine: T, options?: { log?: boolean }): T {
  const normalized = {
    ...wine,
    name: normalizeWineText(wine?.name || wine?.wine_name),
    producer: normalizeWineText(wine?.producer || wine?.winery) ?? null,
    grape: normalizeWineText(wine?.grape || wine?.varietal) ?? null,
    country: normalizeWineText(wine?.country || wine?.pais || wine?.["país"]) ?? null,
    region: normalizeWineText(wine?.region || wine?.regiao || wine?.["região"]) ?? null,
    style: typeof wine?.style === "string" ? squeezeWhitespace(wine.style).toLowerCase() : (wine?.style ?? null),
    cellar_location: normalizeWineText(wine?.cellar_location || wine?.location) ?? null,
    food_pairing: normalizeWineText(wine?.food_pairing || wine?.pairing) ?? null,
    tasting_notes: normalizeWineText(wine?.tasting_notes || wine?.notes) ?? null,
  } as T;

  if (options?.log && import.meta.env.DEV) {
    console.log("NORMALIZED:", normalized);
  }

  return normalized;
}
