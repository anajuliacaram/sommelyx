import { motion } from "framer-motion";
import { Wine, Clock, Sparkles, BarChart3, ArrowRight } from "@/icons/lucide";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const blocks = [
  {
    icon: Wine,
    eyebrow: "Organização",
    title: "Toda sua adega em um só lugar",
    desc: "Cadastre por foto do rótulo ou importe planilhas. Encontre qualquer garrafa em segundos.",
    accent: "hsl(var(--wine))",
    bg: "rgba(123,30,43,0.06)",
    border: "rgba(123,30,43,0.12)",
  },
  {
    icon: Clock,
    eyebrow: "Consumo inteligente",
    title: "Saiba o momento ideal de cada vinho",
    desc: "Alertas de janela de consumo. Aproveite cada garrafa no melhor ponto.",
    accent: "#5F6F52",
    bg: "rgba(95,111,82,0.08)",
    border: "rgba(95,111,82,0.16)",
  },
  {
    icon: Sparkles,
    eyebrow: "Inteligência Sommelyx",
    title: "IA que ajuda de verdade",
    desc: "Harmonize pratos, analise cartas e receba insights da sua coleção. Sem planilhas, sem fricção.",
    accent: "#B8860B",
    bg: "rgba(198,167,104,0.10)",
    border: "rgba(198,167,104,0.20)",
  },
  {
    icon: BarChart3,
    eyebrow: "Controle financeiro",
    title: "Estoque, vendas e giro no comercial",
    desc: "Relatórios automáticos, análise de performance e gestão operacional simplificada.",
    accent: "#7B1E2B",
    bg: "rgba(123,30,43,0.06)",
    border: "rgba(123,30,43,0.12)",
  },
];

const glassCard = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(8px) saturate(1.08)",
  WebkitBackdropFilter: "blur(8px) saturate(1.08)",
  border: "1px solid rgba(255,255,255,0.5)",
  boxShadow: "0 14px 40px -22px rgba(44,20,31,0.22), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

interface LandingFeaturesProps {
  onSignup: () => void;
}

export function LandingFeatures({ onSignup }: LandingFeaturesProps) {
  return (
    <section id="features" className="relative px-4 sm:px-8 pt-2 pb-6 sm:pb-8 z-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          className="text-center mx-auto max-w-2xl mb-8 sm:mb-10"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-wine mb-3">
            O que você ganha
          </span>
          <h2 className="text-[26px] sm:text-[34px] font-semibold tracking-[-0.02em] text-[#1A1A1A] leading-[1.1]">
            Quatro pilares para uma adega no controle
          </h2>
          <p className="mt-3 text-[14px] sm:text-[15px] leading-relaxed text-[#5F5F5F]">
            Da garrafa esquecida ao relatório de giro — tudo em uma experiência premium.
          </p>
        </motion.div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {blocks.map((block, i) => (
            <motion.div
              key={block.title}
              className="rounded-2xl p-5 sm:p-6 group"
              style={glassCard}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              custom={i + 1}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl shrink-0"
                  style={{ background: block.bg, border: `1px solid ${block.border}` }}
                >
                  <block.icon className="h-5 w-5" style={{ color: block.accent }} strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: block.accent }}
                  >
                    {block.eyebrow}
                  </span>
                  <h3 className="mt-1 text-[16px] sm:text-[17px] font-semibold tracking-tight text-[#1A1A1A] leading-snug">
                    {block.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5F5F5F]">
                    {block.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Inline CTA */}
        <motion.div
          className="mt-8 text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={5}
        >
          <Button
            variant="ghost"
            className="text-[13px] font-semibold text-wine hover:text-wine-vivid group"
            onClick={onSignup}
          >
            Começar grátis agora
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
