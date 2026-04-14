import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold tracking-[0.01em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/15 bg-primary/10 text-primary shadow-sm",
        secondary: "border-border/40 bg-secondary/80 text-secondary-foreground backdrop-blur-sm",
        destructive: "border-destructive/15 bg-destructive/10 text-destructive",
        outline: "border-border/40 bg-background/70 text-foreground backdrop-blur-sm",
        success: "border-success/15 bg-success/10 text-success",
        warning: "border-warning/15 bg-warning/10 text-warning",
        wine: "border-primary/15 bg-primary/10 text-primary",
        gold: "border-accent/15 bg-accent/10 text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
