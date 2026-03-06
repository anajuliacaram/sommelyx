import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-border/70 bg-background/85 px-4 py-2 text-sm font-medium tracking-[-0.01em] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/35 transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_1px_2px_rgba(15,15,20,0.04),inset_0_1px_0_rgba(255,255,255,0.35)]",
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
