import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BrandName — Renderização padronizada do nome "Sommelyx".
 *
 * Regras de marca:
 * - Cor padrão: bordô premium (--brand-primary = #7B1E2B) em fundos claros
 * - Tipografia: Libre Baskerville (serif), peso 600, tracking 0.02em
 * - Tom "light" para uso em fundos escuros (sidebar, hero escuro)
 * - Acento dourado opcional no ponto final (.) — sutil, não obrigatório
 */

export type BrandNameTone = "primary" | "light" | "dark";

interface BrandNameProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** primary = bordô (padrão, fundos claros). light = branco (fundos escuros). dark = #1C1C1C. */
  tone?: BrandNameTone;
  /** Adiciona um ponto final dourado sutil ao nome. */
  withAccent?: boolean;
  /** Tamanho relativo. Use Tailwind classes via className para override total. */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

const sizeClasses: Record<NonNullable<BrandNameProps["size"]>, string> = {
  sm: "text-[16px]",
  md: "text-[20px]",
  lg: "text-[24px]",
  xl: "text-[28px]",
  "2xl": "text-[32px]",
};

const toneColor: Record<BrandNameTone, string> = {
  primary: "var(--brand-primary, #7B1E2B)",
  light: "#FFFFFF",
  dark: "#1C1C1C",
};

export const BrandName = React.forwardRef<HTMLSpanElement, BrandNameProps>(
  function BrandName(
    { tone = "primary", withAccent = false, size = "md", className, style, ...props },
    ref,
  ) {
    return (
      <span
        ref={ref}
        className={cn("font-serif inline-flex items-baseline", sizeClasses[size], className)}
        style={{
          color: toneColor[tone],
          fontWeight: 600,
          letterSpacing: "0.02em",
          fontFamily: "'Libre Baskerville', Georgia, serif",
          ...style,
        }}
        {...props}
      >
        Sommelyx
        {withAccent && (
          <span aria-hidden="true" style={{ color: "#C8A96A", marginLeft: "1px" }}>
            .
          </span>
        )}
      </span>
    );
  },
);
