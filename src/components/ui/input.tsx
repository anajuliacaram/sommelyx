import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-11 w-full rounded-[16px] border border-[rgba(95,111,82,0.15)] bg-white px-3.5 py-3 text-[15px] font-normal text-[#1A1713] ring-offset-background shadow-none file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[rgba(58,51,39,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/15 focus-visible:border-[#7B1E2B] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40",
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
