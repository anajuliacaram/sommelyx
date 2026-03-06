import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, ChevronLeft, ArrowRight, Sparkles, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { analytics } from "@/lib/analytics";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const emailConfirmed = searchParams.get("confirmed") === "true";
  const autoSessionFallback = searchParams.get("auto_session") === "false";
  const { signIn, user, profileType, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (emailConfirmed) {
      toast({
        title: "Email confirmado!",
        description: autoSessionFallback
          ? "Sua conta foi confirmada, mas este provedor exige login manual para continuar."
          : "Seu email foi verificado com sucesso. Faça login para continuar.",
      });
    }
  }, [emailConfirmed, autoSessionFallback, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (!profileType) {
        navigate("/select-profile", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, profileType, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await signIn(email, password);
      analytics.track("login_success");
    } catch (err: any) {
      const msg =
        err.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : err.message === "Email not confirmed"
            ? "Confirme seu email antes de fazer login."
            : err.message || "Erro desconhecido.";
      toast({ title: "Erro ao entrar", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F3F2] text-[#17141D] selection:bg-primary/20 selection:text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#8C2044]/20 via-[#B44A72]/10 to-transparent blur-[100px]" />
        <div className="absolute -right-24 bottom-[-220px] h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-[#DBB58E]/18 via-[#C87595]/10 to-transparent blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.3]" style={{ backgroundImage: "linear-gradient(rgba(23,20,29,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(23,20,29,0.035) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 px-4 py-6 sm:px-8 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-14 lg:py-10">
        <section className="order-2 flex flex-col justify-between rounded-[28px] border border-black/[0.06] bg-white/70 p-6 shadow-[0_16px_40px_rgba(44,20,31,0.06)] backdrop-blur-xl sm:p-8 md:p-10 lg:order-1 lg:rounded-[36px] lg:p-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
              <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-11 w-11 rounded-xl object-contain shadow-[0_8px_20px_rgba(140,32,68,0.14)]" />
              <span className="font-sans text-[24px] font-black tracking-tight text-[#17141D]">Sommelyx</span>
            </Link>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mt-10 md:mt-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8C2044]/15 bg-[#8C2044]/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#8C2044]">
                <Sparkles className="h-3.5 w-3.5" /> Plataforma premium
              </span>
              <h1 className="mt-5 max-w-[560px] text-[38px] font-black leading-[0.97] tracking-[-0.04em] text-[#17141D] sm:text-[46px] lg:text-[58px]">
                A inteligência da sua <span className="font-serif italic text-[#8C2044]">adega</span> começa aqui.
              </h1>
              <p className="mt-6 max-w-[540px] text-[16px] font-medium leading-relaxed text-[#5B5564] sm:text-[18px]">
                Um ambiente preciso para gestão de acervo, operação comercial e decisões estratégicas com o padrão Sommelyx.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="mt-10 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Inteligência</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Visão de estoque em tempo real</p>
            </article>
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#D49D69]/15 text-[#A46230]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Confiável</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Dados protegidos e operação estável</p>
            </article>
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Editorial</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Experiência elegante de ponta a ponta</p>
            </article>
          </motion.div>
        </section>

        <section className="order-1 flex items-center justify-center py-2 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/60 backdrop-blur-2xl p-8 md:p-10 rounded-[28px] shadow-[0_24px_64px_-24px_rgba(15,15,20,0.2),0_2px_8px_rgba(15,15,20,0.06)] border border-white/55 ring-1 ring-black/[0.03]"
          >
            <div className="mb-8">
              <h2 className="text-[34px] font-serif font-bold italic leading-none tracking-tight text-[#17141D]">Acesse sua conta</h2>
              <p className="mt-3 text-[15px] font-medium text-[#655E6E]">Use suas credenciais para continuar no dashboard Sommelyx.</p>
            </div>

            {emailConfirmed && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-[13px] font-semibold text-emerald-800">
                  {autoSessionFallback
                    ? "Conta confirmada! Faça login para concluir seu acesso."
                    : "Conta verificada com sucesso!"}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7A7382]">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 rounded-[16px] border-black/10 bg-[#FAF8F7] px-4 text-[15px] font-medium text-[#17141D] placeholder:text-[#A6A0AD] transition-all focus:border-[#8C2044]/40 focus:bg-white focus:ring-4 focus:ring-[#8C2044]/10"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7A7382]">
                    Senha
                  </Label>
                  <Link to="/forgot-password" className="text-[12px] font-semibold text-[#8C2044] transition-colors hover:text-[#17141D] hover:underline">
                    Recuperar acesso
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 rounded-[16px] border-black/10 bg-[#FAF8F7] px-4 pr-12 text-[15px] font-medium text-[#17141D] placeholder:text-[#A6A0AD] transition-all focus:border-[#8C2044]/40 focus:bg-white focus:ring-4 focus:ring-[#8C2044]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#0F0F14] transition-colors p-1.5 rounded-lg hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C2044]/20"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <MagneticButton disabled={loading}>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-2xl text-[13px] font-black uppercase tracking-[0.12em] transition-all bg-gradient-to-b from-[#1A1A24] to-[#0F0F14] hover:from-[#202028] hover:to-[#1A1A24] text-white shadow-[0_12px_26px_-14px_rgba(15,15,20,0.55)] hover:shadow-[0_20px_36px_-18px_rgba(15,15,20,0.65)] border border-white/10 ring-1 ring-black/10"
                  >
                    {loading ? (
                      <span className="flex items-center gap-3">
                        Processando
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Entrar
                        <ArrowRight className="h-4.5 w-4.5" />
                      </span>
                    )}
                  </Button>
                </MagneticButton>
              </div>
            </form>

            <div className="mt-7 border-t border-black/[0.06] pt-6 text-center">
              <p className="text-[14px] font-medium text-[#6D6676]">
                Ainda não tem acesso?{" "}
                <Link to="/signup" className="font-bold text-[#17141D] transition-colors hover:text-[#8C2044] hover:underline">
                  Crie sua conta
                </Link>
              </p>
            </div>

            <div className="mt-8 flex justify-center sm:justify-start">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-[#938C9C] transition-colors hover:text-[#17141D]"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Retornar
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
