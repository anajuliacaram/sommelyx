import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Wine, Plus, Pencil, Trash2, LayoutGrid, List, GlassWater, MapPin, X, Bookmark, BookmarkCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWines, useDeleteWine, useWineEvent, type Wine as WineType } from "@/hooks/useWines";
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

const statusLabel = { now: "Beber agora", past: "Passou", young: "Jovem" };
const statusColor = { now: "bg-green-500/10 text-green-700", past: "bg-orange-500/10 text-orange-700", young: "bg-blue-500/10 text-blue-700" };

const styleChips = [
  { value: "all", label: "Todos" },
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "fortificado", label: "Fortificado" },
];

interface SavedFilter {
  name: string;
  style: string;
  drinkWindow: string;
  stockFilter: string;
}

const defaultSavedFilters: SavedFilter[] = [
  { name: "Tintos para beber agora", style: "tinto", drinkWindow: "now", stockFilter: "all" },
  { name: "Espumantes", style: "espumante", drinkWindow: "all", stockFilter: "all" },
  { name: "Baixo estoque", style: "all", drinkWindow: "all", stockFilter: "low" },
];

export default function CellarPage() {
  const { data: wines, isLoading } = useWines();
  const deleteWine = useDeleteWine();
  const wineEvent = useWineEvent();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("drink");
  const [styleFilter, setStyleFilter] = useState("all");
  const [drinkWindowFilter, setDrinkWindowFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editWine, setEditWine] = useState<WineType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WineType | null>(null);
  const [activeSavedFilter, setActiveSavedFilter] = useState<string | null>(null);

  const applySavedFilter = (f: SavedFilter) => {
    setStyleFilter(f.style);
    setDrinkWindowFilter(f.drinkWindow);
    setStockFilter(f.stockFilter);
    setActiveSavedFilter(f.name);
  };

  const clearFilters = () => {
    setStyleFilter("all");
    setDrinkWindowFilter("all");
    setStockFilter("all");
    setActiveSavedFilter(null);
    setSearch("");
  };

  const hasActiveFilters = styleFilter !== "all" || drinkWindowFilter !== "all" || stockFilter !== "all" || search;

  const filtered = useMemo(() => {
    if (!wines) return [];
    let list = wines.filter(w => w.quantity > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        w.name.toLowerCase().includes(q) || w.producer?.toLowerCase().includes(q) ||
        w.grape?.toLowerCase().includes(q) || w.country?.toLowerCase().includes(q) ||
        w.region?.toLowerCase().includes(q) || w.cellar_location?.toLowerCase().includes(q)
      );
    }
    if (styleFilter !== "all") list = list.filter(w => w.style === styleFilter);
    if (drinkWindowFilter !== "all") {
      list = list.filter(w => drinkStatus(w) === drinkWindowFilter);
    }
    if (stockFilter === "low") list = list.filter(w => w.quantity <= 2);

    list.sort((a, b) => {
      if (sortBy === "drink") {
        const order = { now: 0, young: 1, past: 2 };
        return (order[drinkStatus(a) as keyof typeof order] ?? 3) - (order[drinkStatus(b) as keyof typeof order] ?? 3);
      }
      if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "value") return (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0);
      if (sortBy === "qty") return b.quantity - a.quantity;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [wines, search, sortBy, styleFilter, drinkWindowFilter, stockFilter]);

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

  const handleOpen = async (wine: WineType) => {
    try {
      await wineEvent.mutateAsync({ wineId: wine.id, eventType: "open", quantity: 1 });
      toast({ title: `🍷 "${wine.name}" aberto!` });
    } catch {
      toast({ title: "Erro ao registrar abertura", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold" style={{ letterSpacing: "-0.03em", color: "#0F0F14" }}>Minha Adega</h1>
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>{filtered.length} vinho(s) em estoque</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gradient-wine text-white btn-glow h-10 px-5 text-[13px] font-semibold border-0">
          <Plus className="h-4 w-4 mr-1.5" /> Adicionar vinho
        </Button>
      </div>

      {/* Search + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9CA3AF" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquise vinho, produtor, uva, safra, localização…"
            className="pl-10 h-10 text-sm rounded-[14px]"
            style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              onClick={() => setViewMode("grid")}
              className="h-10 w-10 flex items-center justify-center transition-colors"
              style={{ background: viewMode === "grid" ? "rgba(143,45,86,0.08)" : "transparent", color: viewMode === "grid" ? "#8F2D56" : "#9CA3AF" }}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="h-10 w-10 flex items-center justify-center transition-colors"
              style={{ background: viewMode === "list" ? "rgba(143,45,86,0.08)" : "transparent", color: viewMode === "list" ? "#8F2D56" : "#9CA3AF" }}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="h-10 px-3 text-[12px] rounded-[10px] bg-transparent cursor-pointer"
            style={{ border: "1px solid rgba(0,0,0,0.06)", color: "#6B7280" }}
          >
            <option value="drink">Prioridade de consumo</option>
            <option value="date">Data de entrada</option>
            <option value="name">Nome A-Z</option>
            <option value="value">Valor</option>
            <option value="qty">Quantidade</option>
          </select>
        </div>
      </div>

      {/* Style Chips */}
      <div className="flex flex-wrap gap-2">
        {styleChips.map(c => (
          <button
            key={c.value}
            onClick={() => { setStyleFilter(c.value); setActiveSavedFilter(null); }}
            className="h-8 px-3.5 rounded-full text-[11px] font-medium transition-all duration-200"
            style={{
              background: styleFilter === c.value ? "#8F2D56" : "rgba(0,0,0,0.03)",
              color: styleFilter === c.value ? "white" : "#6B7280",
              border: `1px solid ${styleFilter === c.value ? "#8F2D56" : "rgba(0,0,0,0.06)"}`,
            }}
          >
            {c.label}
          </button>
        ))}
        <div className="w-px h-8 mx-1" style={{ background: "rgba(0,0,0,0.06)" }} />
        {/* Drink window chips */}
        {(["now", "young", "past"] as const).map(dw => (
          <button
            key={dw}
            onClick={() => { setDrinkWindowFilter(drinkWindowFilter === dw ? "all" : dw); setActiveSavedFilter(null); }}
            className="h-8 px-3.5 rounded-full text-[11px] font-medium transition-all duration-200"
            style={{
              background: drinkWindowFilter === dw ? (dw === "now" ? "#22c55e" : dw === "past" ? "#f59e0b" : "#3b82f6") : "rgba(0,0,0,0.03)",
              color: drinkWindowFilter === dw ? "white" : "#6B7280",
              border: `1px solid ${drinkWindowFilter === dw ? "transparent" : "rgba(0,0,0,0.06)"}`,
            }}
          >
            {statusLabel[dw]}
          </button>
        ))}
        <button
          onClick={() => { setStockFilter(stockFilter === "low" ? "all" : "low"); setActiveSavedFilter(null); }}
          className="h-8 px-3.5 rounded-full text-[11px] font-medium transition-all duration-200"
          style={{
            background: stockFilter === "low" ? "#E07A5F" : "rgba(0,0,0,0.03)",
            color: stockFilter === "low" ? "white" : "#6B7280",
            border: `1px solid ${stockFilter === "low" ? "transparent" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          Baixo estoque
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="h-8 px-3 rounded-full text-[11px] font-medium flex items-center gap-1" style={{ color: "#E07A5F" }}>
            <X className="h-3 w-3" /> Limpar
          </button>
        )}
      </div>

      {/* Saved Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider self-center mr-1" style={{ color: "#9CA3AF" }}>Filtros salvos:</span>
        {defaultSavedFilters.map(f => (
          <button
            key={f.name}
            onClick={() => applySavedFilter(f)}
            className="h-7 px-3 rounded-full text-[10px] font-medium flex items-center gap-1.5 transition-all duration-200"
            style={{
              background: activeSavedFilter === f.name ? "rgba(143,45,86,0.08)" : "rgba(0,0,0,0.02)",
              color: activeSavedFilter === f.name ? "#8F2D56" : "#6B7280",
              border: `1px solid ${activeSavedFilter === f.name ? "rgba(143,45,86,0.2)" : "rgba(0,0,0,0.04)"}`,
            }}
          >
            {activeSavedFilter === f.name ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
            {f.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-premium h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div className="glass-card p-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-14 h-14 rounded-[16px] gradient-wine flex items-center justify-center mx-auto mb-5" style={{ boxShadow: "0 8px 24px rgba(143,45,86,0.2)" }}>
            <Wine className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-base font-semibold mb-2" style={{ color: "#0F0F14" }}>Nenhum vinho encontrado</h3>
          <p className="text-sm mb-5" style={{ color: "#6B7280" }}>
            {hasActiveFilters ? "Tente alterar os filtros." : "Adicione seu primeiro vinho para começar."}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => setAddOpen(true)} className="gradient-wine text-white btn-glow h-11 px-6 text-[13px] border-0">
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar Vinho
            </Button>
          )}
        </motion.div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((wine, i) => {
            const status = drinkStatus(wine);
            return (
              <motion.div
                key={wine.id}
                className="glass-card p-5 group"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.35 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate" style={{ color: "#0F0F14" }}>{wine.name}</h3>
                    <p className="text-[11px] truncate" style={{ color: "#6B7280" }}>
                      {[wine.producer, wine.vintage].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {status && (
                    <Badge variant="secondary" className={`text-[10px] ml-2 shrink-0 ${statusColor[status]}`}>
                      {statusLabel[status]}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] mb-3" style={{ color: "#6B7280" }}>
                  <span className="font-semibold" style={{ color: "#0F0F14" }}>{wine.quantity} un.</span>
                  {wine.style && <span className="capitalize">{wine.style}</span>}
                  {wine.purchase_price && <span>R$ {wine.purchase_price.toFixed(0)}</span>}
                  {wine.country && <span>{wine.country}</span>}
                  {wine.cellar_location && (
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{wine.cellar_location}</span>
                  )}
                </div>
                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {status === "now" && (
                    <Button
                      size="sm" variant="outline"
                      className="h-7 text-[10px] px-2.5 flex-1 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                      onClick={() => handleOpen(wine)}
                    >
                      <GlassWater className="h-3 w-3 mr-1" /> Abrir
                    </Button>
                  )}
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-[10px] px-2.5 flex-1"
                    onClick={() => setEditWine(wine)}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-[10px] px-2.5 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(wine)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "#9CA3AF" }}>Vinho</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 hidden sm:table-cell" style={{ color: "#9CA3AF" }}>Estilo</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 hidden md:table-cell" style={{ color: "#9CA3AF" }}>Local</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "#9CA3AF" }}>Qtd</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-4 py-3 hidden md:table-cell" style={{ color: "#9CA3AF" }}>Status</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "#9CA3AF" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wine, i) => {
                const status = drinkStatus(wine);
                return (
                  <tr key={wine.id} className="transition-colors hover:bg-black/[0.015] group" style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-semibold" style={{ color: "#0F0F14" }}>{wine.name}</p>
                      <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{[wine.producer, wine.vintage, wine.country].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(143,45,86,0.06)", color: "#8F2D56" }}>
                        {wine.style || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[10px]" style={{ color: "#6B7280" }}>{wine.cellar_location || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[12px] font-bold" style={{ color: "#0F0F14" }}>{wine.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {status ? (
                        <Badge variant="secondary" className={`text-[9px] ${statusColor[status]}`}>{statusLabel[status]}</Badge>
                      ) : <span className="text-[10px]" style={{ color: "#9CA3AF" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {status === "now" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleOpen(wine)}>
                            <GlassWater className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditWine(wine)}>
                          <Pencil className="h-3.5 w-3.5" style={{ color: "#6B7280" }} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(wine)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
