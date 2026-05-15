import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Search, Loader2, Wine as WineIcon, Sparkles, Camera, Upload, ArrowLeft, ChefHat, Check, ArrowUpAZ, ArrowDownAZ, Clock, History, BookOpen, Crown, DollarSign, Heart } from "@/icons/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateWinePairing, analyzeMenuForWine, analyzeWineList, adaptMenuAnalysisToGeneratedWinePairing, buildUserProfile, normalizePairingResponse, normalizeWineListResponse, type GeneratedWinePairing, type WineListAnalysis, type WineListItem, type PairingIntent, type WineListAnalysisTextInput } from "@/lib/sommelier-ai";
import { Dialog } from "@/components/ui/dialog";
import { ModalBase } from "@/components/ui/ModalBase";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { prepareWineListAnalysisTextAttachment } from "@/lib/ai-attachments";
import { cn } from "@/lib/utils";
import { useWines, type Wine } from "@/hooks/useWines";
import { normalizeWineSearchText } from "@/lib/wine-normalization";
import { notifySuccess } from "@/lib/feedback";
import { logFileRequestStart } from "@/lib/observability";
import { buildPresentationStructureLine, cleanAiPresentationText } from "@/lib/ai-presentation";
import { AiModalHeader, AiModalCard, AiModalActionButton, AiModalShell, AiModalHeaderBar, AiModalBody, AiToolbarSurface, AiModalSplitLayout, AI_MODAL_FIELD_CLASSNAME, AI_MODAL_SHEET_CONTENT_CLASSNAME, AI_MODAL_SHEET_CONTENT_STYLE } from "@/components/ai-flow/ModalLayout";
import {
  PairingLoadingState,
  PairingErrorState,
  PremiumChoiceCard,
  WineSuggestionCard,
} from "@/components/pairing/shared";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";

interface DishToWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWineId?: string | null;
  initialWine?: Wine | null;
}

type Source = null | "cellar" | "external";
type SubMode = null | "by-dish" | "by-wine";
type Step =
  | "source"
  | "sub-mode"
  | "dish"
  | "intent"
  | "select-wine"
  | "results"
  | "wine-results"
  | "photo"
  | "scanning"
  | "scan-results"
  | "ext-wine-input"
  | "ext-menu-photo"
  | "ext-menu-scanning"
  | "ext-menu-results";

const popularDishes = [
  "Picanha na brasa",
  "Risoto de funghi",
  "Salmão grelhado",
  "Pasta ao pesto",
  "Pizza margherita",
  "Cordeiro assado",
];

function isSupportedOcrFile(file: File) {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const allowedImageMimes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
  if (mime === "application/pdf") return true;
  if (allowedImageMimes.has(mime)) return true;
  return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf"].some((ext) => name.endsWith(ext));
}

function compactText(value: string, maxLength: number) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildWineProfileLine(wine: Pick<WineListItem, "body" | "acidity" | "tannin">) {
  const parts = [
    wine.acidity ? `Acidez ${wine.acidity}` : null,
    wine.body ? `Corpo ${wine.body}` : null,
    wine.tannin ? `Taninos ${wine.tannin}` : null,
  ];
  return buildPresentationStructureLine(parts);
}

export function DishToWineDialog({ open, onOpenChange, initialWineId, initialWine }: DishToWineDialogProps) {
  const { data: wines, isLoading: winesLoading, isFetching: winesFetching, refetch: refetchWines } = useWines();
  const fileRef = useRef<HTMLInputElement>(null);
  const fileGalleryRef = useRef<HTMLInputElement>(null);
  const menuFileRef = useRef<HTMLInputElement>(null);
  const menuGalleryRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<Source>(null);
  const [subMode, setSubMode] = useState<SubMode>(null);
  const [step, setStep] = useState<Step>("source");
  const [dish, setDish] = useState("");
  const [extWineName, setExtWineName] = useState("");
  const [selectedWineId, setSelectedWineId] = useState("");
  const [pairingResult, setPairingResult] = useState<GeneratedWinePairing | null>(null);
  const [scanResults, setScanResults] = useState<WineListAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestMode, setRequestMode] = useState<"dish_only" | "image_only" | "dish_and_image" | null>(null);
  const [preview, setPreview] = useState<{ url?: string | null; fileName: string; isPdf: boolean } | null>(null);
  const [lastWineListAttachment, setLastWineListAttachment] = useState<WineListAnalysisTextInput | null>(null);
  const [lastMenuAttachment, setLastMenuAttachment] = useState<WineListAnalysisTextInput | null>(null);
  const [wineSearchState, setWineSearchState] = useState("");
  const [wineSortState, setWineSortState] = useState<"az" | "za" | "newest" | "oldest">("az");
  const [wineStyleFilter, setWineStyleFilter] = useState<"all" | "tinto" | "branco" | "rosé" | "espumante">("all");
  const [recipeModal, setRecipeModal] = useState<{ recipe: Recipe; dish: string } | null>(null);
  const [intent, setIntent] = useState<PairingIntent>("everyday");
  const [consumeWine, setConsumeWine] = useState<{ id: string; name: string; producer?: string | null; country?: string | null; region?: string | null; grape?: string | null; style?: string | null; vintage?: number | null } | null>(null);
  const [deepLinkLoading, setDeepLinkLoading] = useState(false);
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);
  const lastRetryRef = useRef<(() => void) | null>(null);
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const nextRequestId = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    requestSeqRef.current += 1;
    const id = requestSeqRef.current;
    console.info("[DishToWineDialog] request:start", { id, t: Date.now() });
    return id;
  }, []);
  const isLatest = (id: number) => id === requestSeqRef.current;
  const currentSignal = () => abortRef.current?.signal;
  const runRetry = useCallback(() => {
    const fn = lastRetryRef.current;
    if (fn) fn();
  }, []);

  useEffect(() => {
    console.info("[DishToWineDialog] step_state", {
      step,
      source,
      subMode,
      dish: dish.trim() || null,
    });
  }, [dish, source, step, subMode]);

  useEffect(() => {
    const pendingSteps: Step[] = ["scanning", "ext-menu-scanning", "wine-results"];
    if (!loading || !pendingSteps.includes(step)) return;

    const timeout = window.setTimeout(() => {
      requestSeqRef.current += 1;
      abortRef.current?.abort();
      setLoading(false);
      setDeepLinkLoading(false);
      setError("A harmonização demorou mais que o esperado. Tente novamente.");
      setStep((current) => {
        if (current === "ext-menu-scanning") return "ext-menu-photo";
        if (current === "wine-results") return "select-wine";
        if (requestMode === "dish_only") return "dish";
        return "photo";
      });
    }, 90_000);

    return () => window.clearTimeout(timeout);
  }, [loading, requestMode, step]);

  const resolveCellarWines = useCallback(async () => {
    const currentWines = Array.isArray(wines) ? wines : [];
    if (currentWines.length > 0) return currentWines;

    if (import.meta.env.DEV) {
      console.info("[DishToWineDialog] cellar_wines_refetch_requested", {
        winesLoading,
        winesFetching,
        currentCount: currentWines.length,
      });
    }

    try {
      const refreshed = await refetchWines();
      const nextWines = Array.isArray(refreshed.data) ? refreshed.data : [];
      if (import.meta.env.DEV) {
        console.info("[DishToWineDialog] cellar_wines_refetched", {
          rowCount: nextWines.length,
          wines: nextWines,
        });
      }
      return nextWines;
    } catch (error) {
      console.error("[DishToWineDialog] cellar_wines_refetch_failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return currentWines;
    }
  }, [refetchWines, wines, winesFetching, winesLoading]);
  const reset = () => {
    requestSeqRef.current += 1; // invalidate any in-flight requests
    abortRef.current?.abort();
    abortRef.current = null;
    setSource(null);
    setSubMode(null);
    setStep("source");
    setDish("");
    setExtWineName("");
    setSelectedWineId("");
    setPairingResult(null);
    setScanResults(null);
    setLoading(false);
    setError(null);
    setRequestMode(null);
    setPreview(null);
    setLastWineListAttachment(null);
    setLastMenuAttachment(null);
    setWineSearchState("");
    setWineSortState("az");
    setWineStyleFilter("all");
    setIntent("everyday");
    setDeepLinkLoading(false);
    setDeepLinkError(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSelectSource = (s: Source) => {
    setSource(s);
    setStep("sub-mode");
  };

  const handleSelectSubMode = (mode: SubMode) => {
    setSubMode(mode);
    if (source === "cellar") {
      if (mode === "by-dish") setStep("dish");
      else setStep("select-wine");
    } else {
      if (mode === "by-dish") setStep("dish");
      else setStep("ext-wine-input");
    }
  };

  // Search cellar wines for a dish (called after intent is selected)
  const handleSearchCellar = useCallback(async (chosenIntent?: PairingIntent) => {
    const query = dish.trim();
    if (!query) return;
    lastRetryRef.current = () => { handleSearchCellar(chosenIntent); };
    const reqId = nextRequestId();
    const resolvedCellarWines = await resolveCellarWines();
    const resolvedAvailableWines = resolvedCellarWines.filter((w) => w.quantity > 0);
    const resolvedCellarPairingPayload = resolvedAvailableWines.map((w) => ({
      id: w.id,
      name: w.name,
      style: w.style,
      grape: w.grape,
      region: w.region,
      country: w.country,
      producer: w.producer,
      vintage: w.vintage,
      purchase_price: w.purchase_price ?? null,
      current_value: w.current_value ?? null,
      quantity: w.quantity,
    }));

    console.info("[DishToWineDialog] cellar_wines_before_request", {
      requestId: reqId,
      winesLength: resolvedAvailableWines.length,
      mode: "cellar",
      dish: query,
    });
    if (resolvedAvailableWines.length > 0 && resolvedCellarPairingPayload.length === 0) {
      const error = new Error("Cellar wines were loaded but not included in the pairing payload.");
      console.error("[DishToWineDialog] cellar_payload_guard_failed", {
        requestId: reqId,
        winesLength: resolvedAvailableWines.length,
        payloadLength: resolvedCellarPairingPayload.length,
        mode: "cellar",
        error: error.message,
      });
      if (import.meta.env.DEV) throw error;
      setError("Não conseguimos usar os vinhos da sua adega agora. Tente novamente.");
      return;
    }
    if (resolvedAvailableWines.length === 0) {
      console.warn("[DishToWineDialog] cellar_wines_empty_after_refetch", {
        requestId: reqId,
        mode: "cellar",
        winesLoading,
        winesFetching,
      });
    }
    setLoading(true);
    setError(null);
    setPairingResult(null);
    try {
      const edgeRequestId = crypto.randomUUID();
      const pairingRequestPayload = {
        userInputDish: query,
        cellarWines: resolvedCellarPairingPayload,
        userWines: resolvedCellarPairingPayload,
        intent: chosenIntent ?? intent,
        mode: "cellar",
        requestId: edgeRequestId,
      };
      console.info("[DishToWineDialog] cellar_pairing_payload", {
        requestId: reqId,
        edgeRequestId,
        mode: "cellar",
        payload: pairingRequestPayload,
      });
      const result = await generateWinePairing({
        userInputDish: query,
        cellarWines: resolvedCellarPairingPayload,
        mode: "cellar",
        intent: chosenIntent ?? intent,
        requestId: edgeRequestId,
        signal: currentSignal(),
      });
      if (!isLatest(reqId)) { console.info("[DishToWineDialog] stale:cellar", { id: reqId }); return; }
      console.info("[DishToWineDialog] request:success", { id: reqId, kind: "cellar", winesLength: resolvedCellarPairingPayload.length });
      setError(null);
      const normalized = normalizePairingResponse(result, dish || "prato");
      setPairingResult(normalized);
      notifySuccess("Sugestões prontas", {
        description: normalized.fallback
          ? "Uma seleção enxuta já está pronta para revisar."
          : `${normalized.pairings.length} opções à mesa.`,
        duration: 2600,
      });
      setStep("results");
    } catch (err: any) {
      if (!isLatest(reqId)) return;
      console.error("[DishToWineDialog] cellar search failed:", err);
      setError(err?.message || "Não conseguimos concluir a leitura agora.");
    } finally {
      if (isLatest(reqId)) setLoading(false);
    }
  }, [dish, intent, nextRequestId, resolveCellarWines, winesFetching, winesLoading]);

  // Search food pairings for a selected wine
  const handleSearchWinePairings = useCallback(async () => {
    const wine = wines?.find((w) => w.id === selectedWineId);
    if (!wine) return;
    lastRetryRef.current = () => { handleSearchWinePairings(); };
    const reqId = nextRequestId();
    setLoading(true);
    setError(null);
    setPairingResult(null);
    try {
      const edgeRequestId = crypto.randomUUID();
      const result = await generateWinePairing({
        wineName: wine.name,
        wineStyle: wine.style,
        wineGrape: wine.grape,
        wineRegion: wine.region,
        wineProducer: wine.producer,
        wineVintage: wine.vintage,
        wineCountry: wine.country,
        requestId: edgeRequestId,
        signal: currentSignal(),
      });
      if (!isLatest(reqId)) { console.info("[DishToWineDialog] stale:wine", { id: reqId }); return; }
      console.info("[DishToWineDialog] request:success", { id: reqId, kind: "wine" });
      setError(null);
      const normalized = normalizePairingResponse(result, wine.name || "vinho");
      setPairingResult(normalized);
      notifySuccess("Harmonização pronta", {
        description: normalized.fallback
          ? "Uma seleção versátil já está pronta para revisar."
          : `${Math.min(normalized.pairings.length, 5)} sugestões à mesa.`,
        duration: 2600,
      });
      setStep("wine-results");
    } catch (err: any) {
      if (!isLatest(reqId)) return;
      console.error("[DishToWineDialog] wine pairings failed:", err);
      setError(err?.message || "Não conseguimos concluir a leitura agora.");
    } finally {
      if (isLatest(reqId)) setLoading(false);
    }
  }, [selectedWineId, wines, nextRequestId]);

  const resolveWineFromInsight = useCallback((wineId?: string | null, wineFallback?: Wine | null) => {
    const byId = wineId ? wines?.find((w) => w.id === wineId) ?? null : null;
    if (byId) return byId;
    if (wineFallback?.id) {
      const fallbackById = wines?.find((w) => w.id === wineFallback.id) ?? null;
      if (fallbackById) return fallbackById;
    }
    if (wineFallback?.name) {
      const normalizedFallback = normalizeWineSearchText(wineFallback.name);
      const byName = wines?.find((w) => normalizeWineSearchText(w.name) === normalizedFallback) ?? null;
      if (byName) return byName;
      return wineFallback;
    }
    return null;
  }, [wines]);

  // Deep-link: ao abrir com initialWineId, ir direto para resultados de harmonização
  useEffect(() => {
    if (!open || (!initialWineId && !initialWine)) return;

    const resolvedWine = resolveWineFromInsight(initialWineId, initialWine);
    if (!resolvedWine) {
      setSource("cellar");
      setSubMode("by-wine");
      setSelectedWineId(initialWineId || initialWine?.id || "");
      setPairingResult(null);
      setError("Não foi possível carregar este vinho da adega.");
      setDeepLinkError("Não foi possível carregar este vinho da adega.");
      setDeepLinkLoading(false);
      setStep("wine-results");
      return;
    }

    setSource("cellar");
    setSubMode("by-wine");
    setSelectedWineId(resolvedWine.id);
    setPairingResult(null);
    setError(null);
    setDeepLinkError(null);
    setDeepLinkLoading(true);
    setStep("wine-results");

    const runDeepLink = async () => {
      lastRetryRef.current = () => { runDeepLink(); };
      const reqId = nextRequestId();
      setLoading(true);
      const edgeRequestId = crypto.randomUUID();
      console.info("[DishToWineDialog] deep_link_payload", {
        id: reqId,
        edgeRequestId,
        wineId: resolvedWine.id,
        wineName: resolvedWine.name,
        source: "insight",
      });
      try {
        const result = await generateWinePairing({
          wineName: resolvedWine.name,
          wineStyle: resolvedWine.style,
          wineGrape: resolvedWine.grape,
          wineRegion: resolvedWine.region,
          wineProducer: resolvedWine.producer,
          wineVintage: resolvedWine.vintage,
          wineCountry: resolvedWine.country,
          requestId: edgeRequestId,
          signal: currentSignal(),
        });
        if (!isLatest(reqId)) return;
        const normalized = normalizePairingResponse(result, resolvedWine.name || "vinho");
        console.info("[DishToWineDialog] request:success", { id: reqId, kind: "deep-link", pairings: normalized.pairings.length });
        setError(null);
        setDeepLinkError(null);
        setPairingResult(normalized);
        notifySuccess("Harmonização pronta", {
          description: normalized.fallback
            ? "A leitura precisou ser simplificada, mas ainda há sugestões úteis para revisar."
            : `${Math.min(normalized.pairings.length, 5)} sugestões com leitura técnica.`,
          duration: 2600,
        });
      } catch (err: any) {
        if (!isLatest(reqId)) return;
        console.error("[DishToWineDialog] deep-link pairings failed:", err);
        setDeepLinkError(err?.message || "Não conseguimos concluir a leitura agora.");
        setError(err?.message || "Não conseguimos concluir a leitura agora.");
      } finally {
        if (isLatest(reqId)) {
          setLoading(false);
          setDeepLinkLoading(false);
        }
      }
    };
    runDeepLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialWineId, initialWine, resolveWineFromInsight]);

  const handleSearchExternal = useCallback(async (dishName?: string) => {
    const query = (dishName || dish).trim();
    if (!query.trim()) {
      setError("Informe um prato para harmonizar");
      return;
    }

    setDish(query);
    lastRetryRef.current = () => { handleSearchExternal(query); };
    const reqId = nextRequestId();
    setRequestMode("dish_only");
    setLoading(true);
    setError(null);
    setPairingResult(null);
    setScanResults(null);
    setLastWineListAttachment(null);
    setLastMenuAttachment(null);
    setPreview(null);
    setStep("scanning");

    console.info("[DishToWineDialog] input_type", { inputType: "dish_only", dish: query });
    console.info("[DishToWineDialog] pairing_request_started", {
      step: "dish",
      inputType: "dish_only",
      dish: query,
    });

    try {
      const edgeRequestId = crypto.randomUUID();
      const result = await generateWinePairing({ userInputDish: query, mode: "dish_only", requestId: edgeRequestId, signal: currentSignal() });
      if (!isLatest(reqId)) return;
      const normalized = normalizePairingResponse(result, query);
      console.info("[DishToWineDialog] pairing_request_completed", {
        step: "dish",
        inputType: "dish_only",
        pairings: normalized.pairings.length,
      });
      setError(null);
      setPairingResult(normalized);
      notifySuccess("Harmonização pronta", {
        description: normalized.fallback
          ? "Uma seleção versátil já está pronta para revisar."
          : `${Math.min(normalized.pairings.length, 5)} sugestões à mesa.`,
        duration: 2600,
      });
      setStep("results");
    } catch (err: any) {
      if (!isLatest(reqId)) return;
      console.error("[DishToWineDialog] pairing_request_failed", {
        step: "dish",
        inputType: "dish_only",
        error: err?.message,
        code: err?.code,
        status: err?.status,
        requestId: err?.requestId,
        functionName: err?.functionName,
        rawBody: err?.rawBody,
      });
      setError(err?.message || "Não conseguimos concluir a harmonização agora.");
      setStep("dish");
    } finally {
      if (isLatest(reqId)) setLoading(false);
    }
  }, [dish, nextRequestId]);

  // Router: from "dish" step, cellar goes to intent picker; external advances to wine-list attachment.
  const handleSearch = useCallback((dishName?: string) => {
    const query = (dishName || dish).trim();
    if (!query.trim()) {
      setError("Informe um prato para harmonizar");
      return;
    }
    setDish(query);
    if (source === "cellar") {
      console.info("[DishToWineDialog] step_transition", {
        from: step,
        to: "intent",
        source,
        reason: "dish_confirmed",
        dish: query,
      });
      setStep("intent");
    } else {
      setError(null);
      setPairingResult(null);
      setScanResults(null);
      setLastWineListAttachment(null);
      setPreview(null);
      console.info("[DishToWineDialog] step_transition", {
        from: step,
        to: "photo",
        source,
        reason: "dish_confirmed_external_attachment_required",
        dish: query,
      });
      setStep("photo");
    }
  }, [dish, source, step]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (loading) {
      e.target.value = "";
      return;
    }
    if (!isSupportedOcrFile(file)) {
      setError("Não conseguimos ler a imagem. Envie uma foto ou PDF compatível.");
      e.target.value = "";
      return;
    }

    const hasDishContext = Boolean(dish.trim());
    setRequestMode(hasDishContext ? "dish_and_image" : "image_only");
    console.info("[DishToWineDialog] upload_received", { step: "wine-list", fileName: file.name, mimeType: file.type, sizeBytes: file.size });
    console.info("[DishToWineDialog] input_type", {
      inputType: hasDishContext ? "dish_and_image" : "image_only",
      dish: hasDishContext ? dish.trim() : null,
      fileName: file.name,
      mimeType: file.type,
    });
    logFileRequestStart("PAIRING_START", file, { step: "wine-list" });
    setStep("scanning");
    const reqId = nextRequestId();
    setLoading(true);
    setError(null);
    setScanResults(null);
    setPreview({
      url: null,
      fileName: file.name,
      isPdf: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    });
    try {
      const prepared = await prepareWineListAnalysisTextAttachment(file, { signal: currentSignal() });
      console.info("[DishToWineDialog] file_validated", { step: "wine-list", sourceType: prepared.sourceType, fileName: prepared.fileName, mimeType: prepared.mimeType, textLength: prepared.text?.length || 0 });
      const payload: WineListAnalysisTextInput = {
        text: prepared.text,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
        requestId: crypto.randomUUID(),
      };
      console.info("[DishToWineDialog] backend_called", {
        step: "wine-list",
        function: "analyze-wine-list",
        payloadShape: {
          hasText: Boolean(payload.text),
          mimeType: payload.mimeType,
          fileName: payload.fileName,
        },
        payloadSizeEstimateBytes: payload.text?.length || 0,
      });
      setPreview({ url: prepared.previewUrl, fileName: prepared.fileName || file.name, isPdf: prepared.sourceType !== "image-text" });
      setLastWineListAttachment(payload);
      lastRetryRef.current = async () => {
        setStep("scanning");
        const retryId = nextRequestId();
        setLoading(true);
          setError(null);
          setScanResults(null);
        try {
          const retryPayload = { ...payload, requestId: crypto.randomUUID(), signal: currentSignal() };
          console.info("[DishToWineDialog] pairing_request_started", { step: "wine-list", retry: true, fileName: prepared.fileName, sourceType: prepared.sourceType });
          const profile = wines ? buildUserProfile(wines.filter(w => w.quantity > 0)) : undefined;
          const result = await analyzeWineList(retryPayload, profile);
          if (!isLatest(retryId)) return;
          const normalized = normalizeWineListResponse(result);
          console.info("[DishToWineDialog] pairing_request_completed", { step: "wine-list", retry: true, wines: normalized.wines.length });
          setError(null);
          setScanResults(normalized);
          notifySuccess("Carta analisada", {
            description: normalized.fallback
              ? "Os principais rótulos já estão organizados para revisar."
              : `${normalized.wines.length} vinhos à mesa.`,
            duration: 2600,
          });
          setStep("scan-results");
        } catch (err: any) {
          if (!isLatest(retryId)) return;
          console.error("[DishToWineDialog] pairing_request_failed", { step: "wine-list", retry: true, error: err?.message, code: err?.code, status: err?.status, requestId: err?.requestId, functionName: err?.functionName, rawBody: err?.rawBody });
          setError(err.message || "Não conseguimos concluir a leitura da carta.");
          setStep("photo");
        } finally {
          if (isLatest(retryId)) setLoading(false);
        }
      };

      const profile = wines ? buildUserProfile(wines.filter(w => w.quantity > 0)) : undefined;
      console.info("[DishToWineDialog] pairing_request_started", { step: "wine-list", fileName: prepared.fileName, sourceType: prepared.sourceType });
      const result = await analyzeWineList({ ...payload, signal: currentSignal() }, profile);
      if (!isLatest(reqId)) return;
      const normalized = normalizeWineListResponse(result);
      console.info("[DishToWineDialog] pairing_request_completed", { step: "wine-list", id: reqId, wines: normalized.wines.length });
      setError(null);
      setScanResults(normalized);
      notifySuccess("Carta analisada", {
        description: normalized.fallback
          ? "Os principais rótulos já estão organizados para revisar."
          : `${normalized.wines.length} vinhos à mesa.`,
        duration: 2600,
      });
      setStep("scan-results");
    } catch (err: any) {
      if (!isLatest(reqId)) return;
      console.error("[DishToWineDialog] pairing_request_failed", { step: "wine-list", id: reqId, error: err?.message, code: err?.code, status: err?.status, requestId: err?.requestId, functionName: err?.functionName, rawBody: err?.rawBody });
      setError(getAttachmentErrorMessage(err, err?.message || "Não conseguimos concluir a leitura da carta."));
      setStep("photo");
    } finally {
      if (isLatest(reqId)) setLoading(false);
      e.target.value = "";
    }
  };

  const handleMenuFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (loading) {
      e.target.value = "";
      return;
    }
    if (!isSupportedOcrFile(file)) {
      setError("Não conseguimos ler a imagem. Envie uma foto ou PDF compatível.");
      e.target.value = "";
      return;
    }

    const hasDishContext = Boolean(dish.trim());
    setRequestMode(hasDishContext ? "dish_and_image" : "image_only");
    console.info("[DishToWineDialog] upload_received", { step: "menu", fileName: file.name, mimeType: file.type, sizeBytes: file.size });
    console.info("[DishToWineDialog] input_type", {
      inputType: hasDishContext ? "dish_and_image" : "image_only",
      dish: hasDishContext ? dish.trim() : null,
      fileName: file.name,
      mimeType: file.type,
    });
    logFileRequestStart("PAIRING_START", file, { step: "menu" });
    setStep("ext-menu-scanning");
    const reqId = nextRequestId();
    setLoading(true);
    setError(null);
    setPairingResult(null);
    setPreview({
      url: null,
      fileName: file.name,
      isPdf: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    });
    try {
      const prepared = await prepareWineListAnalysisTextAttachment(file, { signal: currentSignal() });
      console.info("[DishToWineDialog] file_validated", { step: "menu", sourceType: prepared.sourceType, fileName: prepared.fileName, mimeType: prepared.mimeType, textLength: prepared.text?.length || 0 });
      const payload: WineListAnalysisTextInput = {
        text: prepared.text,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
        requestId: crypto.randomUUID(),
      };
      console.info("[DishToWineDialog] backend_called", {
        step: "menu",
        function: "generate-wine-pairing",
        payloadShape: {
          hasText: Boolean(payload.text),
          mimeType: payload.mimeType,
          fileName: payload.fileName,
        },
        payloadSizeEstimateBytes: payload.text?.length || 0,
      });
      console.warn("[DishToWineDialog] menu_flow_request_contract", {
        step: "menu",
        enteredWineName: extWineName,
        requestFunction: "analyzeMenuForWine",
        requestMode: "menu-for-wine",
        userInputDishPreview: String(payload.text || extWineName || "").slice(0, 240),
        requestIncludesWineName: true,
      });
      setPreview({ url: prepared.previewUrl, fileName: prepared.fileName || file.name, isPdf: prepared.sourceType !== "image-text" });
      setLastMenuAttachment(payload);
      lastRetryRef.current = async () => {
        setStep("ext-menu-scanning");
        const retryId = nextRequestId();
        setLoading(true);
        setError(null);
        setPairingResult(null);
        try {
          const edgeRequestId = crypto.randomUUID();
          console.info("[DishToWineDialog] pairing_request_started", { step: "menu", retry: true, wineName: extWineName, sourceType: prepared.sourceType });
          const result = await analyzeMenuForWine({ ...payload, requestId: edgeRequestId, signal: currentSignal() }, extWineName);
          if (!isLatest(retryId)) return;
          const normalized = normalizePairingResponse(adaptMenuAnalysisToGeneratedWinePairing(result, extWineName), currentDishContext);
          console.info("[DishToWineDialog] pairing_request_completed", { step: "menu", retry: true, pairings: normalized.pairings.length });
          setError(null);
          setPairingResult(normalized);
          notifySuccess("Cardápio lido", {
            description: normalized.fallback
              ? "Uma seleção enxuta já está pronta para revisar."
              : `${normalized.pairings.length} sugestões à mesa.`,
            duration: 2600,
          });
          setStep("ext-menu-results");
        } catch (err: any) {
          if (!isLatest(retryId)) return;
          console.error("[DishToWineDialog] pairing_request_failed", { step: "menu", retry: true, error: err?.message, code: err?.code, status: err?.status, requestId: err?.requestId, functionName: err?.functionName, rawBody: err?.rawBody });
          setError(err.message || "Não conseguimos concluir a leitura do cardápio.");
          setStep("ext-menu-photo");
        } finally {
          if (isLatest(retryId)) setLoading(false);
        }
      };

      console.info("[DishToWineDialog] pairing_request_started", { step: "menu", wineName: extWineName, sourceType: prepared.sourceType });
      const result = await analyzeMenuForWine({ ...payload, signal: currentSignal() }, extWineName);
      if (!isLatest(reqId)) return;
      const normalized = normalizePairingResponse(adaptMenuAnalysisToGeneratedWinePairing(result, extWineName), currentDishContext);
      console.info("[DishToWineDialog] pairing_request_completed", { step: "menu", id: reqId, pairings: normalized.pairings.length });
      setError(null);
      setPairingResult(normalized);
      notifySuccess("Cardápio lido", {
        description: normalized.fallback
          ? "Uma seleção enxuta já está pronta para revisar."
          : `${normalized.pairings.length} sugestões à mesa.`,
        duration: 2600,
      });
      setStep("ext-menu-results");
    } catch (err: any) {
      if (!isLatest(reqId)) return;
      console.error("[DishToWineDialog] pairing_request_failed", { step: "menu", id: reqId, error: err?.message, code: err?.code, status: err?.status, requestId: err?.requestId, functionName: err?.functionName, rawBody: err?.rawBody });
      setError(getAttachmentErrorMessage(err, err?.message || "Não conseguimos concluir a leitura do cardápio."));
      setStep("ext-menu-photo");
    } finally {
      if (isLatest(reqId)) setLoading(false);
      e.target.value = "";
    }
  };

  const goBack = () => {
    setError(null);
    if (step === "sub-mode") {
      setSource(null);
      setSubMode(null);
      setStep("source");
    } else if (step === "dish") {
      setStep("sub-mode");
      setSubMode(null);
    } else if (step === "select-wine") {
      setStep("sub-mode");
      setSubMode(null);
      setSelectedWineId("");
    } else if (step === "ext-wine-input") {
      setStep("sub-mode");
      setSubMode(null);
      setExtWineName("");
    } else if (step === "photo") {
      setStep("dish");
      setPreview(null);
    } else if (step === "ext-menu-photo") {
      setStep("ext-wine-input");
      setPreview(null);
    } else if (step === "intent") {
      setStep("dish");
    } else if (step === "results") {
      setStep(source === "cellar" ? "intent" : "dish");
      setPairingResult(null);
    } else if (step === "wine-results") {
      setStep("select-wine");
      setPairingResult(null);
    } else if (step === "scan-results") {
      setStep("photo");
      setScanResults(null);
    } else if (step === "ext-menu-results") {
      setStep("ext-menu-photo");
      setPairingResult(null);
    }
  };

  const selectedWine = wines?.find((w) => w.id === selectedWineId);
  const availableWines = wines?.filter((w) => w.quantity > 0) || [];
  const cellarPairingPayload = useMemo(
    () => availableWines.map((w) => ({
      id: w.id,
      name: w.name,
      style: w.style,
      grape: w.grape,
      region: w.region,
      country: w.country,
      producer: w.producer,
      vintage: w.vintage,
      purchase_price: w.purchase_price ?? null,
      current_value: w.current_value ?? null,
      quantity: w.quantity,
    })),
    [availableWines],
  );
  const normalizedPairingResult = useMemo<GeneratedWinePairing | null>(() => {
    if (!pairingResult) return null;
    try {
      const normalized = normalizePairingResponse(pairingResult, dish || extWineName || selectedWine?.name || "prato");
      if (import.meta.env.DEV) {
        console.info("[DishToWineDialog] pairing_result_normalized", {
          raw: pairingResult,
          normalized,
        });
      }
      return normalized;
    } catch (error) {
      const fallback = normalizePairingResponse(null, dish || extWineName || selectedWine?.name || "prato");
      console.error("[DishToWineDialog] pairing_result_normalization_failed", {
        raw: pairingResult,
        normalized: fallback,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return fallback;
    }
  }, [pairingResult, dish, extWineName, selectedWine?.name]);

    const normalizedScanResults = useMemo<WineListAnalysis | null>(() => {
    if (!scanResults) return null;
    try {
      const normalized = normalizeWineListResponse(scanResults);
      if (import.meta.env.DEV) {
        console.info("[DishToWineDialog] scan_results_normalized", {
          raw: scanResults,
          normalized,
        });
      }
      return normalized;
    } catch (error) {
      const fallback: WineListAnalysis = { wines: [], topPick: null, bestValue: null, fallback: true, fallbackReason: null };
      console.error("[DishToWineDialog] scan_results_normalization_failed", {
        raw: scanResults,
        normalized: fallback,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return fallback;
    }
  }, [scanResults]);

  const currentDishContext = dish || extWineName || selectedWine?.name || "prato";
  const loadingSteps = requestMode === "dish_only"
    ? [
        "Analisando prato",
        "Comparando estrutura",
        "Preparando harmonização",
      ]
    : [
        "Lendo carta",
        "Selecionando destaques",
        "Preparando recomendação",
      ];
  const loadingSubtitle = requestMode === "dish_only"
    ? `Harmonização para ${dish}`
    : dish.trim()
      ? `Carta para ${dish}`
      : "Leitura da carta";
  const flowMicroLabel = source === "cellar"
    ? "HARMONIZANDO COM SUA ADEGA"
    : source === "external"
      ? "HARMONIZANDO COM CARTA EXTERNA"
      : null;

  const subModeTitle = source === "cellar" ? "Da minha adega" : "Adega externa";

  const renderExternalScanResults = () => {
    try {
      const safeScanResults: WineListAnalysis = {
        wines: Array.isArray(normalizedScanResults?.wines) ? normalizedScanResults.wines : [],
        topPick: typeof normalizedScanResults?.topPick === "string" ? normalizedScanResults.topPick : null,
        bestValue: typeof normalizedScanResults?.bestValue === "string" ? normalizedScanResults.bestValue : null,
        fallback: Boolean(normalizedScanResults?.fallback),
        fallbackReason: typeof normalizedScanResults?.fallbackReason === "string" ? normalizedScanResults.fallbackReason : null,
      };
      return (
        <motion.div
          key="scan-results"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-3"
        >
          <div className="border-b border-[rgba(58,51,39,0.06)] pb-3">
            <div>
              <p className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1713]">
                Melhores vinhos para {dish}
              </p>
              <p className="mt-1 text-[12.5px] text-[#6B6258]">
                {safeScanResults.wines.length} sugestões ranqueadas da carta enviada.
              </p>
            </div>
          </div>

          {safeScanResults.wines.length === 0 ? (
            <AiModalCard className="text-center space-y-2">
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-[#1A1713]">
                {safeScanResults.fallback ? "Vale uma nova leitura da carta" : "Nenhum rótulo ganhou destaque nesta captura"}
              </p>
              <p className="text-[12.5px] leading-5 text-[#6B6258]">
                {safeScanResults.fallback ? "Uma nova foto pode abrir uma seleção mais completa." : "Vale tentar outra imagem com melhor enquadramento."}
              </p>
            </AiModalCard>
          ) : (
            <ul className="space-y-2.5">
              {safeScanResults.wines.map((w, i) => {
                const highlightTag = i === 0 || w.highlight === "top-pick" ? "Melhor escolha" : w.highlight === "best-value" ? "Mais segura" : i === 1 ? "Boa alternativa" : i === 2 ? "Mais aventureira" : null;
                const originLine = [w.producer, w.region, w.country].filter((value): value is string => Boolean(value && value.trim())).join(" · ");
                const summaryText = cleanAiPresentationText(w.description || w.verdict || w.reasoning || "", { maxLength: 132 });
                const whyText = cleanAiPresentationText(w.reasoning || w.verdict || w.description || "", { maxLength: 156 });
                const profileLine = buildWineProfileLine(w);
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className={cn(
                      "space-y-2.5 rounded-[14px] border-b border-[rgba(58,51,39,0.06)] p-3 transition-all duration-200",
                    )}
                  >
                    <div className="space-y-2.5">
                      {highlightTag ? (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B1E2B]/60">
                          {highlightTag}
                        </p>
                      ) : null}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="text-[16px] font-semibold tracking-[-0.02em] leading-tight text-[#1A1713] sm:text-[17px]">
                            {w.name}
                          </h4>
                          {originLine ? (
                            <p className="text-[12px] font-medium leading-5 text-[#6B6258]">{originLine}</p>
                          ) : null}
                          {summaryText ? (
                            <p className="text-[13px] leading-5 text-[#3F362F]">
                              {summaryText}
                            </p>
                          ) : null}
                        </div>
                        {w.price != null && (
                          <span className="shrink-0 text-[17px] font-semibold tracking-tight text-[#1A1713]">
                            R$ {w.price}
                          </span>
                        )}
                      </div>

                      {whyText ? (
                        <div className="border-l border-[rgba(198,167,104,0.22)] pl-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B6528]">Por que harmoniza</p>
                          <p className="mt-1 text-[12.5px] leading-5 text-[#3F362F]">
                            {whyText}
                          </p>
                        </div>
                      ) : null}

                      {profileLine ? (
                        <p className="text-[12px] leading-5 text-[#5B5146]">
                          {profileLine}
                        </p>
                      ) : null}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}

          <AiModalActionButton
            variant="ghost"
            onClick={() => {
              setScanResults(null);
              setPreview(null);
              setStep("photo");
            }}
            className="w-full border border-[rgba(58,51,39,0.06)] bg-transparent text-[#6B6258] hover:bg-[rgba(255,251,244,0.42)] hover:text-[#1A1713]"
          >
            Enviar outra foto
          </AiModalActionButton>
        </motion.div>
      );
    } catch (error) {
      console.error("[DishToWineDialog] scan_results_render_failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        raw: scanResults,
        normalized: normalizedScanResults,
      });
      return (
        <AiModalCard className="p-0">
          <PremiumEmptyState
            icon={Camera}
            title="Não conseguimos interpretar completamente a carta"
            description="Tente novamente ou envie outro arquivo."
            primaryAction={{
              label: "Enviar outra foto",
              onClick: () => {
                setScanResults(null);
                setPreview(null);
                setStep("photo");
              },
            }}
            className="border-0 bg-transparent px-5 py-8 shadow-none lg:py-9"
          />
        </AiModalCard>
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className={AI_MODAL_SHEET_CONTENT_CLASSNAME} style={AI_MODAL_SHEET_CONTENT_STYLE} aria-label="Harmonizar">
        <SheetTitle className="sr-only">Harmonizar</SheetTitle>
        <AiModalShell>
        <AiModalHeaderBar>
          <AiModalHeader
            icon={<UtensilsCrossed className="h-5 w-5" />}
            title="Harmonizar"
            description="Escolha o vinho certo para o prato, ou o prato certo para a garrafa."
          />
        </AiModalHeaderBar>

        <AiModalBody>
          <AiModalSplitLayout>
          <div className="space-y-3">
          {flowMicroLabel ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B6258]/60">
              {flowMicroLabel}
            </p>
          ) : null}
          {step !== "source" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="-mt-1 px-2 text-[11px] font-medium text-[#6B6258] hover:text-[#1A1713]"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Voltar
            </Button>
          )}

          <AnimatePresence mode="wait">
            {/* ── Step 1: Source Selection ── */}
          {step === "source" && (
              <motion.div
                key="source"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2.5 sm:space-y-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.55)]">
                  De onde vem o vinho?
                </p>

                <div className="space-y-2 sm:space-y-2.5">
                  <PremiumChoiceCard
                    index={0}
                    icon={WineIcon}
                    title="Da minha adega"
                    description="Vinhos cadastrados"
                    onClick={() => handleSelectSource("cellar")}
                  />
                  <PremiumChoiceCard
                    index={1}
                    icon={Camera}
                    title="Adega externa"
                    description="Carta ou cardápio"
                    accent="gold"
                    onClick={() => handleSelectSource("external")}
                  />
                </div>
              </motion.div>
            )}

            {/* ── Step 1b: Sub-mode (by dish or by wine) ── */}
            {step === "sub-mode" && (
              <motion.div
                key="sub-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2.5 sm:space-y-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.55)]">
                  {subModeTitle}
                </p>

                <div className="space-y-2 sm:space-y-2.5">
                  <PremiumChoiceCard
                    index={0}
                    icon={ChefHat}
                    title="Tenho um prato em mente"
                    description={source === "cellar" ? "Sugerir garrafas" : "Ler a carta"}
                    onClick={() => handleSelectSubMode("by-dish")}
                  />
                  <PremiumChoiceCard
                    index={1}
                    icon={WineIcon}
                    title="Tenho um vinho em mente"
                    description={source === "cellar" ? "Sugerir pratos" : "Ler o cardápio"}
                    onClick={() => handleSelectSubMode("by-wine")}
                  />
                </div>
              </motion.div>
            )}

            {/* ── Step 2a: Dish Input ── */}
            {step === "dish" && (
              <motion.div
                key="dish"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3 sm:space-y-3.5"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6258] mb-2">
                    Qual o prato que você quer harmonizar?
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6258]/60 pointer-events-none" />
                    <Input
                      value={dish}
                      onChange={(e) => {
                        setDish(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Digite o prato ou ingrediente…"
                      className={cn(AI_MODAL_FIELD_CLASSNAME, "pl-9")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                <AiModalActionButton
                  onClick={() => handleSearch()}
                  disabled={!dish.trim() || loading}
                  className="h-10 w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Consultando sommelier…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {source === "cellar" ? "Buscar na minha adega" : "Continuar"}
                    </>
                  )}
                </AiModalActionButton>

                {error && !loading && !lastWineListAttachment && !lastMenuAttachment && (
                  <PairingErrorState
                    message={error}
                    onRetry={() => {
                      if (dish.trim()) handleSearch(dish);
                    }}
                    onClose={() => setError(null)}
                  />
                )}

                {!loading && (
                  <div className="space-y-2 sm:space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6258]">
                      Sugestões populares
                    </p>
                    <div className="hidden flex-wrap gap-2 sm:flex">
                      {popularDishes.map((d) => (
                        <Button
                          key={d}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSearch(d)}
                          className="h-8 rounded-[12px] px-2.5 text-[10.5px] font-medium border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] hover:bg-[rgba(255,251,244,0.86)] hover:border-primary/20 hover:text-primary"
                        >
                          {d}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {error && lastMenuAttachment && (
                  <PairingErrorState
                    message={error}
                    onRetry={runRetry}
                    onClose={() => setStep("ext-menu-photo")}
                  />
                )}
              </motion.div>
            )}

            {/* ── Step 2a-bis: Intent picker (cellar only) ── */}
            {step === "intent" && (
              <motion.div
                key="intent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3 sm:space-y-3.5"
              >
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.55)]">
                    Como você quer harmonizar?
                  </p>
                  <p className="text-[12px] text-[#6B6258]">
                    Para <span className="font-semibold text-[#1A1713]">{dish}</span>.
                  </p>
                </div>

                  <div className="space-y-2 sm:space-y-2.5">
                  <PremiumChoiceCard
                    index={0}
                    icon={Heart}
                    title="Para o dia a dia"
                    description="Vinhos de custo médio que harmonizam muito bem"
                    onClick={() => { setIntent("everyday"); handleSearchCellar("everyday"); }}
                  />
                  <PremiumChoiceCard
                    index={1}
                    icon={DollarSign}
                    title="Melhor custo-benefício"
                    description="A melhor harmonização entre os rótulos mais econômicos"
                    onClick={() => { setIntent("value"); handleSearchCellar("value"); }}
                  />
                  <PremiumChoiceCard
                    index={2}
                    icon={Crown}
                    title="Para um momento inesquecível"
                    description="Os rótulos mais especiais que combinam com o prato"
                    accent="gold"
                    onClick={() => { setIntent("special"); handleSearchCellar("special"); }}
                  />
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-[12px] text-[#6B6258] pt-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Consultando sommelier…
                  </div>
                )}

                {error && !loading && (
                  <PairingErrorState
                    message={error}
                    onRetry={() => handleSearchCellar(intent)}
                    onClose={() => setError(null)}
                  />
                )}
              </motion.div>
            )}

            {/* ── Step 2b: Select Wine from Cellar (Premium Finder) ── */}
            {step === "select-wine" && (() => {
              type SortKey = "az" | "za" | "newest" | "oldest";
              const wineSearch = wineSearchState;
              const setWineSearch = setWineSearchState;
              const sortKey = wineSortState;
              const setSortKey = setWineSortState;

              const sortOptions: { key: SortKey; label: string; icon: typeof ArrowDownAZ }[] = [
                { key: "az", label: "A → Z", icon: ArrowDownAZ },
                { key: "za", label: "Z → A", icon: ArrowUpAZ },
                { key: "newest", label: "Mais recentes", icon: Clock },
                { key: "oldest", label: "Mais antigos", icon: History },
              ];

              const matchesStyle = (style: string | null | undefined) => {
                if (wineStyleFilter === "all") return true;
                const s = (style ?? "").toLowerCase();
                if (wineStyleFilter === "tinto") return s.includes("tint");
                if (wineStyleFilter === "branco") return s.includes("branc") || s.includes("white");
                if (wineStyleFilter === "rosé") return s.includes("ros");
                if (wineStyleFilter === "espumante") return s.includes("espum") || s.includes("champ") || s.includes("sparkl");
                return true;
              };

              const filtered = availableWines
                .filter((w) => matchesStyle(w.style))
                .filter((w) => {
                  if (!wineSearch.trim()) return true;
                  const q = normalizeWineSearchText(wineSearch);
                  return (
                    normalizeWineSearchText(w.name).includes(q) ||
                    normalizeWineSearchText(w.producer).includes(q) ||
                    normalizeWineSearchText(w.grape).includes(q) ||
                    (w.vintage && String(w.vintage).includes(q))
                  );
                })
                .sort((a, b) => {
                  if (sortKey === "az") return a.name.localeCompare(b.name, "pt-BR");
                  if (sortKey === "za") return b.name.localeCompare(a.name, "pt-BR");
                  if (sortKey === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                });

              const styleFilterOptions: Array<{
                key: typeof wineStyleFilter;
                label: string;
                dot: string;
              }> = [
                {
                  key: "all",
                  label: "Todos",
                  dot: "bg-[#6B6258]/40",
                },
                {
                  key: "tinto",
                  label: "Tinto",
                  dot: "bg-[hsl(348,55%,40%)]",
                },
                {
                  key: "branco",
                  label: "Branco",
                  dot: "bg-[hsl(45,60%,55%)]",
                },
                {
                  key: "rosé",
                  label: "Rosé",
                  dot: "bg-[hsl(340,55%,65%)]",
                },
                {
                  key: "espumante",
                  label: "Espumante",
                  dot: "bg-[hsl(48,55%,62%)]",
                },
              ];

              return (
              <motion.div
                key="select-wine"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex min-h-0 flex-1 flex-col gap-2.5"
              >
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6258]">
                    Qual vinho da sua adega?
                  </p>

                  <AiToolbarSurface className="space-y-2 px-0 py-1">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B6258]/55" />
                      <input
                        type="text"
                        value={wineSearch}
                        onChange={(e) => setWineSearch(e.target.value)}
                        placeholder="Buscar vinho na sua adega..."
                        className={cn(AI_MODAL_FIELD_CLASSNAME, "h-9 pl-8")}
                        autoFocus
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {sortOptions.map((opt) => {
                        const Icon = opt.icon;
                        const active = sortKey === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => setSortKey(opt.key)}
                            className={cn(
                              "flex h-6 items-center gap-1 rounded-full border px-2 py-0 text-[9.5px] font-semibold uppercase tracking-[0.06em] transition-all duration-150",
                              active
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : "border-[rgba(58,51,39,0.06)] bg-transparent text-[#6B6258] hover:bg-[rgba(255,251,244,0.42)] hover:text-[#1A1713]",
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {styleFilterOptions.map((opt) => {
                        const active = wineStyleFilter === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => setWineStyleFilter(opt.key)}
                            className={cn(
                              "flex h-6 items-center gap-1 rounded-full border px-2 py-0 text-[9.5px] font-semibold uppercase tracking-[0.06em] transition-all duration-150",
                              active
                                ? "border-[#7B1E2B]/16 bg-[rgba(123,30,43,0.07)] text-[#7B1E2B]"
                                : "border-[rgba(58,51,39,0.06)] bg-transparent text-[#6B6258] hover:bg-[rgba(255,251,244,0.42)] hover:text-[#1A1713]",
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", opt.dot)} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </AiToolbarSurface>
                </div>

                <ScrollArea className="min-h-0 flex-1 -mx-1 px-1">
                  <div className="space-y-1">
                    {filtered.map((w) => {
                      const isSelected = selectedWineId === w.id;
                      const meta = [w.style, w.grape, w.region].filter(Boolean).join(" · ");
                      return (
                        <button
                          key={w.id}
                          onClick={() => setSelectedWineId(w.id)}
                          className={cn(
                            "w-full cursor-pointer rounded-[14px] border-b px-2.5 py-2 text-left transition-colors duration-150 group",
                            isSelected
                              ? "border-[#7B1E2B]/16 bg-[rgba(123,30,43,0.05)]"
                              : "border-[rgba(58,51,39,0.06)] bg-transparent hover:bg-[rgba(255,251,244,0.42)]"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-[9px] shrink-0 transition-colors duration-150",
                              isSelected ? "bg-[rgba(123,30,43,0.08)]" : "bg-transparent"
                            )}>
                              {isSelected ? (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <WineIcon className="h-3.5 w-3.5 text-[#6B6258]/55" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "truncate text-[13px] font-semibold",
                                isSelected ? "text-[#1A1713]" : "text-[#1A1713]/90"
                              )}>
                                {w.name}
                                {w.vintage ? <span className="text-[#6B6258]/70 font-normal ml-1.5">({w.vintage})</span> : null}
                              </p>
                              {meta && (
                                <p className="mt-0.5 truncate text-[10.5px] text-[#6B6258]/70">{meta}</p>
                              )}
                            </div>
                            <span className={cn(
                              "shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                              isSelected ? "bg-[rgba(123,30,43,0.08)] text-[#7B1E2B]" : "bg-transparent text-[#6B6258]/60"
                            )}>
                              {w.quantity}×
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {/* Empty state */}
                    {filtered.length === 0 && availableWines.length > 0 && (
                      <AiModalCard className="p-0">
                        <PremiumEmptyState
                          icon={Search}
                          title="Nenhum vinho encontrado na sua adega"
                          description="Tente outro nome, produtor, uva ou região."
                          className="border-0 bg-transparent px-4 py-4 shadow-none"
                        />
                      </AiModalCard>
                    )}

                    {availableWines.length === 0 && (
                      <AiModalCard className="p-0">
                        <PremiumEmptyState
                          icon={WineIcon}
                          title="Você ainda não adicionou vinhos na sua adega"
                          description="Adicione sua primeira garrafa para usar a harmonização."
                          className="border-0 bg-transparent px-4 py-4 shadow-none"
                        />
                      </AiModalCard>
                    )}
                  </div>
                </ScrollArea>

                <div className="sticky bottom-0 z-10 -mx-1 border-t border-[rgba(58,51,39,0.06)] bg-[rgba(246,240,232,0.94)] px-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] pt-2 backdrop-blur-sm">
                  {selectedWine ? (
                    <div className="space-y-2">
                      <AiToolbarSurface className="space-y-0.5 border-0 px-0 py-0">
                        <p className="text-[12.5px] font-semibold text-[#1A1713]">{selectedWine.name}</p>
                        <p className="text-[10.5px] text-[#6B6258]">
                          {[selectedWine.style, selectedWine.grape, selectedWine.region, selectedWine.country].filter(Boolean).join(" · ")}
                        </p>
                      </AiToolbarSurface>
                      <AiModalActionButton
                        onClick={handleSearchWinePairings}
                        disabled={!selectedWineId || loading}
                        className="h-9 w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparando harmonização
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Usar este vinho
                          </>
                        )}
                      </AiModalActionButton>
                    </div>
                  ) : (
                    <AiToolbarSurface className="border-0 px-0 py-0 text-[11px] text-[#6B6258]">
                      Selecione uma garrafa para continuar.
                    </AiToolbarSurface>
                  )}
                </div>

                {error && (
                  <PairingErrorState message={error} onRetry={runRetry} onClose={() => setStep("select-wine")} />
                )}
              </motion.div>
              );
            })()}

            {/* ── Ext: Wine name input ── */}
            {step === "ext-wine-input" && (
              <motion.div
                key="ext-wine-input"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3 sm:space-y-3.5"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6258] mb-2">
                    Qual vinho você quer harmonizar?
                  </p>
                  <div className="relative">
                    <WineIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6258]/60 pointer-events-none" />
                    <Input
                      value={extWineName}
                      onChange={(e) => setExtWineName(e.target.value)}
                      placeholder="Nome do vinho no rótulo…"
                      className={cn(AI_MODAL_FIELD_CLASSNAME, "pl-9")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && extWineName.trim()) {
                          e.preventDefault();
                          setStep("ext-menu-photo");
                        }
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                <AiModalActionButton
                  onClick={() => setStep("ext-menu-photo")}
                  disabled={!extWineName.trim()}
                  className="h-10 w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Enviar cardápio
                </AiModalActionButton>
              </motion.div>
            )}

            {/* ── Ext: Menu photo upload ── */}
            {step === "ext-menu-photo" && (
              <motion.div
                key="ext-menu-photo"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3 sm:space-y-3.5"
              >
                <div className="border-b border-[rgba(58,51,39,0.06)] pb-2">
                  <p className="text-[12px] font-medium text-[#6B6258]">
                    Vinho: <span className="font-semibold">{extWineName}</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6258] mb-2">
                    Cardápio
                  </p>

                  <input
                    ref={menuFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    capture="environment"
                    className="hidden"
                    onChange={handleMenuFileChange}
                  />
                  <input
                    ref={menuGalleryRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    className="hidden"
                    onChange={handleMenuFileChange}
                  />

                  <div className="flex flex-col gap-2 w-full">
                    <AiModalActionButton
                      type="button"
                      variant="primary"
                      onClick={() => menuFileRef.current?.click()}
                      className="h-10 w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Tirar foto
                    </AiModalActionButton>
                    <AiModalActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => menuGalleryRef.current?.click()}
                      className="h-10 w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Galeria ou PDF
                    </AiModalActionButton>
                  </div>
                </div>

                {error && (
                  <PairingErrorState
                    message={error}
                    onRetry={() => (lastMenuAttachment ? runRetry() : menuGalleryRef.current?.click())}
                    onClose={() => setError(null)}
                  />
                )}
              </motion.div>
            )}

            {/* ── Ext: Menu scanning ── */}
            {step === "ext-menu-scanning" && (
              <PairingLoadingState
                steps={[
                  "Lendo menu",
                  "Comparando estrutura",
                  "Preparando combinações",
                ]}
                subtitle={`Vinho: ${extWineName}`}
              />
            )}

            {/* ── Photo Upload (external dish → wine list) ── */}
            {step === "photo" && (
              <motion.div
                key="photo"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3 sm:space-y-3.5"
              >
                <div className="border-b border-[rgba(58,51,39,0.06)] pb-2">
                  <p className="text-[12px] font-medium text-[#6B6258]">
                    Prato: <span className="font-semibold">{dish}</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6258] mb-2">
                    Carta de vinhos
                  </p>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <input
                    ref={fileGalleryRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="flex flex-col gap-2 w-full">
                    <AiModalActionButton
                      type="button"
                      variant="primary"
                      onClick={() => fileRef.current?.click()}
                      className="h-10 w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Tirar foto
                    </AiModalActionButton>
                    <AiModalActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => fileGalleryRef.current?.click()}
                      className="h-10 w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Galeria ou PDF
                    </AiModalActionButton>
                  </div>
                </div>

                {error && (
                  <PairingErrorState
                    message={error}
                    onRetry={() => (lastWineListAttachment ? runRetry() : fileGalleryRef.current?.click())}
                    onClose={() => setError(null)}
                  />
                )}
              </motion.div>
            )}

            {/* ── Scanning ── */}
            {step === "scanning" && (
              <PairingLoadingState
                steps={loadingSteps}
                subtitle={loadingSubtitle}
              />
            )}

            {(step === "results" || step === "wine-results" || step === "ext-menu-results") && normalizedPairingResult && (
              <motion.div
                key={`${step}-strict`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="border-b border-[rgba(58,51,39,0.06)] pb-3">
                  <p className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#1A1713]">
                    {step === "wine-results" ? "Melhores pratos" : "Melhores harmonizações"}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-5 text-[#6B6258]">
                    {Math.min(normalizedPairingResult.pairings.length, 5)} escolhas ranqueadas por estrutura e contexto.
                  </p>
                </div>

                <ul className="space-y-2.5">
                  {normalizedPairingResult.pairings.slice(0, 5).map((p, i) => (
                    <WineSuggestionCard
                      key={i}
                      index={i}
                      wineName={p.wine}
                      style={p.style}
                      reason={p.why_it_works}
                      structureMatch={p.structure_match}
                      decisionSupport={p.decision_support || null}
                    />
                  ))}
                </ul>

                <AiModalActionButton
                  variant="ghost"
                  onClick={() => {
                    setPairingResult(null);
                    setPreview(null);
                    setStep(step === "wine-results" ? "select-wine" : step === "ext-menu-results" ? "ext-menu-photo" : "dish");
                  }}
                  className="w-full border border-[rgba(58,51,39,0.06)] bg-transparent text-[#6B6258] transition-all duration-200 hover:bg-[rgba(255,251,244,0.42)] hover:text-[#1A1713]"
                >
                  {step === "wine-results"
                    ? "Escolher outro vinho"
                    : step === "ext-menu-results"
                      ? "Enviar outra foto"
                      : "Buscar outro prato"}
                </AiModalActionButton>
              </motion.div>
            )}

            {/* ── Wine Results (wine → food suggestions) ── */}
            {step === "wine-results" && error && !pairingResult && (
              <PairingErrorState
                key="wine-results-error"
                message={error}
                onRetry={runRetry}
                onClose={() => {
                  setError(null);
                  setStep("select-wine");
                }}
              />
            )}

            {step === "wine-results" && deepLinkLoading && !pairingResult && (
              <PairingLoadingState
                steps={[
                  "Lendo garrafa",
                  "Comparando estrutura",
                  "Preparando pratos",
                ]}
                subtitle={selectedWine?.name || initialWine?.name || "Vinho selecionado"}
              />
            )}

            {/* ── External Scan Results (dish → wine list photo) ── */}
            {step === "scan-results" && normalizedScanResults && renderExternalScanResults()}
          </AnimatePresence>
          </div>
          </AiModalSplitLayout>
        </AiModalBody>
        </AiModalShell>
      </SheetContent>

      {/* Recipe Modal */}
      {recipeModal && (
        <Dialog open={!!recipeModal} onOpenChange={(v) => !v && setRecipeModal(null)}>
          <ModalBase
            title={recipeModal.dish}
            icon={<BookOpen className="h-5 w-5" />}
            onClose={() => setRecipeModal(null)}
            className="sm:max-w-md"
          >
              <div className="space-y-3">
                {recipeModal.recipe.description && (
                  <p className="text-sm text-black/70 leading-relaxed italic">{recipeModal.recipe.description}</p>
                )}
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-black/50">Ingredientes</h4>
                  <ul className="space-y-2">
                    {recipeModal.recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-black/70 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B1E2B]/35" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-black/50">Modo de preparo</h4>
                  <ol className="space-y-2">
                    {recipeModal.recipe.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-black/70 leading-relaxed">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-[10px] font-bold text-[#5F5F5F]">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-[14px] border border-[rgba(58,51,39,0.06)] bg-transparent p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[#7B1E2B]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/50">Por que harmoniza</span>
                  </div>
                  <p className="text-sm text-black/70 leading-relaxed">{recipeModal.recipe.wine_reason}</p>
                </div>
              </div>
          </ModalBase>
        </Dialog>
      )}

      <AddConsumptionDialog
        open={!!consumeWine}
        onOpenChange={(v) => { if (!v) setConsumeWine(null); }}
        preSelectedWine={consumeWine}
      />
    </Sheet>
  );
}
