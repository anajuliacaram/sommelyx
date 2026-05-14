import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, RotateCcw, X, Check, Sparkles } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { analyzeWineList, buildUserProfile, normalizeWineListResponse, type WineListAnalysis, type WineListItem, type WineListAnalysisTextInput } from "@/lib/sommelier-ai";
import { getAttachmentErrorMessage, prepareWineListAnalysisTextAttachment } from "@/lib/ai-attachments";
import { useWines } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { notifySuccess } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import { AiModalHeader, AiModalCard, AiStatusCard, AiModalActions, AiModalActionButton, AiFilterChip, AiSectionLabel, AiModalShell, AiModalHeaderBar, AiModalBody } from "@/components/ai-flow/ModalLayout";
import {
  PairingLoadingState,
  PairingErrorState,
  SectionHeader,
} from "@/components/pairing/shared";

interface WineListScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScanStep = "capture" | "scanning" | "results" | "error";

/* ── Wine type color system ── */
type WineType = "tinto" | "branco" | "rosé" | "espumante" | "unknown";

function detectWineType(style?: string): WineType {
  if (!style) return "unknown";
  const s = style.toLowerCase();
  if (s.includes("tinto") || s.includes("red")) return "tinto";
  if (s.includes("branco") || s.includes("white")) return "branco";
  if (s.includes("rosé") || s.includes("rose") || s.includes("rosado")) return "rosé";
  if (s.includes("espumante") || s.includes("sparkling") || s.includes("champagne") || s.includes("cava") || s.includes("prosecco")) return "espumante";
  return "unknown";
}

function isSupportedUploadFile(file: File) {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const allowedImageMimes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);
  if (mime === "application/pdf") return true;
  if (allowedImageMimes.has(mime)) return true;
  return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf"].some((ext) => name.endsWith(ext));
}

const wineTypeConfig: Record<WineType, {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  starColor: string;
  starFill: string;
  accentLine: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
}> = {
  tinto: {
    label: "Tinto",
    badgeBg: "rgba(110,30,42,0.10)",
    badgeText: "#7B1E3A",
    badgeBorder: "rgba(110,30,42,0.18)",
    starColor: "#7B1E3A",
    starFill: "#7B1E3A",
    accentLine: "rgba(110,30,42,0.25)",
    chipBg: "rgba(110,30,42,0.06)",
    chipBorder: "rgba(110,30,42,0.12)",
    chipText: "#5a1528",
  },
  branco: {
    label: "Branco",
    badgeBg: "rgba(180,155,80,0.12)",
    badgeText: "#8B7730",
    badgeBorder: "rgba(180,155,80,0.22)",
    starColor: "#B49B50",
    starFill: "#B49B50",
    accentLine: "rgba(180,155,80,0.30)",
    chipBg: "rgba(180,155,80,0.07)",
    chipBorder: "rgba(180,155,80,0.15)",
    chipText: "#6e5e28",
  },
  "rosé": {
    label: "Rosé",
    badgeBg: "rgba(190,110,130,0.10)",
    badgeText: "#9E4D65",
    badgeBorder: "rgba(190,110,130,0.20)",
    starColor: "#BE6E82",
    starFill: "#BE6E82",
    accentLine: "rgba(190,110,130,0.25)",
    chipBg: "rgba(190,110,130,0.06)",
    chipBorder: "rgba(190,110,130,0.12)",
    chipText: "#7a3d50",
  },
  espumante: {
    label: "Espumante",
    badgeBg: "rgba(198,167,104,0.12)",
    badgeText: "#8B7730",
    badgeBorder: "rgba(198,167,104,0.22)",
    starColor: "#C6A768",
    starFill: "#C6A768",
    accentLine: "rgba(198,167,104,0.30)",
    chipBg: "rgba(198,167,104,0.07)",
    chipBorder: "rgba(198,167,104,0.15)",
    chipText: "#6e5e28",
  },
  unknown: {
    label: "",
    badgeBg: "rgba(100,100,100,0.08)",
    badgeText: "#666",
    badgeBorder: "rgba(100,100,100,0.15)",
    starColor: "hsl(var(--gold))",
    starFill: "hsl(var(--gold))",
    accentLine: "rgba(100,100,100,0.15)",
    chipBg: "rgba(100,100,100,0.05)",
    chipBorder: "rgba(100,100,100,0.10)",
    chipText: "#555",
  },
};

type FilterMode = "all" | "tinto" | "branco" | "rosé" | "espumante";
type BodyPreference = "all" | "leve" | "encorpado";
type PriceRange = "all" | "up-to-250" | "250-500" | "500-plus";

const EMPTY_WINE_LIST_ANALYSIS: WineListAnalysis = {
  wines: [],
  topPick: null,
  bestValue: null,
  fallback: true,
  fallbackReason: null,
};

const CANONICAL_TAGS = [
  "Melhor escolha",
  "Melhor custo-benefício",
  "Em guarda",
  "Beber agora",
  "Ícone da carta",
  "Alta complexidade",
] as const;

function normalizeDisplayTags(tags?: string[] | null) {
  const mapped = (tags || [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => CANONICAL_TAGS.find((canonical) => canonical.toLowerCase() === tag.toLowerCase()) || tag)
    .filter((tag) => CANONICAL_TAGS.includes(tag as (typeof CANONICAL_TAGS)[number]));
  return Array.from(new Set(mapped));
}

export function WineListScannerDialog({ open, onOpenChange }: WineListScannerDialogProps) {
  const { data: wines } = useWines();
  const { toast } = useToast();
  const [step, setStep] = useState<ScanStep>("capture");
  const [attachmentPreview, setAttachmentPreview] = useState<{ url?: string | null; fileName: string; isPdf: boolean } | null>(null);
  const [results, setResults] = useState<WineListAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastAttachment, setLastAttachment] = useState<WineListAnalysisTextInput | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [mealQuery, setMealQuery] = useState("");
  const [bodyPreference, setBodyPreference] = useState<BodyPreference>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [selectedWineName, setSelectedWineName] = useState<string | null>(null);
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
    setMealQuery("");
    setBodyPreference("all");
    setPriceRange("all");
    setSelectedWineName(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const runScan = useCallback(async (attachment: WineListAnalysisTextInput) => {
    if (requestBusyRef.current) return;
    requestBusyRef.current = true;
    setStep("scanning");
    setErrorMsg("");
    const requestId = crypto.randomUUID();
    console.info("[WineListScannerDialog] request_started", {
      requestId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      hasText: Boolean(attachment.text),
      textLength: attachment.text?.length || 0,
    });
    try {
      const cellarWines = wines?.filter((w) => w.quantity > 0) || [];
      const profile = cellarWines.length >= 3 ? buildUserProfile(cellarWines) : undefined;
      console.info("[WineListScannerDialog] extraction_started", {
        requestId,
        hasText: Boolean(attachment.text),
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
        textLength: attachment.text?.length || 0,
      });
      console.info("[OCR RAW TEXT]", {
        requestId,
        fileName: attachment.fileName,
        textLength: attachment.text?.length || 0,
        preview: String(attachment.text || "").slice(0, 1200),
      });
      const data = await analyzeWineList({ ...attachment, requestId }, profile);
      console.info("[WineListScannerDialog] response_received", {
        requestId,
        hasData: Boolean(data),
        wineCount: Array.isArray((data as any)?.wines) ? (data as any).wines.length : 0,
        fallback: Boolean((data as any)?.fallback),
      });
      const normalized = normalizeWineListResponse(data);
      console.info("[PARSED WINES]", {
        requestId,
        wineCount: Array.isArray((data as any)?.wines) ? (data as any).wines.length : 0,
        wines: Array.isArray((data as any)?.wines) ? (data as any).wines.map((wine: any) => ({
          name: wine?.name || null,
          producer: wine?.producer || null,
          price: wine?.price ?? null,
          confidence: wine?.confidence ?? null,
        })) : [],
      });
      console.info("[GROUNDED WINES]", {
        requestId,
        wineCount: normalized.wines.length,
        wines: normalized.wines.map((wine) => ({
          name: wine.name,
          producer: wine.producer,
          price: wine.price,
          confidence: wine.confidence,
        })),
      });
      console.info("[WineListScannerDialog] response_normalized", {
        requestId,
        wineCount: normalized.wines.length,
        fallback: Boolean(normalized.fallback),
        topPick: normalized.topPick,
        bestValue: normalized.bestValue,
      });
      setResults(normalized);
      console.info("[WineListScannerDialog] normalized_wines_ready", {
        requestId,
        normalizedWineCount: normalized.wines.length,
        firstWine: normalized.wines[0]?.name || null,
      });
      if (normalized.wines.length > 0) {
        notifySuccess("Análise pronta", {
          description: `${normalized.wines.length} vinho${normalized.wines.length === 1 ? "" : "s"} encontrados.`,
          duration: 2800,
        });
      }
      console.info("[WineListScannerDialog] request_finished", {
        requestId,
        outcome: normalized.fallback ? "fallback" : "success",
        wineCount: normalized.wines.length,
      });
      setStep("results");
    } catch (err: any) {
      const code = String(err?.code || "");
      const status = typeof err?.status === "number" ? err.status : undefined;
      console.error("[WineListScannerDialog] request_failed", {
        requestId,
        error: err?.message,
        code,
        status,
        requestIdFromError: err?.requestId,
        functionName: err?.functionName,
        rawBody: err?.rawBody,
      });
      if (err?.requestId) {
        console.log("[WineListScannerDialog] requestId", err.requestId);
      }
      console.warn("[REMOVED HALLUCINATIONS]", {
        requestId,
        reason: "analysis_failed_no_client_fallback",
      });
      console.info("[WineListScannerDialog] request_finished", {
        requestId,
        outcome: "error",
        code,
        status,
        wineCount: 0,
      });
      setErrorMsg(err?.message || "Não conseguimos extrair vinhos confiáveis desta carta. Tente uma imagem/PDF mais nítido.");
      setStep("error");
    } finally {
      requestBusyRef.current = false;
    }
  }, [wines]);

  const handleFile = useCallback(async (file: File) => {
    if (requestBusyRef.current || prepareBusyRef.current) return;
    prepareBusyRef.current = true;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    console.info("[WineListScannerDialog] upload_received", {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      detectedType: isPdf ? "pdf" : file.type.startsWith("image/") ? "image" : "unsupported",
    });
    if (!isSupportedUploadFile(file)) {
      toast({ title: "Envie uma imagem ou PDF válido", variant: "destructive" });
      prepareBusyRef.current = false;
      return;
    }

    setStep("scanning");
    setErrorMsg("");
    setAttachmentPreview({
      url: null,
      fileName: file.name,
      isPdf,
    });
    try {
      const prepared = await prepareWineListAnalysisTextAttachment(file);
      console.info("[WineListScannerDialog] attachment_prepared", {
        sourceType: prepared.sourceType,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        textLength: prepared.text?.length || 0,
        hasPreview: Boolean(prepared.previewUrl),
      });
      const payload: WineListAnalysisTextInput = {
        text: prepared.text,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      };
      console.info("[WineListScannerDialog] backend_called", {
        function: "analyze-wine-list",
        payloadShape: {
          hasText: Boolean(payload.text),
          mimeType: payload.mimeType,
          fileName: payload.fileName,
        },
        payloadSizeEstimateBytes: payload.text?.length || 0,
      });

      setAttachmentPreview({
        url: prepared.previewUrl,
        fileName: prepared.fileName || file.name,
        isPdf: prepared.sourceType !== "image",
      });
      setLastAttachment(payload);
      await runScan(payload);
    } catch (error) {
      console.error("[WineListScannerDialog] fatal_error", {
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        requestId: (error as any)?.requestId,
      });
      setErrorMsg(getAttachmentErrorMessage(error, "Não conseguimos concluir a leitura desse arquivo."));
      setStep("error");
    } finally {
      prepareBusyRef.current = false;
    }
  }, [runScan, toast]);

  const filteredWines = useMemo(() => {
    const filtered = (results ?? EMPTY_WINE_LIST_ANALYSIS).wines.filter((w) => {
      if (filterMode === "all") return true;
      return detectWineType(w.style) === filterMode;
    });
    console.info("[FILTERED WINES]", {
      filterMode,
      count: filtered.length,
      wines: filtered.map((wine) => wine.name),
    });
    return filtered;
  }, [results, filterMode]);

  const refinedWines = useMemo(() => {
    const mealTokens = mealQuery
      .toLowerCase()
      .split(/[\s,.;/]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2);

    const targetBody = bodyPreference === "all" ? null : bodyPreference;
    const safeResults = results ?? EMPTY_WINE_LIST_ANALYSIS;

    const scoreWine = (wine: WineListItem) => {
      let score = wine.confidence * 100;
      const allText = [
        wine.name,
        wine.producer,
        wine.style,
        wine.grape,
        wine.country,
        wine.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (wine.name === safeResults.topPick) score += 60;
      if (wine.name === safeResults.bestValue) score += 45;
      if (selectedWineName && wine.name === selectedWineName) score += 80;

      if (mealTokens.length > 0) {
        const matched = mealTokens.filter((token) => allText.includes(token));
        score += Math.min(matched.length * 8, 24);
      }

      if (targetBody) {
        const wineType = detectWineType(wine.style);
        if (targetBody === "leve" && (wineType === "branco" || wineType === "rosé" || wineType === "espumante")) score += 12;
        if (targetBody === "encorpado" && wineType === "tinto") score += 12;
      }

      if (priceRange !== "all") {
        const price = wine.price ?? null;
        const inRange =
          price != null &&
          ((priceRange === "up-to-250" && price <= 250) ||
            (priceRange === "250-500" && price > 250 && price <= 500) ||
            (priceRange === "500-plus" && price > 500));
        score += inRange ? 16 : -5;
      }

      if (typeof wine.price === "number" && wine.price > 0) score += 6;
      if (wine.producer) score += 4;
      if (wine.grape) score += 4;
      if (wine.country) score += 3;
      if (wine.region) score += 3;

      return score;
    };

    return [...filteredWines].sort((a, b) => scoreWine(b) - scoreWine(a));
  }, [filteredWines, mealQuery, bodyPreference, priceRange, results, selectedWineName]);

  const displayWines = refinedWines.slice(0, 100);
  console.info("[FINAL UI WINES]", {
    count: displayWines.length,
    wines: displayWines.map((wine) => ({
      name: wine.name,
      tags: normalizeDisplayTags(wine.comparativeLabels),
      confidence: wine.confidence,
    })),
  });
  const isTruncated = refinedWines.length > displayWines.length;

  const availableTypes = [...new Set((results ?? EMPTY_WINE_LIST_ANALYSIS).wines.map((w) => detectWineType(w.style)).filter((t) => t !== "unknown"))];

  const renderResultsContent = () => {
    const safeResults = {
      wines: Array.isArray(results?.wines) ? results.wines : [],
      topPick: typeof results?.topPick === "string" ? results.topPick : null,
      bestValue: typeof results?.bestValue === "string" ? results.bestValue : null,
      fallback: Boolean(results?.fallback),
      fallbackReason: typeof results?.fallbackReason === "string" ? results.fallbackReason : null,
    };
    const resultStatus = safeResults.fallback
      ? {
          icon: <Sparkles className="h-4 w-4 text-amber-700" />,
          title: "Leitura parcial",
          tone: "bg-[rgba(198,167,104,0.10)] text-[#7B6528] ring-[rgba(198,167,104,0.18)]",
          description: safeResults.fallbackReason || "Conseguimos ler parte da carta.",
          warning: "Revise os dados antes de salvar.",
        }
      : {
          icon: <Check className="h-4 w-4 text-success" />,
          title: "Leitura completa",
          tone: "bg-[rgba(95,111,82,0.08)] text-[#2F4A2B] ring-[rgba(95,111,82,0.16)]",
          description: "A carta foi lida com segurança.",
          warning: null,
        };

    try {
      return (
        <motion.div
          key="results"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-4 pt-1"
        >
          {attachmentPreview?.url && (
            <AiModalCard className="p-0 overflow-hidden">
              <div className="aspect-[3/2] w-full overflow-hidden bg-muted/20">
                <img src={attachmentPreview.url} alt="Pré-visualização do arquivo analisado" className="h-full w-full object-cover" />
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

          {/* Filter pills */}
          {availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <AiFilterChip selected={filterMode === "all"} onClick={() => setFilterMode("all")}>
                Todos
              </AiFilterChip>
              {availableTypes.map(type => (
                <AiFilterChip
                  key={type}
                  selected={filterMode === type}
                  onClick={() => setFilterMode(type as FilterMode)}
                >
                  {wineTypeConfig[type].label}
                </AiFilterChip>
              ))}
            </div>
          )}

          <AiModalCard className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <AiSectionLabel>
                Refinar a leitura
              </AiSectionLabel>
              {selectedWineName && (
                <span className="text-[10px] font-semibold text-[#7B1E2B]">
                  Selecionado: {selectedWineName}
                </span>
              )}
            </div>
            <Input
              value={mealQuery}
              onChange={(e) => setMealQuery(e.target.value)}
              placeholder="O que você vai comer?"
              className="rounded-[18px]"
            />
            <div className="space-y-1.5">
              <AiSectionLabel>Corpo</AiSectionLabel>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Todos" },
                  { key: "leve", label: "Leve" },
                  { key: "encorpado", label: "Encorpado" },
                ].map((option) => (
                  <AiFilterChip
                    key={option.key}
                    selected={bodyPreference === option.key}
                    onClick={() => setBodyPreference(option.key as BodyPreference)}
                  >
                    {option.label}
                  </AiFilterChip>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <AiSectionLabel>Preço</AiSectionLabel>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Todos" },
                  { key: "up-to-250", label: "Até R$250" },
                  { key: "250-500", label: "R$250–500" },
                  { key: "500-plus", label: "R$500+" },
                ].map((option) => (
                  <AiFilterChip
                    key={option.key}
                    selected={priceRange === option.key}
                    onClick={() => setPriceRange(option.key as PriceRange)}
                  >
                    {option.label}
                  </AiFilterChip>
                ))}
              </div>
            </div>
          </AiModalCard>

          {safeResults.wines.length === 0 ? (
            <AiModalCard className="text-center space-y-2">
              <p className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">
                {safeResults.fallback ? "Não conseguimos interpretar completamente a carta" : "Nenhum vinho identificado com segurança"}
              </p>
              <p className="text-[13.5px] leading-7 text-[#6B6B6B]">
                {safeResults.fallback
                  ? "Tente novamente ou envie outro arquivo."
                  : "Tente outra foto ou envie um arquivo mais nítido."}
              </p>
              <AiModalActions className="pt-2">
                <AiModalActionButton variant="outline" onClick={reset} className="flex-1">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Tentar novamente
                </AiModalActionButton>
                <AiModalActionButton
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 border border-black/5 bg-[rgba(255,255,255,0.74)] text-[#4F463D] hover:bg-[rgba(255,255,255,0.92)] hover:text-[#1A1713]"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Enviar outro arquivo
                </AiModalActionButton>
              </AiModalActions>
            </AiModalCard>
          ) : (
            <>
              {refinedWines.length === 0 ? (
                <div className="rounded-xl border border-[rgba(198,167,104,0.18)] bg-[rgba(198,167,104,0.08)] p-3 text-[13px] font-medium text-[#6B6258]">
                  Os dados foram importados, mas não puderam ser exibidos. Tente outra foto.
                </div>
              ) : null}

              <div className="max-h-[52vh] overflow-y-auto pr-1 cellar-scroll">
                <ul className="space-y-3">
                  {displayWines.map((wine, i) => (
                    <WineListCard
                      key={`${wine.name}-${i}`}
                      wine={wine}
                      index={i}
                      isTopPick={wine.name === safeResults.topPick}
                      isBestValue={wine.name === safeResults.bestValue}
                      isSelected={selectedWineName === wine.name}
                      onChooseWine={() => setSelectedWineName(wine.name)}
                    />
                  ))}
                </ul>
              </div>

              {isTruncated && (
                <p className="text-[11px] font-medium text-muted-foreground">
                  Mostrando 100 de {refinedWines.length} vinhos
                </p>
              )}
            </>
          )}
        </motion.div>
      );
    } catch (error) {
      console.error("[WineListScannerDialog] results_render_failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        raw: results,
        normalized: results ?? EMPTY_WINE_LIST_ANALYSIS,
      });
      return (
        <div className="rounded-2xl border border-border/30 bg-background/55 px-5 py-5 text-center space-y-2">
          <p className="text-[15px] font-semibold text-foreground">Não conseguimos interpretar completamente a carta</p>
          <p className="text-[13px] text-muted-foreground">Tente novamente ou envie outro arquivo.</p>
            <AiModalActions className="pt-2">
              <AiModalActionButton variant="outline" onClick={reset} className="flex-1">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Tentar novamente
              </AiModalActionButton>
            <AiModalActionButton
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border border-black/5 bg-[rgba(255,255,255,0.74)] text-[#4F463D] hover:bg-[rgba(255,255,255,0.92)] hover:text-[#1A1713]"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Enviar outro arquivo
            </AiModalActionButton>
          </AiModalActions>
        </div>
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg h-[90dvh] max-h-[90dvh] overflow-hidden p-0 border-black/5">
        <AiModalShell>
        <AiModalHeaderBar>
          <AiModalHeader
            icon={<Sparkles className="h-5 w-5" />}
            title="Analisar Carta"
            description="Envie a carta de vinhos e descubra as melhores escolhas para você"
          />
        </AiModalHeaderBar>

        <AiModalBody>
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
                {/* Drag & drop zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.dataset.dragging = "true";
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.dataset.dragging = "false";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.dataset.dragging = "false";
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  className="group relative flex flex-col items-center justify-center gap-3 rounded-[20px] py-9 px-5 cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 data-[dragging=true]:scale-[1.01]"
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
                  <div className="text-center max-w-[300px]">
                    <p
                      className="text-[16px] font-semibold tracking-[-0.01em] text-[#1A1713]"
                      style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                    >
                      Fotografe ou envie a carta
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[rgba(58,51,39,0.6)]">
                      Arraste uma imagem ou PDF aqui, ou escolha uma das opções abaixo. A inteligência Sommelyx avalia cada rótulo para você.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <AiModalActionButton
                    variant="primary"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Tirar foto
                  </AiModalActionButton>
                  <AiModalActionButton
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Escolher imagem ou PDF
                  </AiModalActionButton>
                </div>

                <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </AiModalCard>
            </motion.div>
          )}

          {step === "scanning" && (
          <PairingLoadingState
            steps={[
              "Lendo imagem…",
              "Interpretando carta…",
              "Gerando análise…",
            ]}
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
        </AiModalBody>
        </AiModalShell>
      </SheetContent>
    </Sheet>
  );
}

function WineListCard({ wine, index, isTopPick, isBestValue, isSelected, onChooseWine }: {
  wine: WineListItem;
  index: number;
  isTopPick: boolean;
  isBestValue: boolean;
  isSelected: boolean;
  onChooseWine: () => void;
}) {
  const tags = normalizeDisplayTags([
    ...(wine.comparativeLabels || []),
    isTopPick || wine.highlight === "top-pick" ? "Melhor escolha" : "",
    isBestValue || wine.highlight === "best-value" ? "Melhor custo-benefício" : "",
  ]).slice(0, 4);
  const originLine = [wine.producer, wine.region, wine.country].filter((value): value is string => Boolean(value && value.trim())).join(" · ");
  const summarySource = wine.description || wine.verdict || wine.reasoning || null;
  const summaryText = summarySource ? compactText(summarySource, 138) : null;
  const whyText = compactText(wine.reasoning || wine.verdict || wine.description || "", 180);
  const profileLine = buildProfileLine(wine);
  const confidenceLabel = wine.confidence >= 0.82 ? "Alta" : wine.confidence >= 0.58 ? "Média" : "Baixa";

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={cn(
        "list-none overflow-hidden rounded-[24px] transition-all duration-250 hover:-translate-y-0.5 active:scale-[0.99]",
        isSelected && "ring-1 ring-primary/25"
      )}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(248,244,237,0.72) 100%)",
        backdropFilter: "blur(14px) saturate(1.08)",
        WebkitBackdropFilter: "blur(14px) saturate(1.08)",
        border: isSelected ? `1px solid rgba(123,30,43,0.16)` : "1px solid rgba(95,111,82,0.12)",
        boxShadow: isSelected
          ? "0 14px 30px -18px rgba(123,30,43,0.18), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.72)"
          : "0 10px 24px -18px rgba(30,20,20,0.10), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.72)",
      }}
    >
      <button type="button" onClick={onChooseWine} className="w-full p-3.5 text-left sm:p-4">
        <div className="space-y-2.5">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[rgba(123,30,43,0.12)] bg-[rgba(123,30,43,0.055)] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#7B1E2B]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="text-[18px] font-semibold tracking-[-0.03em] leading-tight text-[#1A1713] sm:text-[20px]">
                {wine.name}
              </h4>
              {originLine ? (
                <p className="text-[12.5px] font-medium leading-6 text-[#6B6258]">
                  {originLine}
                </p>
              ) : null}
              {summaryText ? (
                <p className="text-[13.5px] leading-7 text-[#3F362F]">
                  {summaryText}
                </p>
              ) : null}
            </div>

            {wine.price != null && (
              <span className="shrink-0 rounded-full bg-white/65 px-2.5 py-1 text-[14px] font-semibold tracking-tight text-[#1A1713] ring-1 ring-black/5">
                R$ {wine.price.toFixed(0)}
              </span>
            )}
          </div>

          {whyText ? (
            <div className="rounded-[18px] border border-[rgba(198,167,104,0.16)] bg-[rgba(198,167,104,0.07)] px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B6528]">
                Por que escolher
              </p>
              <p className="mt-1.5 text-[13px] leading-6 text-[#3F362F]">
                {whyText}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.04] pt-2">
            {profileLine ? (
              <p className="text-[11.5px] leading-5 text-[#5B5146]">
                {profileLine}
              </p>
            ) : <span />}
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]">
              Confiança {confidenceLabel}
            </span>
          </div>
        </div>
      </button>
    </motion.li>
  );
}

function compactText(value: string, maxLength: number) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildProfileLine(wine: WineListItem) {
  const parts = [
    wine.acidity ? `Acidez ${wine.acidity}` : null,
    wine.body ? `Corpo ${wine.body}` : null,
    wine.tannin ? `Taninos ${wine.tannin}` : null,
  ].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(" • ") : null;
}
