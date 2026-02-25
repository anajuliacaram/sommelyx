import { motion } from "framer-motion";
import { DollarSign, Package, AlertTriangle, ShoppingCart, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 15 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
} as const;

const metrics = [
  { label: "Faturamento do Mês", value: "R$ 0", icon: DollarSign, color: "gradient-gold" },
  { label: "Estoque Total", value: "0", icon: Package, color: "gradient-wine" },
  { label: "Produtos Críticos", value: "0", icon: AlertTriangle, color: "gradient-wine" },
  { label: "Vendas Recentes", value: "0", icon: ShoppingCart, color: "gradient-wine" },
  { label: "Margem Média", value: "0%", icon: TrendingUp, color: "gradient-gold" },
];

export default function CommercialDashboard() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Gestor";

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
          Olá, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Visão geral da sua operação comercial.</p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="glass rounded-2xl p-5 hover:shadow-md transition-shadow"
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center`}>
                <m.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      <motion.div
        className="glass rounded-2xl p-12 text-center"
        initial="hidden" animate="visible" variants={fadeUp} custom={7}
      >
        <div className="w-20 h-20 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-6">
          <Package className="h-10 w-10 text-gold-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2 font-sans">
          Comece a gerenciar seu estoque
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Cadastre produtos, registre vendas e acompanhe métricas financeiras em tempo real.
        </p>
        <Button className="gradient-wine text-primary-foreground shadow-wine rounded-xl h-11 px-6">
          <Plus className="h-4 w-4 mr-2" /> Cadastrar Produto
        </Button>
      </motion.div>
    </div>
  );
}
