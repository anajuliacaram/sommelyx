import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-[transform,background-color,border-color,box-shadow,color,filter] duration-200 ease-premium active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "rounded-[14px] text-primary-foreground bg-gradient-to-br from-primary to-wine-vivid shadow-[0_4px_12px_hsl(var(--wine)/0.16),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_hsl(var(--wine)/0.20),inset_0_1px_1px_rgba(255,255,255,0.10)] hover:brightness-105 tracking-[-0.01em]",
        secondary:
          "rounded-[14px] bg-[rgba(255,255,255,0.74)] text-[#1A1715] border border-[rgba(255,255,255,0.16)] shadow-[0_1px_2px_rgba(0,0,0,0.022)] backdrop-blur-md hover:bg-[rgba(255,255,255,0.82)] hover:border-[rgba(255,255,255,0.22)] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] tracking-[-0.01em]",
        outline:
          "rounded-[14px] bg-[rgba(255,255,255,0.48)] border border-white/14 text-foreground hover:bg-[rgba(255,255,255,0.58)] hover:-translate-y-0.5 hover:border-primary/14",
        ghost:
          "rounded-[14px] bg-transparent text-foreground hover:bg-[rgba(255,255,255,0.12)]",
        danger:
          "rounded-[14px] bg-destructive text-destructive-foreground shadow-[0_2px_8px_rgba(220,38,38,0.14)] hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-[0_4px_14px_rgba(220,38,38,0.18)]",
        success:
          "rounded-[14px] bg-success text-success-foreground shadow-[0_2px_8px_rgba(16,185,129,0.14)] hover:-translate-y-0.5 hover:bg-success/90",

        // Back-compat
        default:
          "rounded-[14px] text-primary-foreground bg-gradient-to-br from-primary to-wine-vivid shadow-[0_4px_12px_hsl(var(--wine)/0.16)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_hsl(var(--wine)/0.20)] tracking-[-0.01em]",
        destructive: "rounded-[14px] bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-[14px] border-0 font-semibold tracking-[-0.01em] shadow-float",
        glass: "btn-glass rounded-[14px] px-6 font-semibold backdrop-blur-xl",
      },
      size: {
        default: "h-11 px-6 text-[14px]",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-8 text-[15px]",
        icon: "h-10 w-10 p-0",
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
