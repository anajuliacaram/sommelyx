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
import { BrandName } from "@/components/BrandName";
import { designSystem } from "@/styles/designSystem";

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

  const inputClass = designSystem.inputField;

  return (
    <div className={`${designSystem.authShell} ${designSystem.pageBackground}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-wine/15 via-wine-vivid/8 to-transparent blur-[100px]" />
        <div className="absolute -right-24 bottom-[-220px] h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-gold/12 via-wine/6 to-transparent blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "linear-gradient(rgba(23,20,29,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(23,20,29,0.025) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
      </div>

      <div className={designSystem.authGrid}>
        <section className={`hidden lg:flex order-2 flex-col justify-between lg:order-1 ${designSystem.authPanel}`} style={designSystem.glassCardLight}>
          <div>
            <Link to="/" className={designSystem.authLogoLink}>
              <Logo variant="navbar" className={designSystem.authLogo} />
              <BrandName className={designSystem.authBrand} />
            </Link>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mt-10 md:mt-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-wine/12 bg-wine/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
                <Sparkles className="h-3.5 w-3.5" /> Recuperação segura
              </span>
              <h1 className={`mt-5 max-w-[560px] ${designSystem.authHeadline}`} style={{ fontFamily: designSystem.typography.heading }}>
                Retome o acesso ao seu <span className="font-serif italic text-wine">ecossistema</span> Sommelyx.
              </h1>
              <p className={`mt-6 max-w-[540px] ${designSystem.authBody}`}>
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
              <article key={item.label} className="rounded-[20px] border border-border/40 bg-card/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-wine/[0.06] text-wine">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-[13px] font-semibold text-foreground">{item.desc}</p>
              </article>
            ))}
          </motion.div>
        </section>

        <section className="order-1 flex items-center justify-center py-2 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={designSystem.authFormCard}
            style={designSystem.authCard}
          >
            <div className="mb-6 flex items-center gap-2.5 lg:hidden">
              <Link to="/" className={designSystem.authLogoLink}>
                <Logo variant="navbar" className="h-8 w-auto" />
                <BrandName className="text-[22px]" />
              </Link>
            </div>

            {sent ? (
              <div>
                <div className="mb-7">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-success/[0.08] text-success">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h2 className={designSystem.authHeadline} style={{ fontFamily: designSystem.typography.heading }}>Link enviado</h2>
                  <p className={`mt-4 ${designSystem.authBody}`}>
                    Enviamos o link seguro de recuperação para <span className="font-semibold text-foreground">{email}</span>.
                    <br />
                    Verifique também a pasta de spam, caso necessário.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="h-11 w-full rounded-[10px] text-[13px] font-bold uppercase tracking-[0.10em] shadow-float"
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
                  <h2 className={designSystem.authHeadline} style={{ fontFamily: designSystem.typography.heading }}>Esqueci minha senha</h2>
                  <p className={`mt-3 ${designSystem.authBody}`}>Informe seu e-mail para receber um link seguro de recuperação.</p>
                </div>

                {error && (
                  <div className="mb-5 rounded-[10px] border border-destructive/15 bg-destructive/[0.04] px-4 py-3">
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
                      <Button type="submit" disabled={loading} variant="primary" className="h-11 w-full rounded-[10px] text-[13px] font-bold uppercase tracking-[0.10em] shadow-float">
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
