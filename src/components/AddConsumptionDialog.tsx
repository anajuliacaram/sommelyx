import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useWineEvent, useWines } from "@/hooks/useWines";
import { toast } from "sonner";
import { Wine as WineIcon, MapPin, Star, Search, Check } from "@/icons/lucide";
import { cn } from "@/lib/utils";
import { normalizeWineSearchText } from "@/lib/wine-normalization";
import {
  AI_MODAL_FIELD_CLASSNAME,
  AI_MODAL_HELP_TEXT_CLASSNAME,
  AI_MODAL_INLINE_ACTION_CLASSNAME,
  AI_MODAL_LABEL_CLASSNAME,
  AI_MODAL_LIST_ROW_CLASSNAME,
  AI_MODAL_LIST_ROW_SELECTED_CLASSNAME,
  AI_MODAL_LIST_SURFACE_CLASSNAME,
  AI_MODAL_SEGMENTED_BUTTON_ACTIVE_CLASSNAME,
  AI_MODAL_SEGMENTED_BUTTON_CLASSNAME,
  AI_MODAL_SEGMENTED_BUTTON_IDLE_CLASSNAME,
  AI_MODAL_SELECTION_CARD_ACTIVE_CLASSNAME,
  AI_MODAL_SELECTION_CARD_CLASSNAME,
  AI_MODAL_SELECTION_CARD_IDLE_CLASSNAME,
  AI_MODAL_SHEET_CONTENT_CLASSNAME,
  AI_MODAL_SHEET_CONTENT_STYLE,
  AI_MODAL_TEXTAREA_CLASSNAME,
  AI_MODAL_TEXT_PRIMARY_CLASSNAME,
  AiModalActionButton,
  AiModalBody,
  AiModalCard,
  AiFilterChip,
  AiModalFooterBar,
  AiModalHeader,
  AiModalHeaderBar,
  AiModalShell,
  AiSectionLabel,
  AiModalSplitLayout,
} from "@/components/ai-flow/ModalLayout";

type WineTypeFilter = "all" | "tinto" | "branco" | "rose" | "espumante" | "sobremesa";

const TYPE_FILTERS: { id: WineTypeFilter; label: string; dot: string }[] = [
  { id: "all", label: "Todos", dot: "bg-[#1C1C1C]/30" },
  { id: "tinto", label: "Tinto", dot: "bg-[#7B1E2B]" },
  { id: "branco", label: "Branco", dot: "bg-[#C8A96A]" },
  { id: "rose", label: "Rosé", dot: "bg-[#E8A0A6]" },
  { id: "espumante", label: "Espumante", dot: "bg-[#6A8F6B]" },
  { id: "sobremesa", label: "Sobremesa", dot: "bg-[#A67C52]" },
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

      toast.success("Consumo adicionado com sucesso!");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Não conseguimos registrar o consumo", { description: "Verifique sua conexão e tente novamente. Se o problema persistir, recarregue a página." });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <SheetContent
        className={AI_MODAL_SHEET_CONTENT_CLASSNAME}
        style={AI_MODAL_SHEET_CONTENT_STYLE}
        aria-label="Adicionar consumo"
      >
        <SheetTitle className="sr-only">Adicionar consumo</SheetTitle>
        <AiModalShell>
          <AiModalHeaderBar>
            <AiModalHeader
              icon={<WineIcon className="h-5 w-5" />}
              title="Adicionar consumo"
              description="Registre uma degustação ou abertura."
              tone="wine"
            />
          </AiModalHeaderBar>

          <AiModalBody className="consumption-modal-body">
            <AiModalSplitLayout contentClassName="overflow-y-auto">
            <div className="consumption-modal-flow">
              <section className="consumption-section">
                <AiSectionLabel>Origem</AiSectionLabel>
                <div className="consumption-source-grid">
                  <button
                    type="button"
                    className={cn(
                      AI_MODAL_SELECTION_CARD_CLASSNAME,
                      "consumption-source-card",
                      source === "cellar" && "is-selected",
                      source === "cellar" ? AI_MODAL_SELECTION_CARD_ACTIVE_CLASSNAME : AI_MODAL_SELECTION_CARD_IDLE_CLASSNAME,
                    )}
                    onClick={() => { setSource("cellar"); setSelectedWineId(""); setShowWinePicker(true); }}
                  >
                    <div className={cn("consumption-source-icon", source === "cellar" && "is-selected")}>
                      <WineIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("consumption-source-title", AI_MODAL_TEXT_PRIMARY_CLASSNAME)}>Minha adega</p>
                      <p className={cn("consumption-source-sub", AI_MODAL_HELP_TEXT_CLASSNAME)}>
                          Garrafa cadastrada
                        </p>
                    </div>
                    <span className="consumption-source-meta">
                        {cellarWines.length}
                      </span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      AI_MODAL_SELECTION_CARD_CLASSNAME,
                      "consumption-source-card",
                      source === "external" && "is-selected",
                      source === "external" ? AI_MODAL_SELECTION_CARD_ACTIVE_CLASSNAME : AI_MODAL_SELECTION_CARD_IDLE_CLASSNAME,
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
                    <div className={cn("consumption-source-icon olive", source === "external" && "is-selected")}>
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("consumption-source-title", AI_MODAL_TEXT_PRIMARY_CLASSNAME)}>Externo</p>
                      <p className={cn("consumption-source-sub", AI_MODAL_HELP_TEXT_CLASSNAME)}>
                          Restaurante, viagem, jantar
                        </p>
                    </div>
                    <span className="consumption-source-meta">
                        Manual
                      </span>
                  </button>
                </div>
              </section>

              {source === "cellar" && cellarWines.length > 0 && showWinePicker && (
                <section className="consumption-section consumption-picker-section">
                  <div className="consumption-section-head">
                    <AiSectionLabel>
                      Selecionar garrafa
                    </AiSectionLabel>
                    <span className={AI_MODAL_HELP_TEXT_CLASSNAME}>{filteredWines.length} vinhos</span>
                  </div>

                  <div className="consumption-search relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(72,60,46,0.46)]" />
                    <Input
                      value={wineSearch}
                      onChange={(e) => setWineSearch(e.target.value)}
                      placeholder="Buscar rótulo, produtor, uva"
                      className={cn(fieldClassName, "pl-10")}
                    />
                  </div>

                  <div className="consumption-chip-row">
                    {TYPE_FILTERS.map((f) => {
                      return (
                        <AiFilterChip
                          key={f.id}
                          type="button"
                          onClick={() => setTypeFilter(f.id)}
                          selected={typeFilter === f.id}
                          className="consumption-filter-chip shrink-0 uppercase tracking-[0.04em]"
                        >
                          <span className={cn("mr-1 inline-flex h-1.5 w-1.5 rounded-full", f.dot)} />
                          {f.label}
                        </AiFilterChip>
                      );
                    })}
                  </div>

                  <div
                    className={cn("consumption-wine-list", AI_MODAL_LIST_SURFACE_CLASSNAME)}
                  >
                    {filteredWines.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className={AI_MODAL_TEXT_PRIMARY_CLASSNAME}>Nenhum vinho encontrado na adega</p>
                        <p className={cn("mt-0.5", AI_MODAL_HELP_TEXT_CLASSNAME)}>Use a busca ou ajuste os filtros.</p>
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
                              AI_MODAL_LIST_ROW_CLASSNAME,
                              "consumption-wine-row",
                              selected && "is-selected",
                              selected && AI_MODAL_LIST_ROW_SELECTED_CLASSNAME,
                            )}
                          >
                            <div className={cn(
                              "consumption-wine-icon",
                              selected && "is-selected",
                            )}>
                              {selected ? <Check className="h-3.5 w-3.5" /> : <WineIcon className="h-3.5 w-3.5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="consumption-wine-name truncate">
                                {w.name}
                                {w.vintage ? <span className="consumption-wine-vintage"> {w.vintage}</span> : null}
                              </p>
                              <p className="consumption-wine-meta truncate">
                                {[w.grape, w.country].filter(Boolean).join(" · ") || w.producer || "Garrafa da adega"}
                              </p>
                            </div>
                            <span className={cn(
                              "consumption-qty-badge",
                              selected && "is-selected",
                            )}>
                              {w.quantity}x
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              )}

              {source === "cellar" && selectedWine && !showWinePicker ? (
                <section className="consumption-selected-summary">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="consumption-wine-icon is-selected">
                      <WineIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <AiSectionLabel>Garrafa selecionada</AiSectionLabel>
                      <p className="consumption-wine-name mt-1 truncate">{selectedWine.name}</p>
                      <p className={cn("consumption-wine-meta mt-0.5 truncate", AI_MODAL_HELP_TEXT_CLASSNAME)}>
                        {[selectedWine.producer, selectedWine.vintage, selectedWine.country].filter(Boolean).join(" · ") || "Vinho da adega"}
                      </p>
                    </div>
                  </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(AI_MODAL_INLINE_ACTION_CLASSNAME, "consumption-change-button")}
                      onClick={() => setShowWinePicker(true)}
                    >
                      Trocar
                    </Button>
                </section>
              ) : null}

              <AiModalCard className="consumption-details-card">
                <AiSectionLabel>Vinho</AiSectionLabel>
                <div className="consumption-field-grid mt-3">
                  <div className="space-y-1">
                    <Label className={AI_MODAL_LABEL_CLASSNAME}>
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

                  <div className="consumption-two-col">
                    <div className="space-y-1">
                      <Label className={AI_MODAL_LABEL_CLASSNAME}>Produtor</Label>
                      <Input className={fieldClassName} value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="Produtor" disabled={source === "cellar" && !!selectedWineId} />
                    </div>
                    <div className="space-y-1">
                      <Label className={AI_MODAL_LABEL_CLASSNAME}>Safra</Label>
                      <Input className={fieldClassName} value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="2020" type="number" disabled={source === "cellar" && !!selectedWineId} />
                    </div>
                    <div className="space-y-1">
                      <Label className={AI_MODAL_LABEL_CLASSNAME}>País</Label>
                      <Input className={fieldClassName} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="País" disabled={source === "cellar" && !!selectedWineId} />
                    </div>
                    <div className="space-y-1">
                      <Label className={AI_MODAL_LABEL_CLASSNAME}>Região</Label>
                      <Input className={fieldClassName} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Região" disabled={source === "cellar" && !!selectedWineId} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className={AI_MODAL_LABEL_CLASSNAME}>Uva / Blend</Label>
                    <Input
                      className={fieldClassName}
                      value={grape}
                      onChange={(e) => setGrape(e.target.value)}
                      placeholder="Ex: Cabernet Sauvignon, Merlot"
                      disabled={source === "cellar" && !!selectedWineId}
                    />
                  </div>
                </div>
              </AiModalCard>

              <AiModalCard className="consumption-details-card">
                <AiSectionLabel>Detalhes</AiSectionLabel>
                <div className="consumption-field-grid mt-3">
                  <div className="consumption-two-col">
                    <div className="space-y-1">
                      <Label className={cn("flex items-center gap-1", AI_MODAL_LABEL_CLASSNAME)}>
                        <MapPin className="h-3 w-3 text-[#8E7A64]" />
                        Local
                      </Label>
                      <Input className={fieldClassName} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Restaurante, casa..." />
                    </div>
                    <div className="space-y-1">
                      <Label className={AI_MODAL_LABEL_CLASSNAME}>Data</Label>
                      <Input className={fieldClassName} type="date" value={consumedAt} onChange={(e) => setConsumedAt(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className={cn("flex items-center gap-1", AI_MODAL_LABEL_CLASSNAME)}>
                      <Star className="h-3 w-3 text-[#8E7A64]" />
                      Avaliação
                    </Label>
                    <div className="consumption-rating-grid">
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
                            AI_MODAL_SEGMENTED_BUTTON_CLASSNAME,
                            "consumption-rating-button",
                            rating === opt.value ? AI_MODAL_SEGMENTED_BUTTON_ACTIVE_CLASSNAME : AI_MODAL_SEGMENTED_BUTTON_IDLE_CLASSNAME,
                          )}
                          onClick={() => setRating(rating === opt.value ? 0 : opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className={AI_MODAL_LABEL_CLASSNAME}>Notas de degustação</Label>
                    <Textarea
                      className={cn(AI_MODAL_TEXTAREA_CLASSNAME, "min-h-[86px]")}
                      value={tastingNotes}
                      onChange={(e) => setTastingNotes(e.target.value)}
                      placeholder="Aromas, textura, equilíbrio, final."
                      rows={2}
                    />
                  </div>
                </div>
              </AiModalCard>
            </div>
            </AiModalSplitLayout>
          </AiModalBody>

          <AiModalFooterBar>
              <AiModalActionButton
                onClick={handleSubmit}
                disabled={addConsumption.isPending}
                variant="primary"
                className="w-full"
              >
                {addConsumption.isPending ? "Salvando..." : "Salvar consumo"}
              </AiModalActionButton>
          </AiModalFooterBar>
        </AiModalShell>
      </SheetContent>
    </Sheet>
  );
}
