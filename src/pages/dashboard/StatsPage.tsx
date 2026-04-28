import { useMemo } from "react";
import { Wine, Globe, Grape, TrendingUp, DollarSign } from "@/icons/lucide";
import { useWineMetrics } from "@/hooks/useWines";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 6 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e"];

export default function StatsPage() {
  const { totalBottles, totalValue, wines, isLoading } = useWineMetrics();

  const byStyle = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach(w => { map[w.style || "Outro"] = (map[w.style || "Outro"] || 0) + w.quantity; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [wines]);

  const byCountry = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach(w => { map[w.country || "Outro"] = (map[w.country || "Outro"] || 0) + w.quantity; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [wines]);

  const byVintage = useMemo(() => {
    const map: Record<string, number> = {};
    wines.filter(w => w.vintage).forEach(w => { map[String(w.vintage)] = (map[String(w.vintage)] || 0) + w.quantity; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-10).map(([name, value]) => ({ name, value }));
  }, [wines]);

  const avgRating = useMemo(() => {
    const rated = wines.filter(w => w.rating);
    return rated.length > 0 ? (rated.reduce((s, w) => s + (w.rating ?? 0), 0) / rated.length).toFixed(1) : "—";
  }, [wines]);

  const topRated = useMemo(() => {
    return wines.filter(w => w.rating).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);
  }, [wines]);

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Carregando…</div>;

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <div className="section-surface">
          <h1 className="t-title">Relatórios & analytics</h1>
          <p className="t-subtitle mt-1.5">Inteligência sobre a evolução da sua coleção</p>
        </div>
      </div>

      {/* KPIs — compact inline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
        {[
          { label: "Garrafas", value: totalBottles, icon: Wine, color: "#8F2D56" },
          { label: "Valor total", value: `R$ ${totalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "#C9A86A" },
          { label: "Estilos", value: byStyle.length, icon: Grape, color: "#C44569" },
          { label: "Avaliação média", value: avgRating, icon: TrendingUp, color: "#22c55e" },
        ].map((m, i) => (
          <div key={m.label} className="glass-card p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${m.color}10` }}>
              <m.icon className="h-3 w-3" style={{ color: m.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-foreground leading-none">{m.value}</p>
              <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {byStyle.length > 0 && (
          <div className="chart-surface p-4 sm:p-5">
            <h3 className="text-[11px] font-bold text-foreground mb-1.5">Distribuição por estilo</h3>
            <ResponsiveContainer width="100%" height={132}>
              <BarChart data={byStyle}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--foreground) / 0.6)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--foreground) / 0.45)" }} axisLine={false} tickLine={false} width={18} />
                <Tooltip contentStyle={{ background: "rgba(255,255,255,0.94)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 12, fontSize: 11, boxShadow: "0 8px 20px -8px rgba(44,20,31,0.12)", backdropFilter: "blur(14px)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {byStyle.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By country — horizontal bars */}
        {byCountry.length > 0 && (
          <div className="chart-surface p-4 sm:p-5">
            <h3 className="text-[11px] font-bold text-foreground mb-1.5 flex items-center gap-1">
              <Globe className="h-3 w-3 text-foreground/40" />
              Por país
            </h3>
            <div className="space-y-1">
              {byCountry.map((d, i) => {
                const maxVal = byCountry[0]?.value || 1;
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
          </div>
        )}

        {byVintage.length > 0 && (
          <div className="chart-surface p-4 sm:p-5">
            <h3 className="text-[11px] font-bold text-foreground mb-1.5">Por safra</h3>
            <ResponsiveContainer width="100%" height={132}>
              <BarChart data={byVintage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--foreground) / 0.6)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--foreground) / 0.45)" }} axisLine={false} tickLine={false} width={18} />
                <Tooltip contentStyle={{ background: "rgba(255,255,255,0.94)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 12, fontSize: 11, boxShadow: "0 8px 20px -8px rgba(44,20,31,0.12)", backdropFilter: "blur(14px)" }} />
                <Bar dataKey="value" fill="hsl(var(--wine))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {topRated.length > 0 && (
          <div className="chart-surface p-4 sm:p-5">
            <h3 className="text-[11px] font-bold text-foreground mb-1.5">Mais bem avaliados</h3>
            <div className="space-y-1">
              {topRated.map((w, i) => (
                <div key={w.id} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black w-4 text-foreground/30">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate text-foreground">{w.name}</p>
                    <p className="text-[9px] text-foreground/50">{w.producer} {w.vintage ? `· ${w.vintage}` : ""}</p>
                  </div>
                  <span className="text-[11px] font-bold text-primary">{w.rating}★</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
