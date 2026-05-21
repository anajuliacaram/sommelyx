import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
import { ModalCloseButton } from "@/components/ui/modal-close-button";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Overlay
    data-radix-dialog-overlay=""
    data-radix-sheet-overlay=""
    className={cn(
      "premium-modal-overlay fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-300 data-[state=closed]:duration-220",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 p-3.5 sm:p-5 transition ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-220 data-[state=open]:duration-300 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b rounded-b-3xl data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t rounded-t-3xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-[92vw] rounded-r-3xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-[92vw] border-l rounded-l-3xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  centered?: boolean;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", centered = false, className, children, style, ...props }, ref) => {
    const isModalContainer = typeof className === "string" && className.includes("modal-container");
    const isActionModal = typeof className === "string" && className.includes("sx-action-modal");
    const isCentered = centered || isModalContainer;

    if (isCentered) {
      return (
        <SheetPortal>
          <SheetOverlay />
          <SheetPrimitive.Content
            ref={ref}
            className={cn(
              isActionModal
                ? "premium-modal-sheet fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 pointer-events-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-180 data-[state=open]:duration-220 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                : "premium-modal-sheet fixed inset-0 z-50 flex items-end justify-center overflow-hidden p-0 pointer-events-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:items-center sm:p-4 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
            )}
            {...props}
          >
            <div
              data-radix-dialog-content=""
              data-radix-sheet-content=""
              data-side={isActionModal ? "center" : "bottom"}
              data-modal-variant={isActionModal ? "action" : undefined}
              className={cn("premium-modal-shell pointer-events-auto flex max-h-[92dvh] flex-col", className)}
              style={style}
            >
              {children}
              <SheetPrimitive.Close asChild>
                <ModalCloseButton className="modal-close-btn absolute right-3.5 top-3.5 z-50" label="Fechar modal" />
              </SheetPrimitive.Close>
            </div>
          </SheetPrimitive.Content>
        </SheetPortal>
      );
    }

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={ref}
          data-radix-dialog-content=""
          data-radix-sheet-content=""
          data-side={side}
          className={cn("premium-modal-shell", !isCentered && sheetVariants({ side }), className)}
          style={style}
          {...props}
        >
          {children}
          <SheetPrimitive.Close asChild>
            <ModalCloseButton className="modal-close-btn absolute right-3.5 top-3.5 z-50" label="Fechar modal" />
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 flex flex-col gap-3 text-left pr-14 sm:pr-16 sm:flex-row sm:items-start", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3 pt-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-[20px] font-semibold tracking-[-0.02em] text-[#1A1713] sm:text-[28px]", className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("mt-1 text-[14px] font-medium leading-6 tracking-[-0.01em] text-[#6B5E52] sm:text-[15px]", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
