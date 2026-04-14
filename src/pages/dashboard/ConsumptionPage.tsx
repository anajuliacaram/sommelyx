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
        <div className="section-surface !py-2 !px-3">
          <h1 className="section-surface__title text-base font-serif font-bold tracking-tight">Meu Consumo</h1>
          <p className="section-surface__subtitle text-[10px] mt-0">Histórico e insights sobre seus vinhos</p>
        </div>
      </motion.div>

      {/* Period + Source Filters — tighter */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="flex flex-wrap gap-1.5">
        <div className="flex items-center gap-px rounded-xl border border-white/50 bg-white/55 p-[3px] shadow-sm ring-1 ring-black/[0.02] backdrop-blur-2xl">
          {([
            { value: "week", label: "Sem" },
            { value: "month", label: "Mês" },
            { value: "year", label: "Ano" },
            { value: "all", label: "Tudo" },
          ] as { value: Period; label: string }[]).map(p => {
            const isActive = period === p.value;
            return (
              <button
                key={p.value}
                aria-pressed={isActive}
                className={cn(
                  "relative h-7 rounded-lg px-2.5 text-[9px] font-black uppercase tracking-[0.12em] transition-all duration-200",
                  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  isActive
                    ? "text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/60",
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
        <div className="flex items-center gap-px rounded-xl border border-white/50 bg-white/55 p-[3px] shadow-sm ring-1 ring-black/[0.02] backdrop-blur-2xl">
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
                  "relative h-7 rounded-lg px-2.5 text-[9px] font-black uppercase tracking-[0.12em] flex items-center gap-1 transition-all duration-200",
                  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  isActive
                    ? "text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/60",
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
      </motion.div>

      {/* KPI Strip — ultra compact, uniform grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Total", value: totalCount, icon: Wine, color: "#8F2D56" },
          { label: "Adega", value: cellarCount, icon: GlassWater, color: "#C9A86A" },
          { label: "Ext.", value: externalCount, icon: MapPin, color: "#C44569" },
          { label: "Média", value: avgRating, icon: Star, color: "#22c55e" },
        ].map((m, i) => (
          <motion.div key={m.label} initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
            className="glass-card !rounded-xl !p-2 flex items-center gap-2"
          >
            <div className="flex w-6 h-6 rounded-md items-center justify-center shrink-0" style={{ background: `${m.color}10` }}>
              <m.icon className="h-3 w-3" style={{ color: m.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-foreground leading-none">{m.value}</p>
              <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mt-0.5">{m.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Histórico header — inline, tight */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}
        className="flex items-center gap-1.5 pt-1"
      >
        <h2 className="text-[12px] font-serif font-bold text-foreground tracking-tight">Histórico</h2>
        <span className="text-[9px] font-bold text-muted-foreground bg-muted/20 rounded-md px-1.5 py-0.5 tabular-nums">{filtered.length}</span>
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
          <div className="grid gap-1">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: Math.min(i * 0.015, 0.25) }}
              >
                <div className="glass-card !rounded-xl !p-2.5 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      {/* Single dense row: name + vintage + badges + date */}
                      <div className="flex items-center gap-1.5 mb-px">
                        <h3 className="font-bold text-[12px] text-foreground truncate">{entry.wine_name}</h3>
                        {entry.vintage && (
                          <span className="text-[10px] text-muted-foreground/45 shrink-0">{entry.vintage}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-px rounded",
                          entry.source === "cellar"
                            ? "bg-success/10 text-success"
                            : "bg-amber-500/10 text-amber-600"
                        )}>
                          {entry.source === "cellar" ? <GlassWater className="h-2 w-2" /> : <MapPin className="h-2 w-2" />}
                          {entry.source === "cellar" ? "Adega" : "Ext."}
                        </span>
                        {entry.rating && (
                          <span className={cn("text-[9px] font-bold px-1 py-px rounded bg-muted/10", ratingColor(entry.rating))}>
                            {ratingLabel(entry.rating)}
                          </span>
                        )}
                        {entry.country && (
                          <span className="text-[9px] text-muted-foreground/55">{entry.country}{entry.grape ? ` · ${entry.grape}` : ""}</span>
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground/50 ml-auto shrink-0">
                          {format(new Date(entry.consumed_at), "dd MMM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground/30 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Analytics — compact cards */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
          {topWines.length > 0 && (
            <motion.div className="chart-surface !p-3" initial="hidden" animate="visible" variants={fadeUp} custom={10}>
              <h3 className="chart-surface-title !text-[11px] mb-1.5 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-foreground/40" />
                Mais consumidos
              </h3>
              <div className="space-y-1">
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
            <motion.div className="chart-surface !p-3" initial="hidden" animate="visible" variants={fadeUp} custom={11}>
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
            <motion.div className="chart-surface !p-3" initial="hidden" animate="visible" variants={fadeUp} custom={12}>
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
            <motion.div className="chart-surface !p-3" initial="hidden" animate="visible" variants={fadeUp} custom={13}>
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
      )}
    </div>
  );
}
