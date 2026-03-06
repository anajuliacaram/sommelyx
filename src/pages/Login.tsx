import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, ChevronLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MagneticButton } from "@/components/ui/magnetic-button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const emailConfirmed = searchParams.get("confirmed") === "true";
  const { signIn, user, profileType, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (emailConfirmed) {
      toast({
        title: "Email confirmado!",
        description: "Seu email foi verificado com sucesso. Faça login para continuar.",
      });
    }
  }, [emailConfirmed, toast]);

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
    } catch (err: any) {
      const msg = err.message === "Invalid login credentials"
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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAFA] text-[#0F0F14] premium-noise selection:bg-primary/20 selection:text-primary">

      {/* ─── LEFT: BRANDING & VALUE ─── */}
      <div className="hidden md:flex flex-col flex-1 relative p-12 lg:p-20 overflow-hidden bg-white justify-between border-r border-black/[0.04]">
        {/* Abstract elegant background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#8F2D56]/10 to-transparent blur-[120px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-gradient-to-tr from-[#C44569]/5 to-transparent blur-[120px]" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group transition-opacity hover:opacity-80">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-[42px] w-auto object-contain" />
            <span className="text-[22px] font-black tracking-tight font-sans text-[#0F0F14]" style={{ letterSpacing: "-0.04em" }}>
              Sommelyx
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md my-auto pt-24 pb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl lg:text-5xl font-serif font-bold italic tracking-tight leading-[1.1] mb-6 text-[#0F0F14]"
          >
            A inteligência da sua <br />
            <span className="text-gradient-wine">adega começa aqui.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[16px] lg:text-[18px] text-muted-foreground font-medium leading-[1.6]"
          >
            Controle técnico, operação comercial e visão estratégica em um só lugar. Eleve a gestão do seu acervo a um padrão editorial premium.
          </motion.p>
        </div>

        {/* Decorative elements */}
        <div className="relative z-10 flex items-center justify-between mt-auto pt-10 border-t border-black/5">
          <div className="flex gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-black/[0.03] backdrop-blur-md border border-black/[0.04]">
              <span className="text-[10px] font-black italic text-muted-foreground uppercase opacity-80">Tech</span>
            </div>
            <div className="h-10 px-4 flex items-center justify-center rounded-2xl bg-black/[0.03] backdrop-blur-md border border-black/[0.04]">
              <span className="text-[10px] font-black italic text-muted-foreground uppercase opacity-80">Design Premium</span>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest hidden lg:block">Sistema Exclusivo</p>
        </div>
      </div>

      {/* ─── RIGHT: LOGIN FORM ─── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative">
        <div className="w-full max-w-[440px] relative z-10">

          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex flex-col items-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-[36px] w-auto object-contain" />
              <span className="text-[20px] font-black tracking-tight font-sans text-[#0F0F14]">Sommelyx</span>
            </Link>
            <h1 className="text-3xl font-serif font-bold italic tracking-tight mb-2 text-center text-[#0F0F14]">Bem-vindo de volta</h1>
            <p className="text-[14px] text-muted-foreground text-center">Acesse o seu dashboard estratégico.</p>
          </div>

          {/* Desktop Heading */}
          <div className="hidden md:block mb-10">
            <h2 className="text-3xl font-serif font-bold italic tracking-tight mb-2 text-[#0F0F14]">Acesse sua conta</h2>
            <p className="text-[14px] text-muted-foreground font-medium">Insira suas credenciais corporativas ou pessoais.</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="bg-white p-8 md:p-10 rounded-[28px] shadow-[0_4px_40px_rgba(0,0,0,0.04)] border border-black/[0.05]"
          >
            {emailConfirmed && (
              <div className="mb-8 p-4 rounded-2xl bg-green-50/50 border border-green-200 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-[13px] font-bold text-green-700">Conta verificada com sucesso!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  E-mail
                </Label>
                <Input
                  id="email" type="email" placeholder="nome@exemplo.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="h-12 rounded-[16px] bg-slate-50/50 border-black/10 focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all text-[14px] font-medium px-4"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center px-1">
                  <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Senha
                  </Label>
                  <Link to="/forgot-password" title="Recuperar Acesso" className="text-[11px] font-semibold text-primary hover:text-[#8C2044] hover:underline transition-colors">
                    Recuperou sua senha?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="h-12 rounded-[16px] bg-slate-50/50 border-black/10 focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all text-[14px] font-medium px-4 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <MagneticButton disabled={loading}>
                  <Button
                    type="submit" disabled={loading}
                    className="w-full h-14 rounded-[18px] text-[13px] font-bold uppercase tracking-[0.15em] transition-all bg-[#0F0F14] hover:bg-[#202028] text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">Processando <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /></span>
                    ) : (
                      <span className="flex items-center gap-2">Entrar <ArrowRight className="h-4 w-4" /></span>
                    )}
                  </Button>
                </MagneticButton>
              </div>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-black/[0.04]">
              <p className="text-[14px] font-medium text-muted-foreground">
                Não possui uma conta? {" "}
                <Link to="/signup" className="text-[#0F0F14] font-bold hover:text-primary transition-colors hover:underline">
                  Comece gratuitamente
                </Link>
              </p>
            </div>
          </motion.div>

          <div className="mt-10 text-center md:text-left md:absolute md:bottom-12 md:left-12">
            <Link to="/" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-[#0F0F14] transition-colors group">
              <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" /> Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
