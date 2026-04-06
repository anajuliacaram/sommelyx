export type StructuredLocation = {
  sector?: string;
  zone?: string;
  level?: string;
  position?: string;
  manualLabel?: string;
};

export function normalizeLocationPart(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function formatLocationLabel(loc: StructuredLocation) {
  const manual = normalizeLocationPart(loc.manualLabel ?? "");
  if (manual) return manual;

  const parts = [
    normalizeLocationPart(loc.sector ?? ""),
    normalizeLocationPart(loc.zone ?? ""),
    normalizeLocationPart(loc.level ?? ""),
    normalizeLocationPart(loc.position ?? ""),
  ].filter(Boolean);

  return parts.length ? parts.join(" • ") : "";
}

