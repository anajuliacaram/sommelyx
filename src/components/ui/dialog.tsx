import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@/icons/lucide";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-[6px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-180 data-[state=closed]:duration-150",
        className,
      )}
      {...props}
    />
  ));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Premium clean editorial standard (estilo "Harmonização IA")
        "fixed inset-0 z-50 flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4",
        className,
      )}
      {...props}
    >
      <div
          className={cn(
          "relative w-full max-w-[640px] max-h-[calc(100dvh-8px)] overflow-hidden rounded-t-[24px] border border-black/[0.04] bg-[#F4F1EC] p-4 shadow-[0_26px_64px_rgba(0,0,0,0.10)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:duration-180 data-[state=closed]:duration-150 sm:max-h-[90vh] sm:rounded-[24px] sm:p-6",
          className,
        )}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 flex min-h-11 min-w-11 h-11 w-11 items-center justify-center rounded-full bg-black/[0.05] text-[#3A3327]/70 transition-all duration-180 ease-out hover:-translate-y-px hover:scale-[1.03] hover:bg-black/[0.08] hover:text-[#1A1713] active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-[#7B1E2B]/20 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-4 mb-6 text-left pr-10 [&>p]:mt-0", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-3", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-serif text-[20px] sm:text-[28px] font-semibold text-[#1A1713] leading-[1.15]",
      className,
    )}
    style={{ fontFamily: "'Libre Baskerville', Georgia, serif", letterSpacing: "-0.02em" }}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[15px] font-normal leading-relaxed text-[rgba(58,51,39,0.65)]", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
