import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, ChevronLeft, ArrowRight, Sparkles, ShieldCheck, BarChart3 } from "@/icons/lucide";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { analytics } from "@/lib/analytics";
import { Logo } from "@/components/Logo";
import { BrandName } from "@/components/BrandName";
import { designSystem } from "@/styles/designSystem";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Erro desconhecido.");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const emailConfirmed = searchParams.get("confirmed") === "true";
  const autoSessionFallback = searchParams.get("auto_session") === "false";
  const { signIn, user, profileType, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const inputClass = designSystem.inputField;

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

    if (lockUntil && Date.now() < lockUntil) {
      const secsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
      toast({ title: "Muitas tentativas", description: `Aguarde ${secsLeft}s antes de tentar novamente.`, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      setFailedAttempts(0);
      setLockUntil(null);
      analytics.track("login_success");
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        const lockDuration = newAttempts >= 15 ? 120_000 : newAttempts >= 10 ? 60_000 : 30_000;
        setLockUntil(Date.now() + lockDuration);
      }

      const msg =
        getErrorMessage(err) === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : getErrorMessage(err) === "Email not confirmed"
            ? "Confirme seu email antes de fazer login."
            : getErrorMessage(err);
      toast({ title: "Não conseguimos entrar", description: msg || "Verifique seu e-mail e senha e tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${designSystem.authShell} ${designSystem.pageBackground}`}>
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-160px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-wine/15 via-wine-vivid/8 to-transparent blur-[100px]" />
        <div className="absolute -right-24 bottom-[-220px] h-[520px] w-[520px] rounded-full bg-gradient-to-tl from-gold/12 via-wine/6 to-transparent blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "linear-gradient(rgba(23,20,29,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(23,20,29,0.025) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
      </div>

      <div className={designSystem.authGrid}>
        {/* Left panel */}
        <section className={`hidden lg:flex order-2 flex-col justify-between lg:order-1 ${designSystem.authPanel}`} style={designSystem.authCard}>
          <div>
            <Link to="/" className={designSystem.authLogoLink}>
              <Logo variant="navbar" className={designSystem.authLogo} />
              <BrandName className={designSystem.authBrand} />
            </Link>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="mt-8 md:mt-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-wine/12 bg-wine/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wine">
                <Sparkles className="h-3.5 w-3.5" /> Plataforma premium
              </span>
              <h1 className={`mt-5 max-w-[560px] ${designSystem.authHeadline}`} style={{ fontFamily: designSystem.typography.heading }}>
                A inteligência da sua <span className="font-serif italic text-wine">adega</span> começa aqui.
              </h1>
              <p className={`mt-6 max-w-[420px] ${designSystem.authBody}`}>
                Entre para organizar estoque, valor e giro com a precisão Sommelyx.
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: BarChart3, label: "Inteligência", desc: "Visão de estoque em tempo real", bg: "bg-wine/[0.06]", color: "text-wine" },
              { icon: ShieldCheck, label: "Confiável", desc: "Dados protegidos e operação estável", bg: "bg-gold/10", color: "text-gold" },
              { icon: Sparkles, label: "Editorial", desc: "Experiência elegante de ponta a ponta", bg: "bg-wine/[0.06]", color: "text-wine" },
            ].map((item) => (
              <article key={item.label} className="rounded-[20px] p-4" style={designSystem.glassCard}>
                <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${item.bg} ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-[13px] font-semibold text-foreground">{item.desc}</p>
              </article>
            ))}
          </motion.div>
        </section>

        {/* Right panel — Form */}
        <section className="order-1 flex items-center justify-center py-0 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
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

            <div className="mb-7">
              <h2 className={designSystem.authHeadline} style={{ fontFamily: designSystem.typography.heading }}>Acesse sua conta</h2>
              <p className={`mt-3 ${designSystem.authBody}`}>Entre para continuar sua gestão de adega.</p>
            </div>

            {emailConfirmed && (
              <div className="mb-6 flex items-center gap-3 rounded-[10px] border border-success/20 bg-success/[0.04] px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-[13px] font-semibold text-success">
                  {autoSessionFallback
                    ? "Conta confirmada! Faça login para concluir seu acesso."
                    : "Conta verificada com sucesso!"}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Senha
                  </Label>
                  <Link to="/forgot-password" className="text-[12px] font-semibold text-wine transition-colors hover:text-foreground hover:underline">
                    Recuperar acesso
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${inputClass} pr-12`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="pt-1">
                <MagneticButton disabled={loading}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className={`w-full ${designSystem.primaryButton} uppercase tracking-[0.10em]`}
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
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </MagneticButton>
              </div>
            </form>

            <div className="relative mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">ou</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) {
                  toast({ title: "Erro ao entrar com Google", description: String(error), variant: "destructive" });
                }
              }}
            className={`mt-4 flex h-11 w-full items-center justify-center gap-3 ${designSystem.secondaryButton}`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Entrar com Google
            </Button>

            <div className="mt-5 border-t border-border/40 pt-5 text-center">
              <p className="text-[13px] font-medium text-muted-foreground">
                Ainda não tem acesso?{" "}
                <Link to="/signup" className="font-bold text-foreground transition-colors hover:text-wine hover:underline">
                  Crie sua conta
                </Link>
              </p>
            </div>

            <div className="mt-6 flex justify-center sm:justify-start">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 transition-colors hover:text-foreground"
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
