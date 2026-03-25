import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2, DollarSign, Package, ChevronDown, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

interface Sale {
  id: string;
  wineName: string;
  quantity: number;
  unitPrice: number;
  customer: string;
  date: string;
}

const STORAGE_KEY = "sommelyx_sales";

function generateDemoSales(): Sale[] {
  const now = new Date();
  const wines = [
    { name: "Château Margaux 2015", customer: "João Silva", price: 1200 },
    { name: "Opus One 2018", customer: "Maria Santos", price: 1800 },
    { name: "Dom Pérignon 2012", customer: "Carlos Oliveira", price: 1400 },
    { name: "Almaviva 2019", customer: "Restaurante Bela Vista", price: 520 },
    { name: "Cloudy Bay Sauvignon Blanc 2022", customer: "Ana Paula", price: 200 },
    { name: "Vega Sicilia Único 2011", customer: "Pedro Mendes", price: 1100 },
    { name: "Barolo Monfortino 2014", customer: "Wine Bar Central", price: 3500 },
    { name: "Penfolds Grange 2017", customer: "Lucas Ferreira", price: 2800 },
  ];
  const salesPerDay = [3, 2, 3, 1, 2];
  const result: Sale[] = [];
  let idx = 0;
  for (let d = 0; d < 5; d++) {
    for (let i = 0; i < salesPerDay[d]; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
      const w = wines[idx % wines.length];
      result.push({
        id: `demo-${d}-${i}`,
        wineName: w.name,
        quantity: Math.floor(Math.random() * 3) + 1,
        unitPrice: w.price,
        customer: w.customer,
        date: date.toISOString(),
      });
      idx++;
    }
  }
  return result;
}

function loadSales(): Sale[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return stored.length > 0 ? stored : generateDemoSales();
  } catch { return generateDemoSales(); }
}
function saveSales(items: Sale[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

interface DayGroup {
  dateKey: string;
  label: string;
  sales: Sale[];
  totalRevenue: number;
  totalUnits: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>(loadSales);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const totalRevenue = sales.reduce((s, sale) => s + sale.quantity * sale.unitPrice, 0);
  const totalUnits = sales.reduce((s, sale) => s + sale.quantity, 0);
  const totalOrders = useMemo(() => {
    const dates = new Set(sales.map(s => new Date(s.date).toLocaleDateString("pt-BR")));
    return dates.size;
  }, [sales]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, Sale[]>();
    sales.forEach(sale => {
      const d = new Date(sale.date);
      const key = d.toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sale);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, daySales]) => {
        const d = new Date(dateKey + "T12:00:00");
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        let label: string;
        if (isToday) label = "Hoje";
        else if (isYesterday) label = "Ontem";
        else label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

        return {
          dateKey,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          sales: daySales,
          totalRevenue: daySales.reduce((s, sale) => s + sale.quantity * sale.unitPrice, 0),
          totalUnits: daySales.reduce((s, sale) => s + sale.quantity, 0),
        };
      });
  }, [sales]);

  const toggleDay = (key: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleRemove = (id: string) => {
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    saveSales(updated);
  };

  return (
    <div className="space-y-4 max-w-[1000px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Vendas</h1>
        <p className="text-[11px] text-muted-foreground">Histórico de vendas registradas</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <motion.div className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: "rgba(201,168,106,0.1)" }}>
            <DollarSign className="h-3.5 w-3.5" style={{ color: "#C9A86A" }} />
          </div>
          <p className="text-lg md:text-xl font-black font-sans tracking-tight text-foreground">R$ {totalRevenue.toLocaleString("pt-BR")}</p>
          <p className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Receita total</p>
        </motion.div>
        <motion.div className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: "rgba(143,45,86,0.06)" }}>
            <Package className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-lg md:text-xl font-black font-sans tracking-tight text-foreground">{totalUnits}</p>
          <p className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Unidades vendidas</p>
        </motion.div>
        <motion.div className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: "rgba(34,197,94,0.08)" }}>
            <CalendarDays className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
          </div>
          <p className="text-lg md:text-xl font-black font-sans tracking-tight text-foreground">{totalOrders}</p>
          <p className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Dias com vendas</p>
        </motion.div>
      </div>

      {/* Sales by day */}
      {dayGroups.length > 0 ? (
        <div className="space-y-3">
          {dayGroups.map((group, gi) => {
            const isCollapsed = collapsedDays.has(group.dateKey);
            return (
              <motion.div key={group.dateKey} initial="hidden" animate="visible" variants={fadeUp} custom={gi + 4}>
                {/* Day header */}
                <button
                  onClick={() => toggleDay(group.dateKey)}
                  className="w-full flex items-center gap-2 px-1 py-2 group"
                >
                  {isCollapsed
                    ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                  <span className="text-[12px] font-bold text-foreground">{group.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {group.sales.length} item(ns)
                  </span>
                  <span className="ml-auto text-[11px] font-bold text-foreground">
                    R$ {group.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{group.totalUnits} un.</span>
                </button>

                {/* Day sales */}
                {!isCollapsed && (
                  <div className="space-y-1 ml-1">
                    {group.sales.map(sale => (
                      <div key={sale.id} className="glass-card p-3 flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(143,45,86,0.06)" }}>
                          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate text-foreground">{sale.wineName}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {sale.customer || "Sem cliente"} · {sale.quantity} un. × R$ {sale.unitPrice.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-bold text-foreground">
                            R$ {(sale.quantity * sale.unitPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[8px] text-muted-foreground">
                            {new Date(sale.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive"
                          onClick={() => handleRemove(sale.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <PremiumEmptyState
          icon={ShoppingCart}
          title="Nenhuma venda registrada"
          description="Use o botão 'Adicionar Venda' na barra lateral para registrar suas vendas."
        />
      )}
    </div>
  );
}
