import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px] shadow-[0_4px_16px_rgba(143,45,86,0.15)] hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(143,45,86,0.22)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[14px]",
        outline: "border border-border bg-card/60 hover:bg-card/90 hover:border-primary/20 text-foreground rounded-[14px] backdrop-blur-sm hover:-translate-y-px",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-[14px]",
        ghost: "hover:bg-muted/50 hover:text-foreground text-muted-foreground rounded-[14px]",
        link: "text-primary underline-offset-4 hover:underline",
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
