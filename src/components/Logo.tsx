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
  hero: "w-auto max-w-[120px] sm:max-w-[180px] h-auto",
  // Requested: Desktop h-8 or h-10; Mobile h-6 or h-7 + hover scale
  navbar:
    "h-7 sm:h-8 md:h-10 w-auto transition-transform duration-300 ease-premium hover:scale-[1.05]",
  // Compact/icon contexts (mobile tight spaces, loaders)
  compact: "h-6 sm:h-7 w-auto",
};

function getBaseName(variant: LogoVariant, tone: LogoTone) {
  // Compact = icon (vertical mark). Hero/navbar = horizontal (laid down).
  if (variant === "compact") return tone === "mono" ? "logo-sommelyx-mono" : "7a378efc-4db3-40dd-bb01-5c69086ec8e6";
  return tone === "mono" ? "logo-sommelyx-horizontal-mono" : "logo-sommelyx-horizontal";
}

export const Logo = React.forwardRef<HTMLImageElement, Props>(function Logo(
  { variant = "navbar", tone = "default", className, alt = "Sommelyx", loading, ...props },
  ref,
) {
  const base = getBaseName(variant, tone);
  const webp = `/${base}.webp`;
  const png = `/${base}.png`;

  const resolvedLoading = loading ?? (variant === "hero" ? "eager" : "lazy");
  const fetchPriorityProps =
    variant === "hero" ? ({ fetchpriority: "high" } as Record<string, string>) : undefined;

  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img
        ref={ref}
        src={png}
        alt={alt}
        draggable={false}
        loading={resolvedLoading}
        {...fetchPriorityProps}
        className={cn("select-none", variantClasses[variant], className, "object-contain")}
        {...props}
      />
    </picture>
  );
});
