import type { ButtonHTMLAttributes, ReactNode } from "react";
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
    <SheetHeader className={cn("mb-0 flex flex-col gap-4 pr-14 sm:pr-16", className)}>
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(123,30,43,0.12),rgba(200,169,106,0.10))] text-[#7B1E2B] shadow-[0_10px_28px_-18px_rgba(123,30,43,0.18)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <SheetTitle className="text-[28px] font-semibold tracking-[-0.03em] text-[#1A1713] sm:text-[32px]">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="mt-1.5 max-w-[34rem] text-[14px] font-medium leading-7 tracking-[-0.01em] text-[#6B6B6B] sm:text-[15px]">
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
        "rounded-[24px] border px-5 py-5 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.14)] sm:px-6 sm:py-6",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(248,244,237,0.66) 100%)",
        borderColor: "rgba(95,111,82,0.12)",
        backdropFilter: "blur(14px) saturate(1.06)",
        WebkitBackdropFilter: "blur(14px) saturate(1.06)",
      }}
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
      className={cn(
        "h-14 rounded-[18px] px-5 text-[15px] font-semibold tracking-[-0.01em] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_14px_28px_-18px_rgba(0,0,0,0.2)]",
        className,
      )}
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
    <div
      className={cn("rounded-[22px] ring-1 px-5 py-4 sm:px-6 sm:py-5", toneClassName)}
      style={{
        backdropFilter: "blur(10px) saturate(1.04)",
        WebkitBackdropFilter: "blur(10px) saturate(1.04)",
      }}
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/75 ring-1 ring-black/5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-6 tracking-[-0.02em] sm:text-[17px]">{title}</p>
          <p className="text-[13.5px] leading-7 text-[#5F5F5F] sm:text-[14px]">{description}</p>
          {warning ? <p className="mt-1.5 text-[12.5px] leading-6 font-medium text-[#8B7730] sm:text-[13px]">{warning}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AiFilterChip({
  selected,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
}) {
  return (
    <Button
      {...props}
      variant="ghost"
      className={cn(
        "h-9 rounded-full px-4 text-[12px] font-semibold transition-all duration-200",
        selected
          ? "bg-[rgba(123,30,43,0.10)] text-[#5A1528] border border-[rgba(123,30,43,0.14)] shadow-[0_8px_18px_-16px_rgba(123,30,43,0.24)] hover:bg-[rgba(123,30,43,0.12)]"
          : "bg-[rgba(255,255,255,0.70)] text-[#5F5F5F] border border-black/5 hover:bg-[rgba(255,255,255,0.9)] hover:text-[#1A1713]",
        className,
      )}
    >
      {children}
    </Button>
  );
}

export function AiSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B6258]", className)}>
      {children}
    </p>
  );
}
