import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, BarChart3, ArrowRight, Check, Sparkles, Mail } from "@/icons/lucide";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { designSystem } from "@/styles/designSystem";

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

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  borderRadius: "20px",
  border: "1px solid rgba(120,80,60,0.12)",
  boxShadow: "0 10px 30px rgba(60,40,20,0.08)",
};

const CTA_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, #6b1f1f, #8b2c2c)",
  color: "white",
  boxShadow: "0 12px 28px rgba(123,30,43,0.24)",
};

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
      <div className="app-background min-h-screen flex items-center justify-center">
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
      className={cn(
        designSystem.pageBackground,
        "min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10",
      )}
      style={{
        background:
          "radial-gradient(circle at 20% 30%, rgba(120, 60, 40, 0.08), transparent 40%), linear-gradient(135deg, #f6f1eb 0%, #efe7dd 40%, #e8ded2 100%)",
      }}
    >
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1100px] items-center justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 22% 22%, rgba(107,31,31,0.08), transparent 28%), radial-gradient(circle at 78% 18%, rgba(200,155,109,0.12), transparent 26%), radial-gradient(circle at 62% 82%, rgba(107,31,31,0.06), transparent 30%)",
          }}
        />

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="relative z-10 w-full"
            >
              <div className="mx-auto max-w-[760px] text-center mb-7 sm:mb-9">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="inline-flex items-center gap-2.5 mb-5 sm:mb-6"
                >
                  <img
                    src="/logo-sommelyx-mark.png"
                    alt="Sommelyx"
                    draggable={false}
                    className="h-9 sm:h-10 w-auto select-none object-contain drop-shadow-[0_4px_10px_rgba(15,15,20,0.16)]"
                  />
                  <span className="text-[18px] font-semibold tracking-[-0.01em] text-[#2a1f1a] leading-none font-serif">
                    Sommelyx
                  </span>
                </motion.div>

                <div className="mx-auto mb-5 h-px w-20 bg-[linear-gradient(90deg,transparent,rgba(107,31,31,0.28),transparent)]" />

                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.04, ease: EASE }}
                  className="mx-auto max-w-[780px] text-[42px] leading-[1.2] tracking-[-0.02em] text-[#2a1f1a] font-semibold font-serif"
                  style={{
                    fontFamily: "'Playfair Display', 'Fraunces', Georgia, serif",
                    fontOpticalSizing: "auto",
                  }}
                >
                  Como você quer usar o{" "}
                  <span className={designSystem.gradientText}>Sommelyx</span>?
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
                  className="mx-auto mt-4 max-w-[620px] text-[16px] leading-relaxed text-[#6b5e55]"
                >
                  Escolha o modo ideal para sua adega. Você pode alterar depois sem perder seus dados.
                </motion.p>
              </div>

              <div className="mx-auto grid w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-6">
                {OPTIONS.map((option, i) => {
                  const isActive = selectedType === option.type;
                  const isDeep = option.tone === "deep";
                  return (
                    <motion.button
                      key={option.type}
                      type="button"
                      onClick={() => handleSelect(option.type)}
                      disabled={saving}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.16 + i * 0.08, duration: 0.45, ease: EASE }}
                      whileHover={!saving ? { y: -4 } : {}}
                      whileTap={!saving ? { scale: 0.99 } : {}}
                      aria-pressed={isActive}
                      className={cn(
                        "group relative flex h-full w-full cursor-pointer flex-col text-left overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b1f1f]/20",
                        "p-7 sm:p-7 lg:p-7",
                        isActive ? "scale-[1.02]" : "",
                      )}
                      style={{
                        ...CARD_STYLE,
                        border: isActive ? "2px solid #6b1f1f" : "1px solid rgba(120,80,60,0.12)",
                        boxShadow: isActive
                          ? "0 18px 40px rgba(60,40,20,0.12), 0 0 0 3px rgba(107,31,31,0.08), inset 0 1px 0 rgba(255,255,255,0.55)"
                          : CARD_STYLE.boxShadow,
                      }}
                    >
                      <div
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-[3px]"
                        style={{
                          background: isDeep
                            ? "linear-gradient(90deg, transparent, #6b1f1f 50%, transparent)"
                            : "linear-gradient(90deg, transparent, #8b2c2c 50%, transparent)",
                          opacity: isActive ? 1 : 0.56,
                          transition: "opacity 200ms ease",
                        }}
                      />

                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 280, damping: 20 }}
                            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#6b1f1f] shadow-[0_8px_18px_rgba(107,31,31,0.28)]"
                          >
                            {saving ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Check className="h-4 w-4 text-white" strokeWidth={3} />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div
                        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{
                          background: isDeep ? "rgba(107,31,31,0.12)" : "rgba(120,60,40,0.08)",
                          border: isDeep ? "1px solid rgba(107,31,31,0.14)" : "1px solid rgba(120,60,40,0.10)",
                        }}
                      >
                        <option.icon
                          className={cn("h-5 w-5", isDeep ? "text-[#6b1f1f]" : "text-[#8b2c2c]")}
                          strokeWidth={1.8}
                        />
                      </div>

                      <p className={cn("mb-3 text-[10px] font-semibold uppercase tracking-[0.16em]", isDeep ? "text-[#6b1f1f]" : "text-[#8b2c2c]")}>{option.eyebrow}</p>

                      <h3
                        className="mb-3 text-[22px] leading-[1.1] font-semibold text-[#2a1f1a]"
                        style={{ fontFamily: "'Playfair Display', 'Fraunces', Georgia, serif" }}
                      >
                        {option.title}
                      </h3>

                      <p className="max-w-[30rem] text-[15px] leading-relaxed text-[#6b5e55]">
                        {option.desc}
                      </p>

                      <ul className="mt-6 space-y-2.5">
                        {option.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[#4d423b]">
                            <span
                              className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                              style={{
                                background: isDeep ? "rgba(107,31,31,0.10)" : "rgba(139,44,44,0.10)",
                                color: isDeep ? "#6b1f1f" : "#8b2c2c",
                              }}
                            >
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto pt-7">
                        <span
                          className="inline-flex items-center gap-2 px-5 py-3 text-[14px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.03]"
                          style={{
                            ...CTA_STYLE,
                            borderRadius: "12px",
                          }}
                        >
                          {saving && isActive ? "Salvando..." : "Selecionar modo"}
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                className="mt-8 sm:mt-10 text-center"
              >
                <p className="text-[13px] text-[#6b5e55]">
                  Não encontrou o que procura?{" "}
                  <a
                    href="mailto:sommelyx@gmail.com?subject=Fale%20com%20a%20Sommeli%C3%A8re"
                    className="inline-flex items-center gap-1.5 font-semibold text-[#6b1f1f] hover:text-[#5a1e24] transition-colors duration-200 underline-offset-4 hover:underline"
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
              className="mx-auto max-w-md text-center"
            >
              <motion.div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6b1f1f] to-[#8b2c2c] shadow-[0_12px_28px_rgba(107,31,31,0.24)]"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
              </motion.div>

              <h2
                className="mb-3 text-[26px] sm:text-3xl leading-[1.15] font-semibold tracking-[-0.02em] text-[#2a1f1a]"
                style={{ fontFamily: "'Playfair Display', 'Fraunces', Georgia, serif" }}
              >
                Pronto! Sua adega está configurada.
              </h2>
              <p className="mb-8 text-[14px] leading-relaxed text-[#6b5e55]">
                {selectedType === "commercial"
                  ? "Cadastre seus primeiros produtos e comece a controlar seu estoque."
                  : "Adicione seus primeiros vinhos e organize sua coleção."}
              </p>

              <Button
                onClick={handleFinish}
                variant="primary"
                className={cn(
                  "h-12 rounded-[12px] px-10 text-[13px] font-semibold shadow-[0_12px_24px_-16px_rgba(123,30,43,0.3)]",
                  "bg-[linear-gradient(135deg,#7b1e2b_0%,#9f2c3a_100%)] text-white transition-all duration-180 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:brightness-105 active:scale-[0.98]",
                )}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Ir para o Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
