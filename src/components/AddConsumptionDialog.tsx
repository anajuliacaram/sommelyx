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
import { AiModalActionButton, AiModalCard, AiSectionLabel, AiModalSplitLayout } from "@/components/ai-flow/ModalLayout";

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
  const fieldClassName =
    "h-12 rounded-[18px] border border-black/5 bg-white/84 px-4 text-[14px] text-[#1F1F1F] shadow-[0_10px_22px_-22px_rgba(0,0,0,0.16)] transition-all duration-200 placeholder:text-[#8C8579] focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/18 focus-visible:ring-offset-0";
  const selectionCardClassName =
    "flex min-h-[112px] flex-col justify-between rounded-[22px] border px-4 py-4 text-left shadow-[0_12px_28px_-24px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-px";

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
        className="items-center overflow-hidden rounded-[24px] border border-black/[0.04] bg-[#FAF8F6] p-0 shadow-[0_24px_64px_rgba(38,24,18,0.14)] sm:max-w-[920px]"
        aria-label="Registrar consumo"
      >
        <div
          className="flex w-full max-h-[88dvh] min-h-0 flex-col rounded-[24px] p-4 sm:p-5"
          style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
        >
          <DialogHeader className="mb-4 text-left">
            <div className="flex items-start gap-3.5 pr-12">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(123,30,43,0.12),rgba(200,169,106,0.10))] text-[#7B1E2B] shadow-[0_10px_24px_-18px_rgba(123,30,43,0.18)]">
                <WineIcon className="h-5 w-5 text-[#7B1E2B]" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1713] sm:text-[24px]">
                  Registrar consumo
                </DialogTitle>
                <DialogDescription className="mt-1 text-[12.5px] font-medium leading-5 tracking-[-0.005em] text-[#6B6B6B] sm:text-[13px]">
                  Registre uma garrafa da adega ou uma experiência externa com poucos campos e revisão rápida.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <AiModalSplitLayout>
            <div className="space-y-4 overflow-y-auto pr-1">
              <AiModalCard className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                <div className="space-y-1">
                  <AiSectionLabel>Origem</AiSectionLabel>
                  <p className="text-[14px] leading-6 text-[#645E54]">
                    Escolha se este registro vem da sua adega pessoal ou de uma experiência externa.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className={cn(
                      selectionCardClassName,
                      source === "cellar"
                        ? "border-[rgba(123,30,43,0.16)] bg-[rgba(123,30,43,0.06)] shadow-[0_18px_32px_-24px_rgba(123,30,43,0.28)]"
                        : "border-black/5 bg-white/80 hover:bg-white/90",
                    )}
                    onClick={() => { setSource("cellar"); setSelectedWineId(""); setShowWinePicker(true); }}
                  >
                    <div>
                      <p className="text-[16px] font-semibold tracking-[-0.02em] text-[#1A1713]">Minha adega</p>
                      <p className="mt-1 text-[13px] leading-6 text-[#6B6B6B]">
                        Selecione uma garrafa já cadastrada para registrar a abertura ou degustação.
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B1E2B]">
                      {cellarWines.length} disponíveis
                    </span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      selectionCardClassName,
                      source === "external"
                        ? "border-[rgba(123,30,43,0.16)] bg-[rgba(123,30,43,0.06)] shadow-[0_18px_32px_-24px_rgba(123,30,43,0.28)]"
                        : "border-black/5 bg-white/80 hover:bg-white/90",
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
                      <p className="text-[16px] font-semibold tracking-[-0.02em] text-[#1A1713]">Experiência externa</p>
                      <p className="mt-1 text-[13px] leading-6 text-[#6B6B6B]">
                        Registre um vinho descoberto em restaurante, viagem, jantar ou degustação.
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B1E2B]">
                      Manual
                    </span>
                  </button>
                </div>
              </AiModalCard>

              {source === "cellar" && cellarWines.length > 0 && showWinePicker && (
                <AiModalCard className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                  <div className="space-y-1">
                    <AiSectionLabel>Selecionar garrafa</AiSectionLabel>
                    <p className="text-[14px] leading-6 text-[#645E54]">
                      Busque por nome, produtor, uva ou safra para encontrar rapidamente a garrafa certa.
                    </p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                    <Input
                      value={wineSearch}
                      onChange={(e) => setWineSearch(e.target.value)}
                      placeholder="Buscar por nome, produtor, uva, safra…"
                      className={cn(fieldClassName, "pl-10")}
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {TYPE_FILTERS.map((f) => {
                      const active = typeFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTypeFilter(f.id)}
                          className={cn(
                            "shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all duration-200",
                            active
                              ? "border border-[rgba(123,30,43,0.14)] bg-[rgba(123,30,43,0.10)] text-[#5A1528] shadow-[0_8px_18px_-16px_rgba(123,30,43,0.24)]"
                              : "border border-black/5 bg-white/72 text-[#5F5F5F] hover:bg-white/92 hover:text-[#1A1713]",
                          )}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="cellar-scroll max-h-[300px] divide-y divide-black/5 overflow-y-auto rounded-[22px] border border-black/5 bg-white/84 pr-1 shadow-[0_16px_34px_-26px_rgba(58,51,39,0.16)]"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(123,30,43,0.35) rgba(0,0,0,0.05)" }}
                  >
                    {filteredWines.length > 4 ? (
                      <div className="sticky top-0 z-10 border-b border-black/5 bg-gradient-to-b from-white/95 to-white/70 px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[#7B1E2B]/70 backdrop-blur-sm">
                        Role para ver todos os {filteredWines.length} vinhos
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
                              "flex w-full items-center gap-3 px-3 py-3 text-left transition-all duration-150 hover:bg-white/60 active:scale-[0.99]",
                              selected ? "border-l-2 border-[#7B1E2B]/25 bg-[rgba(123,30,43,0.05)]" : "",
                            )}
                          >
                            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotForWine(w.style))} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#1C1C1C]">{w.name}</p>
                              <p className="truncate text-[11.5px] text-black/55">
                                {[w.grape, w.vintage, w.country].filter(Boolean).join(" · ") || w.producer || "Garrafa da adega"}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11.5px] font-medium text-black/60">
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
                <AiModalCard className="px-4 py-4 sm:px-5 sm:py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <AiSectionLabel>Garrafa selecionada</AiSectionLabel>
                      <p className="mt-2 truncate text-[18px] font-semibold tracking-[-0.02em] text-[#1A1713]">{selectedWine.name}</p>
                      <p className="mt-1 truncate text-[13px] leading-6 text-[#6B6B6B]">
                        {[selectedWine.producer, selectedWine.vintage, selectedWine.country].filter(Boolean).join(" · ") || "Vinho da adega"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 rounded-full border border-black/5 bg-white/75 px-3.5 text-[11px] font-semibold text-[#7B1E2B] shadow-[0_10px_22px_-24px_rgba(0,0,0,0.14)] hover:bg-white"
                      onClick={() => setShowWinePicker(true)}
                    >
                      Trocar vinho
                    </Button>
                  </div>
                </AiModalCard>
              ) : null}

              <AiModalCard className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                <div className="space-y-1">
                  <AiSectionLabel>Dados do vinho</AiSectionLabel>
                  <p className="text-[14px] leading-6 text-[#645E54]">
                    Organize as informações essenciais do vinho e complete o contexto da degustação.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-[#4A4338]">
                    Nome do vinho <span className="text-primary">*</span>
                  </Label>
                  <Input
                    className={fieldClassName}
                    value={wineName}
                    onChange={(e) => setWineName(e.target.value)}
                    placeholder="Ex: Château Margaux"
                    disabled={source === "cellar" && !!selectedWineId}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-[#4A4338]">Produtor</Label>
                    <Input className={fieldClassName} value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="Produtor" disabled={source === "cellar" && !!selectedWineId} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-[#4A4338]">Safra</Label>
                    <Input className={fieldClassName} value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="2020" type="number" disabled={source === "cellar" && !!selectedWineId} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-[#4A4338]">País</Label>
                    <Input className={fieldClassName} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País" disabled={source === "cellar" && !!selectedWineId} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-[#4A4338]">Região</Label>
                    <Input className={fieldClassName} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Região" disabled={source === "cellar" && !!selectedWineId} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-[#4A4338]">Uva / Blend</Label>
                  <Input
                    className={fieldClassName}
                    value={grape}
                    onChange={(e) => setGrape(e.target.value)}
                    placeholder="Ex: Cabernet Sauvignon, Merlot"
                    disabled={source === "cellar" && !!selectedWineId}
                  />
                </div>
              </AiModalCard>

              <AiModalCard className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                <div className="space-y-1">
                  <AiSectionLabel>Contexto da experiência</AiSectionLabel>
                  <p className="text-[14px] leading-6 text-[#645E54]">
                    Registre onde aconteceu, sua avaliação e as notas que fazem essa garrafa valer a lembrança.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-[13px] font-semibold text-[#4A4338]">
                      <MapPin className="h-4 w-4 text-[#8E7A64]" />
                      Local
                    </Label>
                    <Input className={fieldClassName} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Restaurante, casa..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-[#4A4338]">Data</Label>
                    <Input className={fieldClassName} type="date" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-[13px] font-semibold text-[#4A4338]">
                    <Star className="h-4 w-4 text-[#8E7A64]" />
                    Avaliação
                  </Label>
                  <div className="flex flex-wrap gap-2">
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
                          "min-h-12 rounded-[18px] border px-4 py-2 text-[14px] font-medium transition-all duration-200",
                          rating === opt.value
                            ? "border-[#7B1E2B] bg-[linear-gradient(135deg,#7B1E2B,#8F2436)] text-white shadow-[0_12px_26px_-14px_rgba(123,30,43,0.42)]"
                            : "border-black/5 bg-white/85 text-[#333] shadow-[0_10px_22px_-24px_rgba(0,0,0,0.18)] hover:bg-white",
                        )}
                        onClick={() => setRating(rating === opt.value ? 0 : opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-[#4A4338]">Notas de degustação</Label>
                  <Textarea
                    className="min-h-[112px] rounded-[18px] border border-black/5 bg-white/84 px-4 py-3 text-[14px] text-[#1F1F1F] shadow-[0_10px_22px_-22px_rgba(0,0,0,0.16)] placeholder:text-[#8C8579] focus-visible:ring-2 focus-visible:ring-[#7B1E2B]/18 focus-visible:ring-offset-0"
                    value={tastingNotes}
                    onChange={(e) => setTastingNotes(e.target.value)}
                    placeholder="Aromas, textura, equilíbrio, final e o contexto que fez este vinho marcar o momento."
                    rows={4}
                  />
                </div>
              </AiModalCard>
            </div>
            </AiModalSplitLayout>

            <div className="mt-3 border-t border-black/5 bg-[#FAF8F6]/96 pt-3 backdrop-blur-md">
              <AiModalActionButton
                onClick={handleSubmit}
                disabled={addConsumption.isPending}
                variant="primary"
                className="w-full bg-[linear-gradient(135deg,#7B1E2B,#8F2436)] shadow-[0_12px_28px_-16px_rgba(123,30,43,0.42)]"
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
