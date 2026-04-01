import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, type LucideIcon, Sparkles } from "lucide-react";

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
  wine: "bg-[#8C2044]/12 text-[#8C2044] border-[#8C2044]/12",
  gold: "bg-[#C9A86A]/14 text-[#9A6A17] border-[#C9A86A]/16",
  emerald: "bg-emerald-500/12 text-emerald-700 border-emerald-500/14",
  slate: "bg-slate-500/10 text-slate-700 border-slate-500/10",
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
    <section className="relative overflow-hidden rounded-[32px] border border-white/40 bg-[linear-gradient(135deg,rgba(253,250,248,0.96),rgba(255,255,255,0.78))] p-6 shadow-[0_24px_80px_-32px_rgba(45,20,31,0.28)] backdrop-blur-2xl sm:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-[-84px] h-48 w-48 rounded-full bg-[#8C2044]/12 blur-3xl" />
        <div className="absolute right-[-42px] top-10 h-40 w-40 rounded-full bg-[#D9B27C]/18 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.75),transparent_32%),linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.28)_52%,transparent_100%)]" />
      </div>

      <div className="relative grid gap-6 xl:grid-cols-[1.35fr_0.9fr] xl:items-start">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#8C2044]/12 bg-white/65 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#8C2044] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </div>

          <div className="space-y-3">
            <h1 className="max-w-2xl text-[30px] font-black leading-[0.95] tracking-[-0.05em] text-[#17141D] sm:text-[38px]">
              {title}
            </h1>
            <p className="max-w-2xl text-[15px] font-medium leading-relaxed text-[#5F5663] sm:text-[16px]">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-full border border-black/[0.06] bg-white/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6C6371]"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {actions.map((action) => {
              const Icon = action.icon ?? ArrowRight;
              return (
                <Button
                  key={action.label}
                  variant={action.variant ?? "default"}
                  className={cn(
                    "h-11 rounded-2xl px-5 text-[12px] font-black uppercase tracking-[0.12em]",
                    action.variant === "outline" && "bg-white/70",
                  )}
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
          <div className="rounded-[28px] border border-black/[0.06] bg-[#17141D] p-5 text-white shadow-[0_18px_48px_-22px_rgba(23,20,29,0.85)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">
                  Experiencia guiada
                </p>
                <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em]">
                  Um painel claro para decidir rápido.
                </h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Atalho</p>
                <p className="text-[12px] font-bold tracking-[0.14em] text-white">{commandHint ?? "Ctrl/Cmd + K"}</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] font-medium leading-relaxed text-white/72">
              Abra o menu rapido para navegar, localizar rotulos e disparar acoes sem quebrar o foco.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article
                  key={metric.label}
                  className="rounded-[24px] border border-black/[0.05] bg-white/75 p-4 shadow-[0_14px_40px_-28px_rgba(45,20,31,0.35)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#857A88]">{metric.label}</p>
                      <p className="mt-2 text-[28px] font-black tracking-[-0.04em] text-[#17141D]">{metric.value}</p>
                    </div>
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl border",
                        toneClasses[metric.tone ?? "wine"],
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-[13px] font-medium leading-relaxed text-[#655C69]">{metric.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
