import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-border/40 bg-background/50 px-5 py-2.5 text-[15px] font-normal tracking-[-0.005em] ring-offset-background backdrop-blur-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/[0.08] focus-visible:border-primary/25 focus-visible:bg-background/70 transition-all duration-280 ease-premium disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
