import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, DollarSign, ShoppingCart, Tag, Package, Filter, X, CalendarDays } from "lucide-react";
import { useWineMetrics } from "@/hooks/useWines";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

// ==================== FILTER BAR COMPONENT ====================
interface FilterBarProps {
  countries: string[];
  grapes: string[];
  styles: string[];
  vintages: string[];
  selectedCountries: string[];
  selectedGrapes: string[];
  selectedStyles: string[];
  selectedVintages: string[];
  dateFrom: string;
  dateTo: string;
  onToggleCountry: (v: string) => void;
  onToggleGrape: (v: string) => void;
  onToggleStyle: (v: string) => void;
  onToggleVintage: (v: string) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onClear: () => void;
  activeCount: number;
}

function FilterBar(props: FilterBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 text-[10px] px-3 rounded-xl transition-all",
            props.activeCount > 0 ? "border-primary/30 bg-primary/5 text-primary" : ""
          )}
          onClick={() => setOpen(!open)}
        >
          <Filter className="h-3 w-3 mr-1.5" />
          Filtros
          {props.activeCount > 0 && (
            <span className="ml-1.5 w-4 h-4 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">
              {props.activeCount}
            </span>
          )}
        </Button>

        {props.activeCount > 0 && (
          <button onClick={props.onClear} className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5">
            <X className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-3 space-y-3">
              {/* Date range */}
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> Período
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={props.dateFrom} onChange={e => props.onDateFrom(e.target.value)} className="h-8 text-[10px] rounded-lg" />
                  <Input type="date" value={props.dateTo} onChange={e => props.onDateTo(e.target.value)} className="h-8 text-[10px] rounded-lg" />
                </div>
              </div>

              {/* Country */}
              {props.countries.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">País</p>
                  <div className="flex flex-wrap gap-1">
                    {props.countries.map(c => (
                      <Badge
                        key={c}
                        variant={props.selectedCountries.includes(c) ? "default" : "outline"}
                        className={cn("text-[9px] cursor-pointer transition-all h-5 px-2", props.selectedCountries.includes(c) ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                        onClick={() => props.onToggleCountry(c)}
                      >{c}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Grape */}
              {props.grapes.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Uva</p>
                  <div className="flex flex-wrap gap-1">
                    {props.grapes.map(g => (
                      <Badge
                        key={g}
                        variant={props.selectedGrapes.includes(g) ? "default" : "outline"}
                        className={cn("text-[9px] cursor-pointer transition-all h-5 px-2", props.selectedGrapes.includes(g) ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                        onClick={() => props.onToggleGrape(g)}
                      >{g}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Style */}
              {props.styles.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Estilo</p>
                  <div className="flex flex-wrap gap-1">
                    {props.styles.map(s => (
                      <Badge
                        key={s}
                        variant={props.selectedStyles.includes(s) ? "default" : "outline"}
                        className={cn("text-[9px] cursor-pointer transition-all h-5 px-2", props.selectedStyles.includes(s) ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                        onClick={() => props.onToggleStyle(s)}
                      >{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Vintage */}
              {props.vintages.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Safra</p>
                  <div className="flex flex-wrap gap-1">
                    {props.vintages.map(v => (
                      <Badge
                        key={v}
                        variant={props.selectedVintages.includes(v) ? "default" : "outline"}
                        className={cn("text-[9px] cursor-pointer transition-all h-5 px-2", props.selectedVintages.includes(v) ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                        onClick={() => props.onToggleVintage(v)}
                      >{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function ReportsPage() {
  const { totalBottles, totalValue, wines, isLoading } = useWineMetrics();
  const [tab, setTab] = useState<ReportTab>("estoque");
  const allSales = useMemo(() => loadSales(), []);

  // Filter state
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedVintages, setSelectedVintages] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const toggle = (v: string, list: string[], setter: (l: string[]) => void) =>
    setter(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const clearFilters = () => {
    setSelectedCountries([]); setSelectedGrapes([]); setSelectedStyles([]); setSelectedVintages([]);
    setDateFrom(""); setDateTo("");
  };

  const activeFilterCount = selectedCountries.length + selectedGrapes.length + selectedStyles.length + selectedVintages.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  // Available filter options from all wines
  const allCountries = useMemo(() => [...new Set(wines.map(w => w.country).filter(Boolean) as string[])].sort(), [wines]);
  const allGrapes = useMemo(() => [...new Set(wines.map(w => w.grape).filter(Boolean) as string[])].sort(), [wines]);
  const allStyles = useMemo(() => [...new Set(wines.map(w => w.style).filter(Boolean) as string[])].sort(), [wines]);
  const allVintages = useMemo(() => [...new Set(wines.filter(w => w.vintage).map(w => String(w.vintage)))].sort(), [wines]);

  // Filtered wines (for stock tab)
  const filteredWines = useMemo(() => {
    return wines.filter(w => {
      if (selectedCountries.length > 0 && (!w.country || !selectedCountries.includes(w.country))) return false;
      if (selectedGrapes.length > 0 && (!w.grape || !selectedGrapes.includes(w.grape))) return false;
      if (selectedStyles.length > 0 && (!w.style || !selectedStyles.includes(w.style))) return false;
      if (selectedVintages.length > 0 && (!w.vintage || !selectedVintages.includes(String(w.vintage)))) return false;
      if (dateFrom) { const d = new Date(w.created_at); if (d < new Date(dateFrom)) return false; }
      if (dateTo) { const d = new Date(w.created_at); if (d > new Date(dateTo + "T23:59:59")) return false; }
      return true;
    });
  }, [wines, selectedCountries, selectedGrapes, selectedStyles, selectedVintages, dateFrom, dateTo]);

  // Filtered sales (for sales tab)
  const wineMap = useMemo(() => new Map(wines.map(w => [w.name, w])), [wines]);

  const filteredSales = useMemo(() => {
    return allSales.filter(s => {
      const wine = wineMap.get(s.wineName);
      if (selectedCountries.length > 0 && (!wine?.country || !selectedCountries.includes(wine.country))) return false;
      if (selectedGrapes.length > 0 && (!wine?.grape || !selectedGrapes.includes(wine.grape))) return false;
      if (selectedStyles.length > 0 && (!wine?.style || !selectedStyles.includes(wine.style))) return false;
      if (selectedVintages.length > 0 && (!wine?.vintage || !selectedVintages.includes(String(wine.vintage)))) return false;
      if (dateFrom) { const d = new Date(s.date); if (d < new Date(dateFrom)) return false; }
      if (dateTo) { const d = new Date(s.date); if (d > new Date(dateTo + "T23:59:59")) return false; }
      return true;
    });
  }, [allSales, wineMap, selectedCountries, selectedGrapes, selectedStyles, selectedVintages, dateFrom, dateTo]);

  // ====== STOCK REPORTS (filtered) ======
  const fTotalBottles = filteredWines.reduce((s, w) => s + w.quantity, 0);
  const fTotalValue = filteredWines.reduce((s, w) => s + (w.current_value ?? w.purchase_price ?? 0) * w.quantity, 0);

  const byCountry = useMemo(() => {
    const map: Record<string, { qty: number; value: number }> = {};
    filteredWines.forEach(w => { const k = w.country || "Outro"; if (!map[k]) map[k] = { qty: 0, value: 0 }; map[k].qty += w.quantity; map[k].value += (w.current_value ?? w.purchase_price ?? 0) * w.quantity; });
    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty).map(([name, d]) => ({ name, qty: d.qty, value: d.value }));
  }, [filteredWines]);

  const byGrape = useMemo(() => {
    const map: Record<string, { qty: number }> = {};
    filteredWines.forEach(w => { const k = w.grape || "Outro"; if (!map[k]) map[k] = { qty: 0 }; map[k].qty += w.quantity; });
    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty).map(([name, d]) => ({ name, qty: d.qty }));
  }, [filteredWines]);

  const byStyle = useMemo(() => {
    const map: Record<string, number> = {};
    filteredWines.forEach(w => { map[w.style || "Outro"] = (map[w.style || "Outro"] || 0) + w.quantity; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filteredWines]);

  const byVintage = useMemo(() => {
    const map: Record<string, number> = {};
    filteredWines.filter(w => w.vintage).forEach(w => { map[String(w.vintage)] = (map[String(w.vintage)] || 0) + w.quantity; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([name, value]) => ({ name, value }));
  }, [filteredWines]);

  const byLabel = useMemo(() => {
    return filteredWines.filter(w => w.quantity > 0).sort((a, b) => b.quantity - a.quantity).slice(0, 10)
      .map(w => ({ name: w.name.length > 20 ? w.name.slice(0, 20) + "…" : w.name, fullName: w.name, qty: w.quantity, value: (w.current_value ?? w.purchase_price ?? 0) * w.quantity }));
  }, [filteredWines]);

  // ====== SALES REPORTS (filtered) ======
  const fSalesRevenue = filteredSales.reduce((s, sale) => s + sale.quantity * sale.unitPrice, 0);
  const fSalesUnits = filteredSales.reduce((s, sale) => s + sale.quantity, 0);

  const salesByCountry = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    filteredSales.forEach(s => { const wine = wineMap.get(s.wineName); const c = wine?.country || "Outro"; if (!map[c]) map[c] = { qty: 0, revenue: 0 }; map[c].qty += s.quantity; map[c].revenue += s.quantity * s.unitPrice; });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));
  }, [filteredSales, wineMap]);

  const salesByGrape = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    filteredSales.forEach(s => { const wine = wineMap.get(s.wineName); const g = wine?.grape || "Outro"; if (!map[g]) map[g] = { qty: 0, revenue: 0 }; map[g].qty += s.quantity; map[g].revenue += s.quantity * s.unitPrice; });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));
  }, [filteredSales, wineMap]);

  const salesByLabel = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    filteredSales.forEach(s => { if (!map[s.wineName]) map[s.wineName] = { qty: 0, revenue: 0 }; map[s.wineName].qty += s.quantity; map[s.wineName].revenue += s.quantity * s.unitPrice; });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10).map(([name, d]) => ({ name: name.length > 20 ? name.slice(0, 20) + "…" : name, fullName: name, qty: d.qty, revenue: d.revenue }));
  }, [filteredSales]);

  const salesByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach(s => { const day = new Date(s.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); map[day] = (map[day] || 0) + s.quantity * s.unitPrice; });
    return Object.entries(map).slice(-14).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  const salesByCustomer = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    filteredSales.forEach(s => { const c = s.customer || "Sem cliente"; if (!map[c]) map[c] = { qty: 0, revenue: 0 }; map[c].qty += s.quantity; map[c].revenue += s.quantity * s.unitPrice; });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10).map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));
  }, [filteredSales]);

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

      {/* FILTERS */}
      <FilterBar
        countries={allCountries}
        grapes={allGrapes}
        styles={allStyles}
        vintages={allVintages}
        selectedCountries={selectedCountries}
        selectedGrapes={selectedGrapes}
        selectedStyles={selectedStyles}
        selectedVintages={selectedVintages}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onToggleCountry={v => toggle(v, selectedCountries, setSelectedCountries)}
        onToggleGrape={v => toggle(v, selectedGrapes, setSelectedGrapes)}
        onToggleStyle={v => toggle(v, selectedStyles, setSelectedStyles)}
        onToggleVintage={v => toggle(v, selectedVintages, setSelectedVintages)}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      {activeFilterCount > 0 && (
        <p className="text-[9px] text-muted-foreground">
          Filtros ativos: mostrando dados filtrados
        </p>
      )}

      {/* ====== ESTOQUE TAB ====== */}
      {tab === "estoque" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Garrafas", value: fTotalBottles, icon: Wine, color: "#8F2D56" },
              { label: "Valor total", value: `R$ ${fTotalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "#C9A86A" },
              { label: "Rótulos", value: filteredWines.filter(w => w.quantity > 0).length, icon: Tag, color: "#C44569" },
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
            {byCountry.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por País</h3>
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

            {byGrape.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por Uva</h3>
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

            {byStyle.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por Estilo</h3>
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

            {byVintage.length > 0 && (
              <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Estoque por Safra</h3>
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

            {byLabel.length > 0 && (
              <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
                <h3 className="text-[12px] font-semibold text-foreground mb-1">Top Rótulos em Estoque</h3>
                <div className="space-y-1.5">
                  {byLabel.map((w, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold w-5 text-muted-foreground shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0"><p className="text-[11px] font-semibold truncate text-foreground">{w.fullName}</p></div>
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

      {/* ====== VENDAS TAB ====== */}
      {tab === "vendas" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Faturamento", value: `R$ ${fSalesRevenue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "#C9A86A" },
              { label: "Unidades", value: fSalesUnits, icon: Package, color: "#8F2D56" },
              { label: "Vendas", value: filteredSales.length, icon: ShoppingCart, color: "#22c55e" },
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

          {filteredSales.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-[12px] text-muted-foreground">Nenhuma venda encontrada com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {salesByDay.length > 0 && (
                <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={4}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Faturamento por Dia</h3>
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

              {salesByCountry.length > 0 && (
                <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Vendas por País</h3>
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
                        <span className="text-[9px] text-muted-foreground">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {salesByGrape.length > 0 && (
                <motion.div className="glass-card p-4" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Vendas por Uva</h3>
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

              {salesByLabel.length > 0 && (
                <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Top Rótulos Vendidos</h3>
                  <div className="space-y-1.5">
                    {salesByLabel.map((w, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold w-5 text-muted-foreground shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0"><p className="text-[11px] font-semibold truncate text-foreground">{w.fullName}</p></div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{w.qty} un.</span>
                        <span className="text-[10px] font-bold text-primary shrink-0">R$ {w.revenue.toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {salesByCustomer.length > 0 && (
                <motion.div className="glass-card p-4 lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
                  <h3 className="text-[12px] font-semibold text-foreground mb-1">Top Clientes</h3>
                  <div className="space-y-1.5">
                    {salesByCustomer.map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold w-5 text-muted-foreground shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0"><p className="text-[11px] font-semibold truncate text-foreground">{c.name}</p></div>
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
