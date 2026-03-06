import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Wine, Plus, Pencil, Trash2, LayoutGrid, List, GlassWater, MapPin, X, Bookmark, BookmarkCheck, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RangeSliderFilter } from "@/components/RangeSliderFilter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import { useWines, useDeleteWine, useWineEvent, type Wine as WineType } from "@/hooks/useWines";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { EditWineDialog } from "@/components/EditWineDialog";
import { useToast } from "@/hooks/use-toast";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { cn } from "@/lib/utils";
const MOBILE_BREAKPOINT = 640;
function useIsSmallScreen() {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const check = () => setSmall(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return small;
}

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
  drinkWindows: string[];
  lowStock: boolean;
}

const defaultSavedFilters: SavedFilter[] = [
  { name: "Tintos para beber agora", styles: ["tinto"], countries: [], grapes: [], drinkWindows: ["now"], lowStock: false },
  { name: "Espumantes", styles: ["espumante"], countries: [], grapes: [], drinkWindows: [], lowStock: false },
  { name: "Baixo estoque", styles: [], countries: [], grapes: [], drinkWindows: [], lowStock: true },
];

// Filter components are now using MultiSelectDropdown

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
  const [selectedDrinkWindows, setSelectedDrinkWindows] = useState<string[]>([]);
  const [lowStock, setLowStock] = useState(false);
  const [vintageRange, setVintageRange] = useState<[number, number]>([1980, currentYear]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editWine, setEditWine] = useState<WineType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WineType | null>(null);
  const [activeSavedFilter, setActiveSavedFilter] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsSmallScreen();

  // Derive dynamic filter options from wine data
  const dynamicOptions = useMemo(() => {
    if (!wines) return { countries: [], grapes: [], maxPrice: 5000, minVintage: 1980, maxVintage: currentYear };
    const countries = [...new Set(wines.map(w => w.country).filter(Boolean) as string[])].sort().map(v => ({ value: v, label: v }));
    const grapes = [...new Set(wines.map(w => w.grape).filter(Boolean) as string[])].sort().map(v => ({ value: v, label: v }));
    const prices = wines.map(w => w.purchase_price ?? 0).filter(p => p > 0);
    const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices) / 100) * 100 : 5000;
    const vintages = wines.map(w => w.vintage).filter(Boolean) as number[];
    const minVintage = vintages.length > 0 ? Math.min(...vintages) : 1980;
    const maxVintage = vintages.length > 0 ? Math.max(...vintages) : currentYear;
    return { countries, grapes, maxPrice: Math.max(maxPrice, 100), minVintage: Math.min(minVintage, 1980), maxVintage: Math.max(maxVintage, currentYear) };
  }, [wines]);

  const applySavedFilter = (f: SavedFilter) => {
    setSelectedStyles(f.styles);
    setSelectedCountries(f.countries);
    setSelectedGrapes(f.grapes);
    setSelectedDrinkWindows(f.drinkWindows);
    setLowStock(f.lowStock);
    setActiveSavedFilter(f.name);
  };

  const clearFilters = () => {
    setSelectedStyles([]);
    setSelectedCountries([]);
    setSelectedGrapes([]);
    setSelectedDrinkWindows([]);
    setLowStock(false);
    setVintageRange([dynamicOptions.minVintage, dynamicOptions.maxVintage]);
    setPriceRange([0, dynamicOptions.maxPrice]);
    setActiveSavedFilter(null);
    setSearch("");
  };

  const vintageActive = vintageRange[0] !== dynamicOptions.minVintage || vintageRange[1] !== dynamicOptions.maxVintage;
  const priceActive = priceRange[0] !== 0 || priceRange[1] !== dynamicOptions.maxPrice;
  const activeFilterCount = selectedStyles.length + selectedCountries.length + selectedGrapes.length + selectedDrinkWindows.length + (lowStock ? 1 : 0) + (vintageActive ? 1 : 0) + (priceActive ? 1 : 0);
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
    if (vintageActive) list = list.filter(w => w.vintage && w.vintage >= vintageRange[0] && w.vintage <= vintageRange[1]);
    if (priceActive) list = list.filter(w => {
      const price = w.purchase_price ?? 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });
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
  }, [wines, search, sortBy, selectedStyles, selectedCountries, selectedGrapes, vintageRange, priceRange, selectedDrinkWindows, lowStock, vintageActive, priceActive]);

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
  if (vintageActive) {
    activeChips.push({ label: `Safra ${vintageRange[0]}–${vintageRange[1]}`, onRemove: () => setVintageRange([dynamicOptions.minVintage, dynamicOptions.maxVintage]) });
  }
  if (priceActive) {
    activeChips.push({ label: `R$ ${priceRange[0]}–${priceRange[1]}`, onRemove: () => setPriceRange([0, dynamicOptions.maxPrice]) });
  }
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
        <MagneticButton>
          <Button variant="premium" onClick={() => setAddOpen(true)} className="h-10 px-6 text-[13px] font-bold">
            <Plus className="h-4 w-4 mr-1.5" /> Adicionar vinho
          </Button>
        </MagneticButton>
      </div>

      {/* Search + Actions */}
      <div className="flex flex-col gap-3">
        {/* Top Row: Search */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquise vinho, produtor, uva, safra, localização…"
            className="pl-10 h-11 text-sm rounded-[14px] bg-muted/30 border-border/40 w-full"
          />
        </div>

        {/* Bottom Row: Filters & Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <MultiSelectDropdown title="Estilo" options={styleOptions} selected={selectedStyles} onChange={(v) => { setSelectedStyles(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedStyles([]); setActiveSavedFilter(null); }} />
            <MultiSelectDropdown title="País" options={dynamicOptions.countries} selected={selectedCountries} onChange={(v) => { setSelectedCountries(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedCountries([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar país..." />
            <MultiSelectDropdown title="Uva" options={dynamicOptions.grapes} selected={selectedGrapes} onChange={(v) => { setSelectedGrapes(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedGrapes([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar uva..." />
            <MultiSelectDropdown title="Janela" options={drinkWindowOptions} selected={selectedDrinkWindows} onChange={(v) => { setSelectedDrinkWindows(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedDrinkWindows([]); setActiveSavedFilter(null); }} />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex rounded-[12px] p-[2px] bg-muted/30 border border-border/40">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("h-9 w-9 rounded-[10px] flex items-center justify-center transition-colors", viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("h-9 w-9 rounded-[10px] flex items-center justify-center transition-colors", viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-10 px-3 pr-8 text-[13px] font-medium rounded-[12px] bg-card cursor-pointer border border-border/40 text-foreground"
            >
              <option value="drink">Prioridade de consumo</option>
              <option value="date">Data de entrada</option>
              <option value="name">Nome A-Z</option>
              <option value="value">Valor</option>
              <option value="qty">Quantidade</option>
            </select>
          </div>
        </div>
      </div>

      {/* Range Sliders & Saved Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <RangeSliderFilter
            label="Safra"
            min={dynamicOptions.minVintage}
            max={dynamicOptions.maxVintage}
            step={1}
            value={vintageRange}
            onChange={v => { setVintageRange(v); setActiveSavedFilter(null); }}
          />
        </div>
        <div className="glass-card p-4">
          <RangeSliderFilter
            label="Preço"
            min={0}
            max={dynamicOptions.maxPrice}
            step={10}
            value={priceRange}
            onChange={v => { setPriceRange(v); setActiveSavedFilter(null); }}
            formatValue={v => `R$ ${v}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">Filtros salvos:</span>
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

      {/* Active filter chips summary */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center pt-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mr-1">Filtros ativos:</span>
          {activeChips.map((chip, i) => (
            <Badge key={i} variant="secondary" className="pl-2 pr-1 h-7 text-[11px] rounded-lg group border-primary/10 bg-primary/5 text-primary">
              {chip.label}
              <X className="ml-1.5 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={chip.onRemove} />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-[11px] font-bold text-destructive hover:bg-destructive/10 ml-1">
            Limpar tudo
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <PremiumEmptyState
          icon={Wine}
          title="Sua jornada começa aqui"
          description={hasActiveFilters
            ? "Não encontramos vinhos com esses critérios. Tente simplificar seus filtros para descobrir novos rótulos."
            : "Sua adega digital ainda está vazia. Comece a catalogar sua coleção e tenha o controle total do seu acervo na palma da mão."}
          primaryAction={!hasActiveFilters ? {
            label: "Catalogar meu primeiro vinho",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setAddOpen(true)
          } : undefined}
          secondaryAction={hasActiveFilters ? {
            label: "Limpar todos os filtros",
            onClick: clearFilters
          } : undefined}
        />
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
