import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-border/50 bg-background/70 px-4 py-3 text-[14px] font-medium tracking-[-0.01em] ring-offset-background placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/[0.08] focus-visible:border-primary/25 transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_1px_2px_rgba(15,15,20,0.02)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
