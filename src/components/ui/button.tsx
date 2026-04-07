import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-200 ease-out active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "rounded-xl text-primary-foreground bg-gradient-to-br from-wine to-wine-vivid shadow-[0_2px_8px_hsl(var(--wine)/0.18)] hover:-translate-y-px hover:shadow-[0_4px_16px_hsl(var(--wine)/0.24)] active:shadow-[0_2px_6px_hsl(var(--wine)/0.16)] tracking-[-0.01em]",
        secondary:
          "rounded-xl bg-card/60 text-wine backdrop-blur-md border border-border/50 shadow-[0_1px_2px_rgba(15,15,20,0.03)] hover:bg-wine-light/50 hover:-translate-y-px hover:shadow-[0_4px_12px_-6px_rgba(15,15,20,0.12)] active:shadow-[0_2px_6px_-4px_rgba(15,15,20,0.08)] tracking-[-0.01em]",
        outline:
          "rounded-xl bg-transparent border border-border/60 text-foreground hover:bg-muted/25 hover:-translate-y-px hover:shadow-[0_2px_8px_-4px_rgba(15,15,20,0.08)]",
        ghost:
          "rounded-xl bg-transparent text-foreground hover:bg-muted/25",
        danger:
          "rounded-xl bg-destructive/90 text-destructive-foreground shadow-[0_2px_8px_rgba(220,38,38,0.12)] hover:-translate-y-px hover:bg-destructive hover:shadow-[0_4px_14px_rgba(220,38,38,0.18)]",
        success:
          "rounded-xl bg-success/90 text-success-foreground shadow-[0_2px_8px_rgba(16,185,129,0.10)] hover:-translate-y-px hover:bg-success hover:shadow-[0_4px_14px_rgba(16,185,129,0.16)]",

        // Back-compat
        default:
          "rounded-xl text-primary-foreground bg-gradient-to-br from-wine to-wine-vivid shadow-[0_2px_8px_hsl(var(--wine)/0.18)] hover:-translate-y-px hover:shadow-[0_4px_16px_hsl(var(--wine)/0.24)] active:shadow-[0_2px_6px_hsl(var(--wine)/0.16)] tracking-[-0.01em]",
        destructive: "rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-px",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-xl border-0 font-semibold tracking-[-0.01em] shadow-float",
        glass: "btn-glass rounded-xl px-6 font-medium backdrop-blur-xl",
      },
      size: {
        default: "h-10 px-5 text-[13px]",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-11 px-7 text-[14px]",
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
