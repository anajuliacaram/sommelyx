// Meu Consumo — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx ConsumptionPage).

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useConsumption } from "@/hooks/useConsumption";
import { ConsumptionTimeline } from "@/components/ConsumptionTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EditorialCard,
  Kicker,
  Sparkbar,
} from "@/components/editorial/EditorialPrimitives";
import { Calendar, Check, ChevronDown, Star } from "@/icons/lucide";
import { useIsMobile } from "@/hooks/use-mobile";
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
          ? "bg-[rgba(122, 18, 36,0.08)] text-[#7a1224]"
          : "bg-white/0 text-[#2f2a22]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate">{label}</span>
      </span>
      {active ? <Check className="h-3.5 w-3.5 shrink-0 text-[#7a1224]" /> : null}
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
          ? "bg-[rgba(122, 18, 36,0.08)] text-[#7a1224]"
          : "bg-white/0 text-[#2f2a22]",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
            active
              ? "border-[#7a1224] bg-[#7a1224] text-white"
              : "border-[rgba(61,53,48,0.18)] bg-white text-transparent",
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    if (filtersOpen) {
      setDraftFilters(filters);
    }
  }, [filters, filtersOpen]);

  const clearFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setFiltersOpen(false);
  };

  const toggleCountry = (country: string) => {
    setDraftFilters((current) => {
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
    setFiltersOpen(false);
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
  const averageRatingValue = useMemo(() => {
    const rated = filteredEntries.filter((entry) => entry.rating != null);
    if (!rated.length) return null;
    const sum = rated.reduce((acc, entry) => acc + Number(entry.rating ?? 0), 0);
    return sum / rated.length;
  }, [filteredEntries]);
  const averageRating = averageRatingValue != null ? averageRatingValue.toFixed(1).replace(".", ",") : "—";

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

  const lastEntryMeta = lastEntry
    ? [lastEntry.producer, lastEntry.vintage, lastEntry.country].filter(Boolean).join(" · ")
    : "";

  const lastEntryNote = lastEntry?.tasting_notes?.trim()
    ? lastEntry.tasting_notes.trim()
    : lastEntry?.location?.trim()
      ? `Registrado em ${lastEntry.location.trim()}.`
      : "Sem observações.";

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
      <div className="editorial-page consumo-page consumo-v2-page sx-v2-page-shell">
        <EditorialCard className="sx-v2-matte-panel consumo-v2-loading">
          <div className="sx-v2-state-loader">
            <span className="sx-v2-kicker">Meu Consumo</span>
            <p>Carregando consumos</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <Skeleton className="h-28 rounded-[24px]" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-[18px]" />
                <Skeleton className="h-16 rounded-[18px]" />
                <Skeleton className="h-16 rounded-[18px]" />
                <Skeleton className="h-16 rounded-[18px]" />
              </div>
            </div>
          </div>
        </EditorialCard>
      </div>
    );
  }

  return (
    <div className="editorial-page consumo-page consumo-rebuild-page sx-v2-page-shell">
      <section className="sx-v2-content-rail consumo-rebuild-rail">
        <header className="consumo-rebuild-header">
          <div className="consumo-rebuild-header-copy">
            <Kicker className="consumo-rebuild-kicker">Diário de degustação</Kicker>
            <h1 className="consumo-rebuild-title sx-v2-display">Meu Consumo</h1>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={cn(
              "consumo-rebuild-filter-button sx-v2-btn-capsule",
              hasActiveFilters && "is-active",
            )}
          >
            <span>Filtros</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-150 ease-out", filtersOpen && "rotate-180")} />
          </button>
        </header>

        <div className="consumo-rebuild-filter-summary">
          <span>{hasActiveFilters ? activeFilterSummary : "Todos os consumos"}</span>
          {activeFilterSummary ? (
            <button
              type="button"
              onClick={clearFilters}
              className="consumo-rebuild-clear-filter"
            >
              Limpar
            </button>
          ) : null}
        </div>

        <div className="consumo-rebuild-layout">
          <main className={cn("consumo-rebuild-history transition-all duration-150 ease-out", isFiltering ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0")}>
            {isFiltering ? (
              <EditorialCard className="consumo-rebuild-skeleton">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-36 rounded-full bg-black/5" />
                  <Skeleton className="h-20 w-full rounded-[16px] bg-black/5" />
                  <Skeleton className="h-20 w-full rounded-[16px] bg-black/5" />
                </div>
              </EditorialCard>
            ) : displayEntries.length === 0 ? (
              <EditorialCard className="consumo-rebuild-empty">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="font-serif text-[16px] text-[rgba(26,23,19,0.82)]">
                    {entries.length === 0
                      ? "Nenhum consumo registrado"
                      : "Nenhum consumo nessa seleção"}
                  </p>
                  <p className="mt-1 text-[12px] text-[#7A746B]">
                    {entries.length === 0
                      ? "Registre uma garrafa aberta para acompanhar seu histórico."
                      : "Limpe os filtros para ver outros consumos."}
                  </p>
                  {activeFilterSummary ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="consumo-rebuild-clear-filter mt-4"
                    >
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              </EditorialCard>
            ) : (
              <ConsumptionTimeline entries={displayEntries} title="Histórico" />
            )}
          </main>

          <aside className="consumo-rebuild-side">
          {lastEntry ? (
            <section className="consumo-rebuild-last sx-v2-dark-panel sx-v2-ai-aura">
              <div className="consumo-rebuild-last-copy">
                <div className="consumo-rebuild-last-head">
                  <Kicker className="consumo-rebuild-last-kicker">Último consumo</Kicker>
                  <span className="consumo-rebuild-last-time">{lastLabel}</span>
                </div>
                <h2 className="consumo-rebuild-last-title sx-v2-wine-title">{lastEntry.wine_name}</h2>
                {lastEntryMeta ? (
                  <p className="consumo-rebuild-last-meta sx-v2-wine-meta">{lastEntryMeta}</p>
                ) : null}
                <p className="consumo-rebuild-last-note sx-v2-body">{lastEntryNote}</p>
                <div className="consumo-rebuild-last-foot">
                  <span className="consumo-rebuild-last-rating">
                    <Star className="h-3.5 w-3.5" />
                    {lastEntry.rating != null ? Number(lastEntry.rating).toFixed(1) : "Sem nota"}
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <section className="consumo-rebuild-last sx-v2-dark-panel">
              <div className="consumo-rebuild-last-copy">
                <Kicker className="consumo-rebuild-last-kicker">Meu Consumo</Kicker>
                <h2 className="consumo-rebuild-last-title sx-v2-wine-title">Nenhum consumo registrado</h2>
                <p className="consumo-rebuild-last-note sx-v2-body">
                  Registre uma garrafa aberta para acompanhar seu histórico.
                </p>
              </div>
            </section>
          )}

            <section className="consumo-rebuild-stats">
              <div className="consumo-rebuild-stats-grid">
                <article className="consumo-rebuild-stat">
                  <span className="consumo-rebuild-stat-label">Total</span>
                  <strong className="consumo-rebuild-stat-value">{total}</strong>
                </article>
                <article className="consumo-rebuild-stat">
                  <span className="consumo-rebuild-stat-label">Este mês</span>
                  <strong className="consumo-rebuild-stat-value">{avgPerMonth}</strong>
                </article>
                <article className="consumo-rebuild-stat">
                  <span className="consumo-rebuild-stat-label">Nota média</span>
                  <strong className="consumo-rebuild-stat-value">{averageRating}</strong>
                </article>
                <article className="consumo-rebuild-stat">
                  <span className="consumo-rebuild-stat-label">Estilo recorrente</span>
                  <strong className="consumo-rebuild-stat-value consumo-rebuild-stat-value--text">{styleStats.name}</strong>
                </article>
              </div>
            </section>

            <EditorialCard className="consumo-rebuild-chart consumo-chart-card consumo-chart-wrap">
              <div className="consumo-rebuild-chart-head">
                <div>
                  <Kicker className="consumo-rebuild-chart-kicker">Ritmo</Kicker>
                  <h2 className="consumo-rebuild-chart-title">{chart.title}</h2>
                </div>
                <span className="consumo-rebuild-chart-total">{total}</span>
              </div>
              <Sparkbar
                data={chartDisplayData}
                accent="#7a1224"
                height={isMobile ? 56 : 76}
                showValues={!isMobile}
                activeIndex={activeChartIndex}
                tooltipIndex={isMobile ? tooltipChartIndex : null}
                onBarSelect={(index) => {
                  setActiveChartIndex(index);
                  if (isMobile) setTooltipChartIndex(index);
                }}
                barWidth={isMobile ? (chartDisplayData.length > 8 ? 6 : 8) : filters.period === "year" ? 6 : 8}
              />
            </EditorialCard>
          </aside>
        </div>

          <ActionDialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <ActionDialogContent className="consumption-filter-modal sx-action-modal" aria-label="Filtros de consumo">
              <AiModalShell>
                <AiModalHeaderBar>
                  <AiModalHeader
                    icon={<Calendar className="h-5 w-5" />}
                    title="Filtros"
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
                            onClick={() => toggleCountry(opt.value)}
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
      </section>
    </div>
  );
}
