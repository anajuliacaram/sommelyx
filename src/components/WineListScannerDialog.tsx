import { useState, useRef, useCallback, useMemo, useEffect, type ComponentProps } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  RotateCcw,
  Check,
  BookOpen,
  Search,
  Heart,
  GlassWater,
  Eye,
  UtensilsCrossed,
} from "@/icons/lucide";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
import { buildPresentationStructureLine } from "@/lib/ai-presentation";
import { normalizeWineSearchText } from "@/lib/wine-normalization";
import { getWineTypeColor } from "@/lib/wine-utils";
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
  AiFilterChip,
  AiUploadPanel,
  AI_MODAL_CARD_CLASSNAME,
  AI_MODAL_FIELD_CLASSNAME,
  AI_MODAL_HELP_TEXT_CLASSNAME,
  AI_MODAL_META_TEXT_CLASSNAME,
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
  if (Array.isArray(wine.perfil) && wine.perfil.length > 0) {
    return buildPresentationStructureLine(wine.perfil.slice(0, 3));
  }
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
  if (wine.harmonizacao_sugerida?.trim()) return wine.harmonizacao_sugerida.trim();
  const dishes = (Array.isArray(wine?.pairings) ? wine.pairings : [])
    .map((pairing) => pairing?.dish?.trim().toLowerCase())
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

function buildCurationNote(wine: WineListItem | null | undefined, options: { isTopPick: boolean; isBestValue: boolean; isFeatured: boolean; index: number }) {
  if (!wine) return null;
  if (options.isTopPick) return "Escolha principal";
  if (options.isBestValue) return "Best value";
  if (options.isFeatured) return "Seleção";
  if (wine.highlight === "most-complex") return "Mais raro";
  if (wine.tannin === "alto" || wine.body === "encorpado") return "Mais amplo";
  if (wine.acidity === "alta") return "Mais tenso";
  if (wine.category === "sparkling") return "Mais leve";
  return null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWineName, setSelectedWineName] = useState<string | null>(null);
  const [prefillWine, setPrefillWine] = useState<AddWineInitialValues | null>(null);
  const [editWine, setEditWine] = useState<Wine | null>(null);
  const [pairingWine, setPairingWine] = useState<Wine | null>(null);
  const [consumptionWine, setConsumptionWine] = useState<ConsumptionWine>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const requestBusyRef = useRef(false);
  const prepareBusyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  const beginRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    requestSeqRef.current += 1;
    return requestSeqRef.current;
  }, []);

  const isLatestRequest = useCallback((id: number) => id === requestSeqRef.current, []);

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    requestSeqRef.current += 1;
    requestBusyRef.current = false;
    prepareBusyRef.current = false;
    setStep("capture");
    setAttachmentPreview(null);
    setResults(null);
    setErrorMsg("");
    setLastAttachment(null);
    setFilterMode("all");
    setSearchQuery("");
    setSelectedWineName(null);
  };

  const handleClose = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  useEffect(() => {
    if (step !== "scanning") return;
    const timeout = window.setTimeout(() => {
      abortRef.current?.abort();
      requestBusyRef.current = false;
      prepareBusyRef.current = false;
      setErrorMsg("A leitura demorou mais que o esperado. Tente novamente.");
      setStep("error");
    }, 90_000);
    return () => window.clearTimeout(timeout);
  }, [step]);

  const runScan = useCallback(async (attachment: WineListAnalysisTextInput) => {
    if (requestBusyRef.current) return;
    const requestSeq = beginRequest();
    requestBusyRef.current = true;
    setStep("scanning");
    setErrorMsg("");
    const requestId = crypto.randomUUID();
    console.info("[WineListScannerDialog] analyze_request_start", {
      requestSeq,
      requestId,
      fileName: attachment.fileName ?? null,
      mimeType: attachment.mimeType ?? null,
      textLength: attachment.text?.length ?? 0,
    });
    try {
      const profile = cellarWines.length >= 3 ? buildUserProfile(cellarWines) : undefined;
      const data = await analyzeWineList({ ...attachment, requestId, signal: abortRef.current?.signal }, profile);
      if (!isLatestRequest(requestSeq)) return;
      const normalized = normalizeWineListResponse(data);
      console.info("[WineListScannerDialog] analyze_request_success", {
        requestSeq,
        requestId,
        wines: normalized.wines.length,
        fallback: normalized.fallback ?? false,
      });
      setResults(normalized);
      if (normalized.wines.length > 0) {
        notifySuccess("Carta analisada", {
          description: `${normalized.wines.length} vinho${normalized.wines.length === 1 ? "" : "s"} encontrados.`,
          duration: 2600,
        });
      }
      setStep("results");
    } catch (err: unknown) {
      if (!isLatestRequest(requestSeq)) return;
      console.error("[WineListScannerDialog] analyze_request_error", {
        requestSeq,
        requestId,
        message: err instanceof Error ? err.message : String(err),
      });
      setErrorMsg(err instanceof Error && err.message ? err.message : "Não conseguimos extrair vinhos confiáveis desta carta. Tente uma imagem ou PDF mais nítido.");
      setStep("error");
    } finally {
      if (isLatestRequest(requestSeq)) requestBusyRef.current = false;
    }
  }, [beginRequest, cellarWines, isLatestRequest]);

  const handleFile = useCallback(async (file: File) => {
    if (requestBusyRef.current || prepareBusyRef.current) return;
    const prepareSeq = beginRequest();
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
      const prepared = await prepareWineListAnalysisTextAttachment(file, { signal: abortRef.current?.signal });
      if (!isLatestRequest(prepareSeq)) return;
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
      if (!isLatestRequest(prepareSeq)) return;
      setErrorMsg(getAttachmentErrorMessage(error, "Não conseguimos concluir a leitura desse arquivo."));
      setStep("error");
    } finally {
      prepareBusyRef.current = false;
    }
  }, [beginRequest, isLatestRequest, runScan, toast]);

  const matchedCellarMap = useMemo(() => {
    const entries = (Array.isArray((results ?? EMPTY_WINE_LIST_ANALYSIS).wines) ? (results ?? EMPTY_WINE_LIST_ANALYSIS).wines : [])
      .filter((wine): wine is WineListItem => Boolean(wine?.name))
      .map((wine) => [wine.name, findCellarMatch(wine, cellarWines)] as const);
    return new Map(entries);
  }, [results, cellarWines]);

  const refinedWines = useMemo(() => {
    const safeResults = results ?? EMPTY_WINE_LIST_ANALYSIS;
    const query = normalizeWineSearchText(searchQuery);

    const resultWines = Array.isArray(safeResults.wines) ? safeResults.wines.filter((wine): wine is WineListItem => Boolean(wine?.name)) : [];

    return resultWines
      .filter((wine) => {
        if (filterMode !== "all" && detectWineType(wine.style) !== filterMode) return false;
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
  }, [results, filterMode, searchQuery, matchedCellarMap, selectedWineName]);

  const safeResults = results ?? EMPTY_WINE_LIST_ANALYSIS;
  const displayWines = refinedWines.slice(0, 100);
  const isTruncated = refinedWines.length > displayWines.length;
  const resultWines = Array.isArray(safeResults.wines) ? safeResults.wines.filter((wine): wine is WineListItem => Boolean(wine?.name)) : [];
  const availableTypes = [...new Set(resultWines.map((wine) => detectWineType(wine.style)).filter((type) => type !== "unknown"))] as WineType[];

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
    } catch (error: unknown) {
      toast({
        title: "Não foi possível salvar na wishlist",
        description: error instanceof Error && error.message ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

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
        className="space-y-3"
      >
        <section className="carta-results-header">
          <div>
            <div>
              <p className="carta-results-count">
                {displayWines.length} rótulos para decidir
              </p>
              {safeResults.topPick ? (
                <p className="carta-results-sub">
                  Primeiro destaque: {safeResults.topPick}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="space-y-1">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6B6258]/46 sm:left-3 sm:h-3 sm:w-3" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar rótulo, produtor, região"
              className={cn(AI_MODAL_FIELD_CLASSNAME, "pl-7")}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {TYPE_PILLS.filter((pill) => pill.key === "all" || availableTypes.includes(pill.key as WineType)).map((pill) => {
              const active = filterMode === pill.key;
              const styleKey = pill.key === "all" ? "todos" : pill.key === "rosé" ? "rose" : pill.key;
              return (
                <AiFilterChip
                  key={pill.key}
                  type="button"
                  onClick={() => setFilterMode(pill.key)}
                  selected={active}
                  data-style={styleKey}
                  className={cn("chip uppercase tracking-[0.04em]", styleKey, active && "active")}
                >
                  <span className="wine-dot mr-1 inline-flex" style={{ background: pill.key === "all" ? "var(--sx-bordeaux)" : getWineTypeColor(pill.key) }} />
                  {pill.label}
                </AiFilterChip>
              );
            })}
          </div>
        </div>

        {displayWines.length > 0 ? (
          <section className="space-y-1">
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
                  isFeatured={false}
                  rhythmClassName=""
                  curationNote={buildCurationNote(wine, {
                    isTopPick: wine.name === safeResults.topPick,
                    isBestValue: wine.name === safeResults.bestValue,
                    isFeatured: false,
                    index,
                  })}
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
        ) : null}

        {isTruncated ? (
          <p className="text-[11px] font-medium text-[var(--sx-text-secondary)]">
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
          <SheetContent centered className={cn(AI_MODAL_SHEET_CONTENT_CLASSNAME, "analyze-carta-modal")} style={AI_MODAL_SHEET_CONTENT_STYLE} aria-label="Analisar Carta">
            <SheetTitle className="sr-only">Analisar Carta</SheetTitle>
            <AiModalShell>
              <AiModalHeaderBar>
                <AiModalHeader
                  icon={<BookOpen className="h-5 w-5" />}
                  title="Analisar Carta"
                  description="Encontre os destaques da carta."
                  tone="wine"
                />
              </AiModalHeaderBar>

              <AiModalBody style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
                <AiModalSplitLayout contentClassName="pb-1">
                  <AnimatePresence mode="wait">
                    {step === "capture" && (
                      <motion.div
                        key="capture"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="analyze-carta-capture space-y-3"
                      >
                        <div className="space-y-2">
                          <AiUploadPanel
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
                            icon={<Camera className="h-5 w-5" strokeWidth={1.75} />}
                            title="Enviar carta"
                            description="Foto, imagem ou PDF."
                            className="upload-card enviar-carta"
                          />

                          <div className="analyze-carta-actions grid gap-2 sm:grid-cols-2">
                            <AiModalActionButton variant="default" onClick={() => cameraInputRef.current?.click()} className="w-full">
                              <Camera className="mr-2 h-4 w-4" />
                              Tirar foto
                            </AiModalActionButton>
                            <AiModalActionButton variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full">
                              <Upload className="mr-2 h-4 w-4" />
                              Arquivo
                            </AiModalActionButton>
                          </div>

                          <AiModalCard className="analyze-carta-help scanner-footer carta-info curadoria-card">
                            <div className="flex items-start gap-3">
                              <div className="modal-action-icon-wrap modal-action-icon">
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="modal-action-title">Curadoria da carta</p>
                                <p className="modal-action-subtitle">A leitura destaca preço, estilo e boas escolhas para decidir com calma.</p>
                              </div>
                            </div>
                          </AiModalCard>

                          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif" capture="environment" className="hidden" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
                          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" className="hidden" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
                        </div>
                      </motion.div>
                    )}

                    {step === "scanning" && (
                      <PairingLoadingState
                        steps={[
                          "Lendo carta",
                          "Organizando rótulos",
                          "Preparando destaques",
                        ]}
                        subtitle="Curadoria da carta"
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

function WineListCard({
  wine,
  index,
  isTopPick,
  isBestValue,
  isSelected,
  isFeatured,
  curationNote,
  rhythmClassName,
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
  isFeatured: boolean;
  curationNote: string | null;
  rhythmClassName?: string;
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
  const badgeLabels = Array.from(new Set([curationNote, ...tags].filter(Boolean) as string[]));
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "carta-wine-card",
        isFeatured && "xl:col-span-1",
        rhythmClassName,
        isSelected && "is-selected",
      )}
    >
      <span className="carta-wine-number">{index + 1}</span>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className="w-full text-left"
      >
        <div className="carta-wine-top">
          <span className="wine-selector-dot" style={{ background: getWineTypeColor(wine.style) }} />
          <h4 className="carta-wine-name">{wine.name}</h4>
          {priceLabel ? (
            <span className="carta-wine-price">{priceLabel}</span>
          ) : null}
        </div>

        {originLine ? (
          <p className="carta-wine-origin">{originLine}</p>
        ) : null}

        {descriptorLine ? (
          <p className="carta-wine-attrs">{descriptorLine}</p>
        ) : null}

        {pairingLine ? (
          <p className="carta-wine-attrs">{pairingLine}</p>
        ) : null}

        {badgeLabels.length > 0 ? (
          <div className="carta-wine-badges">
            {badgeLabels.slice(0, 3).map((tag) => (
              <span key={tag} className={cn("carta-badge", getCartaBadgeVariant(tag))}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="carta-wine-actions">
          <ActionPill label={cellarMatch ? "Na adega" : "Salvar"} icon={Check} onClick={onSave} disabled={Boolean(cellarMatch)} disabledReason="Esse vinho já existe na sua adega." />
          <ActionPill label="Wishlist" icon={Heart} onClick={onWishlist} />
          <ActionPill label="Harmonizar" icon={UtensilsCrossed} onClick={onPair} disabled={!cellarMatch} disabledReason="Salve na adega para harmonizar por garrafa." />
          <ActionPill label="Ver" icon={Eye} onClick={onView} disabled={!cellarMatch} disabledReason="Disponível quando o vinho já está na sua adega." />
          <ActionPill label="Consumo" icon={GlassWater} onClick={onConsume} disabled={!cellarMatch} disabledReason="Disponível quando o vinho já está na sua adega." />
        </div>
      </div>
    </motion.article>
  );
}

function getCartaBadgeVariant(label: string) {
  const normalized = label.toLocaleLowerCase("pt-BR");
  if (normalized.includes("principal") || normalized.includes("ícone") || normalized.includes("icone")) return "principal";
  if (normalized.includes("valor") || normalized.includes("value") || normalized.includes("preço") || normalized.includes("preco")) return "value";
  return "casa";
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
        "carta-action-btn",
        (label === "Salvar" || label === "Na adega") && "save",
        disabled && "is-disabled",
      )}
      disabled={disabled}
    >
      <Icon className="h-3 w-3" />
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
