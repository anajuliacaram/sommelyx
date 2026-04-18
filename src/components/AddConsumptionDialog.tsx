import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useWines, Wine } from "@/hooks/useWines";
import { toast } from "sonner";
import { Wine as WineIcon, MapPin, Star } from "@/icons/lucide";
import { cn } from "@/lib/utils";

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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/20 to-[#C8A96A]/20">
              <WineIcon className="h-5 w-5 text-[#7B1E2B]" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>Registrar consumo</DialogTitle>
              <DialogDescription>Registre uma degustação da sua adega ou externa</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">Origem</Label>
            <div className="flex gap-1.5">
              <Button type="button" variant={source === "cellar" ? "primary" : "secondary"} className="flex-1" onClick={() => { setSource("cellar"); setSelectedWineId(""); }}>
                Da minha adega
              </Button>
              <Button type="button" variant={source === "external" ? "primary" : "secondary"} className="flex-1" onClick={() => { setSource("external"); setSelectedWineId(""); setWineName(""); setProducer(""); setCountry(""); setRegion(""); setGrape(""); setStyle(""); setVintage(""); }}>
                Consumo externo
              </Button>
            </div>
          </div>

          {source === "cellar" && wines && wines.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">Selecionar vinho</Label>
              <Select value={selectedWineId} onValueChange={handleSelectWine}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Escolha um vinho da adega" /></SelectTrigger>
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

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome do vinho <span className="text-primary">*</span></Label>
              <Input value={wineName} onChange={(e) => setWineName(e.target.value)} placeholder="Ex: Château Margaux" disabled={source === "cellar" && !!selectedWineId} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Produtor</Label>
                <Input value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="Produtor" disabled={source === "cellar" && !!selectedWineId} />
              </div>
              <div className="space-y-1.5">
                <Label>Safra</Label>
                <Input value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="2020" type="number" disabled={source === "cellar" && !!selectedWineId} />
              </div>
              <div className="space-y-1.5">
                <Label>País</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País" disabled={source === "cellar" && !!selectedWineId} />
              </div>
              <div className="space-y-1.5">
                <Label>Região</Label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Região" disabled={source === "cellar" && !!selectedWineId} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" />Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Restaurante, casa..." />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><Star className="h-4 w-4 text-muted-foreground" />Avaliação</Label>
            <div className="flex gap-1.5 flex-wrap">
              {([
                { value: 1, label: "Ruim" },
                { value: 2, label: "Regular" },
                { value: 3, label: "Bom" },
                { value: 4, label: "Muito bom" },
                { value: 5, label: "Excelente" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all duration-200",
                    rating === opt.value
                      ? "bg-[#7B1E2B] text-white border-[#7B1E2B] shadow-[0_8px_24px_rgba(123,30,43,0.18)]"
                      : "bg-white text-[#333] border-black/10 hover:bg-[#F8F8F8]",
                  )}
                  onClick={() => setRating(rating === opt.value ? 0 : opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas de degustação</Label>
            <Textarea value={tastingNotes} onChange={(e) => setTastingNotes(e.target.value)} placeholder="Aromas, sabor, impressões..." rows={2} />
          </div>

          <Button onClick={handleSubmit} disabled={addConsumption.isPending} variant="primary" className="w-full">
            {addConsumption.isPending ? "Salvando..." : "Registrar consumo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
