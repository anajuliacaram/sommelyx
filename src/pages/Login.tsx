import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, ChevronLeft, ShieldCheck } from "lucide-react";
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
  }, [emailConfirmed]);

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
    <div className="min-h-screen bg-aurora relative flex items-center justify-center p-4 sm:p-8 premium-noise">

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[460px] z-10"
      >
        <motion.div
          whileHover={{ y: -2, boxShadow: "0 40px 120px -20px rgba(140, 32, 68, 0.15)" }}
          className="glass-card p-10 sm:p-16 w-[96%] sm:w-full mx-auto"
        >
          {/* Internal Specs Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <div className="flex flex-col items-center mb-10">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="w-[112px] h-[112px] sm:w-[144px] sm:h-[144px] rounded-[32px] bg-white/[0.05] backdrop-blur-[48px] border-[0.5px] border-white/20 flex items-center justify-center shadow-[0_16px_40px_-10px_rgba(0,0,0,0.15)] mb-10 relative group"
            >
              <div className="absolute inset-0 bg-[#8C2044]/15 blur-[40px] rounded-[32px] opacity-80" />
              <img
                src="/logo-sommelyx.png"
                alt="Logo"
                className="w-[66px] h-[66px] sm:w-[94px] sm:h-[94px] object-contain relative z-10 drop-shadow-[0_0_14px_rgba(140,32,68,0.25)] contrast-125 brightness-105"
              />
            </motion.div>

            <h1 className="text-3xl sm:text-5xl font-serif font-black italic text-[#0F0F14] text-center tracking-tight leading-tight">
              Bem-vindo <br />
              <span className="text-gradient-wine">de volta.</span>
            </h1>
            <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-5 opacity-60">
              Acesso Exclusivo
            </p>
          </div>

          {emailConfirmed && (
            <div className="mb-8 p-4 rounded-2xl bg-green-50/10 border border-green-500/20 flex items-center gap-3 backdrop-blur-md">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="text-[12px] font-black uppercase text-green-600 tracking-wider">Conta verificada!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C2044] ml-1">
                Identificação / E-mail
              </Label>
              <Input
                id="email" type="email" placeholder="seu@acervo.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                className="input-premium"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C2044]">
                  Senha Segura
                </Label>
                <Link to="/forgot-password" title="Recover Access" className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
                  Recuperar acesso
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="input-premium pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#0F0F14] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-8 w-full">
              <MagneticButton disabled={loading}>
                <Button
                  type="submit" disabled={loading}
                  className="w-full h-[68px] rounded-full text-[15px] font-black uppercase tracking-[0.25em] shadow-[0_12px_40px_-12px_rgba(140,32,68,0.8)] hover:shadow-[0_16px_60px_-12px_rgba(140,32,68,1)] transition-all duration-500 hover:-translate-y-1 block"
                  variant="premium"
                >
                  {loading ? "PROCESSANDO..." : "ENTRAR NA PLATAFORMA"}
                </Button>
              </MagneticButton>
            </div>
          </form>

          <div className="mt-12 text-center">
            <p className="text-[14px] font-medium text-muted-foreground">
              Novo por aqui? {" "}
              <Link to="/signup" className="text-primary font-bold hover:underline">
                Criar conta gratuita
              </Link>
            </p>

            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all mt-8 group"
            >
              <ChevronLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Retornar ao Início
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
