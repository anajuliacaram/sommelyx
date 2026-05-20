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
  "premium-card-surface rounded-[var(--sx-r-md)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-input)] shadow-none";

export const AI_MODAL_ACTION_TILE_CLASSNAME =
  "modal-action-card premium-card-surface";

export const AI_MODAL_SHEET_CONTENT_CLASSNAME =
  "modal-container fixed z-50 left-0 right-0 bottom-0 top-auto h-auto max-h-[92dvh] w-full max-w-[520px] translate-x-0 translate-y-0 overflow-y-auto rounded-t-[var(--sx-r-xl)] border p-0 gap-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:max-h-[85vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--sx-r-xl)] sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95";

export const AI_MODAL_SHEET_CONTENT_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "520px",
  maxHeight: "92dvh",
  height: "auto",
  background: "var(--sx-bg-card)",
  border: "0.5px solid var(--sx-b-default)",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "var(--sx-shadow-lg)",
};

export const AI_MODAL_DIALOG_CONTENT_CLASSNAME =
  "modal-container items-center overflow-hidden rounded-[var(--sx-r-xl)] border border-[var(--sx-b-default)] p-0 shadow-[var(--sx-shadow-lg)] sm:max-w-[520px]";

export const AI_MODAL_DIALOG_CONTENT_STYLE: CSSProperties = {
  background: "var(--sx-bg-card)",
  border: "0.5px solid var(--sx-b-default)",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "var(--sx-shadow-lg)",
};

export const AI_MODAL_FIELD_CLASSNAME =
  "form-input modal-input";

export const AI_MODAL_TEXTAREA_CLASSNAME =
  "form-input modal-input min-h-[84px] resize-none py-2.5";

export const AI_MODAL_COMPACT_STACK_CLASSNAME = "space-y-1";
export const AI_MODAL_SECTION_STACK_CLASSNAME = "space-y-1.5";
export const AI_MODAL_LABEL_CLASSNAME =
  "form-field-label modal-field-label";
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
  "segment-card flex min-h-[48px] flex-col justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-bordeaux-10)]";
export const AI_MODAL_SELECTION_CARD_ACTIVE_CLASSNAME =
  "active";
export const AI_MODAL_SELECTION_CARD_IDLE_CLASSNAME =
  "";
export const AI_MODAL_LIST_SURFACE_CLASSNAME =
  "modal-wine-list overflow-y-auto";
export const AI_MODAL_LIST_ROW_CLASSNAME =
  "modal-wine-row flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-bordeaux-10)]";
export const AI_MODAL_LIST_ROW_SELECTED_CLASSNAME =
  "bg-[rgba(139,26,59,0.06)]";
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
        "shrink-0",
        className,
      )}
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
        "modal-body min-h-0 flex-1 overflow-y-auto pb-[calc(32px+env(safe-area-inset-bottom))]",
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
        "shrink-0 px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3",
        className,
      )}
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
  return (
    <SheetHeader className={cn("modal-header mb-0 pr-11 sm:pr-12", className)}>
      <div className="flex items-start gap-2.5">
        {icon ? (
          <div className={cn("modal-icon-wrap modal-icon-circle", tone && `tone-${tone}`)}>
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <SheetTitle className="modal-title">
            {title}
          </SheetTitle>
          {description ? (
            <SheetDescription className="modal-subtitle max-w-[38rem]">
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
        "premium-card-surface rounded-[var(--sx-r-md)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-input)] px-3 py-2.5 shadow-none sm:px-3.5",
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
      ? "h-8 rounded-[var(--sx-r-pill)] px-3 text-[13px] font-medium text-[var(--sx-t-sub)] hover:bg-[var(--sx-bg-input)] hover:text-[var(--sx-t-body)]"
      : variant === "secondary" || variant === "outline" || variant === "success"
        ? "shadow-none"
        : "shadow-none";

  return (
    <Button
      {...props}
      className={cn(
        "tracking-[-0.005em] transition-opacity duration-150 ease-out active:scale-[0.99]",
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
        "modal-action-card group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-bordeaux-10)]",
        className,
      )}
    >
      <div className="modal-action-icon-wrap modal-action-icon">
        {icon}
      </div>
      <div className="max-w-[320px]">
        <p className="modal-action-title">{title}</p>
        {description ? <p className="modal-action-subtitle">{description}</p> : null}
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
