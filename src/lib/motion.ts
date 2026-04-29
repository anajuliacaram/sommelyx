import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);

    update();
    if ("addEventListener" in media) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return reduced;
}

export function useCountUp(
  target: number | null | undefined,
  {
    duration = 700,
    start = 0,
    enabled = true,
  }: {
    duration?: number;
    start?: number;
    enabled?: boolean;
  } = {},
) {
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState<number>(typeof target === "number" ? target : start);
  const startedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(typeof target === "number" ? target : start);
      return;
    }

    if (typeof target !== "number") {
      return;
    }

    if (reducedMotion) {
      setValue(target);
      startedRef.current = true;
      return;
    }

    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    const from = Number.isFinite(start) ? start : 0;
    const to = target;
    const delta = to - from;
    const begin = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const progress = Math.min(1, (now - begin) / duration);
      const next = from + delta * easeOutCubic(progress);
      setValue(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [duration, enabled, reducedMotion, start, target]);

  return value;
}

export function motionDelay(index: number, base = 80): CSSProperties {
  return { ["--motion-delay" as string]: `${Math.max(0, index) * base}ms` } as CSSProperties;
}

export function formatMotionNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
