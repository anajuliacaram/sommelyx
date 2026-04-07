import { motion } from "framer-motion";
import { Wine, Check, ShieldCheck, Clock, ArrowRight } from "@/icons/lucide";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const blocks = [
  {
    icon: Wine,
    title: "Organize sua adega",
    bullets: [
      "Cadastre vinhos com safra, produtor e uva",
      "Visualize tudo em um só lugar",
      "Encontre qualquer garrafa em segundos",
    ],
    accent: "hsl(var(--wine))",
    accentBg: "hsl(var(--wine) / 0.08)",
    accentBorder: "hsl(var(--wine) / 0.14)",
  },
  {
    icon: Clock,
    title: "Saiba quando beber",
    bullets: [
      "Alertas de consumo no momento ideal",
      "Evite abrir cedo ou tarde demais",
      "Aproveite cada garrafa no melhor ponto",
    ],
    accent: "hsl(var(--gold))",
    accentBg: "hsl(var(--gold) / 0.10)",
    accentBorder: "hsl(var(--gold) / 0.18)",
  },
  {
    icon: ShieldCheck,
    title: "Tenha controle total",
    bullets: [
      "Histórico completo e notas de degustação",
      "Insights inteligentes da coleção",
      "Tudo registrado automaticamente",
    ],
    accent: "hsl(var(--wine-vivid))",
    accentBg: "hsl(var(--wine-vivid) / 0.10)",
    accentBorder: "hsl(var(--wine-vivid) / 0.18)",
  },
];

interface LandingFeaturesProps {
  onSignup: () => void;
}

export function LandingFeatures({ onSignup }: LandingFeaturesProps) {
  return (
    <section id="features" className="relative px-4 sm:px-8 pb-6 sm:pb-10 z-10">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          className="text-center mb-10 sm:mb-14"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-[-0.015em] text-foreground">
            Tudo que você precisa para gerenciar sua adega
          </h2>
          <p className="mt-3 text-[13px] sm:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed">
            Simples, inteligente e feito para quem ama vinho.
          </p>
        </motion.div>

        {/* Mobile: carrossel horizontal (menos scroll) */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto pb-2">
          <div className="flex gap-3 snap-x snap-mandatory">
            {blocks.map((block, i) => (
              <motion.div
                key={block.title}
                className="snap-start shrink-0 w-[86%] max-w-[340px] group flex flex-col items-start p-5 rounded-2xl bg-card border border-border/60 shadow-[0_1px_3px_hsl(0_0%_0%/0.04),0_10px_26px_hsl(0_0%_0%/0.04)] transition-all duration-300"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                custom={i + 1}
              >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{ background: block.accentBg, border: `1px solid ${block.accentBorder}` }}
              >
                <block.icon className="h-5 w-5" style={{ color: block.accent }} strokeWidth={1.8} />
              </div>

              {/* Title */}
              <h3 className="text-[17px] sm:text-lg font-serif font-bold text-foreground mb-3 tracking-[-0.01em]">
                {block.title}
              </h3>

              {/* Bullets */}
              <ul className="space-y-2.5 flex-1 mb-5">
                {block.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-[13px] sm:text-[14px] text-muted-foreground font-medium leading-snug">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold" strokeWidth={2.5} />
                    {b}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                variant="ghost"
                className="text-[13px] font-semibold text-wine hover:text-wine-vivid hover:bg-wine-light/60 px-0 h-auto group/btn"
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
              </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Desktop/tablet */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {blocks.map((block, i) => (
            <motion.div
              key={block.title}
              className="group flex flex-col items-start p-6 sm:p-7 rounded-2xl bg-card border border-border/60 shadow-[0_1px_3px_hsl(0_0%_0%/0.04),0_8px_24px_hsl(0_0%_0%/0.03)] hover:shadow-[0_4px_12px_hsl(0_0%_0%/0.06),0_16px_40px_hsl(0_0%_0%/0.06)] transition-all duration-300 hover:-translate-y-0.5"
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp} custom={i + 1}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{ background: block.accentBg, border: `1px solid ${block.accentBorder}` }}
              >
                <block.icon className="h-5 w-5" style={{ color: block.accent }} strokeWidth={1.8} />
              </div>

              <h3 className="text-[17px] sm:text-lg font-serif font-bold text-foreground mb-3 tracking-[-0.01em]">
                {block.title}
              </h3>

              <ul className="space-y-2.5 flex-1 mb-5">
                {block.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-[13px] sm:text-[14px] text-muted-foreground font-medium leading-snug">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold" strokeWidth={2.5} />
                    {b}
                  </li>
                ))}
              </ul>

              <Button
                variant="ghost"
                className="text-[13px] font-semibold text-wine hover:text-wine-vivid hover:bg-wine-light/60 px-0 h-auto group/btn"
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
