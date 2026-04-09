import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useWines, Wine } from "@/hooks/useWines";
import { toast } from "sonner";
import { Wine as WineIcon, MapPin, Star } from "@/icons/lucide";

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

  // Auto-fill when opening with a pre-selected wine
  useEffect(() => {
    if (open && preSelectedWine) {
      setSource("cellar");
      setSelectedWineId(preSelectedWine.id);
      setWineName(preSelectedWine.name);
      setProducer(preSelectedWine.producer || "");
      setCountry(preSelectedWine.country || "");
      setRegion(preSelectedWine.region || "");
      setGrape(preSelectedWine.grape || "");
      setStyle(preSelectedWine.style || "");
      setVintage(preSelectedWine.vintage?.toString() || "");
    }
  }, [open, preSelectedWine]);


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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-8">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground font-serif">
            <WineIcon className="h-5 w-5 text-primary" />
            Registrar Consumo
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Registre uma degustação da sua adega ou externa</p>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Source toggle */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Origem</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={source === "cellar" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-[13px] h-9"
                onClick={() => { setSource("cellar"); setSelectedWineId(""); }}
              >
                Da minha adega
              </Button>
              <Button
                type="button"
                variant={source === "external" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-[13px] h-9"
                onClick={() => { setSource("external"); setSelectedWineId(""); setWineName(""); setProducer(""); setCountry(""); setRegion(""); setGrape(""); setStyle(""); setVintage(""); }}
              >
                Consumo externo
              </Button>
            </div>
          </div>

          {/* Select from cellar */}
          {source === "cellar" && wines && wines.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Selecionar vinho</Label>
              <Select value={selectedWineId} onValueChange={handleSelectWine}>
                <SelectTrigger className="h-11 text-[13px]"><SelectValue placeholder="Escolha um vinho da adega" /></SelectTrigger>
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
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/80">Nome do vinho <span className="text-primary">*</span></Label>
              <Input value={wineName} onChange={(e) => setWineName(e.target.value)} placeholder="Ex: Château Margaux" disabled={source === "cellar" && !!selectedWineId} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/80">Produtor</Label>
                <Input value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="Produtor" disabled={source === "cellar" && !!selectedWineId} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/80">Safra</Label>
                <Input value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="2020" type="number" disabled={source === "cellar" && !!selectedWineId} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/80">País</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País" disabled={source === "cellar" && !!selectedWineId} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/80">Região</Label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Região" disabled={source === "cellar" && !!selectedWineId} />
              </div>
            </div>
          </div>

          {/* Location & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/80 flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" />Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Restaurante, casa..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/80">Data</Label>
              <Input type="date" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-foreground/80 flex items-center gap-1.5"><Star className="h-3 w-3 text-muted-foreground" />Avaliação</Label>
            <div className="flex gap-1.5 flex-wrap">
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
                  className="text-[12px] px-3 h-8"
                  onClick={() => setRating(rating === opt.value ? 0 : opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/80">Notas de degustação</Label>
            <Textarea value={tastingNotes} onChange={(e) => setTastingNotes(e.target.value)} placeholder="Aromas, sabor, impressões..." rows={3} />
          </div>

          <Button onClick={handleSubmit} disabled={addConsumption.isPending} className="w-full h-11 text-[14px] font-semibold">
            {addConsumption.isPending ? "Salvando..." : "Registrar Consumo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
