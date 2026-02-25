import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
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

  // Redirect if already logged in
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
    console.log("[Login] Attempting sign in...");
    try {
      await signIn(email, password);
      console.log("[Login] Sign in successful, waiting for auth state...");
      // Navigation handled by useEffect above after auth state updates
    } catch (err: any) {
      console.error("[Login] Sign in error:", err);
      const msg =
        err.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : err.message === "Email not confirmed"
          ? "Confirme seu email antes de fazer login."
          : err.message || "Erro desconhecido. Tente novamente.";
      toast({
        title: "Erro ao entrar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(178,76,124,0.18)";
    e.currentTarget.style.borderColor = "#B24C7C";
    e.currentTarget.style.transform = "translateY(-1px)";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.borderColor = "rgba(120,60,90,0.15)";
    e.currentTarget.style.transform = "translateY(0)";
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#F7F7F8" }}>
      {/* Left — editorial wine panel */}
      <div
        className="relative flex items-center justify-center overflow-hidden lg:w-[52%]"
        style={{
          background: "linear-gradient(175deg, #2E0A18 0%, #6B1D3A 40%, #8F2D56 70%, #A8436A 100%)",
          minHeight: 240,
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 25% 35%, rgba(201,168,106,0.10), transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 50% at 75% 70%, rgba(196,69,122,0.12), transparent 65%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.06)" }} />

        <motion.div
          className="relative z-10 px-10 py-12 lg:px-16 lg:py-0 text-center lg:text-left max-w-lg"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="relative inline-flex items-center gap-3 lg:gap-4 rounded-[20px] px-3 py-2.5 lg:px-4 lg:py-3 cursor-default"
            style={{
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.10)",
              marginBottom: 28,
            }}
            whileHover={{ scale: 1.04, y: -1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="absolute -inset-4 lg:-inset-5 -z-10 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,45,85,0.15) 0%, rgba(139,45,85,0.06) 40%, transparent 70%)", filter: "blur(16px)" }} />
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-[46px] w-[46px] lg:h-[60px] lg:w-[60px] object-contain block" />
            <span className="text-[17px] lg:text-[19px] font-extrabold text-white tracking-tight" style={{ letterSpacing: "-0.02em" }}>Sommelyx</span>
          </motion.div>

          <h2 className="font-serif font-bold text-white" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 12 }}>
            Bem-vindo
          </h2>
          <h2 className="font-serif italic" style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, color: "#C9A86A", marginBottom: 32 }}>
            de volta.
          </h2>

          <p className="text-[18px] lg:text-[20px] leading-[1.6] max-w-sm" style={{ color: "rgba(255,255,255,0.60)" }}>
            Acesse sua adega inteligente e continue gerenciando sua coleção com precisão.
          </p>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.08), transparent)" }} />
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-10 lg:p-16">
        <motion.div
          className="w-[94%] sm:w-full max-w-[420px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(120,60,90,0.12)",
              borderRadius: 24,
              boxShadow: "0 10px 30px rgba(120,60,90,0.10), 0 2px 8px rgba(0,0,0,0.04)",
              padding: "clamp(24px, 4vw, 40px)",
            }}
          >
            {/* Mobile logo */}
            <motion.div className="flex items-center gap-3 mb-8 lg:hidden" whileHover={{ scale: 1.03 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center justify-center rounded-[14px] p-2" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(120,60,90,0.15)" }}>
                <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-10 w-10 object-contain" />
              </div>
              <span className="text-[16px] font-extrabold font-sans" style={{ color: "#0F0F14", letterSpacing: "-0.02em" }}>Sommelyx</span>
            </motion.div>

            <h1 className="font-serif font-bold" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em", color: "#6B1F3A", lineHeight: 1.05, marginBottom: 6 }}>
              Entrar
            </h1>
            <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#6B7280", lineHeight: 1.5, marginBottom: "clamp(24px, 3vw, 32px)" }}>
              Acesse sua conta Sommelyx
            </p>

            {emailConfirmed && (
              <div className="flex items-center gap-3 p-4 rounded-2xl mb-6" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.14)" }}>
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: "#22c55e" }} />
                <p className="text-[14px] font-medium" style={{ color: "#16a34a" }}>Email confirmado com sucesso!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-semibold uppercase" style={{ letterSpacing: "0.08em", color: "rgba(107,31,58,0.55)" }}>
                  Email
                </Label>
                <Input
                  id="email" type="email" placeholder="seu@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="text-[16px]"
                  style={{ height: 56, borderRadius: 16, background: "rgba(240,240,242,0.8)", border: "1px solid rgba(120,60,90,0.15)", color: "#0F0F14", transition: "all 0.18s ease" }}
                  onFocus={inputFocus} onBlur={inputBlur}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-semibold uppercase" style={{ letterSpacing: "0.08em", color: "rgba(107,31,58,0.55)" }}>
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="text-[16px] pr-12"
                    style={{ height: 56, borderRadius: 16, background: "rgba(240,240,242,0.8)", border: "1px solid rgba(120,60,90,0.15)", color: "#0F0F14", transition: "all 0.18s ease" }}
                    onFocus={inputFocus} onBlur={inputBlur}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60" style={{ color: "#9CA3AF" }}>
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-[13px] font-semibold relative group" style={{ color: "#8F2D56" }}>
                  Esqueci minha senha
                  <span className="absolute left-0 -bottom-0.5 w-full h-[1.5px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-250" style={{ background: "#8F2D56" }} />
                </Link>
              </div>

              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit" disabled={loading}
                  className="w-full text-[17px] font-semibold text-white border-0 cursor-pointer"
                  style={{
                    height: 60, borderRadius: 18,
                    background: "linear-gradient(135deg, #7a1f3d 0%, #b23a6f 55%, #d6a46b 120%)",
                    boxShadow: "0 12px 28px rgba(122,31,61,0.25), 0 4px 10px rgba(0,0,0,0.08)",
                    transition: "box-shadow 200ms ease, filter 200ms ease",
                    ...(loading ? { filter: "brightness(0.97)" } : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.boxShadow = "0 16px 40px rgba(122,31,61,0.35), 0 6px 14px rgba(0,0,0,0.12)";
                      e.currentTarget.style.filter = "brightness(1.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 28px rgba(122,31,61,0.25), 0 4px 10px rgba(0,0,0,0.08)";
                    e.currentTarget.style.filter = loading ? "brightness(0.97)" : "none";
                  }}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </motion.div>
            </form>

            <p className="text-center text-[15px] mt-8" style={{ color: "#9CA3AF" }}>
              Não tem conta?{" "}
              <Link to="/signup" className="font-semibold transition-colors hover:brightness-110" style={{ color: "#8F2D56" }}>
                Criar conta grátis
              </Link>
            </p>
          </div>

          <p className="text-center mt-5">
            <Link to="/" className="text-[13px] transition-colors duration-200 hover:underline" style={{ color: "#9CA3AF" }}>
              ← Voltar ao início
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
