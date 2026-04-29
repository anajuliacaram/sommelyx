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

export default function ConsumptionPage() {
  const { data: entries = [], isLoading } = useConsumption();
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
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const filterTimeoutRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

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
  const activeFilterSummary = useMemo(() => {
    const parts = [
      `Período: ${periodValueLabel}`,
      `País: ${countryValueLabel}`,
      `Ordenar: ${sortValueLabel}`,
    ];
    const hasActiveFilters =
      filters.period !== defaultFilters.period ||
      filters.countries.length > 0 ||
      filters.sortBy !== defaultFilters.sortBy;
    return hasActiveFilters ? parts.join(" · ") : "";
  }, [countryValueLabel, filters.countries.length, filters.period, filters.sortBy, periodValueLabel, sortValueLabel]);

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
    setDisplayEntries(filteredEntries);
    filterTimeoutRef.current = window.setTimeout(() => {
      setIsFiltering(false);
    }, 120);
    scrollTimeoutRef.current = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 160);

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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <EditorialKpiCard
          icon={<GlassWater className="h-4 w-4" />}
          accent="#7B1E2B"
          label="Consumo (6 meses)"
          value={total}
          sub="garrafas"
          layout="row"
          animatedValue={total}
          motionIndex={0}
        />
        <EditorialKpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          accent="#5F7F52"
          label="Ritmo mensal"
          value={avgPerMonth}
          sub="por mês"
          layout="row"
          animatedValue={avgPerMonthValue}
          valueFormatter={(value) => value.toFixed(1).replace(".", ",")}
          motionIndex={1}
        />
        <EditorialKpiCard
          icon={<Star className="h-4 w-4" />}
          accent="#B48C3A"
          label="Estilo favorito"
          value={styleStats.name}
          sub={styleStats.pct > 0 ? `${styleStats.pct}% do consumo` : ""}
          layout="row"
          motionIndex={2}
        />
        <EditorialKpiCard
          icon={<Calendar className="h-4 w-4" />}
          accent="#6B8298"
          label="Última abertura"
          value={lastLabel}
          sub={lastEntry?.wine_name || ""}
          layout="row"
          motionIndex={3}
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
            garrafas / {filters.period === "week" ? "dia" : "mês"}
          </span>
        </div>
        <Sparkbar
          data={chart.data}
          accent="#8A6A54"
          height={isMobile ? 84 : 100}
          showValues={!isMobile}
          activeIndex={activeChartIndex}
          tooltipIndex={isMobile ? tooltipChartIndex : null}
          onBarSelect={(index) => {
            setActiveChartIndex(index);
            if (isMobile) setTooltipChartIndex(index);
          }}
          barWidth={filters.period === "year" ? 6 : 10}
        />
      </EditorialCard>

      {/* Filtros inteligentes */}
      {isMobile ? (
        <div className="mt-3 w-full">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className={cn(
              "flex h-[40px] w-full items-center justify-between rounded-[12px] border px-3 text-left text-[13px] font-semibold tracking-[-0.01em] transition-all duration-150 ease-out hover:-translate-y-px active:scale-[0.98]",
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

          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetContent side="bottom" className="border-t border-white/50 p-4 pt-5">
              <SheetHeader className="mb-3 flex-col gap-1">
                <SheetTitle className="text-[17px] font-semibold tracking-tight text-[#1E1E1E]">
                  Filtros de consumo
                </SheetTitle>
                <p className="text-[11.5px] leading-[1.35] text-[rgba(58,51,39,0.58)]">
                  Ajuste período, país e ordenação antes de aplicar.
                </p>
              </SheetHeader>

              <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5F7F52]">Período</p>
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

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5F7F52]">País</p>
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

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5F7F52]">Ordenar</p>
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

              <div className="mt-4 flex gap-2">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 flex-1 rounded-[10px] border border-[rgba(95,127,82,0.18)] bg-white/75 px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5F7F52] transition-all duration-150 ease-out hover:-translate-y-px hover:bg-white"
                  >
                    Limpar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={applyDraftFilters}
                  className={cn(
                    "h-11 rounded-[10px] bg-[#7a2c34] px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition-all duration-150 ease-out hover:-translate-y-px hover:bg-[#5a1e24]",
                    hasActiveFilters ? "flex-1" : "w-full",
                  )}
                >
                  Aplicar
                </button>
              </div>
            </SheetContent>
          </Sheet>
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
                        : box.kind === "country"
                          ? "Selecione um ou mais países."
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
