import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/15 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-250 ease-out active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "rounded-lg text-primary-foreground bg-gradient-to-br from-wine to-wine-vivid shadow-[0_1px_4px_hsl(var(--wine)/0.12)] hover:-translate-y-px hover:shadow-[0_2px_8px_hsl(var(--wine)/0.18)] tracking-[-0.01em]",
        secondary:
          "rounded-lg bg-card/60 text-foreground backdrop-blur-md border border-border/40 shadow-[0_1px_2px_rgba(15,15,20,0.02)] hover:bg-muted/30 hover:-translate-y-px tracking-[-0.01em]",
        outline:
          "rounded-lg bg-transparent border border-border/50 text-foreground hover:bg-muted/20 hover:-translate-y-px",
        ghost:
          "rounded-lg bg-transparent text-foreground hover:bg-muted/20",
        danger:
          "rounded-lg bg-destructive/85 text-destructive-foreground shadow-[0_1px_4px_rgba(220,38,38,0.08)] hover:-translate-y-px hover:bg-destructive/95",
        success:
          "rounded-lg bg-success/85 text-success-foreground shadow-[0_1px_4px_rgba(16,185,129,0.08)] hover:-translate-y-px hover:bg-success/95",

        // Back-compat
        default:
          "rounded-lg text-primary-foreground bg-gradient-to-br from-wine to-wine-vivid shadow-[0_1px_4px_hsl(var(--wine)/0.12)] hover:-translate-y-px hover:shadow-[0_2px_8px_hsl(var(--wine)/0.18)] tracking-[-0.01em]",
        destructive: "rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-px",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-lg border-0 font-medium tracking-[-0.01em] shadow-float",
        glass: "btn-glass rounded-lg px-6 font-medium backdrop-blur-xl",
      },
      size: {
        default: "h-11 px-5 text-[14px]",
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
