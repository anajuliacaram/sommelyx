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

const glassStyle = {
  background: "rgba(30,20,20,0.04)",
  backdropFilter: "blur(16px) saturate(1.3)",
  WebkitBackdropFilter: "blur(16px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.45)",
  boxShadow:
    "0 10px 36px -10px rgba(30,20,20,0.1), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
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
    accentBg: "rgba(110,30,42,0.08)",
    accentBorder: "rgba(110,30,42,0.14)",
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
    accentBg: "rgba(198,167,104,0.10)",
    accentBorder: "rgba(198,167,104,0.18)",
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
    accentBg: "rgba(150,30,50,0.10)",
    accentBorder: "rgba(150,30,50,0.18)",
  },
];

interface LandingFeaturesProps {
  onSignup: () => void;
}

function FeatureCard({ block, i, onSignup, mobile = false }: { block: typeof blocks[0]; i: number; onSignup: () => void; mobile?: boolean }) {
  return (
    <motion.div
      key={block.title}
      className={`
        ${mobile ? "snap-start shrink-0 w-[86%] max-w-[340px]" : ""}
        group relative flex flex-col items-start p-4 sm:p-5 rounded-2xl transition-all duration-250
        hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(30,20,20,0.15)]
      `}
      style={glassStyle}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      custom={i + 1}
    >
      <div
        className="absolute top-0 left-4 right-4 h-[1px] rounded-full pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)" }}
      />

      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: block.accentBg, border: `1px solid ${block.accentBorder}` }}
      >
        <block.icon className="h-4.5 w-4.5" style={{ color: block.accent }} strokeWidth={1.8} />
      </div>

      <h3 className="text-[17px] sm:text-[18px] font-serif font-bold mb-2 tracking-[-0.02em]" style={{ color: "#1A1A1A" }}>
        {block.title}
      </h3>

      <ul className="space-y-1.5 flex-1 mb-3">
        {block.bullets.map(b => (
          <li key={b} className="flex items-start gap-2 text-[13px] sm:text-[14px] font-medium leading-snug" style={{ color: "#555" }}>
            <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold" strokeWidth={2.5} />
            {b}
          </li>
        ))}
      </ul>

      <Button
        variant="ghost"
        className="text-[12px] font-semibold text-wine hover:text-wine-vivid px-0 h-auto group/btn"
        onClick={onSignup}
      >
        Começar grátis
        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
      </Button>
    </motion.div>
  );
}

export function LandingFeatures({ onSignup }: LandingFeaturesProps) {
  return (
    <section id="features" className="relative px-4 sm:px-8 pb-6 sm:pb-10 z-10">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          className="text-center mb-8 sm:mb-10"
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
      >
          <h2 className="text-[22px] sm:text-[26px] md:text-[30px] font-serif font-bold tracking-[-0.02em]" style={{ color: "#F4F1EC" }}>
            Tudo que você precisa para gerenciar sua adega
          </h2>
          <p className="mt-2 text-[14px] sm:text-[16px] max-w-md mx-auto leading-relaxed" style={{ color: "rgba(244,241,236,0.72)" }}>
            Simples, inteligente e feito para quem ama vinho.
          </p>
        </motion.div>

        {/* Mobile carousel */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2.5 snap-x snap-mandatory">
            {blocks.map((block, i) => (
              <FeatureCard key={block.title} block={block} i={i} onSignup={onSignup} mobile />
            ))}
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:grid grid-cols-3 gap-4">
          {blocks.map((block, i) => (
            <FeatureCard key={block.title} block={block} i={i} onSignup={onSignup} />
          ))}
        </div>
      </div>
    </section>
  );
}
