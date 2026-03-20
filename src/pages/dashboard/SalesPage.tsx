import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Plus, Trash2, DollarSign, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";

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

function loadSales(): Sale[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveSales(items: Sale[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>(loadSales);
  const [showForm, setShowForm] = useState(false);
  const [wineName, setWineName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [customer, setCustomer] = useState("");

  const totalRevenue = sales.reduce((s, sale) => s + sale.quantity * sale.unitPrice, 0);
  const totalUnits = sales.reduce((s, sale) => s + sale.quantity, 0);

  const handleAdd = () => {
    if (!wineName.trim()) return;
    const newSale: Sale = {
      id: crypto.randomUUID(),
      wineName: wineName.trim(),
      quantity: Number(quantity) || 1,
      unitPrice: Number(unitPrice) || 0,
      customer: customer.trim(),
      date: new Date().toISOString(),
    };
    const updated = [newSale, ...sales];
    setSales(updated);
    saveSales(updated);
    setWineName(""); setQuantity(""); setUnitPrice(""); setCustomer("");
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    saveSales(updated);
  };

  return (
    <div className="space-y-4 max-w-[1000px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Vendas</h1>
          <p className="text-[11px] text-muted-foreground">Registre e acompanhe suas vendas</p>
        </div>
        <Button variant="premium" size="sm" className="h-8 px-3 text-[11px] font-bold" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Registrar venda
        </Button>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: "rgba(201,168,106,0.1)" }}>
            <DollarSign className="h-3.5 w-3.5" style={{ color: "#C9A86A" }} />
          </div>
          <p className="text-xl font-black font-sans tracking-tight text-foreground">R$ {totalRevenue.toLocaleString("pt-BR")}</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Receita total</p>
        </motion.div>
        <motion.div className="glass-card p-3" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: "rgba(143,45,86,0.06)" }}>
            <Package className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xl font-black font-sans tracking-tight text-foreground">{totalUnits}</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.06em]">Unidades vendidas</p>
        </motion.div>
      </div>

      {showForm && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="glass-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Vinho vendido *" value={wineName} onChange={e => setWineName(e.target.value)} className="h-9 text-[12px]" />
            <Input placeholder="Cliente" value={customer} onChange={e => setCustomer(e.target.value)} className="h-9 text-[12px]" />
            <Input placeholder="Quantidade" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-9 text-[12px]" />
            <Input placeholder="Preço unitário (R$)" type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="h-9 text-[12px]" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-[11px]" onClick={handleAdd} disabled={!wineName.trim()}>Salvar</Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </motion.div>
      )}

      {sales.length > 0 ? (
        <div className="space-y-1.5">
          {sales.map((sale, i) => (
            <motion.div
              key={sale.id}
              className="glass-card p-3 flex items-center gap-3 group"
              initial="hidden" animate="visible" variants={fadeUp} custom={i + 3}
            >
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
                <p className="text-[11px] font-bold text-foreground">R$ {(sale.quantity * sale.unitPrice).toLocaleString("pt-BR")}</p>
                <p className="text-[8px] text-muted-foreground">
                  {new Date(sale.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </p>
              </div>
              <Button
                size="sm" variant="ghost"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => handleRemove(sale.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </div>
      ) : (
        <PremiumEmptyState
          icon={ShoppingCart}
          title="Gestão de vendas"
          description="Registre vendas de vinhos, acompanhe receita e histórico de clientes."
          primaryAction={{ label: "Registrar venda", onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      )}
    </div>
  );
}
