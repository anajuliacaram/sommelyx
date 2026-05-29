import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { CSSProperties, ReactNode } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { cn } from "@/lib/utils";

type ActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

type ActionDialogContentProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
};

export function ActionDialog({ open, onOpenChange, children }: ActionDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function ActionDialogContent({ children, className, style, "aria-label": ariaLabel }: ActionDialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-radix-dialog-overlay=""
        className="premium-modal-overlay fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-220 data-[state=closed]:duration-180"
      />
      <DialogPrimitive.Content
        data-action-dialog-root=""
        aria-label={ariaLabel}
        aria-describedby={undefined}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <DialogPrimitive.Title className="sr-only">{ariaLabel ?? "Modal"}</DialogPrimitive.Title>
        <div
          data-radix-dialog-content=""
          data-modal-variant="action"
          className={cn(
            "modal-container premium-modal-shell sx-ai-modal sx-action-modal sx-v2-modal-shell pointer-events-auto flex min-h-0 flex-col overflow-hidden",
            className,
          )}
          style={style}
        >
          {children}
          <DialogPrimitive.Close asChild>
            <ModalCloseButton className="modal-close-btn absolute right-4 top-4 z-50" label="Fechar modal" />
          </DialogPrimitive.Close>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const ActionDialogTitle = DialogPrimitive.Title;
export const ActionDialogDescription = DialogPrimitive.Description;
