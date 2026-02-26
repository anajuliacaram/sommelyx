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
    <div className="min-h-screen flex flex-col lg:flex-row relative" style={{ background: "#F7F7F8", overflow: "hidden" }}>
      {/* Noise Texture Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Left — editorial wine panel */}
      <div
        className="relative flex items-center justify-center overflow-hidden lg:w-[50%]"
        style={{
          background: "#120309",
          minHeight: 320,
        }}
      >
        {/* Breathing Background Gradient */}
        <motion.div
          className="absolute inset-0 z-0 opacity-70"
          animate={{
            background: [
              "radial-gradient(circle at 30% 20%, #3D0C1D 0%, transparent 60%)",
              "radial-gradient(circle at 60% 70%, #4D1227 0%, transparent 60%)",
              "radial-gradient(circle at 30% 20%, #3D0C1D 0%, transparent 60%)",
            ]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Subtle Vignette & Central Light */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, transparent 20%, rgba(0,0,0,0.3) 100%)" }} />
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(circle at 50% 50%, rgba(143,45,86,0.12) 0%, transparent 75%)" }} />

        {/* Dynamic Glows */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 20% 40%, rgba(209,178,122,0.06), transparent 70%)" }} />

        <motion.div
          className="relative z-20 px-10 py-12 lg:px-16 lg:py-0 text-center lg:text-left max-w-lg"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Logo Card — Physical Glass style */}
          <motion.div
            className="relative inline-flex items-center gap-4 lg:gap-5 rounded-[28px] px-6 py-5 cursor-default mb-12 overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(28px) saturate(1.4)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 64px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
            }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Gloss Highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent shadow-[0_4px_12px_rgba(255,255,255,0.1)]" />

            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-12 w-12 lg:h-16 lg:w-16 object-contain block drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" />
            <span className="text-[18px] lg:text-[22px] font-black text-white tracking-tight" style={{ letterSpacing: "-0.05em" }}>Sommelyx</span>
          </motion.div>

          <h1 className="font-serif font-black text-white" style={{ fontSize: "clamp(2.5rem, 5vw, 4.2rem)", letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 12 }}>
            Bem-vindo
          </h1>
          <h2 className="font-serif italic" style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)", fontWeight: 600, letterSpacing: "-0.06em", lineHeight: 1, background: "linear-gradient(135deg, #D1B27A 0%, #B69255 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 36 }}>
            de volta.
          </h2>

          <p className="text-[16px] lg:text-[18px] leading-[1.8] max-w-sm font-medium" style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "-0.02em" }}>
            Acesse o seu acervo pessoal e gerencie sua coleção com a precisão que ela merece.
          </p>
        </motion.div>

        {/* Subtle Ambient Shadow at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }} />
      </div>

      {/* Right — form section */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <motion.div
          className="w-full max-w-[480px]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(140,32,68,0.1)",
              borderRadius: 36,
              boxShadow: "0 32px 80px -16px rgba(140,32,68,0.18), 0 0 0 1px rgba(255,255,255,0.4) inset",
              padding: "clamp(40px, 8vw, 72px)",
            }}
          >
            {/* Internal Glass Highlight */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent z-10" />

            {/* Header Content */}
            <h2 className="font-serif font-black text-[#0F0F14]" style={{ fontSize: "clamp(2.2rem, 4vw, 2.8rem)", letterSpacing: "-0.05em", lineHeight: 1.1, marginBottom: 16 }}>
              Entrar
            </h2>
            <p className="font-medium" style={{ fontSize: "16px", color: "#6B7280", lineHeight: 1.6, marginBottom: 48, letterSpacing: "-0.01em" }}>
              Entre na sua plataforma para gerenciar o seu acervo com exclusividade.
            </p>

            {emailConfirmed && (
              <div className="flex items-center gap-3 p-5 rounded-2xl mb-10" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#22c55e]" />
                <p className="text-[14px] font-bold text-[#16a34a]">Identidade verificada com sucesso!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C2044] ml-1">
                  Identificador (E-mail)
                </Label>
                <Input
                  id="email" type="email" placeholder="seu@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="text-[16px] placeholder:text-slate-400 no-focus-ring"
                  style={{
                    height: 60,
                    borderRadius: 18,
                    background: "#fff",
                    border: "1.5px solid rgba(140,32,68,0.08)",
                    color: "#0F0F14",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                  onFocus={inputFocus} onBlur={inputBlur}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8C2044]">
                    Palavra-passe
                  </Label>
                  <Link to="/forgot-password" className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9CA3AF] hover:text-[#8C2044] transition-colors">
                    Recuperar acesso
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="text-[16px] pr-12 placeholder:text-slate-400 no-focus-ring"
                    style={{
                      height: 60,
                      borderRadius: 18,
                      background: "#fff",
                      border: "1.5px solid rgba(140,32,68,0.08)",
                      color: "#0F0F14",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                    onFocus={inputFocus} onBlur={inputBlur}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 opacity-30 text-[#0F0F14]">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="pt-2">
                <Button
                  type="submit" disabled={loading}
                  className="w-full text-[16px] font-black text-white border-0 cursor-pointer shadow-premium"
                  style={{
                    height: 64, borderRadius: 18,
                    background: "linear-gradient(135deg, #8C2044 0%, #C44569 100%)",
                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.boxShadow = "0 24px 56px rgba(140,32,68,0.35)";
                      e.currentTarget.style.filter = "saturate(1.1) brightness(1.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 28px rgba(140,32,68,0.22)";
                    e.currentTarget.style.filter = "none";
                  }}
                >
                  {loading ? "Processando..." : "Entrar na Plataforma"}
                </Button>
              </motion.div>
            </form>

            <p className="text-center text-[14px] mt-14 font-medium" style={{ color: "#9CA3AF" }}>
              Ainda não possui um acervo?{" "}
              <Link to="/signup" className="text-[#8C2044] font-black hover:underline transition-all">
                Criar conta gratuita
              </Link>
            </p>
          </div>

          <p className="text-center mt-12">
            <Link to="/" className="text-[11px] font-black uppercase tracking-[0.25em] text-[#9CA3AF] hover:text-[#0F0F14] transition-colors duration-500">
              ← Retornar ao Início
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
