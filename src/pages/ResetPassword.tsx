import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Sparkles } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { Logo } from "@/components/Logo";
import { BrandName } from "@/components/BrandName";

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
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
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

  const inputClass = "h-12 rounded-xl border-border/50 bg-background/60 px-4 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/25 focus:bg-background/90 focus:ring-2 focus:ring-primary/[0.06]";

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground selection:bg-primary/15 selection:text-primary" style={{ background: "transparent" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-wine/15 via-wine-vivid/8 to-transparent blur-[100px]" />
        <div className="absolute -right-24 bottom-[-220px] h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-gold/12 via-wine/6 to-transparent blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "linear-gradient(rgba(23,20,29,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(23,20,29,0.025) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 px-4 py-6 sm:px-8 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-14 lg:py-10">
        <section className="hidden lg:flex order-2 flex-col justify-between rounded-[24px] p-6 sm:p-8 md:p-10 lg:order-1 lg:rounded-[28px] lg:p-12" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 10px 24px -12px rgba(0,0,0,0.12)" }}>
          <div>
            <Link to="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
              <Logo variant="compact" className="h-11 w-auto drop-shadow-[0_4px_12px_rgba(140,32,68,0.10)]" />
              <BrandName className="text-[24px]" />
            </Link>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mt-10 md:mt-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-wine/12 bg-wine/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
                <Sparkles className="h-3.5 w-3.5" /> Redefinição protegida
              </span>
              <h1 className="mt-5 max-w-[560px] text-[36px] font-black leading-[0.97] tracking-[-0.03em] text-foreground sm:text-[44px] lg:text-[54px]">
                Uma nova senha, com o mesmo <span className="font-serif italic text-wine">padrão premium</span>.
              </h1>
              <p className="mt-6 max-w-[540px] text-[15px] font-medium leading-relaxed text-muted-foreground sm:text-[17px]">
                Defina uma senha forte para proteger sua conta. Nós cuidamos do resto.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: "Segurança", desc: "Link de recuperação protegido" },
              { icon: KeyRound, label: "Controle", desc: "Regras claras de senha" },
              { icon: Lock, label: "Privacidade", desc: "Sessão segura no dispositivo" },
            ].map((item) => (
              <article key={item.label} className="rounded-xl border border-border/40 bg-card/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-wine/[0.06] text-wine">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-[13px] font-semibold text-foreground">{item.desc}</p>
              </article>
            ))}
          </motion.div>
        </section>

        <section className="order-1 flex items-center justify-center py-2 lg:order-2 lg:py-0">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-[520px] rounded-[24px] p-7 md:p-9"
            style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 10px 24px -12px rgba(15,15,20,0.12)" }}
          >
            {success ? (
              <div className="text-center">
                <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-success/[0.08] text-success">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="text-[30px] font-serif font-bold italic leading-none tracking-tight text-foreground">Senha redefinida</h2>
                <p className="mt-4 text-[14px] font-medium leading-relaxed text-muted-foreground">
                  Tudo certo. Vamos te levar ao dashboard em instantes.
                </p>
              </div>
            ) : !ready ? (
              <div>
                <h2 className="text-[30px] font-serif font-bold italic leading-none tracking-tight text-foreground">Link inválido</h2>
                <p className="mt-4 text-[14px] font-medium leading-relaxed text-muted-foreground">
                  Este link de recuperação expirou ou não é válido. Solicite um novo link e tente novamente.
                </p>

                <div className="mt-7 grid gap-3">
                  <MagneticButton>
                    <Button type="button" onClick={() => navigate("/forgot-password")} variant="primary" className="h-11 w-full rounded-xl text-[13px] font-bold uppercase tracking-[0.10em] shadow-float">
                      Solicitar novo link <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </MagneticButton>
                  <Button type="button" variant="ghost" className="h-11 rounded-xl text-[13px] font-bold" onClick={() => navigate("/login")}>
                    Voltar ao login
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-wine/[0.06] text-wine">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <h2 className="text-[30px] font-serif font-bold italic leading-none tracking-tight text-foreground">Redefinir senha</h2>
                  <p className="mt-4 text-[14px] font-medium leading-relaxed text-muted-foreground">
                    Crie uma nova senha para sua conta. Recomendamos no mínimo 8 caracteres.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 rounded-xl border border-destructive/15 bg-destructive/[0.04] p-4">
                    <p className="text-[13px] font-semibold text-destructive">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Nova senha
                    </Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={`${inputClass} pr-12`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar" : "Mostrar"} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-[12px] font-semibold text-warning">Mínimo 8 caracteres.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Confirmar senha
                    </Label>
                    <Input id="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repita a senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputClass} />
                    {confirm.length > 0 && password !== confirm && (
                      <p className="text-[12px] font-semibold text-destructive">As senhas não coincidem.</p>
                    )}
                  </div>

                  <div className="pt-1">
                    <MagneticButton disabled={loading || !isValid}>
                      <Button type="submit" disabled={loading || !isValid} variant="primary" className="h-11 w-full rounded-xl text-[13px] font-bold uppercase tracking-[0.10em] shadow-float">
                        {loading ? (
                          <span className="flex items-center justify-center gap-3">
                            Redefinindo
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Redefinir senha
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        )}
                      </Button>
                    </MagneticButton>
                    <p className="mt-3 text-[11px] font-medium text-muted-foreground/60">
                      Ao redefinir, sessões antigas serão encerradas automaticamente.
                    </p>
                  </div>
                </form>

                <div className="mt-7 flex justify-center sm:justify-start">
                  <Link to="/login" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 transition-colors hover:text-foreground">
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
