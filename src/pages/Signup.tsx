import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      toast({
        title: "Conta criada!",
        description: "Verifique seu email para confirmar o cadastro.",
      });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Erro ao criar conta",
        description: err.message,
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
      {/* Left — editorial visual */}
      <div
        className="relative flex items-center justify-center overflow-hidden lg:w-[52%]"
        style={{
          background: "linear-gradient(175deg, #2E0A18 0%, #6B1D3A 40%, #8F2D56 70%, #A8436A 100%)",
          minHeight: 240,
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 25% 35%, rgba(201,168,106,0.10), transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 50% at 75% 70%, rgba(196,69,122,0.12), transparent 65%)" }} />

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

          <h2
            className="font-serif font-bold text-white"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 12 }}
          >
            Comece sua
          </h2>
          <h2
            className="font-serif italic"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, color: "#C9A86A", marginBottom: 32 }}
          >
            jornada.
          </h2>

          <p className="text-[18px] lg:text-[20px] leading-[1.6] max-w-sm" style={{ color: "rgba(255,255,255,0.60)" }}>
            Crie sua conta e descubra uma nova forma de gerenciar seus vinhos com inteligência.
          </p>
        </motion.div>
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
              Criar conta
            </h1>
            <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#6B7280", lineHeight: 1.5, marginBottom: "clamp(24px, 3vw, 32px)" }}>
              Comece grátis, sem cartão de crédito
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[13px] font-semibold uppercase" style={{ letterSpacing: "0.08em", color: "rgba(107,31,58,0.55)" }}>
                  Nome completo
                </Label>
                <Input
                  id="name" type="text" placeholder="João Silva"
                  value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="text-[16px]"
                  style={{ height: 56, borderRadius: 16, background: "rgba(240,240,242,0.8)", border: "1px solid rgba(120,60,90,0.15)", color: "#0F0F14", transition: "all 0.18s ease" }}
                  onFocus={inputFocus} onBlur={inputBlur}
                />
              </div>

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
                    id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres"
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                    className="text-[16px] pr-12"
                    style={{ height: 56, borderRadius: 16, background: "rgba(240,240,242,0.8)", border: "1px solid rgba(120,60,90,0.15)", color: "#0F0F14", transition: "all 0.18s ease" }}
                    onFocus={inputFocus} onBlur={inputBlur}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60" style={{ color: "#9CA3AF" }}>
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
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
                  }}
                >
                  {loading ? "Criando..." : "Criar conta grátis"}
                </Button>
              </motion.div>
            </form>

            <p className="text-center text-[15px] mt-8" style={{ color: "#9CA3AF" }}>
              Já tem conta?{" "}
              <Link to="/login" className="font-semibold transition-colors hover:brightness-110" style={{ color: "#8F2D56" }}>
                Entrar
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
