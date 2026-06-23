import { useEffect, useMemo, useRef, useState } from "react";
import { Wine as WineIcon } from "@/icons/lucide";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { invokeEdgeFunction } from "@/lib/edge-invoke";
import { isRenderableWineImageUrl, resolveWineCardImageCandidates } from "@/lib/wine-images";

type WineImageDebugEntry = {
  wineId: string | null;
  wineName: string;
  event: "load" | "error" | "self-heal-start" | "self-heal-success" | "self-heal-error";
  src?: string | null;
  nextUrl?: string | null;
  timestamp: number;
};

declare global {
  interface Window {
    __sommelyxWineImageDebug?: Record<string, WineImageDebugEntry>;
  }
}

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
  if (s.includes("tinto")) return "from-[#3B0710] via-[#6F1024] to-[#241412]";
  if (s.includes("branco")) return "from-[#D8C48A] via-[#EFE2BD] to-[#A7B184]";
  if (s.includes("rose")) return "from-[#C6818E] via-[#E8B8B6] to-[#B87963]";
  if (s.includes("espum")) return "from-[#A7B184] via-[#E8DCB8] to-[#8D9A73]";
  return "from-[#DDD0BA] via-[#F5ECDD] to-[#AFA18E]";
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
  const healingUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIndex(0);
  }, [candidates.join("|"), wine.name]);

  const activeSrc = candidates[index] ?? null;
  const activeRenderable = isRenderableWineImageUrl(activeSrc);
  const showImage = activeRenderable;
  const tone = getFallbackTone(wine.style);

  const recordDebugEvent = (entry: Omit<WineImageDebugEntry, "timestamp">) => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    window.__sommelyxWineImageDebug ??= {};
    window.__sommelyxWineImageDebug[wine.id ?? wine.name] = {
      ...entry,
      timestamp: Date.now(),
    };
  };

  const triggerSelfHeal = async (failedSrc: string) => {
    if (!wine.id) return;
    if (!/^https?:\/\//i.test(failedSrc)) return;
    if (healingUrls.current.has(failedSrc)) return;
    healingUrls.current.add(failedSrc);

    if (import.meta.env.DEV) {
      recordDebugEvent({
        wineId: wine.id ?? null,
        wineName: wine.name,
        event: "self-heal-start",
        src: failedSrc,
      });
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
        recordDebugEvent({
          wineId: wine.id ?? null,
          wineName: wine.name,
          event: isRenderableWineImageUrl(nextUrl) ? "self-heal-success" : "self-heal-error",
          src: failedSrc,
          nextUrl,
        });
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
        recordDebugEvent({
          wineId: wine.id ?? null,
          wineName: wine.name,
          event: "self-heal-error",
          src: failedSrc,
        });
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
          onLoad={() => {
            recordDebugEvent({
              wineId: wine.id ?? null,
              wineName: wine.name,
              event: "load",
              src: activeSrc,
            });
            if (import.meta.env.DEV) {
              console.debug("[WineLabelPreview] img_load", {
                wineId: wine.id ?? null,
                wineName: wine.name,
                src: activeSrc,
              });
            }
          }}
          onError={() => {
            recordDebugEvent({
              wineId: wine.id ?? null,
              wineName: wine.name,
              event: "error",
              src: activeSrc,
            });
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
        <div className={cn("relative flex h-full items-center justify-center bg-gradient-to-br", tone)}>
          <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(120deg,rgba(255,253,248,0.28)_0_1px,transparent_1px_13px),radial-gradient(circle_at_50%_18%,rgba(255,253,248,0.42),transparent_34%)]" />
          <div className="absolute bottom-[14%] h-4 w-20 rounded-full bg-black/20 blur-md" />
          <div className="relative grid h-[72%] min-h-[86px] w-[48%] min-w-[46px] max-w-[82px] grid-rows-[1fr_auto] overflow-hidden rounded-t-[999px] rounded-b-[18px] border border-white/35 bg-[rgba(255,253,248,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_18px_34px_-28px_rgba(0,0,0,0.48)] backdrop-blur-sm">
            <div className="mx-auto mt-[18%] h-[42%] w-[46%] rounded-t-[999px] rounded-b-[9px] bg-[rgba(255,253,248,0.24)]" />
            <div className="m-2 rounded-[12px] bg-[rgba(255,248,239,0.88)] px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(122, 18, 36,0.12)] text-[#7a1224]">
                <WineIcon className="h-3 w-3" />
              </div>
              <p className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-[#4D0814]">Sommelyx</p>
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
