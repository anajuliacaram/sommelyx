import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-[24px] items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.01em] transition-[transform,background-color,border-color,box-shadow,color,filter] duration-200 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-[rgba(123,35,48,0.16)] bg-[rgba(123,35,48,0.10)] text-[hsl(var(--wine))] shadow-[0_1px_2px_rgba(0,0,0,0.022)]",
        secondary: "border-white/14 bg-[rgba(255,255,255,0.70)] text-[#524a58] backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.022)]",
        destructive: "border-[rgba(178,47,57,0.16)] bg-[rgba(178,47,57,0.10)] text-[hsl(var(--destructive))]",
        outline: "border-white/14 bg-[rgba(255,255,255,0.58)] text-[#453d49] backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.018)]",
        success: "border-[rgba(31,122,87,0.16)] bg-[rgba(31,122,87,0.10)] text-[hsl(var(--success))]",
        warning: "border-[rgba(178,127,41,0.16)] bg-[rgba(178,127,41,0.10)] text-[hsl(var(--warning))]",
        wine: "border-[rgba(123,35,48,0.16)] bg-[rgba(123,35,48,0.10)] text-[hsl(var(--wine))]",
        gold: "border-[rgba(188,145,65,0.16)] bg-[rgba(188,145,65,0.10)] text-[hsl(var(--gold))]",
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
