import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Wine, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWines } from "@/hooks/useWines";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";

const currentYear = new Date().getFullYear();

function drinkStatus(w: { drink_from: number | null; drink_until: number | null }) {
  if (!w.drink_from && !w.drink_until) return null;
  if (w.drink_until && currentYear > w.drink_until) return "past";
  if (w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until) return "now";
  if (w.drink_from && currentYear < w.drink_from) return "young";
  return null;
}

const statusLabel = { now: "Beber agora", past: "Passou da janela", young: "Jovem demais" };
const statusColor = { now: "bg-green-500/10 text-green-700", past: "bg-orange-500/10 text-orange-700", young: "bg-blue-500/10 text-blue-700" };

export default function CellarPage() {
  const { data: wines, isLoading } = useWines();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("drink");
  const [styleFilter, setStyleFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!wines) return [];
    let list = wines.filter(w => w.quantity > 0);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.producer?.toLowerCase().includes(q) ||
        w.grape?.toLowerCase().includes(q) ||
        w.country?.toLowerCase().includes(q)
      );
    }

    if (styleFilter !== "all") {
      list = list.filter(w => w.style === styleFilter);
    }

    list.sort((a, b) => {
      if (sortBy === "drink") {
        const sa = drinkStatus(a), sb = drinkStatus(b);
        const order = { now: 0, young: 1, past: 2 };
        return (order[sa as keyof typeof order] ?? 3) - (order[sb as keyof typeof order] ?? 3);
      }
      if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "value") return (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0);
      if (sortBy === "qty") return b.quantity - a.quantity;
      return 0;
    });

    return list;
  }, [wines, search, sortBy, styleFilter]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
            Meus Vinhos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} vinho(s) em estoque</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gradient-wine text-primary-foreground btn-glow h-9 px-4 text-[13px]">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar
        </Button>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, produtor, uva..." className="pl-10" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="drink">Prioridade de consumo</SelectItem>
            <SelectItem value="date">Data de entrada</SelectItem>
            <SelectItem value="value">Valor</SelectItem>
            <SelectItem value="qty">Quantidade</SelectItem>
          </SelectContent>
        </Select>
        <Select value={styleFilter} onValueChange={setStyleFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estilos</SelectItem>
            <SelectItem value="tinto">Tinto</SelectItem>
            <SelectItem value="branco">Branco</SelectItem>
            <SelectItem value="rose">Rosé</SelectItem>
            <SelectItem value="espumante">Espumante</SelectItem>
            <SelectItem value="sobremesa">Sobremesa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Wine grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-premium h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="card-depth p-12 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <div className="w-12 h-12 rounded-xl gradient-wine flex items-center justify-center mx-auto mb-5 glow-wine">
            <Wine className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Nenhum vinho encontrado</h3>
          <p className="text-sm text-muted-foreground mb-5">Adicione seu primeiro vinho para começar.</p>
          <Button onClick={() => setAddOpen(true)} className="gradient-wine text-primary-foreground btn-glow h-10 px-6 text-[13px]">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Vinho
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((wine, i) => {
            const status = drinkStatus(wine);
            return (
              <motion.div
                key={wine.id}
                className="card-depth p-5 group hover:border-border/70 transition-all duration-200 cursor-pointer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{wine.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {[wine.producer, wine.vintage].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {status && (
                    <Badge variant="secondary" className={`text-[10px] ml-2 shrink-0 ${statusColor[status]}`}>
                      {statusLabel[status]}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{wine.quantity} un.</span>
                  {wine.style && <span className="capitalize">{wine.style}</span>}
                  {wine.purchase_price && <span>R$ {wine.purchase_price.toFixed(0)}</span>}
                  {wine.country && <span>{wine.country}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}
