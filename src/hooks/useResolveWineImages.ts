import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invokeEdgeFunction } from "@/lib/edge-invoke";
import type { Wine } from "@/hooks/useWines";
import { isRenderableWineImageUrl, resolveWineCardImage } from "@/lib/wine-images";

/**
 * Em background, dispara `wine-image-resolver` para vinhos sem imagem real.
 * Considera "sem imagem real" quando image_url é nulo/vazio ou um SVG fallback (data:image/svg+xml).
 * Limita a concorrência e processa apenas uma vez por sessão por vinho.
 */
export function useResolveWineImages(wines: Wine[] | undefined) {
  const queryClient = useQueryClient();
  const processed = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!wines || wines.length === 0) return;

    const candidates = wines.filter((w) => {
      if (!w?.id) return false;
      if (processed.current.has(w.id)) return false;
      const resolved = resolveWineCardImage(w);
      const renderable = isRenderableWineImageUrl(resolved);
        if (import.meta.env.DEV) {
          console.debug("[useResolveWineImages] candidate_check", {
            wineId: w.id,
            wineName: w.name,
            image: (w as any).image ?? null,
            image_url: w.image_url ?? null,
            imageUrl: (w as any).imageUrl ?? null,
            uploaded_image: (w as any).uploaded_image ?? null,
            uploaded_image_url: (w as any).uploaded_image_url ?? null,
            user_image_url: (w as any).user_image_url ?? null,
            photo_url: (w as any).photo_url ?? null,
            persisted_image_url: (w as any).persisted_image_url ?? null,
            label_image_url: (w as any).label_image_url ?? null,
            label_url: (w as any).label_url ?? null,
            resolved_image_url: (w as any).resolved_image_url ?? null,
            fallback_image: (w as any).fallback_image ?? null,
            resolvedCandidate: resolved,
            renderable,
          });
        }
      return !renderable;
    });

    if (candidates.length === 0) return;

    let cancelled = false;
    const CONCURRENCY = 2;
    let index = 0;

    const runNext = async () => {
      if (cancelled) return;
      const i = index++;
      if (i >= candidates.length) return;
      const wine = candidates[i];
      processed.current.add(wine.id);
      try {
        const result = await invokeEdgeFunction<{
          ok?: boolean;
          image_url?: string | null;
          source?: string;
          source_url?: string | null;
          duration_ms?: number;
        }>(
          "wine-image-resolver",
          { wineId: wine.id },
          { timeoutMs: 30_000, retries: 0 },
        );
        const resolvedImageUrl = result?.image_url ?? null;
        const resolvedRenderable = isRenderableWineImageUrl(resolvedImageUrl);

        if (import.meta.env.DEV) {
          console.debug("[useResolveWineImages] resolver_success", {
            wineId: wine.id,
            wineName: wine.name,
            source: result?.source ?? null,
            imageUrl: resolvedImageUrl,
            renderable: resolvedRenderable,
          });
        }

        if (resolvedRenderable) {
          queryClient.setQueriesData<Wine[]>({ queryKey: ["wines"] }, (current) => {
            if (!current) return current;
            return current.map((item) =>
              item.id === wine.id ? { ...item, image_url: resolvedImageUrl ?? item.image_url } : item,
            );
          });
          if (import.meta.env.DEV) {
            console.debug("[useResolveWineImages] cache_updated", {
              wineId: wine.id,
              wineName: wine.name,
              updatedImageUrl: resolvedImageUrl,
            });
          }
        } else if (import.meta.env.DEV) {
          console.debug("[useResolveWineImages] resolver_fallback_ignored", {
            wineId: wine.id,
            wineName: wine.name,
            source: result?.source ?? null,
            ignoredImageUrl: resolvedImageUrl,
          });
        }
      } catch (err) {
        console.warn("[useResolveWineImages] failed:", wine.id, err);
      }
      if (!cancelled) await runNext();
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, () => runNext());
    void Promise.all(workers);

    return () => {
      cancelled = true;
    };
  }, [wines, queryClient]);
}
