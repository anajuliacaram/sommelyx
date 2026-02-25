import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wine, Eye, EyeOff } from "lucide-react";
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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 gradient-wine-deep" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-3xl top-1/3 right-1/4 pointer-events-none" style={{ background: "radial-gradient(circle, hsl(37 40% 40% / 0.12) 0%, transparent 70%)" }} />
        <motion.div
          className="text-center relative z-10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-16 h-16 rounded-2xl gradient-wine flex items-center justify-center mx-auto mb-8 glow-wine">
            <Wine className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-4xl font-serif font-bold text-foreground mb-4 tracking-tight">
            Comece sua jornada
          </h2>
          <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
            Crie sua conta e descubra uma nova forma de gerenciar seus vinhos.
          </p>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg gradient-wine flex items-center justify-center">
              <Wine className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold font-sans tracking-tight">WineVault</span>
          </div>

          <h1 className="text-2xl font-serif font-bold text-foreground mb-1.5 tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground mb-8">Comece grátis, sem cartão de crédito</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Nome completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-10 rounded-lg bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-lg bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 rounded-lg bg-muted/50 border-border/50 focus:border-primary/50 transition-colors pr-10"
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
              className="w-full h-10 rounded-lg gradient-wine text-primary-foreground btn-glow text-sm font-medium"
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar conta grátis"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
              Entrar
            </Link>
          </p>

          <p className="text-center mt-4">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
              ← Voltar ao início
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
