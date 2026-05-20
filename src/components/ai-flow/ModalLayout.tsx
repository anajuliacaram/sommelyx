import type { ButtonHTMLAttributes, ReactNode, CSSProperties, DragEventHandler } from "react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AI_MODAL_SURFACE = "var(--sx-bg-card)";
export const AI_MODAL_INK = "var(--sx-text-headline)";
export const AI_MODAL_MUTED = "var(--sx-text-secondary)";
export const AI_MODAL_ACCENT = "var(--sx-bordeaux)";
export const AI_MODAL_CARD_SURFACE = "var(--sx-bg-input)";
export const AI_MODAL_CARD_BORDER = "var(--sx-border-default)";
export const AI_MODAL_SOFT_SURFACE = "var(--sx-bg-row)";

export const AI_MODAL_CARD_CLASSNAME =
  "premium-card-surface rounded-[18px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.50)_0%,rgba(249,244,237,0.36)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_18px_38px_-34px_rgba(58,51,39,0.16)]";

export const AI_MODAL_ACTION_TILE_CLASSNAME =
  "modal-action-card premium-card-surface premium-card-surface-hover rounded-[16px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(249,244,237,0.32)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_18px_38px_-34px_rgba(58,51,39,0.14)]";

export const AI_MODAL_SHEET_CONTENT_CLASSNAME =
  "left-1/2 top-1/2 right-auto bottom-auto h-[90dvh] max-h-[90dvh] w-[94vw] max-w-none -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border-0 p-0 gap-0";

export const AI_MODAL_SHEET_CONTENT_STYLE: CSSProperties = {
  left: "50%",
  top: "50%",
  right: "auto",
  bottom: "auto",
  transform: "translate(-50%, -50%)",
  width: "min(94vw, 840px)",
  maxWidth: "880px",
  maxHeight: "90dvh",
  height: "90dvh",
  background: "var(--sx-bg-card)",
  border: "0.5px solid var(--sx-border-default)",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "var(--sx-shadow-modal)",
};

export const AI_MODAL_DIALOG_CONTENT_CLASSNAME =
  "items-center overflow-hidden rounded-[20px] border border-[rgba(95,111,82,0.07)] p-0 shadow-[0_24px_56px_rgba(38,24,18,0.14)] sm:max-w-[880px]";

export const AI_MODAL_DIALOG_CONTENT_STYLE: CSSProperties = {
  background: "var(--sx-bg-card)",
  border: "0.5px solid var(--sx-border-default)",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "var(--sx-shadow-modal)",
};

export const AI_MODAL_FIELD_CLASSNAME =
  "modal-input h-8 rounded-[14px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(249,244,237,0.34)_100%)] px-3 text-[12px] font-medium text-[rgba(36,30,24,0.84)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_14px_28px_-30px_rgba(58,51,39,0.12)] backdrop-blur-xl transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-[rgba(108,96,84,0.48)] focus-visible:border-[rgba(123,30,43,0.14)] focus-visible:bg-[linear-gradient(180deg,rgba(255,255,255,0.62)_0%,rgba(252,248,242,0.48)_100%)] focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/5 focus-visible:ring-offset-0 disabled:opacity-60 sm:h-9 sm:text-[12.5px]";

export const AI_MODAL_TEXTAREA_CLASSNAME =
  "modal-input min-h-[72px] rounded-[13px] border border-[rgba(95,111,82,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.62)_0%,rgba(249,244,237,0.56)_100%)] px-3 py-2 text-[12px] font-medium text-[rgba(36,30,24,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.56),0_6px_14px_-18px_rgba(58,51,39,0.10)] transition-all duration-180 placeholder:text-[rgba(108,96,84,0.52)] focus-visible:border-[rgba(123,30,43,0.12)] focus-visible:bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(252,248,242,0.68)_100%)] focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/6 focus-visible:ring-offset-0 sm:text-[12.5px]";

export const AI_MODAL_COMPACT_STACK_CLASSNAME = "space-y-1";
export const AI_MODAL_SECTION_STACK_CLASSNAME = "space-y-1.5";
export const AI_MODAL_LABEL_CLASSNAME =
  "modal-field-label text-[11px] font-medium tracking-[-0.01em] text-[rgba(72,60,46,0.64)]";
export const AI_MODAL_HELP_TEXT_CLASSNAME =
  "text-[11px] leading-[1.42] text-[rgba(72,60,46,0.60)]";
export const AI_MODAL_META_TEXT_CLASSNAME =
  "text-[10.5px] leading-[1.38] text-[rgba(72,60,46,0.56)]";
export const AI_MODAL_TEXT_PRIMARY_CLASSNAME =
  "text-[13px] font-medium tracking-[-0.018em] text-[rgba(32,26,21,0.88)]";
export const AI_MODAL_TEXT_SECONDARY_CLASSNAME =
  "text-[14px] font-medium tracking-[-0.02em] text-[rgba(32,26,21,0.88)]";
export const AI_MODAL_PILL_TEXT_CLASSNAME =
  "text-[8.5px] font-medium uppercase tracking-[0.08em]";
export const AI_MODAL_SELECTION_CARD_CLASSNAME =
  "segment-card premium-card-surface flex min-h-[48px] flex-col justify-between rounded-[15px] border px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_8px_18px_-24px_rgba(58,51,39,0.08)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/10";
export const AI_MODAL_SELECTION_CARD_ACTIVE_CLASSNAME =
  "active border-[rgba(123,30,43,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.70)_0%,rgba(249,241,242,0.62)_100%)]";
export const AI_MODAL_SELECTION_CARD_IDLE_CLASSNAME =
  "border-[rgba(95,111,82,0.04)] bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(249,244,237,0.46)_100%)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.62)_0%,rgba(252,248,242,0.56)_100%)]";
export const AI_MODAL_LIST_SURFACE_CLASSNAME =
  "modal-wine-list-wrap cellar-scroll overflow-y-auto rounded-[16px] bg-transparent pr-0.5";
export const AI_MODAL_LIST_ROW_CLASSNAME =
  "modal-wine-row flex w-full items-center gap-2 rounded-[13px] px-2.5 py-1.5 text-left transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[rgba(255,255,255,0.24)] hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/8";
export const AI_MODAL_LIST_ROW_SELECTED_CLASSNAME =
  "bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(249,241,242,0.36)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]";
export const AI_MODAL_INLINE_ACTION_CLASSNAME =
  "h-6 rounded-full border border-[rgba(58,51,39,0.06)] bg-transparent px-2.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[#7B1E2B]/82 shadow-none hover:bg-[rgba(255,251,244,0.54)]";
export const AI_MODAL_SEGMENTED_BUTTON_CLASSNAME =
  "h-7 rounded-[11px] border px-1 text-[9px] font-medium transition-colors duration-150";
export const AI_MODAL_SEGMENTED_BUTTON_ACTIVE_CLASSNAME =
  "border-[#7B1E2B]/88 bg-[linear-gradient(135deg,#7B1E2B,#8A2536)] text-white shadow-[0_10px_18px_-18px_rgba(122,20,30,0.24)]";
export const AI_MODAL_SEGMENTED_BUTTON_IDLE_CLASSNAME =
  "border-[rgba(95,111,82,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.62)_0%,rgba(249,244,237,0.56)_100%)] text-[rgba(72,60,46,0.64)] shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_6px_14px_-20px_rgba(58,51,39,0.10)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(252,248,242,0.66)_100%)]";

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
        "shrink-0 px-3.5 pb-1 pt-3 sm:px-4 sm:pb-1.5 sm:pt-4",
        className,
      )}
      style={{
        background: "transparent",
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
        "min-h-0 flex-1 overflow-hidden px-3.5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-1 sm:px-4 sm:pb-[calc(14px+env(safe-area-inset-bottom))]",
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
        "shrink-0 px-3.5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-[calc(12px+env(safe-area-inset-bottom))]",
        className,
      )}
      style={{
        background: "transparent",
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
    <SheetHeader className={cn("modal-header mb-0 flex flex-col gap-1.5 pr-11 sm:pr-12", className)}>
      <div className="flex items-start gap-2.5">
        {icon ? (
          <div className={cn("modal-icon-circle flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border", toneClasses[tone])}>
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <SheetTitle className="modal-title text-[18px] font-medium leading-tight tracking-[-0.02em] text-[rgba(32,26,21,0.88)] sm:text-[20px]">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="modal-subtitle mt-0.5 max-w-[38rem] text-[11.5px] font-normal leading-[1.45] text-[rgba(72,60,46,0.60)] sm:text-[12px]">
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
        "grid h-full min-h-0 flex-1 grid-cols-1 gap-1.5 overflow-hidden",
        className,
      )}
    >
      <section className={cn("h-full min-h-0 pr-0.5", !hasCustomOverflow && "overflow-y-auto", contentClassName)}>{children}</section>
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
    <p className={cn("text-[9.5px] font-medium uppercase tracking-[0.16em] text-[rgba(72,60,46,0.46)]", className)}>
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
      <span className="text-[9.5px] font-medium uppercase tracking-[0.12em] text-[rgba(72,60,46,0.46)]">{label}</span>
      <span className="text-right text-[12px] font-medium leading-[1.42] text-[rgba(36,30,24,0.86)]">{value}</span>
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
        "rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(249,244,237,0.20)_100%)] px-1.5 py-1 shadow-none",
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
        "rounded-[16px] border border-[rgba(95,111,82,0.04)] bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(249,244,237,0.44)_100%)] px-3 py-2.25 shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_8px_18px_-24px_rgba(58,51,39,0.08)] sm:px-3.5 sm:py-2.5",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-none",
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
  const modalButtonClassName = variant === "secondary" || variant === "outline" || variant === "success"
    ? "modal-btn-secondary"
    : variant === "ghost"
      ? ""
      : "modal-btn-primary";
  const variantClassName =
    variant === "ghost"
      ? "h-8 rounded-[15px] px-3 text-[12px] font-medium text-[#4A4338] hover:bg-[rgba(255,255,255,0.40)] hover:text-[#1A1713]"
      : variant === "secondary" || variant === "outline" || variant === "success"
        ? "h-8 rounded-[15px] px-3.5 text-[12px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.54),0_14px_28px_-28px_rgba(58,51,39,0.14)]"
        : "h-8 rounded-[15px] px-3.5 text-[12px] font-medium shadow-[0_16px_30px_-22px_rgba(122,20,30,0.30),inset_0_1px_0_rgba(255,255,255,0.12)] hover:shadow-[0_20px_38px_-24px_rgba(122,20,30,0.34),inset_0_1px_0_rgba(255,255,255,0.14)]";

  return (
    <Button
      {...props}
      className={cn(
        "tracking-[-0.005em] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px active:translate-y-[0.5px] active:scale-[0.985] sm:h-9 sm:text-[12.5px]",
        modalButtonClassName,
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
        "modal-action-card group flex cursor-pointer items-center justify-start gap-3 rounded-[16px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(249,244,237,0.34)_100%)] px-3 py-2.25 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_18px_38px_-34px_rgba(58,51,39,0.14)] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px data-[dragging=true]:bg-[rgba(255,255,255,0.62)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/8",
        className,
      )}
    >
      <div className="modal-action-icon flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[10px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.54)_0%,rgba(249,244,237,0.42)_100%)] text-[#7B1E2B] transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-px group-hover:scale-[1.025]">
        {icon}
      </div>
      <div className="max-w-[320px]">
        <p className="modal-action-title text-[13px] font-medium tracking-[-0.012em] text-[rgba(32,26,21,0.88)]">{title}</p>
        {description ? <p className="modal-action-subtitle mt-0.5 text-[11px] leading-[1.42] text-[rgba(72,60,46,0.60)]">{description}</p> : null}
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
      className={cn("rounded-[16px] border border-[rgba(95,111,82,0.05)] bg-[linear-gradient(180deg,rgba(255,255,255,0.58)_0%,rgba(249,244,237,0.50)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_8px_18px_-24px_rgba(58,51,39,0.10)] sm:px-3.5 sm:py-3", toneClassName)}
      style={{
        backdropFilter: "blur(10px) saturate(1.04)",
        WebkitBackdropFilter: "blur(10px) saturate(1.04)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-[10px] bg-[rgba(255,251,244,0.62)]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-[1.4] tracking-[-0.01em] text-[rgba(32,26,21,0.88)] sm:text-[14px]">{title}</p>
          <p className="text-[11.5px] leading-[1.42] text-[rgba(72,60,46,0.60)]">{description}</p>
          {warning ? <p className="mt-1 text-[11.5px] leading-[1.42] font-medium text-[#8B7730]">{warning}</p> : null}
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
        "h-5 rounded-full px-1.75 text-[8.5px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_10px_20px_-22px_rgba(58,51,39,0.10)] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]",
        selected
          ? "border border-[rgba(123,30,43,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(249,241,242,0.38)_100%)] text-[#5A1528] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.62)_0%,rgba(249,241,242,0.46)_100%)]"
          : "border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.34)_0%,rgba(249,246,241,0.24)_100%)] text-[#6B6258]/82 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.48)_0%,rgba(255,252,248,0.34)_100%)] hover:text-[#1A1713]",
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
    <p className={cn("text-[9.5px] font-medium uppercase tracking-[0.16em] text-[rgba(72,60,46,0.46)]", className)}>
      {children}
    </p>
  );
}
