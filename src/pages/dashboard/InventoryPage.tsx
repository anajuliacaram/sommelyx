import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Filter, SlidersHorizontal, ArrowUpDown, ChevronDown,
    MoreHorizontal, Trash2, Tag, Download, Check, X,
    Package, AlertTriangle, Clock, History, Star,
    Smartphone, ChevronRight, LayoutGrid, List as ListIcon, Plus
} from "lucide-react";
import { useWineMetrics, useDeleteWine, Wine } from "@/hooks/useWines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
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

// --- Types & Constants ---
type StockStatus = "all" | "in-stock" | "low" | "out" | "aging" | "drink-now";

const STYLES = ["Tinto", "Branco", "Rosé", "Espumante", "Sobremesa", "Fortificado"];

export default function InventoryPage() {
    const { wines, isLoading } = useWineMetrics();
    const deleteWine = useDeleteWine();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // --- States ---
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");

    // Filter Values (from URL)
    const statusFilter = (searchParams.get("status") as StockStatus) || "all";
    const styleFilters = searchParams.getAll("style");
    const countryFilters = searchParams.getAll("country");
    const sortKey = searchParams.get("sort") || "name";
    const sortOrder = searchParams.get("order") || "asc";

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
                wine.grape?.toLowerCase().includes(debouncedSearch.toLowerCase());

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

            return true;
        }).sort((a, b) => {
            let valA = (a as any)[sortKey];
            let valB = (b as any)[sortKey];

            // Handle nulls
            if (valA === null) return 1;
            if (valB === null) return -1;

            const comparison = typeof valA === 'string'
                ? valA.localeCompare(valB)
                : (valA as number) - (valB as number);

            return sortOrder === "asc" ? comparison : -comparison;
        });
    }, [wines, debouncedSearch, statusFilter, styleFilters, countryFilters, sortKey, sortOrder]);

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

    // --- Render Helpers ---
    const renderStatusBadge = (qty: number) => {
        if (qty <= 0) return <Badge variant="outline" className="text-red-500 bg-red-50/50 border-red-100 uppercase text-[9px] font-bold">Esgotado</Badge>;
        if (qty <= 2) return <Badge variant="outline" className="text-orange-500 bg-orange-50/50 border-orange-100 uppercase text-[9px] font-bold">Baixo Estoque</Badge>;
        return <Badge variant="outline" className="text-green-600 bg-green-50/50 border-green-100 uppercase text-[9px] font-bold">Em Estoque</Badge>;
    };

    return (
        <div className="space-y-6 max-w-[1400px] pb-24 relative min-h-screen">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-serif font-black italic tracking-tight" style={{ color: "#0F0F14", letterSpacing: "-0.04em" }}>
                        Estoque
                    </h1>
                    <p className="text-sm mt-1 text-muted-foreground font-medium">Controle e gestão de rótulos comerciais</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group w-full md:w-64">
                        <Search className="absolute left-3.3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C2044]/60 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Buscar por nome, safra..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 h-10 rounded-2xl border-[#8C2044]/10 bg-white/40 backdrop-blur-md shadow-sm focus:ring-[#8C2044]/5 focus:border-[#8C2044]/20 transition-all font-medium text-[13px]"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-2xl bg-white/40 border-[#8C2044]/10 hover:bg-[#8C2044]/5 hover:border-[#8C2044]/20 transition-all"
                        onClick={() => setFilterOpen(true)}
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        {(styleFilters.length > 0 || countryFilters.length > 0 || statusFilter !== "all") && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8C2044] text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                {styleFilters.length + countryFilters.length + (statusFilter !== "all" ? 1 : 0)}
                            </span>
                        )}
                    </Button>
                    <div className="hidden sm:flex border border-[#8C2044]/10 rounded-2xl bg-white/40 backdrop-blur-md p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 rounded-xl transition-all", viewMode === "table" && "bg-white shadow-premium text-[#8C2044]")}
                            onClick={() => setViewMode("table")}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 rounded-xl transition-all", viewMode === "grid" && "bg-white shadow-premium text-[#8C2044]")}
                            onClick={() => setViewMode("grid")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* --- SELECTED CHIPS --- */}
            <AnimatePresence>
                {(debouncedSearch || statusFilter !== "all" || styleFilters.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-wrap gap-2 items-center"
                    >
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mr-1">Filtros:</span>
                        {debouncedSearch && (
                            <Badge variant="secondary" className="pl-2 pr-1 h-7 rounded-lg group">
                                "{debouncedSearch}"
                                <X className="ml-1.5 h-3 w-3 cursor-pointer opacity-40 hover:opacity-100" onClick={() => setSearch("")} />
                            </Badge>
                        )}
                        {statusFilter !== "all" && (
                            <Badge variant="secondary" className="pl-2 pr-1 h-7 rounded-lg group">
                                Status: {statusFilter}
                                <X className="ml-1.5 h-3 w-3 cursor-pointer opacity-40 hover:opacity-100" onClick={() => updateParam("status", null)} />
                            </Badge>
                        )}
                        {styleFilters.map(s => (
                            <Badge key={s} variant="secondary" className="pl-2 pr-1 h-7 rounded-lg group">
                                Estilo: {s}
                                <X className="ml-1.5 h-3 w-3 cursor-pointer opacity-40 hover:opacity-100" onClick={() => updateParam("style", s, true)} />
                            </Badge>
                        ))}
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-primary hover:bg-primary/5" onClick={clearAllFilters}>
                            Limpar tudo
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- DATA VIEW --- */}
            <div className="glass-card overflow-hidden border-white/40 ring-1 ring-black/[0.03]">
                {isLoading ? (
                    <div className="p-8 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 rounded-xl shimmer-premium w-full" />
                        ))}
                    </div>
                ) : filteredWines.length === 0 ? (
                    <motion.div
                        className="glass-card p-20 text-center relative overflow-hidden group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

                        <div className="relative z-10">
                            <div className="w-20 h-20 rounded-[28px] bg-muted/30 flex items-center justify-center mx-auto mb-8 animate-float shadow-sm border border-black/5 group-hover:rotate-6 transition-transform duration-700">
                                <Search className="h-10 w-10 text-muted-foreground/40" />
                            </div>

                            <h2 className="text-3xl font-serif font-bold text-foreground mb-4 tracking-tight">
                                Nenhum rótulo encontrado
                            </h2>

                            <p className="text-base text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed font-medium">
                                {debouncedSearch || statusFilter !== "all" || styleFilters.length > 0
                                    ? "Não encontramos vinhos com esses critérios de busca. Tente ajustar os filtros ou pesquisar por outro termo."
                                    : "Seu estoque comercial está vazio. Registre novos produtos para começar a gerenciar suas vendas e movimentações."}
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={clearAllFilters}
                                    className="h-12 px-8 rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-bold transition-all"
                                >
                                    <X className="h-4 w-4 mr-2" /> Limpar filtros
                                </Button>
                                {!debouncedSearch && statusFilter === "all" && styleFilters.length === 0 && (
                                    <Button
                                        variant="premium"
                                        onClick={() => {/* Trigger Add Wine from parent/context if needed or redirect */ }}
                                        className="h-12 px-8 rounded-2xl shadow-float font-bold"
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Adicionar ao Estoque
                                    </Button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : viewMode === "table" ? (
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th className="w-10">
                                        <Checkbox
                                            checked={selectedIds.length === filteredWines.length && filteredWines.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="text-left">Rótulo</th>
                                    <th className="text-left hidden lg:table-cell">Região / Safra</th>
                                    <th className="text-left">Estoque</th>
                                    <th className="text-right hidden sm:table-cell">Preço</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWines.map(wine => (
                                    <tr
                                        key={wine.id}
                                        className={cn(selectedIds.includes(wine.id) && "selected")}
                                        onClick={() => toggleSelect(wine.id)}
                                    >
                                        <td onClick={e => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.includes(wine.id)}
                                                onCheckedChange={() => toggleSelect(wine.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 border border-black/5 overflow-hidden">
                                                    {wine.image_url ? (
                                                        <img src={wine.image_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-muted-foreground/50" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[#0F0F14] truncate hover:text-primary transition-colors cursor-pointer">{wine.name}</p>
                                                    <p className="text-[11px] font-medium text-muted-foreground truncate">{wine.producer || "Produtor não inf."}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell">
                                            <div className="text-[13px] font-medium">
                                                {wine.country ? `${wine.country}, ${wine.region}` : wine.region || "—"}
                                            </div>
                                            <div className="text-[11px] font-bold text-primary/60 mt-0.5">{wine.vintage || "NV"}</div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-sm font-black text-[#0F0F14]">{wine.quantity} <span className="text-[11px] text-muted-foreground font-bold">UN</span></span>
                                                {renderStatusBadge(wine.quantity)}
                                            </div>
                                        </td>
                                        <td className="text-right hidden sm:table-cell">
                                            <p className="text-sm font-bold text-[#0F0F14]">R$ {(wine.current_value || wine.purchase_price || 0).toLocaleString("pt-BR")}</p>
                                            <p className="text-[11px] font-medium text-muted-foreground">Total: R$ {((wine.current_value || wine.purchase_price || 0) * wine.quantity).toLocaleString("pt-BR")}</p>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-float border-white/20 bg-white/90 backdrop-blur-xl">
                                                    <DropdownMenuItem className="rounded-xl group">
                                                        <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary" /> Visualizar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-xl group">
                                                        <Tag className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary" /> Editar tags
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="opacity-50" />
                                                    <DropdownMenuItem className="rounded-xl text-red-500 hover:text-red-600 focus:text-red-500 group" onClick={() => {
                                                        if (confirm("Excluir este item?")) deleteWine.mutate(wine.id);
                                                    }}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredWines.map(wine => (
                            <div key={wine.id} className={cn("glass-card-sm p-4 relative group cursor-pointer border-transparent ring-1 ring-black/[0.05]", selectedIds.includes(wine.id) && "ring-primary/40 bg-primary/[0.02]")} onClick={() => toggleSelect(wine.id)}>
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center shrink-0 border border-black/5 overflow-hidden">
                                        {wine.image_url ? <img src={wine.image_url} className="w-full h-full object-cover" /> : <Package className="h-7 w-7 text-muted-foreground/50" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-[#0F0F14] truncate pr-2">{wine.name}</p>
                                            <Checkbox checked={selectedIds.includes(wine.id)} onClick={e => e.stopPropagation()} className="rounded-full h-5 w-5" />
                                        </div>
                                        <p className="text-[11px] font-bold text-primary/60">{wine.producer || "—"}</p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="text-sm font-black text-[#0F0F14]">{wine.quantity} UN</span>
                                            {renderStatusBadge(wine.quantity)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- BULK ACTIONS FLOATING BAR --- */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-[24px] bg-[#0F0F14] text-white shadow-float backdrop-blur-xl flex items-center gap-8 min-w-[380px] border border-white/10"
                    >
                        <div className="flex items-center gap-3 pr-6 border-r border-white/15">
                            <div className="w-6 h-6 rounded-full bg-[#8C2044] flex items-center justify-center text-[10px] font-black">{selectedIds.length}</div>
                            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/90">Selecionados</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <button className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:text-[#8C2044] transition-colors">
                                <Tag className="h-4 w-4" /> Tag
                            </button>
                            <button className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:text-[#8C2044] transition-colors">
                                <Download className="h-4 w-4" /> Exportar
                            </button>
                            <button onClick={handleDeleteSelected} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors">
                                <Trash2 className="h-4 w-4" /> Excluir
                            </button>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-white/10 rounded-full ml-2 text-white/40 hover:text-white"
                            onClick={() => setSelectedIds([])}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- FILTER DRAWER --- */}
            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetContent className="w-[320px] sm:w-[400px] p-0 flex flex-col bg-sidebar border-l border-white/10">
                    <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />

                    <SheetHeader className="p-6 pb-4 relative z-10">
                        <SheetTitle className="font-serif text-2xl font-black italic text-gradient-wine">Filtros Avançados</SheetTitle>
                        <SheetDescription className="text-[13px] font-medium">Refine sua listagem de estoque</SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-6 relative z-10">
                        <div className="space-y-8 pb-8">

                            {/* Search */}
                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Buscar</label>
                                <Input
                                    placeholder="Nome, produtor..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="h-10 rounded-xl bg-background border-white/10"
                                />
                            </div>

                            {/* Status */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status de Estoque</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "all", label: "Todos" },
                                        { id: "in-stock", label: "Em estoque" },
                                        { id: "low", label: "Baixo" },
                                        { id: "out", label: "Esgotado" },
                                        { id: "drink-now", label: "Beber agora" },
                                        { id: "aging", label: "Em guarda" }
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            className={cn(
                                                "h-10 text-[12px] font-bold rounded-xl border border-white/10 transition-all text-left px-3",
                                                statusFilter === s.id ? "bg-primary text-white border-primary shadow-sm" : "bg-background hover:border-primary/20"
                                            )}
                                            onClick={() => updateParam("status", s.id === "all" ? null : s.id)}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Wine Style */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Estilos de Vinho</label>
                                <div className="flex flex-wrap gap-2">
                                    {STYLES.map(s => (
                                        <Badge
                                            key={s}
                                            variant={styleFilters.includes(s) ? "default" : "outline"}
                                            className={cn("h-8 rounded-lg px-3 cursor-pointer select-none transition-all", !styleFilters.includes(s) && "bg-background hover:bg-muted/50")}
                                            onClick={() => updateParam("style", s, true)}
                                        >
                                            {s}
                                            {styleFilters.includes(s) && <Check className="ml-1.5 h-3 w-3" />}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Sort */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ordenação</label>
                                <div className="space-y-2">
                                    {[
                                        { id: "name", label: "Nome" },
                                        { id: "producer", label: "Produtor" },
                                        { id: "vintage", label: "Safra" },
                                        { id: "quantity", label: "Quantidade" },
                                        { id: "purchase_price", label: "Preço" },
                                        { id: "updated_at", label: "Atualização" }
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            className={cn(
                                                "w-full h-9 flex items-center justify-between text-[13px] font-medium rounded-xl px-3 transition-colors",
                                                sortKey === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                                            )}
                                            onClick={() => updateParam("sort", s.id)}
                                        >
                                            {s.label}
                                            {sortKey === s.id && (
                                                <ArrowUpDown
                                                    className={cn("h-3 w-3", sortOrder === "desc" && "rotate-180")}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateParam("order", sortOrder === "asc" ? "desc" : "asc");
                                                    }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t border-white/10 bg-sidebar relative z-10 flex gap-3">
                        <Button variant="outline" className="flex-1 rounded-2xl h-11 text-[13px] font-bold" onClick={clearAllFilters}>Limpar Filtros</Button>
                        <Button variant="premium" className="flex-1 rounded-2xl h-11 text-[13px] font-bold" onClick={() => setFilterOpen(false)}>Ver Resultados</Button>
                    </div>
                </SheetContent>
            </Sheet>

        </div>
    );
}
