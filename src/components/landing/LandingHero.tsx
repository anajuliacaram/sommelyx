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
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(12px) saturate(1.2)",
  WebkitBackdropFilter: "blur(12px) saturate(1.2)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)",
} as const;

const glassCardDark = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px) saturate(1.2)",
  WebkitBackdropFilter: "blur(12px) saturate(1.2)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 12px 40px -12px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.15)",
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
            className="max-w-[34rem] lg:max-w-[38rem] font-serif text-[32px] font-bold leading-[1.15] tracking-[-0.025em] sm:text-[44px]"
            style={{ color: "#1A1A1A" }}
          >
            Um painel executivo para sua adega, com clareza de estoque,{" "}
            <span className="whitespace-nowrap text-primary">valor e giro.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="mt-5 max-w-xl text-[16px] font-normal leading-[1.7] sm:text-[18px]"
            style={{ color: "#555" }}
          >
            Menos scroll, mais decisão. A Sommelyx consolida sinais críticos e ações rápidas em uma experiência premium de verdade.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <MagneticButton>
              <Button
                variant="primary"
                className="group h-12 rounded-xl px-8 text-[14px] font-semibold uppercase tracking-[0.06em]"
                style={{
                  boxShadow: "0 4px 20px -4px rgba(110,30,42,0.4), 0 0 0 1px rgba(110,30,42,0.1), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.10em]"
              style={{
                ...glassCard,
                color: "#2d6a4f",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.18)",
              }}
            >
              <Check className="h-3.5 w-3.5" style={{ color: "#A3B18A" }} /> 14 dias grátis
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
                className="rounded-2xl px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={glassCard}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-wine" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.7)" }}>{item.label}</span>
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
            className="sm:hidden relative rounded-[22px] p-4"
            style={{
              ...glassCardDark,
              boxShadow: "0 20px 60px -20px rgba(30,20,20,0.2), 0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(123,30,43,0.15)", border: "1px solid rgba(123,30,43,0.20)" }}>
                  <Wine className="h-4 w-4 text-wine" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.5)" }}>Dashboard</p>
                  <p className="text-[14px] font-semibold tracking-tight" style={{ color: "#FFFFFF" }}>Painel executivo</p>
                </div>
              </div>
              <div
                className="rounded-full px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.10em] text-wine"
                style={{ background: "rgba(110,30,42,0.06)", border: "1px solid rgba(110,30,42,0.12)" }}
              >
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
                <div key={kpi.label} className="rounded-xl p-3" style={glassCard}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
                  <p className="mt-1.5 font-serif text-[18px] font-bold tracking-tight" style={{ color: "#FFFFFF" }}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop mock */}
          <div
            className="hidden sm:block relative rounded-[22px] p-5"
            style={{
              ...glassCardDark,
              boxShadow: "0 24px 70px -24px rgba(30,20,20,0.22), 0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(123,30,43,0.15)", border: "1px solid rgba(123,30,43,0.20)" }}>
                  <Wine className="h-4 w-4 text-wine" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.5)" }}>Dashboard</p>
                  <p className="text-[15px] font-semibold tracking-tight" style={{ color: "#FFFFFF" }}>Painel executivo</p>
                </div>
              </div>
              <div
                className="rounded-full px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.10em] text-wine"
                style={{ background: "rgba(110,30,42,0.06)", border: "1px solid rgba(110,30,42,0.12)" }}
              >
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
                <div key={kpi.label} className="rounded-xl p-3.5" style={glassCard}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.5)" }}>{kpi.label}</p>
                  <p className="mt-1.5 font-serif text-[18px] font-bold tracking-tight" style={{ color: "#FFFFFF" }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-12 gap-2.5">
              <div className="col-span-7 rounded-xl p-3.5" style={glassCard}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.5)" }}>Estoque atual</p>
                <div className="mt-2.5 space-y-2">
                  {[
                    { name: "Brunello di Montalcino", qty: "2", tone: "low" },
                    { name: "Champagne Brut", qty: "8", tone: "ok" },
                    { name: "Barolo Riserva", qty: "1", tone: "low" },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${row.tone === "low" ? "bg-wine" : "bg-gold"}`} />
                      <p className="flex-1 truncate text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{row.name}</p>
                      <span className="rounded-md px-2 py-1 text-[10px] font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{row.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-5 rounded-xl p-3.5" style={glassCard}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.5)" }}>Vendas</p>
                <div className="mt-2.5 grid grid-cols-6 items-end gap-1">
                  {[4, 7, 6, 10, 9, 12].map((h, i) => (
                    <div key={i} className="col-span-1 rounded-md bg-wine/12">
                      <div className="rounded-md bg-wine" style={{ height: `${h * 6}px`, opacity: 0.85 }} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Últimos 6 meses</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
