import { useState } from "react";
import { motion } from "framer-motion";
import { Wine, TrendingUp, GlassWater, Clock, Plus, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { WineMesh } from "@/components/WineMesh";
import { QuickActions } from "@/components/QuickActions";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { useWineMetrics } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const currentYear = new Date().getFullYear();

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";
  const { totalBottles, totalValue, drinkNow, recentCount, wines } = useWineMetrics();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const drinkNowWines = wines.filter(w =>
    w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until && w.quantity > 0
  ).slice(0, 4);

  const metrics = [
    { label: "Garrafas", value: totalBottles.toString(), icon: Wine, color: "#8F2D56" },
    { label: "Valor estimado", value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, icon: TrendingUp, color: "#C44569" },
    { label: "Beber agora", value: drinkNow.toString(), icon: GlassWater, color: "#E07A5F" },
    { label: "Últimas entradas", value: recentCount.toString(), icon: Clock, color: "#C9A86A" },
  ];

  return (
    <div className="space-y-7 max-w-6xl">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl md:text-2xl font-serif font-bold" style={{ letterSpacing: "-0.03em", color: "#0F0F14" }}>
          Olá, {firstName}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6B7280" }}>Resumo da sua adega</p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="glass-card p-5 group"
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: `${m.color}12` }}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
            </div>
            <p className="text-xl font-bold font-sans tracking-tight" style={{ color: "#0F0F14" }}>{m.value}</p>
            <p className="text-[11px] mt-1" style={{ color: "#9CA3AF" }}>{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions
        onAddWine={() => setAddOpen(true)}
        onOpenBottle={() => setManageOpen(true)}
        onViewCellar={() => navigate("/dashboard/cellar")}
      />

      {/* Drink Now section or Empty State */}
      {totalBottles === 0 ? (
        <motion.div
          className="glass-card p-12 text-center relative overflow-hidden"
          initial="hidden" animate="visible" variants={fadeUp} custom={5}
        >
          <WineMesh variant="empty-state" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-[14px] gradient-wine flex items-center justify-center mx-auto mb-5" style={{ boxShadow: "0 4px 16px rgba(143,45,86,0.2)" }}>
              <Wine className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-sm font-semibold mb-2 font-sans tracking-tight" style={{ color: "#0F0F14" }}>
              Sua adega está vazia
            </h3>
            <p className="text-sm mb-7 max-w-xs mx-auto leading-relaxed" style={{ color: "#6B7280" }}>
              Comece adicionando seu primeiro vinho e descubra tudo que o Sommelyx pode fazer.
            </p>
            <Button
              onClick={() => setAddOpen(true)}
              className="gradient-wine text-white btn-glow h-11 px-6 text-[13px] font-semibold border-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Vinho
            </Button>
          </div>
        </motion.div>
      ) : drinkNowWines.length > 0 ? (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6} className="space-y-3">
          <h2 className="text-sm font-semibold font-sans" style={{ color: "#0F0F14" }}>🍷 Beber agora</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drinkNowWines.map(w => (
              <div key={w.id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.08)" }}>
                  <GlassWater className="h-4 w-4" style={{ color: "#22c55e" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#0F0F14" }}>{w.name}</p>
                  <p className="text-xs" style={{ color: "#9CA3AF" }}>{w.producer} {w.vintage ? `· ${w.vintage}` : ""}</p>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e" }}>
                  Beber agora
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}
