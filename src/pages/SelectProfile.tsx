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
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        className="w-full max-w-3xl text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Wine className="h-8 w-8 text-primary" />
          <span className="text-2xl font-serif font-bold text-foreground">WineVault</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
          Como você vai usar o WineVault?
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          Escolha o perfil que melhor se encaixa. Você pode mudar depois.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
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
              className="glass rounded-3xl p-8 text-left group hover:shadow-xl transition-all duration-300 hover:border-primary/30"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
              whileHover={{ y: -4 }}
            >
              <div className="w-16 h-16 rounded-2xl gradient-wine flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <option.icon className="h-8 w-8 text-primary-foreground" />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2 font-sans">{option.title}</h3>
              <p className="text-muted-foreground text-sm mb-6">{option.desc}</p>

              <ul className="space-y-2 mb-6">
                {option.features.map((f) => (
                  <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                Selecionar <ArrowRight className="h-4 w-4" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
