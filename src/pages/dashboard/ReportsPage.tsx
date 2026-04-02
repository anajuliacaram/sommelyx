import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wine, DollarSign, ShoppingCart, Tag, Package, CalendarDays } from "@/icons/lucide";
import { useWineMetrics } from "@/hooks/useWines";
import { useSales } from "@/hooks/useBusinessData";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--gold))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--muted-foreground))"];

type ReportTab = "estoque" | "vendas";

export default function ReportsPage() {
  const { wines, isLoading: winesLoading } = useWineMetrics();
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const [tab, setTab] = useState<ReportTab>("estoque");

  const isLoading = winesLoading || salesLoading;

  const totalBottles = wines.reduce((s, w) => s + w.quantity, 0);
  const totalValue = wines.reduce((s, w) => s + (w.current_value ?? w.purchase_price ?? 0) * w.quantity, 0);

  const byCountry = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach((w) => {
      const k = w.country || "Outro";
      map[k] = (map[k] || 0) + w.quantity;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [wines]);

  const byStyle = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach((w) => {
      const k = w.style || "Outro";
      map[k] = (map[k] || 0) + w.quantity;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [wines]);

  const byLabel = useMemo(() => {
    return wines
      .filter((w) => w.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map((w) => ({
        name: w.name,
        qty: w.quantity,
        value: (w.current_value ?? w.purchase_price ?? 0) * w.quantity,
      }));
  }, [wines]);

  const salesRevenue = sales.reduce((s, sale) => s + sale.quantity * sale.price, 0);
  const salesUnits = sales.reduce((s, sale) => s + sale.quantity, 0);

  const salesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      const day = new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      map[day] = (map[day] || 0) + s.quantity * s.price;
    });
    return Object.entries(map)
      .slice(-14)
      .map(([name, value]) => ({ name, value }));
  }, [sales]);

  const salesByLabel = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    sales.forEach((s) => {
      if (!map[s.name]) map[s.name] = { qty: 0, revenue: 0 };
      map[s.name].qty += s.quantity;
      map[s.name].revenue += s.quantity * s.price;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));
  }, [sales]);

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Carregando…</div>;

  return (
    <div className="space-y-4 max-w-[1200px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Relatórios</h1>
        <p className="text-[11px] text-muted-foreground">Análise de estoque e vendas com dados reais</p>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReportTab)}>
        <TabsList className="w-full max-w-xs">
          <TabsTrigger value="estoque" className="flex-1 text-[11px]"><Wine className="h-3 w-3 mr-1" /> Estoque</TabsTrigger>
          <TabsTrigger value="vendas" className="flex-1 text-[11px]"><ShoppingCart className="h-3 w-3 mr-1" /> Vendas</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "estoque" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Garrafas", value: totalBottles, icon: Wine },
              { label: "Valor total", value: `R$ ${totalValue.toLocaleString("pt-BR")}`, icon: DollarSign },
              { label: "Rótulos", value: wines.filter((w) => w.quantity > 0).length, icon: Tag },
            ].map((m, i) => (
              <motion.div key={m.label} className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5 bg-primary/10">
                  <m.icon className="h-3 w-3 text-primary" />
                </div>
                <p className="text-lg font-black font-sans tracking-tight text-foreground">{m.value}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">{m.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {byCountry.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por País</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCountry} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" nameKey="name">
                      {byCountry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {byStyle.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por Estilo</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byStyle}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {byLabel.length > 0 && (
              <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Top Rótulos em Estoque</h3>
                <div className="space-y-1.5">
                  {byLabel.map((w, i) => (
                    <div key={`${w.name}-${i}`} className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold w-5 text-muted-foreground shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0"><p className="text-[11px] font-semibold truncate text-foreground">{w.name}</p></div>
                      <span className="text-[10px] font-bold text-primary shrink-0">{w.qty} un.</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 w-24 text-right">R$ {w.value.toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {tab === "vendas" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Faturamento", value: `R$ ${salesRevenue.toLocaleString("pt-BR")}`, icon: DollarSign },
              { label: "Unidades", value: salesUnits, icon: Package },
              { label: "Vendas", value: sales.length, icon: ShoppingCart },
            ].map((m, i) => (
              <motion.div key={m.label} className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5 bg-primary/10">
                  <m.icon className="h-3 w-3 text-primary" />
                </div>
                <p className="text-lg font-black font-sans tracking-tight text-foreground">{m.value}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">{m.label}</p>
              </motion.div>
            ))}
          </div>

          {sales.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-[12px] text-muted-foreground">Nenhuma venda registrada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {salesByDay.length > 0 && (
                <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Faturamento por Dia</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {salesByLabel.length > 0 && (
                <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Top Rótulos Vendidos</h3>
                  <div className="space-y-1.5">
                    {salesByLabel.map((w, i) => (
                      <div key={`${w.name}-${i}`} className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold w-5 text-muted-foreground shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0"><p className="text-[11px] font-semibold truncate text-foreground">{w.name}</p></div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{w.qty} un.</span>
                        <span className="text-[10px] font-bold text-primary shrink-0">R$ {w.revenue.toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={9} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3" /> Atualizado em tempo real a partir do banco.
      </motion.div>
    </div>
  );
}
