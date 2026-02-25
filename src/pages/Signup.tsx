import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wine, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { WineMesh } from "@/components/WineMesh";

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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — editorial visual */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 gradient-wine-deep" />
        <WineMesh variant="hero" />
        <motion.div
          className="relative z-10 max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-12 h-12 rounded-xl gradient-wine flex items-center justify-center mb-8 glow-wine">
            <Wine className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-foreground mb-4" style={{ letterSpacing: "-0.03em", lineHeight: "1.05" }}>
            Comece sua
            <br />
            <span className="italic text-gradient-gold">jornada.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Crie sua conta e descubra uma nova forma de gerenciar seus vinhos com inteligência.
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
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 rounded-md gradient-wine flex items-center justify-center">
              <Wine className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold font-sans tracking-tight">WineVault</span>
          </div>

          <h1 className="text-2xl font-serif font-bold text-foreground mb-1" style={{ letterSpacing: "-0.03em" }}>Criar conta</h1>
          <p className="text-xs text-muted-foreground mb-8">Comece grátis, sem cartão de crédito</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nome completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-10 rounded-lg bg-muted/40 border-border/40 focus:border-primary/40 focus:bg-muted/60 transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-lg bg-muted/40 border-border/40 focus:border-primary/40 focus:bg-muted/60 transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 rounded-lg bg-muted/40 border-border/40 focus:border-primary/40 focus:bg-muted/60 transition-all text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-lg gradient-wine text-primary-foreground btn-glow text-[13px] font-medium mt-2"
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar conta grátis"}
            </Button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Entrar
            </Link>
          </p>

          <p className="text-center mt-4">
            <Link to="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-200">
              ← Voltar ao início
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
