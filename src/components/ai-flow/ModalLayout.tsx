import type { ButtonHTMLAttributes, ReactNode, CSSProperties, DragEventHandler } from "react";
import { ActionDialogTitle } from "@/components/ai-flow/ActionDialog";
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
  "premium-card-surface sx-v2-matte-panel";

export const AI_MODAL_ACTION_TILE_CLASSNAME =
  "modal-action-card sx-v2-modal-action";

export const AI_MODAL_SHEET_CONTENT_CLASSNAME =
  "h-auto max-h-[86dvh] w-full max-w-[620px] gap-0 p-0";

export const AI_MODAL_SHEET_CONTENT_STYLE: CSSProperties = {
  width: "min(92vw, 620px)",
  maxWidth: "620px",
  maxHeight: "min(86dvh, 760px)",
  height: "auto",
};

export const AI_MODAL_DIALOG_CONTENT_CLASSNAME =
  "modal-container premium-modal-shell items-center overflow-hidden p-0 sm:max-w-[520px]";

export const AI_MODAL_DIALOG_CONTENT_STYLE: CSSProperties = {
};

export const AI_MODAL_FIELD_CLASSNAME =
  "form-input modal-input sx-v2-modal-field";

export const AI_MODAL_TEXTAREA_CLASSNAME =
  "form-input modal-input sx-v2-modal-field min-h-[84px] resize-none py-2.5";

export const AI_MODAL_COMPACT_STACK_CLASSNAME = "space-y-1";
export const AI_MODAL_SECTION_STACK_CLASSNAME = "space-y-1.5";
export const AI_MODAL_LABEL_CLASSNAME =
  "form-field-label modal-field-label modal-input-label";
export const AI_MODAL_HELP_TEXT_CLASSNAME =
  "sx-sub";
export const AI_MODAL_META_TEXT_CLASSNAME =
  "sx-caption";
export const AI_MODAL_TEXT_PRIMARY_CLASSNAME =
  "sx-body font-medium";
export const AI_MODAL_TEXT_SECONDARY_CLASSNAME =
  "sx-body font-medium";
export const AI_MODAL_PILL_TEXT_CLASSNAME =
  "sx-label";
export const AI_MODAL_SELECTION_CARD_CLASSNAME =
  "segment-card sx-v2-modal-action flex min-h-[48px] flex-col justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-bordeaux-10)]";
export const AI_MODAL_SELECTION_CARD_ACTIVE_CLASSNAME =
  "active";
export const AI_MODAL_SELECTION_CARD_IDLE_CLASSNAME =
  "";
export const AI_MODAL_LIST_SURFACE_CLASSNAME =
  "modal-wine-list sx-v2-floating-panel overflow-y-auto";
export const AI_MODAL_LIST_ROW_CLASSNAME =
  "modal-wine-row sx-v2-wine-row flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-bordeaux-10)]";
export const AI_MODAL_LIST_ROW_SELECTED_CLASSNAME =
  "";
export const AI_MODAL_INLINE_ACTION_CLASSNAME =
  "premium-inline-action h-8 rounded-full px-3 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(58,74,46,0.10)]";
export const AI_MODAL_SEGMENTED_BUTTON_CLASSNAME =
  "h-8 rounded-full border px-2 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(139,26,59,0.10)]";
export const AI_MODAL_SEGMENTED_BUTTON_ACTIVE_CLASSNAME =
  "active";
export const AI_MODAL_SEGMENTED_BUTTON_IDLE_CLASSNAME =
  "";

export function AiModalShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("sx-v2-modal-shell-inner flex min-h-0 max-h-full flex-col", className)}>{children}</div>;
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
        "modal-header-bar sx-v2-modal-header shrink-0",
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
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "modal-body sx-v2-modal-body min-h-0 flex-1 overflow-y-auto pb-[calc(32px+env(safe-area-inset-bottom))]",
        className,
      )}
      style={style}
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
        "modal-footer sx-v2-modal-footer shrink-0 px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3",
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
  description: _description,
  tone = "wine",
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  tone?: "wine" | "gold" | "neutral";
  className?: string;
}) {
  return (
    <div className={cn("modal-header mb-0 pr-11 sm:pr-12", className)}>
      <div className="modal-header-lockup flex items-center gap-4">
        {icon ? (
          <div className={cn("modal-header-icon modal-icon-wrap modal-icon-circle", tone === "neutral" && "olive", tone && `tone-${tone}`)}>
            {icon}
          </div>
        ) : null}
        <div className="modal-header-text min-w-0 flex-1">
          <ActionDialogTitle className="modal-header-title modal-title">
            {title}
          </ActionDialogTitle>
        </div>
      </div>
    </div>
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
    <p className={cn("sx-label", className)}>
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
      <span className="sx-label">{label}</span>
      <span className="sx-sub text-right font-medium">{value}</span>
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
        "sx-card sx-card-compact premium-card-surface sx-v2-matte-panel px-3 py-2.5 sm:px-3.5",
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
      ? "modal-btn-ghost"
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
        "sx-v2-btn tracking-[-0.005em] transition-opacity duration-150 ease-out active:scale-[0.99]",
        variant === "ghost" ? "sx-v2-btn-ghost" : variant === "secondary" || variant === "outline" || variant === "success" ? "sx-v2-btn-secondary" : "sx-v2-btn-primary",
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
        "modal-action-card sx-v2-modal-action group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-bordeaux-10)]",
        className,
      )}
    >
      <div className="modal-action-card-icon modal-action-icon-wrap modal-action-icon">
        {icon}
      </div>
      <div className="max-w-[320px]">
        <p className="modal-action-card-title modal-action-title">{title}</p>
        {description ? <p className="modal-action-card-sub modal-action-subtitle">{description}</p> : null}
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
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
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
        "chip sx-v2-chip h-auto min-h-[32px] rounded-full px-3 text-[11.5px] font-medium transition-all duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(58,74,46,0.10)]",
        selected && "active sx-v2-chip-active",
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
    <p className={cn("sx-label", className)}>
      {children}
    </p>
  );
}
