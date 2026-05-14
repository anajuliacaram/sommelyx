import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useWineEvent, useWines, Wine } from "@/hooks/useWines";
import { toast } from "sonner";
import { Wine as WineIcon, MapPin, Star, Search } from "@/icons/lucide";
import { cn } from "@/lib/utils";
import { normalizeWineSearchText } from "@/lib/wine-normalization";
import {
  AI_MODAL_DIALOG_CONTENT_CLASSNAME,
  AI_MODAL_DIALOG_CONTENT_STYLE,
  AI_MODAL_FIELD_CLASSNAME,
  AI_MODAL_SURFACE,
  AI_MODAL_TEXTAREA_CLASSNAME,
  AiModalActionButton,
  AiModalCard,
  AiSectionLabel,
  AiModalSplitLayout,
} from "@/components/ai-flow/ModalLayout";

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
  const wineEvent = useWineEvent();

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
  const [showWinePicker, setShowWinePicker] = useState(false);
  const fieldClassName = AI_MODAL_FIELD_CLASSNAME;
  const selectionCardClassName =
    "flex min-h-[74px] flex-col justify-between rounded-[14px] border px-3 py-2.5 text-left shadow-none transition-all duration-200 hover:-translate-y-px";

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
      setShowWinePicker(false);
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
    setShowWinePicker(false);
  };

  const cellarWines = useMemo(() => (wines || []).filter((w) => w.quantity > 0), [wines]);
  const filteredWines = useMemo(() => {
    const q = normalizeWineSearchText(wineSearch);
    return cellarWines.filter((w) => {
      if (typeFilter !== "all" && classifyWineType(w.style) !== typeFilter) return false;
      if (!q) return true;
      const hay = normalizeWineSearchText(`${w.name} ${w.producer || ""} ${w.grape || ""} ${w.country || ""} ${w.region || ""} ${w.vintage || ""}`);
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
    setShowWinePicker(false);
  };

  const selectedWine = wines?.find((w) => w.id === selectedWineId) ?? null;

  const handleSubmit = async () => {
    if (!wineName.trim()) {
      toast.error("Informe o nome do vinho");
      return;
    }

    try {
      const isCellarWine = source === "cellar" && Boolean(selectedWineId);
      let stockAdjusted = false;

      if (isCellarWine) {
        await wineEvent.mutateAsync({
          wineId: selectedWineId,
          eventType: "open",
          quantity: 1,
          notes: tastingNotes || undefined,
        });
        stockAdjusted = true;
      }

      try {
        await addConsumption.mutateAsync({
          source,
          wine_id: isCellarWine ? selectedWineId : null,
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
      } catch (consumptionError) {
        if (stockAdjusted) {
          try {
            await wineEvent.mutateAsync({
              wineId: selectedWineId,
              eventType: "add",
              quantity: 1,
              notes: "Reversão automática após falha ao registrar consumo",
            });
          } catch (revertError) {
            console.error("[consumption] stock_revert_failed", revertError);
          }
        }
        throw consumptionError;
      }

      toast.success("Consumo registrado com sucesso!");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Não conseguimos registrar o consumo", { description: "Verifique sua conexão e tente novamente. Se o problema persistir, recarregue a página." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent
        className={AI_MODAL_DIALOG_CONTENT_CLASSNAME}
        style={AI_MODAL_DIALOG_CONTENT_STYLE}
        aria-label="Registrar consumo"
      >
        <div
          className="flex w-full max-h-[92dvh] min-h-0 flex-col rounded-[20px] p-3.5 sm:p-4"
          style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
        >
          <DialogHeader className="mb-3 text-left">
            <div className="flex items-start gap-3 pr-10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(123,30,43,0.08)] bg-[rgba(255,251,244,0.58)] text-[#7B1E2B]">
                <WineIcon className="h-5 w-5 text-[#7B1E2B]" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1713] sm:text-[22px]">
                  Registrar consumo
                </DialogTitle>
                <DialogDescription className="mt-1 text-[12px] font-medium leading-5 tracking-[-0.005em] text-[#6B6B6B]">
                  Salve a garrafa, o lugar e a impressão essencial.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <AiModalSplitLayout>
            <div className="space-y-2.5 overflow-y-auto pr-1">
              <AiModalCard className="space-y-2.5 px-3 py-3">
                <div className="space-y-0.5">
                  <AiSectionLabel>Origem</AiSectionLabel>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={cn(
                      selectionCardClassName,
                      source === "cellar"
                        ? "border-[rgba(123,30,43,0.16)] bg-[rgba(123,30,43,0.06)]"
                        : "border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] hover:bg-[rgba(255,251,244,0.86)]",
                    )}
                    onClick={() => { setSource("cellar"); setSelectedWineId(""); setShowWinePicker(true); }}
                  >
                    <div>
                      <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#1A1713]">Minha adega</p>
                      <p className="mt-0.5 text-[11.5px] leading-5 text-[#6B6B6B]">
                        Garrafa cadastrada
                      </p>
                    </div>
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#7B1E2B]">
                      {cellarWines.length} disponíveis
                    </span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      selectionCardClassName,
                      source === "external"
                        ? "border-[rgba(123,30,43,0.16)] bg-[rgba(123,30,43,0.06)]"
                        : "border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] hover:bg-[rgba(255,251,244,0.86)]",
                    )}
                    onClick={() => {
                      setSource("external");
                      setSelectedWineId("");
                      setShowWinePicker(false);
                      setWineName("");
                      setProducer("");
                      setCountry("");
                      setRegion("");
                      setGrape("");
                      setStyle("");
                      setVintage("");
                    }}
                  >
                    <div>
                      <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#1A1713]">Experiência externa</p>
                      <p className="mt-0.5 text-[11.5px] leading-5 text-[#6B6B6B]">
                        Restaurante, viagem, jantar
                      </p>
                    </div>
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#7B1E2B]">
                      Manual
                    </span>
                  </button>
                </div>
              </AiModalCard>

              {source === "cellar" && cellarWines.length > 0 && showWinePicker && (
                <AiModalCard className="space-y-2.5 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <AiSectionLabel>Selecionar garrafa</AiSectionLabel>
                    <span className="text-[11px] font-medium text-[#6B6258]">{filteredWines.length} vinhos</span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
                    <Input
                      value={wineSearch}
                      onChange={(e) => setWineSearch(e.target.value)}
                      placeholder="Buscar rótulo, produtor, uva"
                      className={cn(fieldClassName, "pl-9")}
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {TYPE_FILTERS.map((f) => {
                      const active = typeFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTypeFilter(f.id)}
                          className={cn(
                            "h-7 shrink-0 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-200",
                            active
                              ? "border border-[rgba(123,30,43,0.14)] bg-[rgba(123,30,43,0.10)] text-[#5A1528]"
                              : "border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] text-[#5F5F5F] hover:bg-[rgba(255,251,244,0.86)] hover:text-[#1A1713]",
                          )}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="cellar-scroll max-h-[260px] divide-y divide-black/5 overflow-y-auto rounded-[14px] border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] pr-1 shadow-none"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(123,30,43,0.35) rgba(0,0,0,0.05)" }}
                  >
                    {filteredWines.length > 4 ? (
                      <div className="sticky top-0 z-10 border-b border-black/5 bg-gradient-to-b from-white/95 to-white/70 px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#7B1E2B]/60 backdrop-blur-sm">
                        {filteredWines.length} opções
                      </div>
                    ) : null}
                    {filteredWines.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm font-medium text-[#1C1C1C]">Nenhum vinho encontrado na adega</p>
                        <p className="mt-1 text-xs text-black/50">Use a busca ou ajuste os filtros para localizar a garrafa certa.</p>
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
                              "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-150 hover:bg-[rgba(255,251,244,0.82)] active:scale-[0.99]",
                              selected ? "border-l-2 border-[#7B1E2B]/25 bg-[rgba(123,30,43,0.05)]" : "",
                            )}
                          >
                            <span className={cn("h-2 w-2 shrink-0 rounded-full", dotForWine(w.style))} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-[#1C1C1C]">{w.name}</p>
                              <p className="truncate text-[11px] text-black/55">
                                {[w.grape, w.vintage, w.country].filter(Boolean).join(" · ") || w.producer || "Garrafa da adega"}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10.5px] font-medium text-black/55">
                              {w.quantity} gf{w.quantity !== 1 ? "s" : ""}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </AiModalCard>
              )}

              {source === "cellar" && selectedWine && !showWinePicker ? (
                <AiModalCard className="px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <AiSectionLabel>Garrafa selecionada</AiSectionLabel>
                      <p className="mt-1.5 truncate text-[16px] font-semibold tracking-[-0.02em] text-[#1A1713]">{selectedWine.name}</p>
                      <p className="mt-0.5 truncate text-[12px] leading-5 text-[#6B6B6B]">
                        {[selectedWine.producer, selectedWine.vintage, selectedWine.country].filter(Boolean).join(" · ") || "Vinho da adega"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 rounded-full border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7B1E2B] shadow-none hover:bg-[rgba(255,251,244,0.86)]"
                      onClick={() => setShowWinePicker(true)}
                    >
                      Trocar
                    </Button>
                  </div>
                </AiModalCard>
              ) : null}

              <AiModalCard className="space-y-3 px-3 py-3">
                <div className="space-y-0.5">
                  <AiSectionLabel>Dados do vinho</AiSectionLabel>
                </div>

                <div className="space-y-1">
                  <Label className="text-[12px] font-semibold text-[#4A4338]">
                    Nome do vinho <span className="text-primary">*</span>
                  </Label>
                  <Input
                    className={fieldClassName}
                    value={wineName}
                    onChange={(e) => setWineName(e.target.value)}
                    placeholder="Nome do vinho"
                    disabled={source === "cellar" && !!selectedWineId}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[12px] font-semibold text-[#4A4338]">Produtor</Label>
                    <Input className={fieldClassName} value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="Produtor" disabled={source === "cellar" && !!selectedWineId} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[12px] font-semibold text-[#4A4338]">Safra</Label>
                    <Input className={fieldClassName} value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="2020" type="number" disabled={source === "cellar" && !!selectedWineId} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[12px] font-semibold text-[#4A4338]">País</Label>
                    <Input className={fieldClassName} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País" disabled={source === "cellar" && !!selectedWineId} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[12px] font-semibold text-[#4A4338]">Região</Label>
                    <Input className={fieldClassName} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Região" disabled={source === "cellar" && !!selectedWineId} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[12px] font-semibold text-[#4A4338]">Uva / Blend</Label>
                  <Input
                    className={fieldClassName}
                    value={grape}
                    onChange={(e) => setGrape(e.target.value)}
                    placeholder="Ex: Cabernet Sauvignon, Merlot"
                    disabled={source === "cellar" && !!selectedWineId}
                  />
                </div>
              </AiModalCard>

              <AiModalCard className="space-y-3 px-3 py-3">
                <div className="space-y-0.5">
                  <AiSectionLabel>Contexto da experiência</AiSectionLabel>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-[12px] font-semibold text-[#4A4338]">
                      <MapPin className="h-3.5 w-3.5 text-[#8E7A64]" />
                      Local
                    </Label>
                    <Input className={fieldClassName} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Restaurante, casa..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[12px] font-semibold text-[#4A4338]">Data</Label>
                    <Input className={fieldClassName} type="date" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1 text-[12px] font-semibold text-[#4A4338]">
                    <Star className="h-3.5 w-3.5 text-[#8E7A64]" />
                    Avaliação
                  </Label>
                  <div className="grid grid-cols-5 gap-1.5">
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
                          "h-8 rounded-[10px] border px-1 text-[10.5px] font-semibold transition-all duration-200",
                          rating === opt.value
                            ? "border-[#7B1E2B] bg-[#7B1E2B] text-white shadow-none"
                            : "border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] text-[#4A4338] shadow-none hover:bg-[rgba(255,251,244,0.86)]",
                        )}
                        onClick={() => setRating(rating === opt.value ? 0 : opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[12px] font-semibold text-[#4A4338]">Notas de degustação</Label>
                  <Textarea
                    className={AI_MODAL_TEXTAREA_CLASSNAME}
                    value={tastingNotes}
                    onChange={(e) => setTastingNotes(e.target.value)}
                    placeholder="Aromas, textura, equilíbrio, final."
                    rows={3}
                  />
                </div>
              </AiModalCard>
            </div>
            </AiModalSplitLayout>

            <div className="mt-2.5 border-t border-black/5 pt-2.5 backdrop-blur-md" style={{ backgroundColor: `${AI_MODAL_SURFACE}F5` }}>
              <AiModalActionButton
                onClick={handleSubmit}
                disabled={addConsumption.isPending}
                variant="primary"
                className="h-10 w-full rounded-[12px] bg-[linear-gradient(135deg,#7B1E2B,#8F2436)] shadow-none"
              >
                {addConsumption.isPending ? "Salvando..." : "Registrar consumo"}
              </AiModalActionButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
