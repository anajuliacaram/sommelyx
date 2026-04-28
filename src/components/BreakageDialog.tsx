import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Search, X, AlertTriangle } from "@/icons/lucide";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STOCK_AUDIT_REASONS, normalizeAuditName, normalizeAuditText } from "@/lib/stock-audit";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeWineSearchText } from "@/lib/wine-normalization";

interface BreakageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BreakageDialog({ open, onOpenChange }: BreakageDialogProps) {
  const { user } = useAuth();
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [responsibleName, setResponsibleName] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [searchText, setSearchText] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const { data: wines } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();

  const reset = () => {
    setWineId("");
    setQuantity("1");
    setResponsibleName("");
    setReason("");
    setNotes("");
    setSearchText("");
    setSuccess(null);
  };

  const winesInStock = useMemo(() => wines?.filter(w => w.quantity > 0) ?? [], [wines]);

  const filteredWines = useMemo(() => {
    if (!searchText) return winesInStock;
    const q = normalizeWineSearchText(searchText);
    return winesInStock.filter(w =>
      normalizeWineSearchText(w.name).includes(q) ||
      normalizeWineSearchText(w.producer).includes(q) ||
      normalizeWineSearchText(w.grape).includes(q) ||
      normalizeWineSearchText(w.country).includes(q) ||
      String(w.vintage ?? "").includes(q)
    );
  }, [winesInStock, searchText]);

  const selectedWine = wines?.find(w => w.id === wineId);

  // Ruptura: quando escolher um vinho, a ação deve zerar o estoque (quantidade = estoque atual).
  useEffect(() => {
    if (!selectedWine) return;
    setQuantity(String(selectedWine.quantity));
  }, [selectedWine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resp = normalizeAuditName(responsibleName);
    const rsn = normalizeAuditText(reason);
    const obs = normalizeAuditText(notes);
    if (!wineId || !resp || !rsn) return;
    if (rsn === "Outro" && !obs) return;

    const qty = selectedWine?.quantity ?? (parseInt(quantity) || 1);

    try {
      await wineEvent.mutateAsync({
        wineId,
        eventType: "stockout_registered",
        quantity: qty,
        notes: obs || undefined,
        responsibleName: resp,
        reason: rsn,
      });
      setSuccess(`Ruptura registrada: ${qty} garrafa(s) de ${selectedWine?.name ?? ""}`);
      setTimeout(() => { reset(); onOpenChange(false); }, 1500);
    } catch {
      toast({ title: "Não conseguimos registrar a ruptura", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Registrar Ruptura
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground">
            Antes de concluir, registre quem realizou a ação e o motivo para manter o histórico da operação.
          </p>
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
                              {winesInStock.length === 0 ? "Nenhum vinho disponível no estoque" : "Nenhum vinho encontrado"}
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

                {/* Quantity (ruptura zera o estoque) */}
                <div className="glass-card p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Resumo da ruptura
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">De</p>
                      <p className="text-[16px] font-black text-foreground">{selectedWine?.quantity ?? 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Para</p>
                      <p className="text-[16px] font-black text-foreground">0</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">Quantidade zerada</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      disabled
                      className="h-9 text-[12px] rounded-xl mt-1"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Ao confirmar, o estoque deste vinho será zerado e registrado no log.
                    </p>
                  </div>
                </div>

                {/* Audit */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome do responsável *</Label>
                    <Input
                      placeholder="Ex.: Ana / Equipe salão / Gerência"
                      value={responsibleName}
                      onChange={e => setResponsibleName(e.target.value)}
                      className="h-9 text-[12px] rounded-xl"
                      autoComplete="off"
                      onFocus={() => {
                        if (!responsibleName && typeof user?.user_metadata?.full_name === "string") {
                          setResponsibleName(String(user.user_metadata.full_name));
                        }
                      }}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Motivo da alteração *</Label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger className="h-9 rounded-xl">
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
                    <Label className="text-xs text-muted-foreground">
                      Observação complementar {reason === "Outro" ? "*" : "(opcional)"}
                    </Label>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Adicione contexto, se necessário"
                      required={reason === "Outro"}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="danger"
                  disabled={
                    wineEvent.isPending ||
                    !wineId ||
                    !normalizeAuditName(responsibleName) ||
                    !normalizeAuditText(reason) ||
                    (normalizeAuditText(reason) === "Outro" && !normalizeAuditText(notes))
                  }
                  className="w-full h-11 text-[13px] font-medium"
                >
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
