import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-exchanges the token from the URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Also check if user session is already set (redirect from email)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
      });
    }
  }, []);

  const isValid = password.length >= 8 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#F7F7F8" }}>
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden" style={{ background: "linear-gradient(160deg, #3A0E1F 0%, #8F2D56 50%, #4E1229 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 30% 40%, rgba(196,69,122,0.15), transparent 70%)" }} />
        <motion.div
          className="relative z-10 max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-16 w-auto object-contain mb-8" />
          <h2 className="text-4xl font-serif font-bold text-white mb-4" style={{ letterSpacing: "-0.03em", lineHeight: "1.05" }}>
            Nova
            <br />
            <span className="italic" style={{ color: "#C9A86A" }}>senha.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            Escolha uma senha forte para proteger sua conta.
          </p>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <img src="/logo-sommelyx.png" alt="Sommelyx" className="h-10 w-auto object-contain" />
            <span className="text-[14px] font-bold font-sans tracking-tight" style={{ color: "#1A1A1A" }}>Sommelyx</span>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(34,197,94,0.08)" }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: "#22c55e" }} />
              </div>
              <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: "#0F0F14" }}>Senha redefinida!</h1>
              <p className="text-sm" style={{ color: "#6B7280" }}>Redirecionando para o dashboard...</p>
            </div>
          ) : !ready ? (
            <div className="text-center">
              <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: "#0F0F14" }}>Link inválido</h1>
              <p className="text-sm mb-4" style={{ color: "#6B7280" }}>Este link de recuperação expirou ou é inválido.</p>
              <Button onClick={() => navigate("/forgot-password")} variant="outline" className="text-[13px]">
                Solicitar novo link
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-serif font-bold mb-1" style={{ letterSpacing: "-0.03em", color: "#0F0F14" }}>Redefinir senha</h1>
              <p className="text-sm mb-6" style={{ color: "#6B7280" }}>Escolha uma nova senha para sua conta.</p>

              {error && (
                <div className="p-3.5 rounded-xl mb-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <p className="text-[13px] font-medium" style={{ color: "#dc2626" }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#6B7280" }}>Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-11 rounded-xl text-sm pr-10"
                      style={{ background: "#F0F0F2", border: "1px solid rgba(0,0,0,0.06)", color: "#0F0F14" }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-[11px] mt-1" style={{ color: "#f59e0b" }}>Mínimo 8 caracteres</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#6B7280" }}>Confirmar senha</Label>
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="h-11 rounded-xl text-sm"
                    style={{ background: "#F0F0F2", border: "1px solid rgba(0,0,0,0.06)", color: "#0F0F14" }}
                  />
                  {confirm.length > 0 && password !== confirm && (
                    <p className="text-[11px] mt-1" style={{ color: "#ef4444" }}>As senhas não coincidem</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-[13px] font-semibold mt-2 text-white border-0"
                  style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)", boxShadow: "0 4px 16px rgba(143,45,86,0.15)" }}
                  disabled={loading || !isValid}
                >
                  <Lock className="h-4 w-4 mr-1.5" />
                  {loading ? "Redefinindo..." : "Redefinir senha"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
