import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wine as WineIcon, Check, Search, Filter, Camera, Plus, Trash2, MapPin } from "@/icons/lucide";
import { useAuth } from "@/contexts/AuthContext";
import { useWines, useWineEvent } from "@/hooks/useWines";
import { useAddConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ScanWineLabelDialog } from "@/components/ScanWineLabelDialog";
import { normalizeWineSearchText } from "@/lib/wine-normalization";
import { normalizeScanResult } from "@/lib/scan-normalizer";
import {
  AI_MODAL_FIELD_CLASSNAME,
  AI_MODAL_HELP_TEXT_CLASSNAME,
  AI_MODAL_INLINE_ACTION_CLASSNAME,
  AI_MODAL_LABEL_CLASSNAME,
  AI_MODAL_LIST_ROW_CLASSNAME,
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
  AiFilterChip,
  AiModalActionButton,
  AiModalBody,
  AiModalCard,
  AiModalFooterBar,
  AiModalHeader,
  AiModalHeaderBar,
  AiModalShell,
  AiModalSplitLayout,
  AiSectionLabel,
} from "@/components/ai-flow/ModalLayout";

interface ManageBottleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "add" | "open" | "exit";
}

interface ConsumptionItem {
  id: string;
  source: "cellar" | "external";
  wineId?: string;
  wineName: string;
  producer?: string;
  country?: string;
  region?: string;
  grape?: string;
  style?: string;
  vintage?: string;
  location?: string;
  quantity: number;
  notes?: string;
  rating?: number;
}

let itemCounter = 0;

const RATING_LABELS: Record<number, string> = {
  1: "Ruim", 2: "Regular", 3: "Bom", 4: "Muito bom", 5: "Excelente",
};

const STYLE_FILTERS = [
  { value: "all" as const, label: "Todos", color: "rgba(28,28,28,0.28)" },
  { value: "tinto" as const, label: "Tinto", color: "#7B1E2B" },
  { value: "branco" as const, label: "Branco", color: "#C8A96A" },
  { value: "rose" as const, label: "Rosé", color: "#E8A0A6" },
  { value: "espumante" as const, label: "Espumante", color: "#6B7D55" },
  { value: "sobremesa" as const, label: "Sobremesa", color: "#B4793F" },
];

export function ManageBottleDialog({ open, onOpenChange }: ManageBottleDialogProps) {
  const { profileType } = useAuth();
  const [items, setItems] = useState<ConsumptionItem[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [source, setSource] = useState<"cellar" | "external">("cellar");
  const [wineId, setWineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [styleFilter, setStyleFilter] = useState<"all" | "tinto" | "branco" | "rose" | "espumante" | "sobremesa">("all");

  const [extWineName, setExtWineName] = useState("");
  const [extProducer, setExtProducer] = useState("");
  const [extCountry, setExtCountry] = useState("");
  const [extRegion, setExtRegion] = useState("");
  const [extGrape, setExtGrape] = useState("");
  const [extStyle, setExtStyle] = useState("");
  const [extVintage, setExtVintage] = useState("");
  const [extLocation, setExtLocation] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [rating, setRating] = useState(0);

  const { data: wines } = useWines();
  const wineEvent = useWineEvent();
  const addConsumption = useAddConsumption();
  const { toast } = useToast();

  const resetCurrentItem = () => {
    setWineId(""); setQuantity("1"); setNotes(""); setSearchText("");
    setShowFilters(false); setSelectedCountries([]); setSelectedGrapes([]); setStyleFilter("all");
    setExtWineName(""); setExtProducer(""); setExtCountry(""); setExtRegion("");
    setExtGrape(""); setExtStyle(""); setExtVintage(""); setExtLocation("");
    setRating(0);
  };

  const resetAll = () => {
    resetCurrentItem();
    setItems([]); setSuccess(null); setSubmitting(false);
    setSource("cellar");
  };

  const handleScanComplete = (data: any) => {
    const raw = data && typeof data === "object" && "raw" in data && data.raw && typeof data.raw === "object"
      ? data.raw
      : data;
    const normalizedSource = data && typeof data === "object" && "normalized" in data && data.normalized && typeof data.normalized === "object"
      ? data.normalized
      : raw;
    const normalized = normalizeScanResult(normalizedSource);

    console.log("SCAN_RESULT_MAPPED", {
      rawKeys: raw && typeof raw === "object" ? Object.keys(raw) : [],
      normalizedKeys: Object.keys(normalized).filter((key) => normalized[key as keyof typeof normalized] != null && normalized[key as keyof typeof normalized] !== ""),
      normalized,
    });

    setExtWineName("");
    setExtProducer("");
    setExtCountry("");
    setExtRegion("");
    setExtGrape("");
    setExtStyle("");
    setExtVintage("");
    setExtLocation("");

    if (normalized.name) setExtWineName(normalized.name);
    if (normalized.producer) setExtProducer(normalized.producer);
    if (normalized.country) setExtCountry(normalized.country);
    if (normalized.region) setExtRegion(normalized.region);
    if (normalized.grape) setExtGrape(normalized.grape);
    if (normalized.style) setExtStyle(normalized.style);
    if (normalized.vintage != null) setExtVintage(String(normalized.vintage));
    if (normalized.cellar_location) setExtLocation(normalized.cellar_location);
  };

  const addItemToList = () => {
    if (source === "cellar") {
      if (!wineId) return;
      const wine = wines?.find(w => w.id === wineId);
      if (!wine) return;
      setItems(prev => [...prev, {
        id: `item-${++itemCounter}`,
        source: "cellar",
        wineId,
        wineName: wine.name,
        producer: wine.producer || undefined,
        country: wine.country || undefined,
        region: wine.region || undefined,
        grape: wine.grape || undefined,
        style: wine.style || undefined,
        vintage: wine.vintage ? String(wine.vintage) : undefined,
        quantity: parseInt(quantity) || 1,
        notes: notes || undefined,
        rating: rating > 0 ? rating : undefined,
      }]);
    } else {
      if (!extWineName.trim()) {
        toast({ title: "Informe o nome do vinho", variant: "destructive" });
        return;
      }
      setItems(prev => [...prev, {
        id: `item-${++itemCounter}`,
        source: "external",
        wineName: extWineName.trim(),
        producer: extProducer || undefined,
        country: extCountry || undefined,
        region: extRegion || undefined,
        grape: extGrape || undefined,
        style: extStyle || undefined,
        vintage: extVintage || undefined,
        location: extLocation || undefined,
        quantity: parseInt(quantity) || 1,
        notes: notes || undefined,
        rating: rating > 0 ? rating : undefined,
      }]);
    }
    resetCurrentItem();
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmitAll = async () => {
    if (items.length === 0) return;
    setSubmitting(true);

    try {
      for (const item of items) {
        if (item.source === "cellar" && item.wineId) {
          await wineEvent.mutateAsync({
            wineId: item.wineId,
            eventType: "open",
            quantity: item.quantity,
            notes: item.notes,
          });
        }

        await addConsumption.mutateAsync({
          source: item.source,
          wine_id: item.wineId || null,
          wine_name: item.wineName,
          producer: item.producer || null,
          country: item.country || null,
          region: item.region || null,
          grape: item.grape || null,
          style: item.style || null,
          vintage: item.vintage ? parseInt(item.vintage) : null,
          location: item.location || null,
          tasting_notes: item.notes || null,
          rating: item.rating || null,
          consumed_at: new Date().toISOString().split("T")[0],
        });
      }

      setSuccess(`${items.length} consumo(s) registrado(s) com sucesso!`);
      setTimeout(() => { resetAll(); onOpenChange(false); }, 1500);
    } catch {
      toast({ title: "Não conseguimos registrar os consumos", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  const baseWines = wines?.filter(w => w.quantity > 0) ?? [];

  const countries = useMemo(() =>
    [...new Set(baseWines.map(w => w.country).filter(Boolean) as string[])].sort(),
    [baseWines]
  );
  const grapesList = useMemo(() =>
    [...new Set(baseWines.map(w => w.grape).filter(Boolean) as string[])].sort(),
    [baseWines]
  );

  const matchesStyleFilter = (style: string | null | undefined, filter: typeof styleFilter) => {
    if (filter === "all") return true;
    const s = (style || "").toLowerCase();
    if (filter === "tinto") return s.includes("tinto") || s.includes("red");
    if (filter === "branco") return s.includes("branco") || s.includes("white");
    if (filter === "rose") return s.includes("rosé") || s.includes("rose");
    if (filter === "espumante") return s.includes("espumante") || s.includes("sparkling") || s.includes("champagne");
    if (filter === "sobremesa") return s.includes("sobremesa") || s.includes("fortificado") || s.includes("dessert");
    return true;
  };

  const filteredWines = useMemo(() => {
    return baseWines.filter(w => {
      if (searchText) {
        const q = normalizeWineSearchText(searchText);
        const match = normalizeWineSearchText(w.name).includes(q) ||
          normalizeWineSearchText(w.producer).includes(q) ||
          normalizeWineSearchText(w.grape).includes(q) ||
          normalizeWineSearchText(w.country).includes(q) ||
          String(w.vintage ?? "").includes(q);
        if (!match) return false;
      }
      if (!matchesStyleFilter(w.style, styleFilter)) return false;
      if (selectedCountries.length > 0 && (!w.country || !selectedCountries.map((value) => normalizeWineSearchText(value)).includes(normalizeWineSearchText(w.country)))) return false;
      if (selectedGrapes.length > 0 && (!w.grape || !selectedGrapes.map((value) => normalizeWineSearchText(value)).includes(normalizeWineSearchText(w.grape)))) return false;
      return true;
    });
  }, [baseWines, searchText, selectedCountries, selectedGrapes, styleFilter]);

  const selectedWine = wines?.find(w => w.id === wineId);
  const activeFilterCount = selectedCountries.length + selectedGrapes.length;

  const toggleFilter = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const canAddItem = source === "cellar" ? !!wineId : !!extWineName.trim();
  const fieldClassName = AI_MODAL_FIELD_CLASSNAME;
  const submitLabel = submitting
    ? "Salvando..."
    : items.length === 0
      ? "Adicione um vinho à lista"
      : items.length === 1
        ? "Salvar consumo"
        : `Salvar ${items.length} consumos`;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) resetAll(); onOpenChange(v); }}>
        <SheetContent
          centered
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
                description="Registre uma degustação da sua adega ou um consumo externo."
                tone="wine"
              />
            </AiModalHeaderBar>

            <AiModalBody className="consumption-modal-body">
              <AiModalSplitLayout contentClassName="overflow-y-auto">
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-12"
                    >
                      <AiModalCard className="consumption-details-card flex flex-col items-center gap-3 py-10 text-center">
                        <div className="consumption-wine-icon is-selected h-12 w-12 min-w-[48px]">
                          <Check className="h-5 w-5" />
                        </div>
                        <div>
                          <p className={cn("text-center", AI_MODAL_TEXT_PRIMARY_CLASSNAME)}>{success}</p>
                          <p className={cn("mt-1 text-center", AI_MODAL_HELP_TEXT_CLASSNAME)}>
                            Fechando automaticamente.
                          </p>
                        </div>
                      </AiModalCard>
                    </motion.div>
                  ) : (
                    <motion.div key="form" className="space-y-3">
                      {items.length > 0 ? (
                        <AiModalCard className="consumption-details-card">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <AiSectionLabel>Itens adicionados</AiSectionLabel>
                            <span className={AI_MODAL_HELP_TEXT_CLASSNAME}>{items.length} selecionado(s)</span>
                          </div>
                          <div className="space-y-2">
                            {items.map((item) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="consumption-selected-summary rounded-[22px] px-3 py-3"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="consumption-wine-icon is-selected">
                                    <WineIcon className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="consumption-wine-name truncate">{item.wineName}</p>
                                    <p className={cn("mt-0.5 truncate", AI_MODAL_HELP_TEXT_CLASSNAME)}>
                                      {item.quantity} un.{item.rating ? ` · ${RATING_LABELS[item.rating]}` : ""}
                                      {item.source === "external" ? " · Externo" : ""}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className={cn(AI_MODAL_INLINE_ACTION_CLASSNAME, "h-8 px-2.5")}
                                  aria-label="Remover item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        </AiModalCard>
                      ) : null}

                      <section className="consumption-section">
                        <AiSectionLabel>Origem</AiSectionLabel>
                        <div className="consumption-source-grid">
                          {([
                            { value: "cellar" as const, label: "Minha adega", desc: "Registrar abertura", icon: WineIcon },
                            { value: "external" as const, label: "Externo", desc: "Restaurante / outro", icon: MapPin },
                          ]).map((opt) => {
                            const active = source === opt.value;
                            const Icon = opt.icon;

                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => { setSource(opt.value); setWineId(""); }}
                                className={cn(
                                  AI_MODAL_SELECTION_CARD_CLASSNAME,
                                  "consumption-source-card",
                                  active && "is-selected",
                                  active ? AI_MODAL_SELECTION_CARD_ACTIVE_CLASSNAME : AI_MODAL_SELECTION_CARD_IDLE_CLASSNAME,
                                )}
                              >
                                <div className={cn("consumption-source-icon", opt.value === "external" && "olive", active && "is-selected")}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={cn("consumption-source-title", AI_MODAL_TEXT_PRIMARY_CLASSNAME)}>{opt.label}</p>
                                  <p className={cn("consumption-source-sub", AI_MODAL_HELP_TEXT_CLASSNAME)}>{opt.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      {source === "cellar" ? (
                        selectedWine ? (
                          <section className="consumption-selected-summary">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="consumption-wine-icon is-selected">
                                <WineIcon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <AiSectionLabel>Garrafa selecionada</AiSectionLabel>
                                <p className="consumption-wine-name mt-1 truncate">{selectedWine.name}</p>
                                <p className={cn("mt-0.5 truncate", AI_MODAL_HELP_TEXT_CLASSNAME)}>
                                  {[selectedWine.producer, selectedWine.vintage, selectedWine.country].filter(Boolean).join(" · ")} · {selectedWine.quantity} un.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setWineId("")}
                              className={cn(AI_MODAL_INLINE_ACTION_CLASSNAME, "consumption-change-button")}
                            >
                              Trocar
                            </button>
                          </section>
                        ) : (
                          <section className="consumption-section consumption-picker-section">
                            <div className="consumption-section-head">
                              <AiSectionLabel>Vinho</AiSectionLabel>
                              <span className={AI_MODAL_HELP_TEXT_CLASSNAME}>{filteredWines.length} vinhos</span>
                            </div>

                            <div className="consumption-search relative">
                              <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(72,60,46,0.46)]" />
                              <Input
                                placeholder="Buscar por nome, uva, país, safra"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className={cn(fieldClassName, "pl-10 pr-12")}
                              />
                              <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={cn(
                                  "absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
                                  showFilters || activeFilterCount > 0
                                    ? "bg-[rgba(58,74,46,0.12)] text-[var(--sx-olive)]"
                                    : "text-[rgba(72,60,46,0.46)] hover:bg-[rgba(58,74,46,0.08)] hover:text-[var(--sx-olive)]",
                                )}
                                aria-label="Filtros"
                              >
                                <Filter className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <AnimatePresence>
                              {showFilters ? (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <AiModalCard className="consumption-details-card px-3 py-3">
                                    {countries.length > 0 ? (
                                      <div className="space-y-2">
                                        <AiSectionLabel>País</AiSectionLabel>
                                        <div className="flex flex-wrap gap-1.5">
                                          {countries.map((country) => (
                                            <AiFilterChip
                                              key={country}
                                              type="button"
                                              selected={selectedCountries.includes(country)}
                                              onClick={() => toggleFilter(country, selectedCountries, setSelectedCountries)}
                                            >
                                              {country}
                                            </AiFilterChip>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}

                                    {grapesList.length > 0 ? (
                                      <div className={cn("space-y-2", countries.length > 0 && "mt-3")}>
                                        <AiSectionLabel>Uva</AiSectionLabel>
                                        <div className="flex flex-wrap gap-1.5">
                                          {grapesList.map((grape) => (
                                            <AiFilterChip
                                              key={grape}
                                              type="button"
                                              selected={selectedGrapes.includes(grape)}
                                              onClick={() => toggleFilter(grape, selectedGrapes, setSelectedGrapes)}
                                            >
                                              {grape}
                                            </AiFilterChip>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}

                                    {activeFilterCount > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => { setSelectedCountries([]); setSelectedGrapes([]); }}
                                        className={cn(AI_MODAL_INLINE_ACTION_CLASSNAME, "mt-3")}
                                      >
                                        Limpar filtros
                                      </button>
                                    ) : null}
                                  </AiModalCard>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>

                            <div className="consumption-chip-row">
                              {STYLE_FILTERS.map((pill) => (
                                <AiFilterChip
                                  key={pill.value}
                                  type="button"
                                  selected={styleFilter === pill.value}
                                  onClick={() => setStyleFilter(pill.value)}
                                  className="consumption-filter-chip shrink-0 uppercase tracking-[0.04em]"
                                >
                                  <span className="mr-1 inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pill.color }} />
                                  {pill.label}
                                </AiFilterChip>
                              ))}
                            </div>

                            <div className={cn("consumption-wine-list max-h-[320px]", AI_MODAL_LIST_SURFACE_CLASSNAME)}>
                              {filteredWines.length === 0 ? (
                                <div className="px-4 py-6 text-center">
                                  <p className={AI_MODAL_TEXT_PRIMARY_CLASSNAME}>
                                    {baseWines.length === 0 ? "Você ainda não cadastrou vinhos" : "Nenhum vinho encontrado"}
                                  </p>
                                  {baseWines.length > 0 ? (
                                    <p className={cn("mt-0.5", AI_MODAL_HELP_TEXT_CLASSNAME)}>
                                      Use a busca ou ajuste os filtros.
                                    </p>
                                  ) : null}
                                </div>
                              ) : (
                                filteredWines.map((wine) => {
                                  const selected = wineId === wine.id;

                                  return (
                                    <button
                                      key={wine.id}
                                      type="button"
                                      onClick={() => setWineId(wine.id)}
                                      className={cn(
                                        AI_MODAL_LIST_ROW_CLASSNAME,
                                        "consumption-wine-row",
                                        selected && "is-selected",
                                      )}
                                    >
                                      <div className={cn("consumption-wine-icon", selected && "is-selected")}>
                                        {selected ? <Check className="h-3.5 w-3.5" /> : <WineIcon className="h-3.5 w-3.5" />}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="consumption-wine-name truncate">
                                          {wine.name}
                                          {wine.vintage ? <span className="consumption-wine-vintage"> {wine.vintage}</span> : null}
                                        </p>
                                        <p className="consumption-wine-meta truncate">
                                          {[wine.producer, wine.grape, wine.country].filter(Boolean).join(" · ") || "Vinho da adega"}
                                        </p>
                                      </div>
                                      <span className={cn("consumption-qty-badge", selected && "is-selected")}>
                                        {wine.quantity}x
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </section>
                        )
                      ) : (
                        <AiModalCard className="consumption-details-card">
                          <div className="flex items-center justify-between gap-3">
                            <AiSectionLabel>Dados do vinho</AiSectionLabel>
                            <button
                              type="button"
                              onClick={() => setScanOpen(true)}
                              className={cn(AI_MODAL_INLINE_ACTION_CLASSNAME, "shrink-0")}
                            >
                              <Camera className="h-3.5 w-3.5" />
                              Escanear rótulo
                            </button>
                          </div>

                          <div className="consumption-field-grid mt-3">
                            <Input value={extWineName} onChange={(e) => setExtWineName(e.target.value)} placeholder="Nome do vinho *" className={cn(fieldClassName, "col-span-2")} />
                            <div className="consumption-two-col">
                              <Input value={extProducer} onChange={(e) => setExtProducer(e.target.value)} placeholder="Produtor" className={fieldClassName} />
                              <Input value={extVintage} onChange={(e) => setExtVintage(e.target.value)} placeholder="Safra" type="number" className={fieldClassName} />
                              <Input value={extCountry} onChange={(e) => setExtCountry(e.target.value)} placeholder="País" className={fieldClassName} />
                              <Input value={extRegion} onChange={(e) => setExtRegion(e.target.value)} placeholder="Região" className={fieldClassName} />
                              <Input value={extGrape} onChange={(e) => setExtGrape(e.target.value)} placeholder="Uva" className={fieldClassName} />
                              <Input value={extLocation} onChange={(e) => setExtLocation(e.target.value)} placeholder="Local (restaurante, viagem...)" className={fieldClassName} />
                            </div>
                          </div>
                        </AiModalCard>
                      )}

                      <AiModalCard className="consumption-details-card">
                        <AiSectionLabel>Detalhes</AiSectionLabel>
                        <div className="consumption-field-grid mt-3">
                          <div className="consumption-two-col">
                            <div className="space-y-1">
                              <label className={AI_MODAL_LABEL_CLASSNAME}>Quantidade</label>
                              <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className={fieldClassName}
                              />
                            </div>

                            {profileType !== "commercial" ? (
                              <div className="space-y-1">
                                <label className={AI_MODAL_LABEL_CLASSNAME}>Avaliação</label>
                                <div className="consumption-rating-grid">
                                  {Object.entries(RATING_LABELS).map(([value, label]) => {
                                    const numericValue = Number(value);
                                    const selected = rating === numericValue;

                                    return (
                                      <button
                                        key={value}
                                        type="button"
                                        onClick={() => setRating(selected ? 0 : numericValue)}
                                        className={cn(
                                          AI_MODAL_SEGMENTED_BUTTON_CLASSNAME,
                                          "consumption-rating-button",
                                          selected ? AI_MODAL_SEGMENTED_BUTTON_ACTIVE_CLASSNAME : AI_MODAL_SEGMENTED_BUTTON_IDLE_CLASSNAME,
                                        )}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <label className={AI_MODAL_LABEL_CLASSNAME}>Observações</label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Impressões, ocasião, serviço."
                              className={cn(AI_MODAL_TEXTAREA_CLASSNAME, "min-h-[86px]")}
                              rows={2}
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <AiModalActionButton
                            type="button"
                            variant="secondary"
                            disabled={!canAddItem}
                            onClick={addItemToList}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar à lista
                          </AiModalActionButton>
                        </div>
                      </AiModalCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </AiModalSplitLayout>
            </AiModalBody>

            {!success ? (
              <AiModalFooterBar>
                <AiModalActionButton
                  type="button"
                  variant="primary"
                  disabled={submitting || items.length === 0}
                  onClick={handleSubmitAll}
                  className="w-full"
                >
                  {submitLabel}
                </AiModalActionButton>
              </AiModalFooterBar>
            ) : null}
          </AiModalShell>
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
