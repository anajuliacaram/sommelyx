import { useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  DollarSign,
  FileText,
  Filter,
  Layers,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Upload,
  Users,
  Wine,
  X,
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
  hidden: { opacity: 0, y: 12 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
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

const glassTooltipStyle = {
  background: "rgba(255,255,255,0.90)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.50)",
  borderRadius: 14,
  fontSize: 13,
  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.15)",
};

const PIE_COLORS = [
  "#7B1E2B",
  "#C6A768",
  "#388E3C",
  "#3B6EA5",
  "#7E57C2",
  "#5C8A8A",
  "#C75B39",
  "#8D8D3B",
];

/* ── Glass Panel ── */
function GP({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[20px]", className)}
      style={{
        background: "rgba(255, 255, 255, 0.78)",
        backdropFilter: "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        border: "1px solid rgba(255, 255, 255, 0.45)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 8px 32px -8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Section Label ── */
function SL({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.10em]" style={{ color: "#999" }}>
      {children}
    </p>
  );
}

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

/* ── Filter Chip Group ── */
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
      <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#aaa" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.slice(0, 12).map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 border",
                active
                  ? "bg-[rgba(123,30,43,0.10)] text-primary border-[rgba(123,30,43,0.20)]"
                  : "border-[rgba(0,0,0,0.06)] hover:bg-[rgba(0,0,0,0.03)]",
              )}
              style={active ? {} : { color: "#666", background: "rgba(255,255,255,0.50)" }}
            >
              {opt.value}
              <span
                className="text-[9px] font-bold tabular-nums"
                style={{ color: active ? "rgba(123,30,43,0.5)" : "#bbb" }}
              >
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
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("sommelyx_onboarding_done_commercial"),
  );
  const [filters, setFilters] = useState<ActiveFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── Filter options from ALL wines ── */
  const filterOptions = useMemo(() => {
    const styleMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};
    const regionMap: Record<string, number> = {};
    const grapeMap: Record<string, number> = {};

    allWines
      .filter((w) => w.quantity > 0)
      .forEach((w) => {
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

  /* ── Apply filters ── */
  const wines = useMemo(
    () => (isFiltered ? allWines.filter((w) => wineMatchesFilters(w, filters)) : allWines),
    [allWines, filters, isFiltered],
  );
  const filteredWineIds = useMemo(() => new Set(wines.map((w) => w.id)), [wines]);
  const filteredWineNames = useMemo(() => new Set(wines.map((w) => w.name.toLowerCase())), [wines]);
  const salesInScope = useMemo(
    () =>
      sales.filter((sale) => {
        if (sale.wine_id && filteredWineIds.has(sale.wine_id)) return true;
        return filteredWineNames.has(sale.name.toLowerCase());
      }),
    [sales, filteredWineIds, filteredWineNames],
  );

  /* ── KPIs ── */
  const totalBottles = useMemo(() => wines.reduce((sum, w) => sum + w.quantity, 0), [wines]);
  const totalValue = useMemo(
    () => wines.reduce((sum, w) => sum + (w.current_value ?? w.purchase_price ?? 0) * w.quantity, 0),
    [wines],
  );
  const uniqueLabels = useMemo(() => wines.filter((w) => w.quantity > 0).length, [wines]);
  const lowStock = useMemo(() => wines.filter((w) => w.quantity > 0 && w.quantity <= 2).length, [wines]);

  const turnover = useMemo(() => {
    const recently = wines.filter(
      (w) => Date.now() - new Date(w.updated_at).getTime() < 30 * 24 * 60 * 60 * 1000,
    ).length;
    return wines.length > 0 ? Math.round((recently / wines.length) * 100) : 0;
  }, [wines]);

  const avgTicket = useMemo(() => {
    if (salesInScope.length === 0) return 0;
    const total = salesInScope.reduce((s, sale) => s + (sale.price ?? 0) * (sale.quantity ?? 1), 0);
    return total / salesInScope.length;
  }, [salesInScope]);

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
    wines
      .filter((w) => w.quantity > 0)
      .forEach((w) => {
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
    wines
      .filter((w) => w.quantity > 0)
      .forEach((w) => {
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
      { label: "Estoque total", value: `${totalBottles}`, icon: Layers, tone: "default" as const },
      { label: "Valor em estoque", value: formatBRL(totalValue), icon: DollarSign, tone: "default" as const },
      { label: "Giro", value: `${turnover}%`, icon: RefreshCw, tone: "default" as const },
      { label: "Ticket médio", value: formatBRL(avgTicket), icon: TrendingUp, tone: "default" as const },
      { label: "Ruptura", value: `${lowStock}`, icon: AlertTriangle, tone: lowStock > 0 ? ("alert" as const) : ("default" as const) },
    ],
    [lowStock, totalBottles, totalValue, turnover, avgTicket],
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1
                className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] leading-[1.1] font-serif"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                Resumo da operação
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                {isFiltered
                  ? `${uniqueLabels} rótulos · ${totalBottles} garrafas · ${formatBRL(totalValue)}`
                  : `${totalBottles} un. em estoque`}
                {lowStock > 0 && !isFiltered && (
                  <>
                    {" "}
                    · <span style={{ color: "#C97A82" }}>{lowStock} para repor</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant={filtersOpen ? "primary" : "glass"}
                size="default"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {isFiltered && (
                  <span
                    className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: filtersOpen ? "rgba(255,255,255,0.20)" : "rgba(123,30,43,0.12)",
                      color: filtersOpen ? "#fff" : "#7B1E2B",
                    }}
                  >
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
              <Button variant="ghost" size="default" onClick={() => setCsvOpen(true)} style={{ color: "rgba(255,255,255,0.60)" }}>
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
              <GP className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold" style={{ color: "#111" }}>
                    Filtrar estoque
                  </p>
                  {isFiltered && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-[11px] gap-1" style={{ color: "#888" }}>
                      <X className="h-3 w-3" /> Limpar tudo
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FilterChipGroup label="Tipo" options={filterOptions.style} selected={filters.style} onToggle={(v) => toggleFilter("style", v)} />
                  <FilterChipGroup label="País" options={filterOptions.country} selected={filters.country} onToggle={(v) => toggleFilter("country", v)} />
                  <FilterChipGroup label="Região" options={filterOptions.region} selected={filters.region} onToggle={(v) => toggleFilter("region", v)} />
                  <FilterChipGroup label="Uva" options={filterOptions.grape} selected={filters.grape} onToggle={(v) => toggleFilter("grape", v)} />
                </div>
              </GP>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Active Filter Context Bar ─── */}
        {isFiltered && !filtersOpen && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
            <div
              className="flex items-center gap-2 flex-wrap rounded-2xl px-4 py-2.5"
              style={{
                background: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(123,30,43,0.10)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <span className="text-[11px] font-semibold shrink-0" style={{ color: "#888" }}>
                Visualizando:
              </span>
              {activeFilterLabels.map(({ key, value }) => (
                <button
                  key={`${key}-${value}`}
                  onClick={() => toggleFilter(key, value)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors"
                  style={{ background: "rgba(123,30,43,0.08)" }}
                >
                  {value}
                  <X className="h-2.5 w-2.5" />
                </button>
              ))}
              <span className="text-[11px]" style={{ color: "#aaa" }}>
                · {uniqueLabels} rótulos · {totalBottles} garrafas · {formatBRL(totalValue)}
              </span>
              <button onClick={clearFilters} className="ml-auto text-[10px] font-semibold transition-colors" style={{ color: "#aaa" }}>
                Limpar
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── KPI Strip (5 items, denser) ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {isLoading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <GP key={i} className="p-4">
                    <Skeleton className="h-3 w-16 mb-2 rounded-lg" />
                    <Skeleton className="h-7 w-14 rounded-lg" />
                  </GP>
                ))
              : kpis.map((kpi) => (
                  <GP key={kpi.label} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="flex items-center justify-center h-7 w-7 rounded-lg"
                        style={{
                          background:
                            kpi.tone === "alert" ? "rgba(123,30,43,0.10)" : "rgba(0,0,0,0.04)",
                        }}
                      >
                        <kpi.icon
                          className="h-3.5 w-3.5"
                          style={{
                            color: kpi.tone === "alert" ? "#7B1E2B" : "#888",
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] mb-0.5" style={{ color: "#999" }}>
                      {kpi.label}
                    </p>
                    <p
                      className="text-[22px] font-bold tracking-[-0.02em] leading-none tabular-nums"
                      style={{ color: kpi.tone === "alert" && lowStock > 0 ? "#7B1E2B" : "#111" }}
                    >
                      {kpi.value}
                    </p>
                  </GP>
                ))}
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
          <GP className="p-10 text-center space-y-3">
            <Filter className="h-8 w-8 mx-auto" style={{ color: "rgba(0,0,0,0.15)" }} />
            <p className="text-[15px] font-semibold" style={{ color: "#555" }}>
              Nenhum item encontrado com esses filtros
            </p>
            <p className="text-[13px]" style={{ color: "#999" }}>
              Tente remover um filtro ou ajuste a seleção
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
              Limpar filtros
            </Button>
          </GP>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-4">
              {/* ─── Stock Table ─── */}
              <motion.div className="col-span-12 lg:col-span-7" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
                <GP className="p-6">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="min-w-0">
                      <SL>Estoque</SL>
                      <h2 className="mt-1 text-[18px] font-bold tracking-[-0.01em]" style={{ color: "#111" }}>
                        Itens de maior impacto
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[12px] font-semibold"
                      style={{ color: "#888" }}
                      onClick={() => navigate("/dashboard/inventory")}
                    >
                      Ver tudo <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div
                      className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "#999", background: "rgba(0,0,0,0.02)" }}
                    >
                      <div className="col-span-6">Produto</div>
                      <div className="col-span-2 text-center">Tipo</div>
                      <div className="col-span-2 text-right">Qtd.</div>
                      <div className="col-span-2 text-right">Valor</div>
                    </div>
                    <div>
                      {stockRows.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => navigate(`/dashboard/inventory?q=${encodeURIComponent(row.name)}`)}
                          className="grid w-full grid-cols-12 items-center gap-2 px-5 py-3 text-left transition-all duration-200 hover:bg-[rgba(0,0,0,0.02)]"
                          style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}
                        >
                          <div className="col-span-6 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ background: row.low ? "#7B1E2B" : "#C6A768" }}
                              />
                              <p className="truncate text-[13px] font-semibold" style={{ color: "#111" }}>
                                {row.name}
                              </p>
                            </div>
                            {row.producer && (
                              <p className="mt-0.5 truncate text-[11px] pl-[18px]" style={{ color: "#aaa" }}>
                                {row.producer}
                              </p>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            {row.style && (
                              <span
                                className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold"
                                style={{ background: "rgba(0,0,0,0.04)", color: "#777" }}
                              >
                                {row.style}
                              </span>
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            <span
                              className="text-[13px] font-bold tabular-nums"
                              style={{ color: row.low ? "#7B1E2B" : "#111" }}
                            >
                              {row.qty}
                            </span>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#333" }}>
                              {formatBRL(row.value)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </GP>
              </motion.div>

              {/* ─── Right Column ─── */}
              <div className="col-span-12 grid gap-4 lg:col-span-5">
                {/* Alerts / Low Stock */}
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
                  <GP className="p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <SL>Alertas</SL>
                        <h2 className="mt-1 text-[18px] font-bold tracking-[-0.01em]" style={{ color: "#111" }}>
                          Reposição
                        </h2>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[12px] font-semibold"
                        style={{ color: "#888" }}
                        onClick={() => navigate("/dashboard/inventory")}
                      >
                        Ajustar
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      {lowStockRows.length === 0 ? (
                        <div
                          className="rounded-2xl py-8 text-center"
                          style={{ background: "rgba(0,0,0,0.02)", border: "1px dashed rgba(0,0,0,0.06)" }}
                        >
                          <p className="text-[13px] font-medium" style={{ color: "#bbb" }}>
                            Nenhum item com estoque baixo
                          </p>
                        </div>
                      ) : (
                        lowStockRows.map((w) => (
                          <div
                            key={w.id}
                            className="flex items-center gap-3.5 rounded-2xl px-4 py-3 transition-all duration-200 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]"
                            style={{
                              background: "rgba(255,255,255,0.55)",
                              border: "1px solid rgba(255,255,255,0.45)",
                            }}
                          >
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
                              style={{ background: "rgba(123,30,43,0.08)" }}
                            >
                              <ArrowDownRight className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold" style={{ color: "#111" }}>
                                {w.name}
                              </p>
                              {w.producer && (
                                <p className="mt-0.5 truncate text-[11px]" style={{ color: "#aaa" }}>
                                  {w.producer}
                                </p>
                              )}
                            </div>
                            <span
                              className="rounded-xl px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-primary"
                              style={{ background: "rgba(123,30,43,0.08)" }}
                            >
                              {w.quantity} un.
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </GP>
                </motion.div>

                {/* Quick Links */}
                <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                  <GP className="p-5">
                    <SL>Atalhos</SL>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {[
                        { icon: Package, label: "Estoque", route: "/dashboard/inventory" },
                        { icon: ShoppingCart, label: "Vendas", route: "/dashboard/sales" },
                        { icon: Users, label: "Cadastros", route: "/dashboard/registers" },
                        { icon: FileText, label: "Relatórios", route: "/dashboard/reports" },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => navigate(item.route)}
                          className="flex h-11 items-center gap-3 rounded-2xl px-4 text-left transition-all duration-200 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]"
                          style={{
                            background: "rgba(255,255,255,0.50)",
                            border: "1px solid rgba(255,255,255,0.40)",
                          }}
                        >
                          <item.icon className="h-4 w-4 shrink-0" style={{ color: "#999" }} />
                          <span className="text-[12px] font-semibold" style={{ color: "#333" }}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </GP>
                </motion.div>
              </div>
            </div>

            {/* ─── Breakdown Section ─── */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* By Style */}
                <GP className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4" style={{ color: "#999" }} />
                    <h3 className="text-[16px] font-bold tracking-[-0.01em]" style={{ color: "#111" }}>
                      Por tipo
                    </h3>
                  </div>
                  {breakdownByStyle.length === 0 ? (
                    <p className="text-[13px] py-4 text-center" style={{ color: "#bbb" }}>
                      Sem dados
                    </p>
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
                              stroke="rgba(255,255,255,0.80)"
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
                              <div
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                              />
                              <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: "#333" }}>
                                {d.name}
                              </span>
                              <span className="text-[11px] font-bold tabular-nums" style={{ color: "#777" }}>
                                {d.bottles} un.
                              </span>
                              <span className="text-[10px] font-semibold tabular-nums w-[32px] text-right" style={{ color: "#bbb" }}>
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </GP>

                {/* By Region */}
                <GP className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4" style={{ color: "#999" }} />
                    <h3 className="text-[16px] font-bold tracking-[-0.01em]" style={{ color: "#111" }}>
                      Por região
                    </h3>
                  </div>
                  {breakdownByRegion.length === 0 ? (
                    <p className="text-[13px] py-4 text-center" style={{ color: "#bbb" }}>
                      Sem dados
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {breakdownByRegion.map((d, i) => {
                        const pct = totalBottles > 0 ? Math.round((d.bottles / totalBottles) * 100) : 0;
                        return (
                          <div key={d.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-semibold truncate" style={{ color: "#333" }}>
                                {d.name}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold tabular-nums" style={{ color: "#777" }}>
                                  {d.bottles} un.
                                </span>
                                <span className="text-[11px] font-semibold tabular-nums" style={{ color: "#bbb" }}>
                                  {formatBRL(d.value)}
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.05)" }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GP>
              </div>
            </motion.div>

            {/* ─── Charts ─── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                <GP className="p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-[16px] font-bold tracking-[-0.01em]" style={{ color: "#111" }}>
                      Vendas
                    </h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#bbb" }}>
                      {isFiltered ? "6m · filtro" : "6 meses"}
                    </span>
                  </div>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.25)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={glassTooltipStyle} formatter={(v: any) => formatBRL(Number(v))} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#7B1E2B" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GP>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                <GP className="p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-[16px] font-bold tracking-[-0.01em]" style={{ color: "#111" }}>
                      Movimentação
                    </h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#bbb" }}>
                      {isFiltered ? "6m · filtro" : "6 meses"}
                    </span>
                  </div>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockMovesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.25)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={glassTooltipStyle} />
                        <Bar dataKey="in" stackId="a" radius={[8, 8, 0, 0]} fill="#C6A768" name="Entrada" />
                        <Bar dataKey="out" stackId="a" radius={[8, 8, 0, 0]} fill="#7B1E2B" name="Saída" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GP>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8}>
                <GP className="p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-[16px] font-bold tracking-[-0.01em]" style={{ color: "#111" }}>
                      Saldo mensal
                    </h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#bbb" }}>
                      {isFiltered ? "recorte" : "net"}
                    </span>
                  </div>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stockMovesMonthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.25)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={glassTooltipStyle} />
                        <Area type="monotone" dataKey="net" stroke="#7B1E2B" fill="rgba(123,30,43,0.06)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GP>
              </motion.div>
            </div>

            {/* ─── Insight Card ─── */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={9}>
              <div
                className="rounded-[20px] p-6 relative overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, hsl(var(--forest)), hsl(var(--forest-muted)))",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(to right, transparent, rgba(198,167,104,0.2), transparent)" }}
                />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: "rgba(198,167,104,0.70)" }}>
                    Insight operacional
                  </p>
                  <p className="text-[15px] font-medium leading-relaxed max-w-xl" style={{ color: "rgba(232,228,219,0.80)" }}>
                    {lowStock > 0
                      ? `${lowStock} produto${lowStock > 1 ? "s" : ""} com estoque crítico. Revise sua reposição para evitar ruptura.`
                      : turnover > 50
                        ? `Giro de ${turnover}% nos últimos 30 dias — boa rotatividade. Mantenha o ciclo de reposição ativo.`
                        : `Sua operação tem ${uniqueLabels} rótulos ativos. Continue monitorando para otimizar o mix de produtos.`}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </>
  );
}
