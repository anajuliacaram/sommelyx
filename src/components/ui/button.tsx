import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-200 ease-out active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "rounded-lg text-primary-foreground bg-primary shadow-[0_1px_3px_hsl(var(--wine)/0.2),0_2px_8px_hsl(var(--wine)/0.1)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_hsl(var(--wine)/0.25),0_4px_16px_hsl(var(--wine)/0.12)] tracking-[-0.01em]",
        secondary:
          "rounded-lg bg-card text-foreground border border-border shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-muted/40 hover:-translate-y-0.5 tracking-[-0.01em]",
        outline:
          "rounded-lg bg-transparent border border-border text-foreground hover:bg-muted/30 hover:-translate-y-0.5",
        ghost:
          "rounded-lg bg-transparent text-foreground hover:bg-muted/30",
        danger:
          "rounded-lg bg-destructive text-destructive-foreground shadow-[0_1px_3px_rgba(220,38,38,0.15)] hover:-translate-y-0.5 hover:bg-destructive/90",
        success:
          "rounded-lg bg-success text-success-foreground shadow-[0_1px_3px_rgba(16,185,129,0.15)] hover:-translate-y-0.5 hover:bg-success/90",

        // Back-compat
        default:
          "rounded-lg text-primary-foreground bg-primary shadow-[0_1px_3px_hsl(var(--wine)/0.2)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_hsl(var(--wine)/0.25)] tracking-[-0.01em]",
        destructive: "rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-lg border-0 font-semibold tracking-[-0.01em] shadow-float",
        glass: "btn-glass rounded-lg px-6 font-semibold backdrop-blur-xl",
      },
      size: {
        default: "h-10 px-5 text-[13px]",
        sm: "h-8 px-3.5 text-[12px]",
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
