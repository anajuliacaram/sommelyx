import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { ModalCloseButton } from "@/components/ui/modal-close-button";

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
        className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        style={undefined}
      >
        <div
          data-radix-dialog-content=""
          className={cn(
            "modal-container premium-modal-shell relative flex w-full max-w-[1100px] flex-col overflow-hidden rounded-t-[24px] max-h-[calc(100dvh-8px)] sm:max-h-[92vh] sm:rounded-[28px]",
            className,
          )}
          style={undefined}
        >
          <div className="shrink-0 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className="flex items-start gap-4">
            <div className="modal-header-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/20 to-[#C8A96A]/20 text-[#7B1E2B]">
              {icon}
            </div>
            <div className="modal-header-text min-w-0 flex-1">
              <DialogTitle className="modal-header-title text-2xl font-semibold tracking-tight text-[#1A1714]">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="modal-header-sub mt-1 text-sm font-medium tracking-tight text-[#6B5E52] leading-relaxed">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <ModalCloseButton
                className="modal-close-btn shrink-0"
                label="Fechar modal"
                onClick={onClose}
              />
            </DialogPrimitive.Close>
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(18px+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6",
              bodyClassName,
            )}
          >
            <div className="flex flex-col gap-5">{children}</div>
          </div>

          {footer ? (
            <div className="shrink-0 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6 sm:pt-5">
              {footer}
            </div>
          ) : null}
        </div>
      </DialogPrimitive.Content>
      </DialogPortal>
  );
}
