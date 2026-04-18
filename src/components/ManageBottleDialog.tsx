import { useState, useMemo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wine as WineIcon, Check, Search, X, Filter, Camera, Plus, Trash2, Star } from "@/icons/lucide";
import { useAuth } from "@/contexts/AuthContext";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ScanWineLabelDialog } from "@/components/ScanWineLabelDialog";

interface ManageBottleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "add" | "open" | "exit";
}

interface ConsumptionItem {
  id: string;
  source: "cellar" | "external";
  wineId?: string;
  wineName: string;
  producer?: string;
  country?: string;
  region?: string;
  grape?: string;
  style?: string;
  vintage?: string;
  location?: string;
  quantity: number;
  notes?: string;
  rating?: number;
}

let itemCounter = 0;

// Wine type color dot — consistent with the rest of the app
const wineTypeColor = (style?: string | null): string => {
  if (!style) return "#9CA3AF";
  const s = style.toLowerCase();
  if (s.includes("tinto") || s.includes("red")) return "#7B1E2B";
  if (s.includes("branco") || s.includes("white")) return "#D4B86A";
  if (s.includes("rosé") || s.includes("rose")) return "#E8A4A4";
  if (s.includes("espumante") || s.includes("sparkling") || s.includes("champagne")) return "#A8C49A";
  if (s.includes("sobremesa") || s.includes("fortificado")) return "#8B5A2B";
  return "#9CA3AF";
};

const RATING_LABELS: Record<number, string> = {
  1: "Ruim", 2: "Regular", 3: "Bom", 4: "Muito bom", 5: "Excelente",
};

export function ManageBottleDialog({ open, onOpenChange }: ManageBottleDialogProps) {
  const { profileType } = useAuth();
  const [items, setItems] = useState<ConsumptionItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [source, setSource] = useState<"cellar" | "external">("cellar");
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [styleFilter, setStyleFilter] = useState<"all" | "tinto" | "branco" | "rose" | "espumante" | "sobremesa">("all");

  const [extWineName, setExtWineName] = useState("");
  const [extProducer, setExtProducer] = useState("");
  const [extCountry, setExtCountry] = useState("");
  const [extRegion, setExtRegion] = useState("");
  const [extGrape, setExtGrape] = useState("");
  const [extStyle, setExtStyle] = useState("");
  const [extVintage, setExtVintage] = useState("");
  const [extLocation, setExtLocation] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [rating, setRating] = useState(0);

  const { data: wines } = useWines();
  const wineEvent = useWineEvent();
  const addConsumption = useAddConsumption();
  const { toast } = useToast();

  const resetCurrentItem = () => {
    setWineId(""); setQuantity("1"); setNotes(""); setSearchText("");
    setShowFilters(false); setSelectedCountries([]); setSelectedGrapes([]);
    setExtWineName(""); setExtProducer(""); setExtCountry(""); setExtRegion("");
    setExtGrape(""); setExtStyle(""); setExtVintage(""); setExtLocation("");
    setRating(0);
  };

  const resetAll = () => {
    resetCurrentItem();
    setItems([]); setSuccess(null); setSubmitting(false);
    setSource("cellar");
  };

  const handleScanComplete = (data: any) => {
    if (data.name) setExtWineName(data.name);
    if (data.producer) setExtProducer(data.producer);
    if (data.country) setExtCountry(data.country);
    if (data.region) setExtRegion(data.region);
    if (data.grape) setExtGrape(data.grape);
    if (data.style) setExtStyle(data.style);
    if (data.vintage) setExtVintage(String(data.vintage));
  };

  const addItemToList = () => {
    if (source === "cellar") {
      if (!wineId) return;
      const wine = wines?.find(w => w.id === wineId);
      if (!wine) return;
      setItems(prev => [...prev, {
        id: `item-${++itemCounter}`,
        source: "cellar",
        wineId,
        wineName: wine.name,
        producer: wine.producer || undefined,
        country: wine.country || undefined,
        region: wine.region || undefined,
        grape: wine.grape || undefined,
        style: wine.style || undefined,
        vintage: wine.vintage ? String(wine.vintage) : undefined,
        quantity: parseInt(quantity) || 1,
        notes: notes || undefined,
        rating: rating > 0 ? rating : undefined,
      }]);
    } else {
      if (!extWineName.trim()) {
        toast({ title: "Informe o nome do vinho", variant: "destructive" });
        return;
      }
      setItems(prev => [...prev, {
        id: `item-${++itemCounter}`,
        source: "external",
        wineName: extWineName.trim(),
        producer: extProducer || undefined,
        country: extCountry || undefined,
        region: extRegion || undefined,
        grape: extGrape || undefined,
        style: extStyle || undefined,
        vintage: extVintage || undefined,
        location: extLocation || undefined,
        quantity: parseInt(quantity) || 1,
        notes: notes || undefined,
        rating: rating > 0 ? rating : undefined,
      }]);
    }
    resetCurrentItem();
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmitAll = async () => {
    if (items.length === 0) return;
    setSubmitting(true);

    try {
      for (const item of items) {
        if (item.source === "cellar" && item.wineId) {
          await wineEvent.mutateAsync({
            wineId: item.wineId,
            eventType: "open",
            quantity: item.quantity,
            notes: item.notes,
          });
        }

        await addConsumption.mutateAsync({
          source: item.source,
          wine_id: item.wineId || null,
          wine_name: item.wineName,
          producer: item.producer || null,
          country: item.country || null,
          region: item.region || null,
          grape: item.grape || null,
          style: item.style || null,
          vintage: item.vintage ? parseInt(item.vintage) : null,
          location: item.location || null,
          tasting_notes: item.notes || null,
          rating: item.rating || null,
          consumed_at: new Date().toISOString().split("T")[0],
        });
      }

      setSuccess(`${items.length} consumo(s) registrado(s) com sucesso!`);
      setTimeout(() => { resetAll(); onOpenChange(false); }, 1500);
    } catch {
      toast({ title: "Não conseguimos registrar os consumos", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  const baseWines = wines?.filter(w => w.quantity > 0) ?? [];

  const countries = useMemo(() =>
    [...new Set(baseWines.map(w => w.country).filter(Boolean) as string[])].sort(),
    [baseWines]
  );
  const grapesList = useMemo(() =>
    [...new Set(baseWines.map(w => w.grape).filter(Boolean) as string[])].sort(),
    [baseWines]
  );

  const filteredWines = useMemo(() => {
    return baseWines.filter(w => {
      if (searchText) {
        const q = searchText.toLowerCase();
        const match = w.name.toLowerCase().includes(q) ||
          w.producer?.toLowerCase().includes(q) ||
          w.grape?.toLowerCase().includes(q) ||
          w.country?.toLowerCase().includes(q) ||
          String(w.vintage).includes(q);
        if (!match) return false;
      }
      if (selectedCountries.length > 0 && (!w.country || !selectedCountries.includes(w.country))) return false;
      if (selectedGrapes.length > 0 && (!w.grape || !selectedGrapes.includes(w.grape))) return false;
      return true;
    });
  }, [baseWines, searchText, selectedCountries, selectedGrapes]);

  const selectedWine = wines?.find(w => w.id === wineId);
  const activeFilterCount = selectedCountries.length + selectedGrapes.length;

  const toggleFilter = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const canAddItem = source === "cellar" ? !!wineId : !!extWineName.trim();

  // Section label — matches Harmonização modal
  const SectionLabel = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3A3327]/55">
        {children}
      </span>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) resetAll(); onOpenChange(v); }}>
        <SheetContent
          className="w-full sm:max-w-[460px] overflow-y-auto bg-[#F4F1EC] border-l border-black/[0.04] p-0"
        >
          {/* Header — premium block icon + serif title */}
          <div className="px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
            <div className="flex items-start gap-3.5">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
                style={{ background: "rgba(123,30,43,0.08)" }}
              >
                <WineIcon className="h-5 w-5 text-[#7B1E2B]" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2
                  className="text-[26px] sm:text-[28px] font-semibold text-[#1A1713] leading-[1.15]"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif", letterSpacing: "-0.02em" }}
                >
                  Adicionar Consumo
                </h2>
                <p className="text-[13px] leading-relaxed text-[#3A3327]/60 mt-1">
                  Registre uma degustação da sua adega ou de um consumo externo
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-7 pb-8">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 gap-4"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(123,30,43,0.25)]"
                    style={{ background: "linear-gradient(135deg, #7B1E2B, #A12C3A)" }}
                  >
                    <Check className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-[14px] font-medium text-[#1A1713] text-center">{success}</p>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-5">
                  {/* Added items list */}
                  {items.length > 0 && (
                    <div className="space-y-2">
                      <SectionLabel>Vinhos adicionados ({items.length})</SectionLabel>
                      <div className="space-y-1.5">
                        {items.map(item => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] border border-black/[0.06] bg-white/70"
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: wineTypeColor(item.style) }}
                              aria-hidden
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-[#1A1713] truncate leading-tight">
                                {item.wineName}
                              </p>
                              <p className="text-[11px] text-[#3A3327]/60 mt-0.5">
                                {item.quantity} un.{item.rating ? ` · ${RATING_LABELS[item.rating]}` : ""}
                                {item.source === "external" ? " · Externo" : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[#3A3327]/50 hover:text-[#7B1E2B] hover:bg-[#7B1E2B]/8 transition-all duration-200"
                              aria-label="Remover item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ORIGEM — selectable cards */}
                  <div>
                    <SectionLabel>Origem</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: "cellar" as const, label: "Minha adega", desc: "Registrar abertura" },
                        { value: "external" as const, label: "Externo", desc: "Restaurante / outro" },
                      ]).map(opt => {
                        const active = source === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setSource(opt.value); setWineId(""); }}
                            className={cn(
                              "group relative text-left px-3.5 py-3 rounded-[14px] border transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                              active
                                ? "border-[#7B1E2B] bg-[rgba(123,30,43,0.05)] shadow-[0_4px_14px_-6px_rgba(123,30,43,0.25)]"
                                : "border-black/[0.08] bg-white/65 hover:bg-white hover:-translate-y-px",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-4 w-4 rounded-full border flex items-center justify-center transition-colors",
                                active ? "border-[#7B1E2B] bg-[#7B1E2B]" : "border-black/20 bg-white",
                              )}>
                                {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                              </div>
                              <span className={cn(
                                "text-[13px] font-semibold",
                                active ? "text-[#7B1E2B]" : "text-[#1A1713]",
                              )}>
                                {opt.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#3A3327]/55 mt-1 ml-6">{opt.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CELLAR: Wine selector */}
                  {source === "cellar" && (
                    <div>
                      <SectionLabel>Vinho</SectionLabel>
                      {selectedWine ? (
                        <div className="flex items-center gap-3 p-3 rounded-[14px] border border-[#7B1E2B]/25 bg-[rgba(123,30,43,0.04)]">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: wineTypeColor(selectedWine.style) }}
                            aria-hidden
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#1A1713] truncate leading-tight">{selectedWine.name}</p>
                            <p className="text-[11px] text-[#3A3327]/60 mt-0.5">
                              {[selectedWine.producer, selectedWine.vintage, selectedWine.country].filter(Boolean).join(" · ")} — {selectedWine.quantity} un.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setWineId("")}
                            className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[#3A3327]/55 hover:text-[#1A1713] hover:bg-black/[0.05] transition-all"
                            aria-label="Trocar vinho"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3A3327]/45" />
                            <Input
                              placeholder="Buscar por nome, uva, país, safra…"
                              value={searchText}
                              onChange={e => setSearchText(e.target.value)}
                              className="pl-11 pr-12 h-12 text-[13px] rounded-[14px] bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowFilters(!showFilters)}
                              className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200",
                                showFilters || activeFilterCount > 0
                                  ? "bg-[#7B1E2B]/10 text-[#7B1E2B]"
                                  : "text-[#3A3327]/55 hover:bg-black/[0.05]",
                              )}
                              aria-label="Filtros"
                            >
                              <Filter className="h-3.5 w-3.5" />
                              {activeFilterCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#7B1E2B] text-[9px] font-bold text-white flex items-center justify-center">
                                  {activeFilterCount}
                                </span>
                              )}
                            </button>
                          </div>

                          <AnimatePresence>
                            {showFilters && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-2.5 p-3 rounded-[14px] border border-black/[0.06] bg-white/60 backdrop-blur-sm">
                                  {countries.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-[#3A3327]/55 uppercase tracking-[0.12em] mb-1.5">País</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {countries.map(c => {
                                          const on = selectedCountries.includes(c);
                                          return (
                                            <button
                                              key={c}
                                              type="button"
                                              onClick={() => toggleFilter(c, selectedCountries, setSelectedCountries)}
                                              className={cn(
                                                "h-7 px-2.5 rounded-full text-[11px] font-medium border transition-all",
                                                on
                                                  ? "bg-[rgba(123,30,43,0.08)] border-[#7B1E2B] text-[#7B1E2B]"
                                                  : "bg-white/70 border-black/[0.08] text-[#3A3327] hover:bg-black/[0.04]",
                                              )}
                                            >{c}</button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {grapesList.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-[#3A3327]/55 uppercase tracking-[0.12em] mb-1.5">Uva</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {grapesList.map(g => {
                                          const on = selectedGrapes.includes(g);
                                          return (
                                            <button
                                              key={g}
                                              type="button"
                                              onClick={() => toggleFilter(g, selectedGrapes, setSelectedGrapes)}
                                              className={cn(
                                                "h-7 px-2.5 rounded-full text-[11px] font-medium border transition-all",
                                                on
                                                  ? "bg-[rgba(123,30,43,0.08)] border-[#7B1E2B] text-[#7B1E2B]"
                                                  : "bg-white/70 border-black/[0.08] text-[#3A3327] hover:bg-black/[0.04]",
                                              )}
                                            >{g}</button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {activeFilterCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedCountries([]); setSelectedGrapes([]); }}
                                      className="h-7 px-2.5 text-[11px] font-semibold text-[#7B1E2B] hover:bg-[#7B1E2B]/8 rounded-full transition-all"
                                    >
                                      Limpar filtros
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <ScrollArea className="max-h-[200px] rounded-[14px] border border-black/[0.06] bg-white/60">
                            {filteredWines.length === 0 ? (
                              <div className="px-4 py-8 text-center">
                                <p className="text-[12px] text-[#3A3327]/55">
                                  {baseWines.length === 0 ? "Nenhum vinho cadastrado" : "Nenhum vinho encontrado"}
                                </p>
                              </div>
                            ) : (
                              <div className="divide-y divide-black/[0.05]">
                                {filteredWines.map(w => (
                                  <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => setWineId(w.id)}
                                    className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-black/[0.03] transition-colors"
                                  >
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                                      style={{ background: wineTypeColor(w.style) }}
                                      aria-hidden
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[13px] font-semibold text-[#1A1713] truncate leading-tight">{w.name}</p>
                                      <p className="text-[11px] text-[#3A3327]/60 truncate mt-0.5">
                                        {[w.producer, w.vintage, w.grape, w.country].filter(Boolean).join(" · ")}
                                      </p>
                                    </div>
                                    <span className="text-[11px] font-semibold text-[#3A3327]/65 shrink-0">{w.quantity} un.</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                          <p className="text-[11px] text-[#3A3327]/50 px-1">{filteredWines.length} vinho(s) encontrado(s)</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EXTERNAL: Manual entry or scan */}
                  {source === "external" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3A3327]/55">
                          Dados do vinho
                        </span>
                        <button
                          type="button"
                          onClick={() => setScanOpen(true)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold text-[#7B1E2B] bg-[rgba(123,30,43,0.06)] hover:bg-[rgba(123,30,43,0.10)] transition-all"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Escanear rótulo
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={extWineName} onChange={e => setExtWineName(e.target.value)} placeholder="Nome do vinho *" className="col-span-2 h-11 text-[13px] rounded-[12px]" />
                        <Input value={extProducer} onChange={e => setExtProducer(e.target.value)} placeholder="Produtor" className="h-11 text-[13px] rounded-[12px]" />
                        <Input value={extVintage} onChange={e => setExtVintage(e.target.value)} placeholder="Safra" type="number" className="h-11 text-[13px] rounded-[12px]" />
                        <Input value={extCountry} onChange={e => setExtCountry(e.target.value)} placeholder="País" className="h-11 text-[13px] rounded-[12px]" />
                        <Input value={extRegion} onChange={e => setExtRegion(e.target.value)} placeholder="Região" className="h-11 text-[13px] rounded-[12px]" />
                        <Input value={extGrape} onChange={e => setExtGrape(e.target.value)} placeholder="Uva" className="h-11 text-[13px] rounded-[12px]" />
                        <Input value={extLocation} onChange={e => setExtLocation(e.target.value)} placeholder="Local (restaurante…)" className="h-11 text-[13px] rounded-[12px]" />
                      </div>
                    </div>
                  )}

                  {/* Quantidade + Observações — grouped block */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <SectionLabel>Quantidade</SectionLabel>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="h-11 text-[13px] rounded-[12px]"
                      />
                    </div>
                    <div>
                      <SectionLabel>Observações</SectionLabel>
                      <Input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Opcional…"
                        className="h-11 text-[13px] rounded-[12px]"
                      />
                    </div>
                  </div>

                  {/* Avaliação — premium star system (only personal) */}
                  {profileType !== "commercial" && (
                    <div>
                      <SectionLabel icon={<Star className="h-3 w-3 text-[#3A3327]/55" />}>Avaliação</SectionLabel>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(v => {
                            const filled = rating >= v;
                            return (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setRating(rating === v ? 0 : v)}
                                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/[0.04] transition-all duration-200"
                                aria-label={`${v} estrela${v > 1 ? "s" : ""}`}
                              >
                                <Star
                                  className={cn(
                                    "h-5 w-5 transition-all duration-200",
                                    filled ? "text-[#7B1E2B]" : "text-[#3A3327]/25",
                                  )}
                                  fill={filled ? "#7B1E2B" : "none"}
                                  strokeWidth={1.75}
                                />
                              </button>
                            );
                          })}
                        </div>
                        {rating > 0 && (
                          <span className="text-[12px] font-medium text-[#7B1E2B] ml-1">
                            {RATING_LABELS[rating]}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Add to list — secondary action */}
                  <button
                    type="button"
                    disabled={!canAddItem}
                    onClick={addItemToList}
                    className={cn(
                      "w-full h-11 rounded-[14px] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all duration-200",
                      canAddItem
                        ? "bg-white/70 border border-black/[0.08] text-[#1A1713] hover:bg-white hover:-translate-y-px"
                        : "bg-white/40 border border-dashed border-black/[0.10] text-[#3A3327]/40 cursor-not-allowed",
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar à lista
                  </button>

                  {/* PRIMARY — gradient wine button */}
                  <button
                    type="button"
                    disabled={submitting || items.length === 0}
                    onClick={handleSubmitAll}
                    className={cn(
                      "w-full h-[52px] rounded-[16px] text-white text-[15px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_10px_28px_-10px_rgba(123,30,43,0.5)]",
                      submitting || items.length === 0
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:-translate-y-px hover:shadow-[0_14px_32px_-10px_rgba(123,30,43,0.6)] active:translate-y-0",
                    )}
                    style={{
                      background: "linear-gradient(135deg, #7B1E2B 0%, #A12C3A 100%)",
                    }}
                  >
                    {submitting
                      ? "Salvando…"
                      : items.length === 0
                        ? "Adicione um vinho à lista"
                        : `Confirmar ${items.length} consumo${items.length > 1 ? "s" : ""}`}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>

      <ScanWineLabelDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScanComplete={handleScanComplete}
      />
    </>
  );
}
