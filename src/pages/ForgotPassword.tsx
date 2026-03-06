import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const appUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "") || window.location.origin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar email de recuperação.");
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
            Recuperar
            <br />
            <span className="italic" style={{ color: "#C9A86A" }}>acesso.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            Enviaremos um link para redefinir sua senha de forma segura.
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

          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(34,197,94,0.08)" }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: "#22c55e" }} />
              </div>
              <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: "#0F0F14" }}>Email enviado!</h1>
              <p className="text-sm mb-6" style={{ color: "#6B7280", lineHeight: 1.7 }}>
                Verifique sua caixa de entrada em <strong>{email}</strong>. Clique no link para redefinir sua senha.
              </p>
              <Link to="/login" className="text-[13px] font-medium" style={{ color: "#8F2D56" }}>
                ← Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-serif font-bold mb-1" style={{ letterSpacing: "-0.03em", color: "#0F0F14" }}>Esqueci minha senha</h1>
              <p className="text-sm mb-6" style={{ color: "#6B7280" }}>Informe seu email para receber o link de recuperação.</p>

              {error && (
                <div className="p-3.5 rounded-xl mb-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <p className="text-[13px] font-medium" style={{ color: "#dc2626" }}>{error}</p>
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
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-[13px] font-semibold mt-2 text-white border-0"
                  style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)", boxShadow: "0 4px 16px rgba(143,45,86,0.15)" }}
                  disabled={loading}
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>

              <p className="text-center mt-6">
                <Link to="/login" className="text-[12px] flex items-center justify-center gap-1 transition-colors" style={{ color: "#9CA3AF" }}>
                  <ArrowLeft className="h-3 w-3" /> Voltar ao login
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
