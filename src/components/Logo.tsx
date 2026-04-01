import * as React from "react";

import { cn } from "@/lib/utils";

export type LogoVariant = "hero" | "navbar" | "compact";
export type LogoTone = "default" | "mono";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  variant?: LogoVariant;
  tone?: LogoTone;
};

const variantClasses: Record<LogoVariant, string> = {
  // Requested: max-width 140px mobile / 220px desktop
  hero: "w-auto max-w-[140px] sm:max-w-[220px] h-auto",
  // Requested: Desktop h-8 or h-10; Mobile h-6 or h-7 + hover scale
  navbar:
    "h-7 sm:h-8 md:h-10 w-auto transition-transform duration-300 ease-premium hover:scale-[1.05]",
  // Compact/icon contexts (mobile tight spaces, loaders)
  compact: "h-6 sm:h-7 w-auto",
};

function getBaseName(variant: LogoVariant, tone: LogoTone) {
  // Keep a dedicated mark for compact usage
  if (variant === "compact") return tone === "mono" ? "logo-sommelyx-mono" : "logo-sommelyx-mark";
  return tone === "mono" ? "logo-sommelyx-mono" : "logo-sommelyx";
}

export const Logo = React.forwardRef<HTMLImageElement, Props>(function Logo(
  { variant = "navbar", tone = "default", className, alt = "Sommelyx", loading, fetchPriority, ...props },
  ref,
) {
  const base = getBaseName(variant, tone);
  const webp = `/${base}.webp`;
  const png = `/${base}.png`;

  const resolvedLoading =
    loading ?? (variant === "hero" ? "eager" : "lazy");
  const resolvedFetchPriority =
    fetchPriority ?? (variant === "hero" ? "high" : undefined);

  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img
        ref={ref}
        src={png}
        alt={alt}
        draggable={false}
        loading={resolvedLoading}
        fetchPriority={resolvedFetchPriority}
        className={cn("object-contain select-none", variantClasses[variant], className)}
        {...props}
      />
    </picture>
  );
});
