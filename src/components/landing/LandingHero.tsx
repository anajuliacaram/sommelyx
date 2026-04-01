import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

interface LandingHeroProps {
  onSignup: () => void;
}

export function LandingHero({ onSignup }: LandingHeroProps) {
  return (
    <section className="relative pt-28 sm:pt-40 lg:pt-48 pb-16 sm:pb-24 px-5 sm:px-8 z-10">
      <div className="mx-auto relative max-w-2xl">
        <div className="flex flex-col items-center text-center">
          {/* Eyebrow */}
          <motion.div
            className="mb-5 sm:mb-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={0}
          >
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-wine-light text-wine border border-wine/10">
              Gestão de adega inteligente
            </span>
          </motion.div>

          <motion.h1
            className="font-serif font-black text-foreground leading-[1.08] tracking-[-0.03em]"
            style={{ fontSize: "clamp(28px, 5.5vw, 54px)" }}
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Controle sua adega e saiba exatamente quando abrir cada vinho
          </motion.h1>

          <motion.p
            className="text-[15px] sm:text-lg md:text-xl max-w-md mt-5 sm:mt-7 font-medium text-muted-foreground leading-relaxed"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Organize, acompanhe e nunca mais perca garrafas no ponto errado.
          </motion.p>

          <motion.div
            className="mt-8 sm:mt-10 flex flex-col items-center gap-3"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <MagneticButton>
              <Button
                className="group px-10 sm:px-14 h-12 sm:h-14 text-[14px] sm:text-[15px] font-bold rounded-full transition-all text-primary-foreground hover:-translate-y-0.5 shadow-[0_8px_30px_hsl(340_54%_36%/0.3)] hover:shadow-[0_16px_40px_hsl(340_54%_36%/0.4)] bg-primary hover:bg-wine-vivid active:scale-[0.98]"
                onClick={onSignup}
              >
                Começar grátis
                <ArrowRight className="ml-2.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </MagneticButton>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold bg-[hsl(142_66%_95%)] text-[hsl(142_66%_28%)] border border-[hsl(142_66%_38%/0.15)]">
              <Check className="h-3 w-3 text-[hsl(142_66%_38%)]" /> 14 dias grátis
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
