type WineImageLike = {
  image?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  uploaded_image?: string | null;
  uploaded_image_url?: string | null;
  user_image_url?: string | null;
  photo_url?: string | null;
  persisted_image_url?: string | null;
  label_image_url?: string | null;
  label_url?: string | null;
  resolved_image_url?: string | null;
  fallback_image?: string | null;
  entries?: Array<{
    image?: string | null;
    image_url?: string | null;
    imageUrl?: string | null;
    uploaded_image?: string | null;
    uploaded_image_url?: string | null;
    user_image_url?: string | null;
    photo_url?: string | null;
    persisted_image_url?: string | null;
    label_image_url?: string | null;
    label_url?: string | null;
    resolved_image_url?: string | null;
    fallback_image?: string | null;
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
    wine.image,
    wine.uploaded_image,
    wine.uploaded_image_url,
    wine.user_image_url,
    wine.photo_url,
    wine.image_url,
    wine.persisted_image_url,
    wine.imageUrl,
    wine.label_url,
    wine.label_image_url,
    wine.resolved_image_url,
    wine.fallback_image,
    ...(wine.entries ?? []).flatMap((entry) => [
      entry.image,
      entry.uploaded_image,
      entry.uploaded_image_url,
      entry.user_image_url,
      entry.photo_url,
      entry.image_url,
      entry.persisted_image_url,
      entry.imageUrl,
      entry.label_url,
      entry.label_image_url,
      entry.resolved_image_url,
      entry.fallback_image,
    ]),
  ]
    .map(normalizeUrl)
    .filter((value): value is string => Boolean(value));

  const uniqueCandidates = Array.from(new Set(candidates));
  const renderable = uniqueCandidates.filter((url) => isRenderableWineImageUrl(url));
  const placeholders = uniqueCandidates.filter((url) => isPlaceholderLike(url));
  return [...renderable, ...placeholders];
}

export function resolveWineCardImage(wine: WineImageLike) {
  return resolveWineCardImageCandidates(wine)[0] ?? null;
}
