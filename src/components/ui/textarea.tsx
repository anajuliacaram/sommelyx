import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-2xl px-4 py-3 text-[14px] font-medium tracking-[-0.01em] ring-offset-background placeholder:text-[#999] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/[0.08] focus-visible:shadow-[0_0_0_3px_rgba(123,30,43,0.06)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      style={{
        background: "rgba(255, 255, 255, 0.90)",
        border: "1px solid rgba(0, 0, 0, 0.08)",
        color: "#1C1C1C",
      }}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
