import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Filter, SlidersHorizontal, ArrowUpDown, ChevronDown,
    MoreHorizontal, Trash2, Tag, Download, Check, X,
    Package, AlertTriangle, Clock, History, Star,
    Smartphone, ChevronRight, LayoutGrid, List as ListIcon, Plus, Minus, Pencil
} from "lucide-react";
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
import { useSearchParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { PremiumKpiCard } from "@/components/ui/premium-kpi-card";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AddWineDialog } from "@/components/AddWineDialog";

// --- Types & Constants ---
type StockStatus = "all" | "in-stock" | "low" | "out" | "aging" | "drink-now";

const STYLES = ["Tinto", "Branco", "Rosé", "Espumante", "Sobremesa", "Fortificado"];

export default function InventoryPage() {
    const { wines, isLoading } = useWineMetrics();
    const deleteWine = useDeleteWine();
    const wineEvent = useWineEvent();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // --- States ---
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [filterOpen, setFilterOpen] = useState(false);
    const [addWineOpen, setAddWineOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");

    // Filter Values (from URL)
    const statusFilter = (searchParams.get("status") as StockStatus) || "all";
    const styleFilters = searchParams.getAll("style");
    const countryFilters = searchParams.getAll("country");
    const regionFilters = searchParams.getAll("region");
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
        const countries = [...new Set(wines.map(w => w.country).filter(Boolean) as string[])].sort();
        const regions = [...new Set(wines.map(w => w.region).filter(Boolean) as string[])].sort();
        const grapes = [...new Set(wines.map(w => w.grape).filter(Boolean) as string[])].sort();
        const vintages = [...new Set(wines.map(w => w.vintage).filter(Boolean) as number[])].sort((a, b) => b - a).map(String);
        return {
            countries: countries.map(c => ({ label: c, value: c })),
            regions: regions.map(r => ({ label: r, value: r })),
            grapes: grapes.map(g => ({ label: g, value: g })),
            vintages: vintages.map(v => ({ label: v, value: v })),
            styles: STYLES.map(s => ({ label: s, value: s }))
        };
    }, [wines]);

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
            // Text Search
            const searchMatch = !debouncedSearch ||
                wine.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                wine.producer?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                wine.region?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                wine.grape?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                wine.country?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
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
    }, [wines, debouncedSearch, statusFilter, styleFilters, countryFilters, regionFilters, grapeFilters, vintageFilters, tagFilters, vintageRange, priceRange, sortKey, sortOrder]);

    const activeFilterCount = styleFilters.length + countryFilters.length + regionFilters.length + grapeFilters.length + vintageFilters.length + tagFilters.length + (statusFilter !== "all" ? 1 : 0);

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
        try {
            await wineEvent.mutateAsync({ wineId, eventType: diff > 0 ? "add" : "open", quantity: Math.abs(diff) });
            toast({ title: diff > 0 ? "Entrada registrada!" : "Saída registrada!", variant: "default" });
        } catch {
            toast({ title: "Erro ao atualizar estoque.", variant: "destructive" });
        }
    };

    // --- Render Helpers ---
    const renderStockVisual = (qty: number) => {
        let color = "bg-green-500 shadow-green-500/50";
        if (qty === 0) color = "bg-gray-400 shadow-gray-400/50";
        else if (qty <= 2) color = "bg-red-500 shadow-red-500/50";
        else if (qty <= 6) color = "bg-yellow-500 shadow-yellow-500/50";

        return (
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] ${color}`} />
                <span className="text-sm font-black text-[#0F0F14]">{qty} <span className="text-[11px] text-muted-foreground font-bold lowercase">un</span></span>
            </div>
        );
    };

    // MultiSelectDropdown handles its own UI now, so we remove QuickFilterDropdown

    return (
        <div className="space-y-5 max-w-[1440px] pb-20 relative min-h-screen">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-serif font-black italic tracking-tight" style={{ color: "#0F0F14", letterSpacing: "-0.04em" }}>
                        Estoque
                    </h1>
                    <p className="text-sm mt-1 text-muted-foreground font-medium">Operação comercial com leitura rápida de disponibilidade, valor e giro.</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="h-7 rounded-xl px-2.5 text-[11px] bg-white/70 border-black/10 text-[#4B5563]">{summary.labels} rótulos</Badge>
                        <Badge variant="outline" className="h-7 rounded-xl px-2.5 text-[11px] bg-white/70 border-black/10 text-[#4B5563]">{summary.bottles} em estoque</Badge>
                        <Badge variant="outline" className="h-7 rounded-xl px-2.5 text-[11px] bg-white/70 border-black/10 text-[#4B5563]">R$ {summary.totalValue.toLocaleString("pt-BR")} estimado</Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex border border-[#8C2044]/10 rounded-2xl bg-white/40 backdrop-blur-md p-1">
                        <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-xl transition-all", viewMode === "table" && "bg-white shadow-premium text-[#8C2044]")} onClick={() => setViewMode("table")}>
                            <ListIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-xl transition-all", viewMode === "grid" && "bg-white shadow-premium text-[#8C2044]")} onClick={() => setViewMode("grid")}>
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                    <MagneticButton>
                        <Button variant="premium" className="h-10 px-4 rounded-2xl shadow-float font-bold text-[12px] uppercase tracking-wider" onClick={() => setAddWineOpen(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Vinho
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
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C2044]/60 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Pesquisar vinho, produtor, região, safra ou uva..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 rounded-[16px] border-[#8C2044]/10 bg-white/40 backdrop-blur-md shadow-sm focus:ring-[#8C2044]/5 focus:border-[#8C2044]/20 transition-all font-medium text-[13px]"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Toggles for Stock */}
                    <div className="flex border border-black/5 rounded-[12px] bg-white/40 backdrop-blur-sm p-[3px]">
                        {[
                            { id: "all", label: "Todos" },
                            { id: "low", label: "Baixo estoque" },
                            { id: "out", label: "Sem estoque" },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => updateParam("status", t.id === "all" ? null : t.id)}
                                className={cn(
                                    "px-3 py-1.5 text-[11px] font-bold rounded-[10px] transition-all",
                                    (statusFilter === t.id || (t.id === "all" && statusFilter === "all")) ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="w-[1px] h-6 bg-border mx-1 hidden sm:block" />

                    {/* Quick dropdown filters */}
                    <MultiSelectDropdown
                        title="Região"
                        options={dynamicOptions.regions}
                        selected={regionFilters}
                        onChange={(val) => updateParam("region", val, true)}
                        onClear={() => updateParam("region", null, true)}
                        searchPlaceholder="Buscar região..."
                    />
                    <MultiSelectDropdown
                        title="País"
                        options={dynamicOptions.countries}
                        selected={countryFilters}
                        onChange={(val) => updateParam("country", val, true)}
                        onClear={() => updateParam("country", null, true)}
                        searchPlaceholder="Buscar país..."
                    />
                    <MultiSelectDropdown
                        title="Status"
                        options={[
                            { label: "Em estoque", value: "in-stock" },
                            { label: "Baixo estoque", value: "low" },
                            { label: "Sem estoque", value: "out" },
                        ]}
                        selected={statusFilter === "all" ? [] : [statusFilter]}
                        onChange={(val) => updateParam("status", val)}
                        onClear={() => updateParam("status", null)}
                        searchPlaceholder="Buscar status..."
                    />
                    <MultiSelectDropdown
                        title="Safra"
                        options={dynamicOptions.vintages}
                        selected={vintageFilters}
                        onChange={(val) => updateParam("vintage", val, true)}
                        onClear={() => updateParam("vintage", null, true)}
                        searchPlaceholder="Buscar safra..."
                    />

                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-[12px] bg-white/40 border-border/50 hover:border-black/20" onClick={() => setFilterOpen(true)}>
                        <SlidersHorizontal className="h-4 w-4 opacity-70" />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8C2044] text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
                    <p>{filteredWines.length} itens exibidos • {selectedIds.length} selecionados</p>
                    <p className="hidden md:block">Filtros rápidos para operação comercial</p>
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
                        className="flex flex-wrap gap-2 items-center px-1"
                    >
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-1">Filtros ativos:</span>
                        {styleFilters.map(s => (
                            <Badge key={s} variant="secondary" className="pl-2 pr-1 h-6 text-[10px] rounded-md bg-primary/5 text-primary border-primary/10 transition-colors hover:bg-primary/10">
                                {s} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("style", s, true)} />
                            </Badge>
                        ))}
                        {countryFilters.map(c => (
                            <Badge key={c} variant="secondary" className="pl-2 pr-1 h-6 text-[10px] rounded-md bg-primary/5 text-primary border-primary/10 transition-colors hover:bg-primary/10">
                                {c} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("country", c, true)} />
                            </Badge>
                        ))}
                        {regionFilters.map(r => (
                            <Badge key={r} variant="secondary" className="pl-2 pr-1 h-6 text-[10px] rounded-md bg-primary/5 text-primary border-primary/10 transition-colors hover:bg-primary/10">
                                {r} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("region", r, true)} />
                            </Badge>
                        ))}
                        {grapeFilters.map(g => (
                            <Badge key={g} variant="secondary" className="pl-2 pr-1 h-6 text-[10px] rounded-md bg-primary/5 text-primary border-primary/10 transition-colors hover:bg-primary/10">
                                {g} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("grape", g, true)} />
                            </Badge>
                        ))}
                        {vintageFilters.map(v => (
                            <Badge key={v} variant="secondary" className="pl-2 pr-1 h-6 text-[10px] rounded-md bg-primary/5 text-primary border-primary/10 transition-colors hover:bg-primary/10">
                                Safra {v} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("vintage", v, true)} />
                            </Badge>
                        ))}
                        {statusFilter !== "all" && (
                            <Badge variant="secondary" className="pl-2 pr-1 h-6 text-[10px] rounded-md bg-primary/5 text-primary border-primary/10 transition-colors hover:bg-primary/10">
                                {statusFilter === "low" ? "Baixo estoque" : statusFilter === "out" ? "Sem estoque" : "Em estoque"} <X className="ml-1 h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" onClick={() => updateParam("status", null)} />
                            </Badge>
                        )}
                        <button className="text-[10px] font-bold text-red-500 hover:text-red-600 hover:underline border-l border-red-200 pl-2 ml-1 transition-colors" onClick={clearAllFilters}>Limpar tudo</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- DATA VIEW --- */}
            <div className="glass-card overflow-hidden border-white/40 ring-1 ring-black/[0.03]">
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
                                    <tr key={wine.id} className={cn(selectedIds.includes(wine.id) && "selected", "group hover:bg-muted/10 transition-colors cursor-default h-[74px]")} onClick={() => toggleSelect(wine.id)}>
                                        <td onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.includes(wine.id)} onCheckedChange={() => toggleSelect(wine.id)} /></td>
                                        <td>
                                            <div className="flex items-center gap-3 py-1">
                                                <div className="w-11 h-14 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 border border-black/5 overflow-hidden">
                                                    {wine.image_url ? <img src={wine.image_url} className="w-full h-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground/50" />}
                                                </div>
                                                <div className="min-w-[140px]">
                                                    <p className="font-extrabold text-[14px] text-[#0F0F14] hover:text-primary transition-colors cursor-pointer leading-tight">{wine.name}</p>
                                                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{wine.producer || "Produtor não informado"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell">
                                            <div className="text-[13px] font-medium">{wine.region || "Região não informada"}</div>
                                            <div className="text-[11px] font-medium text-muted-foreground mt-0.5">{wine.country || "País não informado"} • Safra {wine.vintage || "NV"}</div>
                                        </td>
                                        <td><div className="flex items-center gap-2.5">{renderStockVisual(wine.quantity)}{wine.quantity > 0 && wine.quantity <= 2 && <Badge className="h-6 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold">Baixo estoque</Badge>}</div></td>
                                        <td className="text-right hidden sm:table-cell">
                                            <p className="text-sm font-bold text-[#0F0F14]">R$ {(wine.current_value || wine.purchase_price || 0).toLocaleString("pt-BR")}</p>
                                        </td>
                                        <td className="text-right hidden xl:table-cell"><p className="text-sm font-extrabold text-[#0F0F14]">R$ {((wine.current_value || wine.purchase_price || 0) * wine.quantity).toLocaleString("pt-BR")}</p></td>
                                        <td className="text-right pr-4" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800" title="Registrar Entrada" onClick={() => handleQuickStock(wine.id, 1)}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-red-500/10 text-red-700 hover:bg-red-500/20 hover:text-red-800" title="Registrar Saída" onClick={() => handleQuickStock(wine.id, -1)}>
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-float border-white/20 bg-white/95 backdrop-blur-xl">
                                                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground">Ações</DropdownMenuLabel>
                                                        <DropdownMenuItem className="rounded-xl group font-medium"><Pencil className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary" /> Editar vinho</DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-xl group font-medium" onClick={() => handleQuickStock(wine.id, 1)}><Plus className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary" /> Ajustar estoque (+1)</DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-xl group font-medium" onClick={() => handleQuickStock(wine.id, -1)}><Minus className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary" /> Registrar saída (-1)</DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-xl group font-medium"><History className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary" /> Ver histórico</DropdownMenuItem>
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
                    // Grid Mode Omitted for brevity (can implement the grid mode similar to above)
                    <div className="p-6 text-center text-muted-foreground">Modo grid está ativado, mas a ênfase é na tabela!</div>
                )}
            </div>

            {/* --- SIDEBAR FILTERS (Detailed) --- */}


            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetContent className="w-[420px] sm:w-[520px]">
                    <SheetHeader>
                        <SheetTitle>Filtros avançados</SheetTitle>
                        <SheetDescription>Refine a visão comercial sem perder agilidade operacional.</SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-180px)] mt-5 pr-3">
                        <div className="space-y-6">
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
                            <div>
                                <p className="text-xs font-semibold mb-2">Uvas</p>
                                <MultiSelectDropdown
                                    title="Selecionar uvas"
                                    options={dynamicOptions.grapes}
                                    selected={grapeFilters}
                                    onChange={(val) => updateParam("grape", val, true)}
                                    onClear={() => updateParam("grape", null, true)}
                                    searchPlaceholder="Buscar uva..."
                                />
                            </div>
                        </div>
                    </ScrollArea>
                    <SheetFooter className="pt-4">
                        <Button variant="outline" onClick={clearAllFilters}>Limpar filtros</Button>
                        <Button onClick={() => setFilterOpen(false)}>Aplicar</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
            <AddWineDialog open={addWineOpen} onOpenChange={setAddWineOpen} />
        </div>
    );
}
