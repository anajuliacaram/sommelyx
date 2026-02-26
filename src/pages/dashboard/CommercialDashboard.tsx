import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Package, AlertTriangle, ShoppingCart, TrendingUp, Plus,
  ArrowDownRight, BarChart3, Upload, Clock, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { WineMesh } from "@/components/WineMesh";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { useWineMetrics, useWineEvent } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const PIE_COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e"];

export default function CommercialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Gestor";
  const { totalBottles, totalValue, lowStock, wines } = useWineMetrics();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const lowStockWines = wines.filter(w => w.quantity > 0 && w.quantity <= 2).slice(0, 6);

  // ABC Curve (by value)
  const abcData = useMemo(() => {
    const sorted = wines.filter(w => w.quantity > 0).map(w => ({
      name: w.name,
      value: (w.current_value ?? w.purchase_price ?? 0) * w.quantity,
      qty: w.quantity,
    })).sort((a, b) => b.value - a.value);

    const total = sorted.reduce((s, w) => s + w.value, 0);
    let cumulative = 0;
    return sorted.slice(0, 10).map(w => {
      cumulative += w.value;
      const pct = total > 0 ? Math.round((cumulative / total) * 100) : 0;
      const cls = pct <= 80 ? "A" : pct <= 95 ? "B" : "C";
      return { ...w, cumPct: pct, cls };
    });
  }, [wines]);

  // Stock by style
  const styleData = useMemo(() => {
    const map: Record<string, number> = {};
    wines.filter(w => w.quantity > 0).forEach(w => {
      const key = w.style || "Outro";
      map[key] = (map[key] || 0) + w.quantity;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [wines]);

  // Stock turnover estimate (items updated recently vs total)
  const turnover = useMemo(() => {
    const recently = wines.filter(w => {
      const d = new Date(w.updated_at);
      return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
    }).length;
    return wines.length > 0 ? Math.round((recently / wines.length) * 100) : 0;
  }, [wines]);

  const metrics = [
    { label: "Estoque total", value: `${totalBottles} un.`, icon: Package, color: "#8F2D56" },
    { label: "Valor em estoque", value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, icon: DollarSign, color: "#C9A86A" },
    { label: "Giro de estoque", value: `${turnover}%`, icon: TrendingUp, color: "#22c55e" },
    { label: "Itens baixo estoque", value: lowStock.toString(), icon: AlertTriangle, color: "#E07A5F" },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] relative">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight" style={{ color: "#0F0F14", letterSpacing: "-0.03em" }}>
            Olá, {firstName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-[12px] font-semibold transition-all duration-300" onClick={() => setCsvOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar CSV
          </Button>
          <Button variant="premium" size="sm" className="h-9 px-4 text-[12px] font-bold" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Cadastrar produto
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards — Commercial focus */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="glass-card p-5 group cursor-pointer"
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
            onClick={() => navigate("/dashboard/inventory")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: `${m.color}12` }}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold font-sans tracking-tight" style={{ color: "#0F0F14" }}>{m.value}</p>
            <p className="text-[11px] mt-1 font-medium" style={{ color: "#9CA3AF" }}>{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Low stock + ABC side by side */}
      {totalBottles > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Low Stock */}
          {lowStockWines.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[13px] font-semibold font-sans" style={{ color: "#0F0F14" }}>⚠️ Baixo estoque</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>Produtos com ≤ 2 unidades</p>
                </div>
                <Badge variant="secondary" className="text-[10px]" style={{ background: "rgba(224,122,95,0.08)", color: "#E07A5F" }}>
                  {lowStock} itens
                </Badge>
              </div>
              <div className="space-y-2">
                {lowStockWines.map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-2.5 rounded-[12px] transition-colors hover:bg-black/[0.02]" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.08)" }}>
                      <ArrowDownRight className="h-3.5 w-3.5" style={{ color: "#f59e0b" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "#0F0F14" }}>{w.name}</p>
                      <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{w.producer || "—"}</p>
                    </div>
                    <span className="text-[12px] font-bold" style={{ color: "#E07A5F" }}>{w.quantity} un.</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ABC Curve */}
          {abcData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
                <div>
                  <h2 className="text-[13px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Curva ABC</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>Top 10 por valor em estoque</p>
                </div>
              </div>
              <div className="space-y-2">
                {abcData.map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${w.cls === "A" ? "bg-green-100 text-green-700" : w.cls === "B" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                      }`}>{w.cls}</span>
                    <span className="text-[11px] font-medium flex-1 truncate" style={{ color: "#0F0F14" }}>{w.name}</span>
                    <span className="text-[10px] font-medium" style={{ color: "#6B7280" }}>R$ {w.value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                    <span className="text-[9px] font-bold w-10 text-right" style={{ color: "#9CA3AF" }}>{w.cumPct}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Charts */}
      {totalBottles > 0 && styleData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stock by style bar chart */}
          <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[13px] font-semibold font-sans" style={{ color: "#0F0F14" }}>Estoque por estilo</h3>
                <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>Distribuição atual</p>
              </div>
              <BarChart3 className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={styleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {styleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Composition pie */}
          <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
            <h3 className="text-[13px] font-semibold font-sans mb-1" style={{ color: "#0F0F14" }}>Composição do estoque</h3>
            <p className="text-[10px] mb-3" style={{ color: "#9CA3AF" }}>Por estilo de vinho</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={styleData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {styleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {styleData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[10px] font-medium" style={{ color: "#6B7280" }}>{d.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Alertas operacionais */}
      {lowStock > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={9}>
          <h2 className="text-[12px] font-semibold font-sans uppercase tracking-[0.08em] mb-2.5" style={{ color: "#9CA3AF" }}>
            Alertas operacionais
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="glass-card p-4 flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard/inventory")}>
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(224,122,95,0.07)" }}>
                <AlertTriangle className="h-4 w-4" style={{ color: "#E07A5F" }} />
              </div>
              <div>
                <p className="text-[12px] font-semibold" style={{ color: "#0F0F14" }}>{lowStock}</p>
                <p className="text-[10px] font-medium" style={{ color: "#E07A5F" }}>Baixo estoque</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {totalBottles === 0 && (
        <motion.div className="glass-card p-12 text-center relative overflow-hidden" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <WineMesh variant="empty-state" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-[16px] gradient-wine flex items-center justify-center mx-auto mb-5" style={{ boxShadow: "0 8px 24px rgba(143,45,86,0.2)" }}>
              <Package className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 font-sans tracking-tight" style={{ color: "#0F0F14" }}>
              Comece a gerenciar seu estoque
            </h3>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "#6B7280" }}>
              Cadastre produtos, registre vendas e acompanhe métricas em tempo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="premium" onClick={() => setAddOpen(true)} className="h-[48px] px-8 text-[14px] font-bold rounded-[16px]">
                <Plus className="h-4 w-4 mr-1.5" /> Cadastrar produto
              </Button>
              <Button variant="outline" onClick={() => setCsvOpen(true)} className="h-[48px] px-6 text-[13px] font-bold rounded-[16px]">
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
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab="exit" />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </div>
  );
}
