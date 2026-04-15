import { useState, useMemo } from "react";
import { useConsumption, useDeleteConsumption } from "@/hooks/useConsumption";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wine, MapPin, Trash2, Calendar, GlassWater, TrendingUp, Globe, Grape, Star } from "@/icons/lucide";
import { format, startOfWeek, startOfMonth, startOfYear, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

const COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e", "#3b82f6", "#a855f7"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip-premium px-3 py-2">
      <p className="text-[13px] font-semibold text-foreground">{label || payload[0]?.name}</p>
      <p className="text-[12px] text-foreground/62">{payload[0]?.value} {payload[0]?.value === 1 ? "vinho" : "vinhos"}</p>
    </div>
  );
};

const fadeUp = {
  hidden: { opacity: 0, y: 6 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const ratingLabel = (r: number) =>
  r === 1 ? "Ruim" : r === 2 ? "Regular" : r === 3 ? "Bom" : r === 4 ? "Muito bom" : "Excelente";

const ratingColor = (r: number) =>
  r <= 1 ? "text-destructive" : r === 2 ? "text-warning" : r === 3 ? "text-gold" : r === 4 ? "text-success" : "text-primary";

const ratingBadgeClass = (r: number) =>
  r <= 1
    ? "bg-destructive/10 text-destructive border-destructive/18"
    : r === 2
      ? "bg-warning/12 text-warning border-warning/18"
      : r === 3
        ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))] border-[hsl(var(--gold)/0.20)]"
        : r === 4
          ? "bg-success/10 text-success border-success/18"
          : "bg-[hsl(var(--wine)/0.10)] text-[hsl(var(--wine))] border-[hsl(var(--wine)/0.18)]";

const sourceBadgeClass = (source: Source) =>
  source === "cellar"
    ? "bg-success/10 text-success border-success/18"
    : "bg-amber-500/10 text-amber-800 border-amber-500/18";

const sourceDotClass = (source: Source) =>
  source === "cellar"
    ? "bg-success"
    : "bg-amber-500";

type Period = "week" | "month" | "year" | "all";
type Source = "all" | "cellar" | "external";

export default function ConsumptionPage() {
  const { data: entries, isLoading } = useConsumption();
  const deleteConsumption = useDeleteConsumption();
  const [source, setSource] = useState<Source>("all");
  const [period, setPeriod] = useState<Period>("all");
  const isMobile = useIsMobile();

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "week") return startOfWeek(now, { weekStartsOn: 1 });
    if (period === "month") return startOfMonth(now);
    if (period === "year") return startOfYear(now);
    return null;
  }, [period]);

  const filtered = useMemo(() => {
    return (entries ?? []).filter((e) => {
      if (source !== "all" && e.source !== source) return false;
      if (periodStart && !isAfter(new Date(e.consumed_at), periodStart)) return false;
      return true;
    });
  }, [entries, source, period, periodStart]);

  const totalCount = filtered.length;
  const cellarCount = filtered.filter(e => e.source === "cellar").length;
  const externalCount = filtered.filter(e => e.source === "external").length;

  const avgRating = useMemo(() => {
    const rated = filtered.filter(e => e.rating);
    return rated.length > 0
      ? (rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length).toFixed(1)
      : "—";
  }, [filtered]);

  const topCountries = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { if (e.country) map[e.country] = (map[e.country] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const topGrapes = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { if (e.grape) map[e.grape] = (map[e.grape] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const ratingDistribution = useMemo(() => {
    const map: Record<string, number> = { "Ruim": 0, "Regular": 0, "Bom": 0, "Muito bom": 0, "Excelente": 0 };
    filtered.forEach(e => { if (e.rating) map[ratingLabel(e.rating)] += 1; });
    return Object.entries(map).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const topWines = useMemo(() => {
    const map: Record<string, { count: number; rating: number | null; producer: string | null }> = {};
    filtered.forEach(e => {
      if (!map[e.wine_name]) map[e.wine_name] = { count: 0, rating: e.rating, producer: e.producer };
      map[e.wine_name].count += 1;
      if (e.rating && (!map[e.wine_name].rating || e.rating > map[e.wine_name].rating!)) {
        map[e.wine_name].rating = e.rating;
      }
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [filtered]);

  const periodLabel = period === "week" ? "esta semana" : period === "month" ? "este mês" : period === "year" ? "este ano" : "todo o período";

  const handleDelete = async (id: string) => {
    try {
      await deleteConsumption.mutateAsync(id);
      toast.success("Registro removido");
    } catch {
      toast.error("Erro ao remover registro");
    }
  };

  const chartH = isMobile ? 120 : 160;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
        <div className="grid gap-1.5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-w-[1200px]">
      {/* Header — compact */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="section-surface !py-2.5 !px-3.5 border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.76)_100%)] shadow-[0_14px_32px_-26px_rgba(0,0,0,0.18)]">
          <h1 className="section-surface__title text-[16px] md:text-[19px] font-serif font-semibold tracking-[-0.034em] text-[#111015]">Meu Consumo</h1>
          <p className="section-surface__subtitle text-[10.5px] mt-0.75 text-[#5d5460]">Histórico e insights sobre seus vinhos</p>
        </div>
      </motion.div>

      {/* Period + Source Filters — tighter */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="rounded-[22px] border border-white/16 bg-[rgba(255,255,255,0.42)] p-2 shadow-[0_12px_26px_-22px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.012] backdrop-blur-xl">
        <div className="grid gap-3.5 md:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#655c69]">Período</span>
            <div className="flex items-center gap-px rounded-xl border border-white/10 bg-[rgba(255,255,255,0.30)] p-[2.5px] shadow-[0_8px_18px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.01] backdrop-blur-xl">
              {([
                { value: "week", label: "Sem" },
                { value: "month", label: "Mês" },
                { value: "year", label: "Ano" },
              ] as { value: Period; label: string }[]).map(p => {
                const isActive = period === p.value;
                return (
                  <button
                    key={p.value}
                    aria-pressed={isActive}
                    className={cn(
                      "relative h-6 rounded-lg px-2.25 text-[8.25px] font-semibold uppercase tracking-[0.12em] transition-[transform,background-color,color,filter] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer",
                      isActive
                        ? "text-primary-foreground shadow-sm"
                        : "text-[#665d6b] hover:text-[#111015] hover:bg-white/40",
                    )}
                    onClick={() => setPeriod(p.value)}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="period-pill"
                        className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#655c69]">Escopo</span>
            <div className="flex items-center gap-px rounded-xl border border-white/10 bg-[rgba(255,255,255,0.30)] p-[2.5px] shadow-[0_8px_18px_-16px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.01] backdrop-blur-xl">
              {([
                { value: "all", label: "Todos", icon: null },
                { value: "cellar", label: "Adega", icon: GlassWater },
                { value: "external", label: "Ext.", icon: MapPin },
              ] as { value: Source; label: string; icon: any }[]).map(s => {
                const isActive = source === s.value;
                return (
                  <button
                    key={s.value}
                    aria-pressed={isActive}
                    className={cn(
                      "relative h-6 rounded-lg px-2.25 text-[8.25px] font-semibold uppercase tracking-[0.12em] flex items-center gap-1 transition-[transform,background-color,color,filter] duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer",
                      isActive
                        ? "text-primary-foreground shadow-sm"
                        : "text-[#665d6b] hover:text-[#111015] hover:bg-white/40",
                    )}
                    onClick={() => setSource(s.value)}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="source-pill"
                        className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1">
                      {s.icon && <s.icon className="h-3 w-3 opacity-85" />}
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Strip — ultra compact, uniform grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
          {[
          { label: "Total", value: totalCount, icon: Wine, color: "#8F2D56" },
          { label: "Adega", value: cellarCount, icon: GlassWater, color: "#C9A86A" },
          { label: "Ext.", value: externalCount, icon: MapPin, color: "#C44569" },
          { label: "Média", value: avgRating, icon: Star, color: "#22c55e" },
          ].map((m, i) => (
            <motion.div key={m.label} initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
            className="card-depth !rounded-xl !p-2 sm:!p-2.25 flex items-center gap-2 shadow-[0_14px_28px_-24px_rgba(0,0,0,0.14)] min-h-[40px] sm:min-h-[42px] border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.80)_0%,rgba(255,255,255,0.72)_100%)]"
            >
            <div className="flex w-5.5 h-5.5 rounded-md items-center justify-center shrink-0" style={{ background: `${m.color}10` }}>
              <m.icon className="h-2.75 w-2.75" style={{ color: m.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] sm:text-[13.25px] font-semibold tracking-[-0.022em] text-[#111015] leading-none tabular-nums">{m.value}</p>
              <p className="text-[7px] sm:text-[7.25px] font-semibold text-[#716878] uppercase tracking-[0.09em] mt-0.5">{m.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Histórico header — inline, tight */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}
        className="flex items-center gap-1.5 pt-0.25 pb-0.5"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/34 bg-[rgba(255,255,255,0.76)] px-2.5 py-1 shadow-[0_8px_18px_-16px_rgba(0,0,0,0.20)] backdrop-blur-sm">
          <h2 className="text-[14.25px] md:text-[14.75px] font-semibold text-[#111015] tracking-[-0.02em]">Histórico</h2>
          <span className="text-[9px] font-semibold text-[#5d5460] bg-white/82 rounded-full px-1.5 py-0.5 tabular-nums border border-white/54">{filtered.length}</span>
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <PremiumEmptyState
          icon={Wine}
          title="Nenhum consumo registrado"
          description={period !== "all"
            ? `Nenhum consumo encontrado para ${periodLabel}`
            : "Use o botão Adicionar Consumo na barra lateral para começar"
          }
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="section-surface section-surface--full !p-4 sm:!p-5 border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.82)_100%)] shadow-[0_18px_40px_-30px_rgba(0,0,0,0.18)]">
            <div className="relative pl-4 sm:pl-5 before:absolute before:left-1.5 before:top-1.5 before:bottom-1.5 before:w-px before:bg-gradient-to-b before:from-[hsl(var(--wine)/0.12)] before:via-[hsl(var(--wine)/0.06)] before:to-transparent">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: Math.min(i * 0.015, 0.25) }}
                className="mb-4 last:mb-0"
              >
                <div className="card-depth relative overflow-hidden !rounded-[20px] !p-3.25 sm:!p-3.75 transition-all group border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.82)_100%)] shadow-[0_14px_28px_-22px_rgba(0,0,0,0.18)] hover:-translate-y-[1px] hover:shadow-[0_18px_32px_-24px_rgba(0,0,0,0.22)]">
                  <span className={cn("absolute left-[-0.52rem] top-4 h-2.5 w-2.5 rounded-full border border-white/80 shadow-[0_0_0_6px_rgba(255,255,255,0.45)]", sourceDotClass(entry.source))} />
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[11.25px] sm:text-[11.75px] font-semibold tracking-[-0.013em] text-[#111015] leading-tight">
                            {entry.wine_name}
                          </h3>
                          <p className="mt-0.5 text-[9.5px] sm:text-[9.85px] text-[#5b5260] leading-snug">
                            {[entry.vintage, entry.country, entry.grape].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={cn(
                          "inline-flex min-h-[22px] items-center gap-1 rounded-full border px-2.5 text-[8.75px] font-semibold tracking-[0.07em] uppercase backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
                          sourceBadgeClass(entry.source)
                        )}>
                          {entry.source === "cellar" ? <GlassWater className="h-2.5 w-2.5" /> : <MapPin className="h-2.5 w-2.5" />}
                          {entry.source === "cellar" ? "Adega" : "Externo"}
                        </span>
                        {entry.rating && (
                          <span className={cn(
                            "inline-flex min-h-[22px] items-center rounded-full border px-2.5 text-[8.75px] font-semibold tracking-[0.07em] uppercase backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
                            ratingBadgeClass(entry.rating)
                          )}>
                            {ratingLabel(entry.rating)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between gap-2">
                      <span className="shrink-0 rounded-full border border-white/72 bg-white/82 px-2.5 py-1 text-[8.5px] font-semibold tracking-[0.08em] uppercase text-[#524b59] backdrop-blur-sm">
                        {format(new Date(entry.consumed_at), "dd MMM", { locale: ptBR })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 rounded-full text-muted-foreground/35 hover:text-destructive hover:bg-destructive/10 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          </div>
        </AnimatePresence>
      )}

      {/* Analytics — compact cards */}
      {totalCount > 0 && (
        <div className="section-surface section-surface--full !p-4 sm:!p-5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.18)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {topWines.length > 0 && (
              <motion.div className="chart-surface !p-3 border-white/14 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.16)]" initial="hidden" animate="visible" variants={fadeUp} custom={10}>
                <h3 className="chart-surface-title !text-[11px] mb-1.5 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-foreground/40" />
                  Mais consumidos
                </h3>
                <div className="space-y-1.25">
                  {topWines.map(([name, data], i) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black w-4 text-foreground/30">#{i + 1}</span>
                      <p className="text-[11px] font-semibold truncate flex-1 text-foreground">{name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {data.rating && (
                          <span className={cn("text-[9px] font-semibold", ratingColor(data.rating))}>{ratingLabel(data.rating)}</span>
                        )}
                        <span className="text-[11px] font-black text-foreground">{data.count}×</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {ratingDistribution.length > 0 && (
              <motion.div className="chart-surface !p-3 border-white/14 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.16)]" initial="hidden" animate="visible" variants={fadeUp} custom={11}>
                <h3 className="chart-surface-title !text-[11px] mb-1.5 flex items-center gap-1">
                  <Star className="h-3 w-3 text-foreground/40" />
                  Avaliações
                </h3>
                <ResponsiveContainer width="100%" height={chartH}>
                  <BarChart data={ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.12)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.65)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--foreground) / 0.45)" }} axisLine={false} tickLine={false} width={18} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--wine))">
                      {ratingDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {topCountries.length > 0 && (
              <motion.div className="chart-surface !p-3 border-white/14 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.16)]" initial="hidden" animate="visible" variants={fadeUp} custom={12}>
                <h3 className="chart-surface-title !text-[11px] mb-1.5 flex items-center gap-1">
                  <Globe className="h-3 w-3 text-foreground/40" />
                  Por país
                </h3>
                <div className="space-y-1">
                  {topCountries.map((d, i) => {
                    const maxVal = topCountries[0]?.value || 1;
                    const pct = Math.round((d.value / maxVal) * 100);
                    return (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-foreground w-[72px] truncate">{d.name}</span>
                        <div className="flex-1 h-[4px] rounded-full bg-muted/15 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-[10px] font-bold text-foreground/60 w-5 text-right tabular-nums">{d.value}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {topGrapes.length > 0 && (
              <motion.div className="chart-surface !p-3 border-white/14 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.16)]" initial="hidden" animate="visible" variants={fadeUp} custom={13}>
                <h3 className="chart-surface-title !text-[11px] mb-1.5 flex items-center gap-1">
                  <Grape className="h-3 w-3 text-foreground/40" />
                  Uvas
                </h3>
                <div className="space-y-1">
                  {topGrapes.map((d, i) => {
                    const maxVal = topGrapes[0]?.value || 1;
                    const pct = Math.round((d.value / maxVal) * 100);
                    return (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-foreground w-[72px] truncate">{d.name}</span>
                        <div className="flex-1 h-[4px] rounded-full bg-muted/15 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-[10px] font-bold text-foreground/60 w-5 text-right tabular-nums">{d.value}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
