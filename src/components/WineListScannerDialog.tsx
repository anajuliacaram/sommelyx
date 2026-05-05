import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, RotateCcw, X } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { analyzeWineList, buildUserProfile, normalizeWineListResponse, type WineListAnalysis, type WineListItem, type WineListAnalysisTextInput } from "@/lib/sommelier-ai";
import { getAttachmentErrorMessage, prepareWineListAnalysisTextAttachment } from "@/lib/ai-attachments";
import { useWines } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { notifySuccess } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import {
  PairingSheetHero,
  PairingLoadingState,
  PairingErrorState,
  SectionHeader,
  FallbackAnalysisBadge,
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
    try {
      const cellarWines = wines?.filter((w) => w.quantity > 0) || [];
      const profile = cellarWines.length >= 3 ? buildUserProfile(cellarWines) : undefined;
      console.info("[WineListScannerDialog] extraction_started", {
        hasText: Boolean(attachment.text),
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
        textLength: attachment.text?.length || 0,
      });
      const data = await analyzeWineList(attachment, profile);
      const normalized = normalizeWineListResponse(data);
      console.info("[WineListScannerDialog] extraction_completed", {
        winesExtracted: normalized.wines.length,
        topPick: normalized.topPick,
        bestValue: normalized.bestValue,
      });
      setResults(normalized);
      console.info("[WineListScannerDialog] normalized_wines_ready", {
        normalizedWineCount: normalized.wines.length,
        firstWine: normalized.wines[0]?.name || null,
      });
      if (normalized.wines.length > 0) {
        notifySuccess(normalized.fallback ? "Análise rápida" : "Carta analisada", {
          description: `${normalized.wines.length} vinho${normalized.wines.length === 1 ? "" : "s"} encontrados.`,
          duration: 2800,
        });
      }
      setStep("results");
    } catch (err: any) {
      console.error("[WineListScannerDialog] fatal_error", {
        error: err?.message,
        code: err?.code,
        status: err?.status,
        requestId: err?.requestId,
        functionName: err?.functionName,
        rawBody: err?.rawBody,
      });
      if (err?.requestId) {
        console.log("[WineListScannerDialog] requestId", err.requestId);
      }
      if (err?.code === "EMPTY_EXTRACTION") {
        setErrorMsg("PDF não contém texto legível. Tente outro arquivo ou uma imagem da carta.");
      } else {
        setErrorMsg(err.message || "Não conseguimos concluir a leitura da carta.");
      }
      setStep("error");
    } finally {
      requestBusyRef.current = false;
    }
  }, [wines]);

  const handleFile = useCallback(async (file: File) => {
    if (requestBusyRef.current) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    console.info("[WineListScannerDialog] upload_received", {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      detectedType: isPdf ? "pdf" : file.type.startsWith("image/") ? "image" : "unsupported",
    });
    if (!isSupportedUploadFile(file)) {
      toast({ title: "Envie uma imagem ou PDF válido", variant: "destructive" });
      return;
    }

    setStep("scanning");
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
    }
  }, [runScan, toast]);

  const normalizedResults = useMemo<WineListAnalysis>(() => {
    const empty: WineListAnalysis = {
      wines: [],
      topPick: null,
      bestValue: null,
      fallback: true,
      fallbackReason: null,
    };

    try {
      const normalized = normalizeWineListResponse(results);
      if (import.meta.env.DEV) {
        console.info("[WineListScannerDialog] results_normalized", { raw: results, normalized });
      }
      return normalized;
    } catch (error) {
      console.error("[WineListScannerDialog] results_normalization_failed", {
        raw: results,
        normalized: empty,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return empty;
    }
  }, [results]);

  const filteredWines = useMemo(() => {
    return normalizedResults.wines.filter((w) => {
      if (filterMode === "all") return true;
      return detectWineType(w.style) === filterMode;
    });
  }, [normalizedResults, filterMode]);

  const refinedWines = useMemo(() => {
    const mealTokens = mealQuery
      .toLowerCase()
      .split(/[\s,.;/]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2);

    const targetBody = bodyPreference === "all" ? null : bodyPreference;

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

      if (wine.name === normalizedResults.topPick) score += 60;
      if (wine.name === normalizedResults.bestValue) score += 45;
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
  }, [filteredWines, mealQuery, bodyPreference, priceRange, normalizedResults.bestValue, normalizedResults.topPick, selectedWineName]);

  const displayWines = refinedWines.slice(0, 100);
  const isTruncated = refinedWines.length > displayWines.length;

  const availableTypes = [...new Set(normalizedResults.wines.map((w) => detectWineType(w.style)).filter((t) => t !== "unknown"))];

  const renderResultsContent = () => {
    const safeResults = {
      wines: Array.isArray(normalizedResults.wines) ? normalizedResults.wines : [],
      topPick: typeof normalizedResults.topPick === "string" ? normalizedResults.topPick : null,
      bestValue: typeof normalizedResults.bestValue === "string" ? normalizedResults.bestValue : null,
      fallback: Boolean(normalizedResults.fallback),
    };

    try {
      return (
        <motion.div
          key="results"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-2 pt-1"
        >
          <div className="rounded-2xl border border-border/30 bg-background/55 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader icon="wine" label={`${filteredWines.length} vinhos encontrados${filterMode !== "all" ? ` (${filterMode})` : ""}`} />
              <Button variant="ghost" size="sm" onClick={reset} className="px-2 font-medium text-[10px]">
                <RotateCcw className="h-3 w-3 mr-1" /> Nova análise
              </Button>
            </div>

            {safeResults.fallback && (
              <div className="mt-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <FallbackAnalysisBadge />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Esta é uma análise rápida com base nos dados disponíveis.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Filter pills */}
          {availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterMode("all")}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
                style={{
                  background: filterMode === "all" ? "rgba(110,30,42,0.12)" : "rgba(0,0,0,0.04)",
                  color: filterMode === "all" ? "#5a1528" : "#888",
                  border: `1px solid ${filterMode === "all" ? "rgba(110,30,42,0.2)" : "rgba(0,0,0,0.06)"}`,
                }}
              >
                Todos
              </button>
              {availableTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setFilterMode(type as FilterMode)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: filterMode === type ? wineTypeConfig[type].badgeBg : "rgba(0,0,0,0.04)",
                    color: filterMode === type ? wineTypeConfig[type].badgeText : "#888",
                    border: `1px solid ${filterMode === type ? wineTypeConfig[type].badgeBorder : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  {wineTypeConfig[type].label}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-border/30 bg-background/50 px-3.5 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Refinar a leitura
              </p>
              {selectedWineName && (
                <span className="text-[10px] font-semibold text-primary/80">
                  Selecionado: {selectedWineName}
                </span>
              )}
            </div>
            <Input
              value={mealQuery}
              onChange={(e) => setMealQuery(e.target.value)}
              placeholder="O que você vai comer?"
              className="rounded-xl"
            />
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">Corpo</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: "Todos" },
                  { key: "leve", label: "Leve" },
                  { key: "encorpado", label: "Encorpado" },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setBodyPreference(option.key as BodyPreference)}
                    className="h-8 rounded-full px-3 text-[10px] font-semibold transition-all"
                    style={{
                      background: bodyPreference === option.key ? "rgba(110,30,42,0.10)" : "rgba(0,0,0,0.035)",
                      color: bodyPreference === option.key ? "#5a1528" : "#777",
                      border: `1px solid ${bodyPreference === option.key ? "rgba(110,30,42,0.14)" : "rgba(0,0,0,0.05)"}`,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">Preço</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "all", label: "Todos" },
                  { key: "up-to-250", label: "Até R$250" },
                  { key: "250-500", label: "R$250–500" },
                  { key: "500-plus", label: "R$500+" },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setPriceRange(option.key as PriceRange)}
                    className="h-8 rounded-full px-3 text-[10px] font-semibold transition-all"
                    style={{
                      background: priceRange === option.key ? "rgba(198,167,104,0.14)" : "rgba(0,0,0,0.035)",
                      color: priceRange === option.key ? "#7B6528" : "#777",
                      border: `1px solid ${priceRange === option.key ? "rgba(198,167,104,0.18)" : "rgba(0,0,0,0.05)"}`,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {safeResults.wines.length === 0 ? (
            <div className="rounded-2xl border border-border/30 bg-background/55 px-4 py-4 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                {safeResults.fallback ? "Não conseguimos interpretar completamente a carta" : "Nenhum vinho identificado com segurança"}
              </p>
              <p className="text-xs text-muted-foreground">
                {safeResults.fallback
                  ? "Tente novamente ou envie outro arquivo."
                  : "Tente outra foto ou envie um arquivo mais nítido."}
              </p>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button variant="outline" onClick={reset} className="flex-1">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Tentar novamente
                </Button>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Enviar outro arquivo
                </Button>
              </div>
            </div>
          ) : (
            <>
              {refinedWines.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] font-medium text-amber-800">
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
                      isTopPick={wine.name === normalizedResults.topPick}
                      isBestValue={wine.name === normalizedResults.bestValue}
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
        normalized: normalizedResults,
      });
      return (
        <div className="rounded-2xl border border-border/30 bg-background/55 px-4 py-4 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Não conseguimos interpretar completamente a carta</p>
          <p className="text-xs text-muted-foreground">Tente novamente ou envie outro arquivo.</p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button variant="outline" onClick={reset} className="flex-1">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Tentar novamente
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Enviar outro arquivo
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-border/50">
        <SheetHeader className="sr-only">
          <SheetTitle>Analisar Carta de Vinhos</SheetTitle>
        </SheetHeader>

        <PairingSheetHero
          icon="sparkles"
          title="Analisar Carta"
          subtitle="Envie a carta de vinhos e descubra as melhores escolhas para você"
          compact
        />

        <AnimatePresence mode="wait">
          {step === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
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
                <Button
                  variant="primary"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full h-14 text-[15px]"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar foto
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 text-[14px]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Escolher imagem ou PDF
                </Button>
              </div>

              <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
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
              onClose={() => handleClose(false)}
            />
          )}
        </AnimatePresence>
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
  const wineType = detectWineType(wine.style);
  const config = wineTypeConfig[wineType];
  const confidenceLabel =
    wine.confidence >= 0.82 ? "Alta confiança" :
    wine.confidence >= 0.58 ? "Confiança média" :
    "Dados limitados";

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={cn(
        "list-none rounded-2xl overflow-hidden transition-all duration-250 hover:-translate-y-0.5 active:scale-[0.99]",
        isSelected && "ring-1 ring-primary/25"
      )}
      style={{
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px) saturate(1.3)",
        WebkitBackdropFilter: "blur(12px) saturate(1.3)",
        border: isSelected ? `1px solid ${config.badgeBorder}` : "1px solid rgba(255,255,255,0.5)",
        boxShadow: isSelected
          ? `0 10px 26px -10px ${config.badgeText}22, 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)`
          : "0 6px 24px -6px rgba(30,20,20,0.08), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      <button type="button" onClick={onChooseWine} className="w-full p-4 text-left sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isTopPick && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    color: "#0e7a5a",
                    border: "1px solid rgba(16,185,129,0.16)",
                  }}
                >
                  Melhor escolha
                </span>
              )}
              {isBestValue && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    color: "#b45309",
                    border: "1px solid rgba(245,158,11,0.16)",
                  }}
                >
                  Melhor custo-benefício
                </span>
              )}
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  color: "#6B5E55",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                {confidenceLabel}
              </span>
            </div>
            <h4 className="line-clamp-2 text-[15px] font-bold tracking-[-0.01em] leading-snug" style={{ color: "#1A1A1A" }}>
              {wine.name}
            </h4>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {wine.producer && <span>{wine.producer}</span>}
              {wine.region && <span>• {wine.region}</span>}
              {wine.country && <span>• {wine.country}</span>}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {wine.price != null && (
              <span className="text-[16px] font-bold tracking-tight" style={{ color: "#1A1A1A" }}>
                R$ {wine.price.toFixed(0)}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">{Math.round(wine.confidence * 100)}% de confiança</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.label && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{
                background: config.badgeBg,
                color: config.badgeText,
                border: `1px solid ${config.badgeBorder}`,
              }}
            >
              {config.label}
            </span>
          )}
          {wine.grape && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{
                background: config.chipBg,
                color: config.chipText,
                border: `1px solid ${config.chipBorder}`,
              }}
            >
              {wine.grape}
            </span>
          )}
        </div>

        <div className="grid gap-1.5 text-[12px] text-muted-foreground sm:grid-cols-2">
          <p><span className="font-semibold text-[#2A1F1A]">Produtor:</span> {wine.producer || "Não identificado"}</p>
          <p><span className="font-semibold text-[#2A1F1A]">Origem:</span> {[wine.region, wine.country].filter(Boolean).join(", ") || "Não identificada"}</p>
        </div>
      </button>
    </motion.li>
  );
}
