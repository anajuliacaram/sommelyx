import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ eyebrow, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(26,23,19,0.5)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 font-serif text-[2rem] font-semibold tracking-[-0.03em] text-[#1A1713]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-[rgba(26,23,19,0.6)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
