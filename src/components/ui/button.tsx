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
          "btn-primary-premium h-11 rounded-[16px] px-5 text-[14px] font-semibold text-white sm:h-12 sm:text-[15px]",
        secondary:
          "premium-control-surface h-11 rounded-[16px] px-4 text-[13.5px] font-semibold text-[#3A3327] hover:-translate-y-px sm:h-12 sm:text-[14px]",
        tertiary:
          "h-11 rounded-[16px] border border-[rgba(198,167,104,0.18)] bg-[rgba(255,248,237,0.88)] px-4 text-[#6A1A28] shadow-[0_1px_2px_rgba(58,51,39,0.04)] backdrop-blur-sm hover:-translate-y-px hover:bg-[rgba(255,248,237,0.96)] sm:h-12",
        outline:
          "premium-control-surface h-11 rounded-[16px] px-4 text-[13.5px] text-[#3F362F] hover:-translate-y-px sm:h-12 sm:text-[14px]",
        ghost:
          "h-11 rounded-[16px] border border-transparent bg-transparent px-3 text-[13.5px] text-[#6B6B6B] hover:-translate-y-px hover:bg-[rgba(255,255,255,0.52)] hover:text-[#1A1A1A] sm:h-12",
        danger:
          "h-11 rounded-[16px] border border-[rgba(175,45,54,0.16)] bg-[linear-gradient(135deg,rgba(175,45,54,0.94)_0%,rgba(145,28,36,0.96)_100%)] px-4 text-white shadow-[0_10px_24px_-16px_rgba(175,45,54,0.32)] hover:-translate-y-px hover:shadow-[0_14px_28px_-18px_rgba(175,45,54,0.38)] sm:h-12",
        success:
          "premium-control-surface h-11 rounded-[16px] border-[rgba(31,122,87,0.12)] bg-[rgba(31,122,87,0.08)] px-4 text-[13.5px] text-[hsl(var(--success))] hover:-translate-y-px sm:h-12 sm:text-[14px]",

        // Back-compat aliases
        default:
          "btn-primary-premium h-11 rounded-[16px] px-5 text-[14px] font-semibold text-white sm:h-12 sm:text-[15px]",
        destructive:
          "h-11 rounded-[16px] border border-[rgba(175,45,54,0.16)] bg-[linear-gradient(135deg,rgba(175,45,54,0.94)_0%,rgba(145,28,36,0.96)_100%)] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-16px_rgba(175,45,54,0.32)] hover:-translate-y-px hover:shadow-[0_14px_28px_-18px_rgba(175,45,54,0.38)] sm:h-12 sm:text-[15px]",
        link: "h-11 rounded-[12px] bg-transparent px-0 text-[#6A1A28] underline-offset-4 hover:text-[#1A1A1A] hover:underline shadow-none",
        premium:
          "btn-primary-premium h-11 rounded-[16px] px-5 text-[14px] font-semibold text-white sm:h-12 sm:text-[15px]",
        glass:
          "premium-control-surface h-11 rounded-[16px] px-4 text-[13.5px] text-[#3A3327] hover:-translate-y-px sm:h-12 sm:text-[14px]",
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
