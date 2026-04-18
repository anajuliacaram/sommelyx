import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@/icons/lucide";
import { cn } from "@/lib/utils";
import { DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";

export interface ModalBaseProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  onClose?: () => void;
}

export function ModalBase({
  title,
  icon,
  children,
  description,
  footer,
  className,
  bodyClassName,
  onClose,
}: ModalBaseProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }}
      >
        <div
          className={cn(
            "relative w-full max-w-lg rounded-3xl border border-black/5 bg-[#F6F3EF] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] max-h-[85vh] overflow-y-auto",
            className,
          )}
          style={{
            backdropFilter: "blur(12px) saturate(1.02)",
            WebkitBackdropFilter: "blur(12px) saturate(1.02)",
          }}
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/20 to-[#C8A96A]/20 text-[#7B1E2B]">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-[#1E1E1E]">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="mt-1 text-sm font-medium tracking-tight text-[#6B6B6B] leading-relaxed">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Fechar modal"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-[#6B6B6B] transition-all duration-200 hover:bg-black/10 hover:text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#7B1E2B]/20"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>

          <div className={cn("flex flex-col gap-5", bodyClassName)}>{children}</div>

          {footer ? <div className="pt-5">{footer}</div> : null}
        </div>
      </DialogPrimitive.Content>
      </DialogPortal>
  );
}
