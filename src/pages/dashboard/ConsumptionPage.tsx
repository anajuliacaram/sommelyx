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
import { ActionDialog, ActionDialogContent } from "@/components/ai-flow/ActionDialog";
import {
  AiModalBody,
  AiModalFooterBar,
  AiModalHeader,
  AiModalHeaderBar,
  AiModalShell,
} from "@/components/ai-flow/ModalLayout";
import { cn } from "@/lib/utils";

type PeriodFilter = "all" | "week" | "month" | "year";
type SortBy = "alphabetical" | "most_consumed" | "least_consumed" | "recent";
type ConsumptionFilters = {
  period: PeriodFilter;
  countries: string[];
  sortBy: SortBy;
};

const defaultFilters: ConsumptionFilters = {
  period: "all",
  countries: [],
  sortBy: "recent",
};

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "alphabetical", label: "Alfabético" },
  { value: "most_consumed", label: "Mais consumidos" },
  { value: "least_consumed", label: "Menos consumidos" },
  { value: "recent", label: "Mais recentes" },
];

const STORAGE_KEY = "sommelyx.consumption.filters.v2";
const EMPTY_CONSUMPTION_ENTRIES: NonNullable<ReturnType<typeof useConsumption>["data"]> = [];

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

const CountryChoice = memo(function CountryChoice({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
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
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
            active
              ? "border-[#5F7F52] bg-[#5F7F52] text-white"
              : "border-[rgba(95,127,82,0.28)] bg-white text-transparent",
          )}
        >
          <Check className="h-2.5 w-2.5" />
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </span>
      {typeof count === "number" ? (
        <span className="shrink-0 text-[10.5px] uppercase tracking-[0.08em] text-[rgba(58,51,39,0.52)]">
          {count}
        </span>
      ) : null}
    </button>
  );
});

function FilterPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <PopoverContent align="start" sideOffset={10} className="w-[280px] p-3">
      <div className="mb-2">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5F7F52]">{title}</p>
        {description ? (
          <p className="mt-1 text-[11.5px] leading-[1.35] text-[rgba(58,51,39,0.58)]">{description}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">{children}</div>
    </PopoverContent>
  );
}

export default function ConsumptionPage() {
  const { data: rawEntries = EMPTY_CONSUMPTION_ENTRIES, isLoading } = useConsumption();
  const entries = useMemo(() => {
    return rawEntries
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => {
        const consumedAt = new Date(entry.consumed_at);
        const rating = entry.rating == null ? null : Number(entry.rating);
        return {
          ...entry,
          wine_name: entry.wine_name?.trim() || "Vinho sem nome",
          consumed_at: Number.isNaN(consumedAt.getTime()) ? new Date().toISOString() : entry.consumed_at,
          rating: rating != null && Number.isFinite(rating) ? rating : null,
        };
      });
  }, [rawEntries]);
  const [filters, setFilters] = useState<ConsumptionFilters>(() => {
    if (typeof window === "undefined") return defaultFilters;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultFilters;
    try {
      const parsed = JSON.parse(stored) as Partial<ConsumptionFilters>;
      return {
        period: parsed.period ?? defaultFilters.period,
        countries: Array.isArray(parsed.countries)
          ? parsed.countries.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          : defaultFilters.countries,
        sortBy: parsed.sortBy && ["alphabetical", "most_consumed", "least_consumed", "recent"].includes(parsed.sortBy)
          ? parsed.sortBy
          : defaultFilters.sortBy,
      };
    } catch {
      return defaultFilters;
    }
  });
  const [openFilter, setOpenFilter] = useState<"period" | "country" | "sort" | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<ConsumptionFilters>(filters);
  const [displayEntries, setDisplayEntries] = useState(entries);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const isMobile = useIsMobile();
  const filterTimeoutRef = useRef<number | null>(null);

  const countryOptions = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((entry) => {
      const country = entry.country?.trim();
      if (!country) return;
      map.set(country, (map.get(country) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([label, count]) => ({ value: label, label, count }));
  }, [entries]);

  const periodValueLabel = periodOptions.find((opt) => opt.value === filters.period)?.label ?? "Todos";
  const countryValueLabel = useMemo(() => {
    if (filters.countries.length === 0) return "Todos";
    const labels = countryOptions
      .filter((opt) => filters.countries.includes(opt.value))
      .map((opt) => opt.label);
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  }, [countryOptions, filters.countries]);
  const sortValueLabel = sortOptions.find((opt) => opt.value === filters.sortBy)?.label ?? "Mais recentes";
  const hasActiveFilters =
    filters.period !== defaultFilters.period ||
    filters.countries.length > 0 ||
    filters.sortBy !== defaultFilters.sortBy;
  const activeFilterSummary = useMemo(() => {
    const parts = [
      `Período: ${periodValueLabel}`,
      `País: ${countryValueLabel}`,
      `Ordenar: ${sortValueLabel}`,
    ];
    return hasActiveFilters ? parts.join(" · ") : "";
  }, [countryValueLabel, hasActiveFilters, periodValueLabel, sortValueLabel]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        period: filters.period,
        countries: filters.countries,
        sortBy: filters.sortBy,
      }),
    );
  }, [filters]);

  useEffect(() => {
    if (mobileFiltersOpen) {
      setDraftFilters(filters);
    }
  }, [filters, mobileFiltersOpen]);

  const clearFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setOpenFilter(null);
    setMobileFiltersOpen(false);
  };

  const setFilter = (updater: Partial<ConsumptionFilters>) => {
    setFilters((current) => ({ ...current, ...updater }));
  };

  const toggleCountry = (country: string, target: "filters" | "draft" = "filters") => {
    const setter = target === "filters" ? setFilters : setDraftFilters;
    setter((current) => {
      const hasCountry = current.countries.includes(country);
      const nextCountries = hasCountry
        ? current.countries.filter((value) => value !== country)
        : [...current.countries, country];
      return {
        ...current,
        countries: nextCountries.sort((a, b) => a.localeCompare(b, "pt-BR")),
      };
    });
  };

  const applyDraftFilters = () => {
    setFilters(draftFilters);
    setMobileFiltersOpen(false);
  };

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const withinPeriod = (value: string) => {
      const consumedAt = new Date(value);
      if (filters.period === "all") return true;
      if (filters.period === "week") {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 6);
        return consumedAt >= start && consumedAt <= now;
      }
      if (filters.period === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return consumedAt >= start && consumedAt <= end;
      }
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return consumedAt >= start && consumedAt <= end;
    };

    const filtered = entries.filter((entry) => {
      if (!withinPeriod(entry.consumed_at)) return false;
      if (filters.countries.length > 0) {
        const entryCountry = (entry.country || "").trim().toLowerCase();
        if (!entryCountry) return false;
        if (!filters.countries.some((country) => country.trim().toLowerCase() === entryCountry)) return false;
      }
      return true;
    });

    const consumptionCountByWine = new Map<string, number>();
    filtered.forEach((entry) => {
      const key = (entry.wine_name || "").trim().toLowerCase();
      if (!key) return;
      consumptionCountByWine.set(key, (consumptionCountByWine.get(key) ?? 0) + 1);
    });

    const sorted = [...filtered].sort((a, b) => {
      const aName = (a.wine_name || "").trim();
      const bName = (b.wine_name || "").trim();
      const aCount = consumptionCountByWine.get(aName.toLowerCase()) ?? 0;
      const bCount = consumptionCountByWine.get(bName.toLowerCase()) ?? 0;

      switch (filters.sortBy) {
        case "alphabetical":
          return aName.localeCompare(bName, "pt-BR");
        case "most_consumed":
          if (bCount !== aCount) return bCount - aCount;
          return new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime();
        case "least_consumed":
          if (aCount !== bCount) return aCount - bCount;
          return new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime();
        default:
          return new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime();
      }
    });

    return sorted;
  }, [entries, filters]);

  const chart = useMemo(() => {
    const now = new Date();
    const bucketMap: Record<string, number> = {};
    const isMonth = filters.period === "month";
    const isWeek = filters.period === "week";
    const sourceEntries = filteredEntries;

    if (isWeek) {
      const buckets: Array<{ key: string; label: string }> = [];
      const cursor = new Date(now);
      cursor.setHours(0, 0, 0, 0);
      cursor.setDate(cursor.getDate() - 6);
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        buckets.push({
          key,
          label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").slice(0, 3).toLowerCase(),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      sourceEntries.forEach((entry) => {
        const d = new Date(entry.consumed_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        bucketMap[key] = (bucketMap[key] || 0) + 1;
      });
      return {
        title: "Últimos 7 dias",
        data: buckets.map((bucket) => ({ label: bucket.label, value: bucketMap[bucket.key] || 0 })),
      };
    }

    if (isMonth) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const buckets = Array.from({ length: 5 }, (_, i) => {
        const from = i * 7 + 1;
        const to = Math.min((i + 1) * 7, daysInMonth);
        return {
          key: `${i}`,
          label: `${from}-${to}`,
        };
      });
      sourceEntries.forEach((entry) => {
        const d = new Date(entry.consumed_at);
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
        const bucketIndex = Math.min(Math.floor((d.getDate() - 1) / 7), 4);
        bucketMap[String(bucketIndex)] = (bucketMap[String(bucketIndex)] || 0) + 1;
      });
      return {
        title: "Mês atual",
        data: buckets.map((bucket) => ({ label: bucket.label, value: bucketMap[bucket.key] || 0 })),
      };
    }

    const buckets =
      filters.period === "all"
        ? Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now);
            d.setMonth(d.getMonth() - (11 - i));
            return {
              key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
              label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").slice(0, 3).toLowerCase(),
            };
          })
        : Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), i, 1);
            return {
              key: `${d.getFullYear()}-${String(i + 1).padStart(2, "0")}`,
              label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").slice(0, 3).toLowerCase(),
            };
          });
    sourceEntries.forEach((entry) => {
      const d = new Date(entry.consumed_at);
      const key =
        filters.period === "all"
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      bucketMap[key] = (bucketMap[key] || 0) + 1;
    });
    return {
      title: filters.period === "all" ? "Últimos 12 meses" : `Ano de ${now.getFullYear()}`,
      data: buckets.map((bucket) => ({ label: bucket.label, value: bucketMap[bucket.key] || 0 })),
    };
  }, [entries, filteredEntries, filters.countries, filters.period]);
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

  const total = filteredEntries.length;
  const avgPerMonthValue = filters.period === "week" ? total * 4.33 : filters.period === "month" ? total : filters.period === "year" ? total / 12 : total / 12;
  const avgPerMonth = avgPerMonthValue.toFixed(1).replace(".", ",");

  const styleStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEntries.forEach((e) => {
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
  }, [filteredEntries, total]);

  const lastEntry = filteredEntries[0];
  const chartDisplayData = useMemo(() => {
    if (!isMobile || chart.data.length <= 6) return chart.data;
    const step = chart.data.length > 8 ? 3 : 2;
    const lastIndex = chart.data.length - 1;
    return chart.data.map((item, index) => ({
      ...item,
      label: index % step === 0 || index === lastIndex ? item.label : "",
    }));
  }, [chart.data, isMobile]);
  const filteredEntriesKey = useMemo(
    () => filteredEntries.map((entry) => `${entry.id}:${entry.consumed_at}:${entry.rating ?? ""}`).join("|"),
    [filteredEntries],
  );
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

    setIsFiltering(true);
    setDisplayEntries(filteredEntries);
    filterTimeoutRef.current = window.setTimeout(() => {
      setIsFiltering(false);
    }, 120);

    return () => {
      if (filterTimeoutRef.current) window.clearTimeout(filterTimeoutRef.current);
    };
  }, [filteredEntriesKey, hasLoadedOnce]);

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
    <div className="editorial-page consumo-page">
      <header className="consumption-page-header">
        <Kicker className="consumo-eyebrow">Meu Consumo</Kicker>
        <h1 className="editorial-page-h1 consumo-title mt-1">Brindes recentes</h1>
      </header>

      {/* KPIs */}
      <div className="stats-grid grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <EditorialKpiCard
          icon={<GlassWater className="h-4 w-4" />}
          accent="#781323"
          label="Consumo (6 meses)"
          value={total}
          sub="garrafas"
          layout="row"
          animatedValue={total}
          motionIndex={0}
          className="consumo-stat-card"
        />
        <EditorialKpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          accent="#2F432F"
          label="Ritmo mensal"
          value={avgPerMonth}
          sub="por mês"
          layout="row"
          animatedValue={avgPerMonthValue}
          valueFormatter={(value) => value.toFixed(1).replace(".", ",")}
          motionIndex={1}
          className="consumo-stat-card"
        />
        <EditorialKpiCard
          icon={<Star className="h-4 w-4" />}
          accent="#781323"
          label="Estilo favorito"
          value={styleStats.name}
          sub={styleStats.pct > 0 ? `${styleStats.pct}% do consumo` : ""}
          layout="row"
          motionIndex={2}
          className="consumo-stat-card"
        />
        <EditorialKpiCard
          icon={<Calendar className="h-4 w-4" />}
          accent="#2F432F"
          label="Última abertura"
          value={lastLabel}
          sub={lastEntry?.wine_name || ""}
          layout="row"
          motionIndex={3}
          className="consumo-stat-card"
        />
      </div>

      {lastEntry ? (
        <section className="last-opened-card">
          <p className="last-opened-eyebrow">Último aberto</p>
          <p className="last-opened-time">{lastLabel}</p>
          <h2 className="last-opened-name">{lastEntry.wine_name}</h2>
          <p className="last-opened-rating">
            {[lastEntry.producer, lastEntry.vintage, lastEntry.country].filter(Boolean).join(" · ") || "Registro de consumo"}
          </p>
        </section>
      ) : null}

      {/* Monthly chart */}
      <EditorialCard className="consumo-chart-card consumo-chart-wrap">
        <div className="chart-header mb-2 flex items-baseline justify-between">
          <div>
            <Kicker>Ritmo de consumo</Kicker>
            <h2 className="chart-title editorial-h2 mt-1 text-[18px] md:text-[22px]">{chart.title}</h2>
          </div>
          <span className="chart-total">
            {total}
          </span>
        </div>
        <Sparkbar
          data={chartDisplayData}
          accent="#781323"
          height={isMobile ? 68 : 100}
          showValues={!isMobile}
          activeIndex={activeChartIndex}
          tooltipIndex={isMobile ? tooltipChartIndex : null}
          onBarSelect={(index) => {
            setActiveChartIndex(index);
            if (isMobile) setTooltipChartIndex(index);
          }}
          barWidth={isMobile ? (chartDisplayData.length > 8 ? 7 : 9) : filters.period === "year" ? 6 : 10}
        />
      </EditorialCard>

      {/* Filtros inteligentes */}
      {isMobile ? (
        <div className="mt-3 w-full">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className={cn(
              "consumption-filter-trigger flex w-full items-center justify-between border text-left font-semibold tracking-[-0.01em] transition-all duration-150 ease-out hover:-translate-y-px active:scale-[0.98]",
              hasActiveFilters
                ? "border-[rgba(95,127,82,0.24)] bg-[rgba(95,127,82,0.08)] text-[#213b26]"
                : "border-[rgba(95,127,82,0.18)] bg-[rgba(255,255,255,0.82)] text-[#1E1E1E]",
            )}
          >
            <span className="flex min-w-0 flex-col items-start">
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#5F7F52]">Filtros</span>
              <span className="min-w-0 truncate text-[12px] font-semibold text-[#1E1E1E]">
                {hasActiveFilters ? activeFilterSummary || "Todos os filtros" : "Período, país e ordenação"}
              </span>
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#5F7F52] transition-transform duration-150 ease-out", mobileFiltersOpen && "rotate-180")} />
          </button>

          <ActionDialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <ActionDialogContent className="consumption-filter-modal sx-action-modal" aria-label="Filtros de consumo">
              <AiModalShell>
                <AiModalHeaderBar>
                  <AiModalHeader
                    icon={<Calendar className="h-5 w-5" />}
                    title="Filtros de consumo"
                    tone="neutral"
                  />
                </AiModalHeaderBar>

                <AiModalBody className="consumption-filter-body">
                  <div className="consumption-filter-sections">
                    <div className="consumption-filter-section">
                      <p className="consumption-filter-section-label">Período</p>
                      <div className="space-y-1.5">
                        {periodOptions.map((opt) => (
                          <FilterChoice
                            key={opt.value}
                            active={draftFilters.period === opt.value}
                            label={opt.label}
                            onClick={() => setDraftFilters((current) => ({ ...current, period: opt.value }))}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="consumption-filter-section">
                      <p className="consumption-filter-section-label">País</p>
                      <div className="space-y-1.5">
                        <FilterChoice
                          active={draftFilters.countries.length === 0}
                          label="Todos"
                          onClick={() => setDraftFilters((current) => ({ ...current, countries: [] }))}
                        />
                        {countryOptions.map((opt) => (
                          <CountryChoice
                            key={opt.value}
                            active={draftFilters.countries.includes(opt.value)}
                            label={opt.label}
                            count={opt.count}
                            onClick={() => toggleCountry(opt.value, "draft")}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="consumption-filter-section">
                      <p className="consumption-filter-section-label">Ordenar</p>
                      <div className="space-y-1.5">
                        {sortOptions.map((opt) => (
                          <FilterChoice
                            key={opt.value}
                            active={draftFilters.sortBy === opt.value}
                            label={opt.label}
                            onClick={() => setDraftFilters((current) => ({ ...current, sortBy: opt.value }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </AiModalBody>

                <AiModalFooterBar className="consumption-filter-footer">
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="consumption-filter-clear"
                    >
                      Limpar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={applyDraftFilters}
                    className="consumption-filter-apply"
                  >
                    Aplicar
                  </button>
                </AiModalFooterBar>
              </AiModalShell>
            </ActionDialogContent>
          </ActionDialog>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-3">
          {[
            { kind: "period" as const, title: "Período", value: periodValueLabel },
            { kind: "country" as const, title: "País", value: countryValueLabel },
            { kind: "sort" as const, title: "Ordenar", value: sortValueLabel },
          ].map((box) => {
            const open = openFilter === box.kind;
            const options =
              box.kind === "period"
                ? periodOptions.map((opt) => (
                    <FilterChoice
                      key={opt.value}
                      active={filters.period === opt.value}
                      label={opt.label}
                      onClick={() => {
                        setFilter({ period: opt.value });
                        setOpenFilter(null);
                      }}
                    />
                  ))
                : box.kind === "country"
                  ? [
                      <FilterChoice
                        key="all"
                        active={filters.countries.length === 0}
                        label="Todos"
                        onClick={() => {
                          setFilter({ countries: [] });
                          setOpenFilter(null);
                        }}
                      />,
                      ...countryOptions.map((opt) => (
                        <CountryChoice
                          key={opt.value}
                          active={filters.countries.includes(opt.value)}
                          label={opt.label}
                          count={opt.count}
                          onClick={() => toggleCountry(opt.value)}
                        />
                      )),
                    ]
                  : sortOptions.map((opt) => (
                      <FilterChoice
                        key={opt.value}
                        active={filters.sortBy === opt.value}
                        label={opt.label}
                        onClick={() => {
                          setFilter({ sortBy: opt.value });
                          setOpenFilter(null);
                        }}
                      />
                    ));

            const trigger = (
              <button
                type="button"
                onClick={() => setOpenFilter(open ? null : box.kind)}
                className={cn(
                  "filter-dropdown flex min-h-[66px] w-full items-center justify-between rounded-[20px] border px-4 text-left transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-[0_10px_24px_-18px_rgba(95,127,82,0.22)]",
                  open
                    ? "border-[rgba(95,111,82,0.26)] bg-[rgba(95,111,82,0.08)]"
                    : "border-[rgba(95,111,82,0.14)] bg-[rgba(255,255,255,0.88)]",
                )}
              >
                <span className="min-w-0">
                  <span className="filter-label block text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#5F7F52]">
                    {box.title}
                  </span>
                  <span className="filter-value mt-1 block truncate text-[13.5px] font-semibold leading-[1.15] text-[#1E1E1E]">
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
                    description={
                      box.kind === "period"
                        ? "Escolha a janela de análise."
                        : box.kind === "country"
                          ? "Selecione um ou mais países."
                          : "Escolha a ordem da lista."
                    }
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

      <div className={cn("transition-all duration-150 ease-out", isFiltering ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0")}>
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
          <ConsumptionTimeline entries={displayEntries} title="Registros" />
        )}
      </div>
    </div>
  );
}
