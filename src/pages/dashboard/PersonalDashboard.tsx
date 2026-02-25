import { motion } from "framer-motion";
import { Wine, TrendingUp, Star, Clock, Plus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 12 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
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
    <div className="space-y-6">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">
          Olá, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Resumo da sua adega pessoal</p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="card-depth p-4 group hover:border-border transition-colors duration-200"
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center">
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              {m.change && (
                <span className="text-[10px] text-accent flex items-center gap-0.5 font-medium">
                  <ArrowUpRight className="h-2.5 w-2.5" /> {m.change}
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-foreground font-sans tracking-tight">{m.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      <motion.div
        className="card-depth p-10 text-center"
        initial="hidden" animate="visible" variants={fadeUp} custom={5}
      >
        <div className="w-14 h-14 rounded-xl gradient-wine flex items-center justify-center mx-auto mb-5 glow-wine">
          <Wine className="h-7 w-7 text-primary-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2 font-sans tracking-tight">
          Sua adega está vazia
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
          Comece adicionando seu primeiro vinho e descubra tudo que o WineVault pode fazer.
        </p>
        <Button className="gradient-wine text-primary-foreground btn-glow rounded-lg h-9 px-5 text-sm font-medium">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Vinho
        </Button>
      </motion.div>
    </div>
  );
}
