import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Wine, TrendingUp, GlassWater, Clock, Plus, AlertTriangle, ArrowDownRight, BarChart3, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { WineMesh } from "@/components/WineMesh";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { useWineMetrics } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 12 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  }),
} as const;

const currentYear = new Date().getFullYear();

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";
  const { totalBottles, totalValue, drinkNow, recentCount, lowStock, wines } = useWineMetrics();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const drinkNowWines = wines.filter(w =>
    w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until && w.quantity > 0
  ).slice(0, 4);

  const pastPeakWines = wines.filter(w =>
    w.drink_until && currentYear > w.drink_until && w.quantity > 0
  ).slice(0, 3);

  const lowStockWines = wines.filter(w => w.quantity > 0 && w.quantity <= 2).slice(0, 3);

  // Generate mock chart data based on actual wine count
  const collectionData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map((m, i) => ({
      name: m,
      garrafas: Math.max(0, totalBottles - (currentMonth - i) * Math.ceil(totalBottles * 0.08)),
      valor: Math.max(0, totalValue - (currentMonth - i) * Math.ceil(totalValue * 0.07)),
    }));
  }, [totalBottles, totalValue]);

  const consumptionData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    return months.map((m) => ({
      name: m,
      consumo: Math.floor(Math.random() * 8) + 1,
    }));
  }, []);

  const metrics = [
    { label: "Total garrafas", value: totalBottles.toString(), icon: Wine, color: "#8F2D56", change: `+${recentCount} este mês` },
    { label: "Valor estimado", value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, icon: TrendingUp, color: "#C44569", change: "" },
    { label: "No pico", value: drinkNow.toString(), icon: GlassWater, color: "#22c55e", change: "Prontas para beber" },
    { label: "Estoque baixo", value: lowStock.toString(), icon: Package, color: "#E07A5F", change: "≤ 2 garrafas" },
  ];

  const alerts = [
    ...(drinkNowWines.length > 0 ? [{ type: "success" as const, label: "Beber agora", count: drinkNowWines.length, icon: GlassWater, color: "#22c55e", bg: "rgba(34,197,94,0.06)" }] : []),
    ...(pastPeakWines.length > 0 ? [{ type: "warning" as const, label: "Passando do pico", count: pastPeakWines.length, icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.06)" }] : []),
    ...(lowStockWines.length > 0 ? [{ type: "info" as const, label: "Estoque baixo", count: lowStockWines.length, icon: ArrowDownRight, color: "#E07A5F", bg: "rgba(224,122,95,0.06)" }] : []),
  ];

  return (
    <div className="space-y-6 max-w-6xl relative">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex items-end justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold" style={{ letterSpacing: "-0.03em", color: "#0F0F14" }}>
            Olá, {firstName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>Resumo da sua adega</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="glass-card p-5 group"
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: `${m.color}10` }}>
                <m.icon className="h-[18px] w-[18px]" style={{ color: m.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold font-sans tracking-tight" style={{ color: "#0F0F14" }}>{m.value}</p>
            <p className="text-[11px] mt-1 font-medium" style={{ color: "#9CA3AF" }}>{m.label}</p>
            {m.change && <p className="text-[10px] mt-1.5 font-medium" style={{ color: m.color }}>{m.change}</p>}
          </motion.div>
        ))}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="space-y-3">
          <h2 className="text-sm font-semibold font-sans flex items-center gap-2" style={{ color: "#0F0F14" }}>
            <span className="text-[16px]">🚨</span> Alertas inteligentes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {alerts.map((a) => (
              <div
                key={a.label}
                className="glass-card p-4 flex items-center gap-3.5 cursor-pointer"
                onClick={() => a.type === "success" && navigate("/dashboard/cellar")}
              >
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ background: a.bg }}>
                  <a.icon className="h-[18px] w-[18px]" style={{ color: a.color }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "#0F0F14" }}>{a.label}</p>
                  <p className="text-[11px] font-medium" style={{ color: a.color }}>{a.count} {a.count === 1 ? "vinho" : "vinhos"}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Charts Row */}
      {totalBottles > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Collection evolution */}
          <motion.div
            className="glass-card p-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={6}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[14px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Evolução da coleção</h3>
                <p className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>Garrafas ao longo do tempo</p>
              </div>
              <BarChart3 className="h-4 w-4" style={{ color: "#9CA3AF" }} />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={collectionData}>
                <defs>
                  <linearGradient id="colorGarrafas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8F2D56" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8F2D56" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                  labelStyle={{ color: "#0F0F14", fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="garrafas" stroke="#8F2D56" strokeWidth={2} fill="url(#colorGarrafas)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Monthly consumption */}
          <motion.div
            className="glass-card p-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={7}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[14px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Consumo mensal</h3>
                <p className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>Garrafas abertas por mês</p>
              </div>
              <Wine className="h-4 w-4" style={{ color: "#9CA3AF" }} />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={consumptionData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={20} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                  labelStyle={{ color: "#0F0F14", fontWeight: 600 }}
                />
                <Bar dataKey="consumo" fill="#C44569" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* Drink Now List */}
      {drinkNowWines.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold font-sans" style={{ color: "#0F0F14" }}>🍷 Prontos para beber</h2>
            <button
              className="text-[12px] font-medium transition-colors duration-200"
              style={{ color: "#8F2D56" }}
              onClick={() => navigate("/dashboard/cellar")}
            >
              Ver todos →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drinkNowWines.map(w => (
              <div key={w.id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.06)" }}>
                  <GlassWater className="h-[18px] w-[18px]" style={{ color: "#22c55e" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "#0F0F14" }}>{w.name}</p>
                  <p className="text-[11px]" style={{ color: "#9CA3AF" }}>{w.producer} {w.vintage ? `· ${w.vintage}` : ""}</p>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: "rgba(34,197,94,0.06)", color: "#22c55e" }}>
                  No pico
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {totalBottles === 0 && (
        <motion.div
          className="glass-card p-14 text-center relative overflow-hidden"
          initial="hidden" animate="visible" variants={fadeUp} custom={5}
        >
          <WineMesh variant="empty-state" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-[16px] gradient-wine flex items-center justify-center mx-auto mb-5" style={{ boxShadow: "0 8px 24px rgba(143,45,86,0.2)" }}>
              <Wine className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-base font-semibold mb-2 font-sans tracking-tight" style={{ color: "#0F0F14" }}>
              Sua adega está vazia
            </h3>
            <p className="text-sm mb-8 max-w-sm mx-auto leading-relaxed" style={{ color: "#6B7280" }}>
              Comece adicionando seu primeiro vinho e descubra insights inteligentes sobre sua coleção.
            </p>
            <Button
              onClick={() => setAddOpen(true)}
              className="gradient-wine text-white btn-glow h-[52px] px-8 text-[14px] font-semibold border-0 rounded-[14px]"
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar primeiro vinho
            </Button>
          </div>
        </motion.div>
      )}

      {/* FAB — Floating Action Button */}
      <motion.button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer"
        style={{
          background: "linear-gradient(135deg, #8F2D56, #C44569)",
          boxShadow: "0 8px 24px rgba(143,45,86,0.3), 0 2px 8px rgba(0,0,0,0.1)",
        }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 15 }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}
