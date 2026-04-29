import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "@/icons/lucide";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "motion-button-hover inline-flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none will-change-transform transition-all duration-180 ease-[cubic-bezier(0.4,0,0.2,1)] font-medium tracking-tight",
  {
    variants: {
      variant: {
        primary:
          "btn-primary-premium h-11 rounded-[12px] px-5 text-[15px] font-semibold text-white sm:h-12",
        secondary:
          "h-11 rounded-[12px] border border-[rgba(95,111,82,0.18)] bg-white px-4 text-[14px] text-[#3A3327] hover:bg-[rgba(0,0,0,0.03)] shadow-none",
        tertiary:
          "h-11 rounded-[12px] bg-[#F5EFE6] px-4 text-[#6A1A28] hover:bg-[#EADFCC] shadow-none",
        outline:
          "h-11 rounded-[12px] border border-black/10 bg-white px-4 text-[#333] hover:bg-[#F8F8F8] hover:border-black/15 shadow-none",
        ghost:
          "h-11 rounded-[12px] bg-transparent px-3 text-[#6B6B6B] hover:bg-[#F5EFE6] hover:text-[#1A1A1A] shadow-none",
        danger:
          "btn-primary-premium h-11 rounded-[12px] px-4 text-white sm:h-12",
        success:
          "h-11 rounded-[12px] border border-black/10 bg-white px-4 text-[#333] hover:bg-[#F8F8F8] hover:border-black/15 shadow-none",

        // Back-compat aliases
        default:
          "btn-primary-premium h-11 rounded-[12px] px-5 text-[15px] font-semibold text-white sm:h-12",
        destructive:
          "btn-primary-premium h-11 rounded-[12px] px-5 text-[15px] font-semibold text-white sm:h-12",
        link: "h-11 rounded-[12px] bg-transparent px-0 text-[#6A1A28] underline-offset-4 hover:text-[#1A1A1A] hover:underline shadow-none",
        premium:
          "btn-primary-premium h-11 rounded-[12px] px-5 text-[15px] font-semibold text-white sm:h-12",
        glass:
          "h-11 rounded-[12px] border border-[rgba(95,111,82,0.18)] bg-white px-4 text-[14px] text-[#3A3327] hover:bg-[rgba(0,0,0,0.03)] shadow-none",
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
  ({ className, variant, size, asChild = false, loading = false, loadingText, disabled, children, ...props }, ref) => {
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
