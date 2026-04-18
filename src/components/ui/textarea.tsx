import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border border-border bg-white px-4 py-3 text-[15px] font-medium tracking-tight text-[#201c1f] ring-offset-background shadow-[0_1px_2px_rgba(0,0,0,0.02)] placeholder:text-[#8A8580] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/20 focus-visible:border-[#7B1E2B] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
