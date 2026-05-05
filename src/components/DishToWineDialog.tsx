import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Search, Loader2, Wine as WineIcon, Sparkles, Camera, Upload, ArrowLeft, ChefHat, FileText, Check, ArrowUpAZ, ArrowDownAZ, Clock, History, BookOpen, Crown, DollarSign, Heart } from "@/icons/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateWinePairing, analyzeWineList, buildUserProfile, normalizePairingResponse, normalizeWineListResponse, type GeneratedWinePairing, type WineListAnalysis, type PairingIntent, type WineListAnalysisTextInput } from "@/lib/sommelier-ai";
import { Dialog } from "@/components/ui/dialog";
import { ModalBase } from "@/components/ui/ModalBase";
import { prepareWineListAnalysisTextAttachment } from "@/lib/ai-attachments";
import { cn } from "@/lib/utils";
import { useWines, type Wine } from "@/hooks/useWines";
import { normalizeWineSearchText } from "@/lib/wine-normalization";
import { notifySuccess } from "@/lib/feedback";
import { logFileRequestStart } from "@/lib/observability";
import { AiModalHeader, AiModalCard, AiStatusCard, AiModalActions, AiModalActionButton } from "@/components/ai-flow/ModalLayout";
import {
  SectionHeader,
  PairingLoadingState,
  PairingErrorState,
  PremiumChoiceCard,
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

export function DishToWineDialog({ open, onOpenChange, initialWineId, initialWine }: DishToWineDialogProps) {
  const { data: wines } = useWines();
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
  const nextRequestId = useCallback(() => {
    requestSeqRef.current += 1;
    const id = requestSeqRef.current;
    console.info("[DishToWineDialog] request:start", { id, t: Date.now() });
    return id;
  }, []);
  const isLatest = (id: number) => id === requestSeqRef.current;
  const runRetry = useCallback(() => {
    const fn = lastRetryRef.current;
    if (fn) fn();
  }, []);
  const reset = () => {
    requestSeqRef.current += 1; // invalidate any in-flight requests
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
    setLoading(true);
    setError(null);
    setPairingResult(null);
    try {
      const result = await generateWinePairing({
        userInputDish: query,
        cellarWines: wines?.filter((w) => w.quantity > 0)?.map((w) => ({
          name: w.name,
          style: w.style,
          grape: w.grape,
          region: w.region,
          country: w.country,
          producer: w.producer,
          vintage: w.vintage,
          purchase_price: w.purchase_price ?? null,
          current_value: w.current_value ?? null,
        })) ?? null,
        intent: chosenIntent ?? intent,
      });
      if (!isLatest(reqId)) { console.info("[DishToWineDialog] stale:cellar", { id: reqId }); return; }
      console.info("[DishToWineDialog] request:success", { id: reqId, kind: "cellar" });
      setError(null);
      const normalized = normalizePairingResponse(result, dish || "prato");
      setPairingResult(normalized);
      notifySuccess("Sugestões prontas", {
        description: normalized.fallback
          ? "Não foi possível concluir a leitura com total confiança, então exibimos uma versão simplificada para você revisar."
          : `${normalized.pairings.length} opções pensadas para o prato.`,
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
  }, [dish, wines, intent, nextRequestId]);

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
      const result = await generateWinePairing({
        wineName: wine.name,
        wineStyle: wine.style,
        wineGrape: wine.grape,
        wineRegion: wine.region,
        wineProducer: wine.producer,
        wineVintage: wine.vintage,
        wineCountry: wine.country,
      });
      if (!isLatest(reqId)) { console.info("[DishToWineDialog] stale:wine", { id: reqId }); return; }
      console.info("[DishToWineDialog] request:success", { id: reqId, kind: "wine" });
      setError(null);
      const normalized = normalizePairingResponse(result, wine.name || "vinho");
      setPairingResult(normalized);
      notifySuccess("Harmonização pronta", {
        description: normalized.fallback
          ? "A análise precisou de fallback, mas ainda retornou sugestões úteis para revisão."
          : `${Math.min(normalized.pairings.length, 5)} sugestões com porquê técnico.`,
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
      console.info("[DishToWineDialog] deep_link_payload", {
        id: reqId,
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
    const query = dishName || dish.trim();
    if (!query) return;
    setDish(query);
    setStep("photo");
  }, [dish]);

  // Router: from "dish" step, cellar goes to intent picker; external goes to photo upload.
  const handleSearch = useCallback((dishName?: string) => {
    const query = dishName || dish.trim();
    if (!query) return;
    setDish(query);
    if (source === "cellar") {
      setStep("intent");
    } else {
      handleSearchExternal(query);
    }
  }, [dish, source, handleSearchExternal]);

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

    console.info("[DishToWineDialog] upload_received", { step: "wine-list", fileName: file.name, mimeType: file.type, sizeBytes: file.size });
    logFileRequestStart("PAIRING_START", file, { step: "wine-list" });
    setStep("scanning");
    const reqId = nextRequestId();
    setLoading(true);
    setError(null);
    setScanResults(null);
    try {
      const prepared = await prepareWineListAnalysisTextAttachment(file);
      console.info("[DishToWineDialog] file_validated", { step: "wine-list", sourceType: prepared.sourceType, fileName: prepared.fileName, mimeType: prepared.mimeType, textLength: prepared.text?.length || 0 });
      const payload: WineListAnalysisTextInput = {
        text: prepared.text,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
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
          console.info("[DishToWineDialog] pairing_request_started", { step: "wine-list", retry: true, fileName: prepared.fileName, sourceType: prepared.sourceType });
          const profile = wines ? buildUserProfile(wines.filter(w => w.quantity > 0)) : undefined;
          const result = await analyzeWineList(payload, profile);
          if (!isLatest(retryId)) return;
          const normalized = normalizeWineListResponse(result);
          console.info("[DishToWineDialog] pairing_request_completed", { step: "wine-list", retry: true, wines: normalized.wines.length });
          setError(null);
          setScanResults(normalized);
          notifySuccess("Carta analisada", {
            description: normalized.fallback
              ? "Não foi possível ler tudo com segurança; mantivemos uma versão simplificada para revisão."
              : `${normalized.wines.length} vinhos lidos com sucesso.`,
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
      const result = await analyzeWineList(payload, profile);
      if (!isLatest(reqId)) return;
      const normalized = normalizeWineListResponse(result);
      console.info("[DishToWineDialog] pairing_request_completed", { step: "wine-list", id: reqId, wines: normalized.wines.length });
      setError(null);
      setScanResults(normalized);
      notifySuccess("Carta analisada", {
        description: normalized.fallback
          ? "Não foi possível ler tudo com segurança; mantivemos uma versão simplificada para revisão."
          : `${normalized.wines.length} vinhos prontos para refinar.`,
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
    }
    e.target.value = "";
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

    console.info("[DishToWineDialog] upload_received", { step: "menu", fileName: file.name, mimeType: file.type, sizeBytes: file.size });
    logFileRequestStart("PAIRING_START", file, { step: "menu" });
    setStep("ext-menu-scanning");
    const reqId = nextRequestId();
    setLoading(true);
    setError(null);
    setPairingResult(null);
    try {
      const prepared = await prepareWineListAnalysisTextAttachment(file);
      console.info("[DishToWineDialog] file_validated", { step: "menu", sourceType: prepared.sourceType, fileName: prepared.fileName, mimeType: prepared.mimeType, textLength: prepared.text?.length || 0 });
      const payload: WineListAnalysisTextInput = {
        text: prepared.text,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
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
      setPreview({ url: prepared.previewUrl, fileName: prepared.fileName || file.name, isPdf: prepared.sourceType !== "image-text" });
      setLastMenuAttachment(payload);
      lastRetryRef.current = async () => {
        setStep("ext-menu-scanning");
        const retryId = nextRequestId();
        setLoading(true);
        setError(null);
        setPairingResult(null);
        try {
          console.info("[DishToWineDialog] pairing_request_started", { step: "menu", retry: true, wineName: extWineName, sourceType: prepared.sourceType });
          const result = await generateWinePairing(payload.text || extWineName || "prato não especificado");
          if (!isLatest(retryId)) return;
          const normalized = normalizePairingResponse(result, currentDishContext);
          console.info("[DishToWineDialog] pairing_request_completed", { step: "menu", retry: true, pairings: normalized.pairings.length });
          setError(null);
          setPairingResult(normalized);
          notifySuccess("Cardápio lido", {
            description: normalized.fallback
              ? "A leitura precisou de fallback, mas a revisão continua possível."
              : `${normalized.pairings.length} sugestões identificadas.`,
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
      const result = await generateWinePairing(payload.text || extWineName || "prato não especificado");
      if (!isLatest(reqId)) return;
      const normalized = normalizePairingResponse(result, currentDishContext);
      console.info("[DishToWineDialog] pairing_request_completed", { step: "menu", id: reqId, pairings: normalized.pairings.length });
      setError(null);
      setPairingResult(normalized);
      notifySuccess("Cardápio lido", {
        description: normalized.fallback
          ? "A leitura precisou de fallback, mas a revisão continua possível."
          : `${normalized.pairings.length} sugestões identificadas.`,
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
    }
    e.target.value = "";
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
      const resultStatus = safeScanResults.fallback
        ? {
            icon: <Sparkles className="h-4 w-4 text-amber-700" />,
            title: "Leitura parcial",
            tone: "bg-amber-50 text-amber-900 ring-amber-200",
            description: "Conseguimos ler parte da carta.",
            warning: "Revise os dados antes de salvar.",
          }
        : {
            icon: <Check className="h-4 w-4 text-success" />,
            title: "Leitura completa",
            tone: "bg-success/10 text-success ring-success/20",
            description: "A carta foi lida com segurança.",
            warning: null,
          };

      return (
        <motion.div
          key="scan-results"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          {preview?.url && (
            <AiModalCard className="p-0 overflow-hidden">
              <div className="aspect-[3/2] w-full overflow-hidden bg-muted/20">
                <img src={preview.url} alt="Pré-visualização do arquivo analisado" className="h-full w-full object-cover" />
              </div>
            </AiModalCard>
          )}

          <AiStatusCard
            icon={resultStatus.icon}
            title={resultStatus.title}
            description={resultStatus.description}
            warning={resultStatus.warning}
            toneClassName={resultStatus.tone}
          />

          <AiModalCard className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              Prato: <span className="font-bold">{dish}</span>
            </p>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary/70" />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Melhores opções da carta
              </span>
            </div>
          </AiModalCard>

          {safeScanResults.wines.length === 0 ? (
            <AiModalCard className="text-center space-y-2">
              <p className="text-sm text-foreground/70 font-medium">
                {safeScanResults.fallback ? "Não conseguimos interpretar completamente a carta" : "Nenhum vinho identificado com segurança"}
              </p>
              <p className="text-xs text-muted-foreground">
                {safeScanResults.fallback ? "Tente novamente ou envie outro arquivo." : "Tente outra foto com melhor iluminação."}
              </p>
            </AiModalCard>
          ) : (
            <ul className="space-y-3">
              {safeScanResults.wines.map((w, i) => {
                const tint = getStyleTint(w.style);
                const meta = [w.grape, w.vintage ? `Safra ${w.vintage}` : null, w.region].filter(Boolean).join(" · ");
                const compatColor = w.compatibilityLabel === "Excelente escolha" ? "bg-[hsl(152,32%,38%/0.12)] text-[hsl(152,42%,32%)]" :
                  w.compatibilityLabel === "Alta compatibilidade" ? "bg-[hsl(152,32%,38%/0.10)] text-[hsl(152,32%,40%)]" :
                  w.compatibilityLabel === "Escolha ousada" ? "bg-[hsl(270,60%,55%/0.10)] text-[hsl(270,60%,40%)]" :
                  w.compatibilityLabel === "Pouco indicado" ? "bg-[hsl(0,72%,51%/0.10)] text-[hsl(0,72%,40%)]" :
                  "bg-[hsl(38,36%,52%/0.12)] text-[hsl(38,50%,35%)]";
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className={cn(
                      "rounded-2xl border p-4 space-y-2 cursor-default transition-all duration-200 hover:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]",
                      tint || "bg-card/60 border-border/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[15px] font-bold text-foreground tracking-tight">{w.name}</span>
                        {meta && <p className="text-[11px] text-muted-foreground/70">{meta}</p>}
                      </div>
                      {w.price != null && (
                        <span className="shrink-0 text-[14px] font-bold text-foreground">
                          R$ {w.price}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {w.compatibilityLabel && (
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide", compatColor)}>
                          {w.compatibilityLabel}
                        </span>
                      )}
                      {w.highlight && (
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          w.highlight === "best-value"
                            ? "bg-[hsl(38,36%,52%/0.12)] text-[hsl(38,50%,35%)]"
                            : w.highlight === "top-pick"
                              ? "bg-primary/8 text-primary"
                              : "bg-[hsl(348,55%,28%/0.10)] text-[hsl(348,45%,35%)]"
                        )}>
                          {w.highlight === "best-value" ? "Melhor custo-benefício" : w.highlight === "top-pick" ? "Melhor escolha" : "Para experimentar"}
                        </span>
                      )}
                    </div>
                    {(w.body || w.acidity || w.tannin) && (
                      <div className="flex flex-wrap gap-1">
                        {w.body && <span className="inline-flex items-center rounded-full bg-muted/30 px-1.5 py-[1px] text-[8px] font-semibold text-muted-foreground">Corpo {w.body}</span>}
                        {w.acidity && <span className="inline-flex items-center rounded-full bg-muted/30 px-1.5 py-[1px] text-[8px] font-semibold text-muted-foreground">Acidez {w.acidity}</span>}
                        {w.tannin && <span className="inline-flex items-center rounded-full bg-muted/30 px-1.5 py-[1px] text-[8px] font-semibold text-muted-foreground">Taninos {w.tannin}</span>}
                      </div>
                    )}
                    <p className="text-[12.5px] text-foreground/65 leading-relaxed">{w.verdict}</p>
                    {w.reasoning && (
                      <p className="text-[12px] text-foreground/60 leading-relaxed">
                        {w.reasoning}
                      </p>
                    )}
                    {Array.isArray(w.comparativeLabels) && w.comparativeLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {w.comparativeLabels.map((label, j) => (
                          <span key={j} className="inline-flex items-center rounded-full bg-primary/[0.06] px-2 py-[1px] text-[8px] font-semibold uppercase tracking-wider text-primary/70">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
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
            className="w-full text-muted-foreground hover:text-foreground border border-border/30 bg-background/40 backdrop-blur-sm hover:bg-background/60 hover:shadow-sm transition-all duration-200"
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
        <div className="surface-clarity p-6 text-center space-y-2">
          <p className="text-sm text-foreground/70 font-medium">
            Não conseguimos interpretar completamente a carta
          </p>
          <p className="text-xs text-muted-foreground">
            Tente novamente ou envie outro arquivo.
          </p>
        </div>
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 border-black/5">
        <div className="px-4 pt-4 sm:px-5">
          <AiModalHeader
            icon={<UtensilsCrossed className="h-5 w-5" />}
            title="Harmonizar"
            description="Encontre a combinação perfeita entre vinho e gastronomia"
          />
        </div>

        <div className="space-y-4 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 sm:px-5">
          {step !== "source" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="-mt-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
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
                className="space-y-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.55)]">
                  De onde vem o vinho?
                </p>

                <div className="space-y-2.5">
                  <PremiumChoiceCard
                    index={0}
                    icon={WineIcon}
                    title="Da minha adega"
                    description="Harmonize com vinhos que você já tem"
                    onClick={() => handleSelectSource("cellar")}
                  />
                  <PremiumChoiceCard
                    index={1}
                    icon={Camera}
                    title="Adega externa"
                    description="Envie a foto da carta de vinhos ou do cardápio"
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
                className="space-y-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.55)]">
                  {subModeTitle} — Como quer harmonizar?
                </p>

                <div className="space-y-2.5">
                  <PremiumChoiceCard
                    index={0}
                    icon={ChefHat}
                    title="Tenho um prato em mente"
                    description={source === "cellar"
                      ? "O Sommelyx sugere vinhos da sua adega para o prato"
                      : "Digite o prato e envie a foto da carta de vinhos"}
                    onClick={() => handleSelectSubMode("by-dish")}
                  />
                  <PremiumChoiceCard
                    index={1}
                    icon={WineIcon}
                    title="Tenho um vinho em mente"
                    description={source === "cellar"
                      ? "O Sommelyx sugere pratos ideais para o vinho escolhido"
                      : "Digite o vinho e envie a foto do cardápio"}
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
                className="space-y-3.5"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Qual o prato que você quer harmonizar?
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      value={dish}
                      onChange={(e) => setDish(e.target.value)}
                      placeholder="Digite o prato ou ingrediente…"
                      className="pl-9"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      autoFocus
                    />
                  </div>
                </div>

                <AiModalActionButton
                  onClick={() => handleSearch()}
                  disabled={!dish.trim() || loading}
                  className="w-full"
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

                {!loading && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Sugestões populares
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {popularDishes.map((d) => (
                        <Button
                          key={d}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSearch(d)}
                          className="h-11 rounded-2xl px-3 text-[11px] font-medium border border-border/50 bg-background/60 hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
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
                className="space-y-3.5"
              >
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.55)]">
                    Como você quer harmonizar?
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Vamos sugerir o vinho ideal da sua adega para <span className="font-semibold text-foreground/80">{dish}</span>.
                  </p>
                </div>

                <div className="space-y-2.5">
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
                  <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground pt-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Consultando sommelier…
                  </div>
                )}

                {error && lastWineListAttachment && (
                  <PairingErrorState
                    message={error}
                    onRetry={runRetry}
                    onClose={() => setStep("photo")}
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
                bg: string;
                bgActive: string;
                border: string;
                borderActive: string;
                text: string;
                textActive: string;
                dot: string;
              }> = [
                {
                  key: "all",
                  label: "Todos",
                  bg: "bg-background/40",
                  bgActive: "bg-foreground/[0.06]",
                  border: "border-border/30",
                  borderActive: "border-foreground/20",
                  text: "text-muted-foreground/70",
                  textActive: "text-foreground",
                  dot: "bg-foreground/40",
                },
                {
                  key: "tinto",
                  label: "Tinto",
                  bg: "bg-[hsl(348,40%,50%/0.05)]",
                  bgActive: "bg-[hsl(348,40%,50%/0.14)]",
                  border: "border-[hsl(348,40%,50%/0.18)]",
                  borderActive: "border-[hsl(348,45%,45%/0.45)]",
                  text: "text-[hsl(348,30%,40%)]",
                  textActive: "text-[hsl(348,55%,32%)]",
                  dot: "bg-[hsl(348,55%,40%)]",
                },
                {
                  key: "branco",
                  label: "Branco",
                  bg: "bg-[hsl(45,55%,55%/0.06)]",
                  bgActive: "bg-[hsl(45,55%,55%/0.16)]",
                  border: "border-[hsl(45,50%,50%/0.20)]",
                  borderActive: "border-[hsl(45,55%,45%/0.50)]",
                  text: "text-[hsl(40,35%,38%)]",
                  textActive: "text-[hsl(40,55%,30%)]",
                  dot: "bg-[hsl(45,60%,55%)]",
                },
                {
                  key: "rosé",
                  label: "Rosé",
                  bg: "bg-[hsl(340,50%,72%/0.08)]",
                  bgActive: "bg-[hsl(340,50%,72%/0.20)]",
                  border: "border-[hsl(340,45%,65%/0.22)]",
                  borderActive: "border-[hsl(340,50%,55%/0.45)]",
                  text: "text-[hsl(340,30%,45%)]",
                  textActive: "text-[hsl(340,45%,35%)]",
                  dot: "bg-[hsl(340,55%,65%)]",
                },
                {
                  key: "espumante",
                  label: "Espumante",
                  bg: "bg-[hsl(48,40%,80%/0.10)]",
                  bgActive: "bg-[hsl(48,45%,75%/0.22)]",
                  border: "border-[hsl(48,35%,60%/0.22)]",
                  borderActive: "border-[hsl(48,45%,50%/0.45)]",
                  text: "text-[hsl(42,28%,42%)]",
                  textActive: "text-[hsl(42,45%,32%)]",
                  dot: "bg-[hsl(48,55%,62%)]",
                },
              ];

              return (
              <motion.div
                key="select-wine"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3.5"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Qual vinho da sua adega?
                  </p>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                    <input
                      type="text"
                      value={wineSearch}
                      onChange={(e) => setWineSearch(e.target.value)}
                      placeholder="Buscar vinho na sua adega..."
                      className="flex h-12 w-full rounded-2xl border border-border/50 bg-background/60 pl-10 pr-4 py-2.5 text-[14px] font-medium text-foreground backdrop-blur-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-3 focus:ring-primary/[0.10] focus:border-primary/30 transition-all duration-200"
                      autoFocus
                    />
                  </div>

                  {/* Sort controls */}
                  <div className="flex items-center gap-1.5 mt-3">
                    {sortOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = sortKey === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setSortKey(opt.key)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-[0.06em] transition-all duration-150",
                            active
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-background/40 text-muted-foreground/60 border border-border/30 hover:bg-muted/30 hover:text-muted-foreground"
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Style filter chips (color-coded by wine type) */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {styleFilterOptions.map((opt) => {
                      const active = wineStyleFilter === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setWineStyleFilter(opt.key)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-[0.06em] border transition-all duration-150",
                            active ? `${opt.bgActive} ${opt.borderActive} ${opt.textActive} shadow-[0_1px_4px_-2px_rgba(0,0,0,0.08)]` : `${opt.bg} ${opt.border} ${opt.text} hover:-translate-y-[1px]`
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", opt.dot)} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wine list */}
                <ScrollArea className="h-[300px] -mx-1 px-1">
                  <div className="space-y-1.5">
                    {filtered.map((w) => {
                      const isSelected = selectedWineId === w.id;
                      const meta = [w.style, w.grape, w.region].filter(Boolean).join(" · ");
                      return (
                        <button
                          key={w.id}
                          onClick={() => setSelectedWineId(w.id)}
                          className={cn(
                            "w-full cursor-pointer text-left rounded-2xl p-3.5 transition-all duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] group",
                            isSelected
                              ? "bg-primary/[0.10] border border-primary/20 shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10"
                              : "bg-background/40 border border-border/25 hover:bg-muted/30 hover:border-border/40 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_-6px_rgba(0,0,0,0.08)] active:scale-[0.99]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150",
                              isSelected ? "bg-primary/15" : "bg-muted/30"
                            )}>
                              {isSelected ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <WineIcon className="h-4 w-4 text-muted-foreground/50" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-[13.5px] font-semibold truncate",
                                isSelected ? "text-foreground" : "text-foreground/90"
                              )}>
                                {w.name}
                                {w.vintage ? <span className="text-muted-foreground/60 font-normal ml-1.5">({w.vintage})</span> : null}
                              </p>
                              {meta && (
                                <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{meta}</p>
                              )}
                            </div>
                            <span className={cn(
                              "text-[11px] font-semibold tabular-nums shrink-0 px-2 py-0.5 rounded-lg",
                              isSelected ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground/50"
                            )}>
                              {w.quantity}×
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {/* Empty state */}
                    {filtered.length === 0 && availableWines.length > 0 && (
                      <div className="text-center py-10 space-y-2">
                        <Search className="h-7 w-7 text-muted-foreground/30 mx-auto" />
                        <p className="text-[13px] font-medium text-muted-foreground/70">
                          Nenhum vinho encontrado na sua adega
                        </p>
                        <p className="text-[11px] text-muted-foreground/45">
                          Tente outro nome, produtor, uva ou região
                        </p>
                      </div>
                    )}

                    {availableWines.length === 0 && (
                      <div className="text-center py-10 space-y-2">
                        <WineIcon className="h-7 w-7 text-muted-foreground/30 mx-auto" />
                        <p className="text-[13px] font-medium text-muted-foreground/70">
                          Você ainda não adicionou vinhos na sua adega
                        </p>
                        <p className="text-[11px] text-muted-foreground/45">
                          Adicione sua primeira garrafa para usar a harmonização
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Selected wine preview */}
                {selectedWine && (
                  <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3 space-y-0.5">
                    <p className="text-[13px] font-semibold text-foreground">{selectedWine.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[selectedWine.style, selectedWine.grape, selectedWine.region, selectedWine.country].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSearchWinePairings}
                  disabled={!selectedWineId || loading}
                  className="w-full h-11 text-[13px] font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Consultando sommelier…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Sugerir pratos
                    </>
                  )}
                </Button>

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
                className="space-y-3.5"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Qual vinho você quer harmonizar?
                  </p>
                  <div className="relative">
                    <WineIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      value={extWineName}
                      onChange={(e) => setExtWineName(e.target.value)}
                      placeholder="Nome do vinho (ex: Malbec Catena Zapata)…"
                      className="pl-9 h-11 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && extWineName.trim() && setStep("ext-menu-photo")}
                      autoFocus
                    />
                  </div>
                </div>

                <AiModalActionButton
                  onClick={() => setStep("ext-menu-photo")}
                  disabled={!extWineName.trim()}
                  className="w-full"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Continuar — Enviar foto do cardápio
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
                className="space-y-3.5"
              >
                <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
                  <p className="text-[12px] font-medium text-foreground">
                    Vinho: <span className="font-semibold">{extWineName}</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                    Envie a foto do cardápio do restaurante
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

                  <div className="flex flex-col gap-2.5 w-full">
                    <AiModalActionButton
                      type="button"
                      variant="primary"
                      onClick={() => menuFileRef.current?.click()}
                      className="w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Tirar Foto
                    </AiModalActionButton>
                    <AiModalActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => menuGalleryRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Escolher da Galeria ou PDF
                    </AiModalActionButton>
                  </div>
                </div>

                {error && lastMenuAttachment && (
                  <PairingErrorState message={error} onRetry={runRetry} onClose={() => setStep("ext-wine-input")} />
                )}
              </motion.div>
            )}

            {/* ── Ext: Menu scanning ── */}
            {step === "ext-menu-scanning" && (
              <PairingLoadingState
                steps={[
                  "Lendo imagem…",
                  "Interpretando carta…",
                  "Gerando análise…",
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
                className="space-y-3.5"
              >
                <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
                  <p className="text-[12px] font-medium text-foreground">
                    Prato: <span className="font-semibold">{dish}</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                    Envie a foto da carta de vinhos
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

                  <div className="flex flex-col gap-2.5 w-full">
                    <AiModalActionButton
                      type="button"
                      variant="primary"
                      onClick={() => fileRef.current?.click()}
                      className="w-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Tirar Foto
                    </AiModalActionButton>
                    <AiModalActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => fileGalleryRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Escolher da Galeria ou PDF
                    </AiModalActionButton>
                  </div>
                </div>

                {error && lastWineListAttachment && (
                  <PairingErrorState message={error} onRetry={runRetry} onClose={() => setStep("dish")} />
                )}
              </motion.div>
            )}

            {/* ── Scanning ── */}
            {step === "scanning" && (
              <PairingLoadingState
                steps={[
                  "Lendo imagem…",
                  "Interpretando carta…",
                  "Gerando análise…",
                ]}
                subtitle={`Prato: ${dish}`}
              />
            )}

            {(step === "results" || step === "wine-results" || step === "ext-menu-results") && normalizedPairingResult && (
              <motion.div
                key={`${step}-strict`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {preview?.url && (
                  <AiModalCard className="p-0 overflow-hidden">
                    <div className="aspect-[3/2] w-full overflow-hidden bg-muted/20">
                      <img src={preview.url} alt="Pré-visualização do arquivo analisado" className="h-full w-full object-cover" />
                    </div>
                  </AiModalCard>
                )}

                <AiStatusCard
                  icon={normalizedPairingResult.fallback ? <Sparkles className="h-4 w-4 text-amber-700" /> : <Check className="h-4 w-4 text-success" />}
                  title={normalizedPairingResult.fallback ? "Leitura parcial" : "Leitura completa"}
                  description={normalizedPairingResult.fallback ? "Conseguimos ler parte da carta." : "A carta foi lida com segurança."}
                  warning={normalizedPairingResult.fallback ? "Revise os dados antes de salvar." : null}
                  toneClassName={normalizedPairingResult.fallback ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-success/10 text-success ring-success/20"}
                />

                <AiModalCard className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary/65" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/65">Análise</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      ["Acidez", normalizedPairingResult.analysis.acidity],
                      ["Gordura", normalizedPairingResult.analysis.fat],
                      ["Textura", normalizedPairingResult.analysis.texture],
                      ["Perfil", normalizedPairingResult.analysis.flavor_profile],
                      ["Preparo", normalizedPairingResult.analysis.cooking_method],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-[rgba(0,0,0,0.05)] bg-white/55 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/75">{value}</p>
                      </div>
                    ))}
                  </div>
                </AiModalCard>

                <SectionHeader
                  icon="chef"
                  label={step === "wine-results" ? "Pratos sugeridos" : "Harmonizações"}
                  count={Math.min(normalizedPairingResult.pairings.length, 5)}
                />

                <ul className="space-y-2.5">
                  {normalizedPairingResult.pairings.slice(0, 5).map((p, i) => (
                    <li key={i} className="surface-clarity rounded-2xl border border-[rgba(0,0,0,0.05)] p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/55">Sugestão {i + 1}</p>
                          <h4 className="mt-0.5 text-[15px] font-bold text-foreground tracking-tight">{p.wine}</h4>
                        </div>
                        <span className="shrink-0 inline-flex items-center rounded-full bg-primary/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary/70">
                          {p.style}
                        </span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-foreground/70">{p.why_it_works}</p>
                      {p.decision_support ? (
                        <div className="space-y-2 rounded-2xl border border-border/30 bg-background/45 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Leitura técnica</p>
                          <p className="text-[12px] leading-relaxed text-foreground/72">
                            <span className="font-semibold text-foreground/85">Sensorial:</span>{" "}
                            Aroma {p.decision_support.sensory_profile.aroma} · Palato {p.decision_support.sensory_profile.palate} · Estrutura {p.decision_support.sensory_profile.structure}
                          </p>
                          <p className="text-[12px] leading-relaxed text-foreground/72">
                            <span className="font-semibold text-foreground/85">Lógica:</span>{" "}
                            {p.decision_support.pairing_logic.fat_vs_acidity} {p.decision_support.pairing_logic.protein_vs_tannin} {p.decision_support.pairing_logic.intensity_balance}
                          </p>
                          <p className="text-[12px] leading-relaxed text-foreground/72">
                            <span className="font-semibold text-foreground/85">Quando abrir:</span>{" "}
                            {p.decision_support.when_to_choose.ideal_scenario} {p.decision_support.when_to_choose.alternative_use}
                          </p>
                          <p className="text-[12px] leading-relaxed text-foreground/72">
                            <span className="font-semibold text-foreground/85">Confiança:</span> {p.decision_support.confidence_explanation}
                          </p>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <AiModalActionButton
                  variant="ghost"
                  onClick={() => {
                    setPairingResult(null);
                    setPreview(null);
                    setStep(step === "wine-results" ? "select-wine" : step === "ext-menu-results" ? "ext-menu-photo" : "dish");
                  }}
                  className="w-full text-muted-foreground hover:text-foreground border border-border/30 bg-background/40 backdrop-blur-sm hover:bg-background/60 hover:shadow-sm transition-all duration-200"
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
                onClose={() => handleClose(false)}
              />
            )}

            {step === "wine-results" && deepLinkLoading && !pairingResult && (
              <PairingLoadingState
                steps={[
                  "Carregando o vinho selecionado…",
                  "Consultando harmonizações…",
                  "Buscando detalhes e receitas…",
                ]}
                subtitle={selectedWine?.name || initialWine?.name || "Vinho selecionado"}
              />
            )}

            {/* ── External Scan Results (dish → wine list photo) ── */}
            {step === "scan-results" && normalizedScanResults && renderExternalScanResults()}
          </AnimatePresence>
        </div>
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
              <div className="space-y-4">
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
                <div className="rounded-2xl border border-black/5 bg-white p-4">
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
