import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-300 ease-premium active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "rounded-full text-primary-foreground bg-gradient-to-br from-wine to-wine-vivid shadow-[0_10px_26px_hsl(var(--wine)/0.26)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_hsl(var(--wine)/0.34)] active:shadow-[0_10px_24px_hsl(var(--wine)/0.24)] tracking-[-0.01em]",
        secondary:
          "rounded-full bg-card/55 text-wine backdrop-blur-md border border-border/70 shadow-[0_1px_2px_rgba(15,15,20,0.05)] hover:bg-wine-light/65 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-18px_rgba(15,15,20,0.28)] active:shadow-[0_8px_20px_-18px_rgba(15,15,20,0.22)] tracking-[-0.01em]",
        outline:
          "rounded-full bg-transparent border border-border/80 text-foreground hover:bg-muted/35 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_-18px_rgba(15,15,20,0.18)]",
        ghost:
          "rounded-full bg-transparent text-foreground hover:bg-muted/35",
        danger:
          "rounded-full bg-destructive/92 text-destructive-foreground shadow-[0_10px_26px_rgba(220,38,38,0.18)] hover:-translate-y-0.5 hover:bg-destructive hover:shadow-[0_16px_40px_rgba(220,38,38,0.24)]",
        success:
          "rounded-full bg-success/92 text-success-foreground shadow-[0_10px_26px_rgba(16,185,129,0.16)] hover:-translate-y-0.5 hover:bg-success hover:shadow-[0_16px_40px_rgba(16,185,129,0.22)]",

        // Back-compat variants (avoid using in new code)
        default:
          "rounded-full text-primary-foreground bg-gradient-to-br from-wine to-wine-vivid shadow-[0_10px_26px_hsl(var(--wine)/0.26)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_hsl(var(--wine)/0.34)] active:shadow-[0_10px_24px_hsl(var(--wine)/0.24)] tracking-[-0.01em]",
        destructive: "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/92 hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-2xl border-0 font-semibold tracking-[-0.01em] shadow-float",
        glass: "btn-glass rounded-2xl px-6 font-medium backdrop-blur-xl",
      },
      size: {
        default: "h-11 px-[22px] text-[14px]",
        sm: "h-11 px-[18px] text-[14px]",
        lg: "h-12 px-7 text-[15px]",
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
