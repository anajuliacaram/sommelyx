import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Check, Camera } from "lucide-react";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScanWineLabelDialog } from "@/components/ScanWineLabelDialog";

interface AddWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const styles = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "fortificado", label: "Fortificado" },
];

export function AddWineDialog({ open, onOpenChange }: AddWineDialogProps) {
  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [vintage, setVintage] = useState("");
  const [style, setStyle] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [drinkFrom, setDrinkFrom] = useState("");
  const [drinkUntil, setDrinkUntil] = useState("");
  const [foodPairing, setFoodPairing] = useState("");
  const [notes, setNotes] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const addWine = useAddWine();
  const { toast } = useToast();

  const reset = () => {
    setName(""); setProducer(""); setQuantity("1"); setVintage(""); setStyle("");
    setCountry(""); setRegion(""); setGrape(""); setPrice(""); setLocation("");
    setDrinkFrom(""); setDrinkUntil(""); setFoodPairing(""); setNotes("");
    setMoreOpen(false); setSuccess(false);
  };

  const handleScanComplete = (data: any) => {
    if (data.name) setName(data.name);
    if (data.producer) setProducer(data.producer);
    if (data.vintage) setVintage(String(data.vintage));
    if (data.style) setStyle(data.style);
    if (data.country) setCountry(data.country);
    if (data.region) setRegion(data.region);
    if (data.grape) setGrape(data.grape);
    if (data.food_pairing) setFoodPairing(data.food_pairing);
    if (data.tasting_notes) setNotes(data.tasting_notes);
    if (data.drink_from) setDrinkFrom(String(data.drink_from));
    if (data.drink_until) setDrinkUntil(String(data.drink_until));
    if (data.purchase_price) setPrice(String(data.purchase_price));
    if (data.cellar_location) setLocation(data.cellar_location);
    // Open advanced fields if we have data for them
    if (data.country || data.region || data.grape || data.food_pairing || data.tasting_notes || data.drink_from) {
      setMoreOpen(true);
    }
    toast({ title: "🍷 Dados do rótulo preenchidos!" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await addWine.mutateAsync({
        name: name.trim(),
        producer: producer || null,
        quantity: parseInt(quantity) || 1,
        vintage: vintage ? parseInt(vintage) : null,
        style: style || null,
        country: country || null,
        region: region || null,
        grape: grape || null,
        purchase_price: price ? parseFloat(price) : null,
        current_value: null,
        cellar_location: location || null,
        drink_from: drinkFrom ? parseInt(drinkFrom) : null,
        drink_until: drinkUntil ? parseInt(drinkUntil) : null,
        food_pairing: foodPairing || null,
        tasting_notes: notes || null,
        rating: null,
        image_url: null,
      });

      setSuccess(true);
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 1200);
    } catch {
      toast({ title: "Erro ao adicionar vinho", variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
          <SheetHeader>
            <SheetTitle className="font-serif text-lg">Adicionar Vinho</SheetTitle>
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
                <p className="text-sm font-medium text-foreground">{parseInt(quantity) || 1} garrafa(s) adicionada(s)!</p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-5 mt-6">
                {/* Scan Label Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScanOpen(true)}
                  className="w-full h-14 text-[13px] font-medium border-dashed border-2 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <Camera className="h-5 w-5 mr-2 text-primary" />
                  <div className="text-left">
                    <span className="block font-semibold text-foreground">Escanear Rótulo com IA</span>
                    <span className="block text-[10px] text-muted-foreground">Tire uma foto e preencha automaticamente</span>
                  </div>
                </Button>

                {/* Essential fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-xs text-muted-foreground">Nome do vinho *</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Malbec Reserva" required />
                  </div>
                  <div>
                    <Label htmlFor="producer" className="text-xs text-muted-foreground">Produtor</Label>
                    <Input id="producer" value={producer} onChange={e => setProducer(e.target.value)} placeholder="Ex: Catena Zapata" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="qty" className="text-xs text-muted-foreground">Quantidade</Label>
                      <Input id="qty" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="vintage" className="text-xs text-muted-foreground">Safra</Label>
                      <Input id="vintage" type="number" value={vintage} onChange={e => setVintage(e.target.value)} placeholder="2020" />
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
                </div>

                {/* Collapsible advanced fields */}
                <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" className="w-full justify-between text-xs text-muted-foreground h-9 px-2">
                      Mais detalhes
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">País</Label>
                        <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Argentina" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Região</Label>
                        <Input value={region} onChange={e => setRegion(e.target.value)} placeholder="Mendoza" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Uva</Label>
                      <Input value={grape} onChange={e => setGrape(e.target.value)} placeholder="Malbec" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Preço de compra (R$)</Label>
                      <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Localização na adega</Label>
                      <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Estante A, prateleira 2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Beber a partir de</Label>
                        <Input type="number" value={drinkFrom} onChange={e => setDrinkFrom(e.target.value)} placeholder="2024" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Beber até</Label>
                        <Input type="number" value={drinkUntil} onChange={e => setDrinkUntil(e.target.value)} placeholder="2030" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Harmonização</Label>
                      <Input value={foodPairing} onChange={e => setFoodPairing(e.target.value)} placeholder="Carnes vermelhas, queijos" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Notas de degustação</Label>
                      <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Aromas, sabores, impressões..." rows={3} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Button type="submit" disabled={addWine.isPending || !name.trim()} className="w-full gradient-wine text-primary-foreground btn-glow h-11 text-[13px] font-medium">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {addWine.isPending ? "Salvando..." : "Adicionar Vinho"}
                </Button>
              </motion.form>
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
