import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LegalSectionCardProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

export function LegalSectionCard({ id, className, children }: LegalSectionCardProps) {
  return (
    <section id={id} className={cn("legal-section-card scroll-mt-28", className)}>
      {children}
    </section>
  );
}
