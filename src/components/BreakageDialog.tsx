import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Search, X, AlertTriangle } from "lucide-react";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BreakageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BreakageDialog({ open, onOpenChange }: BreakageDialogProps) {
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [justification, setJustification] = useState("");
  const [occurrenceDate, setOccurrenceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchText, setSearchText] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const { data: wines } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();

  const reset = () => {
    setWineId("");
    setQuantity("1");
    setJustification("");
    setOccurrenceDate(new Date().toISOString().split("T")[0]);
    setSearchText("");
    setSuccess(null);
  };

  const winesInStock = useMemo(() => wines?.filter(w => w.quantity > 0) ?? [], [wines]);

  const filteredWines = useMemo(() => {
    if (!searchText) return winesInStock;
    const q = searchText.toLowerCase();
    return winesInStock.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.producer?.toLowerCase().includes(q) ||
      w.grape?.toLowerCase().includes(q) ||
      w.country?.toLowerCase().includes(q) ||
      String(w.vintage).includes(q)
    );
  }, [winesInStock, searchText]);

  const selectedWine = wines?.find(w => w.id === wineId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wineId || !justification.trim()) return;

    const qty = parseInt(quantity) || 1;
    const noteText = `[RUPTURA ${occurrenceDate}] ${justification.trim()}`;

    try {
      await wineEvent.mutateAsync({
        wineId,
        eventType: "exit",
        quantity: qty,
        notes: noteText,
      });
      setSuccess(`Ruptura registrada: ${qty} garrafa(s) de ${selectedWine?.name ?? ""}`);
      setTimeout(() => { reset(); onOpenChange(false); }, 1500);
    } catch {
      toast({ title: "Erro ao registrar ruptura", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Registrar Ruptura
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
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <Check className="h-7 w-7 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground text-center">{success}</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Wine selector - simple */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Selecionar vinho</Label>

                  {selectedWine ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-destructive/20 bg-destructive/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{selectedWine.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {[selectedWine.producer, selectedWine.vintage, selectedWine.country].filter(Boolean).join(" · ")} — {selectedWine.quantity} un. em estoque
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setWineId("")} className="shrink-0 h-6 w-6 rounded-lg">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar vinho..."
                          value={searchText}
                          onChange={e => setSearchText(e.target.value)}
                          className="pl-9 h-9 text-[12px] rounded-xl"
                        />
                      </div>

                      <ScrollArea className="max-h-[180px] rounded-xl border border-border/50">
                        {filteredWines.length === 0 ? (
                          <div className="px-3 py-6 text-center">
                            <p className="text-[11px] text-muted-foreground">
                              {winesInStock.length === 0 ? "Nenhum vinho em estoque" : "Nenhum vinho encontrado"}
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border/30">
                            {filteredWines.map(w => (
                              <Button
                                key={w.id}
                                type="button"
                                variant="ghost"
                                onClick={() => setWineId(w.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-none h-auto justify-start hover:bg-muted/40"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-foreground truncate">{w.name}</p>
                                  <p className="text-[9px] text-muted-foreground truncate">
                                    {[w.producer, w.vintage, w.grape, w.country].filter(Boolean).join(" · ")}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground shrink-0">{w.quantity} un.</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <Label className="text-xs text-muted-foreground">Quantidade perdida</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedWine?.quantity ?? 999}
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>

                {/* Date */}
                <div>
                  <Label className="text-xs text-muted-foreground">Quando ocorreu</Label>
                  <Input
                    type="date"
                    value={occurrenceDate}
                    onChange={e => setOccurrenceDate(e.target.value)}
                  />
                </div>

                {/* Justification - required */}
                <div>
                  <Label className="text-xs text-muted-foreground">Justificativa *</Label>
                  <Textarea
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    rows={3}
                    placeholder="Descreva o motivo da ruptura (ex: garrafa quebrada, vinho estragado, furto...)"
                    required
                  />
                </div>

                <Button type="submit" variant="danger" disabled={wineEvent.isPending || !wineId || !justification.trim()} className="w-full h-11 text-[13px] font-medium">
                  {wineEvent.isPending ? "Registrando..." : "Confirmar Ruptura"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
