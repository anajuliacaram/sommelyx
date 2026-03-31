import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Package, AlertTriangle, ShoppingCart, TrendingUp, Plus,
  ArrowDownRight, BarChart3, Upload, Clock, Layers, FileText, Users
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
import { MagneticButton } from "@/components/ui/magnetic-button";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { PremiumKpiCard } from "@/components/ui/premium-kpi-card";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { DashboardProfileProgress } from "@/components/DashboardProfileProgress";
import { ContextualSuggestions } from "@/components/ContextualSuggestions";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardExecutiveSummary } from "@/components/DashboardExecutiveSummary";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const PIE_COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e"];

export default function CommercialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Gestor";
  const { totalBottles, totalValue, lowStock, wines, isLoading } = useWineMetrics();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("sommelyx_onboarding_done_commercial"));
  const lowStockWines = wines.filter(w => w.quantity > 0 && w.quantity <= 2).slice(0, 6);

  const uniqueLabels = wines.filter(w => w.quantity > 0).length;

  const topSellers = useMemo(() => {
    return wines
      .filter(w => w.quantity > 0)
      .sort((a, b) => {
        const aVal = (a.current_value ?? a.purchase_price ?? 0) * a.quantity;
        const bVal = (b.current_value ?? b.purchase_price ?? 0) * b.quantity;
        return bVal - aVal;
      })
      .slice(0, 5);
  }, [wines]);

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

  const turnover = useMemo(() => {
    const recently = wines.filter(w => {
      const d = new Date(w.updated_at);
      return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
    }).length;
    return wines.length > 0 ? Math.round((recently / wines.length) * 100) : 0;
  }, [wines]);

  const metrics = [
    { label: "Rótulos ativos", value: uniqueLabels.toString(), icon: Package, color: "#8F2D56" },
    { label: "Total em estoque", value: `${totalBottles} un.`, icon: Layers, color: "#3b82f6" },
    { label: "Valor em estoque", value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, icon: DollarSign, color: "#C9A86A" },
    { label: "Estoque baixo", value: lowStock.toString(), icon: AlertTriangle, color: "#E07A5F" },
  ];

  return (
    <>
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard
            profileType="commercial"
            onComplete={() => {
              localStorage.setItem("sommelyx_onboarding_done_commercial", "true");
              setShowOnboarding(false);
            }}
          />
        )}
      </AnimatePresence>
    <div className="space-y-4 max-w-[1200px] relative">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <DashboardExecutiveSummary
          eyebrow="Operacao Comercial"
          title={`Painel de comando para ${firstName} acompanhar estoque, giro e margem.`}
          description="A operacao Sommelyx agora ganha um topo mais executivo, com sinais claros de reposicao, valor imobilizado e acoes prioritarias no mesmo campo visual."
          badges={[
            `${uniqueLabels} rotulos ativos`,
            `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} em estoque`,
            `${lowStock} itens em reposicao`,
          ]}
          metrics={[
            {
              label: "Valor imobilizado",
              value: `R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
              detail: "Leitura rapida do capital hoje parado em garrafas e caixas.",
              icon: DollarSign,
              tone: "gold",
            },
            {
              label: "Giro mensal",
              value: `${turnover}%`,
              detail: "Percentual de produtos movimentados nos ultimos 30 dias.",
              icon: TrendingUp,
              tone: turnover > 40 ? "emerald" : "wine",
            },
            {
              label: "Reposicao",
              value: lowStock.toString(),
              detail: "Itens que pedem acao para nao comprometer disponibilidade.",
              icon: AlertTriangle,
              tone: "wine",
            },
          ]}
          actions={[
            { label: "Cadastrar produto", onClick: () => setAddOpen(true), icon: Plus, variant: "premium" },
            { label: "Importar planilha", onClick: () => setCsvOpen(true), icon: Upload, variant: "outline" },
          ]}
        />
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-3 space-y-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-6 w-14 rounded" />
              <Skeleton className="h-2.5 w-16 rounded" />
            </div>
          ))
        ) : (
          metrics.map((m, i) => (
            <motion.div key={m.label} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
              <PremiumKpiCard
                className="p-4 group border border-white/5 ring-1 ring-black/[0.03]"
                onClick={() => navigate("/dashboard/inventory")}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}14` }}>
                    <m.icon className="h-5 w-5" style={{ color: m.color }} />
                  </div>
                </div>
                <p className="text-2xl font-black font-sans tracking-tight text-foreground">{m.value}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em] whitespace-nowrap">{m.label}</p>
              </PremiumKpiCard>
            </motion.div>
          ))
        )}
      </div>

      {/* Profile progress */}
      <DashboardProfileProgress wines={wines} profileType="commercial" />

      {/* Contextual Suggestions */}
      {wines.length > 0 && <ContextualSuggestions wines={wines} />}

      {/* Quick access links */}
      {totalBottles > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: Package, label: "Estoque", route: "/dashboard/inventory", color: "#8F2D56" },
              { icon: ShoppingCart, label: "Vendas", route: "/dashboard/sales", color: "#22c55e" },
              { icon: Users, label: "Cadastros", route: "/dashboard/registers", color: "#3b82f6" },
              { icon: FileText, label: "Relatórios", route: "/dashboard/reports", color: "#C9A86A" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className="glass-card p-3 flex items-center gap-2.5 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}14` }}>
                  <item.icon className="h-4 w-4" style={{ color: item.color }} />
                </div>
                <span className="text-[13px] font-semibold text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main 2-column grid */}
      {totalBottles > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* LEFT (3/5) */}
          <div className="lg:col-span-3 space-y-3">
            {/* Low Stock */}
            {lowStockWines.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold font-sans text-foreground">⚠️ Reposição necessária</h2>
                    <p className="text-[11px] text-muted-foreground">Produtos com ≤ 2 unidades em estoque</p>
                  </div>
                  <Badge variant="secondary" className="text-[11px] h-6" style={{ background: "rgba(224,122,95,0.08)", color: "#E07A5F" }}>
                    {lowStock} itens
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {lowStockWines.map(w => (
                    <div key={w.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-black/[0.015]" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
                      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.08)" }}>
                        <ArrowDownRight className="h-3 w-3" style={{ color: "#f59e0b" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate text-foreground">{w.name}</p>
                        <p className="text-[11px] text-muted-foreground">{w.producer || "—"}</p>
                      </div>
                      <span className="text-[13px] font-bold" style={{ color: "#E07A5F" }}>{w.quantity} un.</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ABC Curve */}
            {abcData.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                <div className="flex items-center gap-1.5 mb-3">
                  <Layers className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <h2 className="text-sm font-semibold font-sans text-foreground">Curva ABC</h2>
                    <p className="text-[11px] text-muted-foreground">Top 10 por valor em estoque</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {abcData.map((w, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${w.cls === "A" ? "bg-green-100 text-green-700" : w.cls === "B" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{w.cls}</span>
                      <span className="text-[13px] font-medium flex-1 truncate text-foreground">{w.name}</span>
                      <span className="text-[12px] font-medium text-muted-foreground">R$ {w.value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                      <span className="text-[11px] font-bold w-10 text-right text-muted-foreground">{w.cumPct}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Top products by value */}
            {topSellers.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
                <h2 className="text-sm font-semibold font-sans text-foreground mb-0.5">Produtos com maior valor</h2>
                <p className="text-[11px] text-muted-foreground mb-3">Maiores investimentos em estoque</p>
                <div className="space-y-1.5">
                  {topSellers.map((w, i) => {
                    const val = (w.current_value ?? w.purchase_price ?? 0) * w.quantity;
                    return (
                      <div key={w.id} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
                        <span className="text-[11px] font-bold text-muted-foreground w-4">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate text-foreground">{w.name}</p>
                          <p className="text-[11px] text-muted-foreground">{w.quantity} un. · {w.style || "—"}</p>
                        </div>
                        <span className="text-[13px] font-bold text-foreground">R$ {val.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT (2/5) — charts */}
          <div className="lg:col-span-2 space-y-3">
            {/* Giro KPI */}
            <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold font-sans text-foreground">Giro (30 dias)</h3>
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-foreground">{turnover}%</span>
                <span className="text-xs text-muted-foreground font-medium">dos produtos movimentados</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-black/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: turnover > 50 ? "#22c55e" : turnover > 25 ? "#f59e0b" : "#E07A5F" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(turnover, 100)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </motion.div>

            {/* Bar chart */}
            {styleData.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold font-sans text-foreground">Volume por categoria</h3>
                    <p className="text-[11px] text-muted-foreground">Distribuição atual do estoque</p>
                  </div>
                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={styleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {styleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Pie chart */}
            {styleData.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
                <h3 className="text-sm font-semibold font-sans text-foreground mb-0.5">Composição</h3>
                <p className="text-[11px] text-muted-foreground mb-2">Por tipo de produto</p>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={styleData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={3} dataKey="value">
                      {styleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-1.5">
                  {styleData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[11px] font-medium text-muted-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalBottles === 0 && (
        <PremiumEmptyState
          icon={Package}
          title="Controle total do seu estoque"
          description="Cadastre seus primeiros produtos para acompanhar valor, giro e níveis de estoque em tempo real."
          primaryAction={{
            label: "Cadastrar produto",
            onClick: () => setAddOpen(true),
            icon: <Plus className="h-4 w-4" />
          }}
          secondaryAction={{
            label: "Importar lista CSV",
            onClick: () => setCsvOpen(true)
          }}
        />
      )}

      {/* FAB */}
      <motion.button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center text-white cursor-pointer"
        style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)", boxShadow: "0 6px 20px rgba(143,45,86,0.3)" }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 15 }}
      >
        <Plus className="h-4.5 w-4.5" />
      </motion.button>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab="exit" />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </div>
    </>
  );
}
