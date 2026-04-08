import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-[14px] font-medium tracking-[-0.01em] text-foreground ring-offset-background backdrop-blur-sm placeholder:text-muted-foreground/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/[0.12] focus-visible:border-primary/30 focus-visible:bg-background/80 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.06)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
