import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/20 bg-[rgba(255,255,255,0.72)] px-3.5 py-2 text-[13px] font-medium tracking-[-0.005em] text-foreground ring-offset-background backdrop-blur-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/[0.10] focus-visible:border-primary/25 focus-visible:bg-[rgba(255,255,255,0.88)] focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.05)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40",
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
