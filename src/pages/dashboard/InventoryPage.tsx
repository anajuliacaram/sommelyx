import { useState, useMemo, useEffect } from "react";
import {
    Search, Filter, SlidersHorizontal, ArrowUpDown, ChevronDown,
    MoreHorizontal, Trash2, Tag, X,
    Package, AlertTriangle, Clock, History, Star,
    LayoutGrid, List as ListIcon, Plus, Minus, Pencil, Loader2
} from "@/icons/lucide";
import { useWineMetrics, useDeleteWine, useWineEvent, Wine } from "@/hooks/useWines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { RangeSliderFilter } from "@/components/RangeSliderFilter";
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
import { useResolveWineImages } from "@/hooks/useResolveWineImages";
import { WineLabelPreview } from "@/components/WineLabelPreview";

// --- Types & Constants ---
type StockStatus = "all" | "in-stock" | "low" | "out" | "aging" | "drink-now";

const STYLES = ["Tinto", "Branco", "Rosé", "Espumante", "Sobremesa", "Fortificado"];

export default function InventoryPage() {
    const { wines, isLoading } = useWineMetrics();
    useResolveWineImages(wines);
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
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [addWineOpen, setAddWineOpen] = useState(false);
    const [editWineOpen, setEditWineOpen] = useState(false);
    const [editingWine, setEditingWine] = useState<Wine | null>(null);
    const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
        if (typeof window === "undefined") return "table";
        return (window.localStorage.getItem("inventory:viewMode") as "table" | "grid" | null) || "table";
    });
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

    useEffect(() => {
        window.localStorage.setItem("inventory:viewMode", viewMode);
    }, [viewMode]);

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

    const quickStatusTabs = useMemo(
        () => [
            { id: "all" as const, label: "Todos", count: wines.length },
            {
                id: "low" as const,
                label: "Baixo estoque",
                count: wines.filter((wine) => wine.quantity > 0 && wine.quantity <= 2).length,
            },
            {
                id: "out" as const,
                label: "Sem estoque",
                count: wines.filter((wine) => wine.quantity === 0).length,
            },
        ],
        [wines],
    );

    const desktopFilterGroups = useMemo(
        () => [
            {
                title: "Região",
                options: dynamicOptions.regions,
                selected: regionFilters,
                param: "region",
                placeholder: "Buscar região...",
            },
            {
                title: "Setor",
                options: dynamicOptions.sectors ?? [],
                selected: sectorFilters,
                param: "sector",
                placeholder: "Buscar setor...",
            },
            {
                title: "Gôndola",
                options: dynamicOptions.zones ?? [],
                selected: zoneFilters,
                param: "zone",
                placeholder: "Buscar gôndola...",
            },
            {
                title: "Linha",
                options: dynamicOptions.levels ?? [],
                selected: levelFilters,
                param: "level",
                placeholder: "Buscar linha...",
            },
            {
                title: "País",
                options: dynamicOptions.countries,
                selected: countryFilters,
                param: "country",
                placeholder: "Buscar país...",
            },
            {
                title: "Safra",
                options: dynamicOptions.vintages,
                selected: vintageFilters,
                param: "vintage",
                placeholder: "Buscar safra...",
            },
            {
                title: "Status",
                options: dynamicOptions.statusOptions,
                selected: statusFilter === "all" ? [] : [statusFilter],
                param: "status",
                placeholder: undefined,
                multi: false,
            },
        ] as const,
        [countryFilters, dynamicOptions.countries, dynamicOptions.levels, dynamicOptions.regions, dynamicOptions.sectors, dynamicOptions.statusOptions, dynamicOptions.vintages, dynamicOptions.zones, regionFilters, sectorFilters, statusFilter, vintageFilters, zoneFilters],
    );

    const sortOptions = [
        { key: "name", label: "Nome" },
        { key: "quantity", label: "Estoque" },
        { key: "price", label: "Preço" },
        { key: "region", label: "Região" },
        { key: "vintage", label: "Safra" },
    ];

    // --- Handlers ---
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
            toast({ title: "Não conseguimos atualizar o estoque", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
        } finally {
            setStockBusyWineId((current) => (current === wineId ? null : current));
        }
    };

    const formatListCount = (count: number, singular: string, plural: string) =>
        `${count} ${count === 1 ? singular : plural}`;

    const getCommercialPricing = (wine: Wine) => {
        const salePrice = wine.current_value ?? wine.purchase_price ?? 0;
        const purchaseCost = wine.purchase_price ?? null;
        const unitMargin = purchaseCost != null && wine.current_value != null
            ? wine.current_value - purchaseCost
            : null;
        const marginPct = unitMargin != null && purchaseCost && purchaseCost > 0
            ? (unitMargin / purchaseCost) * 100
            : null;

        return { salePrice, purchaseCost, unitMargin, marginPct };
    };

    const lowStockFilteredCount = filteredWines.filter((wine) => wine.quantity > 0 && wine.quantity <= 2).length;

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
        <div className="relative max-w-[1440px] space-y-4 pb-[calc(72px+env(safe-area-inset-bottom))] sm:space-y-5">
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

            <section className="space-y-3.5 sm:space-y-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/55">
                            Operação comercial
                        </p>
                        <h1 className="mt-1 text-[26px] font-black tracking-[-0.05em] text-foreground sm:text-[30px]">
                            Estoque
                        </h1>
                        <p className="mt-1.5 max-w-[720px] text-[12px] font-medium text-muted-foreground/78 sm:text-[13px]">
                            Controle de disponibilidade, valor imobilizado e movimentação dos rótulos em uma visão operacional única.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="hidden sm:flex items-center rounded-[16px] border border-border/60 bg-white/70 p-1 shadow-[0_10px_28px_-24px_rgba(44,20,31,0.18)] backdrop-blur-md">
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-pressed={viewMode === "table"}
                                className={cn("h-9 w-9 rounded-[12px]", viewMode === "table" && "bg-background shadow-sm text-primary")}
                                onClick={() => setViewMode("table")}
                            >
                                <ListIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-pressed={viewMode === "grid"}
                                className={cn("h-9 w-9 rounded-[12px]", viewMode === "grid" && "bg-background shadow-sm text-primary")}
                                onClick={() => setViewMode("grid")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                        </div>
                        <MagneticButton>
                        <Button
                            variant="primary"
                            className="h-10 rounded-[14px] px-4 text-[11px] font-bold uppercase tracking-[0.12em] shadow-[0_18px_34px_-24px_hsl(var(--primary)/0.35)] sm:h-11 sm:rounded-[16px] sm:px-5 sm:text-[12px]"
                            onClick={() => setAddWineOpen(true)}
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Cadastrar vinho
                        </Button>
                        </MagneticButton>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
                    <PremiumKpiCard className="min-h-[88px] rounded-[18px] !p-3 md:min-h-[122px] md:rounded-[22px] md:!p-5">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                            Rótulos cadastrados
                        </p>
                        <div className="mt-2.5 flex items-end justify-between gap-2.5 md:mt-4 md:gap-3">
                            <p className="text-[22px] font-semibold leading-[1.2] tracking-[-0.04em] text-foreground tabular-nums md:text-[28px] md:font-black md:tracking-[-0.05em]">{summary.labels}</p>
                            <Tag className="h-4 w-4 text-primary/48 md:h-5 md:w-5" />
                        </div>
                    </PremiumKpiCard>
                    <PremiumKpiCard className="min-h-[88px] rounded-[18px] !p-3 md:min-h-[122px] md:rounded-[22px] md:!p-5">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                            Garrafas em estoque
                        </p>
                        <div className="mt-2.5 flex items-end justify-between gap-2.5 md:mt-4 md:gap-3">
                            <p className="text-[22px] font-semibold leading-[1.2] tracking-[-0.04em] text-foreground tabular-nums md:text-[28px] md:font-black md:tracking-[-0.05em]">{summary.bottles}</p>
                            <Package className="h-4 w-4 text-primary/48 md:h-5 md:w-5" />
                        </div>
                    </PremiumKpiCard>
                    <PremiumKpiCard className="col-span-2 min-h-[88px] rounded-[18px] !p-3 md:col-span-1 md:min-h-[122px] md:rounded-[22px] md:!p-5">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                            Valor total
                        </p>
                        <div className="mt-2.5 flex items-end justify-between gap-2.5 md:mt-4 md:gap-3">
                            <p className="text-[22px] font-semibold leading-[1.2] tracking-[-0.04em] text-foreground tabular-nums md:text-[28px] md:font-black md:tracking-[-0.05em]">
                                R$ {summary.totalValue.toLocaleString("pt-BR")}
                            </p>
                            <Star className="h-4 w-4 text-primary/48 md:h-5 md:w-5" />
                        </div>
                    </PremiumKpiCard>
                </div>

                <div className="rounded-[24px] border border-black/[0.05] bg-[rgba(255,255,255,0.76)] px-3 py-3 shadow-[0_18px_40px_-28px_rgba(44,20,31,0.18)] backdrop-blur-xl md:px-4">
                    <div className="flex flex-col gap-2.5 md:gap-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/45" />
                                <Input
                                    placeholder="Pesquisar por rótulo, produtor, região, safra, uva ou localização..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="h-10 rounded-[14px] border-border/40 bg-white/76 pl-9 text-[12px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md transition-all focus:border-primary/20 focus:ring-primary/10 md:h-11 md:rounded-[16px] md:text-[13px]"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="hidden md:flex items-center rounded-[16px] border border-border/55 bg-white/68 p-1 shadow-[0_10px_24px_-24px_rgba(44,20,31,0.15)]">
                                    {quickStatusTabs.map((tab) => (
                                        <Button
                                            key={tab.id}
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => updateParam("status", tab.id === "all" ? null : tab.id)}
                                            className={cn(
                                                "h-8 gap-1.5 rounded-[12px] px-3 text-[11px] font-bold",
                                                statusFilter === tab.id || (tab.id === "all" && statusFilter === "all")
                                                    ? "bg-background text-primary shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {tab.label}
                                            <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-inherit">
                                                {tab.count}
                                            </span>
                                        </Button>
                                    ))}
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 rounded-[14px] border-border/55 bg-white/68 px-3 text-[11.5px] font-semibold shadow-[0_10px_24px_-24px_rgba(44,20,31,0.15)] md:h-11 md:rounded-[16px] md:px-3.5 md:text-[12px]"
                                        >
                                            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 opacity-75 md:mr-2 md:h-4 md:w-4" />
                                            {sortOptions.find((option) => option.key === sortKey)?.label || "Nome"}
                                            <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-55 md:ml-2 md:h-4 md:w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                                            Ordenar
                                        </DropdownMenuLabel>
                                        {sortOptions.map((opt) => (
                                            <DropdownMenuItem key={opt.key} variant="neutral" onClick={() => handleSort(opt.key)}>
                                                {opt.label} {sortKey === opt.key ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    type="button"
                                    variant="outline"
                                        className="h-10 rounded-[14px] border-border/55 bg-white/68 px-3 text-[11.5px] font-semibold shadow-[0_10px_24px_-24px_rgba(44,20,31,0.15)] md:h-11 md:rounded-[16px] md:px-3.5 md:text-[12px]"
                                        onClick={() => {
                                            if (isMobile) setFilterOpen(true);
                                            else setAdvancedFiltersOpen((open) => !open);
                                        }}
                                    >
                                        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 opacity-75 md:mr-2 md:h-4 md:w-4" />
                                        {isMobile ? "Filtros" : advancedFiltersOpen ? "Ocultar filtros" : "Filtros avançados"}
                                    {activeFilterCount > 0 ? (
                                        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground">
                                            {activeFilterCount}
                                        </span>
                                    ) : null}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <div className="md:hidden flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                                {quickStatusTabs.map((tab) => (
                                    <Button
                                        key={tab.id}
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => updateParam("status", tab.id === "all" ? null : tab.id)}
                                        className={cn(
                                            "h-9 shrink-0 gap-1.5 rounded-[14px] border px-3 text-[11px] font-bold",
                                            statusFilter === tab.id || (tab.id === "all" && statusFilter === "all")
                                                ? "border-primary/18 bg-primary/8 text-primary"
                                                : "border-border/55 bg-white/66 text-muted-foreground"
                                        )}
                                    >
                                        {tab.label}
                                        <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-black tabular-nums text-inherit">
                                            {tab.count}
                                        </span>
                                    </Button>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.05] pt-2.5">
                                <p className="text-[11px] font-medium text-foreground/68">
                                    {formatListCount(filteredWines.length, "item exibido", "itens exibidos")} •{" "}
                                    {formatListCount(lowStockFilteredCount, "rótulo com baixo estoque", "rótulos com baixo estoque")}
                                </p>
                                <div className="flex items-center gap-2">
                                    {activeFilterCount > 0 ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-primary"
                                            onClick={clearAllFilters}
                                        >
                                            Limpar filtros
                                        </Button>
                                    ) : (
                                        <p className="hidden md:block text-[11px] font-medium text-foreground/50">
                                            Filtragem rápida para reposição, ruptura e localização
                                        </p>
                                    )}
                                </div>
                            </div>

                            {!isMobile && advancedFiltersOpen && (
                                <div className="overflow-hidden">
                                    <div className="rounded-[20px] border border-black/[0.05] bg-white/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/58">
                                                Filtros avançados
                                            </p>
                                            <p className="text-[11px] font-medium text-foreground/52">
                                                Região, localização, origem, safra e status
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                                            {desktopFilterGroups.map((group) => (
                                                <div key={group.title} className="min-w-0">
                                                    <MultiSelectDropdown
                                                        title={group.title}
                                                        options={group.options}
                                                        selected={group.selected}
                                                        onChange={(val) => updateParam(group.param, val, (group as any).multi ?? true)}
                                                        onClear={() => updateParam(group.param, null, (group as any).multi ?? true)}
                                                        searchPlaceholder={group.placeholder}
                                                        searchable={Boolean(group.placeholder)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SELECTED CHIPS --- */}
            {(styleFilters.length > 0 || countryFilters.length > 0 || regionFilters.length > 0 || grapeFilters.length > 0 || vintageFilters.length > 0 || statusFilter !== "all") && (
                    <div
                        className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-visible"
                    >
                        <span className="shrink-0 rounded-full border border-black/[0.05] bg-white/65 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/75">
                            Filtros ativos
                        </span>
                        {styleFilters.map(s => (
                            <Badge key={s} variant="secondary" className="shrink-0 whitespace-nowrap rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary shadow-none">
                                {s} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("style", s, true)} />
                            </Badge>
                        ))}
                        {countryFilters.map(c => (
                            <Badge key={c} variant="secondary" className="shrink-0 whitespace-nowrap rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary shadow-none">
                                {c} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("country", c, true)} />
                            </Badge>
                        ))}
                        {regionFilters.map(r => (
                            <Badge key={r} variant="secondary" className="shrink-0 whitespace-nowrap rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary shadow-none">
                                {r} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("region", r, true)} />
                            </Badge>
                        ))}
                        {grapeFilters.map(g => (
                            <Badge key={g} variant="secondary" className="shrink-0 whitespace-nowrap rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary shadow-none">
                                {g} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("grape", g, true)} />
                            </Badge>
                        ))}
                        {vintageFilters.map(v => (
                            <Badge key={v} variant="secondary" className="shrink-0 whitespace-nowrap rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary shadow-none">
                                Safra {v} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("vintage", v, true)} />
                            </Badge>
                        ))}
                        {statusFilter !== "all" && (
                            <Badge variant="secondary" className="shrink-0 whitespace-nowrap rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary shadow-none">
                                {statusFilter === "low" ? "Baixo estoque" : statusFilter === "out" ? "Sem estoque" : "Em estoque"} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("status", null)} />
                            </Badge>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-7 rounded-full border border-destructive/15 bg-destructive/5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-destructive"
                            onClick={clearAllFilters}
                        >
                            Limpar tudo
                        </Button>
                    </div>
                )}
            

            {/* --- DATA VIEW --- */}
            <div className="overflow-hidden rounded-[28px] border border-black/[0.05] bg-[rgba(255,255,255,0.82)] shadow-[0_18px_46px_-30px_rgba(44,20,31,0.20)] backdrop-blur-xl">
                {isLoading ? (
                    <div className="p-8 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                ) : filteredWines.length === 0 ? (
                    <PremiumEmptyState
                        icon={Search}
                        title="Nenhum vinho encontrado"
                        description="Ajuste a busca ou os filtros para encontrar o vinho que você procura."
                        secondaryAction={{ label: "Limpar filtros", onClick: clearAllFilters }}
                        className="rounded-none border-0 bg-transparent shadow-none"
                    />
                ) : isMobile ? (
                    <div className="p-2 space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                            {filteredWines.map((wine) => {
                                const { salePrice, purchaseCost, unitMargin, marginPct } = getCommercialPricing(wine);
                                return (
                                    <div
                                        key={wine.id}
                                        className="group rounded-[18px] border border-white/18 bg-white/72 p-3 shadow-[0_14px_30px_-24px_rgba(58,51,39,0.18)] backdrop-blur-md transition-all duration-200 hover:-translate-y-[1px] hover:bg-white/82 hover:shadow-[0_18px_34px_-26px_rgba(58,51,39,0.22)] active:scale-[0.995]"
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <WineLabelPreview
                                                wine={wine}
                                                alt={wine.name}
                                                compact
                                                className="h-14 w-10 shrink-0 rounded-[14px]"
                                                imageClassName="h-full w-full object-cover"
                                            />

                                            <div className="min-w-0 flex-1 space-y-1.25">
                                                <button
                                                    type="button"
                                                    className="w-full text-left"
                                                    onClick={() => {
                                                        setEditingWine(wine);
                                                        setEditWineOpen(true);
                                                    }}
                                                >
                                                    <p className="truncate text-[13px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                                                        {wine.name}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-[10.5px] font-medium text-muted-foreground/80">
                                                        {[wine.vintage ? `Safra ${wine.vintage}` : "Safra NV", wine.country || "País não informado"].join(" · ")}
                                                    </p>
                                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                                        {wine.style ? (
                                                            <Badge
                                                                variant="secondary"
                                                                className="h-5 rounded-full border border-[rgba(95,111,82,0.14)] bg-[rgba(95,111,82,0.10)] px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--primary))]"
                                                            >
                                                                {wine.style.charAt(0).toUpperCase() + wine.style.slice(1)}
                                                            </Badge>
                                                        ) : null}
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                "h-5 rounded-full px-2 text-[9px] font-bold uppercase tracking-[0.12em]",
                                                                wine.quantity > 0
                                                                    ? "border border-[rgba(95,111,82,0.14)] bg-[rgba(95,111,82,0.10)] text-[hsl(var(--primary))]"
                                                                    : "border border-[rgba(196,137,52,0.16)] bg-[rgba(196,137,52,0.10)] text-[hsl(29_50%_32%)]",
                                                            )}
                                                        >
                                                            {wine.quantity > 0 ? "Em estoque" : "Sem estoque"}
                                                        </Badge>
                                                    </div>
                                                </button>

                                                <div className="mt-2.5 flex items-center justify-between gap-2.5">
                                                    <div className="flex items-center gap-2">
                                                        {renderStockVisual(wine.quantity)}
                                                        {wine.quantity > 0 && wine.quantity <= 2 ? (
                                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-destructive/80">Baixo</span>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[13px] font-semibold tracking-[-0.02em] text-foreground">
                                                            Venda R$ {salePrice.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                                        </p>
                                                        <p className="text-[11px] font-medium text-foreground/72">
                                                            {purchaseCost != null
                                                                ? `Custo: R$ ${purchaseCost.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                                                                : "Custo não informado"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        {marginPct != null ? (
                                                            <Badge
                                                                className={cn(
                                                                    "h-5 rounded-full border px-2 text-[9px] font-bold",
                                                                    unitMargin != null && unitMargin >= 0
                                                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                        : "border-amber-200 bg-amber-50 text-amber-700",
                                                                )}
                                                            >
                                                                Margem {marginPct >= 0 ? "+" : ""}{marginPct.toFixed(0)}%
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="mt-2.5 grid grid-cols-2 gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-[34px] rounded-[10px] text-[13px] font-bold"
                                                        disabled={stockBusyWineId === wine.id}
                                                        onClick={() => void handleQuickStock(wine.id, 1)}
                                                    >
                                                        {stockBusyWineId === wine.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                                                        Entrada
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-[34px] rounded-[10px] text-[13px] font-bold text-destructive border-destructive/20 hover:bg-destructive/5"
                                                        disabled={stockBusyWineId === wine.id}
                                                        onClick={() => void handleQuickStock(wine.id, -1)}
                                                    >
                                                        {stockBusyWineId === wine.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Minus className="mr-1.5 h-4 w-4" />}
                                                        Saída
                                                    </Button>
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-[34px] w-[34px] rounded-[10px] border border-border/50 bg-white/60"
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
                                                        <Pencil className="mr-2 h-4 w-4" /> Editar vinho
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
                                                            if (!confirm("Deseja excluir este vinho?")) return;
                                                            await deleteWine.mutateAsync(wine.id);
                                                            toast({ title: "Produto removido." });
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Remover
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : viewMode === "table" ? (
                    <div className="overflow-x-auto">
                        <table className="table-premium min-w-[1180px] table-fixed">
                            <colgroup>
                                <col className="w-[32%]" />
                                <col className="w-[23%]" />
                                <col className="w-[12%]" />
                                <col className="w-[16%]" />
                                <col className="w-[14%]" />
                                <col className="w-[148px]" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th className="text-left cursor-pointer hover:bg-black/5" onClick={() => handleSort("name")}>
                                        <div className="flex items-center gap-1">Rótulo {sortKey === "name" && <ArrowUpDown className="h-3 w-3" />}</div>
                                    </th>
                                    <th className="text-left cursor-pointer hover:bg-black/5" onClick={() => handleSort("region")}>
                                        <div className="flex items-center gap-1">Região / safra {sortKey === "region" && <ArrowUpDown className="h-3 w-3" />}</div>
                                    </th>
                                    <th className="text-left cursor-pointer hover:bg-black/5" onClick={() => handleSort("quantity")}>
                                        <div className="flex items-center gap-1">Estoque {sortKey === "quantity" && <ArrowUpDown className="h-3 w-3" />}</div>
                                    </th>
                                    <th className="text-right cursor-pointer hover:bg-black/5" onClick={() => handleSort("price")}>
                                        <div className="flex items-center justify-end gap-1">Venda / custo {sortKey === "price" && <ArrowUpDown className="h-3 w-3" />}</div>
                                    </th>
                                    <th className="text-right">Margem / total</th>
                                    <th className="w-[148px] pr-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWines.map(wine => {
                                    const { salePrice, purchaseCost, unitMargin, marginPct } = getCommercialPricing(wine);
                                    return (
                                    <tr key={wine.id} className="group cursor-default transition-colors hover:bg-muted/5" onClick={() => {
                                        setEditingWine(wine);
                                        setEditWineOpen(true);
                                    }}>
                                        <td className="align-middle">
                                            <div className="flex items-center gap-2.5">
                                                <WineLabelPreview
                                                    wine={wine}
                                                    alt={wine.name}
                                                    compact
                                                    className="w-9 h-12 shrink-0"
                                                    imageClassName="w-full h-full object-cover"
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate text-[13px] font-extrabold leading-tight text-foreground">{wine.name}</p>
                                                    <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground/75">{wine.producer || "Produtor não informado"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="align-middle">
                                            <div className="text-[12px] font-medium text-foreground">{wine.region || "Região não informada"}</div>
                                            <div className="mt-0.5 text-[11px] text-muted-foreground/70">{wine.country || "País não informado"} · {wine.vintage || "NV"}</div>
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
                                                  <span className="text-[9px] font-medium tracking-wide text-muted-foreground/70">
                                                    {loc}
                                                  </span>
                                                </div>
                                              ) : null;
                                            })()}
                                        </td>
                                        <td className="align-middle">
                                            <div className="flex items-center gap-2.5">
                                                {renderStockVisual(wine.quantity)}
                                                {wine.quantity > 0 && wine.quantity <= 2 && (
                                                    <span className="rounded-full bg-destructive/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-destructive/80">Baixo</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="align-middle text-right">
                                            <p className="text-[14px] font-black tabular-nums text-foreground">R$ {salePrice.toLocaleString("pt-BR")}</p>
                                            <p className="mt-0.5 text-[12px] font-semibold text-foreground/76">
                                                {purchaseCost != null ? `Custo: R$ ${purchaseCost.toLocaleString("pt-BR")}` : "Custo não informado"}
                                            </p>
                                        </td>
                                        <td className="align-middle text-right">
                                            {marginPct != null ? (
                                                <p className={cn(
                                                    "text-[12px] font-bold tabular-nums",
                                                    unitMargin != null && unitMargin >= 0 ? "text-emerald-700" : "text-amber-700",
                                                )}>
                                                    {marginPct >= 0 ? "+" : ""}{marginPct.toFixed(0)}%
                                                </p>
                                            ) : null}
                                            <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-foreground/78">
                                                Total R$ {(salePrice * wine.quantity).toLocaleString("pt-BR")}
                                            </p>
                                        </td>
                                        <td className="align-middle pr-4 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="h-8 rounded-xl border-border/60 bg-white/72 px-3 text-[11px] font-semibold shadow-none hover:bg-white"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingWine(wine);
                                                        setEditWineOpen(true);
                                                    }}
                                                >
                                                    Editar
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0 rounded-xl border border-border/50 bg-white/60"
                                                            title="Mais ações"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground">Ações</DropdownMenuLabel>
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
                                )})}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredWines.map((wine) => {
                                const { salePrice, purchaseCost, unitMargin, marginPct } = getCommercialPricing(wine);
                            return (
                                    <div
                                        key={wine.id}
                                        className="rounded-2xl border border-white/14 bg-white/55 p-4 shadow-sm backdrop-blur-md transition-colors hover:bg-white/65"
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
                                            <WineLabelPreview
                                                wine={wine}
                                                alt={wine.name}
                                                compact
                                                className="w-11 h-14 shrink-0"
                                                imageClassName="w-full h-full object-cover"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <p className="font-extrabold text-[14px] text-foreground leading-tight truncate">{wine.name}</p>
                                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                                                    {[wine.producer || "Produtor não informado", wine.vintage ? `Safra ${wine.vintage}` : "Safra NV"].join(" · ")}
                                                </p>
                                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                                                    {[wine.country || "País não informado", wine.region || "Região não informada"].join(" · ")}
                                                </p>
                                            </div>

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
                                                    <p className="text-[14px] font-black text-foreground">
                                                        Venda R$ {salePrice.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                                    </p>
                                                    <p className="text-[12px] font-semibold text-foreground/76">
                                                        {purchaseCost != null
                                                            ? `Custo: R$ ${purchaseCost.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                                                            : "Custo não informado"}
                                                    </p>
                                                </div>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {marginPct != null ? (
                                                    <Badge className={cn(
                                                        "h-6 rounded-full border px-2.5 text-[10px] font-bold",
                                                        unitMargin != null && unitMargin >= 0
                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                            : "border-amber-200 bg-amber-50 text-amber-700",
                                                    )}>
                                                        Margem {marginPct >= 0 ? "+" : ""}{marginPct.toFixed(0)}%
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <p className="text-[10px] font-semibold text-muted-foreground">
                                                Total venda R$ {total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/[0.05] pt-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-9 rounded-[14px] border-border/60 bg-white/72 px-3.5 text-[11px] font-semibold"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingWine(wine);
                                                    setEditWineOpen(true);
                                                }}
                                            >
                                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                Editar
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 rounded-[14px] border border-border/50 bg-white/60"
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
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        variant="danger"
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        if (!confirm("Deseja excluir este vinho?")) return;
                                                            await deleteWine.mutateAsync(wine.id);
                                                            toast({ title: "Produto removido." });
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Remover
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                        isMobile ? "mobile-bottom-sheet !p-0 max-h-[86vh]" : "w-[420px] sm:w-[520px]",
                    )}
                >
                    {isMobile ? <div className="mobile-bottom-sheet-handle" /> : null}

                    <div className={cn("px-5 pb-5", isMobile ? "pt-1" : "")}>
                    <SheetHeader className={cn(isMobile ? "mt-0" : "")}>
                        <SheetTitle>Filtros</SheetTitle>
                        <SheetDescription>Refine a lista sem perder agilidade operacional.</SheetDescription>
                    </SheetHeader>

                    <ScrollArea className={cn(isMobile ? "h-[calc(86vh-240px)]" : "h-[calc(100vh-180px)]", "mt-5 pr-3")}>
                        <div className="space-y-5 pb-2">
                            <div className="grid grid-cols-1 gap-2.5">
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

                            <RangeSliderFilter
                                label="Faixa de safra"
                                min={1980}
                                max={new Date().getFullYear()}
                                step={1}
                                value={vintageRange}
                                onChange={(value) => setVintageRange(value)}
                            />
                            <RangeSliderFilter
                                label="Faixa de preço"
                                min={0}
                                max={5000}
                                step={50}
                                value={priceRange}
                                onChange={(value) => setPriceRange(value)}
                                formatValue={(value) => `R$ ${value}`}
                            />
                        </div>
                    </ScrollArea>

                    <SheetFooter className="pt-4 pb-[calc(12px+env(safe-area-inset-bottom))] gap-2">
                        <Button variant="ghost" onClick={clearAllFilters} className="w-full sm:w-auto h-11 rounded-[16px]">Limpar filtros</Button>
                        <Button variant="primary" onClick={() => setFilterOpen(false)} className="w-full sm:w-auto h-11 rounded-[16px] shadow-[0_14px_26px_-18px_hsl(var(--primary)/0.30)]">Aplicar</Button>
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
