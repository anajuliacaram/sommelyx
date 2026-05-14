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
        "flex h-8 w-8 items-center justify-center rounded-full",
        "border border-[rgba(58,51,39,0.06)] bg-transparent text-[#6B6258] shadow-none",
        "transition-all duration-180 ease-out",
        "hover:bg-[rgba(255,251,244,0.45)] hover:text-[#1A1713]",
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
