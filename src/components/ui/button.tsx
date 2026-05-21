import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "@/icons/lucide";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "sx-btn motion-button-hover inline-flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-180 ease-[cubic-bezier(0.4,0,0.2,1)] font-medium tracking-tight",
  {
    variants: {
      variant: {
        primary:
          "sx-btn-primary btn-primary-premium h-11 px-5 text-[14px] sm:h-12 sm:text-[15px]",
        secondary:
          "sx-btn-secondary premium-control-surface h-11 px-4 text-[13.5px] sm:h-12 sm:text-[14px]",
        tertiary:
          "sx-btn-tertiary h-11 px-4 sm:h-12",
        outline:
          "sx-btn-outline premium-control-surface h-11 px-4 text-[13.5px] sm:h-12 sm:text-[14px]",
        ghost:
          "sx-btn-ghost h-11 px-3 text-[13.5px] sm:h-12",
        danger:
          "sx-btn-danger h-11 px-4 sm:h-12",
        success:
          "sx-btn-olive premium-control-surface h-11 px-4 text-[13.5px] sm:h-12 sm:text-[14px]",

        // Back-compat aliases
        default:
          "sx-btn-primary btn-primary-premium h-11 px-5 text-[14px] sm:h-12 sm:text-[15px]",
        destructive:
          "sx-btn-danger h-11 px-5 text-[14px] sm:h-12 sm:text-[15px]",
        link: "sx-btn-link h-11 bg-transparent px-0 underline-offset-4 hover:underline shadow-none",
        premium:
          "sx-btn-primary btn-primary-premium h-11 px-5 text-[14px] sm:h-12 sm:text-[15px]",
        glass:
          "sx-btn-secondary premium-control-surface h-11 px-4 text-[13.5px] sm:h-12 sm:text-[14px]",
      },
      size: {
        default: "h-12 px-4 text-[15px]",
        sm: "h-11 px-4 text-[14px]",
        lg: "h-12 px-5 text-[15px]",
        icon: "min-h-11 min-w-11 h-11 w-11 p-0",
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
  /**
   * Quando true, exibe um spinner inline e aplica disabled automaticamente.
   * Use sempre em ações assíncronas (submit, AI, mutations).
   */
  loading?: boolean;
  /**
   * Texto opcional exibido enquanto loading=true (substitui children).
   * Ex: "Salvando…", "Analisando…"
   */
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, disabled, children, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;
    const content = loading ? (
      <>
        <Loader2 className="animate-spin" aria-hidden="true" />
        <span>{loadingText ?? children}</span>
      </>
    ) : (
      children
    );
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        type={asChild ? undefined : type ?? "button"}
        aria-busy={loading || undefined}
        {...props}
      >
        {content}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
