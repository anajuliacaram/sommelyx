import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Check, GlassWater, Search, Wine } from "@/icons/lucide";

const fadeUp = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const conciergeRows = [
  {
    icon: Wine,
    label: "Adega",
    title: "Brunello di Montalcino 2018",
    detail: "2 garrafas prontas",
  },
  {
    icon: BookOpen,
    label: "Carta",
    title: "Menu de inverno",
    detail: "12 rótulos organizados",
  },
  {
    icon: GlassWater,
    label: "Mesa",
    title: "Risoto de funghi",
    detail: "Barolo ou Pinot Noir",
  },
];

interface LandingHeroProps {
  onSignup: () => void;
}

export function LandingHero({ onSignup }: LandingHeroProps) {
  const scrollToProduct = () => {
    document.getElementById("product")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="landing-hero-cinematic">
      <div className="landing-hero-vignette" aria-hidden="true" />
      <div className="landing-hero-inner">
        <div className="landing-hero-copy">
          <motion.p className="landing-kicker" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            Adega, carta e mesa
          </motion.p>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            Sua adega, pronta para o momento certo.
          </motion.h1>

          <motion.p className="landing-hero-lede" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            Sommelyx organiza seus vinhos, acompanha janelas de consumo e ajuda a decidir o que abrir, harmonizar ou guardar.
          </motion.p>

          <motion.div className="landing-hero-actions" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <button type="button" className="landing-btn landing-btn-primary" onClick={onSignup}>
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" className="landing-btn landing-btn-secondary" onClick={scrollToProduct}>
              Ver experiência
            </button>
          </motion.div>

          <motion.div className="landing-benefits" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <span><Check className="h-3.5 w-3.5" />14 dias grátis</span>
            <span><Check className="h-3.5 w-3.5" />Cancele quando quiser</span>
          </motion.div>
        </div>

        <motion.div className="landing-hero-object" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <div className="landing-orbit one" aria-hidden="true" />
          <div className="landing-orbit two" aria-hidden="true" />
          <div className="landing-concierge-card">
            <div className="landing-concierge-top">
              <div>
                <p>Concierge de vinho</p>
                <h2>Do rótulo à taça.</h2>
              </div>
              <div className="landing-concierge-icon">
                <Search className="h-5 w-5" />
              </div>
            </div>

            <div className="landing-bottle-stage">
              <div className="landing-bottle" aria-hidden="true">
                <span />
              </div>
              <div className="landing-stage-note">
                <p>Insight do dia</p>
                <strong>Abra este rótulo hoje</strong>
              </div>
            </div>

            <div className="landing-concierge-rows">
              {conciergeRows.map((row) => (
                <div key={row.label} className="landing-concierge-row">
                  <div className="landing-row-icon"><row.icon className="h-4 w-4" /></div>
                  <div>
                    <p>{row.label}</p>
                    <strong>{row.title}</strong>
                  </div>
                  <span>{row.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
