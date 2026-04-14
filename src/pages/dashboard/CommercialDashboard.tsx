import { useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  DollarSign,
  Filter,
  Layers,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Upload,
  Users,
  FileText,
  X,
  Wine,
  BarChart3,
} from "@/icons/lucide";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import { useWines, type Wine as WineType } from "@/hooks/useWines";
import { cn } from "@/lib/utils";

/* ── Animation ── */
const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const formatBRL = (value: number) =>
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
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: 14,
  fontSize: 12,
  boxShadow: "0 12px 28px -12px rgba(44,20,31,0.16)",
  backdropFilter: "blur(14px)",
};

const PIE_COLORS = [
  "hsl(348, 55%, 35%)",
  "hsl(38, 52%, 50%)",
  "hsl(152, 32%, 42%)",
  "hsl(220, 40%, 50%)",
  "hsl(270, 40%, 50%)",
  "hsl(180, 30%, 45%)",
  "hsl(15, 50%, 50%)",
  "hsl(60, 35%, 48%)",
];

/* ── Filter types ── */
interface ActiveFilters {
  style: string[];
  country: string[];
  region: string[];
  grape: string[];
}

const emptyFilters: ActiveFilters = { style: [], country: [], region: [], grape: [] };

function hasActiveFilters(f: ActiveFilters) {
  return f.style.length > 0 || f.country.length > 0 || f.region.length > 0 || f.grape.length > 0;
}

function wineMatchesFilters(w: WineType, f: ActiveFilters) {
  if (f.style.length > 0 && (!w.style || !f.style.includes(w.style))) return false;
  if (f.country.length > 0 && (!w.country || !f.country.includes(w.country))) return false;
  if (f.region.length > 0 && (!w.region || !f.region.includes(w.region))) return false;
  if (f.grape.length > 0 && (!w.grape || !f.grape.includes(w.grape))) return false;
  return true;
}

/* ── Filter Chip Component ── */
function FilterChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.slice(0, 12).map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 border backdrop-blur-sm",
                active
                  ? "bg-primary/12 text-primary border-primary/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "bg-white/48 text-muted-foreground/72 border-white/24 hover:bg-white/58 hover:text-foreground"
              )}
            >
              {opt.value}
              <span className={cn(
                "text-[9px] font-bold tabular-nums",
                active ? "text-primary/60" : "text-muted-foreground/40"
              )}>
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CommercialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allWines = [], isLoading } = useWines();
  const { data: sales = [], isLoading: salesLoading } = useSales();

  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("sommelyx_onboarding_done_commercial"));
  const [filters, setFilters] = useState<ActiveFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── Build filter options from ALL wines (unfiltered) ── */
  const filterOptions = useMemo(() => {
    const styleMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};
    const regionMap: Record<string, number> = {};
    const grapeMap: Record<string, number> = {};

    allWines.filter(w => w.quantity > 0).forEach((w) => {
      if (w.style) styleMap[w.style] = (styleMap[w.style] || 0) + w.quantity;
      if (w.country) countryMap[w.country] = (countryMap[w.country] || 0) + w.quantity;
      if (w.region) regionMap[w.region] = (regionMap[w.region] || 0) + w.quantity;
      if (w.grape) grapeMap[w.grape] = (grapeMap[w.grape] || 0) + w.quantity;
    });

    const toOpts = (map: Record<string, number>) =>
      Object.entries(map)
        .sort(([, a], [, b]) => b - a)
        .map(([value, count]) => ({ value, count }));

    return {
      style: toOpts(styleMap),
      country: toOpts(countryMap),
      region: toOpts(regionMap),
      grape: toOpts(grapeMap),
    };
  }, [allWines]);

  const toggleFilter = useCallback((key: keyof ActiveFilters, value: string) => {
    setFilters((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  }, []);

  const clearFilters = useCallback(() => setFilters(emptyFilters), []);
  const isFiltered = hasActiveFilters(filters);

  /* ── Apply filters to wines ── */
  const wines = useMemo(
    () => (isFiltered ? allWines.filter((w) => wineMatchesFilters(w, filters)) : allWines),
    [allWines, filters, isFiltered]
  );
  const filteredWineIds = useMemo(() => new Set(wines.map((w) => w.id)), [wines]);
  const filteredWineNames = useMemo(
    () => new Set(wines.map((w) => w.name.toLowerCase())),
    [wines],
  );
  const salesInScope = useMemo(
    () =>
      sales.filter((sale) => {
        if (sale.wine_id && filteredWineIds.has(sale.wine_id)) return true;
        return filteredWineNames.has(sale.name.toLowerCase());
      }),
    [sales, filteredWineIds, filteredWineNames],
  );

  /* ── Filtered KPIs ── */
  const totalBottles = useMemo(() => wines.reduce((sum, w) => sum + w.quantity, 0), [wines]);
  const totalValue = useMemo(
    () => wines.reduce((sum, w) => sum + (w.current_value ?? w.purchase_price ?? 0) * w.quantity, 0),
    [wines]
  );
  const uniqueLabels = useMemo(() => wines.filter((w) => w.quantity > 0).length, [wines]);
  const lowStock = useMemo(() => wines.filter((w) => w.quantity > 0 && w.quantity <= 2).length, [wines]);

  const turnover = useMemo(() => {
    const recently = wines.filter(
      (w) => Date.now() - new Date(w.updated_at).getTime() < 30 * 24 * 60 * 60 * 1000
    ).length;
    return wines.length > 0 ? Math.round((recently / wines.length) * 100) : 0;
  }, [wines]);

  const months = useMemo(() => buildMonthWindow(6), []);

  const { data: wineEvents = [] } = useQuery({
    queryKey: ["wine_events", user?.id, "commercial-dashboard"],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 6);
      const { data, error } = await supabase
        .from("wine_events")
        .select("event_type,quantity,created_at,wine_id")
        .eq("user_id", user!.id)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const wineEventsInScope = useMemo(
    () => (wineEvents as any[]).filter((event) => event.wine_id && filteredWineIds.has(event.wine_id)),
    [wineEvents, filteredWineIds],
  );

  const salesMonthly = useMemo(() => {
    const map: Record<string, number> = {};
    salesInScope.forEach((s) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + (s.price ?? 0) * (s.quantity ?? 0);
    });
    return months.map((m) => ({ name: m.label, value: Math.round(map[m.key] || 0) }));
  }, [salesInScope, months]);

  const stockMovesMonthly = useMemo(() => {
    const inMap: Record<string, number> = {};
    const outMap: Record<string, number> = {};
    wineEventsInScope.forEach((e) => {
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
  }, [wineEventsInScope, months]);

  /* ── Breakdown data ── */
  const breakdownByStyle = useMemo(() => {
    const map: Record<string, { bottles: number; value: number }> = {};
    wines.filter(w => w.quantity > 0).forEach((w) => {
      const key = w.style || "Outros";
      if (!map[key]) map[key] = { bottles: 0, value: 0 };
      map[key].bottles += w.quantity;
      map[key].value += (w.current_value ?? w.purchase_price ?? 0) * w.quantity;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.bottles - a.bottles)
      .map(([name, d]) => ({ name, ...d }));
  }, [wines]);

  const breakdownByRegion = useMemo(() => {
    const map: Record<string, { bottles: number; value: number }> = {};
    wines.filter(w => w.quantity > 0).forEach((w) => {
      const key = w.region || w.country || "Outros";
      if (!map[key]) map[key] = { bottles: 0, value: 0 };
      map[key].bottles += w.quantity;
      map[key].value += (w.current_value ?? w.purchase_price ?? 0) * w.quantity;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b.bottles - a.bottles)
      .slice(0, 8)
      .map(([name, d]) => ({ name, ...d }));
  }, [wines]);

  const kpis = useMemo(
    () => [
      { label: "Rótulos", value: `${uniqueLabels}`, detail: "Em estoque", icon: Wine },
      { label: "Garrafas", value: `${totalBottles}`, detail: "Total disponível", icon: Layers },
      { label: "Valor em estoque", value: formatBRL(totalValue), detail: "Investimento", icon: DollarSign },
      { label: "Reposição", value: `${lowStock}`, detail: lowStock > 0 ? "Atenção" : "Estoque saudável", icon: AlertTriangle },
    ],
    [lowStock, totalBottles, totalValue, uniqueLabels],
  );

  const lowStockRows = useMemo(
    () =>
      wines
        .filter((w) => w.quantity > 0 && w.quantity <= 2)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 8),
    [wines],
  );

  const stockRows = useMemo(() => {
    return wines
      .filter((w) => w.quantity > 0)
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
        style: w.style,
        qty: w.quantity,
        value: (w.current_value ?? w.purchase_price ?? 0) * w.quantity,
        low: w.quantity <= 2,
      }));
  }, [wines]);

  const activeFilterLabels = useMemo(() => {
    const labels: { key: keyof ActiveFilters; value: string }[] = [];
    for (const [key, values] of Object.entries(filters) as [keyof ActiveFilters, string[]][]) {
      for (const v of values) labels.push({ key, value: v });
    }
    return labels;
  }, [filters]);

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

      <div className="max-w-[1280px] space-y-4">
        {/* ─── Header ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="surface-clarity rounded-[24px] px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-[25px] font-semibold tracking-[-0.03em] text-foreground sm:text-[28px] font-serif">
                Resumo da operação
              </h1>
              <p className="mt-1 text-[13px] text-foreground/62 leading-relaxed">
                {isFiltered
                  ? `${uniqueLabels} rótulos · ${totalBottles} garrafas · ${formatBRL(totalValue)}`
                  : `${totalBottles} un. em estoque`}
                {lowStock > 0 && !isFiltered && (
                  <> · <span className="text-primary font-medium">{lowStock} para repor</span></>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant={filtersOpen ? "default" : "outline"}
                size="default"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={cn(
                  "gap-2",
                  isFiltered && !filtersOpen && "border-primary/30 text-primary"
                )}
              >
                <Filter className="h-4 w-4" />
                Filtros
                {isFiltered && (
                  <span className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {activeFilterLabels.length}
                  </span>
                )}
              </Button>
              <Button variant="primary" size="default" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Cadastrar
              </Button>
              <Button variant="secondary" size="default" onClick={() => navigate("/dashboard/sales")}>
                <ShoppingCart className="mr-1.5 h-4 w-4" /> Venda
              </Button>
              <Button variant="ghost" size="default" onClick={() => setCsvOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" /> Importar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ─── Filter Panel ─── */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="chart-surface p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-foreground">Filtrar estoque</p>
                  {isFiltered && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-[11px] text-muted-foreground gap-1">
                      <X className="h-3 w-3" /> Limpar tudo
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FilterChipGroup
                    label="Tipo"
                    options={filterOptions.style}
                    selected={filters.style}
                    onToggle={(v) => toggleFilter("style", v)}
                  />
                  <FilterChipGroup
                    label="País"
                    options={filterOptions.country}
                    selected={filters.country}
                    onToggle={(v) => toggleFilter("country", v)}
                  />
                  <FilterChipGroup
                    label="Região"
                    options={filterOptions.region}
                    selected={filters.region}
                    onToggle={(v) => toggleFilter("region", v)}
                  />
                  <FilterChipGroup
                    label="Uva"
                    options={filterOptions.grape}
                    selected={filters.grape}
                    onToggle={(v) => toggleFilter("grape", v)}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Active Filter Context Bar ─── */}
        {isFiltered && !filtersOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
            <div className="surface-clarity flex items-center gap-2 flex-wrap rounded-xl px-4 py-2.5">
              <span className="text-[11px] font-semibold text-foreground/68 shrink-0">Visualizando:</span>
              {activeFilterLabels.map(({ key, value }) => (
                <button
                  key={`${key}-${value}`}
                  onClick={() => toggleFilter(key, value)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/15 transition-colors"
                >
                  {value}
                  <X className="h-2.5 w-2.5" />
                </button>
              ))}
              <span className="text-[11px] text-foreground/54">
                · {uniqueLabels} rótulos · {totalBottles} garrafas · {formatBRL(totalValue)}
              </span>
              <button
                onClick={clearFilters}
                className="ml-auto text-[10px] font-semibold text-foreground/54 hover:text-foreground transition-colors"
              >
                Limpar
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── KPI Strip ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="card-depth p-5">
                  <Skeleton className="h-3.5 w-20 mb-3 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              ))
            ) : (
              kpis.map((kpi) => (
                <div key={kpi.label} className="card-depth p-5">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/[0.06]">
                      <kpi.icon className="h-4 w-4 text-primary/60" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 whitespace-nowrap">{kpi.label}</p>
                  </div>
                  <p className="text-[26px] font-bold tracking-[-0.02em] text-foreground leading-none tabular-nums">{kpi.value}</p>
                  <p className="text-[12px] text-muted-foreground/60 mt-2 font-medium">{kpi.detail}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {totalBottles === 0 && !isFiltered ? (
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
        ) : totalBottles === 0 && isFiltered ? (
          <div className="glass-card p-10 text-center space-y-3">
            <Filter className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-[15px] font-semibold text-foreground/70">Nenhum item encontrado com esses filtros</p>
            <p className="text-[13px] text-muted-foreground/50">Tente remover um filtro ou ajuste a seleção</p>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
              Limpar filtros
            </Button>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-12 gap-4">
              {/* ─── Stock Table ─── */}
              <motion.div className="col-span-12 lg:col-span-7" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
                <div className="chart-surface p-6">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="min-w-0">
                      <p className="chart-surface-kicker">Estoque</p>
                      <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-foreground">
                        Itens de maior impacto
                      </h2>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[12px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => navigate("/dashboard/inventory")}>
                      Ver tudo →
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border/22 bg-white/44 shadow-[0_10px_26px_-22px_rgba(44,20,31,0.18)]">
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 bg-muted/12">
                      <div className="col-span-6">Produto</div>
                      <div className="col-span-2 text-center">Tipo</div>
                      <div className="col-span-2 text-right">Qtd.</div>
                      <div className="col-span-2 text-right">Valor</div>
                    </div>
                    <div className="divide-y divide-border/12">
                      {stockRows.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => navigate(`/dashboard/inventory?q=${encodeURIComponent(row.name)}`)}
                          className="grid w-full grid-cols-12 items-center gap-2 px-5 py-3.25 text-left transition-all duration-200 hover:bg-muted/8"
                        >
                          <div className="col-span-6 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("h-2 w-2 rounded-full shrink-0", row.low ? "bg-primary" : "bg-accent")} />
                              <p className="truncate text-[13px] font-semibold text-foreground">{row.name}</p>
                            </div>
                            {row.producer && (
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/50 pl-[18px]">{row.producer}</p>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            {row.style && (
                              <span className="inline-flex items-center rounded-lg bg-muted/20 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/72">
                                {row.style}
                              </span>
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={cn("text-[13px] font-bold tabular-nums", row.low ? "text-primary" : "text-foreground")}>{row.qty}</span>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="text-[13px] font-semibold text-foreground tabular-nums">{formatBRL(row.value)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ─── Right Column ─── */}
              <div className="col-span-12 grid gap-4 lg:col-span-5">
                {/* Alerts */}
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
                <div className="chart-surface p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <p className="chart-surface-kicker">Alertas</p>
                        <h2 className="mt-1 text-[18px] font-bold tracking-[-0.01em] text-foreground">Reposição</h2>
                      </div>
                      <Button variant="ghost" size="sm" className="text-[12px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => navigate("/dashboard/inventory")}>
                        Ajustar
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      {lowStockRows.length === 0 ? (
                        <div className="rounded-2xl border border-border/20 bg-muted/8 py-8 text-center">
                          <p className="text-[13px] text-muted-foreground/40 font-medium">Nenhum item com estoque baixo</p>
                        </div>
                      ) : (
                        lowStockRows.map((w) => (
                          <div key={w.id} className="flex items-center gap-3.5 rounded-2xl border border-border/20 bg-background/40 px-4 py-3 transition-all duration-200 hover:bg-background/60 hover:shadow-sm">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 text-primary shrink-0">
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-foreground">{w.name}</p>
                              {w.producer && (
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground/50">{w.producer}</p>
                              )}
                            </div>
                            <span className="rounded-xl bg-primary/8 px-2.5 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                              {w.quantity} un.
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Quick Links */}
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                <div className="chart-surface p-6">
                    <p className="chart-surface-kicker mb-3.5">Atalhos</p>
                    <div className="grid grid-cols-2 gap-2.5">
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
                          className="flex h-11 items-center gap-3 rounded-2xl border border-border/20 bg-background/30 px-4 text-left hover:bg-muted/12 transition-all duration-200"
                        >
                          <item.icon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <span className="text-[12px] font-semibold text-foreground">{item.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ─── Breakdown Section ─── */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* By Style */}
                <div className="chart-surface p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-foreground/50" />
                    <h3 className="chart-surface-title">Por tipo</h3>
                  </div>
                  {breakdownByStyle.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground/40 py-4 text-center">Sem dados</p>
                  ) : (
                    <div className="flex items-start gap-6">
                      <div className="w-[120px] h-[120px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={breakdownByStyle}
                              dataKey="bottles"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={55}
                              innerRadius={30}
                              strokeWidth={2}
                              stroke="rgba(255,255,255,0.92)"
                            >
                              {breakdownByStyle.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2">
                        {breakdownByStyle.map((d, i) => {
                          const pct = totalBottles > 0 ? Math.round((d.bottles / totalBottles) * 100) : 0;
                          return (
                            <div key={d.name} className="flex items-center gap-2.5">
                              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="text-[12px] font-semibold text-foreground flex-1 truncate">{d.name}</span>
                              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{d.bottles} un.</span>
                              <span className="text-[10px] font-semibold text-muted-foreground/40 tabular-nums w-[32px] text-right">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* By Region */}
                <div className="chart-surface p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-foreground/50" />
                    <h3 className="chart-surface-title">Por região</h3>
                  </div>
                  {breakdownByRegion.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground/40 py-4 text-center">Sem dados</p>
                  ) : (
                    <div className="space-y-2.5">
                      {breakdownByRegion.map((d, i) => {
                        const pct = totalBottles > 0 ? Math.round((d.bottles / totalBottles) * 100) : 0;
                        return (
                          <div key={d.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-semibold text-foreground truncate">{d.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{d.bottles} un.</span>
                                <span className="text-[11px] font-semibold text-muted-foreground/50 tabular-nums">{formatBRL(d.value)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ─── Charts ─── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                <div className="chart-surface p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="chart-surface-title">Vendas</h3>
                    <span className="chart-surface-kicker">{isFiltered ? "6 meses · filtro ativo" : "6 meses"}</span>
                  </div>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.16)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground) / 0.72)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--foreground) / 0.56)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => formatBRL(Number(v))} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="hsl(var(--wine))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                <div className="chart-surface p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="chart-surface-title">Movimentação</h3>
                    <span className="chart-surface-kicker">{isFiltered ? "6 meses · filtro ativo" : "6 meses"}</span>
                  </div>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockMovesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.16)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground) / 0.72)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--foreground) / 0.56)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="in" stackId="a" radius={[8, 8, 0, 0]} fill="hsl(var(--gold))" name="Entrada" />
                        <Bar dataKey="out" stackId="a" radius={[8, 8, 0, 0]} fill="hsl(var(--wine))" name="Saída" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8}>
                <div className="chart-surface p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="chart-surface-title">Saldo mensal</h3>
                    <span className="chart-surface-kicker">{isFiltered ? "recorte atual" : "net"}</span>
                  </div>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stockMovesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.16)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground) / 0.72)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--foreground) / 0.56)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area type="monotone" dataKey="net" stroke="hsl(var(--wine))" fill="hsl(var(--wine) / 0.08)" strokeWidth={2.5} />
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
