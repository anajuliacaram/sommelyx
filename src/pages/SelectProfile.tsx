import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, Building2, ArrowRight, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { WineMesh } from "@/components/WineMesh";

export default function SelectProfile() {
  const { setProfileType } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<"personal" | "commercial" | null>(null);

  const handleSelect = async (type: "personal" | "commercial") => {
    try {
      setSelectedType(type);
      await setProfileType(type);
      setStep(2);
    } catch {
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    }
  };

  const handleFinish = () => navigate("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 gradient-wine-deep opacity-40" />
      <WineMesh variant="subtle" />

      <div className="w-full max-w-3xl relative z-10">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/50" : "w-4 bg-muted"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg gradient-wine flex items-center justify-center">
                    <Wine className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold text-foreground font-sans tracking-tight">Sommelyx</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3" style={{ letterSpacing: "-0.03em" }}>
                  Como você vai usar
                  <br />
                  <span className="italic text-gradient-gold">o Sommelyx?</span>
                </h1>
                <p className="text-sm text-muted-foreground">Escolha o perfil ideal. Você pode mudar depois.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    type: "personal" as const,
                    icon: Wine,
                    title: "Adega Pessoal",
                    desc: "Organize sua coleção, saiba o que beber e quando.",
                    features: ["Cadastro completo de vinhos", "Notas de degustação", "Estatísticas da coleção", "Lista de desejos"],
                  },
                  {
                    type: "commercial" as const,
                    icon: Building2,
                    title: "Operação Comercial",
                    desc: "Controle estoque, registre vendas, sem planilhas.",
                    features: ["Gestão de estoque", "Registro de vendas", "Relatórios financeiros", "Multiusuário"],
                  },
                ].map((option, i) => (
                  <motion.button
                    key={option.type}
                    onClick={() => handleSelect(option.type)}
                    className="card-depth p-7 text-left group hover:border-primary/20 transition-all duration-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="w-10 h-10 rounded-lg gradient-wine flex items-center justify-center mb-5 group-hover:shadow-wine transition-shadow duration-200">
                      <option.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2 font-sans tracking-tight">{option.title}</h3>
                    <p className="text-muted-foreground text-[12px] mb-5 leading-relaxed">{option.desc}</p>
                    <ul className="space-y-2 mb-5">
                      {option.features.map(f => (
                        <li key={f} className="text-[12px] text-muted-foreground flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1.5 text-primary font-medium text-[12px] group-hover:gap-2.5 transition-all duration-200">
                      Selecionar <ArrowRight className="h-3 w-3" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center max-w-md mx-auto"
            >
              <motion.div
                className="w-16 h-16 rounded-2xl gradient-wine flex items-center justify-center mx-auto mb-6 glow-wine"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Check className="h-8 w-8 text-primary-foreground" />
              </motion.div>

              <h2 className="text-2xl font-serif font-bold text-foreground mb-3" style={{ letterSpacing: "-0.03em" }}>
                Pronto! Sua adega está configurada.
              </h2>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                {selectedType === "commercial"
                  ? "Cadastre seus primeiros produtos e comece a controlar seu estoque."
                  : "Adicione seus primeiros vinhos e organize sua coleção."}
              </p>

              <Button
                onClick={handleFinish}
                className="gradient-wine text-primary-foreground btn-glow h-12 px-8 text-sm font-medium"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Ir para o Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
