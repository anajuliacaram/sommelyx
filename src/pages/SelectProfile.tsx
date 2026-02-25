import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, Building2, ArrowRight, Check, Sparkles } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function SelectProfile() {
  const { setProfileType, user, profileType: existingProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<"personal" | "commercial" | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (type: "personal" | "commercial") => {
    if (saving) return;
    setSaving(true);
    setSelectedType(type);
    try {
      await setProfileType(type);
      setStep(2);
    } catch (err: any) {
      console.error("Profile save error:", err);
      toast({ title: "Erro ao salvar perfil", description: err.message, variant: "destructive" });
      setSelectedType(null);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => navigate("/dashboard");

  // Auth guards
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F7F8" }}>
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: "#F7F7F8" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(143,45,86,0.04), transparent 70%)" }} />

      <div className="w-full max-w-3xl relative z-10">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: s === step ? 32 : 16,
                background: s === step ? "#8F2D56" : s < step ? "#C44569" : "rgba(0,0,0,0.08)",
              }}
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
                <div className="flex items-center justify-center gap-2.5 mb-6">
                  <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-18 w-18 object-contain" />
                  <span className="text-[15px] font-bold font-sans tracking-tight" style={{ color: "#0F0F14" }}>Sommelyx</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3" style={{ letterSpacing: "-0.03em", color: "#0F0F14" }}>
                  Como você vai usar
                  <br />
                  <span className="italic" style={{ color: "#C9A86A" }}>o Sommelyx?</span>
                </h1>
                <p className="text-sm" style={{ color: "#9CA3AF" }}>Escolha o perfil ideal. Você pode mudar depois.</p>
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
                    className="glass-card p-7 text-left group cursor-pointer relative w-full"
                    style={{
                      borderColor: selectedType === option.type ? "rgba(143,45,86,0.4)" : undefined,
                      boxShadow: selectedType === option.type ? "0 10px 30px rgba(143,45,86,0.12)" : undefined,
                      opacity: saving && selectedType !== option.type ? 0.5 : 1,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={!saving ? { scale: 0.98 } : {}}
                  >
                    {saving && selectedType === option.type && (
                      <div className="absolute top-4 right-4">
                        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "#8F2D56 transparent transparent transparent" }} />
                      </div>
                    )}
                    <div
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-5"
                      style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)", boxShadow: "0 4px 12px rgba(143,45,86,0.15)" }}
                    >
                      <option.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-base font-semibold mb-2 font-sans tracking-tight" style={{ color: "#0F0F14" }}>{option.title}</h3>
                    <p className="text-[12px] mb-5 leading-relaxed" style={{ color: "#9CA3AF" }}>{option.desc}</p>
                    <ul className="space-y-2 mb-5">
                      {option.features.map(f => (
                        <li key={f} className="text-[12px] flex items-center gap-2" style={{ color: "#6B7280" }}>
                          <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#8F2D56" }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1.5 font-medium text-[12px] group-hover:gap-2.5 transition-all duration-200" style={{ color: "#8F2D56" }}>
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
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)", boxShadow: "0 8px 24px rgba(143,45,86,0.2)" }}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Check className="h-8 w-8 text-white" />
              </motion.div>

              <h2 className="text-2xl font-serif font-bold mb-3" style={{ letterSpacing: "-0.03em", color: "#0F0F14" }}>
                Pronto! Sua adega está configurada.
              </h2>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: "#9CA3AF" }}>
                {selectedType === "commercial"
                  ? "Cadastre seus primeiros produtos e comece a controlar seu estoque."
                  : "Adicione seus primeiros vinhos e organize sua coleção."}
              </p>

              <Button
                onClick={handleFinish}
                className="h-[56px] px-10 text-sm font-semibold text-white border-0 rounded-[15px]"
                style={{
                  background: "linear-gradient(135deg, #8F2D56, #C44569, #E07A5F)",
                  boxShadow: "0 12px 30px rgba(143,45,86,0.2)",
                }}
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
