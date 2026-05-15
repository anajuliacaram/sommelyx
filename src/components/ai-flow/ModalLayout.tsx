import type { ButtonHTMLAttributes, ReactNode, CSSProperties, DragEventHandler } from "react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AI_MODAL_SURFACE = "#FBF8F3";
export const AI_MODAL_INK = "#1A1713";
export const AI_MODAL_MUTED = "#6B6258";
export const AI_MODAL_ACCENT = "#7B1E2B";
export const AI_MODAL_CARD_SURFACE = "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(249,244,237,0.82) 100%)";
export const AI_MODAL_CARD_BORDER = "rgba(95,111,82,0.10)";
export const AI_MODAL_SOFT_SURFACE = "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(249,244,237,0.76) 100%)";

export const AI_MODAL_CARD_CLASSNAME =
  "premium-card-surface rounded-[18px] border border-[rgba(95,111,82,0.10)] shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_18px_32px_-30px_rgba(58,51,39,0.24)]";

export const AI_MODAL_ACTION_TILE_CLASSNAME =
  "premium-card-surface premium-card-surface-hover rounded-[18px] border border-[rgba(95,111,82,0.10)] shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_16px_30px_-30px_rgba(58,51,39,0.22)]";

export const AI_MODAL_SHEET_CONTENT_CLASSNAME =
  "left-1/2 top-1/2 right-auto bottom-auto h-[88dvh] max-h-[88dvh] w-[94vw] max-w-none -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] border-0 p-0 gap-0";

export const AI_MODAL_SHEET_CONTENT_STYLE: CSSProperties = {
  left: "50%",
  top: "50%",
  right: "auto",
  bottom: "auto",
  transform: "translate(-50%, -50%)",
  width: "min(94vw, 840px)",
  maxWidth: "880px",
  maxHeight: "88dvh",
  height: "88dvh",
  background: "linear-gradient(180deg, rgba(252,249,244,0.98) 0%, rgba(246,240,233,0.97) 100%)",
  border: "1px solid rgba(95,111,82,0.10)",
  backdropFilter: "blur(22px) saturate(1.08)",
  WebkitBackdropFilter: "blur(22px) saturate(1.08)",
  boxShadow: "0 28px 64px rgba(38,24,18,0.16), inset 0 1px 0 rgba(255,255,255,0.56)",
};

export const AI_MODAL_DIALOG_CONTENT_CLASSNAME =
  "items-center overflow-hidden rounded-[20px] border border-[rgba(95,111,82,0.10)] p-0 shadow-[0_28px_64px_rgba(38,24,18,0.16)] sm:max-w-[880px]";

export const AI_MODAL_DIALOG_CONTENT_STYLE: CSSProperties = {
  background: "linear-gradient(180deg, rgba(252,249,244,0.98) 0%, rgba(246,240,233,0.97) 100%)",
  backdropFilter: "blur(22px) saturate(1.08)",
  WebkitBackdropFilter: "blur(22px) saturate(1.08)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.56)",
};

export const AI_MODAL_FIELD_CLASSNAME =
  "h-9 rounded-[14px] border border-[rgba(95,111,82,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(249,246,241,0.80)_100%)] px-3 text-[12.5px] font-medium text-[#1A1713] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_18px_-18px_rgba(58,51,39,0.18)] transition-all duration-180 placeholder:text-[#8C8579] focus-visible:border-[rgba(123,30,43,0.16)] focus-visible:bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,252,248,0.90)_100%)] focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/10 focus-visible:ring-offset-0 disabled:opacity-60 sm:h-10 sm:text-[13px]";

export const AI_MODAL_TEXTAREA_CLASSNAME =
  "min-h-[82px] rounded-[14px] border border-[rgba(95,111,82,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(249,246,241,0.80)_100%)] px-3 py-2.5 text-[12.5px] font-medium text-[#1A1713] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_18px_-18px_rgba(58,51,39,0.18)] transition-all duration-180 placeholder:text-[#8C8579] focus-visible:border-[rgba(123,30,43,0.16)] focus-visible:bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,252,248,0.90)_100%)] focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/10 focus-visible:ring-offset-0 sm:text-[13px]";

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
        "sticky top-0 z-20 shrink-0 px-3.5 py-3 sm:px-4 sm:py-3.5",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, rgba(252,249,244,0.94) 0%, rgba(250,245,239,0.82) 100%)",
        backdropFilter: "blur(20px) saturate(1.08)",
        WebkitBackdropFilter: "blur(20px) saturate(1.08)",
        boxShadow: "0 10px 24px -24px rgba(38,24,18,0.36)",
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
        "min-h-0 flex-1 overflow-hidden px-3.5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2.5 sm:px-4 sm:pb-[calc(14px+env(safe-area-inset-bottom))] sm:pt-3",
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
        "sticky bottom-0 z-20 shrink-0 px-3.5 py-2.5 sm:px-4",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, rgba(250,245,239,0.82) 0%, rgba(252,249,244,0.95) 100%)",
        backdropFilter: "blur(20px) saturate(1.08)",
        WebkitBackdropFilter: "blur(20px) saturate(1.08)",
        boxShadow: "0 -10px 24px -24px rgba(38,24,18,0.36)",
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
  tone = "wine",
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  tone?: "wine" | "gold" | "purple" | "neutral";
  className?: string;
}) {
  const toneClasses = {
    wine:
      "border-[rgba(123,30,43,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(249,241,242,0.82)_100%)] text-[#7B1E2B] shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_12px_24px_-22px_rgba(122,20,30,0.20)]",
    gold:
      "border-[rgba(183,121,31,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(249,244,232,0.82)_100%)] text-[#B7791F] shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_12px_24px_-22px_rgba(183,121,31,0.22)]",
    purple:
      "border-[rgba(155,93,229,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,239,251,0.82)_100%)] text-[#9B5DE5] shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_12px_24px_-22px_rgba(155,93,229,0.22)]",
    neutral:
      "border-[rgba(95,111,82,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(248,244,238,0.82)_100%)] text-[#5F6F52] shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_12px_24px_-22px_rgba(58,51,39,0.18)]",
  } as const;

  return (
    <SheetHeader className={cn("mb-0 flex flex-col gap-2 pr-11 sm:pr-12", className)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border", toneClasses[tone])}>
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <SheetTitle className="text-[20px] font-semibold leading-tight tracking-[-0.018em] text-[#1A1713] sm:text-[22px]">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="mt-0.5 max-w-[38rem] text-[12px] font-medium leading-[1.5] text-[#6B6258] sm:text-[12.5px]">
              {description}
            </SheetDescription>
          ) : null}
        </div>
      </div>
    </SheetHeader>
  );
}

export function AiModalSplitLayout({
  children,
  contentClassName,
  className,
}: {
  children: ReactNode;
  contentClassName?: string;
  className?: string;
}) {
  const hasCustomOverflow = typeof contentClassName === "string" && /\boverflow(?:-[xy])?-/.test(contentClassName);
  return (
    <div
      className={cn(
        "grid h-full min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden",
        className,
      )}
    >
      <section className={cn("h-full min-h-0 pr-1", !hasCustomOverflow && "overflow-y-auto", contentClassName)}>{children}</section>
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
        "premium-card-surface rounded-[16px] border border-[rgba(95,111,82,0.10)] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_14px_26px_-26px_rgba(58,51,39,0.22)]",
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
        "premium-card-surface rounded-[18px] border px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_18px_32px_-30px_rgba(58,51,39,0.24)] sm:px-3.5 sm:py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

const metricToneClasses = {
  neutral: "border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] text-[#5F5F5F]",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium shadow-none",
        metricToneClasses[tone],
        className,
      )}
    >
      <span className="text-[11.5px] font-semibold">{value}</span>
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
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      {children}
    </div>
  );
}

export function AiModalActionButton({
  className,
  ...props
}: ButtonProps) {
  const variant = props.variant ?? "primary";
  const variantClassName =
    variant === "ghost"
      ? "h-9 rounded-[16px] px-3.5 text-[12.5px] font-semibold text-[#4A4338] hover:bg-[rgba(255,255,255,0.56)] hover:text-[#1A1713]"
      : variant === "secondary" || variant === "outline" || variant === "success"
        ? "h-9 rounded-[16px] px-4 text-[12.5px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_24px_-24px_rgba(58,51,39,0.24)]"
        : "h-9 rounded-[16px] px-4 text-[12.5px] font-semibold shadow-[0_14px_26px_-18px_rgba(122,20,30,0.24)] hover:shadow-[0_18px_30px_-20px_rgba(122,20,30,0.28)]";

  return (
    <Button
      {...props}
      className={cn(
        "tracking-[-0.005em] transition-all duration-180 active:translate-y-[0.5px] sm:h-10 sm:text-[13px]",
        variantClassName,
        className,
      )}
    />
  );
}

export function AiUploadPanel({
  icon,
  title,
  description,
  onClick,
  children,
  className,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "premium-card-surface premium-card-surface-hover group flex cursor-pointer items-center justify-start gap-3 rounded-[18px] border border-[rgba(95,111,82,0.10)] px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_16px_30px_-30px_rgba(58,51,39,0.22)] transition-all duration-180 data-[dragging=true]:bg-[rgba(255,255,255,0.9)]",
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(95,111,82,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(249,244,237,0.82)_100%)] text-[#7B1E2B] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_24px_-22px_rgba(122,20,30,0.18)] transition-transform duration-180 group-hover:scale-105">
        {icon}
      </div>
      <div className="max-w-[320px]">
        <p className="text-[14px] font-semibold tracking-[-0.012em] text-[#1A1713]">{title}</p>
        {description ? <p className="mt-0.5 text-[12px] leading-5 text-[#6B6258]">{description}</p> : null}
      </div>
      {children}
    </div>
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
      className={cn("premium-card-surface rounded-[18px] border border-[rgba(95,111,82,0.10)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_16px_30px_-30px_rgba(58,51,39,0.22)] sm:px-3.5 sm:py-3.5", toneClassName)}
      style={{
        backdropFilter: "blur(10px) saturate(1.04)",
        WebkitBackdropFilter: "blur(10px) saturate(1.04)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[11px] bg-[rgba(255,251,244,0.74)] ring-1 ring-black/5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-5 tracking-[-0.01em] sm:text-[15px]">{title}</p>
          <p className="text-[12.5px] leading-5 text-[#5F5F5F]">{description}</p>
          {warning ? <p className="mt-1 text-[12px] leading-5 font-medium text-[#8B7730]">{warning}</p> : null}
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
        "h-7 rounded-full px-2.5 text-[10.5px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.64),0_10px_20px_-22px_rgba(58,51,39,0.22)] transition-all duration-180",
        selected
          ? "border border-[rgba(123,30,43,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(249,241,242,0.82)_100%)] text-[#5A1528] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(249,241,242,0.9)_100%)]"
          : "border border-[rgba(95,111,82,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(249,246,241,0.80)_100%)] text-[#5F5F5F] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,252,248,0.90)_100%)] hover:text-[#1A1713]",
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
