import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "premium-control-surface flex min-h-11 w-full rounded-[16px] px-3.5 py-3 text-[14px] font-medium text-[#1A1713] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[rgba(58,51,39,0.46)] placeholder:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/12 focus-visible:border-[#7B1E2B]/20 transition-all duration-180 ease-[cubic-bezier(0.4,0,0.2,1)] disabled:cursor-not-allowed disabled:opacity-40 sm:text-[15px]",
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
