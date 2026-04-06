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
            className="max-w-[34rem] lg:max-w-[38rem] font-serif text-[38px] font-semibold leading-[1.15] tracking-[-0.5px] sm:text-[54px] pb-[0.10em] bg-clip-text text-transparent bg-[linear-gradient(180deg,#2B2B2B_0%,#2B2B2B_55%,#2A1A1D_100%)]"
          >
            Um painel executivo para sua adega, com clareza de estoque,{" "}
            <span className="whitespace-nowrap">valor e giro.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="mt-5 max-w-xl text-[16px] font-medium leading-relaxed text-muted-foreground sm:text-[18px]"
          >
            Menos scroll, mais decisão. A Sommelyx consolida sinais críticos e ações rápidas em uma experiência premium de verdade.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <MagneticButton>
              <Button
                variant="primary"
                className="group h-12 rounded-2xl px-8 text-[13px] font-black uppercase tracking-[0.12em] shadow-float"
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>
            <div className="flex items-center gap-3 text-[12px] font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-emerald-700 backdrop-blur-xl">
                <Check className="h-4 w-4 text-emerald-600" /> 14 dias grátis
              </span>
            </div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-4 grid max-w-xl grid-cols-3 gap-2">
            {[
              { label: "Estoque", icon: Layers },
              { label: "Giro", icon: TrendingUp },
              { label: "Reposição", icon: AlertTriangle },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-black/[0.06] bg-white/55 px-3 py-2.5 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-wine" />
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-foreground">{item.label}</span>
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
          <div className="sm:hidden relative rounded-[26px] border border-black/[0.06] bg-white/70 p-4 shadow-[0_26px_72px_-52px_rgba(15,15,20,0.85)] ring-1 ring-white/50 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-wine/10 text-wine ring-1 ring-black/[0.04]">
                  <Wine className="h-4.5 w-4.5" />
                </div>
                <div className="leading-none">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Dashboard</p>
                  <p className="text-[14px] font-bold tracking-tight text-foreground">Painel executivo</p>
                </div>
              </div>
              <div className="rounded-full border border-wine/15 bg-wine/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-wine">
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
                <div key={kpi.label} className="rounded-2xl border border-black/[0.06] bg-white/75 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-[18px] font-black tracking-tight text-foreground">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop/tablet: full mock */}
          <div className="hidden sm:block relative rounded-[28px] border border-black/[0.06] bg-white/65 p-4 shadow-[0_32px_90px_-52px_rgba(15,15,20,0.9)] ring-1 ring-white/50 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-wine/10 text-wine ring-1 ring-black/[0.04]">
                  <Wine className="h-4.5 w-4.5" />
                </div>
                <div className="leading-none">
                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-muted-foreground">Dashboard</p>
                  <p className="text-[15px] font-bold tracking-tight text-foreground">Painel executivo</p>
                </div>
              </div>
              <div className="rounded-full border border-wine/15 bg-wine/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-wine">
                Premium
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: "Estoque total", value: "128 un.", tone: "wine" },
                { label: "Valor imobilizado", value: "R$ 92k", tone: "gold" },
                { label: "Giro mensal", value: "37%", tone: "wine" },
                { label: "Reposição", value: "6 itens", tone: "wine" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-black/[0.06] bg-white/70 p-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-[18px] font-black tracking-tight text-foreground">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-12 gap-2">
              <div className="col-span-7 rounded-2xl border border-black/[0.06] bg-white/70 p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Estoque atual</p>
                <div className="mt-2 space-y-2">
                  {[
                    { name: "Brunello di Montalcino", qty: "2", tone: "low" },
                    { name: "Champagne Brut", qty: "8", tone: "ok" },
                    { name: "Barolo Riserva", qty: "1", tone: "low" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${row.tone === "low" ? "bg-wine" : "bg-gold"}`} />
                      <p className="flex-1 truncate text-[12px] font-semibold text-foreground">{row.name}</p>
                      <span className="rounded-full bg-black/[0.04] px-2 py-1 text-[10px] font-black text-muted-foreground">{row.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-5 rounded-2xl border border-black/[0.06] bg-white/70 p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Vendas</p>
                <div className="mt-2 grid grid-cols-6 items-end gap-1">
                  {[4, 7, 6, 10, 9, 12].map((h, i) => (
                    <div key={i} className="col-span-1 rounded-md bg-wine/15">
                      <div className="rounded-md bg-wine" style={{ height: `${h * 6}px`, opacity: 0.9 }} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-semibold text-muted-foreground">Últimos 6 meses</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
