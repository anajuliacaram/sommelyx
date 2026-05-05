import type { ReactNode } from "react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/12 to-[#C8A96A]/12 text-[#7B1E2B]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
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
        "rounded-2xl border border-border/30 bg-background/55 px-4 py-4 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
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
    <div className={cn("rounded-2xl ring-1 px-4 py-3", toneClassName)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 ring-1 ring-black/5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-5">{title}</p>
          <p className="text-xs leading-5 opacity-80">{description}</p>
          {warning ? <p className="mt-1 text-xs leading-5 font-medium">{warning}</p> : null}
        </div>
      </div>
    </div>
  );
}

