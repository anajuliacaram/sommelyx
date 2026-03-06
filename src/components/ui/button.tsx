import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/92 rounded-2xl shadow-[0_8px_18px_-12px_rgba(15,15,20,0.5)] hover:-translate-y-px hover:shadow-[0_14px_30px_-14px_rgba(15,15,20,0.55)] active:scale-[0.98] active:shadow-sm font-semibold tracking-[-0.01em]",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-full active:scale-[0.97]",
        outline: "border border-border/70 bg-background/80 backdrop-blur-sm hover:bg-background hover:border-primary/25 text-foreground rounded-2xl hover:-translate-y-px shadow-[0_3px_10px_-8px_rgba(15,15,20,0.35)] hover:shadow-[0_10px_24px_-16px_rgba(15,15,20,0.4)] active:scale-[0.98] font-medium",
        secondary: "bg-primary/8 text-primary hover:bg-primary/14 rounded-full font-bold uppercase tracking-wider text-[11px] backdrop-blur-sm active:scale-[0.97]",
        ghost: "hover:bg-primary/6 hover:text-primary text-muted-foreground rounded-2xl font-medium active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-2xl border-0 font-semibold tracking-[-0.01em] shadow-float active:scale-[0.98] active:shadow-sm",
        glass: "btn-glass rounded-2xl px-6 font-medium backdrop-blur-xl active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-14 px-10 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
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
