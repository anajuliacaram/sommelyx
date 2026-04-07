import { motion } from "framer-motion";
import { ArrowRight, Check, Layers, TrendingUp, AlertTriangle, Wine } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

interface LandingHeroProps {
  onSignup: () => void;
}

export function LandingHero({ onSignup }: LandingHeroProps) {
  return (
    <section className="relative z-10 px-4 sm:px-8 pt-20 sm:pt-28 lg:pt-32 pb-10 sm:pb-14">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Left */}
        <div className="text-left">
          {/* Logo removido — presente apenas no header fixo */}

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="max-w-[34rem] lg:max-w-[38rem] font-serif text-[32px] font-bold leading-[1.15] tracking-[-0.025em] sm:text-[44px] text-foreground"
          >
            Um painel executivo para sua adega, com clareza de estoque,{" "}
            <span className="whitespace-nowrap text-primary">valor e giro.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="mt-5 max-w-xl text-[16px] font-normal leading-[1.7] text-muted-foreground sm:text-[18px]"
          >
            Menos scroll, mais decisão. A Sommelyx consolida sinais críticos e ações rápidas em uma experiência premium de verdade.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <MagneticButton>
              <Button
                variant="primary"
                className="group h-12 rounded-xl px-8 text-[14px] font-semibold uppercase tracking-[0.06em] shadow-float"
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>
            <div className="flex items-center gap-3 text-[12px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/6 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.10em] text-emerald-700 backdrop-blur-xl">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> 14 dias grátis
              </span>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-5 grid max-w-xl grid-cols-3 gap-2.5">
            {[
              { label: "Estoque", icon: Layers },
              { label: "Giro", icon: TrendingUp },
              { label: "Reposição", icon: AlertTriangle },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-black/[0.05] bg-white/50 px-3.5 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-wine" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">{item.label}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Mock Dashboard */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="relative">
          <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full bg-wine/20 blur-[70px]" />
          <div className="absolute -bottom-12 -right-12 h-72 w-72 rounded-full bg-gold/20 blur-[90px]" />

          {/* Mobile: compact mock (reduz scroll) */}
          <div className="sm:hidden relative rounded-[22px] border border-black/[0.05] bg-white/70 p-4 shadow-[0_20px_60px_-40px_rgba(15,15,20,0.7)] ring-1 ring-white/40 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine/8 text-wine ring-1 ring-black/[0.03]">
                  <Wine className="h-4 w-4" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Dashboard</p>
                  <p className="text-[14px] font-semibold tracking-tight text-foreground">Painel executivo</p>
                </div>
              </div>
              <div className="rounded-full border border-wine/12 bg-wine/4 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.10em] text-wine">
                Premium
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: "Estoque", value: "128 un." },
                { label: "Valor", value: "R$ 92k" },
                { label: "Giro", value: "37%" },
                { label: "Reposição", value: "6 itens" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-black/[0.04] bg-white/70 p-3 shadow-sm">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1.5 font-serif text-[18px] font-bold tracking-tight text-foreground">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop/tablet: full mock */}
          <div className="hidden sm:block relative rounded-[22px] border border-black/[0.05] bg-white/60 p-5 shadow-[0_24px_70px_-40px_rgba(15,15,20,0.75)] ring-1 ring-white/40 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine/8 text-wine ring-1 ring-black/[0.03]">
                  <Wine className="h-4 w-4" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Dashboard</p>
                  <p className="text-[15px] font-semibold tracking-tight text-foreground">Painel executivo</p>
                </div>
              </div>
              <div className="rounded-full border border-wine/12 bg-wine/4 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.10em] text-wine">
                Premium
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[
                { label: "Estoque total", value: "128 un." },
                { label: "Valor imobilizado", value: "R$ 92k" },
                { label: "Giro mensal", value: "37%" },
                { label: "Reposição", value: "6 itens" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-black/[0.04] bg-white/65 p-3.5 shadow-sm">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1.5 font-serif text-[18px] font-bold tracking-tight text-foreground">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-12 gap-2.5">
              <div className="col-span-7 rounded-xl border border-black/[0.04] bg-white/65 p-3.5 shadow-sm">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Estoque atual</p>
                <div className="mt-2.5 space-y-2">
                  {[
                    { name: "Brunello di Montalcino", qty: "2", tone: "low" },
                    { name: "Champagne Brut", qty: "8", tone: "ok" },
                    { name: "Barolo Riserva", qty: "1", tone: "low" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${row.tone === "low" ? "bg-wine" : "bg-gold"}`} />
                      <p className="flex-1 truncate text-[12px] font-medium text-foreground">{row.name}</p>
                      <span className="rounded-md bg-black/[0.03] px-2 py-1 text-[10px] font-medium text-muted-foreground">{row.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-5 rounded-xl border border-black/[0.04] bg-white/65 p-3.5 shadow-sm">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Vendas</p>
                <div className="mt-2.5 grid grid-cols-6 items-end gap-1">
                  {[4, 7, 6, 10, 9, 12].map((h, i) => (
                    <div key={i} className="col-span-1 rounded-md bg-wine/12">
                      <div className="rounded-md bg-wine" style={{ height: `${h * 6}px`, opacity: 0.85 }} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] font-medium text-muted-foreground">Últimos 6 meses</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
