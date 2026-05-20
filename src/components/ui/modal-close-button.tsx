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
        "modal-close flex h-8 w-8 items-center justify-center rounded-full",
        "border-0 bg-[rgba(58,42,30,0.07)] text-[var(--sx-t-sub)] shadow-none",
        "transition-all duration-180 ease-out",
        "hover:bg-[rgba(58,42,30,0.11)] hover:text-[var(--sx-t-body)]",
        "active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--sx-bordeaux-10)] disabled:pointer-events-none",
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
