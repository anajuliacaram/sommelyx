import { useState, useMemo } from "react";
import { useConsumption, useDeleteConsumption } from "@/hooks/useConsumption";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wine, MapPin, Trash2, Calendar, GlassWater, TrendingUp, Globe, Grape, Star } from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { PremiumKpiCard } from "@/components/ui/premium-kpi-card";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e", "#3b82f6", "#a855f7"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[13px] font-semibold text-foreground">{label || payload[0]?.name}</p>
      <p className="text-[12px] text-muted-foreground">{payload[0]?.value} {payload[0]?.value === 1 ? "vinho" : "vinhos"}</p>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[13px] font-semibold text-foreground">{payload[0]?.name}</p>
      <p className="text-[12px] text-muted-foreground">{payload[0]?.value} {payload[0]?.value === 1 ? "vinho" : "vinhos"}</p>
    </div>
  );
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
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

  // Period filtering
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

  // Analytics
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Meu Consumo</h1>
        <p className="text-[11px] text-muted-foreground">Histórico, análises e insights sobre seus vinhos</p>
      </motion.div>

      {/* Period + Source Filters */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/55 bg-white/60 p-1.5 shadow-[0_18px_48px_-28px_rgba(15,15,20,0.28)] ring-1 ring-black/[0.03] backdrop-blur-2xl">
          {([
            { value: "week", label: "Semana" },
            { value: "month", label: "Mês" },
            { value: "year", label: "Ano" },
            { value: "all", label: "Tudo" },
          ] as { value: Period; label: string }[]).map(p => (
            <Button
              key={p.value}
              size="sm"
              variant="ghost"
              aria-pressed={period === p.value}
              className={cn(
                "h-10 rounded-2xl px-4 text-[11px] font-black uppercase tracking-[0.14em]",
                period === p.value
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/15"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/55 bg-white/60 p-1.5 shadow-[0_18px_48px_-28px_rgba(15,15,20,0.28)] ring-1 ring-black/[0.03] backdrop-blur-2xl">
          {([
            { value: "all", label: "Todos", icon: null },
            { value: "cellar", label: "Adega", icon: GlassWater },
            { value: "external", label: "Externo", icon: MapPin },
          ] as { value: Source; label: string; icon: any }[]).map(s => (
            <Button
              key={s.value}
              size="sm"
              variant="ghost"
              aria-pressed={source === s.value}
              className={cn(
                "h-10 rounded-2xl px-4 text-[11px] font-black uppercase tracking-[0.14em] gap-2",
                source === s.value
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/15"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              onClick={() => setSource(s.value)}
            >
              {s.icon && <s.icon className="h-4 w-4 opacity-85" />}
              {s.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Consumidos", value: totalCount, sub: periodLabel, icon: Wine, color: "#8F2D56" },
          { label: "Da adega", value: cellarCount, sub: `${totalCount > 0 ? Math.round((cellarCount / totalCount) * 100) : 0}% do total`, icon: GlassWater, color: "#C9A86A" },
          { label: "Externos", value: externalCount, sub: `${totalCount > 0 ? Math.round((externalCount / totalCount) * 100) : 0}% do total`, icon: MapPin, color: "#C44569" },
          { label: "Avaliação média", value: avgRating, sub: `${filtered.filter(e => e.rating).length} avaliados`, icon: Star, color: "#22c55e" },
        ].map((m, i) => (
          <motion.div key={m.label} initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}>
            <PremiumKpiCard className="!p-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: `${m.color}12` }}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
              <p className="text-2xl font-black font-sans tracking-tight text-foreground">{m.value}</p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">{m.label}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">{m.sub}</p>
            </PremiumKpiCard>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* By Country */}
          {topCountries.length > 0 && (
            <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Por país
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={topCountries} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}>
                    {topCountries.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {topCountries.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-foreground font-medium">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Rating distribution */}
          {ratingDistribution.length > 0 && (
            <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Star className="h-4 w-4 text-muted-foreground" />
                Distribuição de avaliações
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {ratingDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Top grapes */}
          {topGrapes.length > 0 && (
            <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Grape className="h-4 w-4 text-muted-foreground" />
                Uvas mais consumidas
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topGrapes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "hsl(var(--foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#8F2D56" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Top wines */}
          {topWines.length > 0 && (
            <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={9}>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Mais consumidos
              </h3>
              <div className="space-y-3">
                {topWines.map(([name, data], i) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm font-black w-6 text-muted-foreground/50">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{data.producer || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-foreground">{data.count}×</p>
                      {data.rating && (
                        <p className={`text-xs font-semibold ${ratingColor(data.rating)}`}>{ratingLabel(data.rating)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Consumption list header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={10}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[13px] font-serif font-bold text-foreground">Histórico</h2>
          <Badge variant="outline" className="text-[9px] font-bold">{filtered.length}</Badge>
        </div>
      </motion.div>

      {/* Content */}
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
          <div className="grid gap-2.5">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <div className="glass-card p-3.5 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[13px] text-foreground truncate">
                          {entry.wine_name}
                        </h3>
                        {entry.vintage && (
                          <span className="text-[11px] text-muted-foreground/60">({entry.vintage})</span>
                        )}
                        <Badge
                          variant={entry.source === "cellar" ? "default" : "secondary"}
                          className="text-[9px] shrink-0 h-5"
                        >
                          {entry.source === "cellar" ? "Adega" : "Externo"}
                        </Badge>
                        {entry.rating && (
                          <Badge variant="outline" className={`text-[9px] h-5 font-semibold ${ratingColor(entry.rating)} border-current/20`}>
                            {ratingLabel(entry.rating)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground flex-wrap">
                        {entry.producer && <span>{entry.producer}</span>}
                        {entry.country && <span className="opacity-60">•</span>}
                        {entry.country && <span>{entry.country}{entry.region ? `, ${entry.region}` : ""}</span>}
                        {entry.grape && <span className="opacity-60">•</span>}
                        {entry.grape && <span>{entry.grape}</span>}
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.consumed_at), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                        {entry.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {entry.location}
                          </span>
                        )}
                      </div>

                      {entry.tasting_notes && (
                        <p className="text-[10px] text-muted-foreground/50 italic line-clamp-1 mt-0.5">
                          "{entry.tasting_notes}"
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
