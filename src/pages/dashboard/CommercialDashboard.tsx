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
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
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

const chartTooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 4px 12px -4px rgba(0,0,0,0.10)",
};

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
      { label: "Estoque total", value: `${totalBottles}`, detail: "Itens disponíveis", icon: Layers },
      { label: "Valor imobilizado", value: formatCompactBRL(totalValue), detail: "Investido no estoque", icon: DollarSign },
      { label: "Giro mensal", value: `${turnover}%`, detail: "Movimentados no mês", icon: TrendingUp },
      { label: "Reposição", value: `${lowStock}`, detail: "Estoque baixo", icon: AlertTriangle },
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

      <div className="max-w-[1280px] space-y-6">
        {/* ─── Header ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-serif text-[28px] font-bold tracking-[-0.015em] text-foreground sm:text-[32px]">
                Resumo da operação
              </h1>
              <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
                {totalBottles} un. em estoque
                {lowStock > 0 && <> · <span className="text-warning">{lowStock} para repor</span></>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="primary" size="default" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Cadastrar
              </Button>
              <Button variant="outline" size="default" onClick={() => navigate("/dashboard/sales")}>
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Venda
              </Button>
              <Button variant="ghost" size="default" onClick={() => setCsvOpen(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Importar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ─── KPI Strip ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-border/30 bg-card/80 p-5">
                  <Skeleton className="h-3 w-16 mb-4" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            ) : (
              kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-border/30 bg-card/80 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <kpi.icon className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{kpi.label}</p>
                  </div>
                  <p className="font-serif text-[26px] font-bold tracking-[-0.02em] text-foreground leading-none">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-2">{kpi.detail}</p>
                </div>
              ))
            )}
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
            <div className="grid grid-cols-12 gap-4">
              {/* ─── Stock Table ─── */}
              <motion.div className="col-span-12 lg:col-span-7" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
                <div className="rounded-xl border border-border/30 bg-card/70 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/70">Estoque atual</p>
                      <h2 className="mt-1 font-serif text-[18px] font-semibold tracking-[-0.01em] text-foreground">Itens de maior impacto</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[12px] text-muted-foreground" onClick={() => navigate("/dashboard/inventory")}>
                      Ver estoque
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-border/20">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/70 bg-muted/15">
                      <div className="col-span-7">Produto</div>
                      <div className="col-span-2 text-right">Qtd.</div>
                      <div className="col-span-3 text-right">Valor</div>
                    </div>
                    <div className="divide-y divide-border/15">
                      {stockRows.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => navigate(`/dashboard/inventory?q=${encodeURIComponent(row.name)}`)}
                          className="grid w-full grid-cols-12 items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/15"
                        >
                          <div className="col-span-7 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={cn("h-1.5 w-1.5 rounded-full", row.low ? "bg-primary" : "bg-accent")} />
                              <p className="truncate text-[13px] font-medium text-foreground">{row.name}</p>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground pl-3.5">{row.producer || "—"}</p>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={cn("text-[13px] font-semibold", row.low ? "text-primary" : "text-foreground")}>{row.qty}</span>
                          </div>
                          <div className="col-span-3 text-right">
                            <span className="text-[13px] font-medium text-foreground">{formatCompactBRL(row.value)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ─── Right Column ─── */}
              <div className="col-span-12 grid gap-4 lg:col-span-5">
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
                  <div className="rounded-xl border border-border/30 bg-card/70 p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/70">Alertas</p>
                        <h2 className="mt-1 font-serif text-[18px] font-semibold tracking-[-0.01em] text-foreground">Reposição</h2>
                      </div>
                      <Button variant="ghost" size="sm" className="text-[12px] text-muted-foreground" onClick={() => navigate("/dashboard/inventory")}>
                        Ajustar
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      {lowStockRows.length === 0 ? (
                        <div className="rounded-lg border border-border/20 bg-muted/10 py-6 text-center">
                          <p className="text-[13px] text-muted-foreground/60">Nenhum item com estoque baixo</p>
                        </div>
                      ) : (
                        lowStockRows.map((w) => (
                          <div key={w.id} className="flex items-center gap-3 rounded-lg border border-border/20 bg-background/40 px-4 py-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/6 text-primary shrink-0">
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-foreground">{w.name}</p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{w.producer || "—"}</p>
                            </div>
                            <span className="rounded-md bg-primary/6 px-2 py-1 text-[11px] font-semibold text-primary">
                              {w.quantity} un.
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>

                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                  <div className="rounded-xl border border-border/30 bg-card/70 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/70 mb-3">Atalhos</p>
                    <div className="grid grid-cols-2 gap-2">
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
                          className="flex h-11 items-center gap-2.5 rounded-lg border border-border/25 bg-background/30 px-3 text-left hover:bg-muted/20"
                        >
                          <item.icon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                          <span className="text-[12px] font-medium text-foreground">{item.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ─── Charts ─── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
                <div className="rounded-xl border border-border/30 bg-card/70 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-foreground">Vendas</h3>
                    <span className="text-[10px] font-medium text-muted-foreground/50">6 meses</span>
                  </div>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground)/0.5)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => formatCompactBRL(Number(v))} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                <div className="rounded-xl border border-border/30 bg-card/70 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-foreground">Movimentação</h3>
                    <span className="text-[10px] font-medium text-muted-foreground/50">6 meses</span>
                  </div>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockMovesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground)/0.5)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="in" stackId="a" radius={[4, 4, 0, 0]} fill="hsl(var(--accent))" />
                        <Bar dataKey="out" stackId="a" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                <div className="rounded-xl border border-border/30 bg-card/70 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-foreground">Saldo mensal</h3>
                    <span className="text-[10px] font-medium text-muted-foreground/50">net</span>
                  </div>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stockMovesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground)/0.5)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.10)" strokeWidth={1.5} />
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
