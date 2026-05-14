import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "premium-chip-surface inline-flex min-h-[24px] items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.01em] transition-[transform,background-color,border-color,box-shadow,color,filter] duration-200 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "premium-chip-surface--active text-[hsl(var(--wine))]",
        secondary: "text-[#524a58]",
        destructive: "premium-state-surface--danger text-[hsl(var(--destructive))]",
        outline: "bg-[rgba(255,255,255,0.62)] text-[#453d49]",
        success: "premium-state-surface--success text-[hsl(var(--success))]",
        warning: "premium-state-surface--warning text-[hsl(var(--warning))]",
        wine: "premium-chip-surface--active text-[hsl(var(--wine))]",
        gold: "bg-[rgba(188,145,65,0.10)] border-[rgba(188,145,65,0.16)] text-[hsl(var(--gold))]",
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
