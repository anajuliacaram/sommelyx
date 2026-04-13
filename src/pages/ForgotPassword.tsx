import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck, Sparkles, KeyRound } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { Logo } from "@/components/Logo";

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

  const inputClass = "h-12 rounded-xl border-border/50 bg-background/60 px-4 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/25 focus:bg-background/90 focus:ring-2 focus:ring-primary/[0.06]";

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground selection:bg-primary/15 selection:text-primary" style={{ background: "linear-gradient(135deg, #0B1F17 0%, #0F2A20 40%, #132F24 100%)" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-wine/15 via-wine-vivid/8 to-transparent blur-[100px]" />
        <div className="absolute -right-24 bottom-[-220px] h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-gold/12 via-wine/6 to-transparent blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "linear-gradient(rgba(23,20,29,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(23,20,29,0.025) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 px-4 py-6 sm:px-8 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-14 lg:py-10">
        <section className="hidden lg:flex order-2 flex-col justify-between rounded-[24px] p-6 sm:p-8 md:p-10 lg:order-1 lg:rounded-[28px] lg:p-12" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 8px 32px -8px rgba(0,0,0,0.25)" }}>
          <div>
            <Link to="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
              <Logo variant="compact" className="h-11 w-auto drop-shadow-[0_4px_12px_rgba(140,32,68,0.10)]" />
              <span className="font-sans text-[24px] font-black tracking-tight text-foreground">Sommelyx</span>
            </Link>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mt-10 md:mt-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-wine/12 bg-wine/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
                <Sparkles className="h-3.5 w-3.5" /> Recuperação segura
              </span>
              <h1 className="mt-5 max-w-[560px] text-[36px] font-black leading-[0.97] tracking-[-0.03em] text-foreground sm:text-[44px] lg:text-[54px]">
                Retome o acesso ao seu <span className="font-serif italic text-wine">ecossistema</span> Sommelyx.
              </h1>
              <p className="mt-6 max-w-[540px] text-[15px] font-medium leading-relaxed text-muted-foreground sm:text-[17px]">
                Enviamos um link protegido para você redefinir sua senha com a mesma segurança premium da plataforma.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: "Proteção", desc: "Fluxo criptografado ponta a ponta" },
              { icon: Mail, label: "Precisão", desc: "Envio instantâneo para seu e-mail" },
              { icon: KeyRound, label: "Controle", desc: "Redefinição rápida e sem atrito" },
            ].map((item) => (
              <article key={item.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
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
            style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.15), 0 12px 40px -20px rgba(0,0,0,0.30)" }}
          >
            {sent ? (
              <div>
                <div className="mb-7">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-success/[0.08] text-success">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h2 className="text-[30px] font-serif font-bold italic leading-none tracking-tight text-foreground">Link enviado</h2>
                  <p className="mt-4 text-[14px] font-medium leading-relaxed text-muted-foreground">
                    Enviamos o link seguro de recuperação para <span className="font-semibold text-foreground">{email}</span>.
                    <br />
                    Verifique também a pasta de spam, caso necessário.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="h-11 w-full rounded-xl text-[13px] font-bold uppercase tracking-[0.10em] shadow-float"
                  onClick={() => setSent(false)}
                >
                  Enviar para outro e-mail
                </Button>

                <div className="mt-6 border-t border-border/40 pt-5 text-center">
                  <Link to="/login" className="inline-flex items-center gap-2 text-[13px] font-bold text-foreground transition-colors hover:text-wine hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Voltar ao login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-[30px] font-serif font-bold italic leading-none tracking-tight text-foreground">Esqueci minha senha</h2>
                  <p className="mt-3 text-[14px] font-medium text-muted-foreground">Informe seu e-mail para receber um link seguro de recuperação.</p>
                </div>

                {error && (
                  <div className="mb-5 rounded-xl border border-destructive/15 bg-destructive/[0.04] px-4 py-3">
                    <p className="text-[13px] font-semibold text-destructive">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      E-mail
                    </Label>
                    <Input id="email" type="email" placeholder="nome@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
                  </div>

                  <div className="pt-1">
                    <MagneticButton disabled={loading}>
                      <Button type="submit" disabled={loading} variant="primary" className="h-11 w-full rounded-xl text-[13px] font-bold uppercase tracking-[0.10em] shadow-float">
                        {loading ? (
                          <span className="flex items-center gap-3">
                            Enviando
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Enviar link de recuperação
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        )}
                      </Button>
                    </MagneticButton>
                  </div>
                </form>

                <div className="mt-6 border-t border-border/40 pt-5 text-center">
                  <Link to="/login" className="inline-flex items-center gap-2 text-[13px] font-bold text-foreground transition-colors hover:text-wine hover:underline">
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
