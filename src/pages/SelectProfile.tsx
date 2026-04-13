import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, Building2, ArrowRight, Check, Sparkles } from "@/icons/lucide";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SelectProfile() {
  const { setProfileType, user, profileType: existingProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<"personal" | "commercial" | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (type: "personal" | "commercial") => {
    if (saving || selectedType) return;
    setSaving(true);
    setSelectedType(type);
    try {
      await setProfileType(type);
      toast({ title: "Perfil salvo!", description: `Modo ${type === "personal" ? "Adega Pessoal" : "Operação Comercial"} ativado.` });
      setStep(2);
    } catch (err: any) {
      console.error("[SelectProfile] Save error:", err);
      toast({ title: "Erro ao salvar perfil", description: err.message || "Tente novamente.", variant: "destructive" });
      setSelectedType(null);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => navigate("/dashboard");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-48">
          <div className="skeleton-premium h-6 w-full rounded-lg" />
          <div className="skeleton-premium h-4 w-3/4 rounded-lg" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (existingProfile) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: "radial-gradient(circle at 20% 30%, rgba(80,120,90,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(120,160,120,0.15), transparent 50%), linear-gradient(135deg, #0B1F17, #0F2A20, #132F24)" }}>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,hsl(var(--primary)/0.05),transparent_70%)]" />

      <div className="w-full max-w-3xl relative z-10">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-wine" : "w-4 bg-border",
              )}
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
              <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-5">
                  <img
                    src="/logo-sommelyx-mark.png"
                    alt="Sommelyx"
                    draggable={false}
                    className="h-12 w-auto select-none object-contain drop-shadow-[0_6px_12px_rgba(15,15,20,0.18)]"
                  />
                  <span className="text-[22px] font-bold tracking-[-0.01em] text-primary leading-none font-serif">
                    Sommelyx
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2 text-foreground tracking-tight">
                  Como você vai usar
                  <br />
                  <span className="italic text-gold">o Sommelyx?</span>
                </h1>
                <p className="text-sm text-muted-foreground">Escolha o perfil ideal. Você pode mudar depois.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
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
                    disabled={saving}
                    className={cn(
                      "glass-card p-7 text-left group cursor-pointer relative w-full transition-all",
                      selectedType === option.type && "border-primary/40 shadow-[0_10px_30px_hsl(var(--primary)/0.12)]",
                      saving && selectedType !== option.type && "opacity-50",
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={!saving ? { scale: 0.98 } : {}}
                  >
                    {saving && selectedType === option.type && (
                      <div className="absolute top-4 right-4">
                        <div className="w-5 h-5 border-2 rounded-full animate-spin border-primary border-t-transparent" />
                      </div>
                    )}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br from-primary to-wine shadow-[0_4px_12px_hsl(var(--primary)/0.15)]">
                      <option.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-base font-semibold mb-2 font-sans tracking-tight text-foreground">{option.title}</h3>
                    <p className="text-[12px] mb-5 leading-relaxed text-muted-foreground">{option.desc}</p>
                    <ul className="space-y-2 mb-5">
                      {option.features.map(f => (
                        <li key={f} className="text-[12px] flex items-center gap-2 text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1.5 font-medium text-[12px] text-primary group-hover:gap-2.5 transition-all duration-200">
                      {saving && selectedType === option.type ? "Salvando..." : "Selecionar"} <ArrowRight className="h-3 w-3" />
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
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-primary to-wine shadow-[0_8px_24px_hsl(var(--primary)/0.2)]"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Check className="h-8 w-8 text-white" />
              </motion.div>

              <h2 className="text-2xl font-serif font-bold mb-3 text-foreground tracking-tight">
                Pronto! Sua adega está configurada.
              </h2>
              <p className="text-sm mb-8 leading-relaxed text-muted-foreground">
                {selectedType === "commercial"
                  ? "Cadastre seus primeiros produtos e comece a controlar seu estoque."
                  : "Adicione seus primeiros vinhos e organize sua coleção."}
              </p>

              <Button
                onClick={handleFinish}
                variant="primary"
                className="h-12 px-10 text-[13px] font-bold rounded-2xl shadow-float"
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
