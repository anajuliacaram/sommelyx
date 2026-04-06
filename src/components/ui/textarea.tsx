import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-2xl border border-border/70 bg-background/85 px-4 py-3 text-sm font-medium tracking-[-0.01em] ring-offset-background placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/35 transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_1px_2px_rgba(15,15,20,0.04),inset_0_1px_0_rgba(255,255,255,0.35)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
