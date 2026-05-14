import * as React from "react";
import { X } from "@/icons/lucide";

import { cn } from "@/lib/utils";

export interface ModalCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export const ModalCloseButton = React.forwardRef<HTMLButtonElement, ModalCloseButtonProps>(
  ({ className, label = "Fechar", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full",
        "premium-control-surface text-[#6B6B6B] shadow-[0_10px_20px_-16px_rgba(58,51,39,0.20)]",
        "transition-all duration-180 ease-out",
        "hover:-translate-y-px hover:scale-[1.03] hover:text-[#1A1A1A]",
        "active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#7B1E2B]/16 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </button>
  ),
);

ModalCloseButton.displayName = "ModalCloseButton";
