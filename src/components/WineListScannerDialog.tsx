import { useState, useRef, useCallback, useMemo, useEffect, type ComponentProps } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
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
  AiToolbarSurface,
  AiUploadPanel,
  AI_MODAL_CARD_CLASSNAME,
  AI_MODAL_FIELD_CLASSNAME,
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
    try {
      const profile = cellarWines.length >= 3 ? buildUserProfile(cellarWines) : undefined;
      const data = await analyzeWineList({ ...attachment, requestId, signal: abortRef.current?.signal }, profile);
      if (!isLatestRequest(requestSeq)) return;
      const normalized = normalizeWineListResponse(data);
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
      const prepared = await prepareWineListAnalysisTextAttachment(file);
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
        <section className="space-y-2.5">
          <div className="border-b border-[rgba(58,51,39,0.07)] pb-3">
            <div>
              <p className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1713]">
                {displayWines.length} rótulos para decidir
              </p>
              {safeResults.topPick ? (
                <p className="mt-1 text-[12.5px] leading-5 text-[#6B6258]">
                  Primeiro destaque: {safeResults.topPick}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <AiToolbarSurface className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B6258]/55" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar rótulo, produtor, região"
              className={cn(AI_MODAL_FIELD_CLASSNAME, "pl-9")}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_PILLS.filter((pill) => pill.key === "all" || availableTypes.includes(pill.key as WineType)).map((pill) => {
              const active = filterMode === pill.key;
              return (
                <AiFilterChip
                  key={pill.key}
                  type="button"
                  onClick={() => setFilterMode(pill.key)}
                  selected={active}
                  className="h-8 px-2.5 text-[10px] uppercase tracking-[0.08em]"
                >
                  {pill.label}
                </AiFilterChip>
              );
            })}
          </div>
        </AiToolbarSurface>

        {displayWines.length > 0 ? (
          <section className="space-y-2.5">
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
          <SheetContent className={AI_MODAL_SHEET_CONTENT_CLASSNAME} style={AI_MODAL_SHEET_CONTENT_STYLE} aria-label="Analisar Carta">
            <SheetTitle className="sr-only">Analisar Carta</SheetTitle>
            <AiModalShell>
              <AiModalHeaderBar>
                  <AiModalHeader
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Analisar Carta"
                  description="Encontre os destaques da carta."
                />
              </AiModalHeaderBar>

              <AiModalBody>
                <AiModalSplitLayout contentClassName="pb-1">
                  <AnimatePresence mode="wait">
                    {step === "capture" && (
                      <motion.div
                        key="capture"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-3"
                      >
                        <AiModalCard className="space-y-2.5 border-y border-x-0">
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
                          />

                          <div className="grid gap-2 sm:grid-cols-2">
                            <AiModalActionButton variant="default" onClick={() => cameraInputRef.current?.click()} className="w-full">
                              <Camera className="mr-2 h-4 w-4" />
                              Tirar foto
                            </AiModalActionButton>
                            <AiModalActionButton variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full">
                              <Upload className="mr-2 h-4 w-4" />
                              Arquivo
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
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "overflow-hidden transition-colors duration-200",
        AI_MODAL_CARD_CLASSNAME,
        isFeatured && "xl:col-span-1",
        rhythmClassName,
        isSelected ? "border-[rgba(123,30,43,0.16)] bg-[rgba(255,251,244,0.84)]" : "",
      )}
      style={{
        backdropFilter: "blur(14px) saturate(1.06)",
        WebkitBackdropFilter: "blur(14px) saturate(1.06)",
      }}
    >
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
        className="w-full px-3.5 py-3 text-left"
      >
        <div className="grid gap-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-start">
          <div className="flex items-center gap-2 sm:block">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1713] text-[11px] font-semibold text-white">
              {index + 1}
            </span>
            {curationNote ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(91,79,68,0.68)] sm:mt-2">
                {curationNote}
              </p>
            ) : null}
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2 sm:hidden">
              <h4 className="text-[16px] font-semibold leading-tight tracking-[-0.02em] text-[#181511]">{wine.name}</h4>
              {priceLabel ? <span className="shrink-0 text-[14px] font-semibold tracking-[-0.02em] text-[#181511]">{priceLabel}</span> : null}
            </div>
            <h4 className="hidden text-[16px] font-semibold leading-tight tracking-[-0.02em] text-[#181511] sm:block">
              {wine.name}
            </h4>
            {originLine ? (
              <p className="text-[12px] font-medium leading-5 text-[#6B6258]">{originLine}</p>
            ) : null}
            {descriptorLine ? (
              <p className="text-[12.5px] leading-5 text-[#433A32]">{descriptorLine}</p>
            ) : null}
            {pairingLine ? (
              <p className="text-[11.5px] leading-5 text-[#5B4F44]">{pairingLine}</p>
            ) : null}
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {tags.slice(0, 1).map((tag) => (
                  <span key={tag} className="rounded-full border border-[rgba(123,30,43,0.10)] bg-[rgba(123,30,43,0.07)] px-2 py-[4px] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#7B1E2B]">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:max-w-[210px] sm:justify-end">
            {priceLabel ? (
              <span className="hidden shrink-0 pr-1 text-[14px] font-semibold tracking-[-0.02em] text-[#181511] sm:inline">
                {priceLabel}
              </span>
            ) : null}
            <ActionPill label={cellarMatch ? "Na adega" : "Salvar"} icon={Check} onClick={onSave} disabled={Boolean(cellarMatch)} disabledReason="Esse vinho já existe na sua adega." />
            <ActionPill label="Wishlist" icon={Heart} onClick={onWishlist} />
            <ActionPill label="Harmonizar" icon={UtensilsCrossed} onClick={onPair} disabled={!cellarMatch} disabledReason="Salve na adega para harmonizar por garrafa." />
            <ActionPill label="Ver" icon={Eye} onClick={onView} disabled={!cellarMatch} disabledReason="Disponível quando o vinho já está na sua adega." />
            <ActionPill label="Registrar" icon={GlassWater} onClick={onConsume} disabled={!cellarMatch} disabledReason="Disponível quando o vinho já está na sua adega." />
          </div>
        </div>
      </div>
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
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] transition-all duration-200",
        disabled
          ? "cursor-not-allowed border border-[rgba(58,51,39,0.06)] bg-[rgba(255,251,244,0.38)] text-[#9A9086]"
          : "border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.58)] text-[#433A32] shadow-none hover:bg-[rgba(255,251,244,0.78)]",
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
