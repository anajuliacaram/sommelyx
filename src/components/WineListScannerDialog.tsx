import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, Star, Award, TrendingUp, Sparkles, RotateCcw } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { analyzeWineList, buildUserProfile, compatibilityColor, type WineListAnalysis, type WineListItem } from "@/lib/sommelier-ai";
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
              ? "text-amber-400 fill-amber-400"
              : i === full && hasHalf
                ? "text-amber-400 fill-amber-400/50"
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [results, setResults] = useState<WineListAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastBase64, setLastBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("capture");
    setImagePreview(null);
    setResults(null);
    setErrorMsg("");
    setLastBase64(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const compressImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 1600;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = (h * MAX) / w; w = MAX; }
            else { w = (w * MAX) / h; h = MAX; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const runScan = useCallback(async (base64: string) => {
    setStep("scanning");
    setErrorMsg("");
    try {
      const cellarWines = wines?.filter((w) => w.quantity > 0) || [];
      const profile = cellarWines.length >= 3 ? buildUserProfile(cellarWines) : undefined;
      const data = await analyzeWineList(base64, profile);
      if (!data.wines?.length) throw new Error("Nenhum vinho identificado na imagem");
      setResults(data);
      setStep("results");
    } catch (err: any) {
      setErrorMsg(err.message || "Não foi possível analisar a carta");
      setStep("error");
    }
  }, [wines]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem válida", variant: "destructive" });
      return;
    }
    setImagePreview(URL.createObjectURL(file));
    setStep("scanning");
    try {
      const base64 = await compressImage(file);
      setLastBase64(base64);
      await runScan(base64);
    } catch {
      setErrorMsg("Não conseguimos ler essa imagem.");
      setStep("error");
    }
  }, [compressImage, runScan, toast]);

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
              className="flex flex-col items-center gap-5 pt-8"
            >
              <div className="w-16 h-16 rounded-2xl gradient-wine flex items-center justify-center" style={{ boxShadow: "0 8px 24px rgba(143,45,86,0.2)" }}>
                <Camera className="h-7 w-7 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground mb-1">Fotografe a carta</h3>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  Tire uma foto da carta de vinhos do restaurante. O sommelier vai avaliar cada vinho e sugerir a melhor escolha.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full mt-2">
                <Button
                  variant="primary"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-12 text-[13px] font-semibold"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tirar Foto
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-12 text-[13px] font-medium border border-border/70 bg-background/60 hover:bg-background"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Escolher da Galeria
                </Button>
              </div>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </motion.div>
          )}

          {step === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 pt-6"
            >
              {imagePreview && (
                <div className="w-full aspect-[4/3] max-h-[220px] rounded-xl overflow-hidden border border-border/30">
                  <img src={imagePreview} alt="Carta" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Analisando carta de vinhos…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">O sommelier está avaliando cada rótulo</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === "results" && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 pt-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {results.wines.length} vinho{results.wines.length !== 1 ? "s" : ""} identificado{results.wines.length !== 1 ? "s" : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-[10px] text-muted-foreground">
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
              className="flex flex-col items-center gap-5 pt-10"
            >
              <p className="text-sm font-medium text-foreground">Não foi possível analisar</p>
              <p className="text-xs text-muted-foreground text-center max-w-[260px]">{errorMsg}</p>
              <div className="flex flex-col gap-2 w-full">
                <Button onClick={() => (lastBase64 ? runScan(lastBase64) : reset())} variant="secondary" className="h-11 text-[13px]">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
                </Button>
                <Button onClick={() => handleClose(false)} variant="ghost" className="h-11 text-[13px] border border-border/70">
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
        (isTopPick || isBestValue) && "border-primary/15 bg-primary/[0.02]",
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
          {wine.producer && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{wine.producer}{wine.vintage ? ` · ${wine.vintage}` : ""}</p>
          )}
        </div>
        {wine.price != null && (
          <span className="text-[13px] font-bold text-foreground shrink-0">
            R$ {wine.price.toFixed(0)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <StarRating rating={wine.rating} />
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "h-5 px-2 rounded-full flex items-center text-[9px] font-bold",
            wine.compatibility >= 85 ? "bg-green-500/10 text-green-600" :
            wine.compatibility >= 70 ? "bg-emerald-500/10 text-emerald-500" :
            wine.compatibility >= 50 ? "bg-amber-500/10 text-amber-500" :
            "bg-muted/40 text-muted-foreground",
          )}>
            {wine.compatibility}% compatível
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug italic">
        "{wine.verdict}"
      </p>
    </motion.li>
  );
}
