// Meu Consumo — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx ConsumptionPage).

import { memo, useMemo, useState, type ReactNode } from "react";
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
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [source, setSource] = useState<Array<SourceFilter>>([]);
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [openFilter, setOpenFilter] = useState<"period" | "source" | "sort" | null>(null);
  const isMobile = useIsMobile();

  const periodValueLabel = periodOptions.find((opt) => opt.value === period)?.label ?? "Mês";
  const sourceValueLabel = useMemo(() => {
    if (source.length === 0) return "Todas";
    return sourceOptions
      .filter((opt) => source.includes(opt.value))
      .map((opt) => opt.label)
      .join(" · ");
  }, [source]);
  const sortValueLabel = sortOptions.find((opt) => opt.value === sortBy)?.label ?? "Mais recentes";

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
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <EditorialKpiCard
          icon={<GlassWater className="h-4 w-4" />}
          accent="#7B1E2B"
          label="Consumo nos últimos 6 meses"
          value={total}
          sub="garrafas"
        />
        <EditorialKpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          accent="#5F7F52"
          label="Ritmo médio mensal"
          value={avgPerMonth}
          sub="por mês"
        />
        <EditorialKpiCard
          icon={<Star className="h-4 w-4" />}
          accent="#B48C3A"
          label="Estilo favorito"
          value={styleStats.name}
          sub={styleStats.pct > 0 ? `${styleStats.pct}% do consumo` : ""}
        />
        <EditorialKpiCard
          icon={<Calendar className="h-4 w-4" />}
          accent="#6B8298"
          label="Última garrafa aberta"
          value={lastLabel}
          sub={lastEntry?.wine_name || ""}
        />
      </div>

      {/* Monthly chart */}
      <EditorialCard style={{ padding: "14px 14px 12px" }}>
        <div className="mb-2.5 flex items-baseline justify-between">
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
          height={52}
          showValues={false}
          barWidth={period === "year" ? 4 : 6}
        />
      </EditorialCard>

      {/* Filtros inteligentes */}
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
              {isMobile ? (
                <>
                  {trigger}
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
                    mobile
                  >
                    <div className="space-y-1.5">{options}</div>
                  </FilterPanel>
                </>
              ) : (
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
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <ConsumptionTimeline entries={filteredEntries} />
    </div>
  );
}
