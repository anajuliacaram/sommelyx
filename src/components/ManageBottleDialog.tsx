import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Wine as WineIcon, Check, Search, X, Filter, Camera, Plus, Trash2, Star } from "lucide-react";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
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

export function ManageBottleDialog({ open, onOpenChange }: ManageBottleDialogProps) {
  const [items, setItems] = useState<ConsumptionItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Current item being added
  const [source, setSource] = useState<"cellar" | "external">("cellar");
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);

  // External fields
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
          rating: null,
          consumed_at: new Date().toISOString().split("T")[0],
        });
      }

      setSuccess(`${items.length} consumo(s) registrado(s) com sucesso!`);
      setTimeout(() => { resetAll(); onOpenChange(false); }, 1500);
    } catch {
      toast({ title: "Erro ao registrar consumos", variant: "destructive" });
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

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) resetAll(); onOpenChange(v); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
          <SheetHeader>
            <SheetTitle className="font-serif text-lg flex items-center gap-2">
              <WineIcon className="h-5 w-5 text-primary" />
              Adicionar Consumo
            </SheetTitle>
          </SheetHeader>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <div className="w-14 h-14 rounded-full gradient-wine flex items-center justify-center glow-wine">
                  <Check className="h-7 w-7 text-primary-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground text-center">{success}</p>
              </motion.div>
            ) : (
              <motion.div key="form" className="mt-5 space-y-4">
                {/* Added items list */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Vinhos adicionados ({items.length})
                    </Label>
                    <div className="space-y-1.5">
                      {items.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-accent/30"
                        >
                          <Badge variant={item.source === "cellar" ? "default" : "secondary"} className="text-[8px] shrink-0 h-5">
                            {item.source === "cellar" ? "Adega" : "Ext."}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-foreground truncate">{item.wineName}</p>
                            <p className="text-[9px] text-muted-foreground">{item.quantity} un.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider if items exist */}
                {items.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Adicionar mais</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                )}

                {/* Source checkbox */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={source === "cellar"} onCheckedChange={() => { setSource("cellar"); setWineId(""); }} />
                      <span className="text-sm">Minha adega</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={source === "external"} onCheckedChange={() => { setSource("external"); setWineId(""); }} />
                      <span className="text-sm">Externo</span>
                    </label>
                  </div>
                </div>

                {/* CELLAR: Wine selector */}
                {source === "cellar" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Vinho</Label>
                    {selectedWine ? (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/5">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground truncate">{selectedWine.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {[selectedWine.producer, selectedWine.vintage, selectedWine.country].filter(Boolean).join(" · ")} — {selectedWine.quantity} un.
                          </p>
                        </div>
                        <button type="button" onClick={() => setWineId("")} className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nome, uva, país, safra..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            className="pl-9 h-9 text-[12px] rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                              showFilters || activeFilterCount > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                            )}
                          >
                            <Filter className="h-3.5 w-3.5" />
                            {activeFilterCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">
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
                              className="overflow-hidden space-y-2"
                            >
                              {countries.length > 0 && (
                                <div>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">País</p>
                                  <div className="flex flex-wrap gap-1">
                                    {countries.map(c => (
                                      <Badge
                                        key={c}
                                        variant={selectedCountries.includes(c) ? "default" : "outline"}
                                        className={cn("text-[10px] cursor-pointer transition-all h-6", selectedCountries.includes(c) ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                                        onClick={() => toggleFilter(c, selectedCountries, setSelectedCountries)}
                                      >{c}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {grapesList.length > 0 && (
                                <div>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Uva</p>
                                  <div className="flex flex-wrap gap-1">
                                    {grapesList.map(g => (
                                      <Badge
                                        key={g}
                                        variant={selectedGrapes.includes(g) ? "default" : "outline"}
                                        className={cn("text-[10px] cursor-pointer transition-all h-6", selectedGrapes.includes(g) ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                                        onClick={() => toggleFilter(g, selectedGrapes, setSelectedGrapes)}
                                      >{g}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {activeFilterCount > 0 && (
                                <button type="button" onClick={() => { setSelectedCountries([]); setSelectedGrapes([]); }} className="text-[10px] font-medium text-primary hover:underline">
                                  Limpar filtros
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <ScrollArea className="max-h-[180px] rounded-xl border border-border/50">
                          {filteredWines.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                              <p className="text-[11px] text-muted-foreground">
                                {baseWines.length === 0 ? "Nenhum vinho cadastrado" : "Nenhum vinho encontrado"}
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border/30">
                              {filteredWines.map(w => (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => setWineId(w.id)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-foreground truncate">{w.name}</p>
                                    <p className="text-[9px] text-muted-foreground truncate">
                                      {[w.producer, w.vintage, w.grape, w.country].filter(Boolean).join(" · ")}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">{w.quantity} un.</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                        <p className="text-[9px] text-muted-foreground">{filteredWines.length} vinho(s) encontrado(s)</p>
                      </div>
                    )}
                  </div>
                )}

                {/* EXTERNAL: Manual entry or scan */}
                {source === "external" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Dados do vinho</Label>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1.5" onClick={() => setScanOpen(true)}>
                        <Camera className="h-3 w-3" />
                        Escanear Rótulo
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="col-span-2">
                        <Input value={extWineName} onChange={e => setExtWineName(e.target.value)} placeholder="Nome do vinho *" className="h-9 text-[12px] rounded-xl" />
                      </div>
                      <Input value={extProducer} onChange={e => setExtProducer(e.target.value)} placeholder="Produtor" className="h-9 text-[12px] rounded-xl" />
                      <Input value={extVintage} onChange={e => setExtVintage(e.target.value)} placeholder="Safra" type="number" className="h-9 text-[12px] rounded-xl" />
                      <Input value={extCountry} onChange={e => setExtCountry(e.target.value)} placeholder="País" className="h-9 text-[12px] rounded-xl" />
                      <Input value={extRegion} onChange={e => setExtRegion(e.target.value)} placeholder="Região" className="h-9 text-[12px] rounded-xl" />
                      <Input value={extGrape} onChange={e => setExtGrape(e.target.value)} placeholder="Uva" className="h-9 text-[12px] rounded-xl" />
                      <Input value={extLocation} onChange={e => setExtLocation(e.target.value)} placeholder="Local (restaurante...)" className="h-9 text-[12px] rounded-xl" />
                    </div>
                  </div>
                )}

                {/* Quantity & notes for current item */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-xs text-muted-foreground">Quantidade</Label>
                    <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-9 text-[12px] rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional..." className="h-9 text-[12px] rounded-xl" />
                  </div>
                </div>

                {/* Add to list button */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAddItem}
                  onClick={addItemToList}
                  className="w-full h-10 text-[12px] font-semibold gap-1.5 border-dashed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar à lista
                </Button>

                {/* Submit all */}
                <Button
                  type="button"
                  disabled={submitting || items.length === 0}
                  onClick={handleSubmitAll}
                  className="w-full gradient-wine text-primary-foreground btn-glow h-11 text-[13px] font-medium"
                >
                  {submitting ? "Salvando..." : `Confirmar ${items.length} consumo(s)`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
