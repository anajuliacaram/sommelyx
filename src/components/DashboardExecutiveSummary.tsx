import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "@/icons/lucide";
import type { LucideIcon } from "lucide-react";

type SummaryAction = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "premium" | "glass";
};

type SummaryMetric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "wine" | "gold" | "emerald" | "slate";
};

interface DashboardExecutiveSummaryProps {
  eyebrow: string;
  title: string;
  description: string;
  badges: string[];
  metrics: SummaryMetric[];
  actions: SummaryAction[];
  commandHint?: string;
}

const toneClasses: Record<NonNullable<SummaryMetric["tone"]>, string> = {
  wine: "bg-primary/8 text-primary border-primary/10",
  gold: "bg-accent/10 text-accent border-accent/12",
  emerald: "bg-success/8 text-success border-success/10",
  slate: "bg-muted/20 text-muted-foreground border-border/30",
};

export function DashboardExecutiveSummary({
  eyebrow,
  title,
  description,
  badges,
  metrics,
  actions,
  commandHint,
}: DashboardExecutiveSummaryProps) {
  return (
    <section className="glass-card relative p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-[-60px] h-32 w-32 rounded-full bg-copper/[0.08] blur-[60px]" />
        <div className="absolute right-[-30px] top-10 h-28 w-28 rounded-full bg-[hsl(0_0%_100%/0.04)] blur-[60px]" />
      </div>

      <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.9fr] xl:items-start">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-md border border-copper/20 bg-copper/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-copper relative z-10">
            <Sparkles className="h-3 w-3" />
            {eyebrow}
          </div>

          <div className="space-y-2">
            <h1 className="max-w-2xl font-serif text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[34px] relative z-10">
              {title}
            </h1>
            <p className="max-w-2xl text-[14px] leading-relaxed text-foreground/66 sm:text-[15px] relative z-10">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-md border border-border/30 bg-background/60 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/58 relative z-10"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const Icon = action.icon ?? ArrowRight;
              return (
                <Button
                  key={action.label}
                  variant={action.variant ?? "default"}
                  size="default"
                  onClick={action.onClick}
                >
                  {action.label}
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[16px] border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.65)] p-5 text-foreground relative z-10 backdrop-blur-[10px]" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-copper/80">
                  Experiência guiada
                </p>
                <h2 className="mt-2 font-serif text-[20px] font-semibold tracking-[-0.02em] text-foreground">
                  Um painel claro para decidir rápido.
                </h2>
              </div>
              <div className="rounded-lg border border-copper/15 bg-copper/[0.08] px-3 py-2 text-right">
                <p className="text-[9px] uppercase tracking-[0.10em] text-copper/60">Atalho</p>
                <p className="text-[11px] font-medium text-copper">{commandHint ?? "Ctrl/Cmd + K"}</p>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-foreground/60">
              Abra o menu rápido para navegar, localizar rótulos e disparar ações sem quebrar o foco.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 relative z-10">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article
                  key={metric.label}
                  className="rounded-[16px] border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.65)] p-4 backdrop-blur-[10px]"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-foreground/55">{metric.label}</p>
                      <p className="mt-2 font-serif text-[24px] font-semibold tracking-[-0.02em] text-foreground">{metric.value}</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-copper/20 bg-copper/[0.08]">
                      <Icon className="h-4 w-4 text-copper" />
                    </div>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-foreground/58">{metric.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
