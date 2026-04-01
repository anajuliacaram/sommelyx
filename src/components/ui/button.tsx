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
          "rounded-full text-white bg-[linear-gradient(135deg,#7B1E2B,#A12C3A)] shadow-[0_10px_25px_rgba(123,30,43,0.30)] hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(123,30,43,0.40)] active:shadow-[0_10px_22px_rgba(123,30,43,0.28)] tracking-[-0.01em]",
        secondary:
          "rounded-full bg-white/15 text-[#5a1e28] backdrop-blur-[10px] border border-white/20 shadow-none hover:bg-white/25 hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.10)] active:shadow-[0_8px_20px_rgba(0,0,0,0.08)] tracking-[-0.01em]",
        outline:
          "rounded-full bg-transparent border border-black/10 text-foreground hover:bg-black/[0.03] hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(0,0,0,0.06)]",
        ghost:
          "rounded-full bg-transparent text-foreground hover:bg-black/[0.03]",
        danger:
          "rounded-full bg-destructive text-destructive-foreground shadow-[0_10px_25px_rgba(220,38,38,0.22)] hover:-translate-y-0.5 hover:bg-destructive/92 hover:shadow-[0_15px_35px_rgba(220,38,38,0.30)]",
        success:
          "rounded-full bg-success text-success-foreground shadow-[0_10px_25px_rgba(16,185,129,0.20)] hover:-translate-y-0.5 hover:bg-success/92 hover:shadow-[0_15px_35px_rgba(16,185,129,0.26)]",

        // Back-compat variants (avoid using in new code)
        default:
          "rounded-full text-white bg-[linear-gradient(135deg,#7B1E2B,#A12C3A)] shadow-[0_10px_25px_rgba(123,30,43,0.30)] hover:-translate-y-0.5 hover:shadow-[0_15px_35px_rgba(123,30,43,0.40)] active:shadow-[0_10px_22px_rgba(123,30,43,0.28)] tracking-[-0.01em]",
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
