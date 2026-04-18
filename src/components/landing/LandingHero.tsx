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

/* ── Glass card style (reused) ── */
const glassCard = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(6px) saturate(1.08)",
  WebkitBackdropFilter: "blur(6px) saturate(1.08)",
  border: "1px solid rgba(255,255,255,0.48)",
  boxShadow:
    "0 8px 24px -18px rgba(44,20,31,0.22), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

const glassCardDark = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(6px) saturate(1.05)",
  WebkitBackdropFilter: "blur(6px) saturate(1.05)",
  border: "1px solid rgba(255,255,255,0.52)",
  boxShadow:
    "0 10px 28px -18px rgba(44,20,31,0.24), 0 1px 2px rgba(0,0,0,0.04)",
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
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="max-w-[34rem] lg:max-w-[38rem] text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl"
            style={{ color: "#1A1A1A" }}
          >
            Um painel executivo para sua adega, com clareza de estoque,{" "}
            <span className="whitespace-nowrap text-[#7B1E2B]">valor e giro.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="mt-5 max-w-xl text-base leading-7 text-muted-foreground"
          >
            Menos scroll, mais decisão. A Sommelyx consolida sinais críticos e ações rápidas em uma experiência premium de verdade.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <MagneticButton>
              <Button
                variant="primary"
                className="group h-12 rounded-2xl px-8 font-medium shadow-sm"
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#2E5E3E] px-4 py-2 text-sm font-medium text-white">
              <Check className="h-3.5 w-3.5" /> 14 dias grátis
            </span>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-5 grid max-w-xl grid-cols-3 gap-2.5">
            {[
              { label: "Estoque", icon: Layers },
              { label: "Giro", icon: TrendingUp },
              { label: "Reposição", icon: AlertTriangle },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={glassCard}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-wine" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A1A1A]">{item.label}</span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Mock Dashboard */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="relative">
          <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full" style={{ background: "rgba(110,30,42,0.12)", filter: "blur(70px)" }} />
          <div className="absolute -bottom-12 -right-12 h-72 w-72 rounded-full" style={{ background: "rgba(198,167,104,0.12)", filter: "blur(90px)" }} />

          {/* Mobile mock */}
          <div
            className="sm:hidden relative rounded-[22px] p-5"
            style={{
              ...glassCardDark,
              boxShadow: "0 12px 28px -18px rgba(44,20,31,0.24), 0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(123,30,43,0.08)", border: "1px solid rgba(123,30,43,0.12)" }}>
                  <Wine className="h-4 w-4 text-wine" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5F5F5F]">Dashboard</p>
                  <p className="text-[14px] font-semibold tracking-tight" style={{ color: "#1A1A1A" }}>Painel executivo</p>
                </div>
              </div>
              <div
                className="rounded-full px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.10em] text-wine"
                style={{ background: "rgba(123,30,43,0.09)", border: "1px solid rgba(123,30,43,0.14)" }}
              >
                Premium
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Estoque", value: "128 un." },
                { label: "Valor", value: "R$ 92k" },
                { label: "Giro", value: "37%" },
                { label: "Reposição", value: "6 itens" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-5 shadow-md" style={glassCard}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#5F5F5F]">{kpi.label}</p>
                  <p className="mt-1.5 text-[#1A1A1A] text-lg font-semibold tracking-tight">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop mock */}
          <div
            className="hidden sm:block relative rounded-[22px] p-5"
            style={{
              ...glassCardDark,
              boxShadow: "0 12px 28px -18px rgba(44,20,31,0.24), 0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(123,30,43,0.08)", border: "1px solid rgba(123,30,43,0.12)" }}>
                  <Wine className="h-4 w-4 text-wine" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5F5F5F]">Dashboard</p>
                  <p className="text-[15px] font-semibold tracking-tight" style={{ color: "#1A1A1A" }}>Painel executivo</p>
                </div>
              </div>
              <div
                className="rounded-full px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.10em] text-wine"
                style={{ background: "rgba(123,30,43,0.09)", border: "1px solid rgba(123,30,43,0.14)" }}
              >
                Premium
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Estoque total", value: "128 un." },
                { label: "Valor imobilizado", value: "R$ 92k" },
                { label: "Giro mensal", value: "37%" },
                { label: "Reposição", value: "6 itens" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-5 shadow-md" style={glassCard}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#5F5F5F]">{kpi.label}</p>
                  <p className="mt-1.5 text-[#1A1A1A] text-lg font-semibold tracking-tight">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-12 gap-3">
              <div className="col-span-7 rounded-xl p-5 shadow-md" style={glassCard}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#5F5F5F]">Estoque atual</p>
                <div className="mt-2.5 space-y-2">
                  {[
                    { name: "Brunello di Montalcino", qty: "2", tone: "low" },
                    { name: "Champagne Brut", qty: "8", tone: "ok" },
                    { name: "Barolo Riserva", qty: "1", tone: "low" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${row.tone === "low" ? "bg-wine" : "bg-gold"}`} />
                      <p className="flex-1 truncate text-[12px] font-medium text-[#1A1A1A]">{row.name}</p>
                      <span className="rounded-md px-2 py-1 text-[10px] font-medium" style={{ background: "rgba(123,30,43,0.06)", color: "#5F5F5F" }}>{row.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-5 rounded-xl p-5 shadow-md" style={glassCard}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#5F5F5F]">Vendas</p>
                <div className="mt-2.5 grid grid-cols-6 items-end gap-1">
                  {[4, 7, 6, 10, 9, 12].map((h, i) => (
                    <div key={i} className="col-span-1 rounded-md bg-wine/12">
                      <div className="rounded-md bg-wine" style={{ height: `${h * 6}px`, opacity: 0.85 }} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] font-medium text-[#5F5F5F]">Últimos 6 meses</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
