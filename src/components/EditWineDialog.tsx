import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, Save } from "lucide-react";
import { useUpdateWine, type Wine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface EditWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wine: Wine | null;
}

const styles = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
];

export function EditWineDialog({ open, onOpenChange, wine }: EditWineDialogProps) {
  const { profileType } = useAuth();
  const isCommercial = profileType === "commercial";

  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [vintage, setVintage] = useState("");
  const [style, setStyle] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [lastPaidSnapshot, setLastPaidSnapshot] = useState("");
  const [lastPaid, setLastPaid] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [location, setLocation] = useState("");
  const [drinkFrom, setDrinkFrom] = useState("");
  const [drinkUntil, setDrinkUntil] = useState("");
  const [foodPairing, setFoodPairing] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("");
  const [success, setSuccess] = useState(false);

  const updateWine = useUpdateWine();
  const { toast } = useToast();

  useEffect(() => {
    if (wine) {
      setName(wine.name);
      setProducer(wine.producer || "");
      setQuantity(String(wine.quantity));
      setVintage(wine.vintage ? String(wine.vintage) : "");
      setStyle(wine.style || "");
      setCountry(wine.country || "");
      setRegion(wine.region || "");
      setGrape(wine.grape || "");
      setLastPaidSnapshot(wine.purchase_price != null ? String(wine.purchase_price) : "");
      setLastPaid(wine.purchase_price ? String(wine.purchase_price) : "");
      setCurrentValue(wine.current_value ? String(wine.current_value) : "");
      setLocation(wine.cellar_location || "");
      setDrinkFrom(wine.drink_from ? String(wine.drink_from) : "");
      setDrinkUntil(wine.drink_until ? String(wine.drink_until) : "");
      setFoodPairing(wine.food_pairing || "");
      setNotes(wine.tasting_notes || "");
      setRating(wine.rating ? String(wine.rating) : "");
      setSuccess(false);
    }
  }, [wine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wine || !name.trim()) return;

    try {
      await updateWine.mutateAsync({
        id: wine.id,
        updates: {
          name: name.trim(),
          producer: producer || null,
          quantity: parseInt(quantity) || 1,
          vintage: vintage ? parseInt(vintage) : null,
          style: style || null,
          country: country || null,
          region: region || null,
          grape: grape || null,
          purchase_price: lastPaid ? parseFloat(lastPaid) : null,
          current_value: currentValue ? parseFloat(currentValue) : null,
          cellar_location: location || null,
          drink_from: drinkFrom ? parseInt(drinkFrom) : null,
          drink_until: drinkUntil ? parseInt(drinkUntil) : null,
          food_pairing: foodPairing || null,
          tasting_notes: notes || null,
          rating: rating ? parseFloat(rating) : null,
        },
      });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onOpenChange(false); }, 1200);
    } catch {
      toast({ title: "Erro ao salvar alterações", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg">{isCommercial ? "Editar produto" : "Editar vinho"}</SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full gradient-wine flex items-center justify-center glow-wine">
                <Check className="h-7 w-7 text-primary-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Vinho atualizado!</p>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div>
                <Label className="text-xs text-muted-foreground">Nome *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Produtor</Label>
                <Input value={producer} onChange={e => setProducer(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <Input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Safra</Label>
                  <Input type="number" value={vintage} onChange={e => setVintage(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nota</Label>
                  <Input type="number" step="0.1" min="0" max="100" value={rating} onChange={e => setRating(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estilo</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {styles.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">País</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Região</Label>
                  <Input value={region} onChange={e => setRegion(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Uva</Label>
                <Input value={grape} onChange={e => setGrape(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isCommercial ? "Preço pago atual (R$)" : "Preço de compra (R$)"}
                  </Label>
                  {isCommercial && (
                    <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                      Último preço pago:{" "}
                      <span className="font-semibold text-foreground">
                        {lastPaidSnapshot ? `R$ ${Number(lastPaidSnapshot).toLocaleString("pt-BR")}` : "—"}
                      </span>
                    </p>
                  )}
                  <Input type="number" step="0.01" min="0" value={lastPaid} onChange={e => setLastPaid(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {isCommercial ? "Preço de venda (R$)" : "Valor atual (R$)"}
                  </Label>
                  <Input type="number" step="0.01" min="0" value={currentValue} onChange={e => setCurrentValue(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Localização</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Beber de</Label>
                  <Input type="number" value={drinkFrom} onChange={e => setDrinkFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Beber até</Label>
                  <Input type="number" value={drinkUntil} onChange={e => setDrinkUntil(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Harmonização</Label>
                <Input value={foodPairing} onChange={e => setFoodPairing(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notas de degustação</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              </div>
              <Button variant="primary" type="submit" disabled={updateWine.isPending || !name.trim()} className="w-full h-11 text-[13px] font-medium">
                <Save className="h-4 w-4 mr-1.5" />
                {updateWine.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
