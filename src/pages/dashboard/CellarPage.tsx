import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Wine, Plus, Pencil, Trash2, LayoutGrid, List, GlassWater, X, Bookmark, BookmarkCheck, UtensilsCrossed, MapPin } from "@/icons/lucide";
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
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";
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

function normalizeGroupValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function formatVintageLabel(vintage: number | null | undefined) {
  return vintage == null ? "Sem safra" : String(vintage);
}

function drinkStatus(w: { drink_from: number | null; drink_until: number | null }) {
  if (!w.drink_from && !w.drink_until) return null;
  if (w.drink_until && currentYear > w.drink_until) return "past";
  if (w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until) return "now";
  if (w.drink_from && currentYear < w.drink_from) return "young";
  return null;
}

const statusLabel = { now: "Beber agora", past: "Passou do ponto", young: "Em guarda" };
const statusColor = {
  now: "bg-emerald-500/8 text-emerald-600 border-emerald-500/15",
  past: "bg-amber-500/8 text-amber-600 border-amber-500/15",
  young: "bg-sky-500/8 text-sky-600 border-sky-500/15",
};

function getWineTone(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return "bg-[#7B1E3A]";
  if (s.includes("branco")) return "bg-[#DDBD74]";
  if (s.includes("rose")) return "bg-[#C97A93]";
  if (s.includes("espum")) return "bg-[#B8A06A]";
  return "bg-[#8F2D56]";
}

function getStyleBadgeClass(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return "bg-[#7B1E3A]/6 text-[#7B1E3A]/80 border-[#7B1E3A]/12";
  if (s.includes("branco")) return "bg-[#DDBD74]/10 text-[#836329]/80 border-[#DDBD74]/20";
  if (s.includes("rose")) return "bg-[#C97A93]/8 text-[#93435F]/80 border-[#C97A93]/15";
  if (s.includes("espum")) return "bg-[#C6A768]/10 text-[#8B6A2D]/80 border-[#C6A768]/18";
  return "bg-primary/5 text-primary/70 border-primary/12";
}

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

type CellarWineGroup = WineType & {
  groupKey: string;
  entries: WineType[];
  totalQuantity: number;
  displayPurchasePrice: number | null;
  distinctPriceCount: number;
};

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
  const [selectedVintages, setSelectedVintages] = useState<string[]>([]);
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
  const [consumptionWine, setConsumptionWine] = useState<WineType | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const isMobile = useIsSmallScreen();

  // Derive dynamic filter options from wine data
  const dynamicOptions = useMemo(() => {
    if (!wines) return { countries: [], grapes: [], styles: [], vintages: [], maxPrice: 5000, minVintage: 1980, maxVintage: currentYear };
    
    // Count wines per country
    const countryMap: Record<string, number> = {};
    wines.forEach(w => { if (w.country) countryMap[w.country] = (countryMap[w.country] || 0) + w.quantity; });
    const countries = Object.entries(countryMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ value: v, label: v, count: c }));
    
    // Count wines per grape
    const grapeMap: Record<string, number> = {};
    wines.forEach(w => { if (w.grape) grapeMap[w.grape] = (grapeMap[w.grape] || 0) + w.quantity; });
    const grapes = Object.entries(grapeMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ value: v, label: v, count: c }));
    
    // Count wines per style
    const styleMap: Record<string, number> = {};
    wines.forEach(w => { if (w.style) styleMap[w.style] = (styleMap[w.style] || 0) + w.quantity; });
    const styles = styleOptions.map(s => ({ ...s, count: styleMap[s.value] || 0 }));
    
    // Count wines per drink window
    const dwMap: Record<string, number> = {};
    wines.forEach(w => { const s = drinkStatus(w); if (s) dwMap[s] = (dwMap[s] || 0) + w.quantity; });
    const drinkWindows = drinkWindowOptions.map(d => ({ ...d, count: dwMap[d.value] || 0 }));

    // Count wines per vintage
    const vintageMap: Record<string, number> = {};
    wines.forEach(w => { if (w.vintage) vintageMap[String(w.vintage)] = (vintageMap[String(w.vintage)] || 0) + w.quantity; });
    const vintageOptions = Object.entries(vintageMap).sort(([a], [b]) => Number(b) - Number(a)).map(([v, c]) => ({ value: v, label: v, count: c }));
    
    const prices = wines.map(w => w.purchase_price ?? 0).filter(p => p > 0);
    const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices) / 100) * 100 : 5000;
    const vintageNums = wines.map(w => w.vintage).filter(Boolean) as number[];
    const minVintage = vintageNums.length > 0 ? Math.min(...vintageNums) : 1980;
    const maxVintage = vintageNums.length > 0 ? Math.max(...vintageNums) : currentYear;
    return { countries, grapes, styles, drinkWindows, vintageOptions, maxPrice: Math.max(maxPrice, 100), minVintage: Math.min(minVintage, 1980), maxVintage: Math.max(maxVintage, currentYear) };
  }, [wines]);

  const groupedWines = useMemo<CellarWineGroup[]>(() => {
    if (!wines) return [];

    const groups = new Map<string, WineType[]>();
    wines.forEach((wine) => {
      const groupKey = [
        normalizeGroupValue(wine.name),
        normalizeGroupValue(wine.producer),
        wine.vintage == null ? "sem-safra" : String(wine.vintage),
      ].join("::");
      const current = groups.get(groupKey) ?? [];
      current.push(wine);
      groups.set(groupKey, current);
    });

    return Array.from(groups.entries()).map(([groupKey, entries]) => {
      const representative = entries[0];
      const prices = entries
        .map((entry) => entry.purchase_price ?? entry.current_value ?? null)
        .filter((price): price is number => typeof price === "number" && Number.isFinite(price));
      const distinctPriceCount = new Set(prices).size;
      const displayPurchasePrice = prices.length > 0 ? prices[0] : null;
      const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);

      return {
        ...representative,
        quantity: totalQuantity,
        groupKey,
        entries,
        totalQuantity,
        displayPurchasePrice,
        distinctPriceCount,
      };
    });
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
    setSelectedVintages([]);
    setSelectedDrinkWindows([]);
    setLowStock(false);
    setVintageRange([dynamicOptions.minVintage, dynamicOptions.maxVintage]);
    setPriceRange([0, dynamicOptions.maxPrice]);
    setActiveSavedFilter(null);
    setSearch("");
  };

  const vintageActive = vintageRange[0] !== dynamicOptions.minVintage || vintageRange[1] !== dynamicOptions.maxVintage;
  const priceActive = priceRange[0] !== 0 || priceRange[1] !== dynamicOptions.maxPrice;
  const activeFilterCount = selectedStyles.length + selectedCountries.length + selectedGrapes.length + selectedVintages.length + selectedDrinkWindows.length + (lowStock ? 1 : 0) + (vintageActive ? 1 : 0) + (priceActive ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || !!search;

  const filtered = useMemo(() => {
    let list = groupedWines.filter(w => w.quantity > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        w.name.toLowerCase().includes(q) || w.producer?.toLowerCase().includes(q) ||
        w.grape?.toLowerCase().includes(q) || w.country?.toLowerCase().includes(q) ||
        w.region?.toLowerCase().includes(q) || w.cellar_location?.toLowerCase().includes(q) ||
        (w.vintage && String(w.vintage).includes(q)) ||
        w.entries.some((entry) =>
          entry.name.toLowerCase().includes(q) ||
          entry.producer?.toLowerCase().includes(q) ||
          entry.cellar_location?.toLowerCase().includes(q)
        )
      );
    }
    if (selectedStyles.length > 0) list = list.filter(w => w.style && selectedStyles.includes(w.style));
    if (selectedCountries.length > 0) list = list.filter(w => w.country && selectedCountries.includes(w.country));
    if (selectedGrapes.length > 0) list = list.filter(w => w.grape && selectedGrapes.includes(w.grape));
    if (selectedVintages.length > 0) list = list.filter(w => w.vintage && selectedVintages.includes(String(w.vintage)));
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
      if (sortBy === "drinkNow") {
        const aNow = drinkStatus(a) === "now" ? 1 : 0;
        const bNow = drinkStatus(b) === "now" ? 1 : 0;
        return bNow - aNow || a.name.localeCompare(b.name);
      }
      if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "expensive") return (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0);
      if (sortBy === "lowStock") return a.quantity - b.quantity;
      if (sortBy === "value") return (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0);
      if (sortBy === "qty") return b.quantity - a.quantity;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [groupedWines, search, sortBy, selectedStyles, selectedCountries, selectedGrapes, selectedVintages, vintageRange, priceRange, selectedDrinkWindows, lowStock, vintageActive, priceActive]);

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
    activeChips.push({ label: `Safra ${v}`, onRemove: () => setSelectedVintages(prev => prev.filter(x => x !== v)) });
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

  const visibleBottleCount = filtered.reduce((sum, wine) => sum + wine.quantity, 0);

  return (
    <div className="space-y-4 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Minha Adega</h1>
          <p className="text-sm text-muted-foreground font-medium">
            {filtered.length} rótulo{filtered.length !== 1 ? "s" : ""} · {visibleBottleCount} garrafa{visibleBottleCount !== 1 ? "s" : ""} em estoque
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)} className="h-9 px-5 text-xs font-bold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar vinho
        </Button>
      </div>

      {/* Search + Actions */}
      <div className="flex flex-col gap-2.5">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquise vinho, produtor, uva, safra…"
            className="pl-9 h-10 text-[13px] font-medium rounded-xl bg-background/60 backdrop-blur-md border-border/40 shadow-sm focus:ring-primary/10 focus:border-primary/20 transition-all w-full"
          />
        </div>

        {/* Bottom Row: Filters & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <MultiSelectDropdown title="Estilo" options={dynamicOptions.styles || styleOptions} selected={selectedStyles} onChange={(v) => { setSelectedStyles(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedStyles([]); setActiveSavedFilter(null); }} />
            <MultiSelectDropdown title="País" options={dynamicOptions.countries} selected={selectedCountries} onChange={(v) => { setSelectedCountries(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedCountries([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar país..." />
            <MultiSelectDropdown title="Uva" options={dynamicOptions.grapes} selected={selectedGrapes} onChange={(v) => { setSelectedGrapes(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedGrapes([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar uva..." />
            <MultiSelectDropdown title="Safra" options={dynamicOptions.vintageOptions || []} selected={selectedVintages} onChange={(v) => { setSelectedVintages(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedVintages([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar safra..." />
            <MultiSelectDropdown title="Janela" options={dynamicOptions.drinkWindows || drinkWindowOptions} selected={selectedDrinkWindows} onChange={(v) => { setSelectedDrinkWindows(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedDrinkWindows([]); setActiveSavedFilter(null); }} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setLowStock(!lowStock); setActiveSavedFilter(null); }}
              className={cn(
                "h-9 px-3 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 border",
                lowStock
                  ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/12"
                  : "bg-card/80 hover:bg-card border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              Baixo estoque
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex rounded-lg p-[2px] bg-muted/30 border border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={cn("h-8 w-8 rounded-md", viewMode === "grid" ? "bg-background shadow-sm text-primary hover:bg-background" : "text-muted-foreground")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={cn("h-8 w-8 rounded-md", viewMode === "list" ? "bg-background shadow-sm text-primary hover:bg-background" : "text-muted-foreground")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
              <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-9 px-3 pr-8 text-xs font-semibold rounded-lg bg-card cursor-pointer border border-border/40 text-foreground"
            >
              <option value="drink">Prioridade</option>
              <option value="drinkNow">Beber agora</option>
              <option value="expensive">Mais caros</option>
              <option value="lowStock">Menos estoque</option>
              <option value="date">Recentes</option>
              <option value="name">Nome A-Z</option>
              <option value="value">Valor</option>
              <option value="qty">Quantidade</option>
            </select>
          </div>
        </div>
      </div>

      {/* Range Sliders & Saved Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="glass-card p-3">
          <RangeSliderFilter label="Safra" min={dynamicOptions.minVintage} max={dynamicOptions.maxVintage} step={1} value={vintageRange} onChange={v => { setVintageRange(v); setActiveSavedFilter(null); }} />
        </div>
        <div className="glass-card p-3">
          <RangeSliderFilter label="Preço" min={0} max={dynamicOptions.maxPrice} step={10} value={priceRange} onChange={v => { setPriceRange(v); setActiveSavedFilter(null); }} formatValue={v => `R$ ${v}`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Filtros salvos:</span>
        {defaultSavedFilters.map(f => (
          <Button
            key={f.name}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applySavedFilter(f)}
            className={cn(
              "h-8 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border",
              activeSavedFilter === f.name
                ? "bg-primary/10 text-primary border-primary/25 hover:bg-primary/12"
                : "bg-black/[0.02] text-foreground/80 border-black/[0.06] hover:bg-muted/40",
            )}
          >
            {activeSavedFilter === f.name ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            {f.name}
          </Button>
        ))}
      </div>

      {/* Active filter chips summary */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Filtros ativos:</span>
          {activeChips.map((chip, i) => (
            <Badge key={i} variant="secondary" className="pl-2.5 pr-1.5 h-8 text-xs rounded-lg group border-primary/10 bg-primary/5 text-primary font-semibold">
              {chip.label}
              <X className="ml-1.5 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={chip.onRemove} />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10 ml-1">
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
          title="Sua coleção começa aqui"
          description={hasActiveFilters
            ? "Não encontramos vinhos com esses critérios. Tente simplificar seus filtros para explorar novos rótulos."
            : "Cada garrafa conta uma história. Comece a catalogar seu acervo e tenha controle total da sua adega na palma da mão."}
          primaryAction={!hasActiveFilters ? {
            label: "Adicionar primeiro vinho",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setAddOpen(true)
          } : undefined}
          secondaryAction={hasActiveFilters ? {
            label: "Limpar todos os filtros",
            onClick: clearFilters
          } : undefined}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((wine, i) => {
            const status = drinkStatus(wine);
            const isExpanded = !!expandedGroups[wine.groupKey];
            const hasGroupDetails = wine.entries.length > 1;
            const hasPriceVariance = wine.distinctPriceCount > 1;
            return (
              <motion.div
                key={wine.id}
                className="group relative overflow-hidden rounded-2xl border border-border/25 bg-card/60 px-4 py-3.5 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:shadow-[0_12px_32px_-12px_rgba(25,18,22,0.10)] hover:border-border/40"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* ── Top: Name + Vintage + Region ── */}
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-background/50 p-1.5">
                    <div className={cn("h-full w-full rounded-[5px]", getWineTone(wine.style))} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-[13.5px] font-serif font-semibold leading-snug text-foreground tracking-[-0.01em]">
                      {wine.name}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground/70">
                      <span className="font-medium">{formatVintageLabel(wine.vintage)}</span>
                      <span className="text-muted-foreground/25">·</span>
                      <span className="truncate">{wine.region || wine.country || "Região n/i"}</span>
                    </p>
                  </div>
                </div>

                {/* ── Middle: Status badges ── */}
                {(status || wine.style) && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {status && (
                      <span className={cn("inline-flex items-center h-[21px] rounded-full border px-2.5 text-[10px] font-medium tracking-[-0.01em]", statusColor[status])}>
                        {statusLabel[status]}
                      </span>
                    )}
                    {wine.style && (
                      <span className={cn("inline-flex items-center h-[21px] rounded-full border px-2.5 text-[10px] font-medium capitalize tracking-[-0.01em]", getStyleBadgeClass(wine.style))}>
                        {wine.style}
                      </span>
                    )}
                    {wine.country && (
                      <span className="inline-flex items-center h-[21px] rounded-full border border-border/20 bg-muted/5 px-2.5 text-[10px] font-medium text-muted-foreground/60">
                        {wine.country}
                      </span>
                    )}
                  </div>
                )}

                {/* ── Bottom: Price + Quantity ── */}
                <div className="mb-3 flex items-baseline justify-between px-0.5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground/45 mb-0.5">Preço</p>
                    <p className="text-[15px] font-semibold leading-none text-foreground tracking-[-0.02em]">
                      {wine.displayPurchasePrice != null ? `R$ ${wine.displayPurchasePrice.toFixed(0)}` : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground/45 mb-0.5">Qtd</p>
                    <p className="text-[15px] font-semibold leading-none text-foreground tracking-[-0.02em]">{wine.quantity}</p>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="flex items-center gap-1.5 pt-2.5 border-t border-border/15">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 flex-1 rounded-lg text-[10.5px] font-medium text-muted-foreground/70 hover:text-foreground hover:bg-muted/10"
                    onClick={() => setConsumptionWine(wine)}
                  >
                    <UtensilsCrossed className="mr-1.5 h-3 w-3" /> Consumo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 rounded-lg p-0 text-muted-foreground/40 hover:text-foreground/70"
                    onClick={() => setEditWine(wine)}
                    title="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 rounded-lg p-0 text-muted-foreground/30 hover:text-destructive/70"
                    onClick={() => setDeleteTarget(wine)}
                    title="Remover"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {hasGroupDetails && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedGroups((prev) => ({ ...prev, [wine.groupKey]: !prev[wine.groupKey] }))}
                      className="inline-flex items-center gap-1 rounded-full border border-border/15 bg-background/40 px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground/60 transition-all duration-200 hover:border-primary/15 hover:text-primary/70"
                    >
                      {isExpanded ? "Ocultar" : `${wine.entries.length} registros`}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-1 rounded-xl border border-border/15 bg-background/30 p-2">
                        {wine.entries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/50 px-2.5 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-medium text-foreground/80">
                                {entry.cellar_location || "Sem localização"}
                              </p>
                              <p className="text-[9px] text-muted-foreground/50">
                                {formatVintageLabel(entry.vintage)} · {entry.quantity} gf
                              </p>
                            </div>
                            <span className="text-[10px] font-medium text-primary/70">
                              {entry.purchase_price != null ? `R$ ${entry.purchase_price.toFixed(0)}` : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left text-[9px] font-semibold uppercase tracking-wider px-3 py-2 text-muted-foreground">Vinho</th>
                <th className="text-left text-[9px] font-semibold uppercase tracking-wider px-3 py-2 hidden sm:table-cell text-muted-foreground">Estilo</th>
                <th className="text-right text-[9px] font-semibold uppercase tracking-wider px-3 py-2 hidden md:table-cell text-muted-foreground">Preço</th>
                <th className="text-center text-[9px] font-semibold uppercase tracking-wider px-3 py-2 text-muted-foreground">Qtd</th>
                <th className="text-center text-[9px] font-semibold uppercase tracking-wider px-3 py-2 hidden md:table-cell text-muted-foreground">Status</th>
                <th className="text-right text-[9px] font-semibold uppercase tracking-wider px-3 py-2 text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wine) => {
                const status = drinkStatus(wine);
                return (
                  <tr key={wine.id} className="transition-colors hover:bg-muted/20 border-b border-border/15 last:border-0">
                    <td className="px-3 py-2">
                      <p className="text-[11px] font-bold text-foreground truncate max-w-[200px]">{wine.name}</p>
                      <p className="text-[9px] text-muted-foreground">{[wine.producer, formatVintageLabel(wine.vintage), wine.country].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded capitalize bg-primary/5 text-primary">{wine.style || "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-right hidden md:table-cell">
                      <span className="text-[10px] font-semibold text-muted-foreground">{wine.displayPurchasePrice != null ? `R$ ${wine.displayPurchasePrice.toFixed(0)}` : "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[11px] font-bold text-foreground">{wine.quantity}</span>
                    </td>
                    <td className="px-3 py-2 text-center hidden md:table-cell">
                      {status ? (
                        <Badge variant="secondary" className={`text-[8px] h-4 px-1.5 ${statusColor[status]}`}>{statusLabel[status]}</Badge>
                      ) : <span className="text-[9px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-0.5 justify-end">
                        <Button size="sm" variant="secondary" className="h-6 w-6 p-0" title="Registrar consumo" onClick={() => setConsumptionWine(wine)}>
                          <UtensilsCrossed className="h-3 w-3" />
                        </Button>
                        {status === "now" && (
                          <Button size="sm" variant="secondary" className="h-6 w-6 p-0" title="Abrir garrafa" onClick={() => handleOpen(wine)}>
                            <GlassWater className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Editar" onClick={() => setEditWine(wine)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button size="sm" variant="danger" className="h-6 w-6 p-0" title="Remover" onClick={() => setDeleteTarget(wine)}>
                          <Trash2 className="h-3 w-3" />
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
      <AddConsumptionDialog
        open={!!consumptionWine}
        onOpenChange={v => { if (!v) setConsumptionWine(null); }}
        preSelectedWine={consumptionWine}
      />

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
