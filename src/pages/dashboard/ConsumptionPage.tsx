// Meu Consumo — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx ConsumptionPage).

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConsumption } from "@/hooks/useConsumption";
import { ConsumptionTimeline } from "@/components/ConsumptionTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EditorialCard,
  EditorialKpiCard,
  Kicker,
  Sparkbar,
} from "@/components/editorial/EditorialPrimitives";
import { Calendar, Check, ChevronDown, GlassWater, Star, TrendingUp } from "@/icons/lucide";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type PeriodFilter = "week" | "month" | "year";
type SourceFilter = "cellar" | "external";
type SortBy = "recent" | "old" | "rating";

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

const sourceOptions: Array<{ value: SourceFilter; label: string }> = [
  { value: "cellar", label: "Minha adega" },
  { value: "external", label: "Adega externa" },
];

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "recent", label: "Mais recentes" },
  { value: "old", label: "Mais antigos" },
  { value: "rating", label: "Melhor avaliados" },
];

const STORAGE_KEY = "sommelyx.consumption.filters.v1";

const FilterChoice = memo(function FilterChoice({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-[12.5px] font-medium leading-[1.18] transition-all duration-150 ease-out hover:bg-black/5 active:scale-[0.98]",
        active
          ? "bg-[rgba(95,127,82,0.12)] text-[#305231]"
          : "bg-white/0 text-[#2f2a22]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate">{label}</span>
      </span>
      {active ? <Check className="h-3.5 w-3.5 shrink-0 text-[#5F7F52]" /> : null}
    </button>
  );
});

function FilterPanel({
  title,
  mobileTitle,
  description,
  open,
  onOpenChange,
  mobile,
  children,
}: {
  title: string;
  mobileTitle: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobile: boolean;
  children: ReactNode;
}) {
  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="border-t border-white/50 p-4 pt-5">
          <SheetHeader className="mb-3 flex-col gap-1">
            <SheetTitle className="text-[17px] font-semibold tracking-tight text-[#1E1E1E]">
              {mobileTitle}
            </SheetTitle>
            {description ? (
              <p className="text-[11.5px] leading-[1.35] text-[rgba(58,51,39,0.58)]">{description}</p>
            ) : null}
          </SheetHeader>
          <div className="space-y-2">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent align="start" sideOffset={10} className="w-[280px] p-3">
        <div className="mb-2">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5F7F52]">{title}</p>
          {description ? (
            <p className="mt-1 text-[11.5px] leading-[1.35] text-[rgba(58,51,39,0.58)]">{description}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

function buildMonthWindow(size: number) {
  const months: Array<{ key: string; label: string }> = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - (size - 1));
  for (let i = 0; i < size; i++) {
    const d = new Date(cursor);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
      .toLowerCase();
    months.push({ key, label });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export default function ConsumptionPage() {
  const { data: entries = [], isLoading } = useConsumption();
  const [period, setPeriod] = useState<PeriodFilter>(() => {
    if (typeof window === "undefined") return "month";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return "month";
    try {
      const parsed = JSON.parse(stored) as Partial<{ period: PeriodFilter }>;
      return parsed.period ?? "month";
    } catch {
      return "month";
    }
  });
  const [source, setSource] = useState<Array<SourceFilter>>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as Partial<{ source: Array<SourceFilter> }>;
      return Array.isArray(parsed.source) ? parsed.source.filter((item): item is SourceFilter => item === "cellar" || item === "external") : [];
    } catch {
      return [];
    }
  });
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (typeof window === "undefined") return "recent";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return "recent";
    try {
      const parsed = JSON.parse(stored) as Partial<{ sortBy: SortBy }>;
      return parsed.sortBy ?? "recent";
    } catch {
      return "recent";
    }
  });
  const [openFilter, setOpenFilter] = useState<"period" | "source" | "sort" | null>(null);
  const [displayEntries, setDisplayEntries] = useState(entries);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const isMobile = useIsMobile();
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const filterTimeoutRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const periodValueLabel = periodOptions.find((opt) => opt.value === period)?.label ?? "Mês";
  const sourceValueLabel = useMemo(() => {
    if (source.length === 0) return "Todas";
    return sourceOptions
      .filter((opt) => source.includes(opt.value))
      .map((opt) => opt.label)
      .join(" · ");
  }, [source]);
  const sourceButtonLabel = useMemo(() => {
    if (source.length === 0) return "Todas";
    if (source.length === 2) return "Ambas";
    return sourceOptions.find((opt) => source.includes(opt.value))?.label ?? "Todas";
  }, [source]);
  const sortValueLabel = sortOptions.find((opt) => opt.value === sortBy)?.label ?? "Mais recentes";
  const activeFilterSummary = useMemo(() => {
    const parts = [
      `Período: ${periodValueLabel}`,
      `Origem: ${sourceValueLabel}`,
      `Ordenar: ${sortValueLabel}`,
    ];
    const hasActiveFilters = period !== "month" || source.length > 0 || sortBy !== "recent";
    return hasActiveFilters ? parts.join(" · ") : "";
  }, [period, periodValueLabel, source.length, sourceValueLabel, sortBy, sortValueLabel]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        period,
        source,
        sortBy,
      }),
    );
  }, [period, source, sortBy]);

  const toggleSource = (value: SourceFilter) => {
    setSource((current) => {
      if (current.includes(value)) {
        const next = current.filter((item) => item !== value);
        return next;
      }
      return [...current, value].sort();
    });
  };

  const setAllSources = () => setSource([]);

  const clearFilters = () => {
    setPeriod("month");
    setSource([]);
    setSortBy("recent");
    setOpenFilter(null);
  };

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const filtered = entries.filter((entry) => {
      const d = new Date(entry.consumed_at);
      if (period === "week") {
        const diff = (now.getTime() - d.getTime()) / 86_400_000;
        if (diff > 7 || diff < 0) return false;
      } else if (period === "month") {
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      } else if (period === "year") {
        if (d.getFullYear() !== now.getFullYear()) return false;
      }
      const isCellar = !!entry.wine_id || entry.source === "cellar";
      if (source.length > 0 && !((source.includes("cellar") && isCellar) || (source.includes("external") && !isCellar))) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sortBy === "recent") {
      sorted.sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime());
    } else if (sortBy === "old") {
      sorted.sort((a, b) => new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime());
    } else if (sortBy === "rating") {
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    }
    return sorted;
  }, [entries, period, source, sortBy]);

  const months = useMemo(() => buildMonthWindow(6), []);
  // Buckets reativos ao filtro de Período + Origem
  const chart = useMemo(() => {
    const now = new Date();
    const isInSource = (entry: typeof entries[number]) => {
      const isCellar = !!entry.wine_id || entry.source === "cellar";
      if (source.length === 0) return true;
      if (source.includes("cellar") && isCellar) return true;
      if (source.includes("external") && !isCellar) return true;
      return false;
    };

    if (period === "week") {
      // Últimos 7 dias
      const buckets: Array<{ key: string; label: string }> = [];
      const cursor = new Date(now);
      cursor.setHours(0, 0, 0, 0);
      cursor.setDate(cursor.getDate() - 6);
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const label = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(0, 3).toLowerCase();
        buckets.push({ key, label });
        cursor.setDate(cursor.getDate() + 1);
      }
      const map: Record<string, number> = {};
      entries.filter(isInSource).forEach((c) => {
        const d = new Date(c.consumed_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        map[key] = (map[key] || 0) + 1;
      });
      return {
        title: "Últimos 7 dias",
        data: buckets.map((b) => ({ label: b.label, value: map[b.key] || 0 })),
      };
    }

    if (period === "year") {
      // 12 meses do ano atual
      const buckets = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), i, 1);
        return {
          key: `${d.getFullYear()}-${String(i + 1).padStart(2, "0")}`,
          label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").slice(0, 3).toLowerCase(),
        };
      });
      const map: Record<string, number> = {};
      entries.filter(isInSource).forEach((c) => {
        const d = new Date(c.consumed_at);
        if (d.getFullYear() !== now.getFullYear()) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        map[key] = (map[key] || 0) + 1;
      });
      return {
        title: `Ano de ${now.getFullYear()}`,
        data: buckets.map((b) => ({ label: b.label, value: map[b.key] || 0 })),
      };
    }

    // month → últimos 6 meses (default)
    const buckets = months;
    const map: Record<string, number> = {};
    entries.filter(isInSource).forEach((c) => {
      const d = new Date(c.consumed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return {
      title: "Últimos 6 meses",
      data: buckets.map((m) => ({ label: m.label, value: map[m.key] || 0 })),
    };
  }, [entries, period, source, months]);
  const defaultActiveChartIndex = useMemo(() => {
    let last = null as number | null;
    chart.data.forEach((item, index) => {
      if (item.value > 0) last = index;
    });
    return last;
  }, [chart.data]);
  const [activeChartIndex, setActiveChartIndex] = useState<number | null>(defaultActiveChartIndex);
  const [tooltipChartIndex, setTooltipChartIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveChartIndex(defaultActiveChartIndex);
    setTooltipChartIndex(null);
  }, [defaultActiveChartIndex]);

  const total = entries.length;
  const avgPerMonth = total > 0 ? (total / 6).toFixed(1).replace(".", ",") : "0";

  const styleStats = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      const s = (e.style || "").toLowerCase();
      let family = "outros";
      if (s.includes("tinto")) family = "Tinto";
      else if (s.includes("branco")) family = "Branco";
      else if (s.includes("ros")) family = "Rosé";
      else if (s.includes("espum")) family = "Espumante";
      else if (s.includes("sobrem") || s.includes("fortif")) family = "Sobremesa";
      counts[family] = (counts[family] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!sorted.length || total === 0) return { name: "—", pct: 0 };
    const [name, n] = sorted[0];
    return { name, pct: Math.round((n / total) * 100) };
  }, [entries, total]);

  const lastEntry = entries[0];
  const lastLabel = lastEntry
    ? (() => {
        const days = Math.max(
          0,
          Math.round((Date.now() - new Date(lastEntry.consumed_at).getTime()) / 86_400_000),
        );
        return days === 0 ? "hoje" : `há ${days}d`;
      })()
    : "—";

  useEffect(() => {
    if (!hasLoadedOnce) {
      setDisplayEntries(filteredEntries);
      setHasLoadedOnce(true);
      return;
    }

    if (filterTimeoutRef.current) window.clearTimeout(filterTimeoutRef.current);
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);

    setIsFiltering(true);
    filterTimeoutRef.current = window.setTimeout(() => {
      setDisplayEntries(filteredEntries);
    }, 100);
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsFiltering(false);
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 240);

    return () => {
      if (filterTimeoutRef.current) window.clearTimeout(filterTimeoutRef.current);
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    };
  }, [filteredEntries, hasLoadedOnce]);

  if (isLoading) {
    return (
      <div className="editorial-page">
        <EditorialCard style={{ padding: "14px 14px 12px" }}>
          <Skeleton className="h-3 w-28 rounded-full bg-black/5" />
          <Skeleton className="mt-2 h-7 w-52 rounded-full bg-black/5" />
          <Skeleton className="mt-2 h-4 w-64 rounded-full bg-black/5" />
        </EditorialCard>
      </div>
    );
  }

  return (
    <div className="editorial-page">
      <header>
        <Kicker>Histórico pessoal</Kicker>
        <h1 className="editorial-page-h1 mt-1">Meu Consumo</h1>
        <p
          className="mt-1 max-w-[560px] text-[12.5px] leading-[1.35]"
          style={{ color: "rgba(58,51,39,0.6)" }}
        >
          Tudo que você abriu nos últimos meses, com ocasiões e ritmo.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <EditorialKpiCard
          icon={<GlassWater className="h-4 w-4" />}
          accent="#7B1E2B"
          label="Consumo (6 meses)"
          value={total}
          sub="garrafas"
          layout="row"
        />
        <EditorialKpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          accent="#5F7F52"
          label="Ritmo mensal"
          value={avgPerMonth}
          sub="por mês"
          layout="row"
        />
        <EditorialKpiCard
          icon={<Star className="h-4 w-4" />}
          accent="#B48C3A"
          label="Estilo favorito"
          value={styleStats.name}
          sub={styleStats.pct > 0 ? `${styleStats.pct}% do consumo` : ""}
          layout="row"
        />
        <EditorialKpiCard
          icon={<Calendar className="h-4 w-4" />}
          accent="#6B8298"
          label="Última abertura"
          value={lastLabel}
          sub={lastEntry?.wine_name || ""}
          layout="row"
        />
      </div>

      {/* Monthly chart */}
      <EditorialCard style={{ padding: "12px 12px 10px" }}>
        <div className="mb-2 flex items-baseline justify-between">
          <div>
            <Kicker>Ritmo de consumo</Kicker>
            <h2 className="editorial-h2 mt-1 text-[18px] md:text-[22px]">{chart.title}</h2>
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.10em] text-[rgba(58,51,39,0.5)]">
            garrafas / {period === "week" ? "dia" : "mês"}
          </span>
        </div>
        <Sparkbar
          data={chart.data}
          accent="#8A6A54"
          height={128}
          showValues={!isMobile}
          activeIndex={activeChartIndex}
          tooltipIndex={isMobile ? tooltipChartIndex : null}
          onBarSelect={(index) => {
            setActiveChartIndex(index);
            if (isMobile) setTooltipChartIndex(index);
          }}
          barWidth={period === "year" ? 6 : 10}
        />
      </EditorialCard>

      {/* Filtros inteligentes */}
      {isMobile ? (
        <div className="mt-3 w-full">
          <div className="flex w-full items-center gap-1.5">
            {[
              { kind: "period" as const, label: "Período", aria: "Filtrar período" },
              { kind: "source" as const, label: "Origem", aria: "Filtrar origem" },
              { kind: "sort" as const, label: "Ordenar", aria: "Ordenar consumo" },
            ].map((filter) => {
              const active = openFilter === filter.kind;
              return (
                <button
                  key={filter.kind}
                  type="button"
                  aria-label={filter.aria}
                  onClick={() => setOpenFilter(active ? null : filter.kind)}
                  className={cn(
                    "flex h-[34px] min-w-0 flex-1 items-center justify-between gap-1.5 rounded-[11px] border px-2 py-1 text-[12.5px] font-medium leading-none transition-all duration-150 ease-out hover:-translate-y-px active:scale-[0.98] overflow-hidden",
                    active
                      ? "border-[rgba(132,168,108,0.34)] bg-[rgba(132,168,108,0.12)] text-[#23402b] shadow-[0_4px_10px_-12px_rgba(95,127,82,0.18)]"
                      : "border-[rgba(132,168,108,0.24)] bg-[rgba(132,168,108,0.06)] text-[#2f2a22]",
                  )}
                >
                  <span className="min-w-0 truncate text-[12.5px] font-semibold tracking-[-0.01em] text-[#213b26]">
                    {filter.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 shrink-0 text-[#5F7F52]/60 transition-transform duration-150 ease-out",
                      active && "rotate-180",
                    )}
                  />
                </button>
              );
            })}
          </div>
          {[
            { kind: "period" as const, title: "Período", value: periodValueLabel },
            { kind: "source" as const, title: "Origem", value: sourceValueLabel },
            { kind: "sort" as const, title: "Ordenar", value: sortValueLabel },
          ].map((box) => {
            const open = openFilter === box.kind;
            const options =
              box.kind === "period"
                ? periodOptions.map((opt) => (
                    <FilterChoice
                      key={opt.value}
                      active={period === opt.value}
                      label={opt.label}
                      onClick={() => {
                        setPeriod(opt.value);
                        setOpenFilter(null);
                      }}
                    />
                  ))
                : box.kind === "source"
                  ? [
                      <FilterChoice
                        key="all"
                        active={source.length === 0}
                        label="Todas"
                        onClick={() => {
                          setAllSources();
                          setOpenFilter(null);
                        }}
                      />,
                      ...sourceOptions.map((opt) => (
                        <FilterChoice
                          key={opt.value}
                          active={source.includes(opt.value)}
                          label={opt.label}
                          onClick={() => toggleSource(opt.value)}
                        />
                      )),
                    ]
                  : sortOptions.map((opt) => (
                      <FilterChoice
                        key={opt.value}
                        active={sortBy === opt.value}
                        label={opt.label}
                        onClick={() => {
                          setSortBy(opt.value);
                          setOpenFilter(null);
                        }}
                      />
                    ));

            return (
              <FilterPanel
                key={box.kind}
                title={box.title}
                mobileTitle={box.title}
                description={
                  box.kind === "period"
                    ? "Escolha a janela de análise."
                    : box.kind === "source"
                      ? "Selecione uma ou mais origens."
                      : "Escolha a ordem da lista."
                }
                open={open}
                onOpenChange={(next) => setOpenFilter(next ? box.kind : null)}
                mobile
              >
                <div className="space-y-1.5">{options}</div>
              </FilterPanel>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          {[
          { kind: "period" as const, title: "Período", value: periodValueLabel },
          { kind: "source" as const, title: "Origem", value: sourceValueLabel },
          { kind: "sort" as const, title: "Ordenar", value: sortValueLabel },
        ].map((box) => {
          const open = openFilter === box.kind;
          const options =
            box.kind === "period"
              ? periodOptions.map((opt) => (
                  <FilterChoice
                    key={opt.value}
                    active={period === opt.value}
                    label={opt.label}
                    onClick={() => {
                      setPeriod(opt.value);
                      setOpenFilter(null);
                    }}
                  />
                ))
              : box.kind === "source"
                ? [
                    <FilterChoice
                      key="all"
                      active={source.length === 0}
                      label="Todas"
                      onClick={() => {
                        setAllSources();
                        setOpenFilter(null);
                      }}
                    />,
                    ...sourceOptions.map((opt) => (
                      <FilterChoice
                        key={opt.value}
                        active={source.includes(opt.value)}
                        label={opt.label}
                        onClick={() => toggleSource(opt.value)}
                      />
                    )),
                  ]
                : sortOptions.map((opt) => (
                    <FilterChoice
                      key={opt.value}
                      active={sortBy === opt.value}
                      label={opt.label}
                      onClick={() => {
                        setSortBy(opt.value);
                        setOpenFilter(null);
                      }}
                    />
                  ));

          const trigger = (
              <button
                type="button"
                onClick={() => setOpenFilter(open ? null : box.kind)}
                className={cn(
                "flex min-h-[66px] w-full items-center justify-between rounded-[20px] border px-4 text-left transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_10px_24px_-18px_rgba(95,127,82,0.22)]",
                open
                  ? "border-[rgba(95,111,82,0.26)] bg-[rgba(95,111,82,0.08)]"
                  : "border-[rgba(95,111,82,0.14)] bg-[rgba(255,255,255,0.88)]",
              )}
            >
              <span className="min-w-0">
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5F7F52]">
                  {box.title}
                </span>
                <span className="mt-1 block truncate text-[13.5px] font-semibold leading-[1.15] text-[#1E1E1E]">
                  {box.value}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-[#5F7F52] transition-transform duration-150 ease-out",
                  open && "rotate-180",
                )}
              />
            </button>
          );

          return (
            <div key={box.kind} className="min-w-0">
              <Popover open={open} onOpenChange={(next) => setOpenFilter(next ? box.kind : null)}>
                <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                <FilterPanel
                  title={box.title}
                  mobileTitle={box.title}
                  description={
                    box.kind === "period"
                      ? "Escolha a janela de análise."
                      : box.kind === "source"
                        ? "Selecione uma ou mais origens."
                        : "Escolha a ordem da lista."
                  }
                  open={open}
                  onOpenChange={(next) => setOpenFilter(next ? box.kind : null)}
                  mobile={false}
                >
                  <div className="space-y-1.5">{options}</div>
                </FilterPanel>
              </Popover>
            </div>
          );
        })}
        </div>
      )}

      {activeFilterSummary ? (
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(95,111,82,0.12)] bg-[rgba(95,111,82,0.05)] px-3 py-2 text-[11.5px] leading-[1.25] text-[rgba(58,51,39,0.72)]">
          <p className="min-w-0 flex-1 truncate">
            {activeFilterSummary}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 rounded-full border border-[rgba(95,111,82,0.14)] bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5F7F52] transition-all duration-150 ease-out hover:-translate-y-px hover:scale-[1.01] hover:bg-white"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}

      <div ref={resultsRef} className={cn("transition-all duration-150 ease-out", isFiltering ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0")}>
        {isFiltering ? (
          <EditorialCard style={{ padding: "14px 14px 12px" }}>
            <div className="space-y-3">
              <Skeleton className="h-4 w-36 rounded-full bg-black/5" />
              <Skeleton className="h-20 w-full rounded-[16px] bg-black/5" />
              <Skeleton className="h-20 w-full rounded-[16px] bg-black/5" />
            </div>
          </EditorialCard>
        ) : displayEntries.length === 0 ? (
          <EditorialCard style={{ padding: "16px 16px 18px" }}>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="font-serif text-[15px] text-[rgba(26,23,19,0.72)]">
                {entries.length === 0
                  ? "Você ainda não registrou nenhum consumo"
                  : "Nenhum vinho encontrado para esses filtros"}
              </p>
              <p className="mt-1 text-[12px] text-[#7A746B]">
                {entries.length === 0
                  ? "Quando você abrir uma garrafa, ela aparecerá aqui."
                  : "Ajuste os filtros ou limpe a seleção para ver mais brindes."}
              </p>
              {activeFilterSummary ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-full border border-[rgba(95,111,82,0.14)] bg-[rgba(95,111,82,0.06)] px-3 py-1.5 text-[11px] font-semibold text-[#5F7F52] transition-all duration-150 ease-out hover:-translate-y-px hover:scale-[1.01]"
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          </EditorialCard>
        ) : (
          <ConsumptionTimeline entries={displayEntries} />
        )}
      </div>
    </div>
  );
}
