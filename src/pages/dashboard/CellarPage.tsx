import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Wine, Plus, Pencil, Trash2, LayoutGrid, List, GlassWater, MapPin, X, Bookmark, BookmarkCheck, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const styleOptions = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "fortificado", label: "Fortificado" },
];

const drinkWindowOptions = [
  { value: "now", label: "Beber agora" },
  { value: "young", label: "Jovem" },
  { value: "past", label: "Passou" },
];

interface SavedFilter {
  name: string;
  styles: string[];
  countries: string[];
  grapes: string[];
  vintages: string[];
  drinkWindows: string[];
  lowStock: boolean;
}

const defaultSavedFilters: SavedFilter[] = [
  { name: "Tintos para beber agora", styles: ["tinto"], countries: [], grapes: [], vintages: [], drinkWindows: ["now"], lowStock: false },
  { name: "Espumantes", styles: ["espumante"], countries: [], grapes: [], vintages: [], drinkWindows: [], lowStock: false },
  { name: "Baixo estoque", styles: [], countries: [], grapes: [], vintages: [], drinkWindows: [], lowStock: true },
];

// Multi-select chip dropdown component
function MultiSelectFilter({ label, options, selected, onToggle }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const isActive = selected.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="h-8 px-3 rounded-full text-[11px] font-medium transition-all duration-200 flex items-center gap-1.5"
          style={{
            background: isActive ? "#8F2D56" : "rgba(0,0,0,0.03)",
            color: isActive ? "white" : "#6B7280",
            border: `1px solid ${isActive ? "#8F2D56" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          {label}
          {isActive && (
            <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: "rgba(255,255,255,0.25)" }}>
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 z-50 bg-card border border-border shadow-lg rounded-xl" align="start" sideOffset={6}>
        <div className="space-y-0.5 max-h-56 overflow-y-auto">
          {options.map(opt => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => onToggle(opt.value)}
                className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium flex items-center justify-between transition-colors hover:bg-muted/50"
                style={{ color: active ? "#8F2D56" : "#374151" }}
              >
                <span>{opt.label}</span>
                {active && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#8F2D56" }}>
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                )}
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-3">Nenhuma opção</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function toggleInArray(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

export default function CellarPage() {
  const { data: wines, isLoading } = useWines();
  const deleteWine = useDeleteWine();
  const wineEvent = useWineEvent();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("drink");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [selectedVintages, setSelectedVintages] = useState<string[]>([]);
  const [selectedDrinkWindows, setSelectedDrinkWindows] = useState<string[]>([]);
  const [lowStock, setLowStock] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editWine, setEditWine] = useState<WineType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WineType | null>(null);
  const [activeSavedFilter, setActiveSavedFilter] = useState<string | null>(null);

  // Derive dynamic filter options from wine data
  const dynamicOptions = useMemo(() => {
    if (!wines) return { countries: [], grapes: [], vintages: [] };
    const countries = [...new Set(wines.map(w => w.country).filter(Boolean) as string[])].sort().map(v => ({ value: v, label: v }));
    const grapes = [...new Set(wines.map(w => w.grape).filter(Boolean) as string[])].sort().map(v => ({ value: v, label: v }));
    const vintages = [...new Set(wines.map(w => w.vintage).filter(Boolean) as number[])].sort((a, b) => b - a).map(v => ({ value: String(v), label: String(v) }));
    return { countries, grapes, vintages };
  }, [wines]);

  const applySavedFilter = (f: SavedFilter) => {
    setSelectedStyles(f.styles);
    setSelectedCountries(f.countries);
    setSelectedGrapes(f.grapes);
    setSelectedVintages(f.vintages);
    setSelectedDrinkWindows(f.drinkWindows);
    setLowStock(f.lowStock);
    setActiveSavedFilter(f.name);
  };

  const clearFilters = () => {
    setSelectedStyles([]);
    setSelectedCountries([]);
    setSelectedGrapes([]);
    setSelectedVintages([]);
    setSelectedDrinkWindows([]);
    setLowStock(false);
    setActiveSavedFilter(null);
    setSearch("");
  };

  const activeFilterCount = selectedStyles.length + selectedCountries.length + selectedGrapes.length + selectedVintages.length + selectedDrinkWindows.length + (lowStock ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || !!search;

  const filtered = useMemo(() => {
    if (!wines) return [];
    let list = wines.filter(w => w.quantity > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        w.name.toLowerCase().includes(q) || w.producer?.toLowerCase().includes(q) ||
        w.grape?.toLowerCase().includes(q) || w.country?.toLowerCase().includes(q) ||
        w.region?.toLowerCase().includes(q) || w.cellar_location?.toLowerCase().includes(q) ||
        (w.vintage && String(w.vintage).includes(q))
      );
    }
    if (selectedStyles.length > 0) list = list.filter(w => w.style && selectedStyles.includes(w.style));
    if (selectedCountries.length > 0) list = list.filter(w => w.country && selectedCountries.includes(w.country));
    if (selectedGrapes.length > 0) list = list.filter(w => w.grape && selectedGrapes.includes(w.grape));
    if (selectedVintages.length > 0) list = list.filter(w => w.vintage && selectedVintages.includes(String(w.vintage)));
    if (selectedDrinkWindows.length > 0) list = list.filter(w => {
      const s = drinkStatus(w);
      return s && selectedDrinkWindows.includes(s);
    });
    if (lowStock) list = list.filter(w => w.quantity <= 2);

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
  }, [wines, search, sortBy, selectedStyles, selectedCountries, selectedGrapes, selectedVintages, selectedDrinkWindows, lowStock]);

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

  // Build active filter summary chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  selectedStyles.forEach(s => {
    const opt = styleOptions.find(o => o.value === s);
    activeChips.push({ label: opt?.label || s, onRemove: () => setSelectedStyles(prev => prev.filter(v => v !== s)) });
  });
  selectedCountries.forEach(c => {
    activeChips.push({ label: c, onRemove: () => setSelectedCountries(prev => prev.filter(v => v !== c)) });
  });
  selectedGrapes.forEach(g => {
    activeChips.push({ label: g, onRemove: () => setSelectedGrapes(prev => prev.filter(v => v !== g)) });
  });
  selectedVintages.forEach(v => {
    activeChips.push({ label: v, onRemove: () => setSelectedVintages(prev => prev.filter(x => x !== v)) });
  });
  selectedDrinkWindows.forEach(dw => {
    const opt = drinkWindowOptions.find(o => o.value === dw);
    activeChips.push({ label: opt?.label || dw, onRemove: () => setSelectedDrinkWindows(prev => prev.filter(v => v !== dw)) });
  });
  if (lowStock) {
    activeChips.push({ label: "Baixo estoque", onRemove: () => setLowStock(false) });
  }

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>Minha Adega</h1>
          <p className="text-sm mt-0.5 text-muted-foreground">{filtered.length} vinho(s) em estoque</p>
        </div>
        <Button variant="premium" onClick={() => setAddOpen(true)} className="h-10 px-6 text-[13px] font-bold">
          <Plus className="h-4 w-4 mr-1.5" /> Adicionar vinho
        </Button>
      </div>

      {/* Search + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquise vinho, produtor, uva, safra, localização…"
            className="pl-10 h-10 text-sm rounded-[14px] bg-muted/30 border-border/40"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-[10px] overflow-hidden border border-border/40">
            <button
              onClick={() => setViewMode("grid")}
              className="h-10 w-10 flex items-center justify-center transition-colors"
              style={{ background: viewMode === "grid" ? "rgba(143,45,86,0.08)" : "transparent", color: viewMode === "grid" ? "#8F2D56" : undefined }}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="h-10 w-10 flex items-center justify-center transition-colors"
              style={{ background: viewMode === "list" ? "rgba(143,45,86,0.08)" : "transparent", color: viewMode === "list" ? "#8F2D56" : undefined }}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="h-10 px-3 text-[12px] rounded-[10px] bg-card cursor-pointer border border-border/40 text-muted-foreground"
          >
            <option value="drink">Prioridade de consumo</option>
            <option value="date">Data de entrada</option>
            <option value="name">Nome A-Z</option>
            <option value="value">Valor</option>
            <option value="qty">Quantidade</option>
          </select>
        </div>
      </div>

      {/* Multi-select filter dropdowns */}
      <div className="flex flex-wrap gap-2 items-center">
        <MultiSelectFilter
          label="Estilo"
          options={styleOptions}
          selected={selectedStyles}
          onToggle={v => { setSelectedStyles(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }}
        />
        {dynamicOptions.countries.length > 0 && (
          <MultiSelectFilter
            label="País"
            options={dynamicOptions.countries}
            selected={selectedCountries}
            onToggle={v => { setSelectedCountries(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }}
          />
        )}
        {dynamicOptions.grapes.length > 0 && (
          <MultiSelectFilter
            label="Uva"
            options={dynamicOptions.grapes}
            selected={selectedGrapes}
            onToggle={v => { setSelectedGrapes(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }}
          />
        )}
        {dynamicOptions.vintages.length > 0 && (
          <MultiSelectFilter
            label="Safra"
            options={dynamicOptions.vintages}
            selected={selectedVintages}
            onToggle={v => { setSelectedVintages(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }}
          />
        )}
        <MultiSelectFilter
          label="Janela"
          options={drinkWindowOptions}
          selected={selectedDrinkWindows}
          onToggle={v => { setSelectedDrinkWindows(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }}
        />
        <button
          onClick={() => { setLowStock(!lowStock); setActiveSavedFilter(null); }}
          className="h-8 px-3.5 rounded-full text-[11px] font-medium transition-all duration-200"
          style={{
            background: lowStock ? "#E07A5F" : "rgba(0,0,0,0.03)",
            color: lowStock ? "white" : "#6B7280",
            border: `1px solid ${lowStock ? "transparent" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          Baixo estoque
        </button>
      </div>

      {/* Active filter chips summary */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mr-1">Filtros ativos:</span>
          {activeChips.map((chip, i) => (
            <span
              key={i}
              className="h-6 px-2.5 rounded-full text-[10px] font-medium flex items-center gap-1 bg-primary/10 text-primary border border-primary/20"
            >
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-destructive transition-colors">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <button onClick={clearFilters} className="h-6 px-2.5 rounded-full text-[10px] font-medium flex items-center gap-1 text-destructive hover:bg-destructive/10 transition-colors">
            <X className="h-3 w-3" /> Limpar tudo
          </button>
        </div>
      )}

      {/* Saved Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider self-center mr-1 text-muted-foreground">Filtros salvos:</span>
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
        <motion.div
          className="glass-card p-20 text-center relative overflow-hidden group"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="w-20 h-20 rounded-[28px] gradient-wine flex items-center justify-center mx-auto mb-8 animate-float shadow-premium rotate-3 group-hover:rotate-0 transition-transform duration-700">
              <Wine className="h-10 w-10 text-white" />
            </div>

            <h2 className="text-3xl font-serif font-bold text-foreground mb-4 tracking-tight">
              Sua jornada começa aqui
            </h2>

            <p className="text-base text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed font-medium">
              {hasActiveFilters
                ? "Não encontramos vinhos com esses critérios. Tente simplificar seus filtros para descobrir novos rótulos."
                : "Sua adega digital ainda está vazia. Comece a catalogar sua coleção e tenha o controle total do seu acervo na palma da mão."}
            </p>

            {!hasActiveFilters ? (
              <Button
                variant="premium"
                onClick={() => setAddOpen(true)}
                className="h-14 px-10 text-sm font-black uppercase tracking-widest rounded-2xl shadow-float active:scale-95 transition-all"
              >
                <Plus className="h-5 w-5 mr-3" /> Catalogar meu primeiro vinho
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-12 px-8 rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-bold transition-all"
              >
                <X className="h-4 w-4 mr-2" /> Limpar todos os filtros
              </Button>
            )}
          </div>
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
                    <h3 className="text-sm font-semibold truncate text-foreground">{wine.name}</h3>
                    <p className="text-[11px] truncate text-muted-foreground">
                      {[wine.producer, wine.vintage].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {status && (
                    <Badge variant="secondary" className={`text-[10px] ml-2 shrink-0 ${statusColor[status]}`}>
                      {statusLabel[status]}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground mb-3">
                  <span className="font-semibold text-foreground">{wine.quantity} un.</span>
                  {wine.style && <span className="capitalize">{wine.style}</span>}
                  {wine.purchase_price && <span>R$ {wine.purchase_price.toFixed(0)}</span>}
                  {wine.country && <span>{wine.country}</span>}
                  {wine.cellar_location && (
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{wine.cellar_location}</span>
                  )}
                </div>
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
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-2.5 flex-1" onClick={() => setEditWine(wine)}>
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-2.5 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(wine)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 text-muted-foreground">Vinho</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 hidden sm:table-cell text-muted-foreground">Estilo</th>
                <th className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 hidden md:table-cell text-muted-foreground">Local</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-4 py-3 text-muted-foreground">Qtd</th>
                <th className="text-center text-[10px] font-semibold uppercase tracking-wider px-4 py-3 hidden md:table-cell text-muted-foreground">Status</th>
                <th className="text-right text-[10px] font-semibold uppercase tracking-wider px-4 py-3 text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wine, i) => {
                const status = drinkStatus(wine);
                return (
                  <tr key={wine.id} className="transition-colors hover:bg-muted/30 group border-b border-border/20 last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-semibold text-foreground">{wine.name}</p>
                      <p className="text-[10px] text-muted-foreground">{[wine.producer, wine.vintage, wine.country].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize bg-primary/5 text-primary">
                        {wine.style || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[10px] text-muted-foreground">{wine.cellar_location || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[12px] font-bold text-foreground">{wine.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {status ? (
                        <Badge variant="secondary" className={`text-[9px] ${statusColor[status]}`}>{statusLabel[status]}</Badge>
                      ) : <span className="text-[10px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {status === "now" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleOpen(wine)}>
                            <GlassWater className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditWine(wine)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
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
