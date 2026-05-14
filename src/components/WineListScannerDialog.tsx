import { useState, useRef, useCallback, useMemo, type ComponentProps } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
  Search,
  SlidersHorizontal,
  FileText,
  ChevronDown,
  ChevronUp,
  Heart,
  GlassWater,
  Eye,
  UtensilsCrossed,
} from "@/icons/lucide";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  analyzeWineList,
  buildUserProfile,
  normalizeWineListResponse,
  type WineListAnalysis,
  type WineListItem,
  type WineListAnalysisTextInput,
} from "@/lib/sommelier-ai";
import { getAttachmentErrorMessage, prepareWineListAnalysisTextAttachment } from "@/lib/ai-attachments";
import { useWines, type Wine } from "@/hooks/useWines";
import { useAddWishlist } from "@/hooks/useBusinessData";
import { useToast } from "@/hooks/use-toast";
import { notifySuccess } from "@/lib/feedback";
import { buildPresentationStructureLine, getAiPresentationStatus } from "@/lib/ai-presentation";
import { normalizeWineSearchText } from "@/lib/wine-normalization";
import { cn } from "@/lib/utils";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import {
  AiModalHeader,
  AiModalCard,
  AiModalActionButton,
  AiModalShell,
  AiModalHeaderBar,
  AiModalBody,
  AiModalSplitLayout,
  AiModalEyebrow,
  AiModalKeyValue,
  AiMetricPill,
  AI_MODAL_SHEET_CONTENT_CLASSNAME,
  AI_MODAL_SHEET_CONTENT_STYLE,
} from "@/components/ai-flow/ModalLayout";
import { PairingLoadingState, PairingErrorState } from "@/components/pairing/shared";
import { AddWineDialog } from "@/components/AddWineDialog";
import { EditWineDialog } from "@/components/EditWineDialog";
import { DishToWineDialog } from "@/components/DishToWineDialog";
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";

interface WineListScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScanStep = "capture" | "scanning" | "results" | "error";
type WineType = "tinto" | "branco" | "rosé" | "espumante" | "unknown";
type FilterMode = "all" | "tinto" | "branco" | "rosé" | "espumante";
type FocusFilter = "all" | "drink-now" | "cellaring" | "premium" | "best-value";

const MODAL_STYLE = {
  ...AI_MODAL_SHEET_CONTENT_STYLE,
  width: "min(98vw, 1420px)",
  maxWidth: "1420px",
};

const EMPTY_WINE_LIST_ANALYSIS: WineListAnalysis = {
  wines: [],
  topPick: null,
  bestValue: null,
  fallback: true,
  fallbackReason: null,
};

const TYPE_PILLS: Array<{ key: FilterMode; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "tinto", label: "Tintos" },
  { key: "branco", label: "Brancos" },
  { key: "rosé", label: "Rosés" },
  { key: "espumante", label: "Espumantes" },
];

const FOCUS_PILLS: Array<{ key: FocusFilter; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "drink-now", label: "Beber agora" },
  { key: "cellaring", label: "Guarda" },
  { key: "premium", label: "Premium" },
  { key: "best-value", label: "Best value" },
];

const CANONICAL_TAGS = [
  "Melhor escolha",
  "Melhor custo-benefício",
  "Em guarda",
  "Beber agora",
  "Ícone da carta",
  "Alta complexidade",
] as const;

function isSupportedUploadFile(file: File) {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const allowedImageMimes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
  if (mime === "application/pdf") return true;
  if (allowedImageMimes.has(mime)) return true;
  return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf"].some((ext) => name.endsWith(ext));
}

function detectWineType(style?: string): WineType {
  if (!style) return "unknown";
  const s = style.toLowerCase();
  if (s.includes("tinto") || s.includes("red")) return "tinto";
  if (s.includes("branco") || s.includes("white")) return "branco";
  if (s.includes("rosé") || s.includes("rose") || s.includes("rosado")) return "rosé";
  if (s.includes("espumante") || s.includes("sparkling") || s.includes("champagne") || s.includes("cava") || s.includes("prosecco")) return "espumante";
  return "unknown";
}

function normalizeDisplayTags(tags?: string[] | null) {
  const mapped = (tags || [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => CANONICAL_TAGS.find((canonical) => canonical.toLowerCase() === tag.toLowerCase()) || tag)
    .filter((tag) => CANONICAL_TAGS.includes(tag as (typeof CANONICAL_TAGS)[number]));
  return Array.from(new Set(mapped));
}

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function compactText(value: string, maxLength: number) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildDescriptorLine(wine: WineListItem) {
  const styleLabel =
    wine.style ||
    (wine.category === "red"
      ? "Tinto"
      : wine.category === "white"
        ? "Branco"
        : wine.category === "sparkling"
          ? "Espumante"
          : "Rosé");
  const bodyLabel =
    wine.body === "leve" ? "Corpo leve" : wine.body === "médio" ? "Corpo médio" : wine.body === "encorpado" ? "Corpo estruturado" : null;
  const structureLabel =
    wine.tannin === "alto"
      ? "Estruturado"
      : wine.tannin === "médio"
        ? "Taninos médios"
        : wine.acidity === "alta"
          ? "Acidez viva"
          : wine.acidity === "média"
            ? "Acidez equilibrada"
            : null;
  return buildPresentationStructureLine([styleLabel, wine.grape, bodyLabel, structureLabel]);
}

function buildPairingLine(wine: WineListItem) {
  const dishes = (wine.pairings || [])
    .map((pairing) => pairing.dish?.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
  return dishes.length > 0 ? dishes.join(" • ") : null;
}

function buildStatusTags(wine: WineListItem, isTopPick: boolean, isBestValue: boolean) {
  const rawTags = normalizeDisplayTags([
    ...(wine.comparativeLabels || []),
    isTopPick || wine.highlight === "top-pick" ? "Melhor escolha" : "",
    isBestValue || wine.highlight === "best-value" ? "Melhor custo-benefício" : "",
  ]);

  return rawTags
    .map((tag) => {
      if (tag === "Melhor escolha") return "Seleção da casa";
      if (tag === "Melhor custo-benefício") return "Best value";
      if (tag === "Beber agora") return "Beber agora";
      if (tag === "Em guarda") return "Guarda";
      if (tag === "Ícone da carta") return "Premium";
      if (tag === "Alta complexidade") return "Alta complexidade";
      return tag;
    })
    .slice(0, 3);
}

function matchesFocusFilter(wine: WineListItem, isTopPick: boolean, isBestValue: boolean, filter: FocusFilter) {
  const tags = buildStatusTags(wine, isTopPick, isBestValue);
  if (filter === "all") return true;
  if (filter === "drink-now") return tags.includes("Beber agora");
  if (filter === "cellaring") return tags.includes("Guarda");
  if (filter === "premium") return tags.includes("Premium") || tags.includes("Alta complexidade") || tags.includes("Seleção da casa");
  if (filter === "best-value") return tags.includes("Best value");
  return true;
}

function findCellarMatch(wine: WineListItem, cellarWines: Wine[]) {
  const candidate = normalizeWineSearchText([wine.name, wine.producer, wine.vintage].filter(Boolean).join(" "));
  const fallback = normalizeWineSearchText(wine.name);
  return (
    cellarWines.find((item) => normalizeWineSearchText([item.name, item.producer, item.vintage].filter(Boolean).join(" ")) === candidate) ||
    cellarWines.find((item) => normalizeWineSearchText(item.name) === fallback) ||
    null
  );
}

function buildWishlistPayload(wine: WineListItem) {
  return {
    wine_name: wine.name,
    notes: null,
    producer: wine.producer || null,
    vintage: wine.vintage ?? null,
    style: wine.style || null,
    country: wine.country || null,
    region: wine.region || null,
    grape: wine.grape || null,
    target_price: wine.price ?? null,
    image_url: null,
    ai_summary: null,
    source: "menu-analysis",
  } as const;
}

type AddWineInitialValues = ComponentProps<typeof AddWineDialog>["initialValues"];
type ConsumptionWine = ComponentProps<typeof AddConsumptionDialog>["preSelectedWine"];

export function WineListScannerDialog({ open, onOpenChange }: WineListScannerDialogProps) {
  const { data: wines } = useWines();
  const cellarWines = useMemo(() => (wines || []).filter((wine) => wine.quantity > 0), [wines]);
  const addWishlist = useAddWishlist();
  const { toast } = useToast();

  const [step, setStep] = useState<ScanStep>("capture");
  const [attachmentPreview, setAttachmentPreview] = useState<{ url?: string | null; fileName: string; isPdf: boolean } | null>(null);
  const [results, setResults] = useState<WineListAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastAttachment, setLastAttachment] = useState<WineListAnalysisTextInput | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWineName, setSelectedWineName] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [prefillWine, setPrefillWine] = useState<AddWineInitialValues | null>(null);
  const [editWine, setEditWine] = useState<Wine | null>(null);
  const [pairingWine, setPairingWine] = useState<Wine | null>(null);
  const [consumptionWine, setConsumptionWine] = useState<ConsumptionWine>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const requestBusyRef = useRef(false);
  const prepareBusyRef = useRef(false);

  const reset = () => {
    setStep("capture");
    setAttachmentPreview(null);
    setResults(null);
    setErrorMsg("");
    setLastAttachment(null);
    setFilterMode("all");
    setFocusFilter("all");
    setSearchQuery("");
    setSelectedWineName(null);
    setPreviewExpanded(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  const runScan = useCallback(async (attachment: WineListAnalysisTextInput) => {
    if (requestBusyRef.current) return;
    requestBusyRef.current = true;
    setStep("scanning");
    setErrorMsg("");
    const requestId = crypto.randomUUID();
    try {
      const profile = cellarWines.length >= 3 ? buildUserProfile(cellarWines) : undefined;
      const data = await analyzeWineList({ ...attachment, requestId }, profile);
      const normalized = normalizeWineListResponse(data);
      setResults(normalized);
      if (normalized.wines.length > 0) {
        notifySuccess("Carta analisada", {
          description: `${normalized.wines.length} vinho${normalized.wines.length === 1 ? "" : "s"} encontrados.`,
          duration: 2600,
        });
      }
      setStep("results");
    } catch (err: any) {
      setErrorMsg(err?.message || "Não conseguimos extrair vinhos confiáveis desta carta. Tente uma imagem ou PDF mais nítido.");
      setStep("error");
    } finally {
      requestBusyRef.current = false;
    }
  }, [cellarWines]);

  const handleFile = useCallback(async (file: File) => {
    if (requestBusyRef.current || prepareBusyRef.current) return;
    prepareBusyRef.current = true;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isSupportedUploadFile(file)) {
      toast({ title: "Envie uma imagem ou PDF válido", variant: "destructive" });
      prepareBusyRef.current = false;
      return;
    }

    setStep("scanning");
    setErrorMsg("");
    setAttachmentPreview({ url: null, fileName: file.name, isPdf });

    try {
      const prepared = await prepareWineListAnalysisTextAttachment(file);
      const payload: WineListAnalysisTextInput = {
        text: prepared.text,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      };

      setAttachmentPreview({
        url: prepared.previewUrl,
        fileName: prepared.fileName || file.name,
        isPdf: prepared.sourceType !== "image",
      });
      setLastAttachment(payload);
      await runScan(payload);
    } catch (error) {
      setErrorMsg(getAttachmentErrorMessage(error, "Não conseguimos concluir a leitura desse arquivo."));
      setStep("error");
    } finally {
      prepareBusyRef.current = false;
    }
  }, [runScan, toast]);

  const matchedCellarMap = useMemo(() => {
    const entries = (results ?? EMPTY_WINE_LIST_ANALYSIS).wines.map((wine) => [wine.name, findCellarMatch(wine, cellarWines)] as const);
    return new Map(entries);
  }, [results, cellarWines]);

  const refinedWines = useMemo(() => {
    const safeResults = results ?? EMPTY_WINE_LIST_ANALYSIS;
    const query = normalizeWineSearchText(searchQuery);

    return safeResults.wines
      .filter((wine) => {
        if (filterMode !== "all" && detectWineType(wine.style) !== filterMode) return false;
        if (!matchesFocusFilter(wine, wine.name === safeResults.topPick, wine.name === safeResults.bestValue, focusFilter)) return false;
        if (!query) return true;
        const haystack = normalizeWineSearchText([
          wine.name,
          wine.producer,
          wine.region,
          wine.country,
          wine.grape,
          buildPairingLine(wine),
        ].filter(Boolean).join(" "));
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const matchedA = matchedCellarMap.get(a.name) ? 1 : 0;
        const matchedB = matchedCellarMap.get(b.name) ? 1 : 0;
        if (selectedWineName === a.name && selectedWineName !== b.name) return -1;
        if (selectedWineName === b.name && selectedWineName !== a.name) return 1;
        if (matchedB !== matchedA) return matchedB - matchedA;
        if (a.name === safeResults.topPick && b.name !== safeResults.topPick) return -1;
        if (b.name === safeResults.topPick && a.name !== safeResults.topPick) return 1;
        if (a.name === safeResults.bestValue && b.name !== safeResults.bestValue) return -1;
        if (b.name === safeResults.bestValue && a.name !== safeResults.bestValue) return 1;
        return b.confidence - a.confidence;
      });
  }, [results, filterMode, focusFilter, searchQuery, matchedCellarMap, selectedWineName]);

  const safeResults = results ?? EMPTY_WINE_LIST_ANALYSIS;
  const displayWines = refinedWines.slice(0, 100);
  const isTruncated = refinedWines.length > displayWines.length;
  const pricedWines = safeResults.wines.filter((wine) => typeof wine.price === "number");
  const avgPrice = pricedWines.length > 0 ? pricedWines.reduce((sum, wine) => sum + (wine.price || 0), 0) / pricedWines.length : null;
  const cellarMatches = safeResults.wines.filter((wine) => matchedCellarMap.get(wine.name)).length;
  const availableTypes = [...new Set(safeResults.wines.map((wine) => detectWineType(wine.style)).filter((type) => type !== "unknown"))] as WineType[];

  const openSaveDialog = (wine: WineListItem) => {
    setPrefillWine({
      name: wine.name,
      producer: wine.producer || null,
      vintage: wine.vintage ?? null,
      style: wine.style || null,
      country: wine.country || null,
      region: wine.region || null,
      grape: wine.grape || null,
      purchasePrice: wine.price ?? null,
      estimatedPrice: wine.price ?? null,
      foodPairing: buildPairingLine(wine),
    });
  };

  const saveToWishlist = async (wine: WineListItem) => {
    try {
      await addWishlist.mutateAsync(buildWishlistPayload(wine));
      notifySuccess("Salvo na wishlist", {
        description: compactText([wine.name, wine.producer].filter(Boolean).join(" · "), 80),
        duration: 2200,
      });
    } catch (error: any) {
      toast({
        title: "Não foi possível salvar na wishlist",
        description: error?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const sidebarContent = (
    <WorkspaceRail
      step={step}
      attachmentPreview={attachmentPreview}
      previewExpanded={previewExpanded}
      setPreviewExpanded={setPreviewExpanded}
      safeResults={safeResults}
      pricedWines={pricedWines.length}
      cellarMatches={cellarMatches}
      avgPrice={avgPrice}
      availableTypes={availableTypes}
      filterMode={filterMode}
      setFilterMode={setFilterMode}
      focusFilter={focusFilter}
      setFocusFilter={setFocusFilter}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onReset={reset}
    />
  );

  const renderResultsContent = () => {
    if (safeResults.wines.length === 0) {
      return (
        <AiModalCard className="p-0">
          <PremiumEmptyState
            icon={Search}
            title={safeResults.fallback ? "Vale uma nova leitura da carta" : "Nenhum rótulo ganhou destaque nesta captura"}
            description={safeResults.fallback ? "Uma nova foto pode abrir uma seleção mais completa." : "Vale tentar outra imagem com melhor enquadramento."}
            primaryAction={{
              label: "Tentar novamente",
              onClick: reset,
              icon: <RotateCcw className="h-3.5 w-3.5" />,
            }}
            secondaryAction={{
              label: "Enviar outro arquivo",
              onClick: () => fileInputRef.current?.click(),
            }}
            className="border-0 bg-transparent px-5 py-8 shadow-none lg:py-9"
          />
        </AiModalCard>
      );
    }

    return (
      <motion.div
        key="results"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="space-y-4"
      >
        <section className="space-y-3">
          <div className="flex flex-col gap-3 border-b border-[rgba(24,21,17,0.08)] pb-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <AiModalEyebrow className="mb-2">Workspace</AiModalEyebrow>
              <p className="font-serif text-[30px] leading-none tracking-[-0.05em] text-[#1A1713]">
                {displayWines.length} rótulos para decidir
              </p>
              <p className="mt-1.5 max-w-[38rem] text-[12.5px] leading-5 text-[#6B6258]">
                {getAiPresentationStatus("menu", safeResults.fallback).description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <AiMetricPill label="carta" value={safeResults.wines.length} tone="accent" className="text-[10px]" />
              <AiMetricPill label="preço" value={pricedWines.length} className="text-[10px]" />
              <AiMetricPill label="adega" value={cellarMatches} tone={cellarMatches > 0 ? "success" : "neutral"} className="text-[10px]" />
              {avgPrice ? <AiMetricPill label="médio" value={formatPrice(avgPrice)} className="text-[10px]" /> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {displayWines.map((wine, index) => {
            const cellarMatch = matchedCellarMap.get(wine.name) || null;
            return (
              <WineListCard
                key={`${wine.name}-${index}`}
                wine={wine}
                index={index}
                isTopPick={wine.name === safeResults.topPick}
                isBestValue={wine.name === safeResults.bestValue}
                isSelected={selectedWineName === wine.name}
                cellarMatch={cellarMatch}
                onSelect={() => setSelectedWineName(wine.name)}
                onSave={() => openSaveDialog(wine)}
                onWishlist={() => void saveToWishlist(wine)}
                onPair={() => cellarMatch && setPairingWine(cellarMatch)}
                onView={() => cellarMatch && setEditWine(cellarMatch)}
                onConsume={() => cellarMatch && setConsumptionWine({
                  id: cellarMatch.id,
                  name: cellarMatch.name,
                  producer: cellarMatch.producer,
                  country: cellarMatch.country,
                  region: cellarMatch.region,
                  grape: cellarMatch.grape,
                  style: cellarMatch.style,
                  vintage: cellarMatch.vintage,
                })}
              />
            );
          })}
        </section>

        {isTruncated ? (
          <p className="text-[11px] font-medium text-[#6B6258]">
            Mostrando 100 de {refinedWines.length} vinhos
          </p>
        ) : null}
      </motion.div>
    );
  };

  return (
    <>
      <TooltipProvider>
        <Sheet open={open} onOpenChange={handleClose}>
          <SheetContent className={AI_MODAL_SHEET_CONTENT_CLASSNAME} style={MODAL_STYLE}>
            <AiModalShell>
              <AiModalHeaderBar>
              <AiModalHeader
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Analisar Carta"
                  description="Uma mesa de curadoria para descobrir os melhores rótulos da carta com velocidade e contexto."
                />
              </AiModalHeaderBar>

              <AiModalBody>
                <AiModalSplitLayout sidebar={sidebarContent} className="gap-5 xl:grid-cols-[304px_minmax(0,1fr)] 2xl:grid-cols-[328px_minmax(0,1fr)]" sidebarClassName="xl:pr-1" contentClassName="pb-1">
                  <AnimatePresence mode="wait">
                    {step === "capture" && (
                      <motion.div
                        key="capture"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-4"
                      >
                        <AiModalCard className="space-y-4">
                          <div
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.currentTarget.dataset.dragging = "true";
                            }}
                            onDragLeave={(event) => {
                              event.currentTarget.dataset.dragging = "false";
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              event.currentTarget.dataset.dragging = "false";
                              const file = event.dataTransfer.files?.[0];
                              if (file) handleFile(file);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[22px] px-5 py-10 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 data-[dragging=true]:scale-[1.01]"
                            style={{
                              background: "rgba(255,255,255,0.78)",
                              border: "1.5px dashed rgba(123,30,43,0.22)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                              boxShadow: "0 8px 24px -16px rgba(123,30,43,0.14), inset 0 1px 0 rgba(255,255,255,0.7)",
                            }}
                          >
                            <div
                              className="flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
                              style={{
                                background: "linear-gradient(135deg, rgba(123,30,43,0.10) 0%, rgba(200,169,106,0.10) 100%)",
                                border: "1px solid rgba(123,30,43,0.14)",
                                boxShadow: "0 6px 18px -10px rgba(123,30,43,0.20), inset 0 1px 0 rgba(255,255,255,0.6)",
                              }}
                            >
                              <Camera className="h-7 w-7 text-[#7B1E2B]" strokeWidth={1.75} />
                            </div>
                            <div className="max-w-[320px] text-center">
                              <p className="font-serif text-[26px] font-semibold tracking-[-0.04em] text-[#1A1713]">
                                Fotografe ou envie a carta
                              </p>
                              <p className="mt-1 text-[12.5px] leading-relaxed text-[rgba(58,51,39,0.6)]">
                                A leitura transforma a carta em uma seleção sofisticada, compacta e pronta para decidir.
                              </p>
                            </div>
                          </div>

                          <AiToolbarSurface className="space-y-2.5 border-[rgba(123,30,43,0.08)] bg-[rgba(255,255,255,0.72)] shadow-none">
                            <div className="grid gap-2 sm:grid-cols-3">
                              <AiModalKeyValue label="Entrega" value="seleção editorial" />
                              <AiModalKeyValue label="Ideal para" value="foto nítida ou PDF" />
                              <AiModalKeyValue label="Formato" value="leitura sommelier" />
                            </div>
                          </AiToolbarSurface>

                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <AiModalActionButton variant="default" onClick={() => cameraInputRef.current?.click()} className="w-full">
                              <Camera className="mr-2 h-4 w-4" />
                              Tirar foto
                            </AiModalActionButton>
                            <AiModalActionButton variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full">
                              <Upload className="mr-2 h-4 w-4" />
                              Escolher imagem ou PDF
                            </AiModalActionButton>
                          </div>

                          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif" capture="environment" className="hidden" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
                          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" className="hidden" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
                        </AiModalCard>
                      </motion.div>
                    )}

                    {step === "scanning" && (
                      <PairingLoadingState
                        steps={[
                          "Lendo a carta…",
                          "Identificando rótulos…",
                          "Organizando a seleção…",
                        ]}
                        subtitle="Análise da carta"
                      />
                    )}

                    {step === "results" && renderResultsContent()}

                    {step === "error" && (
                      <PairingErrorState
                        message={errorMsg}
                        onRetry={() => (lastAttachment ? runScan(lastAttachment) : reset())}
                        onClose={() => {
                          setErrorMsg("");
                          setStep("capture");
                        }}
                      />
                    )}
                  </AnimatePresence>
                </AiModalSplitLayout>
              </AiModalBody>
            </AiModalShell>
          </SheetContent>
        </Sheet>
      </TooltipProvider>

      <AddWineDialog
        open={!!prefillWine}
        onOpenChange={(value) => {
          if (!value) setPrefillWine(null);
        }}
        initialValues={prefillWine}
      />
      <EditWineDialog open={!!editWine} onOpenChange={(value) => { if (!value) setEditWine(null); }} wine={editWine} />
      <DishToWineDialog
        open={!!pairingWine}
        onOpenChange={(value) => { if (!value) setPairingWine(null); }}
        initialWineId={pairingWine?.id ?? null}
        initialWine={pairingWine}
      />
      <AddConsumptionDialog
        open={!!consumptionWine}
        onOpenChange={(value) => { if (!value) setConsumptionWine(null); }}
        preSelectedWine={consumptionWine}
      />
    </>
  );
}

function StatTile({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  accent?: "neutral" | "green" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border px-3 py-2.5",
        accent === "green" && "border-emerald-100 bg-emerald-50/80 text-emerald-900",
        accent === "amber" && "border-amber-100 bg-amber-50/85 text-amber-900",
        accent === "neutral" && "border-black/5 bg-white/70 text-[#1A1713]",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(72,60,46,0.52)]">{label}</p>
      <p className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function WorkspaceRail({
  step,
  attachmentPreview,
  previewExpanded,
  setPreviewExpanded,
  safeResults,
  pricedWines,
  cellarMatches,
  avgPrice,
  availableTypes,
  filterMode,
  setFilterMode,
  focusFilter,
  setFocusFilter,
  searchQuery,
  setSearchQuery,
  onReset,
}: {
  step: ScanStep;
  attachmentPreview: { url?: string | null; fileName: string; isPdf: boolean } | null;
  previewExpanded: boolean;
  setPreviewExpanded: (value: boolean | ((value: boolean) => boolean)) => void;
  safeResults: WineListAnalysis;
  pricedWines: number;
  cellarMatches: number;
  avgPrice: number | null;
  availableTypes: WineType[];
  filterMode: FilterMode;
  setFilterMode: (value: FilterMode) => void;
  focusFilter: FocusFilter;
  setFocusFilter: (value: FocusFilter) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <aside
      className="overflow-hidden rounded-[30px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,237,228,0.78)_100%)] shadow-[0_20px_42px_-34px_rgba(34,21,13,0.28)] backdrop-blur-xl"
      style={{
        backdropFilter: "blur(18px) saturate(1.06)",
        WebkitBackdropFilter: "blur(18px) saturate(1.06)",
      }}
    >
      <div className="flex max-h-full flex-col xl:sticky xl:top-0">
        <div className="space-y-4 border-b border-[rgba(24,21,17,0.08)] px-4 pb-4 pt-4 sm:px-5">
          <div className="space-y-1.5">
            <AiModalEyebrow>{step === "results" ? "Curadoria pronta" : "Entrada"}</AiModalEyebrow>
            <p className="font-serif text-[24px] leading-none tracking-[-0.05em] text-[#181511]">
              {step === "results" ? "Carta analisada" : "Analisar Carta"}
            </p>
            <p className="text-[12px] leading-5 text-[#6B6258]">
              {step === "results"
                ? "Preview, filtros e destaques ficam concentrados neste rail."
                : "Envie uma carta nítida para abrir um workspace de curadoria."}
            </p>
          </div>

          <div className="rounded-[20px] border border-[rgba(24,21,17,0.07)] bg-[rgba(255,255,255,0.72)] p-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-[60px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-black/5 bg-[#F6F0E8]">
                {attachmentPreview?.url ? (
                  <img src={attachmentPreview.url} alt="Carta analisada" className="h-full w-full object-cover object-top" />
                ) : (
                  <FileText className="h-4 w-4 text-[#7B1E2B]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-[#1A1713]">
                  {step === "results" ? `${safeResults.wines.length} vinhos encontrados` : attachmentPreview?.fileName || "Aguardando arquivo"}
                </p>
                <p className="mt-0.5 text-[11px] text-[#6B6258]">
                  {safeResults.fallback ? "Seleção inicial" : step === "results" ? "Curadoria pronta" : attachmentPreview?.isPdf ? "PDF" : "Imagem"}
                </p>
                {attachmentPreview?.url ? (
                  <button
                    type="button"
                    onClick={() => setPreviewExpanded((value) => !value)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6A5847]"
                  >
                    {previewExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {previewExpanded ? "Recolher" : "Expandir"}
                  </button>
                ) : null}
              </div>
            </div>

            {attachmentPreview?.url && previewExpanded ? (
              <div className="mt-2.5 overflow-hidden rounded-[16px] border border-black/5">
                <img src={attachmentPreview.url} alt="Carta ampliada" className="h-[220px] w-full object-cover object-top" />
              </div>
            ) : null}
          </div>

          {step === "results" ? (
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Seleção" value={safeResults.fallback ? "Inicial" : "Pronta"} accent={safeResults.fallback ? "amber" : "green"} />
              <StatTile label="Rótulos" value={safeResults.wines.length} />
              <StatTile label="Com preço" value={pricedWines} />
              <StatTile label="Na adega" value={cellarMatches} />
            </div>
          ) : null}
        </div>

        {step === "results" ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#7B1E2B]" />
                <AiModalEyebrow className="mb-0">Refinar</AiModalEyebrow>
              </div>

              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar produtor, região, prato"
                className="h-9 rounded-[14px] border-white/70 bg-white/84 px-3 text-[12px] shadow-[inset_0_1px_2px_rgba(42,33,26,0.04)]"
              />

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(72,60,46,0.52)]">Tipo</p>
                <div className="flex flex-wrap gap-1">
                  {TYPE_PILLS.filter((pill) => pill.key === "all" || availableTypes.includes(pill.key as WineType)).map((pill) => (
                    <DensePill
                      key={pill.key}
                      active={filterMode === pill.key}
                      onClick={() => setFilterMode(pill.key)}
                    >
                      {pill.label}
                    </DensePill>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(72,60,46,0.52)]">Curadoria</p>
                <div className="flex flex-wrap gap-1">
                  {FOCUS_PILLS.map((pill) => (
                    <DensePill
                      key={pill.key}
                      active={focusFilter === pill.key}
                      onClick={() => setFocusFilter(pill.key)}
                    >
                      {pill.label}
                    </DensePill>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-[rgba(24,21,17,0.08)] pt-3">
              <AiModalKeyValue label="Top pick" value={safeResults.topPick || "—"} />
              <AiModalKeyValue label="Best value" value={safeResults.bestValue || "—"} />
              <AiModalKeyValue label="Preço médio" value={avgPrice ? formatPrice(avgPrice) : "—"} />
            </div>

            <AiModalActionButton variant="secondary" onClick={onReset} className="h-9 w-full rounded-[14px] px-4 text-[11px]">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Nova análise
            </AiModalActionButton>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function DensePill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
        active
          ? "border-[rgba(123,30,43,0.14)] bg-[rgba(123,30,43,0.10)] text-[#5A1528]"
          : "border-black/5 bg-white/74 text-[#5F5F5F] hover:bg-white hover:text-[#1A1713]",
      )}
    >
      {children}
    </button>
  );
}

function WineListCard({
  wine,
  index,
  isTopPick,
  isBestValue,
  isSelected,
  cellarMatch,
  onSelect,
  onSave,
  onWishlist,
  onPair,
  onView,
  onConsume,
}: {
  wine: WineListItem;
  index: number;
  isTopPick: boolean;
  isBestValue: boolean;
  isSelected: boolean;
  cellarMatch: Wine | null;
  onSelect: () => void;
  onSave: () => void;
  onWishlist: () => void;
  onPair: () => void;
  onView: () => void;
  onConsume: () => void;
}) {
  const tags = buildStatusTags(wine, isTopPick, isBestValue);
  const originLine = [wine.producer, wine.region || wine.country].filter(Boolean).join(" · ");
  const descriptorLine = buildDescriptorLine(wine);
  const pairingLine = buildPairingLine(wine);
  const priceLabel = formatPrice(wine.price);
  const structurePills = [
    wine.acidity ? `Acidez ${wine.acidity}` : null,
    wine.body ? `Corpo ${wine.body}` : null,
    wine.tannin ? `Tanino ${wine.tannin}` : null,
  ].filter(Boolean) as string[];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className={cn(
        "overflow-hidden rounded-[22px] border transition-all duration-200 hover:-translate-y-[1px]",
        isSelected ? "border-[rgba(123,30,43,0.18)] bg-white/92 shadow-[0_18px_36px_-28px_rgba(123,30,43,0.24)]" : "border-[rgba(95,111,82,0.10)] bg-white/82 shadow-[0_12px_26px_-24px_rgba(27,19,14,0.20)]",
      )}
      style={{
        backdropFilter: "blur(14px) saturate(1.06)",
        WebkitBackdropFilter: "blur(14px) saturate(1.06)",
      }}
    >
      <button type="button" onClick={onSelect} className="w-full px-3.5 py-3.5 text-left">
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2.5">
            {tags.length > 0 ? (
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-full px-2 py-[5px] text-[9px] font-semibold uppercase tracking-[0.08em]",
                      tag === "Best value" && "bg-[rgba(95,111,82,0.10)] text-[#35533A]",
                      tag === "Premium" && "bg-[rgba(198,167,104,0.14)] text-[#7B6528]",
                      tag === "Beber agora" && "bg-[rgba(61,97,54,0.10)] text-[#35533A]",
                      tag === "Guarda" && "bg-[rgba(55,66,120,0.10)] text-[#374278]",
                      !["Best value", "Premium", "Beber agora", "Guarda"].includes(tag) && "bg-[rgba(123,30,43,0.08)] text-[#7B1E2B]",
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : <span />}

            {priceLabel ? (
              <span className="shrink-0 text-[14px] font-semibold tracking-[-0.02em] text-[#181511]">
                {priceLabel}
              </span>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="min-w-0 flex-1">
              <h4 className="font-serif text-[19px] leading-[1.02] tracking-[-0.04em] text-[#181511]">
                {wine.name}
              </h4>
              {originLine ? (
                <p className="mt-0.5 text-[11.5px] font-medium leading-5 text-[#6B6258]">
                  {originLine}
                </p>
              ) : null}
            </div>
          </div>

          {descriptorLine ? (
            <p className="text-[12px] leading-5 text-[#433A32]">
              {descriptorLine}
            </p>
          ) : null}

          {structurePills.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {structurePills.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-black/5 bg-[rgba(255,255,255,0.7)] px-2 py-[5px] text-[9px] font-medium uppercase tracking-[0.08em] text-[#51473F]"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {pairingLine ? (
            <p className="text-[11.5px] leading-5 text-[#5B4F44]">
              Harmoniza com: {pairingLine}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1 border-t border-black/5 pt-2">
            <ActionPill label={cellarMatch ? "Na adega" : "Salvar"} icon={Check} onClick={onSave} disabled={Boolean(cellarMatch)} disabledReason="Esse vinho já existe na sua adega." />
            <ActionPill label="Wishlist" icon={Heart} onClick={onWishlist} />
            <ActionPill label="Pair" icon={UtensilsCrossed} onClick={onPair} disabled={!cellarMatch} disabledReason="Salve na adega para harmonizar por garrafa." />
            <ActionPill label="Ver" icon={Eye} onClick={onView} disabled={!cellarMatch} disabledReason="Disponível quando o vinho já está na sua adega." />
            <ActionPill label="Registrar" icon={GlassWater} onClick={onConsume} disabled={!cellarMatch} disabledReason="Disponível quando o vinho já está na sua adega." />
          </div>
        </div>
      </button>
    </motion.article>
  );
}

function ActionPill({
  label,
  icon: Icon,
  onClick,
  disabled,
  disabledReason,
}: {
  label: string;
  icon: typeof Heart;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const button = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onClick();
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors",
        disabled
          ? "cursor-not-allowed border-black/5 bg-white/55 text-[#9A9086]"
          : "border-black/5 bg-white/78 text-[#433A32] hover:bg-white",
      )}
      disabled={disabled}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  if (!disabled || !disabledReason) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  );
}
