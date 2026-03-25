import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, BarChart3, Bell, Shield, TrendingUp, Users, Sparkles, ArrowRight, X, GlassWater, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Benefit {
  icon: React.ElementType;
  title: string;
  desc: string;
  color: string;
}

const personalBenefits: Benefit[] = [
  {
    icon: Wine,
    title: "Sua coleção, organizada",
    desc: "Cadastre cada garrafa com detalhes como safra, produtor, região e notas de degustação. Saiba exatamente o que você tem e onde está.",
    color: "#8F2D56",
  },
  {
    icon: GlassWater,
    title: "Hora certa de abrir",
    desc: "Receba alertas inteligentes quando seus vinhos atingirem a janela ideal de consumo — nunca mais perca o momento perfeito.",
    color: "#22c55e",
  },
  {
    icon: BarChart3,
    title: "Insights da sua adega",
    desc: "Acompanhe estatísticas de consumo, avaliações e a evolução da sua coleção ao longo do tempo com relatórios visuais.",
    color: "#C9A86A",
  },
];

const commercialBenefits: Benefit[] = [
  {
    icon: Shield,
    title: "Controle total de estoque",
    desc: "Monitore entradas, saídas e níveis críticos em tempo real. Alertas automáticos de baixo estoque evitam ruptura.",
    color: "#8F2D56",
  },
  {
    icon: TrendingUp,
    title: "Vendas e performance",
    desc: "Registre vendas, acompanhe o giro de estoque e identifique seus produtos mais rentáveis com a curva ABC.",
    color: "#22c55e",
  },
  {
    icon: Users,
    title: "Operação profissional",
    desc: "Relatórios financeiros, importação em lote via CSV e gestão multiusuário para escalar sua operação.",
    color: "#C9A86A",
  },
];

interface Props {
  profileType: "personal" | "commercial";
  onComplete: () => void;
}

export function OnboardingWizard({ profileType, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const benefits = profileType === "personal" ? personalBenefits : commercialBenefits;
  const totalSteps = benefits.length;

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("sommelyx_onboarding_done", "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("sommelyx_onboarding_done", "true");
    onComplete();
  };

  const current = benefits[step];
  const isLast = step === totalSteps - 1;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

      <motion.div
        className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/50"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Close */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {step + 1} de {totalSteps}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {profileType === "personal" ? "Adega Pessoal" : "Operação Comercial"}
            </span>
          </div>
          <Progress value={((step + 1) / totalSteps) * 100} className="h-1.5" />
        </div>

        {/* Content */}
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
              {/* Icon */}
              <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`,
                  boxShadow: `0 8px 24px ${current.color}33`,
                }}
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <current.icon className="h-7 w-7 text-white" />
              </motion.div>

              {/* Text */}
              <h2 className="text-xl font-serif font-bold text-foreground mb-3" style={{ letterSpacing: "-0.02em" }}>
                {current.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {current.desc}
              </p>

              {/* Dots */}
              <div className="flex gap-2 mt-6 mb-6">
                {benefits.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? 24 : 8,
                      background: i === step ? current.color : "hsl(var(--muted))",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="flex-1 h-12 text-sm font-semibold text-muted-foreground"
              onClick={handleSkip}
            >
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
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Começar
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
