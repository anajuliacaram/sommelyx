/**
 * EditorialHero — Phase 3
 *
 * Hero "garrafa-protagonista" no estilo Apple Music album / Moët luxury page.
 * Garrafa grande à esquerda, tipografia editorial à direita.
 * Usado em: Home (vinho do dia), Alertas (recomendação sommelier), ficha de vinho.
 *
 * Densidade de aplicativo: alturas contidas, a tipografia é o ponto focal e a
 * garrafa apoia a composição. No mobile o texto vem primeiro (touch-first) e a
 * garrafa ocupa uma coluna secundária à direita.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BottleObject } from "./BottleObject";

export interface EditorialHeroProps {
  kicker?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  note?: ReactNode;
  cta?: ReactNode;
  side?: ReactNode;
  imageUrl?: string | null;
  style?: string | null;
  alt?: string;
  className?: string;
  /** Reduzido para densidades menores. */
  size?: "default" | "compact";
}

export function EditorialHero({
  kicker,
  title,
  meta,
  note,
  cta,
  side,
  imageUrl,
  style,
  alt,
  className,
  size = "default",
}: EditorialHeroProps) {
  const isCompact = size === "compact";

  return (
    <section
      className={cn(
        "ed-canvas relative w-full overflow-hidden rounded-[24px]",
        isCompact ? "px-5 py-6 md:px-8 md:py-7" : "px-5 py-7 sm:px-8 md:px-10 md:py-9",
        className,
      )}
    >
      <div
        className={cn(
          "relative grid items-center gap-5 sm:gap-8 md:gap-10",
          "grid-cols-[minmax(0,1fr),auto] sm:grid-cols-[auto,minmax(0,1fr)]",
        )}
      >
        {/* Garrafa-protagonista — apoia a composição, não a domina */}
        <div className="order-2 flex justify-center self-end sm:order-1 sm:self-center sm:justify-start">
          <BottleObject
            imageUrl={imageUrl}
            style={style}
            alt={alt || (typeof title === "string" ? title : "Garrafa em destaque")}
            size="lg"
            withSpotlight
            priority
            className="ed-hero-bottle"
          />
        </div>

        {/* Tipografia editorial — o ponto focal */}
        <div className="order-1 flex min-w-0 flex-col gap-3 text-left ed-anim-fade-up sm:order-2">
          {kicker && (
            <div className="ed-kicker flex items-center gap-2">
              {kicker}
            </div>
          )}

          <h1
            className={cn(
              "ed-display",
              isCompact
                ? "text-[clamp(1.6rem,2.8vw,2.2rem)]"
                : "text-[clamp(1.75rem,3.4vw,2.9rem)]",
            )}
          >
            {title}
          </h1>

          {meta && (
            <p className="ed-kicker text-[10.5px] tracking-[0.18em]">{meta}</p>
          )}

          {note && (
            <p
              className={cn(
                "ed-note max-w-[46ch]",
                isCompact ? "text-[14px]" : "text-[15px] md:text-[16px]",
              )}
            >
              {note}
            </p>
          )}

          {cta && (
            <div className="ed-hero-cta mt-1.5 flex flex-wrap items-center gap-2.5">{cta}</div>
          )}

          {side}
        </div>
      </div>
    </section>
  );
}

/** CTA pill padronizado do sistema editorial. */
export function EditorialPill({
  children,
  onClick,
  variant = "outline",
  className,
  as: As = "button",
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "outline" | "primary";
  className?: string;
  as?: "button" | "a";
  [key: string]: unknown;
}) {
  return (
    <As
      onClick={onClick}
      className={cn("ed-pill", variant === "primary" && "is-primary", className)}
      {...rest}
    >
      {children}
    </As>
  );
}
