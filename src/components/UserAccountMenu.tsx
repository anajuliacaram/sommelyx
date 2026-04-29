import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LogOut, Settings, User } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { cn } from "@/lib/utils";

interface UserAccountMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email?: string | null;
  initials: string;
  onProfile: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}

export const UserAccountMenu = React.memo(function UserAccountMenu({
  open,
  onOpenChange,
  name,
  email,
  initials,
  onProfile,
  onSettings,
  onSignOut,
}: UserAccountMenuProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/35 backdrop-blur-[8px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4",
            "outline-none",
          )}
        >
          <div
            className={cn(
              "relative w-full max-w-[440px] overflow-hidden rounded-t-[24px] border border-white/50",
              "bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.90)_48%,rgba(248,244,237,0.92)_100%)]",
              "p-4 shadow-[0_30px_80px_-36px_rgba(58,51,39,0.38),0_10px_30px_-22px_rgba(0,0,0,0.18)]",
              "backdrop-blur-2xl saturate-150 sm:rounded-[22px] sm:p-5",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=open]:slide-in-from-bottom-3 sm:data-[state=open]:slide-in-from-bottom-0",
              "max-h-[calc(100dvh-16px)] sm:max-h-[88vh]",
              "pb-[calc(16px+env(safe-area-inset-bottom))] sm:pb-5",
            )}
          >
            <ModalCloseButton
              className="absolute right-4 top-4 z-10"
              label="Fechar menu da conta"
              onClick={() => onOpenChange(false)}
            />

            <DialogPrimitive.Title className="sr-only">Menu da conta</DialogPrimitive.Title>

            <div className="pr-14">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(123,30,43,0.14),rgba(95,111,82,0.14))] text-[14px] font-bold text-[#7B1E2B] ring-1 ring-black/5">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-[1.2] text-neutral-900">
                    {name}
                  </p>
                  {email ? (
                    <p className="mt-0.5 truncate text-[12px] leading-[1.25] text-neutral-600">
                      {email}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[12px] leading-[1.25] text-neutral-600">
                      Email indisponível
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full justify-start gap-2 rounded-[16px] px-4 text-[13px] font-semibold"
                onClick={onProfile}
              >
                <User className="h-4 w-4 text-[#7B1E2B]" />
                Meu perfil
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-start gap-2 rounded-[16px] px-4 text-[13px] font-semibold"
                onClick={onSettings}
              >
                <Settings className="h-4 w-4 text-[#5F7F52]" />
                Configurações
              </Button>
              <div className="pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full justify-start gap-2 rounded-[16px] border border-red-500/10 bg-red-500/[0.05] px-4 text-[13px] font-semibold text-red-700 hover:bg-red-500/[0.08] hover:text-red-800"
                  onClick={onSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});

UserAccountMenu.displayName = "UserAccountMenu";
