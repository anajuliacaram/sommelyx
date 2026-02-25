import { motion } from "framer-motion";
import { Wine, Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function SelectProfile() {
  const { setProfileType } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelect = async (type: "personal" | "commercial") => {
    try {
      await setProfileType(type);
      navigate("/dashboard");
    } catch {
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background noise relative overflow-hidden">
      <div className="absolute inset-0 gradient-wine-deep opacity-50" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute w-[500px] h-[500px] rounded-full blur-3xl top-1/4 left-1/4 pointer-events-none" style={{ background: "radial-gradient(circle, hsl(340 60% 25% / 0.12) 0%, transparent 70%)" }} />

      <motion.div
        className="w-full max-w-3xl text-center relative z-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg gradient-wine flex items-center justify-center">
            <Wine className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground font-sans tracking-tight">WineVault</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3 tracking-tight">
          Como você vai usar o WineVault?
        </h1>
        <p className="text-muted-foreground text-sm mb-12">
          Escolha o perfil que melhor se encaixa. Você pode mudar depois.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              type: "personal" as const,
              icon: Wine,
              title: "Adega Pessoal",
              desc: "Para colecionadores e entusiastas. Gerencie sua coleção, avalie vinhos e acompanhe o valor da sua adega.",
              features: ["Cadastro completo de vinhos", "Notas de degustação", "Estatísticas da coleção", "Wishlist"],
            },
            {
              type: "commercial" as const,
              icon: Building2,
              title: "Adega Comercial",
              desc: "Para lojas, bares, restaurantes e importadoras. Controle estoque, vendas e fornecedores.",
              features: ["Gestão de estoque", "Registro de vendas", "Relatórios financeiros", "Multiusuário"],
            },
          ].map((option, i) => (
            <motion.button
              key={option.type}
              onClick={() => handleSelect(option.type)}
              className="card-depth p-7 text-left group hover:border-primary/20 transition-all duration-200"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2 }}
            >
              <div className="w-12 h-12 rounded-xl gradient-wine flex items-center justify-center mb-5 group-hover:glow-wine transition-shadow duration-200">
                <option.icon className="h-6 w-6 text-primary-foreground" />
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2 font-sans tracking-tight">{option.title}</h3>
              <p className="text-muted-foreground text-xs mb-5 leading-relaxed">{option.desc}</p>

              <ul className="space-y-2 mb-5">
                {option.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-2.5">
                    <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-primary font-medium text-xs group-hover:gap-3 transition-all duration-200">
                Selecionar <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
