import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Check, GlassWater, Sparkles, Wine } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { designSystem } from "@/styles/designSystem";

const fadeUp = {
  hidden: { opacity: 0, y: 22 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const moments = [
  {
    icon: Wine,
    label: "Adega",
    title: "Brunello di Montalcino 2018",
    detail: "2 garrafas prontas para abrir",
  },
  {
    icon: BookOpen,
    label: "Carta",
    title: "Menu de inverno reconhecido",
    detail: "12 rótulos organizados por estilo",
  },
  {
    icon: GlassWater,
    label: "Harmonização",
    title: "Risoto de funghi",
    detail: "Barolo ou Pinot Noir de guarda curta",
  },
];

interface LandingHeroProps {
  onSignup: () => void;
}

export function LandingHero({ onSignup }: LandingHeroProps) {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative z-10 px-5 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-8 lg:pt-12">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
        <div className="text-left">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 sm:mb-5"
            style={{
              background: "rgba(123,30,43,0.06)",
              border: "1px solid rgba(123,30,43,0.12)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-wine" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-wine">
              Inteligência Sommelyx
            </span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="max-w-[36rem] text-[2rem] font-medium leading-[1.02] tracking-[-0.03em] sm:text-[3.65rem] sm:leading-[0.98]"
            style={{
              color: "rgba(26,23,19,0.94)",
              fontFamily: "'Playfair Display', 'Fraunces', 'Libre Baskerville', Georgia, serif",
              fontOpticalSizing: "auto",
              fontVariationSettings: '"wght" 540',
            }}
          >
            Um ambiente calmo para decidir o vinho certo.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="mt-4 max-w-[32rem] text-[14px] leading-relaxed text-[rgba(58,51,39,0.66)] sm:text-[15px]"
          >
            Sommelyx une adega, carta, rótulos e harmonizações em uma experiência de curadoria, sem aparência de planilha ou painel operacional.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center"
          >
            <MagneticButton>
              <Button
                variant="primary"
                className="group h-11 w-full rounded-2xl px-6 text-[14px] font-semibold shadow-[0_18px_44px_-22px_rgba(46,74,47,0.50)] sm:h-12 sm:w-auto sm:px-7"
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </MagneticButton>
            <Button
              variant="outline"
              onClick={scrollToFeatures}
              className="h-11 w-full rounded-2xl border-black/8 bg-white/62 px-6 text-[14px] font-semibold backdrop-blur-sm hover:bg-white/82 sm:h-12 sm:w-auto"
            >
              Ver experiência
            </Button>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-[rgba(58,51,39,0.58)]"
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
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={5}
          className="relative"
        >
          <div
            className="pointer-events-none absolute -left-8 top-0 h-56 w-56 rounded-full"
            style={{ background: "rgba(110,30,42,0.10)", filter: "blur(84px)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-8 right-0 h-64 w-64 rounded-full"
            style={{ background: "rgba(198,167,104,0.12)", filter: "blur(92px)" }}
          />

          <div className="relative overflow-hidden rounded-[30px] p-5 sm:p-6" style={designSystem.glassCard}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(58,51,39,0.46)]">
                  Concierge de vinho
                </p>
                <h2
                  className="mt-2 max-w-[22rem] font-serif text-[25px] font-medium leading-[1.08] tracking-[-0.025em] text-[rgba(26,23,19,0.92)] sm:text-[32px]"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                >
                  Da garrafa ao jantar, tudo no mesmo ritmo.
                </h2>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(123,30,43,0.10)] bg-[rgba(123,30,43,0.07)] text-wine">
                <Wine className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-8 space-y-1">
              {moments.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.64 + index * 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex items-center gap-3 rounded-2xl px-1.5 py-2.5 transition-colors duration-300 hover:bg-white/24"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/38 text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.50)]">
                    <item.icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[rgba(72,60,46,0.42)]">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-medium tracking-[-0.01em] text-[rgba(26,23,19,0.86)]">
                      {item.title}
                    </p>
                  </div>
                  <p className="hidden max-w-[9rem] text-right text-[11px] leading-snug text-[rgba(72,60,46,0.54)] sm:block">
                    {item.detail}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
