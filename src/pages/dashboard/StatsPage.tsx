import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, Wine, Globe, Grape, TrendingUp, DollarSign } from "@/icons/lucide";
import { useWineMetrics } from "@/hooks/useWines";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
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
    <div className="space-y-4 max-w-[1200px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Relatórios & Analytics</h1>
        <p className="text-[11px] text-muted-foreground">Inteligência sobre sua coleção</p>
      </motion.div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Garrafas", value: totalBottles, icon: Wine, color: "#8F2D56" },
          { label: "Valor total", value: `R$ ${totalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "#C9A86A" },
          { label: "Estilos", value: byStyle.length, icon: Grape, color: "#C44569" },
          { label: "Avaliação média", value: avgRating, icon: TrendingUp, color: "#22c55e" },
        ].map((m, i) => (
          <motion.div key={m.label} className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${m.color}12` }}>
              <m.icon className="h-3.5 w-3.5" style={{ color: m.color }} />
            </div>
            <p className="text-xl font-black font-sans tracking-tight text-foreground">{m.value}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* By style */}
        {byStyle.length > 0 && (
          <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
            <h3 className="text-[12px] font-semibold text-foreground mb-2">Distribuição por estilo</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byStyle}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 10 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {byStyle.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* By country */}
        {byCountry.length > 0 && (
          <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
            <h3 className="text-[12px] font-semibold text-foreground mb-2">Distribuição por país</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byCountry} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                  {byCountry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {byCountry.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[9px] text-muted-foreground">{d.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* By vintage */}
        {byVintage.length > 0 && (
          <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
            <h3 className="text-[12px] font-semibold text-foreground mb-2">Por safra</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byVintage}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 10 }} />
                <Bar dataKey="value" fill="#8F2D56" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Top rated */}
        {topRated.length > 0 && (
          <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
            <h3 className="text-[12px] font-semibold text-foreground mb-2">Mais bem avaliados</h3>
            <div className="space-y-2">
              {topRated.map((w, i) => (
                <div key={w.id} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold w-5 text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate text-foreground">{w.name}</p>
                    <p className="text-[9px] text-muted-foreground">{w.producer} {w.vintage ? `· ${w.vintage}` : ""}</p>
                  </div>
                  <span className="text-[11px] font-bold text-primary">{w.rating}★</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
