import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ChevronLeft, ArrowRight, Sparkles, ShieldCheck, BarChart3, MailCheck, RefreshCcw } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { analytics } from "@/lib/analytics";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resentLoading, setResentLoading] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signUp, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("resend") === "true") {
      setAwaitingEmailConfirmation(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    analytics.track("signup_started");

    try {
      await signUp(email, password, fullName);
      analytics.track("signup_success");
      setConfirmationEmail(email);
      setAwaitingEmailConfirmation(true);
      setEmailSent(true);
      toast({
        title: "Conta criada!",
        description: "Enviamos um link de confirmação para o seu e-mail.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao criar conta",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = confirmationEmail || email;
    if (!targetEmail || resentLoading) {
      toast({
        title: "Informe seu e-mail",
        description: "Digite seu e-mail de cadastro para reenviar a confirmação.",
        variant: "destructive",
      });
      return;
    }

    setResentLoading(true);
    try {
      await resendConfirmationEmail(targetEmail);
      toast({
        title: "Novo envio realizado",
        description: "Verifique sua caixa de entrada e também o spam.",
      });
    } catch (err: any) {
      toast({
        title: "Não foi possível reenviar",
        description: err.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setResentLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resending || !email) return;
    setResending(true);
    try {
      await resendConfirmationEmail(email);
      toast({
        title: "E-mail reenviado",
        description: "Confira sua caixa de entrada e spam para confirmar a conta.",
      });
    } catch (err: any) {
      toast({
        title: "Não foi possível reenviar",
        description: err.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setResentLoading(false);
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F3F2] text-[#17141D] selection:bg-primary/20 selection:text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#8C2044]/20 via-[#B44A72]/10 to-transparent blur-[100px]" />
        <div className="absolute -right-24 bottom-[-220px] h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-[#DBB58E]/18 via-[#C87595]/10 to-transparent blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(23,20,29,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(23,20,29,0.035) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
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
                Configure sua <span className="font-serif italic text-[#8C2044]">conta</span> e evolua sua adega.
              </h1>
              <p className="mt-6 max-w-[540px] text-[16px] font-medium leading-relaxed text-[#5B5564] sm:text-[18px]">
                Cadastre-se para centralizar acervo, operação e inteligência de compra no padrão editorial Sommelyx.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="mt-10 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Organização</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Base estruturada desde o primeiro dia</p>
            </article>
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#D49D69]/15 text-[#A46230]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Confiabilidade</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Fluxo seguro para iniciar sua operação</p>
            </article>
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#221E2A]/10 text-[#221E2A]">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Escala</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Pronta para crescer com você</p>
            </article>
          </motion.div>
        </section>

        <section className="order-1 flex items-center justify-center py-2 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-[560px] rounded-[28px] border border-white/55 bg-white/60 p-8 shadow-[0_24px_64px_-24px_rgba(15,15,20,0.2),0_2px_8px_rgba(15,15,20,0.06)] ring-1 ring-black/[0.03] backdrop-blur-2xl md:p-10"
          >
            {awaitingEmailConfirmation ? (
              <>
                <div className="mb-8">
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8C2044]/10 text-[#8C2044]">
                    <MailCheck className="h-7 w-7" />
                  </div>
                  <h2 className="text-[34px] font-serif font-bold italic leading-none tracking-tight text-[#17141D]">Confira seu e-mail</h2>
                  <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#655E6E]">
                    Enviamos um link de confirmação para o endereço informado.
                    <br />
                    Abra sua caixa de entrada e clique no link para ativar sua conta.
                    <br />
                    Depois disso, você será direcionado automaticamente para sua área.
                  </p>
                  {(confirmationEmail || email) && (
                    <p className="mt-4 text-[13px] font-semibold text-[#8C2044]">{confirmationEmail || email}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleResend}
                    disabled={resentLoading}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1A24] to-[#0F0F14] text-[13px] font-black uppercase tracking-[0.12em] text-white"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCcw className={`h-4.5 w-4.5 ${resentLoading ? "animate-spin" : ""}`} />
                      {resentLoading ? "Reenviando" : "Reenviar e-mail"}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 w-full rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]"
                    onClick={() => navigate("/login")}
                  >
                    Voltar para login
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-[34px] font-serif font-bold italic leading-none tracking-tight text-[#17141D]">Criar conta grátis</h2>
                  <p className="mt-3 text-[15px] font-medium text-[#655E6E]">Preencha os dados para acessar o ecossistema Sommelyx.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7A7382]">
                      Nome completo
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="João Silva"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-14 rounded-[16px] border-black/10 bg-[#FAF8F7] px-4 text-[15px] font-medium text-[#17141D] placeholder:text-[#A6A0AD] transition-all focus:border-[#8C2044]/40 focus:bg-white focus:ring-4 focus:ring-[#8C2044]/10"
                    />
                  </div>

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
                    <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7A7382]">
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="h-14 rounded-[16px] border-black/10 bg-[#FAF8F7] px-4 pr-12 text-[15px] font-medium text-[#17141D] placeholder:text-[#A6A0AD] transition-all focus:border-[#8C2044]/40 focus:bg-white focus:ring-4 focus:ring-[#8C2044]/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#9CA3AF] transition-colors hover:bg-black/[0.03] hover:text-[#0F0F14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C2044]/20"
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
                        className="h-12 w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1A24] to-[#0F0F14] text-[13px] font-black uppercase tracking-[0.12em] text-white ring-1 ring-black/10 transition-all hover:from-[#202028] hover:to-[#1A1A24] shadow-[0_12px_26px_-14px_rgba(15,15,20,0.55)] hover:shadow-[0_20px_36px_-18px_rgba(15,15,20,0.65)]"
                      >
                        {loading ? (
                          <span className="flex items-center gap-3">
                            Criando
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                            />
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Criar conta grátis
                            <ArrowRight className="h-4.5 w-4.5" />
                          </span>
                        )}
                      </Button>
                    </MagneticButton>
                  </div>
                </form>

                <div className="mt-7 border-t border-black/[0.06] pt-6 text-center">
                  <p className="text-[14px] font-medium text-[#6D6676]">
                    Já possui cadastro?{" "}
                    <Link to="/login" className="font-bold text-[#17141D] transition-colors hover:text-[#8C2044] hover:underline">
                      Entrar
                    </Link>
                  </p>
                </div>
              </>
            )}

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
