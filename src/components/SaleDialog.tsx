import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Search, X, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Wine } from "@/hooks/useWines";

interface SaleItem {
  id: string;
  wineId: string;
  wineName: string;
  wineDetails: string; // producer · vintage · grape · country
  quantity: number;
  unitPrice: number;
}

interface SaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDialog({ open, onOpenChange }: SaleDialogProps) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wine picker state
  const [pickingItem, setPickingItem] = useState(false);
  const [searchText, setSearchText] = useState("");

  const { data: wines } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const reset = () => {
    setItems([]);
    setCustomer("");
    setSuccess(null);
    setPickingItem(false);
    setSearchText("");
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

  const addItem = (wine: Wine) => {
    const existing = items.find(i => i.wineId === wine.id);
    if (existing) {
      setItems(items.map(i => i.wineId === wine.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      const details = [wine.producer, wine.vintage, wine.grape, wine.country].filter(Boolean).join(" · ");
      setItems([...items, {
        id: crypto.randomUUID(),
        wineId: wine.id,
        wineName: wine.name,
        wineDetails: details,
        quantity: 1,
        unitPrice: wine.current_value ?? wine.purchase_price ?? 0,
      }]);
    }
    setPickingItem(false);
    setSearchText("");
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const updateItem = (id: string, field: "quantity" | "unitPrice", value: number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      // Register exit event for each item (decreases stock)
      for (const item of items) {
        await wineEvent.mutateAsync({
          wineId: item.wineId,
          eventType: "exit",
          quantity: item.quantity,
          notes: `[VENDA] Cliente: ${customer || "N/A"} | R$ ${item.unitPrice.toFixed(2)} × ${item.quantity} = R$ ${(item.unitPrice * item.quantity).toFixed(2)}`,
        });
      }

      // Save sale to localStorage for SalesPage history
      const STORAGE_KEY = "sommelyx_sales";
      const existing = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } })();
      const newSales = items.map(item => ({
        id: crypto.randomUUID(),
        wineName: item.wineName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        customer: customer.trim(),
        date: new Date().toISOString(),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSales, ...existing]));

      setSuccess(`Venda registrada! ${items.length} item(ns), total R$ ${totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      setTimeout(() => { reset(); onOpenChange(false); }, 1800);
    } catch {
      toast({ title: "Erro ao registrar venda", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Registrar Venda
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground">{today}</p>
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
              {/* Customer */}
              <div>
                <Label className="text-xs text-muted-foreground">Cliente</Label>
                <Input
                  placeholder="Nome do cliente (opcional)"
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  className="h-9 text-[12px]"
                />
              </div>

              {/* Items list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Itens da venda</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 rounded-lg"
                    onClick={() => setPickingItem(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar item
                  </Button>
                </div>

                {/* Wine picker */}
                <AnimatePresence>
                  {pickingItem && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-2"
                    >
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar vinho..."
                          value={searchText}
                          onChange={e => setSearchText(e.target.value)}
                          className="pl-9 h-9 text-[12px] rounded-xl"
                          autoFocus
                        />
                      </div>
                      <ScrollArea className="max-h-[150px] rounded-xl border border-border/50">
                        {filteredWines.length === 0 ? (
                          <div className="px-3 py-4 text-center">
                            <p className="text-[11px] text-muted-foreground">Nenhum vinho encontrado</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-border/30">
                            {filteredWines.map(w => (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => addItem(w)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-foreground truncate">{w.name}</p>
                                  <p className="text-[9px] text-muted-foreground truncate">
                                    {[w.producer, w.vintage, w.grape, w.country].filter(Boolean).join(" · ")}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-bold text-muted-foreground">{w.quantity} un.</span>
                                  {(w.current_value ?? w.purchase_price) ? (
                                    <p className="text-[9px] text-muted-foreground">R$ {(w.current_value ?? w.purchase_price ?? 0).toLocaleString("pt-BR")}</p>
                                  ) : null}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                      <button
                        type="button"
                        onClick={() => { setPickingItem(false); setSearchText(""); }}
                        className="text-[10px] text-muted-foreground hover:underline"
                      >
                        Cancelar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Added items */}
                {items.length === 0 && !pickingItem && (
                  <div className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center">
                    <p className="text-[11px] text-muted-foreground">Nenhum item adicionado</p>
                  </div>
                )}

                {items.map(item => (
                  <div key={item.id} className="rounded-xl border border-border/50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-semibold text-foreground flex-1 truncate">{item.wineName}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[9px] text-muted-foreground">Qtd</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                          className="h-8 text-[11px]"
                        />
                      </div>
                      <div>
                        <Label className="text-[9px] text-muted-foreground">Preço unit. (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="h-8 text-[11px]"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-right text-muted-foreground">
                      Subtotal: <span className="font-bold text-foreground">R$ {(item.quantity * item.unitPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              {items.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-[12px] font-bold text-foreground">Total da venda</span>
                  <span className="text-[16px] font-black text-foreground">
                    R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || items.length === 0}
                className="w-full gradient-wine text-primary-foreground btn-glow h-11 text-[13px] font-medium"
              >
                {isSubmitting ? "Registrando..." : "Confirmar Venda"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
