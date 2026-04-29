import { Button } from "@/components/ui/button";
import { formatMotionNumber, motionDelay, useCountUp, usePrefersReducedMotion } from "@/lib/motion";
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
  animatedValue?: number | null;
  valueFormatter?: (value: number) => string;
};

function AnimatedMetricCard({ metric, index }: { metric: SummaryMetric; index: number }) {
  const Icon = metric.icon;
  const reducedMotion = usePrefersReducedMotion();
  const animated = useCountUp(metric.animatedValue, { duration: 700, enabled: !reducedMotion });
  const resolvedValue =
    typeof metric.animatedValue === "number"
      ? metric.valueFormatter?.(animated) ?? formatMotionNumber(animated, Number.isInteger(metric.animatedValue) ? 0 : 1)
      : metric.value;

  return (
    <article
      className="surface-clarity motion-card-hover motion-enter p-4"
      style={motionDelay(index, 110)}
    >
      <div className="flex items-start gap-1.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-copper/20 bg-copper/[0.08]">
          <Icon className="h-4 w-4 text-copper" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#6B6B6B] sm:text-[12px]">
            {metric.label}
          </p>
          <div className="mt-1 flex min-w-0 items-baseline gap-1.5">
            <p className="shrink-0 text-[20px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#1C1C1C] tabular-nums sm:text-[22px] xl:text-[22px]">
              {resolvedValue}
            </p>
            <span className="min-w-0 truncate text-[12px] font-medium leading-[1.2] text-[#6B6B6B]">
              {metric.detail}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

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
    <section className="card-depth motion-card-hover motion-enter relative p-5 sm:p-6">
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
            <h1 className="max-w-2xl font-serif text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#1C1C1C] sm:text-[34px] relative z-10">
              {title}
            </h1>
            <p className="max-w-2xl text-[14px] leading-relaxed text-[#6B6B6B] sm:text-[15px] relative z-10">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-md border border-white/30 bg-white/62 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#6B6B6B] relative z-10 backdrop-blur-md shadow-[0_4px_12px_-10px_rgba(58,51,39,0.18)]"
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
          <div className="surface-clarity p-4 text-foreground relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-copper/80">
                  Experiência guiada
                </p>
                <h2 className="mt-2 font-serif text-[20px] font-semibold tracking-[-0.02em] text-[#1C1C1C]">
                  Um painel claro para decidir rápido.
                </h2>
              </div>
              <div className="rounded-lg border border-copper/15 bg-copper/[0.08] px-3 py-2 text-right shadow-[0_4px_12px_-10px_rgba(58,51,39,0.18)]">
                <p className="text-[9px] uppercase tracking-[0.10em] text-copper/60">Atalho</p>
                <p className="text-[11px] font-medium text-copper">{commandHint ?? "Ctrl/Cmd + K"}</p>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[#6B6B6B]">
              Abra o menu rápido para navegar, localizar rótulos e disparar ações sem quebrar o foco.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 relative z-10">
            {metrics.map((metric, index) => (
              <AnimatedMetricCard key={metric.label} metric={metric} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
