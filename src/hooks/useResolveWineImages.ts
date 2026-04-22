import { useEffect, useRef } from "react";
import { invokeEdgeFunction } from "@/lib/edge-invoke";
import type { Wine } from "@/hooks/useWines";

/**
 * Em background, dispara `wine-image-resolver` para vinhos sem imagem real.
 * Considera "sem imagem real" quando image_url é nulo/vazio ou um SVG fallback (data:image/svg+xml).
 * Limita a concorrência e processa apenas uma vez por sessão por vinho.
 */
export function useResolveWineImages(wines: Wine[] | undefined) {
  const processed = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!wines || wines.length === 0) return;

    const candidates = wines.filter((w) => {
      if (!w?.id) return false;
      if (processed.current.has(w.id)) return false;
      const url = w.image_url || "";
      const noImage = !url;
      const isSvgFallback = url.startsWith("data:image/svg+xml");
      return noImage || isSvgFallback;
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
        await invokeEdgeFunction(
          "wine-image-resolver",
          { wineId: wine.id },
          { timeoutMs: 30_000, retries: 0 },
        );
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
  }, [wines]);
}
