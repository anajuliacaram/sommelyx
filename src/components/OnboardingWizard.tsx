import { useState } from "react";
import { createPortal } from "react-dom";
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
  const iconTone = step === 0 ? "wine" : step === 1 ? "clock" : "shield";

  const content = (
    <motion.div
      className="modal-overlay onboarding-overlay fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      data-radix-dialog-overlay=""
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0" onClick={handleSkip} />

      <motion.div
        className="modal-container onboarding-container relative w-full overflow-hidden"
        data-radix-dialog-content=""
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <ModalCloseButton
          className="modal-close-btn absolute top-4 right-4 z-10 h-8 w-8"
          label="Pular onboarding"
          onClick={handleSkip}
        />

        <div className="modal-header">
          <div className="modal-header-text">
            <span className="onboarding-step">{step + 1} de {totalSteps}</span>
            <div className="onboarding-progress">
              <motion.div
                className="onboarding-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div>
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
                  className={`onboarding-icon ${iconTone}`}
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <current.icon className="h-7 w-7" />
                </motion.div>

                <h2 className="onboarding-title">
                  {current.title}
                </h2>
                <p className="onboarding-text">
                  {current.desc}
                </p>

                <div className="onboarding-dots">
                  {benefits.map((_, i) => (
                    <div
                      key={i}
                      className={`onboarding-dot ${i === step ? "active" : ""}`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="modal-footer onboarding-footer">
          <Button variant="ghost" className="modal-btn-ghost btn-pular" onClick={handleSkip}>
            Pular
          </Button>
          <Button
            className="modal-btn-primary btn-proximo"
            onClick={handleNext}
          >
            {isLast ? (
              <><Sparkles className="h-4 w-4 mr-2" />Começar</>
            ) : (
              <>Próximo<ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
