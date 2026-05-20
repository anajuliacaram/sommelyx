import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, ChevronLeft, ArrowRight } from "@/icons/lucide";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";
import { Logo } from "@/components/Logo";
import { BrandName } from "@/components/BrandName";

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
    <div className="auth-page flex min-h-[100dvh] items-center justify-center bg-[var(--sx-bg-page)] px-5 py-6 text-[var(--sx-t-body)]">
      <section className="auth-stage flex w-full items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="auth-card w-full max-w-[400px] rounded-[var(--sx-r-xl)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-card)] px-8 pb-8 pt-9 shadow-[var(--sx-shadow-lg)]"
          >
            <div className="mb-7 flex items-center gap-3">
              <Link to="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-85">
                <Logo variant="navbar" className="h-8 w-auto" />
                <BrandName className="text-[20px] font-medium text-[var(--sx-bordeaux)]" />
              </Link>
            </div>

            <div className="mb-7">
              <h2 className="text-[26px] font-medium leading-tight tracking-[-0.018em] text-[var(--sx-t-head)]">Acesse sua conta</h2>
              <p className="mt-1.5 text-[14px] leading-5 text-[var(--sx-t-sub)]">Entre para continuar.</p>
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
                <Label htmlFor="email" className="block text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--sx-t-muted)]">
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
                  className="h-auto w-full rounded-[var(--sx-r-sm)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-input)] px-3.5 py-[13px] text-[15px] text-[var(--sx-t-body)] shadow-none outline-none transition-colors placeholder:text-[var(--sx-t-muted)] focus:border-[var(--sx-b-focus)] focus-visible:ring-2 focus-visible:ring-[var(--sx-bordeaux-10)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password" className="block text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--sx-t-muted)]">
                    Senha
                  </Label>
                  <Link to="/forgot-password" className="text-[13px] font-medium text-[var(--sx-bordeaux)] transition-colors hover:text-[var(--sx-t-head)] hover:underline">
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
                    className="h-auto w-full rounded-[var(--sx-r-sm)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-input)] px-3.5 py-[13px] pr-12 text-[15px] text-[var(--sx-t-body)] shadow-none outline-none transition-colors placeholder:text-[var(--sx-t-muted)] focus:border-[var(--sx-b-focus)] focus-visible:ring-2 focus-visible:ring-[var(--sx-bordeaux-10)]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg text-[var(--sx-t-sub)] hover:bg-[rgba(58,42,30,0.06)] hover:text-[var(--sx-t-head)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="inline-flex w-auto items-center gap-2 rounded-[var(--sx-r-pill)] border-0 bg-[var(--sx-bordeaux)] px-7 py-[13px] text-[15px] font-medium uppercase tracking-[0.04em] text-[var(--sx-t-white)] shadow-none transition-opacity hover:opacity-90"
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
              </div>
            </form>

            <div className="my-5 flex items-center gap-3 text-[12px] uppercase tracking-[0.08em] text-[var(--sx-t-muted)]">
              <div className="h-px flex-1 bg-[var(--sx-b-default)]" />
              <span>ou</span>
              <div className="h-px flex-1 bg-[var(--sx-b-default)]" />
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
            className="flex w-full items-center justify-center gap-2.5 rounded-[var(--sx-r-pill)] border border-[var(--sx-b-medium)] bg-[var(--sx-bg-card)] px-5 py-[13px] text-[14px] font-medium text-[var(--sx-t-body)] shadow-none transition-colors hover:bg-[var(--sx-bg-input)]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Entrar com Google
            </Button>

            <div className="mt-4 border-t border-[var(--sx-b-default)] pt-4 text-center">
              <p className="text-[13px] font-medium text-[var(--sx-t-sub)]">
                Ainda não tem acesso?{" "}
                <Link to="/signup" className="font-medium text-[var(--sx-bordeaux)] transition-colors hover:text-[var(--sx-t-head)] hover:underline">
                  Crie sua conta
                </Link>
              </p>
            </div>

            <div className="mt-6 flex justify-center sm:justify-start">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--sx-t-muted)] transition-colors hover:text-[var(--sx-t-body)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Retornar
              </Link>
            </div>
          </motion.div>
        </section>
    </div>
  );
}
