import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-250 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "rounded-2xl text-white bg-[#7B1E2B] shadow-[0_4px_14px_rgba(123,30,43,0.25)] hover:-translate-y-0.5 hover:bg-[#6A1924] hover:shadow-[0_6px_20px_rgba(123,30,43,0.32)] tracking-[-0.01em]",
        secondary:
          "rounded-2xl text-[#333] tracking-[-0.01em]",
        outline:
          "rounded-2xl bg-transparent text-[#333] hover:-translate-y-0.5",
        ghost:
          "rounded-2xl bg-transparent text-[#555] hover:bg-black/5 hover:text-[#1C1C1C]",
        danger:
          "rounded-2xl bg-destructive text-destructive-foreground shadow-[0_2px_8px_rgba(220,38,38,0.15)] hover:-translate-y-0.5 hover:bg-destructive/90",
        success:
          "rounded-2xl bg-success text-success-foreground shadow-[0_2px_8px_rgba(16,185,129,0.15)] hover:-translate-y-0.5 hover:bg-success/90",
        default:
          "rounded-2xl text-white bg-[#7B1E2B] shadow-[0_4px_14px_rgba(123,30,43,0.25)] hover:-translate-y-0.5 hover:bg-[#6A1924] hover:shadow-[0_6px_20px_rgba(123,30,43,0.32)] tracking-[-0.01em]",
        destructive: "rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-0.5",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-2xl border-0 font-semibold tracking-[-0.01em] shadow-float",
        glass: "btn-glass rounded-2xl px-6 font-semibold text-[#333]",
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
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const glassStyle = (variant === "secondary" || variant === "outline") ? {
      background: "rgba(255, 255, 255, 0.75)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(0, 0, 0, 0.08)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
      ...style,
    } : style;

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} style={glassStyle} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
