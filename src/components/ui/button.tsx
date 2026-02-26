import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/95 rounded-[14px] shadow-[0_4px_12px_rgba(140,32,68,0.15)] hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(140,32,68,0.22)] btn-glow",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[14px]",
        outline: "border border-border bg-card/40 hover:bg-card/70 hover:border-primary/20 text-foreground rounded-[14px] backdrop-blur-[12px] hover:-translate-y-px shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-[14px]",
        ghost: "hover:bg-muted/50 hover:text-foreground text-muted-foreground rounded-[14px]",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "gradient-wine text-white btn-glow rounded-[14px]",
      },
      size: {
        default: "h-11 px-6 py-2 font-semibold",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-14 px-10 text-[15px] font-semibold",
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
