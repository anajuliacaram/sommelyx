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

const statusLabel = { now: "Beber agora", past: "Beber em breve", young: "Em guarda" };
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

function WineImageThumb({
  src,
  alt,
  toneClassName,
  compact = false,
}: {
  src: string | null | undefined;
  alt: string;
  toneClassName: string;
  compact?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const wrapperClassName = compact
    ? "relative aspect-square overflow-hidden rounded-lg border border-border/20 bg-muted/20"
    : "relative aspect-[3/2] overflow-hidden rounded-lg border border-border/20 bg-muted/20";

  return (
    <div className={wrapperClassName}>
      {src && !failed ? (
        <>
          {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/8 to-transparent" />
        </>
      ) : (
        <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden", toneClassName)}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
          <div className="relative flex flex-col items-center gap-1 px-2 text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/16 text-white/90 backdrop-blur-sm">
              <Wine className="h-3.5 w-3.5" />
            </div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/80">
              Sem imagem
            </p>
          </div>
        </div>
      )}
    </div>
  );
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
  { value: "now", label: "Pronto para beber" },
  { value: "young", label: "Pode estar muito jovem" },
  { value: "past", label: "Pode ter passado do pico" },
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
    
    // Count wines per grape (deduplicate case-insensitive, normalize to Title Case)
    const grapeMap: Record<string, { canonical: string; count: number }> = {};
    let noGrapeCount = 0;
    wines.forEach(w => {
      if (w.grape) {
        const key = w.grape.trim().toLowerCase();
        if (!grapeMap[key]) {
          const canonical = w.grape.trim().replace(/\b\w/g, c => c.toUpperCase());
          grapeMap[key] = { canonical, count: 0 };
        }
        grapeMap[key].count += w.quantity;
      } else {
        noGrapeCount += w.quantity;
      }
    });
    const grapes = [
      ...(noGrapeCount > 0 ? [{ value: "blend", label: "Blend", count: noGrapeCount }] : []),
      ...Object.values(grapeMap).sort((a, b) => a.canonical.localeCompare(b.canonical)).map(({ canonical, count }) => ({ value: canonical, label: canonical, count })),
    ];
    
    // Count wines per style
    const styleMap: Record<string, number> = {};
    wines.forEach(w => { if (w.style) styleMap[w.style] = (styleMap[w.style] || 0) + w.quantity; });
    const styles = styleOptions.map(s => ({ ...s, count: styleMap[s.value] || 0 }));
    
    // Count wines per drink window
    const dwMap: Record<string, number> = {};
    wines.forEach(w => { const s = drinkStatus(w); if (s) dwMap[s] = (dwMap[s] || 0) + w.quantity; });
    const drinkWindows = drinkWindowOptions.map(d => ({ ...d, count: dwMap[d.value] || 0 }));

    // Count wines per vintage (include "Sem safra")
    const vintageMap: Record<string, number> = {};
    let noVintageCount = 0;
    wines.forEach(w => {
      if (w.vintage) {
        vintageMap[String(w.vintage)] = (vintageMap[String(w.vintage)] || 0) + w.quantity;
      } else {
        noVintageCount += w.quantity;
      }
    });
    const vintageOptions = [
      ...(noVintageCount > 0 ? [{ value: "sem-safra", label: "Sem safra", count: noVintageCount }] : []),
      ...Object.entries(vintageMap).sort(([a], [b]) => Number(b) - Number(a)).map(([v, c]) => ({ value: v, label: v, count: c })),
    ];
    
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
    if (selectedGrapes.length > 0) list = list.filter(w => {
      if (selectedGrapes.includes("blend") && !w.grape) return true;
      return w.grape && selectedGrapes.some(g => g.toLowerCase() === w.grape!.trim().toLowerCase());
    });
    if (selectedVintages.length > 0) list = list.filter(w => {
      if (selectedVintages.includes("sem-safra") && !w.vintage) return true;
      return w.vintage && selectedVintages.includes(String(w.vintage));
    });
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
      <div className="section-surface section-surface--full rounded-[24px] px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground tracking-tight">Minha Adega</h1>
          <p className="text-sm text-foreground/68 font-medium">
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
            className="pl-9 h-10 text-[13px] font-medium rounded-xl border-border/40 shadow-sm focus:ring-primary/10 focus:border-primary/20 transition-all w-full"
            style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1">
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
                   "h-[28px] px-3 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all duration-200",
                   lowStock
                     ? "bg-[hsl(var(--wine))] text-white border-[hsl(var(--wine))] shadow-md hover:shadow-lg hover:brightness-110"
                     : "bg-white text-foreground/80 border-border/60 shadow-sm hover:bg-[hsl(var(--cream))] hover:border-border hover:text-foreground"
                 )}
              >
                Baixo estoque
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex rounded-full p-[2px] bg-white border border-border/50 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={cn("h-7 w-7 rounded-full transition-all duration-150", viewMode === "grid" ? "bg-[hsl(var(--wine))] text-white shadow-sm hover:bg-[hsl(var(--wine))]" : "text-foreground/50 hover:text-foreground/80")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  className={cn("h-7 w-7 rounded-full transition-all duration-150", viewMode === "list" ? "bg-[hsl(var(--wine))] text-white shadow-sm hover:bg-[hsl(var(--wine))]" : "text-foreground/50 hover:text-foreground/80")}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-[30px] px-3 pr-7 text-[11px] font-bold rounded-full bg-white cursor-pointer border border-border/60 text-foreground/80 shadow-sm hover:bg-[hsl(var(--cream))] hover:border-border transition-all duration-200"
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

          {/* Compact Range Sliders — single row */}
          <div className="grid grid-cols-2 gap-2">
             <div className="rounded-xl px-3 py-1.5" style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.40)", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
               <RangeSliderFilter label="Safra" min={dynamicOptions.minVintage} max={dynamicOptions.maxVintage} step={1} value={vintageRange} onChange={v => { setVintageRange(v); setActiveSavedFilter(null); }} />
             </div>
             <div className="rounded-xl px-3 py-1.5" style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.40)", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
               <RangeSliderFilter label="Preço" min={0} max={dynamicOptions.maxPrice} step={10} value={priceRange} onChange={v => { setPriceRange(v); setActiveSavedFilter(null); }} formatValue={v => `R$ ${v}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-3 flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 mr-0.5">Filtros salvos:</span>
        {defaultSavedFilters.map(f => (
          <Button
            key={f.name}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applySavedFilter(f)}
            className={cn(
              "h-[28px] px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all duration-200",
              activeSavedFilter === f.name
                ? "bg-[hsl(var(--wine))] text-white border-[hsl(var(--wine))] shadow-md"
                : "bg-white/90 text-foreground/70 border-border/50 shadow-sm hover:bg-white hover:border-border hover:text-foreground",
            )}
          >
            {activeSavedFilter === f.name ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3 opacity-40" />}
            {f.name}
          </Button>
        ))}
      </div>

      {/* Active filter chips summary */}
      {activeChips.length > 0 && (
        <div className="glass-card p-3 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 mr-1">Filtros ativos:</span>
          {activeChips.map((chip, i) => (
            <Badge key={i} variant="secondary" className="pl-3 pr-2 h-[28px] text-[11px] rounded-full group border-[hsl(var(--wine)/0.25)] bg-[hsl(var(--wine)/0.12)] text-[hsl(var(--wine))] font-bold shadow-sm">
              {chip.label}
              <X className="ml-1.5 h-3 w-3 cursor-pointer opacity-40 hover:opacity-100 transition-opacity duration-150" onClick={chip.onRemove} />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs font-bold text-destructive hover:bg-destructive/10 ml-1">
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
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((wine, i) => {
            const status = drinkStatus(wine);
            const isExpanded = !!expandedGroups[wine.groupKey];
            const hasGroupDetails = wine.entries.length > 1;
            const hasPriceVariance = wine.distinctPriceCount > 1;
            const coverImageUrl = wine.image_url ?? wine.entries.find((entry) => entry.image_url)?.image_url ?? null;
            return (
              <motion.div
                key={wine.id}
                className="group relative flex flex-col overflow-hidden wine-card-glass px-2 py-1.5 transition-all duration-300"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <WineImageThumb src={coverImageUrl} alt={wine.name} toneClassName={getWineTone(wine.style)} />

                {/* ── Top: Name + Vintage + Region ── */}
                <div className="mt-1.5 flex items-start gap-1.5 mb-1">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-[11.5px] font-serif font-bold leading-snug text-foreground tracking-[-0.01em]">
                      {wine.name}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="font-semibold">{formatVintageLabel(wine.vintage)}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="truncate font-medium">{wine.region || wine.country || "Região n/i"}</span>
                    </p>
                  </div>
                </div>

                {/* ── Middle: Status badges ── */}
                {(status || wine.style) && (
                <div className="mb-1 flex flex-wrap items-center gap-1">
                    {status && (
                      <span className={cn("inline-flex items-center h-[18px] rounded-full border px-2 text-[9px] font-semibold tracking-[-0.01em]", statusColor[status])}>
                        {statusLabel[status]}
                      </span>
                    )}
                    {wine.style && (
                      <span className={cn("inline-flex items-center h-[18px] rounded-full border px-2 text-[9px] font-semibold capitalize tracking-[-0.01em]", getStyleBadgeClass(wine.style))}>
                        {wine.style}
                      </span>
                    )}
                    {wine.country && (
                      <span className="inline-flex items-center h-[18px] rounded-full border border-border/25 bg-muted/8 px-2 text-[9px] font-medium text-muted-foreground/70">
                        {wine.country}
                      </span>
                    )}
                  </div>
                )}

                {/* ── Bottom: Price + Quantity ── */}
                <div className="mb-1 flex items-baseline justify-between px-0.5">
                  <div>
                    <p className="text-[7px] uppercase tracking-[0.08em] text-foreground/50 mb-0.5 font-semibold">Preço</p>
                    <p className="text-[12px] font-bold leading-none text-foreground tracking-[-0.02em]">
                      {wine.displayPurchasePrice != null ? `R$ ${wine.displayPurchasePrice.toFixed(0)}` : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] uppercase tracking-[0.08em] text-foreground/50 mb-0.5 font-semibold">Qtd</p>
                    <p className="text-[12px] font-bold leading-none text-foreground/80 tracking-[-0.02em]">{wine.quantity}</p>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="flex items-center gap-0.5 pt-1 border-t border-border/20 mt-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 flex-1 rounded-md text-[9px] font-semibold text-foreground/60 hover:text-primary hover:bg-primary/[0.06] transition-all duration-200"
                    onClick={() => setConsumptionWine(wine)}
                  >
                    <UtensilsCrossed className="mr-1 h-2.5 w-2.5" /> Consumo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 rounded-md p-0 text-foreground/40 hover:text-foreground/80 hover:bg-muted/15 transition-all duration-200"
                    onClick={() => setEditWine(wine)}
                    title="Editar"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 rounded-md p-0 text-foreground/35 hover:text-destructive hover:bg-destructive/[0.06] transition-all duration-200"
                    onClick={() => setDeleteTarget(wine)}
                    title="Remover"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>

                {hasGroupDetails && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setExpandedGroups((prev) => ({ ...prev, [wine.groupKey]: !prev[wine.groupKey] }))}
                      className="inline-flex items-center gap-1 rounded-full border border-border/20 bg-background/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground/70 transition-all duration-200 hover:border-primary/20 hover:text-primary/80"
                    >
                      {isExpanded ? "Ocultar" : `${wine.entries.length} registros`}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-1 rounded-xl border border-border/20 bg-background/40 p-2">
                        {wine.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-2.5 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold text-foreground/85">
                                {entry.cellar_location || "Sem localização"}
                              </p>
                              <p className="text-[9.5px] text-muted-foreground/60 font-medium">
                                {formatVintageLabel(entry.vintage)} · {entry.quantity} gf
                              </p>
                            </div>
                            <span className="text-[10.5px] font-semibold text-primary/80">
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
                const coverImageUrl = wine.image_url ?? wine.entries.find((entry) => entry.image_url)?.image_url ?? null;
                return (
                  <tr key={wine.id} className="transition-colors hover:bg-muted/20 border-b border-border/15 last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-7 shrink-0 overflow-hidden rounded-lg border border-border/20 bg-muted/20">
                          {coverImageUrl ? (
                            <img src={coverImageUrl} alt={wine.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className={cn("h-full w-full", getWineTone(wine.style))} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-foreground truncate max-w-[200px]">{wine.name}</p>
                          <p className="text-[9px] text-muted-foreground">{[wine.producer, formatVintageLabel(wine.vintage), wine.country].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
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
