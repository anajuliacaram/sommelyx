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
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "#F7F7F8" }}>
      {/* ═══ Left — editorial wine panel ═══ */}
      <div
        className="relative flex items-center justify-center overflow-hidden lg:w-[52%]"
        style={{
          background: "linear-gradient(175deg, #2E0A18 0%, #6B1D3A 40%, #8F2D56 70%, #A8436A 100%)",
          minHeight: 240,
        }}
      >
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 25% 35%, rgba(201,168,106,0.10), transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 50% at 75% 70%, rgba(196,69,122,0.12), transparent 65%)" }} />
        {/* Subtle overlay for text contrast */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.06)" }} />

        <motion.div
          className="relative z-10 px-10 py-12 lg:px-16 lg:py-0 text-center lg:text-left max-w-lg"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo in glass circle */}
          <div
            className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl mb-8"
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-12 w-12 object-contain" />
          </div>

          <h2
            className="font-serif font-black text-white mb-1"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            Bem-vindo
          </h2>
          <h2
            className="font-serif font-bold italic mb-6"
            style={{
              fontSize: "clamp(2.2rem, 4.5vw, 4rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "#C9A86A",
            }}
          >
            de volta.
          </h2>

          <p
            className="text-[17px] lg:text-[19px] leading-[1.65] max-w-sm"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Acesse sua adega inteligente e continue gerenciando sua coleção com precisão.
          </p>
        </motion.div>

        {/* Bottom fade for depth */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.08), transparent)" }} />
      </div>

      {/* ═══ Right — form ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Glass card wrapper */}
          <div
            className="p-8 sm:p-10"
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(143,45,86,0.10)",
              borderRadius: 22,
              boxShadow: "0 12px 48px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-11 w-11 object-contain" />
              <span className="text-[16px] font-extrabold font-sans tracking-tight" style={{ color: "#0F0F14", letterSpacing: "-0.02em" }}>Sommelyx</span>
            </div>

            <h1
              className="font-serif font-bold mb-1.5"
              style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", letterSpacing: "-0.035em", color: "#0F0F14", lineHeight: 1.1 }}
            >
              Entrar
            </h1>
            <p className="text-[16px] mb-7" style={{ color: "#6B7280", lineHeight: 1.6 }}>
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
                <Label htmlFor="email" className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6B7280" }}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-2xl text-[16px] transition-shadow duration-200"
                  style={{
                    height: 54,
                    background: "rgba(240,240,242,0.7)",
                    border: "1px solid rgba(0,0,0,0.07)",
                    color: "#0F0F14",
                  }}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 4px rgba(143,45,86,0.12)"; e.currentTarget.style.borderColor = "rgba(143,45,86,0.25)"; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)"; }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6B7280" }}>Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-2xl text-[16px] pr-12 transition-shadow duration-200"
                    style={{
                      height: 54,
                      background: "rgba(240,240,242,0.7)",
                      border: "1px solid rgba(0,0,0,0.07)",
                      color: "#0F0F14",
                    }}
                    onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 4px rgba(143,45,86,0.12)"; e.currentTarget.style.borderColor = "rgba(143,45,86,0.25)"; }}
                    onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                    style={{ color: "#9CA3AF" }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-[13px] font-medium transition-all duration-200 hover:underline"
                  style={{ color: "#8F2D56" }}
                >
                  Esqueci minha senha
                </Link>
              </div>

              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  className="w-full rounded-2xl text-[16px] font-semibold text-white border-0 cursor-pointer"
                  style={{
                    height: 58,
                    background: "linear-gradient(135deg, #8F2D56 0%, #C44569 50%, #D4896B 100%)",
                    boxShadow: "0 8px 28px rgba(143,45,86,0.22), 0 2px 6px rgba(0,0,0,0.06)",
                    transition: "box-shadow 200ms ease, filter 200ms ease",
                    ...(loading ? { filter: "brightness(0.95)" } : {}),
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 14px 40px rgba(143,45,86,0.32), 0 4px 10px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(143,45,86,0.22), 0 2px 6px rgba(0,0,0,0.06)"; }}
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </motion.div>
            </form>

            <p className="text-center text-[14px] mt-7" style={{ color: "#9CA3AF" }}>
              Não tem conta?{" "}
              <Link to="/signup" className="font-semibold transition-colors hover:underline" style={{ color: "#8F2D56" }}>
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
