import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[14px] border border-[rgba(95,111,82,0.10)] bg-[rgba(255,255,255,0.88)] px-4 py-3 text-[14px] font-medium tracking-[-0.01em] text-[#201c1f] ring-offset-background shadow-[0_1px_2px_rgba(0,0,0,0.02)] backdrop-blur-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#7a7279] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30 focus-visible:bg-[rgba(255,255,255,0.96)] focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.05)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40",
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
