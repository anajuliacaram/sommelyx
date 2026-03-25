import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Wine, Globe, Grape, DollarSign, TrendingUp, ShoppingCart, Tag, CalendarDays } from "lucide-react";
import { useWineMetrics } from "@/hooks/useWines";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e", "#3b82f6", "#a855f7"];

const STORAGE_KEY = "sommelyx_sales";
interface Sale { id: string; wineName: string; quantity: number; unitPrice: number; customer: string; date: string; }
function loadSales(): Sale[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }

type ReportTab = "estoque" | "vendas";

export default function ReportsPage() {
  const { totalBottles, totalValue, wines, isLoading } = useWineMetrics();
  const [tab, setTab] = useState<ReportTab>("estoque");
  const sales = useMemo(() => loadSales(), []);

  // ====== STOCK REPORTS ======
  const byCountry = useMemo(() => {
    const map: Record<string, { qty: number; value: number }> = {};
    wines.forEach(w => {
      const k = w.country || "Outro";
      if (!map[k]) map[k] = { qty: 0, value: 0 };
      map[k].qty += w.quantity;
      map[k].value += (w.current_value ?? w.purchase_price ?? 0) * w.quantity;
    });
    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty).map(([name, d]) => ({ name, qty: d.qty, value: d.value }));
  }, [wines]);

  const byGrape = useMemo(() => {
    const map: Record<string, { qty: number; value: number }> = {};
    wines.forEach(w => {
      const k = w.grape || "Outro";
      if (!map[k]) map[k] = { qty: 0, value: 0 };
      map[k].qty += w.quantity;
      map[k].value += (w.current_value ?? w.purchase_price ?? 0) * w.quantity;
    });
    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty).map(([name, d]) => ({ name, qty: d.qty, value: d.value }));
  }, [wines]);

  const byStyle = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach(w => { map[w.style || "Outro"] = (map[w.style || "Outro"] || 0) + w.quantity; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [wines]);

  const byLabel = useMemo(() => {
    return wines
      .filter(w => w.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(w => ({ name: w.name.length > 20 ? w.name.slice(0, 20) + "…" : w.name, fullName: w.name, qty: w.quantity, value: (w.current_value ?? w.purchase_price ?? 0) * w.quantity }));
  }, [wines]);

  const byVintage = useMemo(() => {
    const map: Record<string, number> = {};
    wines.filter(w => w.vintage).forEach(w => { map[String(w.vintage)] = (map[String(w.vintage)] || 0) + w.quantity; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([name, value]) => ({ name, value }));
  }, [wines]);

  // ====== SALES REPORTS ======
  const salesByCountry = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    // Match sale wine name to wines data for country info
    const wineMap = new Map(wines.map(w => [w.name, w]));
    sales.forEach(s => {
      const wine = wineMap.get(s.wineName);
      const country = wine?.country || "Outro";
      if (!map[country]) map[country] = { qty: 0, revenue: 0 };
      map[country].qty += s.quantity;
      map[country].revenue += s.quantity * s.unitPrice;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));
  }, [sales, wines]);

  const salesByGrape = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    const wineMap = new Map(wines.map(w => [w.name, w]));
    sales.forEach(s => {
      const wine = wineMap.get(s.wineName);
      const grape = wine?.grape || "Outro";
      if (!map[grape]) map[grape] = { qty: 0, revenue: 0 };
      map[grape].qty += s.quantity;
      map[grape].revenue += s.quantity * s.unitPrice;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));
  }, [sales, wines]);

  const salesByLabel = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    sales.forEach(s => {
      if (!map[s.wineName]) map[s.wineName] = { qty: 0, revenue: 0 };
      map[s.wineName].qty += s.quantity;
      map[s.wineName].revenue += s.quantity * s.unitPrice;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10).map(([name, d]) => ({
      name: name.length > 20 ? name.slice(0, 20) + "…" : name,
      fullName: name,
      qty: d.qty,
      revenue: d.revenue
    }));
  }, [sales]);

  const salesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const day = new Date(s.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      map[day] = (map[day] || 0) + s.quantity * s.unitPrice;
    });
    return Object.entries(map).slice(-14).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const salesByCustomer = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    sales.forEach(s => {
      const c = s.customer || "Sem cliente";
      if (!map[c]) map[c] = { qty: 0, revenue: 0 };
      map[c].qty += s.quantity;
      map[c].revenue += s.quantity * s.unitPrice;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10).map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));
  }, [sales]);

  const totalSalesRevenue = sales.reduce((s, sale) => s + sale.quantity * sale.unitPrice, 0);
  const totalSalesUnits = sales.reduce((s, sale) => s + sale.quantity, 0);

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Carregando…</div>;

  const chartTooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 10 };

  return (
    <div className="space-y-4 max-w-[1200px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Relatórios</h1>
        <p className="text-[11px] text-muted-foreground">Análise completa de estoque e vendas</p>
      </motion.div>

      {/* Tab switcher */}
      <Tabs value={tab} onValueChange={v => setTab(v as ReportTab)}>
        <TabsList className="w-full max-w-xs">
          <TabsTrigger value="estoque" className="flex-1 text-[11px]"><Wine className="h-3 w-3 mr-1" /> Estoque</TabsTrigger>
          <TabsTrigger value="vendas" className="flex-1 text-[11px]"><ShoppingCart className="h-3 w-3 mr-1" /> Vendas</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "estoque" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Garrafas", value: totalBottles, icon: Wine, color: "#8F2D56" },
              { label: "Valor total", value: `R$ ${totalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "#C9A86A" },
              { label: "Rótulos", value: wines.filter(w => w.quantity > 0).length, icon: Tag, color: "#C44569" },
            ].map((m, i) => (
              <motion.div key={m.label} className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5" style={{ background: `${m.color}12` }}>
                  <m.icon className="h-3 w-3" style={{ color: m.color }} />
                </div>
                <p className="text-lg font-black font-sans tracking-tight text-foreground">{m.value}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">{m.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* By country */}
            {byCountry.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por País</h3>
                <p className="text-[9px] text-muted-foreground mb-3">Quantidade de garrafas por país de origem</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCountry} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="qty" nameKey="name">
                      {byCountry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v} un.`, "Quantidade"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                  {byCountry.slice(0, 6).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-[9px] text-muted-foreground">{d.name} ({d.qty})</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* By grape */}
            {byGrape.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por Uva</h3>
                <p className="text-[9px] text-muted-foreground mb-3">Distribuição por variedade de uva</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byGrape.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v} un.`, "Quantidade"]} />
                    <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                      {byGrape.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* By style */}
            {byStyle.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por Estilo</h3>
                <p className="text-[9px] text-muted-foreground mb-3">Tinto, branco, rosé e outros</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byStyle.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {byStyle.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* By vintage */}
            {byVintage.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por Safra</h3>
                <p className="text-[9px] text-muted-foreground mb-3">Distribuição por ano de produção</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byVintage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="value" fill="#8F2D56" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Top labels by quantity */}
            {byLabel.length > 0 && (
              <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Top Rótulos em Estoque</h3>
                <p className="text-[9px] text-muted-foreground mb-3">Vinhos com maior quantidade em estoque</p>
                <div className="space-y-1.5">
                  {byLabel.map((w, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold w-5 text-muted-foreground shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate text-foreground">{w.fullName}</p>
                      </div>
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
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Faturamento", value: `R$ ${totalSalesRevenue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "#C9A86A" },
              { label: "Unidades", value: totalSalesUnits, icon: Package, color: "#8F2D56" },
              { label: "Vendas", value: sales.length, icon: ShoppingCart, color: "#22c55e" },
            ].map((m, i) => (
              <motion.div key={m.label} className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5" style={{ background: `${m.color}12` }}>
                  <m.icon className="h-3 w-3" style={{ color: m.color }} />
                </div>
                <p className="text-lg font-black font-sans tracking-tight text-foreground">{m.value}</p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">{m.label}</p>
              </motion.div>
            ))}
          </div>

          {sales.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-[12px] text-muted-foreground">Nenhuma venda registrada para gerar relatórios.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Revenue by day */}
              {salesByDay.length > 0 && (
                <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Faturamento por Dia</h3>
                  <p className="text-[9px] text-muted-foreground mb-3">Evolução diária do faturamento</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Faturamento"]} />
                      <Line type="monotone" dataKey="value" stroke="#8F2D56" strokeWidth={2} dot={{ r: 3, fill: "#8F2D56" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Sales by country */}
              {salesByCountry.length > 0 && (
                <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Vendas por País</h3>
                  <p className="text-[9px] text-muted-foreground mb-3">Faturamento por país de origem</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={salesByCountry} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="revenue" nameKey="name">
                        {salesByCountry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Faturamento"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                    {salesByCountry.slice(0, 6).map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-[9px] text-muted-foreground">{d.name} (R$ {d.revenue.toLocaleString("pt-BR")})</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Sales by grape */}
              {salesByGrape.length > 0 && (
                <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Vendas por Uva</h3>
                  <p className="text-[9px] text-muted-foreground mb-3">Faturamento por variedade de uva</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={salesByGrape.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Faturamento"]} />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                        {salesByGrape.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Sales by label (top sellers) */}
              {salesByLabel.length > 0 && (
                <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Top Rótulos Vendidos</h3>
                  <p className="text-[9px] text-muted-foreground mb-3">Vinhos com maior faturamento</p>
                  <div className="space-y-1.5">
                    {salesByLabel.map((w, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold w-5 text-muted-foreground shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate text-foreground">{w.fullName}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{w.qty} un.</span>
                        <span className="text-[10px] font-bold text-primary shrink-0">R$ {w.revenue.toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Sales by customer */}
              {salesByCustomer.length > 0 && (
                <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Top Clientes</h3>
                  <p className="text-[9px] text-muted-foreground mb-3">Clientes com maior volume de compras</p>
                  <div className="space-y-1.5">
                    {salesByCustomer.map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold w-5 text-muted-foreground shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate text-foreground">{c.name}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{c.qty} un.</span>
                        <span className="text-[10px] font-bold text-primary shrink-0">R$ {c.revenue.toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
