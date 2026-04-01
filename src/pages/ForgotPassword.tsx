import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck, Sparkles, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const appUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "") || window.location.origin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (error) throw error;
      analytics.track("forgot_password_request_sent");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar e-mail de recuperação.");
    } finally {
      setLoading(false);
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
        <section className="hidden lg:flex order-2 flex-col justify-between rounded-[28px] border border-black/[0.06] bg-white/70 p-6 shadow-[0_16px_40px_rgba(44,20,31,0.06)] backdrop-blur-xl sm:p-8 md:p-10 lg:order-1 lg:rounded-[36px] lg:p-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
              <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-11 w-11 rounded-xl object-contain shadow-[0_8px_20px_rgba(140,32,68,0.14)]" />
              <span className="font-sans text-[24px] font-black tracking-tight text-[#17141D]">Sommelyx</span>
            </Link>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mt-10 md:mt-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8C2044]/15 bg-[#8C2044]/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#8C2044]">
                <Sparkles className="h-3.5 w-3.5" /> Recuperação segura
              </span>
              <h1 className="mt-5 max-w-[560px] text-[38px] font-black leading-[0.97] tracking-[-0.04em] text-[#17141D] sm:text-[46px] lg:text-[58px]">
                Retome o acesso ao seu <span className="font-serif italic text-[#8C2044]">ecossistema</span> Sommelyx.
              </h1>
              <p className="mt-6 max-w-[540px] text-[16px] font-medium leading-relaxed text-[#5B5564] sm:text-[18px]">
                Enviamos um link protegido para você redefinir sua senha com a mesma segurança premium da plataforma.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="mt-10 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Proteção</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Fluxo criptografado ponta a ponta</p>
            </article>
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <Mail className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Precisão</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Envio instantâneo para seu e-mail</p>
            </article>
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <KeyRound className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Controle</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Redefinição rápida e sem atrito</p>
            </article>
          </motion.div>
        </section>

        <section className="order-1 flex items-center justify-center py-2 lg:order-2 lg:py-0">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-[560px] rounded-[28px] border border-white/55 bg-white/60 p-8 shadow-[0_24px_64px_-24px_rgba(15,15,20,0.2),0_2px_8px_rgba(15,15,20,0.06)] ring-1 ring-black/[0.03] backdrop-blur-2xl md:p-10"
          >
            {sent ? (
              <div>
                <div className="mb-8">
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h2 className="text-[34px] font-serif font-bold italic leading-none tracking-tight text-[#17141D]">Link enviado</h2>
                  <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#655E6E]">
                    Enviamos o link seguro de recuperação para <span className="font-semibold text-[#17141D]">{email}</span>.
                    <br />
                    Verifique também a pasta de spam, caso necessário.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="h-12 w-full rounded-2xl text-[13px] font-black uppercase tracking-[0.12em] shadow-float"
                  onClick={() => setSent(false)}
                >
                  Enviar para outro e-mail
                </Button>

                <div className="mt-7 border-t border-black/[0.06] pt-6 text-center">
                  <Link to="/login" className="inline-flex items-center gap-2 text-[13px] font-bold text-[#17141D] transition-colors hover:text-[#8C2044] hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Voltar ao login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-[34px] font-serif font-bold italic leading-none tracking-tight text-[#17141D]">Esqueci minha senha</h2>
                  <p className="mt-3 text-[15px] font-medium text-[#655E6E]">Informe seu e-mail para receber um link seguro de recuperação.</p>
                </div>

                {error && (
                  <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-[13px] font-semibold text-rose-700">{error}</p>
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

                  <div className="pt-2">
                    <MagneticButton disabled={loading}>
                      <Button
                        type="submit"
                        disabled={loading}
                        variant="primary"
                        className="h-12 w-full rounded-2xl text-[13px] font-black uppercase tracking-[0.12em] shadow-float"
                      >
                        {loading ? (
                          <span className="flex items-center gap-3">
                            Enviando
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                            />
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Enviar link de recuperação
                            <ArrowRight className="h-4.5 w-4.5" />
                          </span>
                        )}
                      </Button>
                    </MagneticButton>
                  </div>
                </form>

                <div className="mt-7 border-t border-black/[0.06] pt-6 text-center">
                  <Link to="/login" className="inline-flex items-center gap-2 text-[13px] font-bold text-[#17141D] transition-colors hover:text-[#8C2044] hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Voltar ao login
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
