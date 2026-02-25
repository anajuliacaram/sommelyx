import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wine as WineIcon, ArrowDownRight, Check } from "lucide-react";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ManageBottleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "add" | "open" | "exit";
}

export function ManageBottleDialog({ open, onOpenChange, defaultTab = "open" }: ManageBottleDialogProps) {
  const [tab, setTab] = useState(defaultTab);
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const { data: wines } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();

  const reset = () => {
    setWineId(""); setQuantity("1"); setNotes(""); setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wineId) return;

    const eventType = tab === "add" ? "add" : tab === "open" ? "open" : "exit";
    const labels = { add: "adicionada(s)", open: "registrada(s) como aberta(s)", exit: "registrada(s) como saída" };

    try {
      await wineEvent.mutateAsync({ wineId, eventType, quantity: parseInt(quantity) || 1, notes: notes || undefined });
      const wine = wines?.find(w => w.id === wineId);
      setSuccess(`${quantity} garrafa(s) ${labels[tab]}. ${wine?.name ?? ""}`);
      setTimeout(() => { reset(); onOpenChange(false); }, 1500);
    } catch {
      toast({ title: "Erro ao registrar ação", variant: "destructive" });
    }
  };

  const availableWines = wines?.filter(w => tab === "add" ? true : w.quantity > 0) ?? [];

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg">Gerenciar Garrafa</SheetTitle>
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
              <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
                <TabsList className="w-full">
                  <TabsTrigger value="add" className="flex-1 text-xs"><Plus className="h-3 w-3 mr-1" />Adicionar</TabsTrigger>
                  <TabsTrigger value="open" className="flex-1 text-xs"><WineIcon className="h-3 w-3 mr-1" />Abrir</TabsTrigger>
                  <TabsTrigger value="exit" className="flex-1 text-xs"><ArrowDownRight className="h-3 w-3 mr-1" />Saída</TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit} className="space-y-4 mt-5">
                  <div>
                    <Label className="text-xs text-muted-foreground">Vinho</Label>
                    <Select value={wineId} onValueChange={setWineId}>
                      <SelectTrigger><SelectValue placeholder="Selecionar vinho..." /></SelectTrigger>
                      <SelectContent>
                        {availableWines.map(w => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} {w.vintage ? `(${w.vintage})` : ""} — {w.quantity} un.
                          </SelectItem>
                        ))}
                        {availableWines.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum vinho disponível</div>
                        )}
                      </SelectContent>
                    </Select>
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
                    disabled={wineEvent.isPending || !wineId}
                    className="w-full gradient-wine text-primary-foreground btn-glow h-11 text-[13px] font-medium"
                  >
                    {wineEvent.isPending ? "Salvando..." : "Confirmar"}
                  </Button>
                </form>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
