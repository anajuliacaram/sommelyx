import type { ReactNode } from "react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiModalHeader({
  icon,
  title,
  description,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
  }) {
  return (
    <SheetHeader className={cn("mb-0 flex flex-col gap-3 pr-14 sm:pr-16", className)}>
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/12 to-[#C8A96A]/12 text-[#7B1E2B]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <SheetTitle className="text-[22px] font-semibold tracking-tight text-[#1E1E1E] sm:text-[26px]">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="mt-1 text-[13px] font-medium leading-relaxed tracking-tight text-[#6B6B6B] sm:text-sm">
              {description}
            </SheetDescription>
          ) : null}
        </div>
      </div>
    </SheetHeader>
  );
}

export function AiModalCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/30 bg-white/60 px-5 py-5 shadow-[0_10px_28px_-22px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AiModalActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      {children}
    </div>
  );
}

export function AiModalActionButton({
  className,
  ...props
}: ButtonProps) {
  return (
    <Button
      {...props}
      className={cn("h-14 rounded-2xl px-5 text-[14px] font-semibold tracking-tight", className)}
    />
  );
}

export function AiStatusCard({
  icon,
  title,
  description,
  toneClassName,
  warning,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  toneClassName: string;
  warning?: string | null;
}) {
  return (
    <div className={cn("rounded-2xl ring-1 px-5 py-4", toneClassName)}>
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/75 ring-1 ring-black/5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-6 sm:text-[16px]">{title}</p>
          <p className="text-[13px] leading-6 opacity-80 sm:text-[14px]">{description}</p>
          {warning ? <p className="mt-1 text-[13px] leading-6 font-medium sm:text-[14px]">{warning}</p> : null}
        </div>
      </div>
    </div>
  );
}
