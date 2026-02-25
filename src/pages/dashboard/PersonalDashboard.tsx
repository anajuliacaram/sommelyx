import { motion } from "framer-motion";
import { Wine, TrendingUp, Star, Clock, Plus, ArrowUpRight } from "lucide-react";
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
  { label: "Total de Garrafas", value: "0", icon: Wine, change: null },
  { label: "Valor da Adega", value: "R$ 0", icon: TrendingUp, change: null },
  { label: "Vinhos no Auge", value: "0", icon: Star, change: null },
  { label: "Últimas Adições", value: "0", icon: Clock, change: null },
];

export default function PersonalDashboard() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";

  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
          Olá, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Aqui está o resumo da sua adega.</p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="glass rounded-2xl p-5 hover:shadow-md transition-shadow"
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl gradient-wine flex items-center justify-center">
                <m.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              {m.change && (
                <span className="text-xs text-green-600 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" /> {m.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      <motion.div
        className="glass rounded-2xl p-12 text-center"
        initial="hidden" animate="visible" variants={fadeUp} custom={5}
      >
        <div className="w-20 h-20 rounded-2xl gradient-wine flex items-center justify-center mx-auto mb-6">
          <Wine className="h-10 w-10 text-primary-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2 font-sans">
          Sua adega está vazia
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Comece adicionando seu primeiro vinho e descubra tudo que o WineVault pode fazer por você.
        </p>
        <Button className="gradient-wine text-primary-foreground shadow-wine rounded-xl h-11 px-6">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Vinho
        </Button>
      </motion.div>
    </div>
  );
}
