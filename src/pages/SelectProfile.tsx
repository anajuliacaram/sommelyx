import { useState } from "react";
import { BrandName } from "@/components/BrandName";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, BarChart3, ArrowRight, Check, Sparkles, Mail } from "@/icons/lucide";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type ProfileOption = {
  type: "personal" | "commercial";
  icon: typeof Wine;
  eyebrow: string;
  title: string;
  desc: string;
  features: string[];
  tone: "soft" | "deep";
};

const OPTIONS: ProfileOption[] = [
  {
    type: "personal",
    icon: Wine,
    eyebrow: "Para você",
    title: "Adega pessoal",
    desc: "Organize seus vinhos, acompanhe consumo e descubra o momento ideal para abrir cada garrafa.",
    features: ["Controle da sua coleção", "Histórico de consumo", "Sugestões de harmonização"],
    tone: "soft",
  },
  {
    type: "commercial",
    icon: BarChart3,
    eyebrow: "Para o seu negócio",
    title: "Adega comercial",
    desc: "Gerencie estoque, giro e performance com inteligência para restaurantes, bares e lojas.",
    features: ["Controle de estoque", "Análise de giro", "Relatórios e insights"],
    tone: "deep",
  },
];

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
      toast({
        title: "Perfil salvo!",
        description: `Modo ${type === "personal" ? "Adega Pessoal" : "Adega Comercial"} ativado.`,
      });
      setStep(2);
    } catch (err: any) {
      console.error("[SelectProfile] Save error:", err);
      toast({
        title: "Erro ao salvar perfil",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
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
    <div
      className="min-h-screen flex items-center justify-center px-5 py-10 sm:p-10 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(165deg, #F4F1EC 0%, #EDE7DF 40%, #E6E2D8 65%, #E8E4DB 100%)",
      }}
    >
      {/* Ambient highlights */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, hsl(var(--primary) / 0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, hsl(var(--gold) / 0.06), transparent 60%)",
        }}
      />

      <div className="w-full max-w-3xl relative z-10">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {/* Header */}
              <div className="text-center mb-9 sm:mb-11">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="inline-flex items-center gap-2 mb-6"
                >
                  <img
                    src="/logo-sommelyx-mark.png"
                    alt="Sommelyx"
                    draggable={false}
                    className="h-9 w-auto select-none object-contain drop-shadow-[0_4px_10px_rgba(15,15,20,0.18)]"
                  />
                  <span className="text-[18px] font-bold tracking-[-0.01em] text-primary leading-none font-serif">
                    Sommelyx
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.05, ease: EASE }}
                  className="text-[26px] sm:text-[34px] font-serif font-semibold tracking-tight text-foreground leading-[1.1]"
                >
                  Como você quer usar o{" "}
                  <BrandName className="text-[26px] sm:text-[34px]" />?
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
                  className="mt-3 text-[14px] sm:text-[15px] text-foreground/60 max-w-md mx-auto"
                >
                  Escolha o modo ideal para sua adega. Você pode alterar depois.
                </motion.p>
              </div>

              {/* Cards */}
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                {OPTIONS.map((option, i) => {
                  const isActive = selectedType === option.type;
                  const isDeep = option.tone === "deep";
                  return (
                    <motion.button
                      key={option.type}
                      onClick={() => handleSelect(option.type)}
                      disabled={saving}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.18 + i * 0.08,
                        duration: 0.6,
                        ease: EASE,
                      }}
                      whileHover={!saving ? { y: -3 } : {}}
                      whileTap={!saving ? { scale: 0.985 } : {}}
                      className={cn(
                        "group relative text-left w-full rounded-[20px] p-6 sm:p-7 overflow-hidden",
                        "bg-white/85 backdrop-blur-sm",
                        "border transition-all duration-300",
                        "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                        "shadow-[0_2px_10px_-4px_rgba(15,15,20,0.06)]",
                        "hover:shadow-[0_18px_44px_-20px_rgba(74,15,24,0.22)]",
                        isActive
                          ? "border-primary ring-2 ring-primary/15"
                          : "border-[hsl(var(--border))] hover:border-primary/40",
                        saving && !isActive && "opacity-50",
                      )}
                    >
                      {/* Tinted top accent */}
                      <div
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-[3px]"
                        style={{
                          background: isDeep
                            ? "linear-gradient(90deg, transparent, hsl(var(--primary)) 50%, transparent)"
                            : "linear-gradient(90deg, transparent, hsl(var(--wine) / 0.7) 50%, transparent)",
                          opacity: isActive ? 1 : 0.55,
                          transition: "opacity 0.3s ease",
                        }}
                      />

                      {/* Selected check */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 18 }}
                            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-[0_4px_12px_hsl(var(--primary)/0.35)]"
                          >
                            {saving ? (
                              <div className="w-3 h-3 border-2 rounded-full animate-spin border-white border-t-transparent" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Eyebrow */}
                      <p
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-[0.14em] mb-4",
                          isDeep ? "text-primary" : "text-wine/80",
                        )}
                      >
                        {option.eyebrow}
                      </p>

                      {/* Icon */}
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105",
                        )}
                        style={{
                          background: isDeep
                            ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--wine)) 100%)"
                            : "linear-gradient(135deg, hsl(var(--wine) / 0.10) 0%, hsl(var(--wine) / 0.18) 100%)",
                          border: isDeep
                            ? "1px solid hsl(var(--primary) / 0.3)"
                            : "1px solid hsl(var(--wine) / 0.2)",
                          boxShadow: isDeep
                            ? "0 8px 22px -8px hsl(var(--primary) / 0.45), inset 0 1px 0 hsl(0 0% 100% / 0.15)"
                            : "0 4px 14px -6px hsl(var(--wine) / 0.18)",
                        }}
                      >
                        <option.icon
                          className={cn("h-6 w-6", isDeep ? "text-white" : "text-wine")}
                          strokeWidth={1.8}
                        />
                      </div>

                      {/* Title + description */}
                      <h3 className="text-[20px] font-serif font-semibold tracking-tight text-foreground mb-2">
                        {option.title}
                      </h3>
                      <p className="text-[13.5px] leading-relaxed text-foreground/65 mb-5">
                        {option.desc}
                      </p>

                      {/* Features */}
                      <ul className="space-y-2.5 mb-6">
                        {option.features.map((f) => (
                          <li
                            key={f}
                            className="text-[13px] flex items-center gap-2.5 text-foreground/75"
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                                isDeep ? "bg-primary/12" : "bg-wine/10",
                              )}
                            >
                              <Check
                                className={cn(
                                  "h-2.5 w-2.5",
                                  isDeep ? "text-primary" : "text-wine",
                                )}
                                strokeWidth={3}
                              />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* CTA row */}
                      <div
                        className={cn(
                          "flex items-center gap-1.5 font-semibold text-[13px] transition-all duration-300",
                          "group-hover:gap-2.5",
                          isDeep ? "text-primary" : "text-wine",
                        )}
                      >
                        {saving && isActive ? "Salvando..." : "Selecionar este modo"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Help link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-8 sm:mt-10 text-center"
              >
                <p className="text-[13px] text-foreground/55">
                  Não encontrou o que procura?{" "}
                  <a
                    href="mailto:sommelyx@gmail.com?subject=Fale%20com%20a%20Sommeli%C3%A8re"
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-wine transition-colors duration-200 underline-offset-4 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Fale com a Sommelière
                  </a>
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="text-center max-w-md mx-auto"
            >
              <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-primary to-wine shadow-[0_8px_24px_hsl(var(--primary)/0.25)]"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
              </motion.div>

              <h2 className="text-[26px] sm:text-3xl font-serif font-semibold mb-3 text-foreground tracking-tight">
                Pronto! Sua adega está configurada.
              </h2>
              <p className="text-[14px] mb-8 leading-relaxed text-foreground/65">
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
