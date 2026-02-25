import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Wine, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
  const { signIn } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Erro ao entrar",
        description: err.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#F7F7F8" }}>
      {/* Left — editorial visual panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden" style={{ background: "linear-gradient(160deg, #3A0E1F 0%, #8F2D56 50%, #4E1229 100%)" }}>
        {/* Subtle glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 30% 40%, rgba(196,69,122,0.15), transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 40% at 70% 60%, rgba(201,168,106,0.08), transparent 60%)" }} />
        
        <motion.div
          className="relative z-10 max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-24 w-24 object-contain mb-8" />
          <h2 className="text-4xl font-serif font-bold text-white mb-4" style={{ letterSpacing: "-0.03em", lineHeight: "1.05" }}>
            Bem-vindo
            <br />
            <span className="italic" style={{ color: "#C9A86A" }}>de volta.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            Acesse sua adega inteligente e continue gerenciando sua coleção com precisão.
          </p>
        </motion.div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-14 w-14 object-contain" />
            <span className="text-[15px] font-bold font-sans tracking-tight" style={{ color: "#1A1A1A" }}>Sommelyx</span>
          </div>

          <h1 className="text-2xl font-serif font-bold mb-1" style={{ letterSpacing: "-0.03em", color: "#0F0F14" }}>Entrar</h1>
          <p className="text-sm mb-6" style={{ color: "#6B7280" }}>Acesse sua conta Sommelyx</p>

          {emailConfirmed && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl mb-6" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "#22c55e" }} />
              <p className="text-[13px] font-medium" style={{ color: "#16a34a" }}>Email confirmado com sucesso! Faça login.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#6B7280" }}>Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl text-sm"
                style={{ background: "#F0F0F2", border: "1px solid rgba(0,0,0,0.06)", color: "#0F0F14" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#6B7280" }}>Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl text-sm pr-10"
                  style={{ background: "#F0F0F2", border: "1px solid rgba(0,0,0,0.06)", color: "#0F0F14" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#9CA3AF" }}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-[13px] font-semibold mt-2 text-white border-0"
              style={{
                background: "linear-gradient(135deg, #8F2D56, #C44569)",
                boxShadow: "0 4px 16px rgba(143,45,86,0.15)",
              }}
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-[12px] mt-6" style={{ color: "#9CA3AF" }}>
            Não tem conta?{" "}
            <Link to="/signup" className="font-medium transition-colors" style={{ color: "#8F2D56" }}>
              Criar conta grátis
            </Link>
          </p>

          <p className="text-center mt-4">
            <Link to="/" className="text-[12px] transition-colors duration-200" style={{ color: "#9CA3AF" }}>
              ← Voltar ao início
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
