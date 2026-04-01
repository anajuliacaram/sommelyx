import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useWines, Wine } from "@/hooks/useWines";
import { toast } from "sonner";
import { Wine as WineIcon, MapPin, Star } from "lucide-react";

interface AddConsumptionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preSelectedWine?: { id: string; name: string; producer?: string | null; country?: string | null; region?: string | null; grape?: string | null; style?: string | null; vintage?: number | null } | null;
}

export function AddConsumptionDialog({ open, onOpenChange, preSelectedWine }: AddConsumptionDialogProps) {
  const { data: wines } = useWines();
  const addConsumption = useAddConsumption();

  const [source, setSource] = useState<"cellar" | "external">("external");
  const [selectedWineId, setSelectedWineId] = useState<string>("");
  const [wineName, setWineName] = useState("");
  const [producer, setProducer] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [style, setStyle] = useState("");
  const [vintage, setVintage] = useState("");
  const [location, setLocation] = useState("");
  const [tastingNotes, setTastingNotes] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [consumedAt, setConsumedAt] = useState(new Date().toISOString().split("T")[0]);

  // Auto-fill when preSelectedWine changes
  useState(() => {});
  const prevPreSelected = useState<string | null>(null);
  // Use effect to prefill
  useState(() => {});


  const resetForm = () => {
    setSource("external");
    setSelectedWineId("");
    setWineName("");
    setProducer("");
    setCountry("");
    setRegion("");
    setGrape("");
    setStyle("");
    setVintage("");
    setLocation("");
    setTastingNotes("");
    setRating(0);
    setConsumedAt(new Date().toISOString().split("T")[0]);
  };

  const handleSelectWine = (wineId: string) => {
    setSelectedWineId(wineId);
    const wine = wines?.find((w) => w.id === wineId);
    if (wine) {
      setWineName(wine.name);
      setProducer(wine.producer || "");
      setCountry(wine.country || "");
      setRegion(wine.region || "");
      setGrape(wine.grape || "");
      setStyle(wine.style || "");
      setVintage(wine.vintage?.toString() || "");
    }
  };

  const handleSubmit = async () => {
    if (!wineName.trim()) {
      toast.error("Informe o nome do vinho");
      return;
    }

    try {
      await addConsumption.mutateAsync({
        source,
        wine_id: source === "cellar" && selectedWineId ? selectedWineId : null,
        wine_name: wineName.trim(),
        producer: producer || null,
        country: country || null,
        region: region || null,
        grape: grape || null,
        style: style || null,
        vintage: vintage ? parseInt(vintage) : null,
        location: location || null,
        tasting_notes: tastingNotes || null,
        rating: rating > 0 ? rating : null,
        consumed_at: consumedAt,
      });
      toast.success("Consumo registrado com sucesso!");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao registrar consumo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <WineIcon className="h-5 w-5 text-primary" />
            Registrar Consumo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Source toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={source === "cellar" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => { setSource("cellar"); setSelectedWineId(""); }}
              >
                Da minha adega
              </Button>
              <Button
                type="button"
                variant={source === "external" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => { setSource("external"); setSelectedWineId(""); setWineName(""); setProducer(""); setCountry(""); setRegion(""); setGrape(""); setStyle(""); setVintage(""); }}
              >
                Consumo externo
              </Button>
            </div>
          </div>

          {/* Select from cellar */}
          {source === "cellar" && wines && wines.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecionar vinho</Label>
              <Select value={selectedWineId} onValueChange={handleSelectWine}>
                <SelectTrigger><SelectValue placeholder="Escolha um vinho da adega" /></SelectTrigger>
                <SelectContent>
                  {wines.filter(w => w.quantity > 0).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} {w.vintage ? `(${w.vintage})` : ""} — {w.quantity} garrafa{w.quantity !== 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Wine info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Nome do vinho *</Label>
              <Input value={wineName} onChange={(e) => setWineName(e.target.value)} placeholder="Ex: Château Margaux" disabled={source === "cellar" && !!selectedWineId} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Produtor</Label>
              <Input value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="Produtor" disabled={source === "cellar" && !!selectedWineId} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Safra</Label>
              <Input value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="2020" type="number" disabled={source === "cellar" && !!selectedWineId} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">País</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País" disabled={source === "cellar" && !!selectedWineId} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Região</Label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Região" disabled={source === "cellar" && !!selectedWineId} />
            </div>
          </div>

          {/* Location & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Restaurante, casa..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Star className="h-3 w-3" />Avaliação</Label>
            <div className="flex gap-1 flex-wrap">
              {([
                { value: 1, label: "Ruim" },
                { value: 2, label: "Regular" },
                { value: 3, label: "Bom" },
                { value: 4, label: "Muito bom" },
                { value: 5, label: "Excelente" },
              ] as const).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={rating === opt.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs px-3"
                  onClick={() => setRating(rating === opt.value ? 0 : opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notas de degustação</Label>
            <Textarea value={tastingNotes} onChange={(e) => setTastingNotes(e.target.value)} placeholder="Aromas, sabor, impressões..." rows={3} />
          </div>

          <Button onClick={handleSubmit} disabled={addConsumption.isPending} className="w-full">
            {addConsumption.isPending ? "Salvando..." : "Registrar Consumo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
