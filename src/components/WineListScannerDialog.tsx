import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Star, Award, TrendingUp, Sparkles, RotateCcw, X, UtensilsCrossed, Grape, MapPin, FileText, Wine as WineIcon } from "@/icons/lucide";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { analyzeWineList, buildUserProfile, type WineListAnalysis, type WineListItem } from "@/lib/sommelier-ai";
import { prepareAiAnalysisAttachment, type AiAnalysisAttachmentPayload } from "@/lib/ai-attachments";
import { useWines } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WineListScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScanStep = "capture" | "scanning" | "results" | "error";

const highlightIcon: Record<string, typeof Award> = {
  "best-value": TrendingUp,
  "top-pick": Award,
  adventurous: Sparkles,
};

const highlightLabel: Record<string, string> = {
  "best-value": "Melhor custo-benefício",
  "top-pick": "Melhor escolha",
  adventurous: "Para experimentar",
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

export function WineListScannerDialog({ open, onOpenChange }: WineListScannerDialogProps) {
  const { data: wines } = useWines();
  const { toast } = useToast();
  const [step, setStep] = useState<ScanStep>("capture");
  const [attachmentPreview, setAttachmentPreview] = useState<{ url?: string | null; fileName: string; isPdf: boolean } | null>(null);
  const [results, setResults] = useState<WineListAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastAttachment, setLastAttachment] = useState<AiAnalysisAttachmentPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("capture");
    setAttachmentPreview(null);
    setResults(null);
    setErrorMsg("");
    setLastAttachment(null);
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
      const data = await analyzeWineList(attachment, profile);
      if (!data.wines?.length) throw new Error("Nenhum vinho identificado na imagem");
      setResults(data);
      setStep("results");
    } catch (err: any) {
      setErrorMsg(err.message || "Não foi possível analisar a carta");
      setStep("error");
    }
  }, [wines]);

  const handleFile = useCallback(async (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!file.type.startsWith("image/") && !isPdf) {
      toast({ title: "Envie uma imagem ou PDF válido", variant: "destructive" });
      return;
    }

    setStep("scanning");
    try {
      const prepared = await prepareAiAnalysisAttachment(file);
      const payload: AiAnalysisAttachmentPayload = {
        imageBase64: prepared.imageBase64,
        extractedText: prepared.extractedText,
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
      setErrorMsg(error instanceof Error ? error.message : "Não conseguimos ler esse anexo.");
      setStep("error");
    }
  }, [runScan, toast]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-border/50" style={{ background: "#F4F1EC" }}>
        <SheetHeader>
          <SheetTitle className="font-serif text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary/70" />
            Analisar Carta de Vinhos
          </SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {step === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 pt-10"
            >
              <div className="w-16 h-16 rounded-2xl gradient-wine flex items-center justify-center shadow-[0_8px_24px_hsl(var(--wine)/0.2)]">
                <Camera className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground mb-1">Fotografe a carta</h3>
                  <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                    Envie uma foto ou PDF da carta de vinhos. Nossa inteligência avalia os rótulos e aponta as melhores escolhas para você.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full mt-2">
                <Button
                  variant="primary"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-11 text-[13px] font-semibold"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar Foto
                </Button>
                  <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-11 text-[13px] font-medium border border-border/60 bg-background/60 hover:bg-background">
                    <Upload className="h-4 w-4 mr-2" />
                    Escolher imagem ou PDF
                  </Button>
              </div>

                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </motion.div>
          )}

          {step === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 pt-8"
            >
              {attachmentPreview && (
                attachmentPreview.url ? (
                  <div className="w-full aspect-[4/3] max-h-[200px] rounded-xl overflow-hidden border border-border/30">
                    <img src={attachmentPreview.url} alt={attachmentPreview.fileName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-border/40 bg-background/60 px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">{attachmentPreview.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">PDF anexado para leitura inteligente</p>
                    </div>
                  </div>
                )
              )}
              <AiProgressiveLoader
                steps={[
                  "Processando imagem…",
                  "Identificando vinhos na carta…",
                  "Consultando sommelier…",
                  "Avaliando compatibilidade…",
                  "Finalizando recomendações…",
                ]}
                interval={3000}
              />
            </motion.div>
          )}

          {step === "results" && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3 pt-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#888" }}>
                  {results.wines.length} vinho{results.wines.length !== 1 ? "s" : ""} identificado{results.wines.length !== 1 ? "s" : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                  <RotateCcw className="h-3 w-3 mr-1" /> Nova análise
                </Button>
              </div>

              <ul className="space-y-3">
                {results.wines.map((wine, i) => (
                  <WineListCard key={i} wine={wine} index={i} isTopPick={wine.name === results.topPick} isBestValue={wine.name === results.bestValue} />
                ))}
              </ul>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 pt-14"
            >
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-7 w-7 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-1">Não foi possível analisar</p>
                <p className="text-xs text-muted-foreground max-w-[260px]">{errorMsg}</p>
              </div>
              <div className="flex flex-col gap-2.5 w-full">
                <Button onClick={() => (lastAttachment ? runScan(lastAttachment) : reset())} variant="secondary" className="h-11 text-[13px] font-semibold">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
                </Button>
                <Button onClick={() => handleClose(false)} variant="ghost" className="h-11 text-[13px] border border-border/60">
                  Fechar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function WineListCard({ wine, index, isTopPick, isBestValue }: { wine: WineListItem; index: number; isTopPick: boolean; isBestValue: boolean }) {
  const HighlightIcon = wine.highlight ? highlightIcon[wine.highlight] : null;
  const wineType = detectWineType(wine.style);
  const config = wineTypeConfig[wineType];

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="list-none rounded-2xl overflow-hidden transition-all duration-250 hover:-translate-y-0.5 active:scale-[0.99]"
      style={{
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px) saturate(1.3)",
        WebkitBackdropFilter: "blur(12px) saturate(1.3)",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "0 6px 24px -6px rgba(30,20,20,0.08), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      {/* Accent top line */}
      <div className="h-[2px] w-full" style={{ background: config.accentLine }} />

      <div className="p-4 sm:p-5 space-y-3">
        {/* ── Row 1: Name + Price ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[15px] font-bold tracking-[-0.01em] leading-snug" style={{ color: "#1A1A1A" }}>
                {wine.name}
              </h4>
            </div>

            {/* Highlight badge */}
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
                {highlightLabel[wine.highlight]}
              </span>
            )}
          </div>

          {wine.price != null && (
            <span className="text-[16px] font-bold shrink-0 tracking-tight" style={{ color: "#1A1A1A" }}>
              R$ {wine.price.toFixed(0)}
            </span>
          )}
        </div>

        {/* ── Row 2: Meta Info ── */}
        <div className="flex items-center gap-1.5 flex-wrap" style={{ color: "#666" }}>
          {wine.producer && (
            <span className="text-[11px] font-medium">{wine.producer}</span>
          )}
          {wine.vintage && (
            <span className="text-[11px] font-medium">· {wine.vintage}</span>
          )}
          {wine.grape && (
            <span className="text-[11px] font-medium flex items-center gap-0.5">
              · <Grape className="h-2.5 w-2.5" /> {wine.grape}
            </span>
          )}
        </div>

        {wine.region && (
          <div className="flex items-center gap-1" style={{ color: "#777" }}>
            <MapPin className="h-3 w-3" />
            <span className="text-[11px] font-medium">{wine.region}</span>
          </div>
        )}

        {/* ── Row 3: Rating + Type Badge + Compatibility ── */}
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
                <WineIcon className="h-2.5 w-2.5" />
                {config.label}
              </span>
            )}
          </div>
          <span
            className="h-6 px-2.5 rounded-full flex items-center text-[10px] font-bold"
            style={{
              background: wine.compatibility >= 70 ? "rgba(16,185,129,0.08)" : wine.compatibility >= 50 ? "rgba(245,158,11,0.08)" : "rgba(0,0,0,0.04)",
              color: wine.compatibility >= 70 ? "#047857" : wine.compatibility >= 50 ? "#b45309" : "#888",
              border: `1px solid ${wine.compatibility >= 70 ? "rgba(16,185,129,0.15)" : wine.compatibility >= 50 ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.08)"}`,
            }}
          >
            {wine.compatibility}% compatível
          </span>
        </div>

        {/* ── Row 4: Description ── */}
        {wine.description && (
          <p className="text-[13px] leading-relaxed" style={{ color: "#2B2B2B" }}>
            {wine.description}
          </p>
        )}

        {/* ── Row 5: Verdict (italic quote) ── */}
        <p className="text-[12px] leading-relaxed italic" style={{ color: "#777" }}>
          "{wine.verdict}"
        </p>

        {/* ── Row 6: Pairings ── */}
        {wine.pairings && wine.pairings.length > 0 && (
          <div className="pt-2.5 mt-1" style={{ borderTop: `1px solid ${config.accentLine}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <UtensilsCrossed className="h-3 w-3" style={{ color: config.badgeText }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "#888" }}>Harmoniza com</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {wine.pairings.map((p, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: config.chipBg,
                    border: `1px solid ${config.chipBorder}`,
                    color: config.chipText,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.li>
  );
}
