import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-250 ease-premium active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "rounded-2xl text-primary-foreground bg-gradient-to-br from-primary to-wine-vivid shadow-[0_2px_8px_hsl(var(--wine)/0.18),inset_0_1px_1px_rgba(255,255,255,0.10)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_hsl(var(--wine)/0.24),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:brightness-105 tracking-[-0.01em]",
        secondary:
          "rounded-2xl bg-[rgba(255,255,255,0.85)] text-[#2B2B2B] border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-md hover:bg-white hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] tracking-[-0.01em]",
        outline:
          "rounded-2xl bg-transparent border border-border/60 text-foreground hover:bg-muted/20 hover:-translate-y-0.5 hover:border-primary/15",
        ghost:
          "rounded-2xl bg-transparent text-foreground hover:bg-muted/20",
        danger:
          "rounded-2xl bg-destructive text-destructive-foreground shadow-[0_2px_8px_rgba(220,38,38,0.15)] hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-[0_4px_16px_rgba(220,38,38,0.20)]",
        success:
          "rounded-2xl bg-success text-success-foreground shadow-[0_2px_8px_rgba(16,185,129,0.15)] hover:-translate-y-0.5 hover:bg-success/90",

        // Back-compat
        default:
          "rounded-2xl text-primary-foreground bg-gradient-to-br from-primary to-wine-vivid shadow-[0_2px_8px_hsl(var(--wine)/0.18)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_hsl(var(--wine)/0.24)] tracking-[-0.01em]",
        destructive: "rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-2xl border-0 font-semibold tracking-[-0.01em] shadow-float",
        glass: "btn-glass rounded-2xl px-6 font-semibold backdrop-blur-xl",
      },
      size: {
        default: "h-11 px-6 text-[14px]",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-8 text-[15px]",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
