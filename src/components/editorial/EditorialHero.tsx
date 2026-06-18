/**
 * EditorialHero — Phase 3
 *
 * Hero "garrafa-protagonista" no estilo Apple Music album / Moët luxury page.
 * Garrafa grande à esquerda, tipografia editorial à direita.
 * Usado em: Home (vinho do dia), Alertas (recomendação sommelier), ficha de vinho.
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
        "ed-canvas relative w-full overflow-hidden rounded-[28px]",
        isCompact ? "px-5 py-8 md:px-10 md:py-12" : "px-6 py-12 md:px-14 md:py-20",
        className,
      )}
    >
      <div
        className={cn(
          "relative grid items-center gap-8 md:gap-12",
          "grid-cols-1 md:grid-cols-[auto,1fr]",
        )}
      >
        {/* Garrafa-protagonista */}
        <div className="flex justify-center md:justify-start">
          <BottleObject
            imageUrl={imageUrl}
            style={style}
            alt={alt || (typeof title === "string" ? title : "Garrafa em destaque")}
            size={isCompact ? "lg" : "xl"}
            withSpotlight
            priority
          />
        </div>

        {/* Tipografia editorial */}
        <div className="flex flex-col gap-5 ed-anim-fade-up text-center md:text-left">
          {kicker && (
            <div className="ed-kicker flex items-center justify-center gap-2 md:justify-start">
              {kicker}
            </div>
          )}

          <h1
            className={cn(
              "ed-display",
              isCompact
                ? "text-[clamp(2rem,5vw,3rem)]"
                : "text-[clamp(2.5rem,6vw,4.5rem)]",
            )}
          >
            {title}
          </h1>

          {meta && (
            <p className="ed-kicker text-[11px] tracking-[0.24em]">{meta}</p>
          )}

          {note && (
            <p
              className={cn(
                "ed-note max-w-[42ch] mx-auto md:mx-0",
                isCompact ? "text-[15px]" : "text-[17px] md:text-[19px]",
              )}
            >
              {note}
            </p>
          )}

          {cta && <div className="mt-2 flex items-center justify-center md:justify-start gap-3">{cta}</div>}

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
