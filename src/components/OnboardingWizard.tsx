import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, Clock, ShieldCheck, Sparkles, ArrowRight, Package, TrendingUp, Users } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { ModalCloseButton } from "@/components/ui/modal-close-button";

interface Benefit {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}

const personalBenefits: Benefit[] = [
  { icon: Wine, title: "Organize sua adega", desc: "Cadastre cada garrafa com safra, produtor e localização. Encontre qualquer rótulo em segundos.", color: "#8F2D56" },
  { icon: Clock, title: "Saiba quando beber", desc: "Alertas inteligentes avisam quando cada garrafa atinge a janela ideal de consumo.", color: "#22c55e" },
  { icon: ShieldCheck, title: "Nunca perca uma garrafa", desc: "Acompanhe estoque, consumo e avaliações. Controle total da sua coleção.", color: "#3b82f6" },
];

const commercialBenefits: Benefit[] = [
  { icon: Package, title: "Controle estoque sem planilhas", desc: "Monitore entradas, saídas e níveis críticos em tempo real.", color: "#8F2D56" },
  { icon: TrendingUp, title: "Acompanhe giro e relatórios", desc: "Curva ABC, valor em estoque e giro de produtos em um dashboard objetivo.", color: "#22c55e" },
  { icon: Users, title: "Cadastre rótulos e fornecedores", desc: "Registre vendas, importações em lote e gerencie sua operação.", color: "#3b82f6" },
];

interface Props {
  profileType: "personal" | "commercial";
  onComplete: () => void;
  storageKey?: string;
}

export function OnboardingWizard({ profileType, onComplete, storageKey }: Props) {
  const [step, setStep] = useState(0);
  const benefits = profileType === "personal" ? personalBenefits : commercialBenefits;
  const key = storageKey || `sommelyx_onboarding_done_${profileType}`;
  const totalSteps = benefits.length;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(key, "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(key, "true");
    onComplete();
  };

  const current = benefits[step];
  const isLast = step === totalSteps - 1;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh] sm:pt-[12vh] lg:pt-[14vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl border border-white/10"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.88))",
          backdropFilter: "blur(40px)",
          boxShadow: "0 32px 64px -16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.15) inset",
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <ModalCloseButton
          className="absolute top-4 right-4 z-10 h-8 w-8"
          label="Pular onboarding"
          onClick={handleSkip}
        />

        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{step + 1} de {totalSteps}</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #8F2D56, #C44569)" }}
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`, boxShadow: `0 8px 24px ${current.color}33` }}
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <current.icon className="h-7 w-7 text-white" />
              </motion.div>

              <h2 className="text-xl font-serif font-bold text-foreground mb-3" style={{ letterSpacing: "-0.02em" }}>
                {current.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {current.desc}
              </p>

              <div className="flex gap-2 mt-6 mb-6">
                {benefits.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: i === step ? 24 : 8, background: i === step ? current.color : "hsl(var(--muted))" }}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="flex-1 h-12 text-sm font-semibold text-muted-foreground" onClick={handleSkip}>
              Pular
            </Button>
            <Button
              className="flex-1 h-12 text-sm font-bold text-white border-0 rounded-xl"
              style={{
                background: isLast
                  ? "linear-gradient(135deg, #8F2D56, #C44569, #E07A5F)"
                  : "linear-gradient(135deg, #8F2D56, #C44569)",
                boxShadow: "0 8px 20px rgba(143,45,86,0.25)",
              }}
              onClick={handleNext}
            >
              {isLast ? (
                <><Sparkles className="h-4 w-4 mr-2" />Começar</>
              ) : (
                <>Próximo<ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
