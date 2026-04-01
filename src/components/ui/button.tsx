import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-250 ease-premium active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/92 rounded-2xl ring-1 ring-white/10 shadow-[0_10px_26px_-18px_hsl(var(--primary)/0.55)] hover:-translate-y-px hover:shadow-[0_18px_34px_-22px_hsl(var(--primary)/0.65)] font-semibold tracking-[-0.01em]",
        secondary:
          "bg-white/55 text-primary border border-primary/15 backdrop-blur-md rounded-2xl shadow-[0_10px_26px_-22px_hsl(var(--primary)/0.22)] hover:bg-primary/10 hover:text-primary hover:border-primary/25 hover:-translate-y-px hover:shadow-[0_18px_32px_-26px_hsl(var(--primary)/0.34)] active:bg-primary/12 font-semibold tracking-[-0.01em]",
        outline:
          "bg-transparent text-foreground border border-primary/22 rounded-2xl hover:bg-primary/6 hover:text-primary hover:border-primary/35 hover:-translate-y-px shadow-none font-medium",
        ghost:
          "bg-transparent text-foreground/90 hover:bg-primary/6 hover:text-primary rounded-2xl font-medium",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/92 rounded-2xl shadow-[0_10px_26px_-22px_hsl(var(--destructive)/0.4)] hover:-translate-y-px hover:shadow-[0_18px_34px_-26px_hsl(var(--destructive)/0.45)] font-semibold tracking-[-0.01em]",
        success:
          "bg-success text-success-foreground hover:bg-success/92 rounded-2xl shadow-[0_10px_26px_-22px_hsl(var(--success)/0.38)] hover:-translate-y-px hover:shadow-[0_18px_34px_-26px_hsl(var(--success)/0.42)] font-semibold tracking-[-0.01em]",

        // Back-compat variants (avoid using in new code)
        default:
          "bg-primary text-primary-foreground hover:bg-primary/92 rounded-2xl ring-1 ring-white/10 shadow-[0_10px_26px_-18px_hsl(var(--primary)/0.55)] hover:-translate-y-px hover:shadow-[0_18px_34px_-22px_hsl(var(--primary)/0.65)] font-semibold tracking-[-0.01em]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/92 rounded-2xl hover:-translate-y-px",
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
    compoundVariants: [
      {
        variant: "secondary",
        size: "sm",
        className: "rounded-full px-5",
      },
    ],
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
