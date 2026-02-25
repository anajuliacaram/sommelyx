import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Wine, Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWines, useDeleteWine, type Wine as WineType } from "@/hooks/useWines";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { EditWineDialog } from "@/components/EditWineDialog";
import { useToast } from "@/hooks/use-toast";

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
  const deleteWine = useDeleteWine();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("drink");
  const [styleFilter, setStyleFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editWine, setEditWine] = useState<WineType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WineType | null>(null);

  const filtered = useMemo(() => {
    if (!wines) return [];
    let list = wines.filter(w => w.quantity > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        w.name.toLowerCase().includes(q) || w.producer?.toLowerCase().includes(q) ||
        w.grape?.toLowerCase().includes(q) || w.country?.toLowerCase().includes(q)
      );
    }
    if (styleFilter !== "all") list = list.filter(w => w.style === styleFilter);
    list.sort((a, b) => {
      if (sortBy === "drink") {
        const order = { now: 0, young: 1, past: 2 };
        return (order[drinkStatus(a) as keyof typeof order] ?? 3) - (order[drinkStatus(b) as keyof typeof order] ?? 3);
      }
      if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "value") return (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0);
      if (sortBy === "qty") return b.quantity - a.quantity;
      return 0;
    });
    return list;
  }, [wines, search, sortBy, styleFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWine.mutateAsync(deleteTarget.id);
      toast({ title: `"${deleteTarget.name}" removido da adega.` });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Erro ao remover vinho", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>Meus Vinhos</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} vinho(s) em estoque</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gradient-wine text-primary-foreground btn-glow h-9 px-4 text-[13px]">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, produtor, uva..." className="pl-10" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]"><SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-premium h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div className="card-depth p-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                className="card-depth p-5 group hover:border-border/70 transition-all duration-200"
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
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {status && (
                      <Badge variant="secondary" className={`text-[10px] ${statusColor[status]}`}>
                        {statusLabel[status]}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span>{wine.quantity} un.</span>
                  {wine.style && <span className="capitalize">{wine.style}</span>}
                  {wine.purchase_price && <span>R$ {wine.purchase_price.toFixed(0)}</span>}
                  {wine.country && <span>{wine.country}</span>}
                </div>
                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-[11px] px-2.5 flex-1"
                    onClick={() => setEditWine(wine)}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-[11px] px-2.5 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(wine)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} />
      <EditWineDialog open={!!editWine} onOpenChange={v => { if (!v) setEditWine(null); }} wine={editWine} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Remover vinho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>"{deleteTarget?.name}"</strong> da sua adega? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
