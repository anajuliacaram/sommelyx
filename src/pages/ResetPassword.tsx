import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-exchanges the token from the URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Also check if user session is already set (redirect from email)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
      });
    }
  }, []);

  const isValid = password.length >= 8 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      analytics.track("reset_password_success");
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir senha.");
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
        <section className="order-2 flex flex-col justify-between rounded-[28px] border border-black/[0.06] bg-white/70 p-6 shadow-[0_16px_40px_rgba(44,20,31,0.06)] backdrop-blur-xl sm:p-8 md:p-10 lg:order-1 lg:rounded-[36px] lg:p-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
              <img
                src="/logo-sommelyx.png"
                alt="Sommelyx"
                className="h-11 w-11 rounded-xl object-contain shadow-[0_8px_20px_rgba(140,32,68,0.14)]"
              />
              <span className="font-sans text-[24px] font-black tracking-tight text-[#17141D]">Sommelyx</span>
            </Link>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mt-10 md:mt-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#8C2044]/15 bg-[#8C2044]/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#8C2044]">
                <Sparkles className="h-3.5 w-3.5" /> Redefinição protegida
              </span>
              <h1 className="mt-5 max-w-[560px] text-[38px] font-black leading-[0.97] tracking-[-0.04em] text-[#17141D] sm:text-[46px] lg:text-[58px]">
                Uma nova senha, com o mesmo <span className="font-serif italic text-[#8C2044]">padrão premium</span>.
              </h1>
              <p className="mt-6 max-w-[540px] text-[16px] font-medium leading-relaxed text-[#5B5564] sm:text-[18px]">
                Defina uma senha forte para proteger sua conta. Nós cuidamos do resto: criptografia, sessão segura e acesso sem atrito.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="mt-10 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Segurança</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Link de recuperação protegido</p>
            </article>
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <KeyRound className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Controle</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Regras claras de senha</p>
            </article>
            <article className="rounded-2xl border border-black/[0.06] bg-[#FCFAF9] p-4 shadow-sm">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#8C2044]/10 text-[#8C2044]">
                <Lock className="h-4 w-4" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#887F8E]">Privacidade</p>
              <p className="mt-1 text-[14px] font-semibold text-[#221E2A]">Sessão segura no dispositivo</p>
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
            {success ? (
              <div className="text-center">
                <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="text-[34px] font-serif font-bold italic leading-none tracking-tight text-[#17141D]">Senha redefinida</h2>
                <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#655E6E]">
                  Tudo certo por aqui. Vamos te levar ao dashboard em instantes.
                </p>
              </div>
            ) : !ready ? (
              <div>
                <h2 className="text-[34px] font-serif font-bold italic leading-none tracking-tight text-[#17141D]">Link inválido</h2>
                <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#655E6E]">
                  Este link de recuperação expirou ou não é válido. Solicite um novo link e tente novamente.
                </p>

                <div className="mt-8 grid gap-3">
                  <MagneticButton>
                    <Button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1A24] to-[#0F0F14] text-[13px] font-black uppercase tracking-[0.12em] text-white ring-1 ring-black/10 transition-all shadow-[0_12px_26px_-14px_rgba(15,15,20,0.55)] hover:shadow-[0_20px_36px_-18px_rgba(15,15,20,0.65)]"
                    >
                      Solicitar novo link <ArrowRight className="ml-2 h-4.5 w-4.5" />
                    </Button>
                  </MagneticButton>
                  <Button type="button" variant="ghost" className="h-12 rounded-2xl text-[13px] font-bold" onClick={() => navigate("/login")}>
                    Voltar ao login
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8C2044]/10 text-[#8C2044]">
                    <KeyRound className="h-7 w-7" />
                  </div>
                  <h2 className="text-[34px] font-serif font-bold italic leading-none tracking-tight text-[#17141D]">Redefinir senha</h2>
                  <p className="mt-4 text-[15px] font-medium leading-relaxed text-[#655E6E]">
                    Crie uma nova senha para sua conta. Recomendamos no mínimo 8 caracteres.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 rounded-2xl border border-rose-500/15 bg-rose-500/10 p-4">
                    <p className="text-[13px] font-semibold text-rose-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7A7382]">
                      Nova senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
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
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-[12px] font-semibold text-amber-700">Mínimo 8 caracteres.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7A7382]">
                      Confirmar senha
                    </Label>
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repita a senha"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      className="h-14 rounded-[16px] border-black/10 bg-[#FAF8F7] px-4 text-[15px] font-medium text-[#17141D] placeholder:text-[#A6A0AD] transition-all focus:border-[#8C2044]/40 focus:bg-white focus:ring-4 focus:ring-[#8C2044]/10"
                    />
                    {confirm.length > 0 && password !== confirm && (
                      <p className="text-[12px] font-semibold text-rose-700">As senhas não coincidem.</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <MagneticButton disabled={loading || !isValid}>
                      <Button
                        type="submit"
                        disabled={loading || !isValid}
                        className="h-12 w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#1A1A24] to-[#0F0F14] text-[13px] font-black uppercase tracking-[0.12em] text-white ring-1 ring-black/10 transition-all shadow-[0_12px_26px_-14px_rgba(15,15,20,0.55)] hover:shadow-[0_20px_36px_-18px_rgba(15,15,20,0.65)]"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-3">
                            Redefinindo
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                            />
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Redefinir senha
                            <ArrowRight className="h-4.5 w-4.5" />
                          </span>
                        )}
                      </Button>
                    </MagneticButton>
                    <p className="mt-3 text-[12px] font-medium text-[#887F8E]">
                      Ao redefinir, você encerrará sessões antigas e manterá sua conta protegida.
                    </p>
                  </div>
                </form>

                <div className="mt-8 flex justify-center sm:justify-start">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-[#938C9C] transition-colors hover:text-[#17141D]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Voltar ao login
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
