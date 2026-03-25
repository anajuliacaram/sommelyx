import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Wine as WineIcon, Check, Search, X, Filter } from "lucide-react";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ManageBottleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "add" | "open" | "exit";
}

export function ManageBottleDialog({ open, onOpenChange }: ManageBottleDialogProps) {
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [source, setSource] = useState<"cellar" | "external">("cellar");

  const { data: wines } = useWines();
  const wineEvent = useWineEvent();
  const addConsumption = useAddConsumption();
  const { toast } = useToast();

  const reset = () => {
    setWineId(""); setQuantity("1"); setNotes(""); setSuccess(null);
    setSearchText(""); setSelectedCountries([]); setSelectedGrapes([]); setShowFilters(false);
    setSource("cellar");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wineId) return;

    const wine = wines?.find(w => w.id === wineId);
    const qty = parseInt(quantity) || 1;

    try {
      // Register the open event (reduces stock)
      await wineEvent.mutateAsync({ wineId, eventType: "open", quantity: qty, notes: notes || undefined });

      // Also log to consumption
      if (wine) {
        await addConsumption.mutateAsync({
          source,
          wine_id: wineId,
          wine_name: wine.name,
          producer: wine.producer || null,
          country: wine.country || null,
          region: wine.region || null,
          grape: wine.grape || null,
          style: wine.style || null,
          vintage: wine.vintage || null,
          location: null,
          tasting_notes: notes || null,
          rating: null,
          consumed_at: new Date().toISOString().split("T")[0],
        });
      }

      setSuccess(`${quantity} garrafa(s) registrada(s) como aberta(s). ${wine?.name ?? ""}`);
      setTimeout(() => { reset(); onOpenChange(false); }, 1500);
    } catch {
      toast({ title: "Erro ao registrar ação", variant: "destructive" });
    }
  };

  const baseWines = wines?.filter(w => w.quantity > 0) ?? [];

  const countries = useMemo(() =>
    [...new Set(baseWines.map(w => w.country).filter(Boolean) as string[])].sort(),
    [baseWines]
  );
  const grapes = useMemo(() =>
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

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
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
            <motion.div key="form" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Source checkbox */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Origem do consumo</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={source === "cellar"}
                        onCheckedChange={() => setSource("cellar")}
                      />
                      <span className="text-sm">Minha adega</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={source === "external"}
                        onCheckedChange={() => setSource("external")}
                      />
                      <span className="text-sm">Externo</span>
                    </label>
                  </div>
                </div>

                {/* Wine selector with search & filters */}
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
                                      className={cn(
                                        "text-[10px] cursor-pointer transition-all h-6",
                                        selectedCountries.includes(c) ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                                      )}
                                      onClick={() => toggleFilter(c, selectedCountries, setSelectedCountries)}
                                    >
                                      {c}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {grapes.length > 0 && (
                              <div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Uva</p>
                                <div className="flex flex-wrap gap-1">
                                  {grapes.map(g => (
                                    <Badge
                                      key={g}
                                      variant={selectedGrapes.includes(g) ? "default" : "outline"}
                                      className={cn(
                                        "text-[10px] cursor-pointer transition-all h-6",
                                        selectedGrapes.includes(g) ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                                      )}
                                      onClick={() => toggleFilter(g, selectedGrapes, setSelectedGrapes)}
                                    >
                                      {g}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {activeFilterCount > 0 && (
                              <button
                                type="button"
                                onClick={() => { setSelectedCountries([]); setSelectedGrapes([]); }}
                                className="text-[10px] font-medium text-primary hover:underline"
                              >
                                Limpar filtros
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <ScrollArea className="max-h-[200px] rounded-xl border border-border/50">
                        {filteredWines.length === 0 ? (
                          <div className="px-3 py-6 text-center">
                            <p className="text-[11px] text-muted-foreground">
                              {baseWines.length === 0 ? "Nenhum vinho cadastrado" : "Nenhum vinho encontrado com esses filtros"}
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

                <div>
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Observações (opcional)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ocasião, impressões..." />
                </div>

                <Button
                  type="submit"
                  disabled={wineEvent.isPending || addConsumption.isPending || !wineId}
                  className="w-full gradient-wine text-primary-foreground btn-glow h-11 text-[13px] font-medium"
                >
                  {wineEvent.isPending || addConsumption.isPending ? "Salvando..." : "Confirmar"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
