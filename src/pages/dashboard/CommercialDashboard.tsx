import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  DollarSign,
  FileText,
  Layers,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Upload,
  Users,
} from "@/icons/lucide";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSales } from "@/hooks/useBusinessData";
import { useWineMetrics } from "@/hooks/useWines";

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.035, duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const formatCompactBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function buildMonthWindow(size: number) {
  const months: Array<{ key: string; label: string }> = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - (size - 1));
  for (let i = 0; i < size; i++) {
    const d = new Date(cursor);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    months.push({ key, label });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export default function CommercialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { totalBottles, totalValue, lowStock, wines, isLoading } = useWineMetrics();
  const { data: sales = [], isLoading: salesLoading } = useSales();

  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("sommelyx_onboarding_done_commercial"));

  const uniqueLabels = useMemo(() => wines.filter((w) => w.quantity > 0).length, [wines]);

  const turnover = useMemo(() => {
    const recently = wines.filter((w) => Date.now() - new Date(w.updated_at).getTime() < 30 * 24 * 60 * 60 * 1000).length;
    return wines.length > 0 ? Math.round((recently / wines.length) * 100) : 0;
  }, [wines]);

  const months = useMemo(() => buildMonthWindow(6), []);

  const { data: wineEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["wine_events", user?.id, "commercial-dashboard"],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 6);
      const { data, error } = await supabase
        .from("wine_events")
        .select("event_type,quantity,created_at")
        .eq("user_id", user!.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const salesMonthly = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + (s.price ?? 0) * (s.quantity ?? 0);
    });
    return months.map((m) => ({ name: m.label, value: Math.round(map[m.key] || 0) }));
  }, [sales, months]);

  const stockMovesMonthly = useMemo(() => {
    const inMap: Record<string, number> = {};
    const outMap: Record<string, number> = {};
    (wineEvents as any[]).forEach((e) => {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const qty = Number(e.quantity ?? 0);
      if (e.event_type === "add") inMap[key] = (inMap[key] || 0) + qty;
      else outMap[key] = (outMap[key] || 0) + qty;
    });
    return months.map((m) => ({
      name: m.label,
      in: inMap[m.key] || 0,
      out: outMap[m.key] || 0,
      net: (inMap[m.key] || 0) - (outMap[m.key] || 0),
    }));
  }, [wineEvents, months]);

  const kpis = useMemo(
    () => [
      {
        label: "Estoque total",
        value: `${totalBottles} un.`,
        detail: "Quantidade total de itens disponíveis",
        icon: Layers,
        tone: "wine" as const,
      },
      {
        label: "Valor imobilizado",
        value: formatCompactBRL(totalValue),
        detail: "Valor investido no estoque",
        icon: DollarSign,
        tone: "gold" as const,
      },
      {
        label: "Giro mensal",
        value: `${turnover}%`,
        detail: "Percentual de produtos movimentados no mês",
        icon: TrendingUp,
        tone: "wine" as const,
      },
      {
        label: "Reposição",
        value: `${lowStock}`,
        detail: "Itens com estoque baixo (2 ou menos)",
        icon: AlertTriangle,
        tone: "wine" as const,
      },
    ],
    [lowStock, totalBottles, totalValue, turnover],
  );

  const lowStockRows = useMemo(
    () =>
      wines
        .filter((w) => w.quantity > 0 && w.quantity <= 2)
        .slice()
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 8),
    [wines],
  );

  const stockRows = useMemo(() => {
    return wines
      .filter((w) => w.quantity > 0)
      .slice()
      .sort((a, b) => {
        const aVal = (a.current_value ?? a.purchase_price ?? 0) * a.quantity;
        const bVal = (b.current_value ?? b.purchase_price ?? 0) * b.quantity;
        return bVal - aVal;
      })
      .slice(0, 14)
      .map((w) => ({
        id: w.id,
        name: w.name,
        producer: w.producer,
        qty: w.quantity,
        value: (w.current_value ?? w.purchase_price ?? 0) * w.quantity,
        low: w.quantity <= 2,
      }));
  }, [wines]);

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

      <div className="max-w-[1320px] space-y-3">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="glass-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Operação comercial</p>
                <h1 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-foreground sm:text-[34px]">
                  Resumo da operação
                </h1>
                <p className="mt-3 max-w-[720px] text-[13px] font-medium leading-relaxed text-muted-foreground">
                  Acompanhe seu estoque, vendas e reposições de forma rápida e clara.
                </p>
              </div>

	              <div className="flex flex-col items-start gap-2 lg:items-end">
	                <div className="flex flex-wrap items-center gap-2">
	                  <Button
	                    variant="primary"
	                    className="h-10 rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]"
	                    onClick={() => setAddOpen(true)}
	                  >
	                    <Plus className="mr-2 h-4 w-4" /> Cadastrar produto
	                  </Button>
	                  <Button
	                    variant="outline"
	                    className="h-10 rounded-2xl text-[12px] font-bold uppercase tracking-[0.10em]"
	                    onClick={() => navigate("/dashboard/sales")}
	                  >
	                    <ShoppingCart className="mr-2 h-4 w-4" /> Registrar venda
	                  </Button>
	                </div>

	                <button
	                  type="button"
	                  onClick={() => setCsvOpen(true)}
	                  className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-[#6E1E2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E1E2A]/20"
	                >
	                  <Upload className="h-4 w-4 opacity-70" />
	                  Importar planilha
	                </button>
	              </div>
	            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-2xl border border-black/[0.06] bg-white/70 p-3 shadow-sm">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-3 h-7 w-24" />
                  </div>
                ))
              ) : (
                kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-2xl border border-black/[0.06] bg-white/70 p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={[
                          "flex h-9 w-9 items-center justify-center rounded-2xl ring-1 ring-black/[0.04]",
                          kpi.tone === "gold" ? "bg-gold/10 text-gold" : "bg-wine/10 text-wine",
                        ].join(" ")}
                      >
                        <kpi.icon className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{kpi.label}</p>
                    </div>
                    <p className="mt-2 text-[20px] font-black tracking-tight text-foreground">{kpi.value}</p>
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">{kpi.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {totalBottles === 0 ? (
          <PremiumEmptyState
            icon={Package}
            title="Controle total do seu estoque"
            description="Cadastre seus primeiros produtos para acompanhar valor, giro e níveis de estoque em tempo real."
            primaryAction={{
              label: "Cadastrar produto",
              onClick: () => setAddOpen(true),
              icon: <Plus className="h-4 w-4" />,
            }}
            secondaryAction={{
              label: "Importar lista CSV",
              onClick: () => setCsvOpen(true),
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-12 gap-3">
              <motion.div className="col-span-12 lg:col-span-7" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Estoque atual</p>
                      <h2 className="mt-1 text-[16px] font-bold tracking-tight text-foreground">Itens de maior impacto</h2>
                    </div>
                    <Button variant="ghost" className="h-9 rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]" onClick={() => navigate("/dashboard/inventory")}>
                      Ver estoque
                    </Button>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.06] bg-white/70">
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                      <div className="col-span-7">Produto</div>
                      <div className="col-span-2 text-right">Qtd.</div>
                      <div className="col-span-3 text-right">Valor</div>
                    </div>
                    <div className="divide-y divide-black/[0.06]">
                      {stockRows.map((row) => (
                        <Button
                          key={row.id}
                          type="button"
                          variant="ghost"
                          onClick={() => navigate(`/dashboard/inventory?q=${encodeURIComponent(row.name)}`)}
                          className="grid w-full grid-cols-12 items-center gap-2 px-3 py-2.5 text-left rounded-none h-auto justify-start hover:bg-muted/40"
                        >
                          <div className="col-span-7 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${row.low ? "bg-wine" : "bg-gold"}`} />
                              <p className="truncate text-[13px] font-semibold text-foreground">{row.name}</p>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{row.producer || "—"}</p>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={`text-[12px] font-black ${row.low ? "text-wine" : "text-foreground"}`}>{row.qty}</span>
                          </div>
                          <div className="col-span-3 text-right">
                            <span className="text-[12px] font-black text-foreground">{formatCompactBRL(row.value)}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="col-span-12 grid gap-3 lg:col-span-5">
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Alertas</p>
                        <h2 className="mt-1 text-[16px] font-bold tracking-tight text-foreground">Reposição</h2>
                      </div>
                      <Button variant="ghost" className="h-9 rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]" onClick={() => navigate("/dashboard/inventory")}>
                        Ajustar
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {lowStockRows.map((w) => (
                        <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/70 px-3 py-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-wine/10 text-wine ring-1 ring-black/[0.04]">
                            <ArrowDownRight className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-foreground">{w.name}</p>
                            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{w.producer || "—"}</p>
                          </div>
                          <span className="rounded-full bg-wine/10 px-2.5 py-1 text-[11px] font-black text-wine ring-1 ring-wine/15">
                            {w.quantity} un.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
                  <div className="glass-card p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Atalhos</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {[
                        { icon: Package, label: "Estoque", route: "/dashboard/inventory" },
                        { icon: ShoppingCart, label: "Vendas", route: "/dashboard/sales" },
                        { icon: Users, label: "Cadastros", route: "/dashboard/registers" },
                        { icon: FileText, label: "Relatórios", route: "/dashboard/reports" },
                      ].map((item) => (
                        <Button
                          key={item.label}
                          type="button"
                          variant="ghost"
                          onClick={() => navigate(item.route)}
                          className="flex h-11 items-center gap-2 rounded-2xl border border-border/70 bg-background/50 px-3 text-left hover:bg-background"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-wine/10 text-wine ring-1 ring-black/[0.04]">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <span className="text-[12px] font-bold text-foreground">{item.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Performance</p>
                      <h3 className="mt-1 text-[15px] font-bold tracking-tight text-foreground">Vendas (R$)</h3>
                    </div>
                    <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-black text-muted-foreground">
                      6 meses
                    </span>
                  </div>
                  <div className="mt-3 h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(23,20,29,0.6)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "rgba(23,20,29,0.45)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(255,255,255,0.92)",
                            border: "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 14,
                            fontSize: 12,
                            boxShadow: "0 16px 40px -28px rgba(15,15,20,0.65)",
                          }}
                          formatter={(v: any) => formatCompactBRL(Number(v))}
                        />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="hsl(var(--wine))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Estoque</p>
                      <h3 className="mt-1 text-[15px] font-bold tracking-tight text-foreground">Movimentação (un.)</h3>
                    </div>
                    <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-black text-muted-foreground">
                      6 meses
                    </span>
                  </div>
                  <div className="mt-3 h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockMovesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(23,20,29,0.6)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "rgba(23,20,29,0.45)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(255,255,255,0.92)",
                            border: "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 14,
                            fontSize: 12,
                            boxShadow: "0 16px 40px -28px rgba(15,15,20,0.65)",
                          }}
                        />
                        <Bar dataKey="in" stackId="a" radius={[10, 10, 0, 0]} fill="hsl(var(--gold))" />
                        <Bar dataKey="out" stackId="a" radius={[10, 10, 0, 0]} fill="hsl(var(--wine))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Sinais</p>
                      <h3 className="mt-1 text-[15px] font-bold tracking-tight text-foreground">Saldo mensal</h3>
                    </div>
                    <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-black text-muted-foreground">
                      net
                    </span>
                  </div>
                  <div className="mt-3 h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stockMovesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(23,20,29,0.6)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "rgba(23,20,29,0.45)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(255,255,255,0.92)",
                            border: "1px solid rgba(0,0,0,0.06)",
                            borderRadius: 14,
                            fontSize: 12,
                            boxShadow: "0 16px 40px -28px rgba(15,15,20,0.65)",
                          }}
                        />
                        <Area type="monotone" dataKey="net" stroke="hsl(var(--wine))" fill="hsl(var(--wine) / 0.18)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </>
  );
}
