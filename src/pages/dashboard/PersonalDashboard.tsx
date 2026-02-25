import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Wine, TrendingUp, GlassWater, Plus, AlertTriangle, ArrowDownRight,
  BarChart3, Star, Upload, ShoppingCart, Clock, Globe, Grape, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { WineMesh } from "@/components/WineMesh";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { useWineMetrics, useWineEvent } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 12 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const currentYear = new Date().getFullYear();
const PIE_COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e"];

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";
  const { totalBottles, totalValue, drinkNow, recentCount, lowStock, wines } = useWineMetrics();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const wineEvent = useWineEvent();

  // Suggestions: wines in drink window
  const suggestions = useMemo(() => {
    return wines
      .filter(w => w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until && w.quantity > 0)
      .slice(0, 5);
  }, [wines]);

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
    if (rated.length === 0) return "—";
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

  const pastPeak = wines.filter(w => w.drink_until && currentYear > w.drink_until && w.quantity > 0).length;
  const noLocation = wines.filter(w => w.quantity > 0 && !w.cellar_location).length;

  const alerts = [
    ...(drinkNow > 0 ? [{ label: "Beber agora", count: drinkNow, icon: GlassWater, color: "#22c55e", bg: "rgba(34,197,94,0.07)" }] : []),
    ...(pastPeak > 0 ? [{ label: "Passaram do pico", count: pastPeak, icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.07)" }] : []),
    ...(lowStock > 0 ? [{ label: "Estoque baixo", count: lowStock, icon: ArrowDownRight, color: "#E07A5F", bg: "rgba(224,122,95,0.07)" }] : []),
    ...(noLocation > 0 ? [{ label: "Sem localização", count: noLocation, icon: MapPin, color: "#6B7280", bg: "rgba(107,114,128,0.07)" }] : []),
  ];

  const handleOpenBottle = async (wineId: string, wineName: string) => {
    try {
      await wineEvent.mutateAsync({ wineId, eventType: "open", quantity: 1 });
      toast({ title: `🍷 "${wineName}" aberto!`, description: "Saída registrada com sucesso." });
    } catch {
      toast({ title: "Erro ao registrar abertura", variant: "destructive" });
    }
  };

  const metrics = [
    { label: "Garrafas em estoque", value: totalBottles.toString(), icon: Wine, color: "#8F2D56", badge: recentCount > 0 ? `+${recentCount}` : undefined, onClick: () => navigate("/dashboard/cellar") },
    { label: "Valor estimado", value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, icon: TrendingUp, color: "#C44569", onClick: undefined },
    { label: "Beber agora", value: drinkNow.toString(), icon: GlassWater, color: "#22c55e", badge: undefined, onClick: () => navigate("/dashboard/cellar") },
    { label: "Baixo estoque", value: lowStock.toString(), icon: AlertTriangle, color: "#E07A5F", badge: undefined, onClick: () => navigate("/dashboard/cellar") },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] relative">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight" style={{ color: "#0F0F14", letterSpacing: "-0.03em" }}>
            Olá, {firstName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>Resumo da sua adega</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-[12px] font-medium" onClick={() => setCsvOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar CSV
          </Button>
          <Button size="sm" className="gradient-wine text-white btn-glow h-9 px-4 text-[12px] font-semibold border-0" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar vinho
          </Button>
        </div>
      </motion.div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="glass-card p-5 group cursor-pointer"
            onClick={m.onClick}
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: `${m.color}12` }}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
              {m.badge && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: m.color }}>
                  {m.badge}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold font-sans tracking-tight" style={{ color: "#0F0F14" }}>{m.value}</p>
            <p className="text-[11px] mt-1 font-medium" style={{ color: "#9CA3AF" }}>{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ─── O que abrir hoje ─── */}
      {suggestions.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="glass-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold font-sans" style={{ color: "#0F0F14" }}>🍷 O que abrir hoje?</h2>
              <p className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>Vinhos na janela ideal de consumo</p>
            </div>
            <button className="text-[11px] font-semibold" style={{ color: "#8F2D56" }} onClick={() => navigate("/dashboard/cellar")}>
              Ver todos →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-3 rounded-[14px] transition-all duration-200 hover:bg-black/[0.02]" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.08)" }}>
                  <GlassWater className="h-4 w-4" style={{ color: "#22c55e" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold truncate" style={{ color: "#0F0F14" }}>{w.name}</p>
                  <p className="text-[10px]" style={{ color: "#9CA3AF" }}>
                    {[w.vintage, w.producer].filter(Boolean).join(" · ")} · {w.quantity} un.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] px-2.5 shrink-0 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                  onClick={() => handleOpenBottle(w.id, w.name)}
                  disabled={wineEvent.isPending}
                >
                  Abrir
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Alerts ─── */}
      {alerts.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          <h2 className="text-[12px] font-semibold font-sans uppercase tracking-[0.08em] mb-2.5" style={{ color: "#9CA3AF" }}>
            Alertas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {alerts.map((a) => (
              <div key={a.label} className="glass-card p-4 flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard/alerts")}>
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: a.bg }}>
                  <a.icon className="h-4 w-4" style={{ color: a.color }} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: "#0F0F14" }}>{a.count}</p>
                  <p className="text-[10px] font-medium" style={{ color: a.color }}>{a.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Charts ─── */}
      {totalBottles > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Drink Window */}
          {drinkWindowData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
              <h3 className="text-[13px] font-semibold font-sans mb-1" style={{ color: "#0F0F14" }}>Drink Window</h3>
              <p className="text-[10px] mb-3" style={{ color: "#9CA3AF" }}>Janela de consumo</p>
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
            </motion.div>
          )}

          {/* Collection evolution */}
          <motion.div className={`glass-card p-5 ${drinkWindowData.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`} initial="hidden" animate="visible" variants={fadeUp} custom={8}>
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
          {compositionData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={9}>
              <div className="flex items-center gap-2 mb-3">
                <Grape className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
                <h3 className="text-[13px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Por estilo</h3>
              </div>
              <div className="space-y-2.5">
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

          {countryData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={10}>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
                <h3 className="text-[13px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Por país</h3>
              </div>
              <div className="space-y-2.5">
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
            <h2 className="text-[12px] font-semibold font-sans uppercase tracking-[0.08em]" style={{ color: "#9CA3AF" }}>
              <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Recentemente adicionados
            </h2>
            <button className="text-[11px] font-semibold" style={{ color: "#8F2D56" }} onClick={() => navigate("/dashboard/cellar")}>
              Ver todos →
            </button>
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5" style={{ color: "#9CA3AF" }}>Vinho</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5 hidden sm:table-cell" style={{ color: "#9CA3AF" }}>Estilo</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5 hidden md:table-cell" style={{ color: "#9CA3AF" }}>Local</th>
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
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[10px]" style={{ color: "#6B7280" }}>{w.cellar_location || "—"}</span>
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
            <div className="w-14 h-14 rounded-[16px] gradient-wine flex items-center justify-center mx-auto mb-5" style={{ boxShadow: "0 8px 24px rgba(143,45,86,0.2)" }}>
              <Wine className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 font-sans tracking-tight" style={{ color: "#0F0F14" }}>
              Sua adega está vazia
            </h3>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "#6B7280" }}>
              Adicione seu primeiro vinho e descubra insights da sua coleção.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setAddOpen(true)}
                className="cta-primary-btn h-[48px] px-8 text-[14px] font-semibold text-white border-0 rounded-[14px]"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Adicionar vinho
              </Button>
              <Button variant="outline" onClick={() => setCsvOpen(true)} className="h-[48px] px-6 text-[13px] rounded-[14px]">
                <Upload className="h-4 w-4 mr-1.5" /> Importar CSV
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* FAB */}
      <motion.button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full flex items-center justify-center text-white cursor-pointer"
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
