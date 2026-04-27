import { useEffect, useMemo, useRef, useState } from "react";
import { Wine as WineIcon } from "@/icons/lucide";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { invokeEdgeFunction } from "@/lib/edge-invoke";
import { isRenderableWineImageUrl, resolveWineCardImageCandidates } from "@/lib/wine-images";

type WineLabelPreviewProps = {
  wine: {
    id?: string;
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
  const queryClient = useQueryClient();
  const candidates = useMemo(() => resolveWineCardImageCandidates(wine), [wine]);
  const [index, setIndex] = useState(0);
  const [lastEvent, setLastEvent] = useState<"idle" | "load" | "error">("idle");
  const healingUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIndex(0);
    setLastEvent("idle");
  }, [candidates.join("|"), wine.name]);

  const activeSrc = candidates[index] ?? null;
  const activeRenderable = isRenderableWineImageUrl(activeSrc);
  const showImage = activeRenderable;
  const tone = getFallbackTone(wine.style);

  const triggerSelfHeal = async (failedSrc: string) => {
    if (!wine.id) return;
    if (!/^https?:\/\//i.test(failedSrc)) return;
    if (healingUrls.current.has(failedSrc)) return;
    healingUrls.current.add(failedSrc);

    if (import.meta.env.DEV) {
      console.debug("[WineLabelPreview] self_heal_start", {
        wineId: wine.id,
        wineName: wine.name,
        failedSrc,
      });
    }

    try {
      const result = await invokeEdgeFunction<{
        ok?: boolean;
        image_url?: string | null;
        source?: string | null;
      }>(
        "wine-image-resolver",
        { wineId: wine.id, force: true, failedUrl: failedSrc },
        { timeoutMs: 30_000, retries: 0 },
      );

      const nextUrl = result?.image_url ?? null;
      if (isRenderableWineImageUrl(nextUrl)) {
        queryClient.setQueriesData<any[]>({ queryKey: ["wines"] }, (current) => {
          if (!current) return current;
          return current.map((item) => (item?.id === wine.id ? { ...item, image_url: nextUrl } : item));
        });
      }

      if (import.meta.env.DEV) {
        console.debug("[WineLabelPreview] self_heal_result", {
          wineId: wine.id,
          wineName: wine.name,
          failedSrc,
          nextUrl,
          source: result?.source ?? null,
          renderable: isRenderableWineImageUrl(nextUrl),
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug("[WineLabelPreview] self_heal_error", {
          wineId: wine.id,
          wineName: wine.name,
          failedSrc,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      const fields = {
        id: wine.id ?? null,
        name: wine.name,
        image: wine.image ?? null,
        image_url: wine.image_url ?? null,
        imageUrl: wine.imageUrl ?? null,
        uploaded_image: wine.uploaded_image ?? null,
        uploaded_image_url: wine.uploaded_image_url ?? null,
        user_image_url: wine.user_image_url ?? null,
        photo_url: wine.photo_url ?? null,
        persisted_image_url: wine.persisted_image_url ?? null,
        label_image_url: wine.label_image_url ?? null,
        label_url: wine.label_url ?? null,
        resolved_image_url: wine.resolved_image_url ?? null,
        fallback_image: wine.fallback_image ?? null,
        entriesCount: Array.isArray(wine.entries) ? wine.entries.length : 0,
        candidateCount: candidates.length,
        activeSrc: activeSrc ? activeSrc.slice(0, 80) : null,
        activeRenderable,
      };
      console.debug("[WineLabelPreview] image_fields", fields);
    }
  }, [activeRenderable, activeSrc, candidates.length, wine.image, wine.image_url, wine.imageUrl, wine.uploaded_image, wine.uploaded_image_url, wine.user_image_url, wine.photo_url, wine.persisted_image_url, wine.label_image_url, wine.label_url, wine.resolved_image_url, wine.fallback_image, wine.entries]);

  return (
    <div className={cn("relative overflow-hidden bg-[#F7F3EC]", compact ? "rounded-[16px]" : "rounded-[22px]", className)}>
      {showImage ? (
        <img
          src={activeSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onLoad={() => {
            setLastEvent("load");
            if (import.meta.env.DEV) {
              console.debug("[WineLabelPreview] img_load", {
                wineId: wine.id ?? null,
                wineName: wine.name,
                src: activeSrc,
              });
            }
          }}
          onError={() => {
            setLastEvent("error");
            if (import.meta.env.DEV) {
              console.debug("[WineLabelPreview] img_error", {
                wineId: wine.id ?? null,
                wineName: wine.name,
                failedSrc: activeSrc,
                nextIndex: Math.min(index + 1, candidates.length),
              });
            }
            if (activeSrc) {
              void triggerSelfHeal(activeSrc);
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
      {import.meta.env.DEV ? (
        <div className="absolute bottom-2 left-2 right-2 rounded-[10px] bg-black/6 px-2 py-1 text-[9px] leading-tight text-[#6F665C] backdrop-blur-sm">
          {lastEvent === "load" ? "load:ok" : lastEvent === "error" ? "load:error" : "load:idle"} ·{" "}
          {activeSrc ? activeSrc.slice(0, 52) : "null"}
        </div>
      ) : null}
    </div>
  );
}
