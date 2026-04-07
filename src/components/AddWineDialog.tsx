import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Check, Camera } from "@/icons/lucide";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScanWineLabelDialog } from "@/components/ScanWineLabelDialog";
import { useAuth } from "@/contexts/AuthContext";
import { LocationFields } from "@/components/LocationFields";
import { formatLocationLabel, type StructuredLocation } from "@/lib/location";
import { useCreateWineLocation } from "@/hooks/useWineLocations";

interface AddWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScan?: boolean;
}

const styles = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "fortificado", label: "Fortificado" },
];

export function AddWineDialog({ open, onOpenChange, initialScan = false }: AddWineDialogProps) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";

  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [vintage, setVintage] = useState("");
  const [style, setStyle] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [lastPaid, setLastPaid] = useState("");
  const [lastPaidDate, setLastPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentValue, setCurrentValue] = useState("");
  const [location, setLocation] = useState<StructuredLocation>({});
  const [drinkFrom, setDrinkFrom] = useState("");
  const [drinkUntil, setDrinkUntil] = useState("");
  const [foodPairing, setFoodPairing] = useState("");
  const [notes, setNotes] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const addWine = useAddWine();
  const createLocation = useCreateWineLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (open && initialScan) {
      setScanOpen(true);
    }
  }, [open, initialScan]);

  useEffect(() => {
    if (open && isCommercial) setMoreOpen(true);
  }, [open, isCommercial]);

  const reset = () => {
    setName(""); setProducer(""); setQuantity("1"); setVintage(""); setStyle("");
    setCountry(""); setRegion(""); setGrape(""); setLastPaid(""); setLastPaidDate(new Date().toISOString().split("T")[0]); setCurrentValue(""); setLocation({});
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
    if (data.purchase_price) setLastPaid(String(data.purchase_price));
    if (data.current_value) setCurrentValue(String(data.current_value));
    if (data.cellar_location) setLocation({ manualLabel: String(data.cellar_location) });
    // Open advanced fields if we have data for them
    if (data.country || data.region || data.grape || data.food_pairing || data.tasting_notes || data.drink_from) {
      setMoreOpen(true);
    }
    toast({ title: isCommercial ? "Dados do produto preenchidos!" : "🍷 Dados do rótulo preenchidos!" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const formattedLocation = formatLocationLabel(location) || null;
      const inserted = await addWine.mutateAsync({
        name: name.trim(),
        producer: producer || null,
        quantity: parseInt(quantity) || 1,
        vintage: vintage ? parseInt(vintage) : null,
        style: style || null,
        country: country || null,
        region: region || null,
        grape: grape || null,
        purchase_price: lastPaid ? parseFloat(lastPaid) : null,
        last_price_date: lastPaid ? lastPaidDate : null,
        current_value: currentValue ? parseFloat(currentValue) : null,
        cellar_location: formattedLocation,
        drink_from: drinkFrom ? parseInt(drinkFrom) : null,
        drink_until: drinkUntil ? parseInt(drinkUntil) : null,
        food_pairing: foodPairing || null,
        tasting_notes: notes || null,
        rating: null,
        image_url: null,
      });

      // Persist structured location — non-blocking so wine save succeeds even if location RPC fails
      if (inserted?.id && user) {
        try {
          const resp = typeof user.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : null;
          await createLocation.mutateAsync({
            wineId: inserted.id,
            sector: location.sector ?? null,
            zone: location.zone ?? null,
            level: location.level ?? null,
            position: location.position ?? null,
            manualLabel: location.manualLabel ?? null,
            quantity: parseInt(quantity) || 1,
            responsibleName: isCommercial ? resp : null,
            reason: isCommercial ? "Entrada manual" : null,
            notes: null,
          });
        } catch (locErr) {
          console.warn("Location save failed (wine was saved):", locErr);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 1200);
    } catch (err: any) {
      console.error("Wine save error:", err);
      toast({ title: isCommercial ? "Erro ao cadastrar produto" : "Erro ao adicionar vinho", description: err?.message || "Tente novamente", variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card/80 backdrop-blur-2xl border-l border-white/10 shadow-premium p-0">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />

          <div className="p-6 h-full flex flex-col relative z-10">
            <SheetHeader className="mb-6">
              <SheetTitle className="font-serif text-2xl font-black italic text-gradient-wine">
                {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
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
                  <p className="text-sm font-medium text-foreground">
                    {isCommercial ? "Produto cadastrado!" : `${parseInt(quantity) || 1} garrafa(s) adicionada(s)!`}
                  </p>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit} className="space-y-5 mt-6">
                  {/* Scan Label Button / Dropzone */}
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative group cursor-pointer"
                    onClick={() => setScanOpen(true)}
                  >
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative h-24 sm:h-28 rounded-2xl border-2 border-dashed border-primary/20 bg-card/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 transition-all duration-300 group-hover:border-primary/40 group-hover:bg-primary/[0.02]">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                        <Camera className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-[13px] font-bold text-foreground">Escanear com IA</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Extração instantânea de dados do rótulo</p>

                      {/* Shimmer overlay */}
                      <div className="absolute inset-x-4 top-0 h-[1px] shimmer-premium opacity-50" />
                      <div className="absolute inset-x-4 bottom-0 h-[1px] shimmer-premium opacity-50" />
                    </div>
                  </motion.div>

                  {/* Essential fields */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-xs text-muted-foreground">{isCommercial ? "Nome do produto *" : "Nome do vinho *"}</Label>
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
                        <Label className="text-xs text-muted-foreground">Último valor pago (R$)</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <Input type="number" step="0.01" min="0" value={lastPaid} onChange={e => setLastPaid(e.target.value)} placeholder="0.00" />
                          <Input type="date" value={lastPaidDate} onChange={e => setLastPaidDate(e.target.value)} />
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                          Quanto e quando você pagou por último.
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Valor atual (R$)</Label>
                        <Input type="number" step="0.01" min="0" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0.00" />
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                          Referência de valor de mercado atual.
                        </p>
                      </div>
                      <div>
                        <LocationFields
                          value={location}
                          onChange={setLocation}
                          label="Localização na adega"
                        />
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

                  <Button variant="primary" type="submit" disabled={addWine.isPending || !name.trim()} className="w-full h-11 text-[13px] font-medium">
                    <Plus className="h-4 w-4 mr-1.5" />
                    {addWine.isPending ? "Salvando..." : isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
                  </Button>
                </motion.form>
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
