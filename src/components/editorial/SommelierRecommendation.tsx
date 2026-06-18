/**
 * SommelierRecommendation — Phase 3
 *
 * "Próximas garrafas" no estilo recomendação Netflix/Apple TV — mas luxury.
 * Garrafa pequena à esquerda + tipografia editorial + status sommelier.
 * Sem retângulo. Sem ícone de status. Apenas objeto + texto + linha de baseline.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BottleObject } from "./BottleObject";

export interface SommelierRecommendationProps {
  imageUrl?: string | null;
  style?: string | null;
  title: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  /** Itálico sommelier — uma frase curta. */
  whisper?: ReactNode;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function SommelierRecommendation({
  imageUrl,
  style,
  title,
  meta,
  status,
  whisper,
  onClick,
  className,
  size = "md",
}: SommelierRecommendationProps) {
  const bottleSize = size === "sm" ? "sm" : "md";

  const Inner = (
    <>
      <BottleObject
        imageUrl={imageUrl}
        style={style}
        alt={typeof title === "string" ? title : undefined}
        size={bottleSize}
        withShelf
        withSpotlight={false}
        animated
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1 pl-4 md:pl-6">
        {meta && <span className="ed-kicker text-[10px]">{meta}</span>}
        <h3
          className={cn(
            "ed-display text-left",
            size === "sm" ? "text-[18px]" : "text-[22px] md:text-[26px]",
          )}
          style={{ lineHeight: 1.1 }}
        >
          {title}
        </h3>
        {whisper && (
          <p className="ed-note text-[13px] md:text-[14px] max-w-[36ch]">
            {whisper}
          </p>
        )}
        {status && (
          <span
            className="mt-1 ed-kicker text-[10px]"
            style={{ color: "var(--ed-gold)", letterSpacing: "0.2em" }}
          >
            {status}
          </span>
        )}
      </div>
    </>
  );

  const baseClass = cn(
    "group ed-anim-fade-up relative flex items-end w-full",
    "transition-all duration-300 ease-out",
    onClick && "cursor-pointer hover:-translate-y-0.5",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(baseClass, "text-left bg-transparent border-0 p-0")}>
        {Inner}
      </button>
    );
  }
  return <div className={baseClass}>{Inner}</div>;
}
