import { useEffect, useMemo, useState } from "react";
import { Wine as WineIcon } from "@/icons/lucide";
import { cn } from "@/lib/utils";
import { isRenderableWineImageUrl, resolveWineCardImageCandidates } from "@/lib/wine-images";

type WineLabelPreviewProps = {
  wine: {
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
    name: string;
    style?: string | null;
  };
  alt: string;
  className?: string;
  imageClassName?: string;
  generated?: boolean;
  compact?: boolean;
};

function getFallbackTone(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return "bg-[#7B1E3A]";
  if (s.includes("branco")) return "bg-[#DDBD74]";
  if (s.includes("rose")) return "bg-[#C97A93]";
  if (s.includes("espum")) return "bg-[#B8A06A]";
  return "bg-[#C5BAAA]";
}

export function WineLabelPreview({
  wine,
  alt,
  className,
  imageClassName,
  generated = false,
  compact = false,
}: WineLabelPreviewProps) {
  const candidates = useMemo(() => resolveWineCardImageCandidates(wine), [wine]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates.join("|"), wine.name]);

  const activeSrc = candidates[index] ?? null;
  const showImage = !!activeSrc;
  const tone = getFallbackTone(wine.style);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const fields = {
        image_url: wine.image_url ?? null,
        imageUrl: wine.imageUrl ?? null,
        label_image_url: wine.label_image_url ?? null,
        resolved_image_url: wine.resolved_image_url ?? null,
        entriesCount: Array.isArray(wine.entries) ? wine.entries.length : 0,
        candidateCount: candidates.length,
        activeSrc: activeSrc ? activeSrc.slice(0, 80) : null,
        activeRenderable: isRenderableWineImageUrl(activeSrc),
      };
      console.debug("[WineLabelPreview] image_fields", fields);
    }
  }, [activeSrc, candidates.length, wine.image_url, wine.imageUrl, wine.label_image_url, wine.resolved_image_url, wine.entries]);

  return (
    <div className={cn("relative overflow-hidden bg-[#F7F3EC]", compact ? "rounded-[16px]" : "rounded-[22px]", className)}>
      {showImage ? (
        <img
          src={activeSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            if (import.meta.env.DEV) {
              console.debug("[WineLabelPreview] img_load", {
                wineName: wine.name,
                src: activeSrc,
              });
            }
          }}
          onError={() => {
            if (import.meta.env.DEV) {
              console.debug("[WineLabelPreview] img_error", {
                wineName: wine.name,
                failedSrc: activeSrc,
                nextIndex: Math.min(index + 1, candidates.length),
              });
            }
            setIndex((current) => Math.min(current + 1, candidates.length));
          }}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      ) : (
        <div className={cn("flex h-full items-center justify-center", tone)}>
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-white/65 px-4 py-3 text-center shadow-[0_10px_24px_-20px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#7B1E2B]">
              <WineIcon className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6F6A60]">Rótulo indisponível</p>
              <p className="text-[10px] font-medium text-[#8A8276]">Prévia ilustrativa</p>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F4F1EC] via-[#F4F1EC]/75 to-transparent" />
      {generated && activeSrc ? (
        <div className="absolute right-3 top-3 rounded-full border border-black/5 bg-white/72 px-2 py-1 text-[9px] font-medium text-[#6F6A60] shadow-[0_8px_18px_-16px_rgba(0,0,0,0.18)] backdrop-blur-sm">
          Imagem ilustrativa
        </div>
      ) : null}
    </div>
  );
}
