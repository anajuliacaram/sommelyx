import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpdateConsumption, useDeleteConsumption, type ConsumptionEntry } from "@/hooks/useConsumption";
import { toast } from "sonner";
import { Trash2 } from "@/icons/lucide";

const STYLES = [
  { value: "Tinto", color: "#7B1E2B" },
  { value: "Branco", color: "#C9B469" },
  { value: "Rosé", color: "#D89BA0" },
  { value: "Espumante", color: "#B8C49A" },
  { value: "Sobremesa", color: "#B48C3A" },
];

type Props = {
  entry: ConsumptionEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditConsumptionDialog({ entry, open, onOpenChange }: Props) {
  const update = useUpdateConsumption();
  const del = useDeleteConsumption();
  const [wineName, setWineName] = useState("");
  const [producer, setProducer] = useState("");
  const [vintage, setVintage] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [style, setStyle] = useState<string>("");
  const [rating, setRating] = useState<string>("");
  const [location, setLocation] = useState("");
  const [tastingNotes, setTastingNotes] = useState("");

  useEffect(() => {
    if (entry) {
      setWineName(entry.wine_name ?? "");
      setProducer(entry.producer ?? "");
      setVintage(entry.vintage != null ? String(entry.vintage) : "");
      setCountry(entry.country ?? "");
      setRegion(entry.region ?? "");
      setGrape(entry.grape ?? "");
      setStyle(entry.style ?? "");
      setRating(entry.rating != null ? String(entry.rating) : "");
      setLocation(entry.location ?? "");
      setTastingNotes(entry.tasting_notes ?? "");
    }
  }, [entry]);

  if (!entry) return null;

  async function handleSave() {
    if (!entry) return;
    const ratingNum = rating === "" ? null : Number(rating.replace(",", "."));
    if (ratingNum != null && (!Number.isFinite(ratingNum) || ratingNum < 0 || ratingNum > 5)) {
      toast.error("Avaliação deve ser entre 0 e 5");
      return;
    }
    const vintageNum = vintage === "" ? null : Number(vintage);
    if (vintageNum != null && (!Number.isFinite(vintageNum) || vintageNum < 1800 || vintageNum > 2100)) {
      toast.error("Safra inválida");
      return;
    }
    try {
      await update.mutateAsync({
        id: entry.id,
        updates: {
          wine_name: wineName.trim() || entry.wine_name,
          producer: producer.trim() || null,
          vintage: vintageNum,
          country: country.trim() || null,
          region: region.trim() || null,
          grape: grape.trim() || null,
          style: style || null,
          rating: ratingNum,
          location: location.trim() || null,
          tasting_notes: tastingNotes.trim() || null,
        },
      });
      toast.success("Consumo atualizado");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  }

  async function handleDelete() {
    if (!entry) return;
    if (!confirm("Remover este registro de consumo?")) return;
    try {
      await del.mutateAsync(entry.id);
      toast.success("Registro removido");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px] tracking-[-0.01em]">Editar consumo</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Ajuste rapidamente o tipo, a nota e a ocasião deste brinde.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Nome do vinho</Label>
            <Input value={wineName} onChange={(e) => setWineName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Tipo</Label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => {
                const active = style === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStyle(active ? "" : s.value)}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all"
                    style={{
                      background: active ? s.color : "rgba(255,255,255,0.6)",
                      color: active ? "#fff" : "#3A3327",
                      borderColor: active ? s.color : "rgba(0,0,0,0.08)",
                    }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: active ? "#fff" : s.color }}
                    />
                    {s.value}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Nota (0–5)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Ocasião</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Jantar em casa…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Notas de degustação</Label>
            <Textarea
              value={tastingNotes}
              onChange={(e) => setTastingNotes(e.target.value)}
              rows={3}
              placeholder="Aromas, harmonização, impressões…"
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={del.isPending}
            className="text-[12.5px] text-[#7B1E2B] hover:bg-[rgba(123,30,43,0.08)]"
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Remover
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={update.isPending}
              style={{ background: "#7B1E2B", color: "#fff" }}
            >
              {update.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
