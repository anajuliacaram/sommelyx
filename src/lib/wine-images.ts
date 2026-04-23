type WineImageLike = {
  image_url?: string | null;
  imageUrl?: string | null;
  label_image_url?: string | null;
  resolved_image_url?: string | null;
  entries?: Array<{
    image_url?: string | null;
    imageUrl?: string | null;
    label_image_url?: string | null;
    resolved_image_url?: string | null;
  }>;
};

function normalizeUrl(value?: string | null) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : null;
}

function isPlaceholderLike(url: string) {
  return (
    url.startsWith("data:image/svg+xml") ||
    /alert\.jpg|placeholder|notfound|not[-_]?found|404\.|missing|sprite|favicon/i.test(url)
  );
}

export function isRenderableWineImageUrl(url?: string | null) {
  const normalized = normalizeUrl(url);
  if (!normalized) return false;
  return /^https?:\/\//i.test(normalized) && !isPlaceholderLike(normalized);
}

export function resolveWineCardImageCandidates(wine: WineImageLike) {
  const candidates = [
    wine.image_url,
    wine.imageUrl,
    wine.resolved_image_url,
    wine.label_image_url,
    ...(wine.entries ?? []).flatMap((entry) => [
      entry.image_url,
      entry.imageUrl,
      entry.resolved_image_url,
      entry.label_image_url,
    ]),
  ]
    .map(normalizeUrl)
    .filter((value): value is string => Boolean(value));

  const renderable = candidates.filter((url) => isRenderableWineImageUrl(url));
  const placeholders = candidates.filter((url) => isPlaceholderLike(url));
  return [...renderable, ...placeholders];
}

export function resolveWineCardImage(wine: WineImageLike) {
  return resolveWineCardImageCandidates(wine)[0] ?? null;
}
