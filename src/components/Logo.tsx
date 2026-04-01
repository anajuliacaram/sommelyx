import * as React from "react";

import { cn } from "@/lib/utils";

export type LogoVariant = "hero" | "navbar" | "compact";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  variant?: LogoVariant;
};

const variantClasses: Record<LogoVariant, string> = {
  hero: "w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] h-auto",
  navbar: "w-full max-w-[200px] sm:max-w-[220px] md:max-w-[240px] h-auto",
  compact: "h-10 sm:h-11 w-auto",
};

export const Logo = React.forwardRef<HTMLImageElement, Props>(function Logo(
  { variant = "navbar", className, alt = "Sommelyx", ...props },
  ref,
) {
  const src = variant === "compact" ? "/logo-sommelyx-mark.png" : "/logo-sommelyx.png";

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      draggable={false}
      className={cn("object-contain select-none", variantClasses[variant], className)}
      {...props}
    />
  );
});

