/**
 * EditorialMetric — Phase 3
 *
 * Substitui KPI cards retangulares por uma composição tipográfica:
 * — número em serif display gigante
 * — label em uppercase tracked-out minúsculo
 * — sub opcional em itálico serif
 *
 * Sem caixa. Sem fundo. Sem borda. Apenas tipografia + espaço.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EditorialMetricProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EditorialMetric({
  label,
  value,
  sub,
  align = "left",
  size = "md",
  className,
}: EditorialMetricProps) {
  const valueClass =
    size === "lg"
      ? "text-[clamp(2.5rem,5vw,4rem)]"
      : size === "sm"
        ? "text-[1.75rem]"
        : "text-[clamp(2rem,3.5vw,2.75rem)]";

  return (
    <div
      className={cn(
        "ed-anim-fade-up flex flex-col gap-1.5",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      <span className="ed-kicker">{label}</span>
      <span className={cn("ed-display tabular-nums leading-[0.95]", valueClass)}>
        {value}
      </span>
      {sub && (
        <span className="ed-note text-[13px] tracking-tight">{sub}</span>
      )}
    </div>
  );
}

/** Divisor vertical sutil (gold hairline) entre métricas em linha. */
export function EditorialMetricDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("self-stretch w-px", className)}
      style={{
        background:
          "linear-gradient(180deg, transparent, rgba(200,169,106,0.35) 30%, rgba(200,169,106,0.35) 70%, transparent)",
      }}
    />
  );
}
