import { motion } from "framer-motion";
import { ArrowRight, Check, Layers, TrendingUp, AlertTriangle, Wine, Sparkles, Clock, Star, Calendar } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const float = (delay: number) => ({
  initial: { opacity: 0, y: 18, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
});

const glassCard = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(8px) saturate(1.1)",
  WebkitBackdropFilter: "blur(8px) saturate(1.1)",
  border: "1px solid rgba(255,255,255,0.55)",
  boxShadow: "0 18px 48px -24px rgba(44,20,31,0.28), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

interface LandingHeroProps {
  onSignup: () => void;
}

export function LandingHero({ onSignup }: LandingHeroProps) {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative z-10 px-5 sm:px-8 pt-3 sm:pt-6 lg:pt-8 pb-6 sm:pb-8">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Left */}
        <div className="text-left">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4 sm:mb-5"
            style={{
              background: "rgba(123,30,43,0.06)",
              border: "1px solid rgba(123,30,43,0.14)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-wine" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.10em] text-wine">
              Inteligência Sommelyx
            </span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="max-w-[36rem] text-[1.75rem] sm:text-5xl font-semibold leading-[1.08] sm:leading-[1.05] tracking-[-0.02em]"
            style={{ color: "#1A1A1A" }}
          >
            Gestão inteligente da sua adega, com clareza de{" "}
            <span className="text-[#7B1E2B] sm:whitespace-nowrap">estoque, valor e giro.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="mt-3 sm:mt-4 max-w-lg text-[14px] sm:text-base leading-relaxed text-[#5F5F5F]"
          >
            Controle total, decisões rápidas e insights reais — sem planilhas.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="mt-5 sm:mt-6 flex flex-col gap-2.5 sm:gap-3 sm:flex-row sm:items-center"
          >
            <MagneticButton>
              <Button
                variant="primary"
                className="group h-11 sm:h-12 w-full sm:w-auto rounded-2xl px-6 sm:px-7 text-[14px] font-semibold shadow-[0_18px_44px_-22px_rgba(110,30,42,0.55)]"
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>
            <Button
              variant="outline"
              onClick={scrollToFeatures}
              className="h-11 sm:h-12 w-full sm:w-auto rounded-2xl px-6 text-[14px] font-semibold bg-white/70 backdrop-blur-sm border-black/8 hover:bg-white"
            >
              Ver como funciona
            </Button>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="mt-3.5 sm:mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-[#5F5F5F]"
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#2E5E3E]" strokeWidth={3} />
              14 dias grátis
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[#2E5E3E]" strokeWidth={3} />
              Cancele quando quiser
            </span>
          </motion.div>

          {/* Mini value cards — Estoque / Giro / Reposição (proporcionais, sob os CTAs) */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={5}
            className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 max-w-xl"
          >
            {[
              {
                icon: Layers,
                title: "Estoque",
                desc: "Saiba o que você tem, em segundos.",
                color: "hsl(var(--wine))",
                bg: "rgba(123,30,43,0.08)",
                border: "rgba(123,30,43,0.14)",
              },
              {
                icon: TrendingUp,
                title: "Giro",
                desc: "Entenda o que vende mais.",
                color: "#5F6F52",
                bg: "rgba(95,111,82,0.10)",
                border: "rgba(95,111,82,0.18)",
              },
              {
                icon: AlertTriangle,
                title: "Reposição",
                desc: "Nunca perca uma oportunidade.",
                color: "#B8860B",
                bg: "rgba(198,167,104,0.12)",
                border: "rgba(198,167,104,0.22)",
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl p-2.5"
                style={glassCard}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                    style={{ background: item.bg, border: `1px solid ${item.border}` }}
                  >
                    <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.10em] text-[#1A1A1A]">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#5F5F5F]">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Inteligência Sommelyx — destaque sob os 3 mini cards */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={6}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 sm:mt-3.5 rounded-2xl p-4 max-w-xl"
            style={{
              ...glassCard,
              background: "linear-gradient(160deg, rgba(55,30,36,0.96) 0%, rgba(28,15,20,1) 100%)",
              border: "1px solid rgba(198,167,104,0.22)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(198,167,104,0.18)", border: "1px solid rgba(198,167,104,0.28)" }}>
                <Sparkles className="h-3.5 w-3.5 text-[#C6A768]" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#C6A768]">Inteligência Sommelyx</p>
            </div>
            <p className="text-[12px] leading-relaxed font-medium text-[#F8F6F3]">
              "Seu Brunello 2018 está na <span className="text-[#C6A768]">janela ideal</span>. Considere abrir nos próximos 60 dias."
            </p>
          </motion.div>
        </div>

        {/* Right: Organized grid of dashboard cards */}
        <div className="relative lg:pt-24 xl:pt-32">
          {/* Glow background */}
          <div className="pointer-events-none absolute -left-6 -top-6 h-56 w-56 rounded-full" style={{ background: "rgba(110,30,42,0.14)", filter: "blur(70px)" }} />
          <div className="pointer-events-none absolute -bottom-10 -right-6 h-72 w-72 rounded-full" style={{ background: "rgba(198,167,104,0.16)", filter: "blur(90px)" }} />

          <div className="relative grid grid-cols-2 gap-3 sm:gap-3.5">
            {/* Adega — full width */}
            <motion.div
              {...float(0.18)}
              className="col-span-2 rounded-2xl p-4"
              style={glassCard}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(123,30,43,0.08)", border: "1px solid rgba(123,30,43,0.12)" }}>
                    <Wine className="h-4 w-4 text-wine" />
                  </div>
                  <div className="leading-none">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F]">Adega</p>
                    <p className="text-[13px] font-semibold tracking-tight text-[#1A1A1A]">128 garrafas</p>
                  </div>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-wine" style={{ background: "rgba(123,30,43,0.08)" }}>
                  R$ 92k
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  { name: "Brunello di Montalcino", qty: 2, tone: "low" },
                  { name: "Champagne Brut", qty: 8, tone: "ok" },
                  { name: "Barolo Riserva", qty: 1, tone: "low" },
                ].map((row) => (
                  <div key={row.name} className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${row.tone === "low" ? "bg-wine" : "bg-gold"}`} />
                    <p className="flex-1 truncate text-[11px] font-medium text-[#1A1A1A]">{row.name}</p>
                    <span className="text-[10px] font-medium text-[#5F5F5F]">{row.qty}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Reposição — half */}
            <motion.div {...float(0.26)} className="rounded-2xl p-3.5" style={glassCard}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(198,167,104,0.14)", border: "1px solid rgba(198,167,104,0.24)" }}>
                  <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#B8860B" }} />
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.10em]" style={{ color: "#8B6914" }}>Reposição</p>
              </div>
              <p className="text-[11.5px] leading-snug font-medium text-[#1A1A1A]">
                <span className="font-semibold text-wine">3 rótulos</span> abaixo do mínimo
              </p>
              <p className="mt-0.5 text-[10px] text-[#5F5F5F]">Veja sugestão de compra</p>
            </motion.div>

            {/* Janela ideal — half */}
            <motion.div {...float(0.32)} className="rounded-2xl p-3.5" style={glassCard}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(95,111,82,0.10)", border: "1px solid rgba(95,111,82,0.18)" }}>
                  <Calendar className="h-3.5 w-3.5" style={{ color: "#5F6F52" }} />
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.10em]" style={{ color: "#3F4D36" }}>Janela ideal</p>
              </div>
              <p className="text-[11.5px] leading-snug font-medium text-[#1A1A1A]">
                <span className="font-semibold" style={{ color: "#3F4D36" }}>12 vinhos</span> no auge
              </p>
              <p className="mt-0.5 text-[10px] text-[#5F5F5F]">Beba nos próximos meses</p>
            </motion.div>

            {/* Consumo — full width */}
            <motion.div {...float(0.40)} className="col-span-2 rounded-2xl p-4" style={glassCard}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(95,111,82,0.10)", border: "1px solid rgba(95,111,82,0.16)" }}>
                    <Clock className="h-4 w-4" style={{ color: "#5F6F52" }} />
                  </div>
                  <div className="leading-none">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-[#5F5F5F]">Consumo</p>
                    <p className="text-[13px] font-semibold tracking-tight text-[#1A1A1A]">Últimos 6 meses</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E5E3E]">
                  <TrendingUp className="h-3 w-3" /> 37%
                </span>
              </div>
              <div className="grid grid-cols-6 items-end gap-1.5 h-12">
                {[4, 7, 6, 10, 9, 12].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 0.7 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{ originY: 1 }}
                    className="rounded-md"
                  >
                    <div className="rounded-md bg-wine/85" style={{ height: `${h * 4}px` }} />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Mais avaliado — half */}
            <motion.div {...float(0.48)} className="rounded-2xl p-3.5" style={glassCard}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(198,167,104,0.14)", border: "1px solid rgba(198,167,104,0.28)" }}>
                  <Star className="h-3.5 w-3.5" style={{ color: "#B8860B" }} />
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.10em]" style={{ color: "#8B6914" }}>Mais avaliado</p>
              </div>
              <p className="text-[11.5px] leading-snug font-semibold text-[#1A1A1A] truncate">Châteauneuf-du-Pape</p>
              <p className="mt-0.5 text-[10px] text-[#5F5F5F]">★ 4.9 · 23 notas</p>
            </motion.div>

            {/* Giro — half */}
            <motion.div {...float(0.54)} className="rounded-2xl p-3.5" style={glassCard}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(123,30,43,0.08)", border: "1px solid rgba(123,30,43,0.14)" }}>
                  <TrendingUp className="h-3.5 w-3.5 text-wine" />
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.10em] text-wine">Giro</p>
              </div>
              <p className="text-[11.5px] leading-snug font-medium text-[#1A1A1A]">
                <span className="font-semibold text-wine">+18%</span> vs. mês anterior
              </p>
              <p className="mt-0.5 text-[10px] text-[#5F5F5F]">Ritmo saudável</p>
            </motion.div>
          </div>
        </div>
      </div>

    </section>
  );
}
