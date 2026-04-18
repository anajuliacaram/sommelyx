import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Search, X, Plus, Trash2, ShoppingCart } from "@/icons/lucide";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Wine } from "@/hooks/useWines";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STOCK_AUDIT_REASONS, normalizeAuditName, normalizeAuditText } from "@/lib/stock-audit";
import { useAuth } from "@/contexts/AuthContext";
import { useWineLocations } from "@/hooks/useWineLocations";

interface SaleItem {
  id: string;
  wineId: string;
  wineName: string;
  wineDetails: string; // producer · vintage · grape · country
  quantity: number;
  unitPrice: number;
  locationId: string;
}

interface SaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDialog({ open, onOpenChange }: SaleDialogProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [reason, setReason] = useState("Venda");
  const [auditNotes, setAuditNotes] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wine picker state
  const [pickingItem, setPickingItem] = useState(false);
  const [searchText, setSearchText] = useState("");

  const { data: wines } = useWines();
  const { data: allLocations } = useWineLocations();
  const wineEvent = useWineEvent();
  const { toast } = useToast();

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const reset = () => {
    setItems([]);
    setCustomer("");
    setResponsibleName("");
    setReason("Venda");
    setAuditNotes("");
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
    const defaultLocId = allLocations?.find((l) => l.wine_id === wine.id)?.id ?? "";
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
        locationId: defaultLocId,
      }]);
    }
    setPickingItem(false);
    setSearchText("");
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const updateItem = (id: string, field: "quantity" | "unitPrice" | "locationId", value: number | string) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    const resp = normalizeAuditName(responsibleName);
    const rsn = normalizeAuditText(reason);
    const obs = normalizeAuditText(auditNotes);
    if (!resp || !rsn) return;
    if (rsn === "Outro" && !obs) return;
    setIsSubmitting(true);

    try {
      // Register exit event for each item (decreases stock)
      for (const item of items) {
        if (!item.locationId) throw new Error("Selecione a localização para registrar a venda.");
        await wineEvent.mutateAsync({
          wineId: item.wineId,
          eventType: "exit",
          quantity: item.quantity,
          notes: [
            customer ? `Cliente: ${customer}` : null,
            obs ? `Obs: ${obs}` : null,
            `R$ ${item.unitPrice.toFixed(2)} × ${item.quantity} = R$ ${(item.unitPrice * item.quantity).toFixed(2)}`,
          ].filter(Boolean).join(" | "),
          responsibleName: resp,
          reason: rsn,
          locationId: item.locationId,
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/20 to-[#C8A96A]/20">
              <ShoppingCart className="h-5 w-5 text-[#7B1E2B]" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle>Registrar venda</SheetTitle>
              <SheetDescription>{today}</SheetDescription>
            </div>
          </div>
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
            <motion.div key="form" className="mt-1 flex flex-col gap-5">
              <div className="rounded-2xl border border-black/5 bg-white p-4 space-y-3">
                <p className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">
                  Auditoria da operação
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>Nome do responsável *</Label>
                    <Input
                      placeholder="Ex.: Ana / Equipe salão / Gerência"
                      value={responsibleName}
                      onChange={e => setResponsibleName(e.target.value)}
                      autoComplete="off"
                      onFocus={() => {
                        if (!responsibleName && typeof user?.user_metadata?.full_name === "string") {
                          setResponsibleName(String(user.user_metadata.full_name));
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Motivo *</Label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {STOCK_AUDIT_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>
                        Observação {reason === "Outro" ? "*" : "(opcional)"}
                      </Label>
                      <Input
                        placeholder="Ex.: mesa 14 / jantar harmonizado"
                        value={auditNotes}
                        onChange={(e) => setAuditNotes(e.target.value)}
                        required={reason === "Outro"}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div>
                <Label>Cliente</Label>
                <Input
                  placeholder="Nome do cliente (opcional)"
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                />
              </div>

              {/* Items list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">Itens da venda</Label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-xl px-3.5"
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
                          className="pl-9 rounded-xl"
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
                              <Button
                                key={w.id}
                                type="button"
                                variant="ghost"
                                onClick={() => addItem(w)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-none h-auto justify-start hover:bg-muted/40"
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
                              </Button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setPickingItem(false); setSearchText(""); }}
                        className="rounded-lg px-2 font-medium"
                      >
                        Cancelar
                      </Button>
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
                  <div key={item.id} className="rounded-2xl border border-black/5 bg-white p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground truncate">{item.wineName}</p>
                        {item.wineDetails && <p className="text-[9px] text-muted-foreground truncate">{item.wineDetails}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 h-9 w-9 rounded-full bg-black/5 text-[#6B6B6B] hover:bg-black/10 hover:text-[#1A1A1A]"
                        aria-label="Remover item"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                        />
                      </div>
                    <div>
                      <Label>Preço unit. (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Localização (obrigatório)</Label>
                      <Select
                        value={item.locationId}
                        onValueChange={(v) => updateItem(item.id, "locationId", v)}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {(allLocations ?? [])
                            .filter((l) => l.wine_id === item.wineId)
                            .map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {(l.formatted_label ?? l.manual_label ?? "Sem localização")} • {l.quantity} un.
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                disabled={
                  isSubmitting ||
                    items.length === 0 ||
                    !items.every((i) => !!i.locationId) ||
                    !normalizeAuditName(responsibleName) ||
                  !normalizeAuditText(reason) ||
                  (normalizeAuditText(reason) === "Outro" && !normalizeAuditText(auditNotes))
                }
                variant="primary"
                className="w-full"
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
