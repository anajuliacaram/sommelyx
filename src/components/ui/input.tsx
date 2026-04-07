import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border/50 bg-background/70 px-4 py-2 text-[14px] font-medium tracking-[-0.01em] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/[0.08] focus-visible:border-primary/25 transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_1px_2px_rgba(15,15,20,0.02)]",
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
