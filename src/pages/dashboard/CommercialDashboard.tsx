import { motion } from "framer-motion";
import { DollarSign, Package, AlertTriangle, ShoppingCart, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { WineMesh } from "@/components/WineMesh";

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const metrics = [
  { label: "Faturamento do Mês", value: "R$ 0", icon: DollarSign },
  { label: "Estoque Total", value: "0", icon: Package },
  { label: "Produtos Críticos", value: "0", icon: AlertTriangle },
  { label: "Vendas Recentes", value: "0", icon: ShoppingCart },
  { label: "Margem Média", value: "0%", icon: TrendingUp },
];

export default function CommercialDashboard() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Gestor";

  return (
    <div className="space-y-7 max-w-6xl">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
          Olá, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da operação comercial</p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="card-depth p-5 group hover:border-border/70 transition-all duration-200"
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center">
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground font-sans tracking-tight">{m.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      <motion.div
        className="card-depth p-12 text-center relative overflow-hidden"
        initial="hidden" animate="visible" variants={fadeUp} custom={7}
      >
        <WineMesh variant="empty-state" />
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center mx-auto mb-5 glow-gold">
            <Package className="h-6 w-6 text-gold-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2 font-sans tracking-tight">
            Comece a gerenciar seu estoque
          </h3>
          <p className="text-sm text-muted-foreground mb-7 max-w-xs mx-auto leading-relaxed">
            Cadastre produtos, registre vendas e acompanhe métricas em tempo real.
          </p>
          <Button className="gradient-wine text-primary-foreground btn-glow h-10 px-6 text-[13px] font-medium">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Cadastrar Produto
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
