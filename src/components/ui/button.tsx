import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-[#0F0F14] text-white hover:bg-[#1A1A1F] rounded-full shadow-premium hover:-translate-y-0.5 hover:shadow-float font-semibold tracking-tight",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-full transition-colors",
        outline: "border border-[#8C2044]/15 bg-white/40 hover:bg-white/80 hover:border-[#8C2044]/30 text-[#0F0F14] rounded-full backdrop-blur-md hover:-translate-y-0.5 shadow-sm hover:shadow-md transition-all font-semibold",
        secondary: "bg-[#8C2044]/8 text-[#8C2044] hover:bg-[#8C2044]/15 rounded-full font-bold uppercase tracking-wider text-[11px] backdrop-blur-sm",
        ghost: "hover:bg-[#8C2044]/5 hover:text-[#8C2044] text-muted-foreground rounded-full transition-colors font-medium",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "btn-premium text-white rounded-full border border-white/10 font-black tracking-wide uppercase text-[13px] shadow-float",
        glass: "btn-glass rounded-full px-6 font-semibold",
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
