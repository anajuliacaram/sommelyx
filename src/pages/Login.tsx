import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, ChevronLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
    <div className="min-h-screen bg-organic-gradient relative overflow-hidden flex items-center justify-center p-6 sm:p-12 premium-noise">

      {/* Decorative Hero elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[15%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[480px] z-10"
      >
        <div className="glass-card p-10 lg:p-16 border-white/20 shadow-float">
          {/* Internal Shimmer */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <div className="flex flex-col items-center mb-12">
            <motion.div
              whileHover={{ rotate: -5, scale: 1.05 }}
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-[22px] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-premium mb-6"
            >
              <img src="/logo-sommelyx.png" alt="Logo" className="w-10 h-10 lg:w-14 lg:h-14 object-contain" />
            </motion.div>
            <h1 className="text-3xl lg:text-4xl font-serif font-black italic text-[#0F0F14] text-center tracking-tight">
              Bem-vindo <span className="text-gradient-wine block">de volta.</span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-3 text-center opacity-70">
              Acesse sua curadoria exclusiva Sommelyx
            </p>
          </div>

          {emailConfirmed && (
            <div className="mb-8 p-4 rounded-xl bg-green-50/50 border border-green-100/50 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="text-[13px] font-bold text-green-700">Identidade verificada!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C2044] ml-1">
                E-mail
              </Label>
              <Input
                id="email" type="email" placeholder="seu@acervo.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                className="input-premium h-14"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C2044]">
                  Senha
                </Label>
                <Link to="/forgot-password" className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="input-premium h-14 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#0F0F14] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-4">
              <Button
                type="submit" disabled={loading}
                className="w-full h-15 rounded-2xl text-[15px] font-bold shadow-float variant-premium"
                variant="premium"
              >
                {loading ? "Processando..." : "Entrar na Plataforma"}
              </Button>
            </motion.div>
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
        </div>
      </motion.div>
    </div>
  );
}
