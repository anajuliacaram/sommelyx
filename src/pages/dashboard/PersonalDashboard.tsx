import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wine, TrendingUp, GlassWater, Plus, AlertTriangle, ArrowDownRight,
  BarChart3, Package, Star, Upload, ShoppingCart, Clock, Globe, Grape
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { WineMesh } from "@/components/WineMesh";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { useWineMetrics } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.45, ease: [0.4, 0, 0.2, 1] as const },
  }),
} as const;

const currentYear = new Date().getFullYear();

const PIE_COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e"];

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";
  const { totalBottles, totalValue, drinkNow, recentCount, lowStock, wines } = useWineMetrics();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");

  // Drink window data
  const drinkWindowData = useMemo(() => {
    const late = wines.filter(w => w.drink_until && currentYear > w.drink_until && w.quantity > 0).length;
    const now = wines.filter(w => w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until && w.quantity > 0).length;
    const future = wines.filter(w => w.drink_from && currentYear < w.drink_from && w.quantity > 0).length;
    return [
      { name: "Atrasados", value: late, color: "#E07A5F" },
      { name: "Agora", value: now, color: "#22c55e" },
      { name: "Futuro", value: future, color: "#8F2D56" },
    ].filter(d => d.value > 0);
  }, [wines]);

  // Composition data (by style)
  const compositionData = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach(w => {
      const key = w.style || "Outro";
      map[key] = (map[key] || 0) + w.quantity;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [wines]);

  // Country composition
  const countryData = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach(w => {
      const key = w.country || "Outro";
      map[key] = (map[key] || 0) + w.quantity;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [wines]);

  // Recent wines
  const recentWines = wines
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Average rating
  const avgRating = useMemo(() => {
    const rated = wines.filter(w => w.rating);
    if (rated.length === 0) return 0;
    return (rated.reduce((s, w) => s + (w.rating ?? 0), 0) / rated.length).toFixed(1);
  }, [wines]);

  // Collection chart
  const collectionData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map((m, i) => ({
      name: m,
      garrafas: Math.max(0, totalBottles - (currentMonth - i) * Math.ceil(totalBottles * 0.08)),
    }));
  }, [totalBottles]);

  const alerts = [
    ...(drinkNow > 0 ? [{ label: "Beber agora", count: drinkNow, icon: GlassWater, color: "#22c55e", bg: "rgba(34,197,94,0.06)" }] : []),
    ...(wines.filter(w => w.drink_until && currentYear > w.drink_until && w.quantity > 0).length > 0
      ? [{ label: "Passando do pico", count: wines.filter(w => w.drink_until && currentYear > w.drink_until && w.quantity > 0).length, icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.06)" }]
      : []),
    ...(lowStock > 0 ? [{ label: "Estoque baixo", count: lowStock, icon: ArrowDownRight, color: "#E07A5F", bg: "rgba(224,122,95,0.06)" }] : []),
  ];

  const quickActions = [
    { label: "Abrir agora", desc: "Registrar abertura", icon: GlassWater, color: "#22c55e", bg: "rgba(34,197,94,0.06)", onClick: () => { setManageTab("open"); setManageOpen(true); } },
    { label: "Registrar saída", desc: "Saída de garrafa", icon: ArrowDownRight, color: "#E07A5F", bg: "rgba(224,122,95,0.06)", onClick: () => { setManageTab("exit"); setManageOpen(true); } },
    { label: "Comprar reposição", desc: "Adicionar ao estoque", icon: ShoppingCart, color: "#8F2D56", bg: "rgba(143,45,86,0.06)", onClick: () => { setManageTab("add"); setManageOpen(true); } },
    { label: "Importar CSV", desc: "Upload em lote", icon: Upload, color: "#C9A86A", bg: "rgba(201,168,106,0.06)", onClick: () => setCsvOpen(true) },
  ];

  const metrics = [
    { label: "Garrafas", value: totalBottles.toString(), icon: Wine, color: "#8F2D56", badge: recentCount > 0 ? `+${recentCount}` : undefined },
    { label: "Valor estimado", value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, icon: TrendingUp, color: "#C44569" },
    { label: "Nota média", value: avgRating.toString(), icon: Star, color: "#C9A86A", badge: undefined },
    { label: "Alertas ativos", value: alerts.length.toString(), icon: AlertTriangle, color: "#E07A5F", badge: alerts.length > 0 ? `${alerts.length}` : undefined },
  ];

  return (
    <div className="space-y-5 max-w-6xl relative">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex items-end justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold tracking-tight" style={{ color: "#0F0F14" }}>
            Olá, {firstName}
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#6B7280" }}>Resumo da sua adega</p>
        </div>
      </motion.div>

      {/* ─── Hoje — Quick Actions ─── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="space-y-2.5">
        <h2 className="text-[13px] font-semibold font-sans uppercase tracking-[0.08em]" style={{ color: "#9CA3AF" }}>Hoje</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="glass-card p-4 flex items-center gap-3 text-left cursor-pointer group transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: a.bg }}>
                <a.icon className="h-4 w-4" style={{ color: a.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: "#0F0F14" }}>{a.label}</p>
                <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="glass-card p-4 group"
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: `${m.color}10` }}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
              {m.badge && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: m.color }}>
                  {m.badge}
                </span>
              )}
            </div>
            <p className="text-xl font-bold font-sans tracking-tight" style={{ color: "#0F0F14" }}>{m.value}</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: "#9CA3AF" }}>{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ─── Alerts ─── */}
      {alerts.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6} className="space-y-2.5">
          <h2 className="text-[13px] font-semibold font-sans uppercase tracking-[0.08em] flex items-center gap-1.5" style={{ color: "#9CA3AF" }}>
            🚨 Alertas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {alerts.map((a) => (
              <div key={a.label} className="glass-card p-3.5 flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard/cellar")}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: a.bg }}>
                  <a.icon className="h-4 w-4" style={{ color: a.color }} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "#0F0F14" }}>{a.label}</p>
                  <p className="text-[10px] font-medium" style={{ color: a.color }}>{a.count} {a.count === 1 ? "vinho" : "vinhos"}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Charts: Drink Window + Composition ─── */}
      {totalBottles > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Drink Window */}
          <motion.div className="glass-card p-5 lg:col-span-1" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
            <h3 className="text-[13px] font-semibold font-sans mb-1" style={{ color: "#0F0F14" }}>Drink Window</h3>
            <p className="text-[10px] mb-3" style={{ color: "#9CA3AF" }}>Janela de consumo</p>
            {drinkWindowData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={drinkWindowData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={3} dataKey="value">
                      {drinkWindowData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {drinkWindowData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[10px] font-medium" style={{ color: "#6B7280" }}>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-center py-8" style={{ color: "#9CA3AF" }}>Defina janelas de consumo nos vinhos</p>
            )}
          </motion.div>

          {/* Collection evolution */}
          <motion.div className="glass-card p-5 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[13px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Evolução da coleção</h3>
                <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>Garrafas ao longo do tempo</p>
              </div>
              <BarChart3 className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={collectionData}>
                <defs>
                  <linearGradient id="colorGarrafas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8F2D56" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#8F2D56" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }} />
                <Area type="monotone" dataKey="garrafas" stroke="#8F2D56" strokeWidth={2} fill="url(#colorGarrafas)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* ─── Composition Row ─── */}
      {totalBottles > 0 && (compositionData.length > 0 || countryData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Style */}
          {compositionData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={9}>
              <div className="flex items-center gap-2 mb-3">
                <Grape className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
                <h3 className="text-[13px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Por estilo</h3>
              </div>
              <div className="space-y-2">
                {compositionData.map((d, i) => {
                  const pct = totalBottles > 0 ? Math.round((d.value / totalBottles) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <span className="text-[11px] font-medium w-20 truncate" style={{ color: "#6B7280" }}>{d.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-[10px] font-bold w-8 text-right" style={{ color: "#0F0F14" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* By Country */}
          {countryData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={10}>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
                <h3 className="text-[13px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Por país</h3>
              </div>
              <div className="space-y-2">
                {countryData.map((d, i) => {
                  const pct = totalBottles > 0 ? Math.round((d.value / totalBottles) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <span className="text-[11px] font-medium w-20 truncate" style={{ color: "#6B7280" }}>{d.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-[10px] font-bold w-8 text-right" style={{ color: "#0F0F14" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ─── Recentes ─── */}
      {recentWines.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={11} className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold font-sans uppercase tracking-[0.08em]" style={{ color: "#9CA3AF" }}>
              <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Recentes
            </h2>
            <button className="text-[11px] font-medium" style={{ color: "#8F2D56" }} onClick={() => navigate("/dashboard/cellar")}>
              Ver todos →
            </button>
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5" style={{ color: "#9CA3AF" }}>Vinho</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell" style={{ color: "#9CA3AF" }}>Estilo</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5" style={{ color: "#9CA3AF" }}>Qtd</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5 hidden md:table-cell" style={{ color: "#9CA3AF" }}>Adicionado</th>
                </tr>
              </thead>
              <tbody>
                {recentWines.map((w, i) => (
                  <tr
                    key={w.id}
                    className="transition-colors duration-150 hover:bg-black/[0.015] cursor-pointer"
                    style={{ borderBottom: i < recentWines.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
                    onClick={() => navigate("/dashboard/cellar")}
                  >
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-semibold truncate max-w-[180px]" style={{ color: "#0F0F14" }}>{w.name}</p>
                      <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{w.producer}{w.vintage ? ` · ${w.vintage}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(143,45,86,0.06)", color: "#8F2D56" }}>
                        {w.style || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[12px] font-bold" style={{ color: "#0F0F14" }}>{w.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                        {new Date(w.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {totalBottles === 0 && (
        <motion.div className="glass-card p-12 text-center relative overflow-hidden" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <WineMesh variant="empty-state" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-[14px] gradient-wine flex items-center justify-center mx-auto mb-4" style={{ boxShadow: "0 6px 20px rgba(143,45,86,0.2)" }}>
              <Wine className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-[15px] font-semibold mb-1.5 font-sans tracking-tight" style={{ color: "#0F0F14" }}>
              Sua adega está vazia
            </h3>
            <p className="text-[13px] mb-6 max-w-xs mx-auto" style={{ color: "#6B7280" }}>
              Adicione seu primeiro vinho e descubra insights da sua coleção.
            </p>
            <Button
              onClick={() => setAddOpen(true)}
              className="cta-primary-btn h-[46px] px-7 text-[13px] font-semibold text-white border-0 rounded-[14px]"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar primeiro vinho
            </Button>
          </div>
        </motion.div>
      )}

      {/* FAB */}
      <motion.button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-13 h-13 rounded-full flex items-center justify-center text-white cursor-pointer"
        style={{
          background: "linear-gradient(135deg, #8F2D56, #C44569)",
          boxShadow: "0 8px 24px rgba(143,45,86,0.3), 0 2px 8px rgba(0,0,0,0.1)",
          width: 52, height: 52,
        }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 15 }}
      >
        <Plus className="h-5 w-5" />
      </motion.button>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab={manageTab} />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </div>
  );
}
