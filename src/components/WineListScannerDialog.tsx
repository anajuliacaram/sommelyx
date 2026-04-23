import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Star, Award, TrendingUp, Sparkles, RotateCcw, X, UtensilsCrossed, ChevronDown, ChevronUp, Zap, Feather, Dumbbell, Brain, Smile, Heart } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { analyzeWineList, buildUserProfile, type WineListAnalysis, type WineListItem } from "@/lib/sommelier-ai";
import { prepareAiAnalysisAttachment, type AiAnalysisAttachmentPayload } from "@/lib/ai-attachments";
import { useWines } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CompatibilityBadge,
  PairingSheetHero,
  PairingLoadingState,
  PairingErrorState,
  SectionHeader,
} from "@/components/pairing/shared";

interface WineListScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScanStep = "capture" | "scanning" | "results" | "error";

const highlightIcon: Record<string, typeof Award> = {
  "best-value": TrendingUp,
  "top-pick": Award,
  adventurous: Sparkles,
  lightest: Feather,
  boldest: Dumbbell,
  "most-complex": Brain,
  easiest: Smile,
};

const highlightLabel: Record<string, string> = {
  "best-value": "Melhor custo-benefício",
  "top-pick": "Melhor escolha",
  adventurous: "Para experimentar",
  lightest: "Mais leve da carta",
  boldest: "Mais encorpado",
  "most-complex": "Mais complexo",
  easiest: "Mais fácil de beber",
};

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

function StarRating({ rating, wineType = "unknown" }: { rating: number; wineType?: WineType }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  const config = wineTypeConfig[wineType];
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          style={{
            color: i < full ? config.starColor : i === full && hasHalf ? config.starColor : "#D4D0CA",
            fill: i < full ? config.starFill : i === full && hasHalf ? `${config.starFill}80` : "transparent",
          }}
        />
      ))}
      <span className="text-[11px] font-bold ml-1.5" style={{ color: "#2B2B2B" }}>{rating.toFixed(1)}</span>
    </div>
  );
}

type FilterMode = "all" | "tinto" | "branco" | "rosé" | "espumante";
type BodyPreference = "all" | "leve" | "encorpado";
type PriceRange = "all" | "up-to-250" | "250-500" | "500-plus";

function getBodyRank(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("leve")) return 0;
  if (normalized.includes("encorp")) return 2;
  if (normalized.includes("médio") || normalized.includes("medio") || normalized.includes("medium")) return 1;
  return null;
}

function getTanninRank(value?: string | null) {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("suave") || normalized.includes("sedos") || normalized.includes("baixo")) return 0;
  if (normalized.includes("firme") || normalized.includes("estrutur") || normalized.includes("robust") || normalized.includes("alto")) return 2;
  if (normalized.includes("médio") || normalized.includes("medio") || normalized.includes("moderad")) return 1;
  return null;
}

export function WineListScannerDialog({ open, onOpenChange }: WineListScannerDialogProps) {
  const { data: wines } = useWines();
  const { toast } = useToast();
  const [step, setStep] = useState<ScanStep>("capture");
  const [attachmentPreview, setAttachmentPreview] = useState<{ url?: string | null; fileName: string; isPdf: boolean } | null>(null);
  const [results, setResults] = useState<WineListAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastAttachment, setLastAttachment] = useState<AiAnalysisAttachmentPayload | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [mealQuery, setMealQuery] = useState("");
  const [bodyPreference, setBodyPreference] = useState<BodyPreference>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [selectedWineName, setSelectedWineName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const runScan = useCallback(async (attachment: AiAnalysisAttachmentPayload) => {
    setStep("scanning");
    setErrorMsg("");
    try {
      const cellarWines = wines?.filter((w) => w.quantity > 0) || [];
      const profile = cellarWines.length >= 3 ? buildUserProfile(cellarWines) : undefined;
      console.info("[WineListScannerDialog] extraction_started", {
        hasImageBase64: Boolean(attachment.imageBase64),
        hasExtractedText: Boolean(attachment.extractedText),
        mimeType: attachment.mimeType,
        fileName: attachment.fileName,
        extractedTextLength: attachment.extractedText?.length || 0,
        imageBase64Length: attachment.imageBase64?.length || 0,
      });
      const data = await analyzeWineList(attachment, profile);
      console.info("[WineListScannerDialog] extraction_completed", {
        winesExtracted: data.wines?.length || 0,
        topPick: data.topPick,
        bestValue: data.bestValue,
      });
      if (!data.wines?.length) {
        const emptyErr: any = new Error("Não conseguimos identificar vinhos válidos nesse arquivo.");
        emptyErr.code = "EMPTY_EXTRACTION";
        throw emptyErr;
      }
      setResults(data);
      console.info("[WineListScannerDialog] normalized_wines_ready", {
        normalizedWineCount: data.wines.length,
        firstWine: data.wines[0]?.name,
      });
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
        setErrorMsg("Não conseguimos identificar vinhos válidos nesse arquivo. Tente outra foto ou um PDF mais legível.");
      } else {
        setErrorMsg(err.message || "Não foi possível analisar a carta");
      }
      setStep("error");
    }
  }, [wines]);

  const handleFile = useCallback(async (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    console.info("[WineListScannerDialog] upload_received", {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      detectedType: isPdf ? "pdf" : file.type.startsWith("image/") ? "image" : "unsupported",
    });
    if (!file.type.startsWith("image/") && !isPdf) {
      toast({ title: "Envie uma imagem ou PDF válido", variant: "destructive" });
      return;
    }

    setStep("scanning");
    try {
      const prepared = await prepareAiAnalysisAttachment(file);
      console.info("[WineListScannerDialog] attachment_prepared", {
        sourceType: prepared.sourceType,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        extractedTextLength: prepared.extractedText?.length || 0,
        imageBase64Length: prepared.imageBase64?.length || 0,
        hasPreview: Boolean(prepared.previewUrl),
      });
      const payload: AiAnalysisAttachmentPayload = {
        imageBase64: prepared.imageBase64,
        extractedText: prepared.extractedText,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      };
      console.info("[WineListScannerDialog] backend_called", {
        function: "analyze-wine-list",
        payloadShape: {
          hasImageBase64: Boolean(payload.imageBase64),
          hasExtractedText: Boolean(payload.extractedText),
          mimeType: payload.mimeType,
          fileName: payload.fileName,
        },
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
      setErrorMsg(error instanceof Error ? error.message : "Não conseguimos ler esse anexo.");
      setStep("error");
    }
  }, [runScan, toast]);



  const filteredWines = useMemo(() => {
    if (!results) return [];
    return results.wines.filter((w) => {
      if (filterMode === "all") return true;
      return detectWineType(w.style) === filterMode;
    });
  }, [results, filterMode]);

  const refinedWines = useMemo(() => {
    const mealTokens = mealQuery
      .toLowerCase()
      .split(/[\s,.;/]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2);

    const targetBody = bodyPreference === "all" ? null : bodyPreference;

    const scoreWine = (wine: WineListItem) => {
      let score = (wine.rating || 0) * 12;
      const allText = [
        wine.name,
        wine.producer,
        wine.style,
        wine.grape,
        wine.region,
        wine.description,
        wine.reasoning,
        wine.verdict,
        ...(wine.comparativeLabels || []),
        ...(wine.pairings || []).flatMap((p) => [p.dish, p.why]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (wine.name === results?.topPick) score += 60;
      if (wine.name === results?.bestValue) score += 45;
      if (selectedWineName && wine.name === selectedWineName) score += 80;

      if ((wine.comparativeLabels || []).some((label) => label.includes("melhor escolha"))) score += 18;
      if ((wine.comparativeLabels || []).some((label) => label.includes("melhor custo-benefício"))) score += 16;
      if ((wine.comparativeLabels || []).some((label) => label.includes("mais leve"))) score += bodyPreference === "leve" ? 12 : 5;
      if ((wine.comparativeLabels || []).some((label) => label.includes("mais encorpado"))) score += bodyPreference === "encorpado" ? 12 : 5;
      if ((wine.comparativeLabels || []).some((label) => label.includes("mais complexo"))) score += 8;
      if ((wine.comparativeLabels || []).some((label) => label.includes("mais fácil de beber"))) score += 8;

      if (mealTokens.length > 0) {
        const matched = mealTokens.filter((token) => allText.includes(token));
        score += Math.min(matched.length * 8, 24);
      }

      if (targetBody) {
        const body = (wine.body || "").toLowerCase();
        if (targetBody === "leve" && body.includes("leve")) score += 18;
        if (targetBody === "encorpado" && body.includes("encorp")) score += 18;
        if (targetBody === "leve" && body.includes("encorp")) score -= 6;
        if (targetBody === "encorpado" && body.includes("leve")) score -= 6;
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

      if (wine.compatibilityLabel === "Excelente escolha") score += 10;
      if (wine.compatibilityLabel === "Alta compatibilidade") score += 8;

      if (getBodyRank(wine.body) === 0) score += bodyPreference === "leve" ? 6 : 2;
      if (getBodyRank(wine.body) === 2) score += bodyPreference === "encorpado" ? 6 : 2;
      if (getTanninRank(wine.tannin) === 0) score += 3;

      return score;
    };

    return [...filteredWines].sort((a, b) => scoreWine(b) - scoreWine(a));
  }, [filteredWines, mealQuery, bodyPreference, priceRange, results?.bestValue, results?.topPick, selectedWineName]);

  const displayWines = refinedWines.slice(0, 100);
  const isTruncated = refinedWines.length > displayWines.length;

  const availableTypes = results ? [...new Set(results.wines.map(w => detectWineType(w.style)).filter(t => t !== "unknown"))] : [];

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

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </motion.div>
          )}

          {step === "scanning" && (
            <PairingLoadingState
              steps={[
                "Processando imagem…",
                "Identificando vinhos na carta…",
                "Analisando estrutura de cada vinho…",
                "Comparando opções da carta…",
                "Montando recomendações…",
              ]}
            />
          )}

          {step === "results" && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-2.5 pt-1.5"
            >
              <div className="flex items-center justify-between">
                <SectionHeader icon="wine" label={`${filteredWines.length} vinho${filteredWines.length !== 1 ? "s" : ""}${filterMode !== "all" ? ` (${filterMode})` : ""}`} />
                <Button variant="ghost" size="sm" onClick={reset} className="px-2 font-medium text-[10px]">
                  <RotateCcw className="h-3 w-3 mr-1" /> Nova análise
                </Button>
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

              <div className="rounded-2xl border border-border/30 bg-background/50 px-3.5 py-3 space-y-2.5">
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
                        className="h-9 rounded-full px-3 text-[10px] font-semibold transition-all"
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
                        className="h-9 rounded-full px-3 text-[10px] font-semibold transition-all"
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

              {results && results.wines.length > 0 && refinedWines.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] font-medium text-amber-800">
                  Os dados foram importados, mas não puderam ser exibidos. Atualize a página.
                </div>
              ) : null}

              <div className="max-h-[400px] overflow-y-auto pr-1 cellar-scroll">
                <ul className="space-y-3">
                  {displayWines.map((wine, i) => (
                  <WineListCard
                    key={`${wine.name}-${i}`}
                    wine={wine}
                    index={i}
                    isTopPick={wine.name === results.topPick}
                    isBestValue={wine.name === results.bestValue}
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
            </motion.div>
          )}

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
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const HighlightIcon = wine.highlight ? highlightIcon[wine.highlight] || Sparkles : null;
  const wineType = detectWineType(wine.style);
  const config = wineTypeConfig[wineType];
  const compatStyle = wine.compatibilityLabel ? { color: "#047857", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.18)" } : null;

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
      <div className="p-4 sm:p-5 space-y-3">
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
            </div>
            <div className="flex items-start justify-between gap-3">
              <h4 className="line-clamp-2 text-[15px] font-bold tracking-[-0.01em] leading-snug" style={{ color: "#1A1A1A" }}>
                {wine.name}
              </h4>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {wine.highlight && HighlightIcon && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em]"
                  style={{
                    background: config.badgeBg,
                    color: config.badgeText,
                    border: `1px solid ${config.badgeBorder}`,
                  }}
                >
                  <HighlightIcon className="h-2.5 w-2.5" />
                  {highlightLabel[wine.highlight] || wine.highlight}
                </span>
              )}
              {wine.comparativeLabels?.map((label, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    color: "#666",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {label}
                </span>
              ))}
              {wine.compatibilityLabel && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={{
                    background: compatStyle?.bg ?? "rgba(0,0,0,0.04)",
                    color: compatStyle?.color ?? "#666",
                    border: `1px solid ${compatStyle?.border ?? "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  {wine.compatibilityLabel}
                </span>
              )}
            </div>

            {wine.reasoning && (
              <p className="line-clamp-3 text-[12px] leading-relaxed text-foreground/65">
                {wine.reasoning}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {wine.price != null && (
              <span className="text-[16px] font-bold tracking-tight" style={{ color: "#1A1A1A" }}>
                R$ {wine.price.toFixed(0)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap" style={{ color: "#666" }}>
          {wine.producer && <span className="text-[11px] font-medium">{wine.producer}</span>}
          {wine.vintage && <span className="text-[11px] font-medium">· {wine.vintage}</span>}
          {wine.grape && (
            <span className="text-[11px] font-medium flex items-center gap-0.5">
              · {wine.grape}
            </span>
          )}
        </div>

        {wine.region && (
          <div className="flex items-center gap-1" style={{ color: "#777" }}>
            <span className="text-[11px] font-medium">{wine.region}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <StarRating rating={wine.rating} wineType={wineType} />
            {config.label && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{
                  background: config.badgeBg,
                  color: config.badgeText,
                  border: `1px solid ${config.badgeBorder}`,
                }}
              >
                {config.label}
              </span>
            )}
          </div>
          <span
            className="h-6 whitespace-nowrap rounded-full px-2.5 text-[10px] font-bold"
            style={{
              background: "rgba(16,185,129,0.08)",
              color: "#047857",
              border: "1px solid rgba(16,185,129,0.18)",
            }}
          >
            {wine.compatibilityLabel}
          </span>
        </div>

        {detailsOpen && (
          <div className="space-y-3">
            {(wine.body || wine.acidity || wine.tannin) && (
              <div className="flex items-center gap-2 flex-wrap">
                {wine.body && (
                  <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[#555]">
                    Corpo: {wine.body}
                  </span>
                )}
                {wine.acidity && (
                  <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[#555]">
                    Acidez: {wine.acidity}
                  </span>
                )}
                {wine.tannin && (
                  <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[#555]">
                    Tanino: {wine.tannin}
                  </span>
                )}
              </div>
            )}

            {wine.occasion && (
              <div className="flex items-center gap-1.5" style={{ color: "#666" }}>
                <Heart className="h-3 w-3" />
                <span className="text-[11px] font-medium italic">{wine.occasion}</span>
              </div>
            )}

            {wine.description && (
              <p className="text-[13px] leading-relaxed" style={{ color: "#2B2B2B" }}>
                {wine.description}
              </p>
            )}

            <p className="text-[12px] leading-relaxed italic" style={{ color: "#777" }}>
              "{wine.verdict}"
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="primary"
            className="h-8 justify-center rounded-xl px-3 text-[11px] font-semibold"
            onClick={onChooseWine}
          >
            Escolher este vinho
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 justify-center rounded-xl border border-border/50 bg-background/55 px-2.5 text-[10px] font-semibold"
            onClick={() => setDetailsOpen((current) => !current)}
          >
            {detailsOpen ? "Ocultar detalhes" : "Ver mais detalhes"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 justify-center rounded-xl border border-border/50 bg-background/55 px-2.5 text-[10px] font-semibold"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Ocultar harmonização" : "Harmonizar com prato"}
          </Button>
        </div>

        {wine.pairings && wine.pairings.length > 0 && (
          <div className="mt-2 rounded-2xl border border-[rgba(0,0,0,0.04)] bg-black/[0.015] p-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center gap-1.5 group"
            >
              <UtensilsCrossed className="h-3 w-3" style={{ color: config.badgeText }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "#888" }}>
                Harmoniza com ({wine.pairings.length})
              </span>
              <span className="ml-auto">
                {expanded ? <ChevronUp className="h-3 w-3" style={{ color: "#aaa" }} /> : <ChevronDown className="h-3 w-3" style={{ color: "#aaa" }} />}
              </span>
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 space-y-1.5 overflow-hidden"
                >
                  {wine.pairings.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-3 py-2"
                      style={{
                        background: config.chipBg,
                        border: `1px solid ${config.chipBorder}`,
                      }}
                    >
                      <span className="block text-[12px] font-semibold" style={{ color: config.chipText }}>
                        {p.dish}
                      </span>
                      {p.why && (
                        <span className="mt-0.5 block text-[10px] leading-snug" style={{ color: "#777" }}>
                          {p.why}
                        </span>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {!expanded && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {wine.pairings.slice(0, 3).map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{
                      background: config.chipBg,
                      border: `1px solid ${config.chipBorder}`,
                      color: config.chipText,
                    }}
                  >
                    {p.dish}
                  </span>
                ))}
                {wine.pairings.length > 3 && (
                  <span className="px-2 py-1 text-[10px] font-medium text-muted-foreground">
                    +{wine.pairings.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}
