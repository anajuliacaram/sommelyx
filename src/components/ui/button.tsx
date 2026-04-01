import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none transition-all duration-200 ease-out active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/92 rounded-2xl shadow-[0_10px_26px_-18px_hsl(var(--primary)/0.55)] hover:-translate-y-px hover:shadow-[0_18px_34px_-22px_hsl(var(--primary)/0.65)] font-semibold tracking-[-0.01em]",
        secondary:
          "bg-[hsl(var(--wine-vivid))] text-[hsl(var(--wine-foreground))] hover:bg-[hsl(var(--wine-vivid)/0.92)] rounded-2xl shadow-[0_10px_26px_-18px_hsl(var(--wine-vivid)/0.5)] hover:-translate-y-px font-semibold tracking-[-0.01em]",
        ghost:
          "bg-transparent text-foreground/90 hover:bg-muted/50 hover:text-foreground rounded-2xl font-medium",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/92 rounded-2xl shadow-[0_10px_26px_-18px_hsl(var(--destructive)/0.45)] hover:-translate-y-px font-semibold tracking-[-0.01em]",
        success:
          "bg-success text-success-foreground hover:bg-success/92 rounded-2xl shadow-[0_10px_26px_-18px_hsl(var(--success)/0.45)] hover:-translate-y-px font-semibold tracking-[-0.01em]",

        // Back-compat variants (avoid using in new code)
        default:
          "bg-primary text-primary-foreground hover:bg-primary/92 rounded-2xl shadow-[0_10px_26px_-18px_hsl(var(--primary)/0.55)] hover:-translate-y-px hover:shadow-[0_18px_34px_-22px_hsl(var(--primary)/0.65)] font-semibold tracking-[-0.01em]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/92 rounded-2xl hover:-translate-y-px",
        outline: "border border-border/70 bg-background/70 backdrop-blur-sm hover:bg-background hover:border-primary/25 text-foreground rounded-2xl hover:-translate-y-px font-medium",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-2xl border-0 font-semibold tracking-[-0.01em] shadow-float",
        glass: "btn-glass rounded-2xl px-6 font-medium backdrop-blur-xl",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-14 px-10 text-[15px]",
        icon: "h-10 w-10",
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
