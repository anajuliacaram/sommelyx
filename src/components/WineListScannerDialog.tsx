import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Star, Award, TrendingUp, Sparkles, RotateCcw, X, UtensilsCrossed, Grape, MapPin, FileText } from "@/icons/lucide";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { analyzeWineList, buildUserProfile, type WineListAnalysis, type WineListItem } from "@/lib/sommelier-ai";
import { prepareAiAnalysisAttachment, type AiAnalysisAttachmentPayload } from "@/lib/ai-attachments";
import { useWines } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { normalizeAppError } from "@/lib/app-error";

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

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < full
              ? "text-[hsl(var(--gold))] fill-[hsl(var(--gold))]"
              : i === full && hasHalf
                ? "text-[hsl(var(--gold))] fill-[hsl(var(--gold))]/50"
                : "text-border fill-transparent",
          )}
        />
      ))}
      <span className="text-[10px] font-bold text-muted-foreground ml-1">{rating.toFixed(1)}</span>
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
    } catch (err) {
      const normalized = normalizeAppError(err);
      setErrorMsg(normalized.userMessage);
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
      const normalized = normalizeAppError(error);
      setErrorMsg(normalized.userMessage);
      setStep("error");
    }
  }, [runScan, toast]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border/50">
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
                    Envie uma foto ou PDF da carta de vinhos. A IA avalia os rótulos visíveis e aponta as melhores escolhas.
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
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {results.wines.length} vinho{results.wines.length !== 1 ? "s" : ""} identificado{results.wines.length !== 1 ? "s" : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                  <RotateCcw className="h-3 w-3 mr-1" /> Nova análise
                </Button>
              </div>

              <ul className="space-y-2">
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

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "glass-card p-3.5 space-y-2 list-none",
        (isTopPick || isBestValue) && "border-primary/15 bg-primary/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground">{wine.name}</span>
            {wine.highlight && HighlightIcon && (
              <Badge className="h-[18px] text-[8px] font-bold uppercase tracking-wider bg-primary/8 text-primary border-0 gap-1">
                <HighlightIcon className="h-2.5 w-2.5" />
                {highlightLabel[wine.highlight]}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {wine.producer && (
              <span className="text-[10px] text-muted-foreground">{wine.producer}</span>
            )}
            {wine.vintage && (
              <span className="text-[10px] text-muted-foreground">· {wine.vintage}</span>
            )}
            {wine.grape && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                · <Grape className="h-2.5 w-2.5" /> {wine.grape}
              </span>
            )}
            {wine.region && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                · <MapPin className="h-2.5 w-2.5" /> {wine.region}
              </span>
            )}
          </div>
        </div>
        {wine.price != null && (
          <span className="text-[13px] font-bold text-foreground shrink-0">
            R$ {wine.price.toFixed(0)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <StarRating rating={wine.rating} />
        <span className={cn(
          "h-5 px-2 rounded-full flex items-center text-[9px] font-bold",
          wine.compatibility >= 85 ? "bg-success/10 text-success" :
          wine.compatibility >= 70 ? "bg-success/8 text-success/80" :
          wine.compatibility >= 50 ? "bg-warning/10 text-warning" :
          "bg-muted/40 text-muted-foreground",
        )}>
          {wine.compatibility}% compatível
        </span>
      </div>

      {wine.description && (
        <p className="text-[11px] text-foreground/80 leading-relaxed">
          {wine.description}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground leading-snug italic">
        "{wine.verdict}"
      </p>

      {wine.pairings && wine.pairings.length > 0 && (
        <div className="pt-1 border-t border-border/30">
          <div className="flex items-center gap-1 mb-1">
            <UtensilsCrossed className="h-2.5 w-2.5 text-primary/60" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Harmoniza com</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {wine.pairings.map((p, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/[0.06] text-foreground/80 border border-primary/10">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.li>
  );
}
