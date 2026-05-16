import { useMemo, useState, useCallback, memo } from "react";
import {
  ArrowDownRight,
  Filter,
  Package,
  Plus,
  ShoppingCart,
  Upload,
  Users,
  FileText,
  X,
} from "@/icons/lucide";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { useWines, type Wine as WineType } from "@/hooks/useWines";
import { cn } from "@/lib/utils";

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

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
const FilterChipGroup = memo(function FilterChipGroup({
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
});

export default function CommercialDashboard() {
  const navigate = useNavigate();
  const { data: allWines = [], isLoading } = useWines();

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

  /* ── Filtered KPIs ── */
  const totalBottles = useMemo(() => wines.reduce((sum, w) => sum + w.quantity, 0), [wines]);
  const totalValue = useMemo(
    () => wines.reduce((sum, w) => sum + (w.current_value ?? w.purchase_price ?? 0) * w.quantity, 0),
    [wines]
  );
  const uniqueLabels = useMemo(() => wines.filter((w) => w.quantity > 0).length, [wines]);
  const lowStock = useMemo(() => wines.filter((w) => w.quantity > 0 && w.quantity <= 2).length, [wines]);

  const kpis = useMemo(
    () => [
      { label: "Rótulos", value: uniqueLabels, detail: "em estoque", format: (v: number) => v.toLocaleString("pt-BR") },
      { label: "Garrafas", value: totalBottles, detail: "disponíveis", format: (v: number) => v.toLocaleString("pt-BR") },
      { label: "Valor em estoque", value: totalValue, detail: "investimento", format: (v: number) => formatBRL(v) },
      { label: "Reposição", value: lowStock, detail: lowStock > 0 ? "atenção" : "estoque saudável", format: (v: number) => v.toLocaleString("pt-BR") },
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
      {showOnboarding && (
        <OnboardingWizard
          profileType="commercial"
          onComplete={() => {
            localStorage.setItem("sommelyx_onboarding_done_commercial", "true");
            setShowOnboarding(false);
          }}
        />
      )}

      <div className="editorial-page max-w-[1240px]">
        <section className="px-1 pt-1">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.46)]">
                Operação comercial
              </p>
              <h1 className="editorial-page-h1 mt-1">A operação em um único plano</h1>
              <p className="mt-2 max-w-[620px] text-[13px] leading-[1.5] text-[rgba(58,51,39,0.64)]">
                {isFiltered
                  ? `${uniqueLabels} rótulos, ${totalBottles} garrafas e ${formatBRL(totalValue)} no recorte atual.`
                  : `${totalBottles} garrafas em estoque com ${lowStock} itens pedindo reposição e ${formatBRL(totalValue)} em produto.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={filtersOpen ? "default" : "outline"}
                size="default"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={cn("gap-2", isFiltered && !filtersOpen && "border-primary/30 text-primary")}
              >
                <Filter className="h-4 w-4" />
                Refinar
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

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-black/[0.05] pt-4 md:grid-cols-4">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-3 w-20 rounded-lg" />
                  <Skeleton className="h-6 w-24 rounded-lg" />
                </div>
              ))
            ) : (
              kpis.map((kpi) => (
                <div key={kpi.label}>
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[rgba(58,51,39,0.46)]">
                    {kpi.label}
                  </p>
                  <div className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.03em] text-[rgba(26,23,19,0.92)]">
                    {kpi.format(kpi.value)}
                  </div>
                  <p className="mt-1 text-[11px] text-[rgba(58,51,39,0.54)]">{kpi.detail}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {filtersOpen && (
          <div className="space-y-3 border-y border-black/[0.045] px-1 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(58,51,39,0.48)]">Refinar estoque</p>
              {isFiltered && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 text-[11px] text-muted-foreground">
                  <X className="h-3 w-3" /> Limpar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
              <FilterChipGroup label="Tipo" options={filterOptions.style} selected={filters.style} onToggle={(v) => toggleFilter("style", v)} />
              <FilterChipGroup label="País" options={filterOptions.country} selected={filters.country} onToggle={(v) => toggleFilter("country", v)} />
              <FilterChipGroup label="Região" options={filterOptions.region} selected={filters.region} onToggle={(v) => toggleFilter("region", v)} />
              <FilterChipGroup label="Uva" options={filterOptions.grape} selected={filters.grape} onToggle={(v) => toggleFilter("grape", v)} />
            </div>
          </div>
        )}

        {isFiltered && !filtersOpen && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            {activeFilterLabels.map(({ key, value }) => (
              <button
                key={`${key}-${value}`}
                onClick={() => toggleFilter(key, value)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/7 px-2 py-0.5 text-[10.5px] font-medium text-primary/80 transition-colors hover:bg-primary/12"
              >
                {value}
                <X className="h-2.5 w-2.5" />
              </button>
            ))}
            <button onClick={clearFilters} className="text-[11px] font-medium text-[rgba(58,51,39,0.56)] transition-colors hover:text-foreground">
              limpar recorte
            </button>
          </div>
        )}

        {totalBottles === 0 && !isFiltered ? (
          <PremiumEmptyState
            icon={Package}
            title="Controle total do seu estoque"
            description="Cadastre seus primeiros vinhos para acompanhar valor, giro e níveis de estoque em tempo real."
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
          <PremiumEmptyState
            icon={Filter}
            title="Nenhum vinho encontrado com esses filtros"
            description="Tente remover um filtro ou ajustar a seleção para ver mais resultados."
            primaryAction={{
              label: "Limpar filtros",
              onClick: clearFilters,
            }}
            className="px-6 py-10 lg:py-12"
          />
        ) : (
          <>
            <div className="grid grid-cols-12 gap-6 md:gap-8">
              <div className="col-span-12 lg:col-span-7">
                <section className="px-1">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="chart-surface-kicker">Estoque</p>
                      <h2 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[rgba(26,23,19,0.88)]">
                        O que sustenta a operação agora
                      </h2>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[12px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => navigate("/dashboard/inventory")}>
                      Ver tudo →
                    </Button>
                  </div>

                  <div className="border-y border-black/[0.045]">
                    <div className="divide-y divide-black/[0.045]">
                      {stockRows.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => navigate(`/dashboard/inventory?q=${encodeURIComponent(row.name)}`)}
                          className="grid w-full grid-cols-12 items-center gap-2 py-3 text-left transition-all duration-200 hover:bg-white/22"
                        >
                          <div className="col-span-7 min-w-0 sm:col-span-6">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("h-2 w-2 rounded-full shrink-0", row.low ? "bg-primary" : "bg-accent")} />
                              <p className="truncate text-[13px] font-medium text-[rgba(26,23,19,0.88)]">{row.name}</p>
                            </div>
                            {row.producer && (
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/50 pl-[18px]">{row.producer}</p>
                            )}
                          </div>
                          <div className="hidden text-center sm:col-span-2 sm:block">
                            {row.style && (
                              <span className="inline-flex items-center rounded-full bg-muted/14 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60">
                                {row.style}
                              </span>
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={cn("text-[13px] font-semibold tabular-nums", row.low ? "text-primary" : "text-[rgba(26,23,19,0.82)]")}>{row.qty}</span>
                          </div>
                          <div className="col-span-3 text-right sm:col-span-2">
                            <span className="text-[12px] font-medium text-[rgba(58,51,39,0.62)] tabular-nums sm:text-[13px]">{formatBRL(row.value)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="col-span-12 lg:col-span-5">
                <aside className="px-1">
                  <div className="space-y-5 border-t border-black/[0.05] pt-4 lg:border-t-0 lg:pt-0">
                    <div>
                      <p className="chart-surface-kicker">Operação</p>
                      <h2 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[rgba(26,23,19,0.88)]">Onde agir primeiro</h2>
                    </div>

                    <div className="space-y-3">
                      {lowStockRows.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground/50">Nenhum item em ruptura agora.</p>
                      ) : (
                        lowStockRows.slice(0, 6).map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => navigate(`/dashboard/inventory?q=${encodeURIComponent(w.name)}`)}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/7 text-primary shrink-0">
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-[rgba(26,23,19,0.86)]">{w.name}</p>
                              {w.producer && <p className="mt-0.5 truncate text-[11px] text-muted-foreground/50">{w.producer}</p>}
                            </div>
                            <span className="text-[12px] font-semibold text-primary tabular-nums">{w.quantity}</span>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="border-t border-black/[0.05] pt-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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
                            className="flex h-8 items-center justify-start gap-2 rounded-xl bg-transparent px-0 text-left hover:bg-transparent hover:text-primary"
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                            <span className="text-[12px] font-medium text-[rgba(58,51,39,0.70)]">{item.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </>
  );
}
