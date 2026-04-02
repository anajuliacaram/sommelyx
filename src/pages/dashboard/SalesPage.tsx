import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2, DollarSign, Package, ChevronDown, ChevronRight, CalendarDays } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { useDeleteSale, useSales } from "@/hooks/useBusinessData";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

interface DayGroup {
  dateKey: string;
  label: string;
  sales: ReturnType<typeof useSales>["data"] extends Array<infer T> ? T[] : never;
  totalRevenue: number;
  totalUnits: number;
}

export default function SalesPage() {
  const { data: sales = [], isLoading } = useSales();
  const deleteSale = useDeleteSale();
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const totalRevenue = sales.reduce((s, sale) => s + sale.quantity * sale.price, 0);
  const totalUnits = sales.reduce((s, sale) => s + sale.quantity, 0);

  const totalOrders = useMemo(() => {
    const dates = new Set(sales.map((s) => new Date(s.created_at).toLocaleDateString("pt-BR")));
    return dates.size;
  }, [sales]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, typeof sales>();

    sales.forEach((sale) => {
      const d = new Date(sale.created_at);
      const key = d.toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sale);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, daySales]) => {
        const d = new Date(`${dateKey}T12:00:00`);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = d.toDateString() === today.toDateString();
        const isYesterday = d.toDateString() === yesterday.toDateString();

        let label: string;
        if (isToday) label = "Hoje";
        else if (isYesterday) label = "Ontem";
        else label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

        return {
          dateKey,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          sales: daySales,
          totalRevenue: daySales.reduce((s, sale) => s + sale.quantity * sale.price, 0),
          totalUnits: daySales.reduce((s, sale) => s + sale.quantity, 0),
        };
      });
  }, [sales]);

  const toggleDay = (key: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRemove = async (id: string) => {
    await deleteSale.mutateAsync(id);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Carregando vendas…</div>;
  }

  return (
    <div className="space-y-4 max-w-[1000px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Vendas</h1>
        <p className="text-[11px] text-muted-foreground">Histórico de vendas registradas</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <motion.div className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 bg-primary/10">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-lg md:text-xl font-black font-sans tracking-tight text-foreground">R$ {totalRevenue.toLocaleString("pt-BR")}</p>
          <p className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Receita total</p>
        </motion.div>

        <motion.div className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 bg-accent/10">
            <Package className="h-3.5 w-3.5 text-accent" />
          </div>
          <p className="text-lg md:text-xl font-black font-sans tracking-tight text-foreground">{totalUnits}</p>
          <p className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Unidades vendidas</p>
        </motion.div>

        <motion.div className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 bg-success/10">
            <CalendarDays className="h-3.5 w-3.5 text-success" />
          </div>
          <p className="text-lg md:text-xl font-black font-sans tracking-tight text-foreground">{totalOrders}</p>
          <p className="text-[9px] md:text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Dias com vendas</p>
        </motion.div>
      </div>

      {dayGroups.length > 0 ? (
        <div className="space-y-3">
          {dayGroups.map((group, gi) => {
            const isCollapsed = collapsedDays.has(group.dateKey);
            return (
              <motion.div key={group.dateKey} initial="hidden" animate="visible" variants={fadeUp} custom={gi + 4}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toggleDay(group.dateKey)}
                  className="w-full flex items-center gap-2 px-1 py-2 rounded-xl h-auto justify-start hover:bg-muted/40"
                >
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-[12px] font-bold text-foreground">{group.label}</span>
                  <span className="text-[10px] text-muted-foreground">{group.sales.length} item(ns)</span>
                  <span className="ml-auto text-[11px] font-bold text-foreground">R$ {group.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-[9px] text-muted-foreground">{group.totalUnits} un.</span>
                </Button>

                {!isCollapsed && (
                  <div className="space-y-1 ml-1">
                    {group.sales.map((sale) => (
                      <div key={sale.id} className="glass-card p-3 flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate text-foreground">{sale.name}</p>
                          <p className="text-[9px] text-muted-foreground">{sale.quantity} un. × R$ {sale.price.toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-bold text-foreground">R$ {(sale.quantity * sale.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          <p className="text-[8px] text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 md:h-7 md:w-7 p-0 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity text-destructive"
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
          description="As vendas reais aparecerão aqui automaticamente, sem dados fictícios."
        />
      )}
    </div>
  );
}
