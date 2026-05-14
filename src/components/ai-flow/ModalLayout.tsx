import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from "react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AI_MODAL_SHEET_CONTENT_CLASSNAME =
  "left-1/2 top-1/2 right-auto bottom-auto h-[92dvh] max-h-[92dvh] w-[96vw] max-w-none -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[30px] border-0 p-0 gap-0";

export const AI_MODAL_SHEET_CONTENT_STYLE: CSSProperties = {
  left: "50%",
  top: "50%",
  right: "auto",
  bottom: "auto",
  transform: "translate(-50%, -50%)",
  width: "min(96vw, 1240px)",
  maxWidth: "1240px",
  maxHeight: "92dvh",
  height: "92dvh",
  background:
    "linear-gradient(145deg, rgba(249,245,239,0.98) 0%, rgba(243,236,228,0.98) 48%, rgba(236,228,216,0.98) 100%)",
  backdropFilter: "blur(18px) saturate(1.06)",
  WebkitBackdropFilter: "blur(18px) saturate(1.06)",
  boxShadow: "0 34px 88px rgba(38,24,18,0.16)",
};

export function AiModalShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex h-full min-h-0 flex-col", className)}>{children}</div>;
}

export function AiModalHeaderBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 shrink-0 border-b border-white/55 px-5 py-4 sm:px-6 sm:py-4.5",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, rgba(249,245,239,0.92) 0%, rgba(249,245,239,0.76) 100%)",
        backdropFilter: "blur(18px) saturate(1.08)",
        WebkitBackdropFilter: "blur(18px) saturate(1.08)",
      }}
    >
      {children}
    </div>
  );
}

export function AiModalBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-hidden px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-[calc(22px+env(safe-area-inset-bottom))] sm:pt-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AiModalFooterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 shrink-0 border-t border-white/55 px-5 py-3 sm:px-6 sm:py-3.5",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, rgba(249,245,239,0.76) 0%, rgba(249,245,239,0.92) 100%)",
        backdropFilter: "blur(18px) saturate(1.08)",
        WebkitBackdropFilter: "blur(18px) saturate(1.08)",
      }}
    >
      {children}
    </div>
  );
}

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
    <SheetHeader className={cn("mb-0 flex flex-col gap-3.5 pr-14 sm:pr-16", className)}>
      <div className="flex items-start gap-4.5">
        {icon ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,rgba(123,30,43,0.13),rgba(200,169,106,0.10))] text-[#7B1E2B] shadow-[0_14px_34px_-22px_rgba(123,30,43,0.2)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <SheetTitle className="text-[30px] font-semibold tracking-[-0.04em] text-[#1A1713] sm:text-[36px]">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="mt-1.5 max-w-[42rem] text-[13px] font-medium leading-6 tracking-[-0.01em] text-[#6B6B6B] sm:text-[14px]">
              {description}
            </SheetDescription>
          ) : null}
        </div>
      </div>
    </SheetHeader>
  );
}

export function AiModalSplitLayout({
  sidebar,
  children,
  sidebarClassName,
  contentClassName,
  className,
}: {
  sidebar?: ReactNode;
  children: ReactNode;
  sidebarClassName?: string;
  contentClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]",
        className,
      )}
    >
      {sidebar ? (
        <aside className={cn("min-h-0 xl:overflow-hidden", sidebarClassName)}>
          <div className="flex max-h-full flex-col gap-3 xl:sticky xl:top-0 xl:overflow-y-auto xl:pr-1">
            {sidebar}
          </div>
        </aside>
      ) : null}
      <section className={cn("min-h-0 overflow-y-auto pr-1", contentClassName)}>{children}</section>
    </div>
  );
}

export function AiModalSidebarCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(246,240,232,0.76)_100%)] px-4 py-4 shadow-[0_16px_36px_-28px_rgba(33,20,12,0.2)] backdrop-blur-xl sm:px-5 sm:py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AiModalEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(72,60,46,0.52)]", className)}>
      {children}
    </p>
  );
}

export function AiModalKeyValue({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(72,60,46,0.5)]">{label}</span>
      <span className="text-right text-[12.5px] font-medium leading-5 text-[#241d18]">{value}</span>
    </div>
  );
}

export function AiToolbarSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(247,242,235,0.70)_100%)] px-3 py-2.5 shadow-[0_14px_28px_-24px_rgba(54,36,22,0.22)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
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
        "rounded-[22px] border px-4 py-4 shadow-[0_16px_32px_-28px_rgba(0,0,0,0.18)] sm:px-5 sm:py-5",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(248,244,237,0.72) 100%)",
        borderColor: "rgba(95,111,82,0.12)",
        backdropFilter: "blur(16px) saturate(1.08)",
        WebkitBackdropFilter: "blur(16px) saturate(1.08)",
      }}
    >
      {children}
    </div>
  );
}

const metricToneClasses = {
  neutral: "border-white/60 bg-white/72 text-[#5F5F5F]",
  success: "border-emerald-100 bg-emerald-50/90 text-emerald-700",
  warning: "border-amber-100 bg-amber-50/90 text-amber-700",
  danger: "border-rose-100 bg-rose-50/90 text-rose-700",
  accent: "border-[#E9D3D8] bg-[#F4E7EA] text-[#7B1E2B]",
} as const;

export function AiMetricPill({
  label,
  value,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: keyof typeof metricToneClasses;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
        metricToneClasses[tone],
        className,
      )}
    >
      <span className="text-[12px] font-semibold">{value}</span>
      {label}
    </span>
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
        "h-12 rounded-[16px] px-5 text-[14px] font-semibold tracking-[-0.01em] shadow-[0_12px_24px_-18px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_16px_28px_-18px_rgba(0,0,0,0.2)]",
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
