import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useWines, Wine } from "@/hooks/useWines";
import { toast } from "sonner";
import { Wine as WineIcon, MapPin, Star, Search } from "@/icons/lucide";
import { cn } from "@/lib/utils";

type WineTypeFilter = "all" | "tinto" | "branco" | "rose" | "espumante" | "sobremesa";

const TYPE_FILTERS: { id: WineTypeFilter; label: string; pill: string; dot: string }[] = [
  { id: "all", label: "Todos", pill: "bg-[#EFEDE8] text-[#1C1C1C]", dot: "bg-[#1C1C1C]/30" },
  { id: "tinto", label: "Tinto", pill: "bg-[#7B1E2B] text-white", dot: "bg-[#7B1E2B]" },
  { id: "branco", label: "Branco", pill: "bg-[#C8A96A] text-white", dot: "bg-[#C8A96A]" },
  { id: "rose", label: "Rosé", pill: "bg-[#E8A0A6] text-white", dot: "bg-[#E8A0A6]" },
  { id: "espumante", label: "Espumante", pill: "bg-[#6A8F6B] text-white", dot: "bg-[#6A8F6B]" },
  { id: "sobremesa", label: "Sobremesa", pill: "bg-[#A67C52] text-white", dot: "bg-[#A67C52]" },
];

function classifyWineType(style?: string | null): WineTypeFilter {
  const s = (style || "").toLowerCase();
  if (!s) return "all";
  if (/(espumante|sparkl|champ|prosecco|cava|frisante)/.test(s)) return "espumante";
  if (/(ros[eé])/.test(s)) return "rose";
  if (/(sobremesa|dessert|fortific|porto|sauternes|licoroso|tokaj)/.test(s)) return "sobremesa";
  if (/(branco|white|chardonnay|sauvignon blanc|riesling|verdejo|albariño|albarino)/.test(s)) return "branco";
  if (/(tinto|red|cabernet|merlot|malbec|pinot noir|syrah|shiraz|tempranillo|sangiovese|nebbiolo)/.test(s)) return "tinto";
  return "all";
}

function dotForWine(style?: string | null): string {
  const t = classifyWineType(style);
  const found = TYPE_FILTERS.find((f) => f.id === t);
  return found && t !== "all" ? found.dot : "bg-[#1C1C1C]/25";
}

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
  const [wineSearch, setWineSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<WineTypeFilter>("all");

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
    setWineSearch("");
    setTypeFilter("all");
  };

  const cellarWines = useMemo(() => (wines || []).filter((w) => w.quantity > 0), [wines]);
  const filteredWines = useMemo(() => {
    const q = wineSearch.trim().toLowerCase();
    return cellarWines.filter((w) => {
      if (typeFilter !== "all" && classifyWineType(w.style) !== typeFilter) return false;
      if (!q) return true;
      const hay = `${w.name} ${w.producer || ""} ${w.grape || ""} ${w.country || ""} ${w.region || ""} ${w.vintage || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [cellarWines, wineSearch, typeFilter]);

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
      toast.error("Não conseguimos registrar o consumo", { description: "Verifique sua conexão e tente novamente. Se o problema persistir, recarregue a página." });
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

          {source === "cellar" && cellarWines.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs tracking-[0.12em] uppercase text-black/50">Selecionar vinho</Label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
                <Input
                  value={wineSearch}
                  onChange={(e) => setWineSearch(e.target.value)}
                  placeholder="Buscar por nome, produtor, uva, safra…"
                  className="pl-9 rounded-xl"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {TYPE_FILTERS.map((f) => {
                  const active = typeFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTypeFilter(f.id)}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all duration-200",
                        f.pill,
                        active ? "scale-[1.05] shadow-sm ring-1 ring-black/10" : "opacity-80 hover:opacity-100",
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              <div
                className="max-h-[260px] overflow-y-scroll rounded-xl border border-black/10 bg-white/70 backdrop-blur-sm divide-y divide-black/5 cellar-scroll"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(123,30,43,0.35) rgba(0,0,0,0.05)" }}
              >
                {filteredWines.length > 4 && (
                  <div className="sticky top-0 z-10 bg-gradient-to-b from-white/95 to-white/70 backdrop-blur-sm px-3 py-1.5 text-[10.5px] tracking-[0.12em] uppercase text-[#7B1E2B]/70 font-medium border-b border-black/5">
                    Role para ver todos os {filteredWines.length} vinhos ↓
                  </div>
                )}
                {filteredWines.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[#1C1C1C]">Nenhum vinho encontrado</p>
                    <p className="text-xs text-black/50 mt-1">Use a busca ou ajuste os filtros</p>
                  </div>
                ) : (
                  filteredWines.map((w) => {
                    const selected = selectedWineId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleSelectWine(w.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all",
                          "hover:bg-[#F6F4F1] active:scale-[0.99]",
                          selected && "bg-[#F6F4F1]",
                        )}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotForWine(w.style))} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold text-[#1C1C1C] truncate">{w.name}</p>
                          <p className="text-[11.5px] text-black/55 truncate">
                            {[w.grape, w.vintage, w.country].filter(Boolean).join(" · ") || w.producer || "—"}
                          </p>
                        </div>
                        <span className="text-[11.5px] font-medium text-black/60 shrink-0">
                          {w.quantity} gf{w.quantity !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
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
            <div className="space-y-1.5">
              <Label>Uva / Blend</Label>
              <Input value={grape} onChange={(e) => setGrape(e.target.value)} placeholder="Ex: Cabernet Sauvignon, Merlot" disabled={source === "cellar" && !!selectedWineId} />
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
