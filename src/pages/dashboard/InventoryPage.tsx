import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Filter, SlidersHorizontal, ArrowUpDown, ChevronDown,
    MoreHorizontal, Trash2, Tag, Download, Check, X,
    Package, AlertTriangle, Clock, History, Star,
    Smartphone, ChevronRight, LayoutGrid, List as ListIcon, Plus, Minus, Pencil, Loader2
} from "@/icons/lucide";
import { useWineMetrics, useDeleteWine, useWineEvent, Wine } from "@/hooks/useWines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { PremiumKpiCard } from "@/components/ui/premium-kpi-card";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AddWineDialog } from "@/components/AddWineDialog";
import { EditWineDialog } from "@/components/EditWineDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { StockAuditDialog } from "@/components/StockAuditDialog";
import { useWineLocations } from "@/hooks/useWineLocations";

// --- Types & Constants ---
type StockStatus = "all" | "in-stock" | "low" | "out" | "aging" | "drink-now";

const STYLES = ["Tinto", "Branco", "Rosé", "Espumante", "Sobremesa", "Fortificado"];

export default function InventoryPage() {
    const { wines, isLoading } = useWineMetrics();
    const deleteWine = useDeleteWine();
    const wineEvent = useWineEvent();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const { user, profileType } = useAuth();
    const isCommercial = profileType === "commercial";
    const { data: allLocations } = useWineLocations();

    // --- States ---
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [filterOpen, setFilterOpen] = useState(false);
    const [addWineOpen, setAddWineOpen] = useState(false);
    const [editWineOpen, setEditWineOpen] = useState(false);
    const [editingWine, setEditingWine] = useState<Wine | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const [stockBusyWineId, setStockBusyWineId] = useState<string | null>(null);
    const [auditOpen, setAuditOpen] = useState(false);
    const [auditPayload, setAuditPayload] = useState<{
        wineId: string;
        wineName: string;
        prevQty: number;
        nextQty: number;
        delta: number;
        eventType: "stock_increase" | "stock_decrease";
        quantityAbs: number;
        actionLabel: string;
    } | null>(null);

    // Filter Values (from URL)
    const statusFilter = (searchParams.get("status") as StockStatus) || "all";
    const styleFilters = searchParams.getAll("style");
    const countryFilters = searchParams.getAll("country");
    const regionFilters = searchParams.getAll("region");
    const sectorFilters = searchParams.getAll("sector");
    const zoneFilters = searchParams.getAll("zone");
    const levelFilters = searchParams.getAll("level");
    const grapeFilters = searchParams.getAll("grape");
    const vintageFilters = searchParams.getAll("vintage");
    const tagFilters = searchParams.getAll("tag");
    const sortKey = searchParams.get("sort") || "name";
    const sortOrder = searchParams.get("order") || "asc";

    const [vintageRange, setVintageRange] = useState<[number, number]>([
        parseInt(searchParams.get("minYear") || "1980"),
        parseInt(searchParams.get("maxYear") || new Date().getFullYear().toString())
    ]);
    const [priceRange, setPriceRange] = useState<[number, number]>([
        parseInt(searchParams.get("minPrice") || "0"),
        parseInt(searchParams.get("maxPrice") || "5000")
    ]);

    const handleSort = (key: string) => {
        const order = sortKey === key && sortOrder === "asc" ? "desc" : "asc";
        updateParam("sort", key);
        updateParam("order", order);
    };

    // Derived dynamic options
    const dynamicOptions = useMemo(() => {
        // Countries with counts
        const countryMap: Record<string, number> = {};
        wines.forEach(w => { if (w.country) countryMap[w.country] = (countryMap[w.country] || 0) + w.quantity; });
        const countries = Object.entries(countryMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ label: v, value: v, count: c }));

        // Regions with counts
        const regionMap: Record<string, number> = {};
        wines.forEach(w => { if (w.region) regionMap[w.region] = (regionMap[w.region] || 0) + w.quantity; });
        const regions = Object.entries(regionMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ label: v, value: v, count: c }));

        // Grapes with counts
        const grapeMap: Record<string, number> = {};
        wines.forEach(w => { if (w.grape) grapeMap[w.grape] = (grapeMap[w.grape] || 0) + w.quantity; });
        const grapes = Object.entries(grapeMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ label: v, value: v, count: c }));

        // Locations (counts by bottles)
        const sectorMap: Record<string, number> = {};
        const zoneMap: Record<string, number> = {};
        const levelMap: Record<string, number> = {};
        (allLocations ?? []).forEach((l) => {
          if (l.sector) sectorMap[l.sector] = (sectorMap[l.sector] || 0) + (l.quantity || 0);
          if (l.zone) zoneMap[l.zone] = (zoneMap[l.zone] || 0) + (l.quantity || 0);
          if (l.level) levelMap[l.level] = (levelMap[l.level] || 0) + (l.quantity || 0);
        });
        const sectors = Object.entries(sectorMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ label: v, value: v, count: c }));
        const zones = Object.entries(zoneMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ label: v, value: v, count: c }));
        const levels = Object.entries(levelMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ label: v, value: v, count: c }));

        // Vintages with counts
        const vintageMap: Record<string, number> = {};
        wines.forEach(w => { if (w.vintage) vintageMap[String(w.vintage)] = (vintageMap[String(w.vintage)] || 0) + w.quantity; });
        const vintages = Object.entries(vintageMap).sort(([a], [b]) => b.localeCompare(a)).map(([v, c]) => ({ label: v, value: v, count: c }));

        // Styles with counts
        const styleMap: Record<string, number> = {};
        wines.forEach(w => { if (w.style) styleMap[w.style] = (styleMap[w.style] || 0) + w.quantity; });
        const styles = STYLES.map(s => ({ label: s, value: s, count: styleMap[s] || 0 }));

        // Status counts
        const inStock = wines.filter(w => w.quantity > 0).reduce((s, w) => s + w.quantity, 0);
        const low = wines.filter(w => w.quantity > 0 && w.quantity <= 2).reduce((s, w) => s + w.quantity, 0);
        const out = wines.filter(w => w.quantity === 0).length;
        const statusOptions = [
            { label: "Em estoque", value: "in-stock", count: inStock },
            { label: "Baixo estoque", value: "low", count: low },
            { label: "Sem estoque", value: "out", count: out },
        ];

        return { countries, regions, grapes, vintages, styles, statusOptions, sectors, zones, levels };
    }, [wines, allLocations]);

    // Summary metrics
    const summary = useMemo(() => {
        return wines.reduce((acc, wine) => {
            acc.labels += 1;
            acc.bottles += wine.quantity;
            acc.totalValue += (wine.current_value || wine.purchase_price || 0) * wine.quantity;
            return acc;
        }, { labels: 0, bottles: 0, totalValue: 0 });
    }, [wines]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Update URL search param
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (debouncedSearch) params.set("q", debouncedSearch);
        else params.delete("q");
        setSearchParams(params, { replace: true });
    }, [debouncedSearch]);

    // --- Filtering Logic ---
    const filteredWines = useMemo(() => {
        return wines.filter(wine => {
            const wineLocs = (allLocations ?? []).filter((l) => l.wine_id === wine.id);
            const locText = [
              wine.cellar_location ?? "",
              ...wineLocs.map((l) => l.formatted_label ?? l.manual_label ?? ""),
            ].join(" • ").toLowerCase();

            // Text Search
            const searchMatch = !debouncedSearch ||
                wine.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                wine.producer?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                wine.region?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                wine.grape?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                wine.country?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                locText.includes(debouncedSearch.toLowerCase()) ||
                (wine.vintage && String(wine.vintage).includes(debouncedSearch.toLowerCase()));

            if (!searchMatch) return false;

            // Status Filter
            if (statusFilter === "in-stock" && wine.quantity <= 0) return false;
            if (statusFilter === "low" && (wine.quantity <= 0 || wine.quantity > 2)) return false;
            if (statusFilter === "out" && wine.quantity > 0) return false;
            if (statusFilter === "drink-now") {
                const year = new Date().getFullYear();
                if (!wine.drink_from || !wine.drink_until || year < wine.drink_from || year > wine.drink_until) return false;
            }

            // Multi-select Styles
            if (styleFilters.length > 0 && (!wine.style || !styleFilters.includes(wine.style))) return false;

            // Multi-select Countries
            if (countryFilters.length > 0 && (!wine.country || !countryFilters.includes(wine.country))) return false;

            // Multi-select Regions
            if (regionFilters.length > 0 && (!wine.region || !regionFilters.includes(wine.region))) return false;

            // Location filters (sector/zone/level)
            if (sectorFilters.length > 0) {
              if (!wineLocs.some((l) => l.sector && sectorFilters.includes(l.sector))) return false;
            }
            if (zoneFilters.length > 0) {
              if (!wineLocs.some((l) => l.zone && zoneFilters.includes(l.zone))) return false;
            }
            if (levelFilters.length > 0) {
              if (!wineLocs.some((l) => l.level && levelFilters.includes(l.level))) return false;
            }

            // Multi-select Grapes
            if (grapeFilters.length > 0 && (!wine.grape || !grapeFilters.includes(wine.grape))) return false;

            // Multi-select Vintages
            if (vintageFilters.length > 0 && (!wine.vintage || !vintageFilters.includes(String(wine.vintage)))) return false;

            // Multi-select Tags
            if (tagFilters.length > 0) {
                const wineTags = (wine as any).tags || [];
                if (!tagFilters.some(t => wineTags.includes(t))) return false;
            }

            // Range Filters
            if (wine.vintage && (wine.vintage < vintageRange[0] || wine.vintage > vintageRange[1])) return false;
            const price = wine.current_value || wine.purchase_price || 0;
            if (price < priceRange[0] || price > priceRange[1]) return false;

            return true;
        }).sort((a, b) => {
            let valA = (a as any)[sortKey];
            let valB = (b as any)[sortKey];

            if (sortKey === "price") {
                valA = a.current_value || a.purchase_price || 0;
                valB = b.current_value || b.purchase_price || 0;
            } else if (sortKey === "region") {
                valA = a.region || "";
                valB = b.region || "";
            } else if (sortKey === "vintage") {
                valA = a.vintage || 9999;
                valB = b.vintage || 9999;
            }

            if (valA === null) return 1;
            if (valB === null) return -1;

            const comparison = typeof valA === 'string'
                ? valA.localeCompare(valB)
                : (valA as number) - (valB as number);

            return sortOrder === "asc" ? comparison : -comparison;
        });
    }, [wines, allLocations, debouncedSearch, statusFilter, styleFilters, countryFilters, regionFilters, sectorFilters, zoneFilters, levelFilters, grapeFilters, vintageFilters, tagFilters, vintageRange, priceRange, sortKey, sortOrder]);

    const activeFilterCount =
      styleFilters.length +
      countryFilters.length +
      regionFilters.length +
      sectorFilters.length +
      zoneFilters.length +
      levelFilters.length +
      grapeFilters.length +
      vintageFilters.length +
      tagFilters.length +
      (statusFilter !== "all" ? 1 : 0);

    // --- Handlers ---
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredWines.length) setSelectedIds([]);
        else setSelectedIds(filteredWines.map(w => w.id));
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const updateParam = (key: string, value: string | null, multi = false) => {
        const params = new URLSearchParams(searchParams);
        if (!value) {
            params.delete(key);
        } else if (multi) {
            const existing = params.getAll(key);
            if (existing.includes(value)) {
                const filtered = existing.filter(v => v !== value);
                params.delete(key);
                filtered.forEach(v => params.append(key, v));
            } else {
                params.append(key, value);
            }
        } else {
            params.set(key, value);
        }
        setSearchParams(params, { replace: true });
    };

    const clearAllFilters = () => {
        setSearchParams(new URLSearchParams(), { replace: true });
        setSearch("");
    };

    const handleDeleteSelected = async () => {
        if (!confirm(`Deseja excluir ${selectedIds.length} vinhos?`)) return;
        try {
            await Promise.all(selectedIds.map(id => deleteWine.mutateAsync(id)));
            toast({ title: `${selectedIds.length} vinhos removidos.` });
            setSelectedIds([]);
        } catch {
            toast({ title: "Erro ao remover vinhos.", variant: "destructive" });
        }
    };

    const handleQuickStock = async (wineId: string, diff: number) => {
        if (stockBusyWineId === wineId) return;
        const wine = wines.find(w => w.id === wineId);
        if (!wine) return;

        const prevQty = wine.quantity;
        const quantityAbs = Math.abs(diff);
        const nextQty = Math.max(0, prevQty + diff);
        const eventType = diff > 0 ? "stock_increase" : "stock_decrease";
        const actionLabel = diff > 0 ? "Aumento manual de estoque" : "Redução manual de estoque";

        if (isCommercial) {
            setAuditPayload({
                wineId,
                wineName: wine.name,
                prevQty,
                nextQty,
                delta: nextQty - prevQty,
                eventType,
                quantityAbs,
                actionLabel,
            });
            setAuditOpen(true);
            return;
        }

        try {
            setStockBusyWineId(wineId);
            await wineEvent.mutateAsync({ wineId, eventType: diff > 0 ? "add" : "open", quantity: quantityAbs });
            toast({ title: diff > 0 ? "Entrada registrada!" : "Saída registrada!", variant: "default" });
        } catch {
            toast({ title: "Erro ao atualizar estoque.", variant: "destructive" });
        } finally {
            setStockBusyWineId((current) => (current === wineId ? null : current));
        }
    };

    const formatListCount = (count: number, singular: string, plural: string) =>
        `${count} ${count === 1 ? singular : plural}`;

    // --- Render Helpers ---
    const renderStockVisual = (qty: number) => {
        let color = "bg-success/70";
        if (qty === 0) color = "bg-muted-foreground/40";
        else if (qty <= 2) color = "bg-destructive/60";
        else if (qty <= 6) color = "bg-warning/60";

        return (
            <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                <span className="text-[13px] font-bold tabular-nums text-foreground">
                    {qty}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">un.</span>
            </div>
        );
    };

    // MultiSelectDropdown handles its own UI now, so we remove QuickFilterDropdown

    return (
        <div className="space-y-4 md:space-y-5 max-w-[1440px] pb-[calc(72px+env(safe-area-inset-bottom))] relative">
            <StockAuditDialog
                open={auditOpen}
                onOpenChange={(v) => { setAuditOpen(v); if (!v) setAuditPayload(null); }}
                payload={auditPayload ? {
                    wineName: auditPayload.wineName,
                    actionLabel: auditPayload.actionLabel,
                    previousQuantity: auditPayload.prevQty,
                    newQuantity: auditPayload.nextQty,
                    delta: auditPayload.delta,
                } : null}
                locations={
                  auditPayload && allLocations
                    ? allLocations
                        .filter((l) => l.wine_id === auditPayload.wineId)
                        .map((l) => ({
                          id: l.id,
                          label: l.formatted_label ?? l.manual_label ?? "Sem localização",
                          quantity: l.quantity,
                        }))
                    : undefined
                }
                requireLocation={isCommercial}
                defaultLocationId={
                  auditPayload && allLocations
                    ? (allLocations.find((l) => l.wine_id === auditPayload.wineId)?.id ?? undefined)
                    : undefined
                }
                defaultResponsibleName={
                    typeof user?.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : undefined
                }
                defaultReason={auditPayload?.eventType === "stock_increase" ? "Entrada manual" : "Ajuste de inventário"}
                confirmLabel="Confirmar alteração"
                busy={auditPayload ? stockBusyWineId === auditPayload.wineId : false}
                onConfirm={async ({ responsibleName, reason, notes, locationId }) => {
                    if (!auditPayload) return;
                    try {
                        setStockBusyWineId(auditPayload.wineId);
                        await wineEvent.mutateAsync({
                            wineId: auditPayload.wineId,
                            eventType: auditPayload.eventType,
                            quantity: auditPayload.quantityAbs,
                            notes,
                            responsibleName,
                            reason,
                            locationId,
                        });
                        toast({
                            title: auditPayload.delta > 0 ? "Entrada registrada!" : "Saída registrada!",
                            variant: "default",
                        });
                    } catch (err: any) {
                        toast({ title: "Erro ao atualizar estoque.", description: err?.message, variant: "destructive" });
                    } finally {
                        setStockBusyWineId((current) => (current === auditPayload.wineId ? null : current));
                    }
                }}
            />

            {/* --- HEADER --- */}
            <div className="section-surface section-surface--full flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <h1 className="section-surface__title text-xl md:text-2xl font-serif font-black italic tracking-tight" style={{ letterSpacing: "-0.04em" }}>
                        Estoque
                    </h1>
                    <p className="section-surface__subtitle text-[12px] mt-0.5 font-medium text-muted-foreground">Operação comercial · leitura rápida de disponibilidade e valor</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums">{summary.labels} rótulos</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums">{summary.bottles} garrafas</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums">R$ {summary.totalValue.toLocaleString("pt-BR")}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex border border-border/70 rounded-2xl bg-background/50 backdrop-blur-md p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-pressed={viewMode === "table"}
                            className={cn("h-8 w-8 rounded-xl", viewMode === "table" && "bg-background shadow-sm text-primary")}
                            onClick={() => setViewMode("table")}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-pressed={viewMode === "grid"}
                            className={cn("h-8 w-8 rounded-xl", viewMode === "grid" && "bg-background shadow-sm text-primary")}
                            onClick={() => setViewMode("grid")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                    <MagneticButton>
                        <Button variant="primary" className="h-10 px-4 rounded-2xl shadow-float font-bold text-[12px] uppercase tracking-wider" onClick={() => setAddWineOpen(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Cadastrar produto
                        </Button>
                    </MagneticButton>
                </div>
            </div>

            {/* --- SUMMARY METRICS --- */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
                <PremiumKpiCard className="p-3 md:p-4">
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Rótulos Cadastrados</p>
                    <p className="text-lg md:text-xl font-black text-foreground">{summary.labels}</p>
                </PremiumKpiCard>
                <PremiumKpiCard className="p-3 md:p-4">
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Garrafas em Estoque</p>
                    <p className="text-lg md:text-xl font-black text-foreground">{summary.bottles}</p>
                </PremiumKpiCard>
                <PremiumKpiCard className="p-3 md:p-4">
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Valor Total</p>
                    <p className="text-lg md:text-xl font-black text-foreground">R$ {summary.totalValue.toLocaleString("pt-BR")}</p>
                </PremiumKpiCard>
            </div>

            {/* --- QUICK ACTIONS & FILTERS --- */}
            <div className="glass-card p-3 md:p-4 border-white/50 space-y-3">
                <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                    <Input
                        placeholder="Pesquisar vinho, produtor, região, safra ou uva..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-border/40 bg-background/60 backdrop-blur-md shadow-sm focus:ring-primary/10 focus:border-primary/20 transition-all font-medium text-[13px]"
                    />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    {/* Mobile-first: reduzir altura do topo e evitar wrap infinito */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible">
                        {/* Quick Toggles for Stock */}
                        <div className="shrink-0 flex border border-black/5 rounded-[12px] bg-white/40 backdrop-blur-sm p-[3px]">
                            {[
                                { id: "all", label: "Todos" },
                                { id: "low", label: "Baixo estoque" },
                                { id: "out", label: "Sem estoque" },
                            ].map((t) => (
                                <Button
                                    key={t.id}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateParam("status", t.id === "all" ? null : t.id)}
                                    className={cn(
                                        "h-8 px-3 text-[11px] font-bold rounded-[10px] whitespace-nowrap",
                                        statusFilter === t.id || (t.id === "all" && statusFilter === "all")
                                            ? "bg-background shadow-sm text-primary hover:bg-background"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {t.label}
                                </Button>
                            ))}
                        </div>

                        {/* Desktop/tablet quick filters */}
                        <div className="hidden md:flex items-center gap-2">
                            <div className="w-[1px] h-6 bg-border mx-1" />
                            <MultiSelectDropdown
                                title="Região"
                                options={dynamicOptions.regions}
                                selected={regionFilters}
                                onChange={(val) => updateParam("region", val, true)}
                                onClear={() => updateParam("region", null, true)}
                                searchPlaceholder="Buscar região..."
                                searchable
                            />
                            <MultiSelectDropdown
                                title="Setor"
                                options={dynamicOptions.sectors ?? []}
                                selected={sectorFilters}
                                onChange={(val) => updateParam("sector", val, true)}
                                onClear={() => updateParam("sector", null, true)}
                                searchPlaceholder="Buscar setor..."
                                searchable
                            />
                            <MultiSelectDropdown
                                title="Gôndola"
                                options={dynamicOptions.zones ?? []}
                                selected={zoneFilters}
                                onChange={(val) => updateParam("zone", val, true)}
                                onClear={() => updateParam("zone", null, true)}
                                searchPlaceholder="Buscar gôndola..."
                                searchable
                            />
                            <MultiSelectDropdown
                                title="Linha"
                                options={dynamicOptions.levels ?? []}
                                selected={levelFilters}
                                onChange={(val) => updateParam("level", val, true)}
                                onClear={() => updateParam("level", null, true)}
                                searchPlaceholder="Buscar linha..."
                                searchable
                            />
                            <MultiSelectDropdown
                                title="País"
                                options={dynamicOptions.countries}
                                selected={countryFilters}
                                onChange={(val) => updateParam("country", val, true)}
                                onClear={() => updateParam("country", null, true)}
                                searchPlaceholder="Buscar país..."
                                searchable
                            />
                            <MultiSelectDropdown
                                title="Status"
                                options={dynamicOptions.statusOptions}
                                selected={statusFilter === "all" ? [] : [statusFilter]}
                                onChange={(val) => updateParam("status", val)}
                                onClear={() => updateParam("status", null)}
                            />
                            <MultiSelectDropdown
                                title="Safra"
                                options={dynamicOptions.vintages}
                                selected={vintageFilters}
                                onChange={(val) => updateParam("vintage", val, true)}
                                onClear={() => updateParam("vintage", null, true)}
                                searchPlaceholder="Buscar safra..."
                                searchable
                            />

                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative h-10 w-10 rounded-[12px] border border-border/70 bg-background/50 hover:bg-background"
                                onClick={() => setFilterOpen(true)}
                                aria-label="Abrir filtros avançados"
                            >
                                <SlidersHorizontal className="h-4 w-4 opacity-70" />
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-black rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Mobile actions */}
                    <div className="flex items-center gap-2 md:hidden">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-2xl text-[12px] font-bold flex-1 justify-center"
                            onClick={() => setFilterOpen(true)}
                        >
                            <SlidersHorizontal className="h-4 w-4 mr-2 opacity-80" />
                            Filtros
                            {activeFilterCount > 0 ? (
                                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-black px-1.5">
                                    {activeFilterCount}
                                </span>
                            ) : null}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 rounded-2xl px-3"
                                    aria-label="Ordenar lista"
                                >
                                    <ArrowUpDown className="h-4 w-4 opacity-80" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                                    Ordenar
                                </DropdownMenuLabel>
                                {[
                                    { key: "name", label: "Nome" },
                                    { key: "quantity", label: "Estoque" },
                                    { key: "price", label: "Preço" },
                                    { key: "region", label: "Região" },
                                    { key: "vintage", label: "Safra" },
                                ].map((opt) => (
                                    <DropdownMenuItem
                                        key={opt.key}
                                        variant="neutral"
                                        onClick={() => handleSort(opt.key)}
                                    >
                                        {opt.label} {sortKey === opt.key ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="section-surface flex items-center justify-between gap-3 text-[11px] px-0.5 py-0.5">
                <p className="text-foreground/72">
                    {formatListCount(filteredWines.length, "item exibido", "itens exibidos")} •{" "}
                    {formatListCount(selectedIds.length, "selecionado", "selecionados")}
                </p>
                    <p className="hidden md:block text-foreground/60">Filtros rápidos para operação comercial</p>
                </div>
                </div>
            </div>

            {/* --- SELECTED CHIPS --- */}
            <AnimatePresence>
                {(styleFilters.length > 0 || countryFilters.length > 0 || regionFilters.length > 0 || grapeFilters.length > 0 || vintageFilters.length > 0 || statusFilter !== "all") && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-nowrap md:flex-wrap gap-2 items-center px-1 overflow-x-auto md:overflow-visible scrollbar-hide"
                    >
                        <span className="chip-surface chip-surface--soft shrink-0 mr-1">Filtros ativos:</span>
                        {styleFilters.map(s => (
                            <Badge key={s} variant="secondary" className="chip-surface chip-surface--active shrink-0 whitespace-nowrap">
                                {s} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("style", s, true)} />
                            </Badge>
                        ))}
                        {countryFilters.map(c => (
                            <Badge key={c} variant="secondary" className="chip-surface chip-surface--active shrink-0 whitespace-nowrap">
                                {c} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("country", c, true)} />
                            </Badge>
                        ))}
                        {regionFilters.map(r => (
                            <Badge key={r} variant="secondary" className="chip-surface chip-surface--active shrink-0 whitespace-nowrap">
                                {r} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("region", r, true)} />
                            </Badge>
                        ))}
                        {grapeFilters.map(g => (
                            <Badge key={g} variant="secondary" className="chip-surface chip-surface--active shrink-0 whitespace-nowrap">
                                {g} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("grape", g, true)} />
                            </Badge>
                        ))}
                        {vintageFilters.map(v => (
                            <Badge key={v} variant="secondary" className="chip-surface chip-surface--active shrink-0 whitespace-nowrap">
                                Safra {v} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("vintage", v, true)} />
                            </Badge>
                        ))}
                        {statusFilter !== "all" && (
                            <Badge variant="secondary" className="chip-surface chip-surface--active shrink-0 whitespace-nowrap">
                                {statusFilter === "low" ? "Baixo estoque" : statusFilter === "out" ? "Sem estoque" : "Em estoque"} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("status", null)} />
                            </Badge>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="chip-surface chip-surface--danger h-6 px-2 ml-1 rounded-full"
                            onClick={clearAllFilters}
                        >
                            Limpar tudo
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- DATA VIEW --- */}
            <div className="glass-card overflow-hidden border-white/30 ring-1 ring-black/[0.02]">
                {isLoading ? (
                    <div className="p-8 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                ) : filteredWines.length === 0 ? (
                    <PremiumEmptyState
                        icon={Search}
                        title="Nenhum vinho encontrado"
                        description="Ajuste os filtros ou limpe a busca para ver os resultados."
                        secondaryAction={{ label: "Limpar filtros", onClick: clearAllFilters }}
                        className="rounded-none border-0 bg-transparent shadow-none"
                    />
                ) : isMobile ? (
                    <div className="p-2 space-y-2">
                        {filteredWines.map((wine) => {
                            const unitPrice = wine.current_value ?? wine.purchase_price ?? 0;
                            const total = unitPrice * (wine.quantity ?? 0);
                            const selected = selectedIds.includes(wine.id);

                            return (
                                <div
                                    key={wine.id}
                                    className={cn(
                                        "rounded-2xl border border-black/[0.06] bg-white/70 p-3 shadow-sm",
                                        selected && "ring-2 ring-primary/20",
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox checked={selected} onCheckedChange={() => toggleSelect(wine.id)} />
                                        </div>

                                        <div className="w-11 h-14 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 border border-black/5 overflow-hidden">
                                            {wine.image_url ? (
                                                <img src={wine.image_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="h-5 w-5 text-muted-foreground/50" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <button
                                                type="button"
                                                className="w-full text-left"
                                                onClick={() => {
                                                    setEditingWine(wine);
                                                    setEditWineOpen(true);
                                                }}
                                            >
                                                <p className="font-extrabold text-[14px] text-foreground leading-tight truncate">
                                                    {wine.name}
                                                </p>
                                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                                                    {[wine.producer || "Produtor não informado", wine.vintage ? `Safra ${wine.vintage}` : "Safra NV"].join(" · ")}
                                                </p>
                                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                                                    {[wine.country || "País não informado", wine.region || "Região não informada"].join(" · ")}
                                                </p>
                                                {(() => {
                                                  const locs = (allLocations ?? [])
                                                    .filter((l) => l.wine_id === wine.id)
                                                    .map((l) => ({ id: l.id, label: l.formatted_label ?? l.manual_label ?? "", quantity: l.quantity }))
                                                    .filter((l) => !!l.label)
                                                    .slice(0, 2);
                                                  return locs.length ? (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                      {locs.map((l) => (
                                                        <Badge
                                                          key={l.id}
                                                          variant="secondary"
                                                          className="h-5 rounded-full px-2 text-[9px] font-bold tracking-wide bg-[#6E1E2A]/[0.06] text-[#6E1E2A] border border-[#6E1E2A]/[0.12]"
                                                        >
                                                          {l.label}{isCommercial ? ` • ${l.quantity} un.` : ""}
                                                        </Badge>
                                                      ))}
                                                    </div>
                                                  ) : null;
                                                })()}
                                            </button>

                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    {renderStockVisual(wine.quantity)}
                                                    {wine.quantity > 0 && wine.quantity <= 2 ? (
                                                        <Badge className="h-6 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-semibold">
                                                            Baixo
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[12px] font-black text-foreground">
                                                        R$ {total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                                    </p>
                                                    <p className="text-[10px] font-semibold text-muted-foreground">
                                                        R$ {unitPrice.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}/un.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-2xl"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-64 rounded-2xl">
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground">
                                                    Ações
                                                </DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    variant="primary"
                                                    onClick={() => {
                                                        setEditingWine(wine);
                                                        setEditWineOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar produto
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    variant="neutral"
                                                    disabled={stockBusyWineId === wine.id}
                                                    onClick={() => void handleQuickStock(wine.id, 1)}
                                                >
                                                    <Plus className="mr-2 h-4 w-4" /> Registrar entrada (+1)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    variant="danger"
                                                    disabled={stockBusyWineId === wine.id}
                                                    onClick={() => void handleQuickStock(wine.id, -1)}
                                                >
                                                    <Minus className="mr-2 h-4 w-4" /> Registrar saída (-1)
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    variant="ghost"
                                                    onClick={() => navigate(`/dashboard/log?wine=${encodeURIComponent(wine.id)}`)}
                                                >
                                                    <History className="mr-2 h-4 w-4" /> Ver histórico
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    variant="danger"
                                                    onClick={async () => {
                                                        if (!confirm("Deseja excluir este produto?")) return;
                                                        await deleteWine.mutateAsync(wine.id);
                                                        toast({ title: "Produto removido." });
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Remover
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 rounded-2xl text-[12px] font-bold"
                                            disabled={stockBusyWineId === wine.id}
                                            onClick={() => void handleQuickStock(wine.id, 1)}
                                        >
                                            {stockBusyWineId === wine.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                            Entrada
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 rounded-2xl text-[12px] font-bold text-destructive border-destructive/20 hover:bg-destructive/5"
                                            disabled={stockBusyWineId === wine.id}
                                            onClick={() => void handleQuickStock(wine.id, -1)}
                                        >
                                            {stockBusyWineId === wine.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Minus className="mr-2 h-4 w-4" />}
                                            Saída
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : viewMode === "table" ? (
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th className="w-10"><Checkbox checked={selectedIds.length === filteredWines.length && filteredWines.length > 0} onCheckedChange={toggleSelectAll} /></th>
                                    <th className="text-left cursor-pointer hover:bg-black/5" onClick={() => handleSort("name")}>
                                        <div className="flex items-center gap-1">RÓTULO {sortKey === "name" && <ArrowUpDown className="h-3 w-3" />}</div>
                                    </th>
                                    <th className="text-left hidden lg:table-cell cursor-pointer hover:bg-black/5" onClick={() => handleSort("region")}>
                                        <div className="flex items-center gap-1">REGIÃO / SAFRA {sortKey === "region" && <ArrowUpDown className="h-3 w-3" />}</div>
                                    </th>
                                    <th className="text-left cursor-pointer hover:bg-black/5" onClick={() => handleSort("quantity")}>
                                        <div className="flex items-center gap-1">ESTOQUE {sortKey === "quantity" && <ArrowUpDown className="h-3 w-3" />}</div>
                                    </th>
                                    <th className="text-right hidden sm:table-cell cursor-pointer hover:bg-black/5" onClick={() => handleSort("price")}>
                                        <div className="flex items-center justify-end gap-1">PREÇO {sortKey === "price" && <ArrowUpDown className="h-3 w-3" />}</div>
                                    </th>
                                    <th className="text-right hidden xl:table-cell">TOTAL</th>
                                    <th className="w-48 text-right pr-4">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWines.map(wine => (
                                    <tr key={wine.id} className={cn(selectedIds.includes(wine.id) && "selected", "group hover:bg-muted/5 transition-colors cursor-default")} onClick={() => toggleSelect(wine.id)}>
                                        <td onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.includes(wine.id)} onCheckedChange={() => toggleSelect(wine.id)} /></td>
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-12 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 border border-black/[0.04] overflow-hidden">
                                                    {wine.image_url ? <img src={wine.image_url} className="w-full h-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground/40" />}
                                                </div>
                                                <div className="min-w-[120px]">
                                                    <p className="font-bold text-[13px] text-foreground leading-tight truncate">{wine.name}</p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{wine.producer || "—"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell">
                                            <div className="text-[12px] text-foreground">{wine.region || "—"}</div>
                                            <div className="text-[11px] text-muted-foreground/70 mt-0.5">{wine.country || "—"} · {wine.vintage || "NV"}</div>
                                            {(() => {
                                              const loc = (allLocations ?? [])
                                                .filter((l) => l.wine_id === wine.id)
                                                .map((l) => {
                                                  const label = l.formatted_label ?? l.manual_label ?? "";
                                                  return label ? (isCommercial ? `${label} • ${l.quantity} un.` : label) : "";
                                                })
                                                .find(Boolean);
                                              return loc ? (
                                                <div className="mt-0.5">
                                                  <span className="text-[9px] font-medium text-muted-foreground/70 tracking-wide">
                                                    {loc}
                                                  </span>
                                                </div>
                                              ) : null;
                                            })()}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                {renderStockVisual(wine.quantity)}
                                                {wine.quantity > 0 && wine.quantity <= 2 && (
                                                    <span className="text-[9px] font-semibold text-destructive/80 uppercase tracking-wider">Baixo</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-right hidden sm:table-cell">
                                            <p className="text-[13px] font-semibold tabular-nums text-foreground">R$ {(wine.current_value || wine.purchase_price || 0).toLocaleString("pt-BR")}</p>
                                        </td>
                                        <td className="text-right hidden xl:table-cell"><p className="text-[13px] font-bold tabular-nums text-foreground">R$ {((wine.current_value || wine.purchase_price || 0) * wine.quantity).toLocaleString("pt-BR")}</p></td>
                                        <td className="text-right pr-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="Registrar entrada"
                                                    disabled={stockBusyWineId === wine.id}
                                                    onClick={(e) => { e.stopPropagation(); void handleQuickStock(wine.id, 1); }}
                                                >
                                                    {stockBusyWineId === wine.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    title="Registrar saída"
                                                    disabled={stockBusyWineId === wine.id}
                                                    onClick={(e) => { e.stopPropagation(); void handleQuickStock(wine.id, -1); }}
                                                >
                                                    {stockBusyWineId === wine.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            title="Mais ações"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground">Ações</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            variant="primary"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setEditingWine(wine);
                                                                setEditWineOpen(true);
                                                            }}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" /> Editar vinho
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            variant="neutral"
                                                            disabled={stockBusyWineId === wine.id}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                void handleQuickStock(wine.id, 1);
                                                            }}
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" /> Registrar entrada (+1)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            variant="danger"
                                                            disabled={stockBusyWineId === wine.id}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                void handleQuickStock(wine.id, -1);
                                                            }}
                                                        >
                                                            <Minus className="mr-2 h-4 w-4" /> Registrar saída (-1)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                navigate(`/dashboard/log?wine=${encodeURIComponent(wine.id)}`);
                                                            }}
                                                        >
                                                            <History className="mr-2 h-4 w-4" /> Ver histórico
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredWines.map((wine) => {
                                const unitPrice = wine.current_value ?? wine.purchase_price ?? 0;
                                const total = unitPrice * (wine.quantity ?? 0);
                                const selected = selectedIds.includes(wine.id);

                                return (
                                    <div
                                        key={wine.id}
                                        className={cn(
                                            "rounded-2xl border border-black/[0.06] bg-white/70 p-4 shadow-sm hover:bg-white/80 transition-colors",
                                            selected && "ring-2 ring-primary/20",
                                        )}
                                        onClick={() => {
                                            setEditingWine(wine);
                                            setEditWineOpen(true);
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key !== "Enter" && e.key !== " ") return;
                                            e.preventDefault();
                                            setEditingWine(wine);
                                            setEditWineOpen(true);
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Checkbox checked={selected} onCheckedChange={() => toggleSelect(wine.id)} />
                                            </div>

                                            <div className="w-11 h-14 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 border border-black/5 overflow-hidden">
                                                {wine.image_url ? (
                                                    <img src={wine.image_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="h-5 w-5 text-muted-foreground/50" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-extrabold text-[14px] text-foreground leading-tight truncate">{wine.name}</p>
                                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                                                    {[wine.producer || "Produtor não informado", wine.vintage ? `Safra ${wine.vintage}` : "Safra NV"].join(" · ")}
                                                </p>
                                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                                                    {[wine.country || "País não informado", wine.region || "Região não informada"].join(" · ")}
                                                </p>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-2xl"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-64 rounded-2xl">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground">
                                                        Ações
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        variant="primary"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setEditingWine(wine);
                                                            setEditWineOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" /> Editar produto
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        variant="neutral"
                                                        disabled={stockBusyWineId === wine.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            void handleQuickStock(wine.id, 1);
                                                        }}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" /> Registrar entrada (+1)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        variant="danger"
                                                        disabled={stockBusyWineId === wine.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            void handleQuickStock(wine.id, -1);
                                                        }}
                                                    >
                                                        <Minus className="mr-2 h-4 w-4" /> Registrar saída (-1)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        variant="ghost"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            navigate(`/dashboard/log?wine=${encodeURIComponent(wine.id)}`);
                                                        }}
                                                    >
                                                        <History className="mr-2 h-4 w-4" /> Ver histórico
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {renderStockVisual(wine.quantity)}
                                                {wine.quantity > 0 && wine.quantity <= 2 ? (
                                                    <Badge className="h-6 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-semibold">
                                                        Baixo estoque
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[12px] font-black text-foreground">
                                                    R$ {total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                                </p>
                                                <p className="text-[10px] font-semibold text-muted-foreground">
                                                    R$ {unitPrice.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}/un.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* --- SIDEBAR FILTERS (Detailed) --- */}


            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetContent
                    side={isMobile ? "bottom" : "right"}
                    className={cn(
                        isMobile ? "mobile-bottom-sheet !p-0 max-h-[85vh]" : "w-[420px] sm:w-[520px]",
                    )}
                >
                    {isMobile ? <div className="mobile-bottom-sheet-handle" /> : null}

                    <div className={cn("px-5 pb-5", isMobile ? "pt-1" : "")}>
                    <SheetHeader className={cn(isMobile ? "mt-0" : "")}>
                        <SheetTitle>Filtros</SheetTitle>
                        <SheetDescription>Refine a lista sem perder agilidade operacional.</SheetDescription>
                    </SheetHeader>

                    <ScrollArea className={cn(isMobile ? "h-[calc(85vh-240px)]" : "h-[calc(100vh-180px)]", "mt-5 pr-3")}>
                        <div className="space-y-6 pb-2">
                            <div className="grid grid-cols-1 gap-3">
                                <MultiSelectDropdown
                                    title="Estilo"
                                    options={dynamicOptions.styles}
                                    selected={styleFilters}
                                    onChange={(val) => updateParam("style", val, true)}
                                    onClear={() => updateParam("style", null, true)}
                                />
                                <MultiSelectDropdown
                                    title="País"
                                    options={dynamicOptions.countries}
                                    selected={countryFilters}
                                    onChange={(val) => updateParam("country", val, true)}
                                    onClear={() => updateParam("country", null, true)}
                                    searchPlaceholder="Buscar país..."
                                    searchable
                                />
                                <MultiSelectDropdown
                                    title="Região"
                                    options={dynamicOptions.regions}
                                    selected={regionFilters}
                                    onChange={(val) => updateParam("region", val, true)}
                                    onClear={() => updateParam("region", null, true)}
                                    searchPlaceholder="Buscar região..."
                                    searchable
                                />
                                <MultiSelectDropdown
                                    title="Safra"
                                    options={dynamicOptions.vintages}
                                    selected={vintageFilters}
                                    onChange={(val) => updateParam("vintage", val, true)}
                                    onClear={() => updateParam("vintage", null, true)}
                                    searchPlaceholder="Buscar safra..."
                                    searchable
                                />
                                <MultiSelectDropdown
                                    title="Status"
                                    options={dynamicOptions.statusOptions}
                                    selected={statusFilter === "all" ? [] : [statusFilter]}
                                    onChange={(val) => updateParam("status", val)}
                                    onClear={() => updateParam("status", null)}
                                />
                                <MultiSelectDropdown
                                    title="Uva"
                                    options={dynamicOptions.grapes}
                                    selected={grapeFilters}
                                    onChange={(val) => updateParam("grape", val, true)}
                                    onClear={() => updateParam("grape", null, true)}
                                    searchPlaceholder="Buscar uva..."
                                />
                            </div>

                            <div>
                                <p className="text-xs font-semibold mb-3">Faixa de Safra</p>
                                <Slider value={vintageRange} min={1980} max={new Date().getFullYear()} step={1} onValueChange={(value) => setVintageRange(value as [number, number])} />
                                <p className="text-xs mt-2 text-muted-foreground">{vintageRange[0]} — {vintageRange[1]}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold mb-3">Faixa de Preço (R$)</p>
                                <Slider value={priceRange} min={0} max={5000} step={50} onValueChange={(value) => setPriceRange(value as [number, number])} />
                                <p className="text-xs mt-2 text-muted-foreground">R$ {priceRange[0]} — R$ {priceRange[1]}</p>
                            </div>
                        </div>
                    </ScrollArea>

                    <SheetFooter className="pt-4 pb-[calc(12px+env(safe-area-inset-bottom))]">
                        <Button variant="ghost" onClick={clearAllFilters} className="w-full sm:w-auto">Limpar filtros</Button>
                        <Button variant="primary" onClick={() => setFilterOpen(false)} className="w-full sm:w-auto">Aplicar</Button>
                    </SheetFooter>
                    </div>
                </SheetContent>
            </Sheet>
            <AddWineDialog open={addWineOpen} onOpenChange={setAddWineOpen} />
            <EditWineDialog
                open={editWineOpen}
                onOpenChange={(open) => {
                    setEditWineOpen(open);
                    if (!open) setEditingWine(null);
                }}
                wine={editingWine}
            />
        </div>
    );
}
