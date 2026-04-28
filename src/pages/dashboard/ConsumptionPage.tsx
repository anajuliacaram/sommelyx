// Meu Consumo — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx ConsumptionPage).

import { useMemo, useState } from "react";
import { useConsumption } from "@/hooks/useConsumption";
import { ConsumptionTimeline } from "@/components/ConsumptionTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EditorialCard,
  EditorialKpiCard,
  Kicker,
  Sparkbar,
} from "@/components/editorial/EditorialPrimitives";
import { Calendar, GlassWater, Star, TrendingUp } from "@/icons/lucide";

type PeriodFilter = "week" | "month" | "year";
type SourceFilter = "cellar" | "external" | "all";
type SortBy = "recent" | "old" | "rating";

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

const sourceOptions: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "cellar", label: "Minha adega" },
  { value: "external", label: "Adega externa" },
];

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "recent", label: "Mais recentes" },
  { value: "old", label: "Mais antigos" },
  { value: "rating", label: "Melhor avaliados" },
];

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8.5 rounded-full px-3.5 text-[11.5px] font-medium tracking-[-0.005em] transition-all duration-150 ease-out whitespace-nowrap hover:-translate-y-px hover:scale-[1.01] active:scale-[0.97]"
      style={{
        background: active ? "rgba(123,30,43,0.10)" : "rgba(255,255,255,0.82)",
        color: active ? "#7B1E2B" : "#6B645C",
        border: `1px solid ${active ? "rgba(123,30,43,0.16)" : "rgba(95,111,82,0.10)"}`,
        boxShadow: active ? "0 2px 8px rgba(123,30,43,0.10)" : "none",
      }}
    >
      {children}
    </button>
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
  const [source, setSource] = useState<SourceFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

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
      if (source === "cellar" && !isCellar) return false;
      if (source === "external" && isCellar) return false;
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
      if (source === "cellar") return isCellar;
      if (source === "external") return !isCellar;
      return true;
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
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 rounded-full border border-[rgba(95,111,82,0.14)] bg-[rgba(95,111,82,0.06)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#5F7F52]">
            Período
          </span>
          <div className="flex min-w-max items-center gap-1.25">
            {periodOptions.map((opt) => (
              <FilterPill key={opt.value} active={period === opt.value} onClick={() => setPeriod(opt.value)}>
                {opt.label}
              </FilterPill>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 rounded-full border border-[rgba(95,111,82,0.14)] bg-[rgba(95,111,82,0.06)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#5F7F52]">
            Origem
          </span>
          <div className="flex min-w-max items-center gap-1.25">
            {sourceOptions.map((opt) => (
              <FilterPill key={opt.value} active={source === opt.value} onClick={() => setSource(opt.value)}>
                {opt.label}
              </FilterPill>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 rounded-full border border-[rgba(95,111,82,0.14)] bg-[rgba(95,111,82,0.06)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#5F7F52]">
            Ordenar
          </span>
          <div className="flex min-w-max items-center gap-1.25">
            {sortOptions.map((opt) => (
              <FilterPill key={opt.value} active={sortBy === opt.value} onClick={() => setSortBy(opt.value)}>
                {opt.label}
              </FilterPill>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <ConsumptionTimeline entries={filteredEntries} />
    </div>
  );
}
