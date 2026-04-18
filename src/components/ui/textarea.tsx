import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-2xl border border-[rgba(95,111,82,0.15)] bg-white px-4 py-3.5 text-[14px] font-normal leading-relaxed text-[#1A1713] ring-offset-background shadow-none placeholder:text-[rgba(58,51,39,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/15 focus-visible:border-[#7B1E2B] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
