import { useState, useRef, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Check, X, RotateCcw } from "@/icons/lucide";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { EdgeFunctionError, invokeEdgeFunction } from "@/lib/edge-invoke";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";

interface ScannedWineData {
  name: string | null;
  producer: string | null;
  vintage: number | null;
  style: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  food_pairing: string | null;
  tasting_notes: string | null;
  drink_from: number | null;
  drink_until: number | null;
  purchase_price: number | null;
  cellar_location: string | null;
  labelImagePreview?: string | null;
}

interface ScanWineLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: (data: ScannedWineData) => void;
}

type ScanStep = "capture" | "scanning" | "preview" | "error";

export function ScanWineLabelDialog({ open, onOpenChange, onScanComplete }: ScanWineLabelDialogProps) {
  const [step, setStep] = useState<ScanStep>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedWineData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [supportCode, setSupportCode] = useState<string | null>(null);
  const [lastBase64, setLastBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const { toast } = useToast();

  const reset = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    selectedFileRef.current = null;
    setStep("capture");
    setImagePreview(null);
    setScannedData(null);
    setErrorMsg("");
    setSupportCode(null);
    setLastBase64(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

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
          const MAX = 1200;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = (h * MAX) / w; w = MAX; }
            else { w = (w * MAX) / h; h = MAX; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          const base64 = dataUrl.split(",")[1];
          resolve(base64);
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
    setSupportCode(null);

    try {
      const data = await invokeEdgeFunction<any>(
        "scan-wine-label",
        { imageBase64: base64 },
        { timeoutMs: 55_000, retries: 2 },
      );

      if (!data?.wine) throw new Error("Nenhum dado encontrado");

      setScannedData(data.wine as ScannedWineData);
      setStep("preview");
    } catch (err: unknown) {
      console.error("Scan error:", err);

      const e = err as any;
      const code = e?.code as string | undefined;

      let msg = e?.message || "Não foi possível analisar o rótulo";
      if (err instanceof EdgeFunctionError) {
        setSupportCode(err.requestId ?? null);
      }

      if (code === "AUTH_REQUIRED" || code === "AUTH_INVALID") {
        msg = "Sua sessão expirou. Faça login novamente para continuar.";
      } else if (code === "IMAGE_TOO_LARGE") {
        msg = "A imagem está muito grande. Tente uma foto mais leve.";
      } else if (code === "LABEL_NOT_IDENTIFIED") {
        msg = "Não foi possível identificar esse rótulo com segurança. Tente outra foto ou cadastre manualmente.";
      } else if (code === "CONFIG_ERROR") {
        msg = "O scanner está temporariamente indisponível. Tente novamente em instantes.";
      } else if (code === "AI_TIMEOUT") {
        msg = "A análise demorou mais do que o esperado. Tente novamente com uma foto mais nítida.";
      } else if (code === "AI_UNAVAILABLE" || code === "AI_RATE_LIMIT") {
        msg = "A análise não pôde ser concluída agora. Tente novamente em instantes.";
      }

      setErrorMsg(msg);
      setStep("error");
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem válida", variant: "destructive" });
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    selectedFileRef.current = file;
    setImagePreview(previewUrl);
    setStep("scanning");

    try {
      const base64 = await compressImage(file);
      setLastBase64(base64);
      await runScan(base64);
    } catch (err: any) {
      console.error("Image error:", err);
      setSupportCode(null);
      setErrorMsg("Não conseguimos ler essa imagem. Tente novamente com uma foto mais nítida do rótulo.");
      setStep("error");
    }
  }, [compressImage, runScan, toast]);

  const handleConfirm = async () => {
    if (!scannedData) return;

    let labelImagePreview: string | null = imagePreview;
    const selectedFile = selectedFileRef.current;

    if (selectedFile) {
      try {
        labelImagePreview = await new Promise<string | null>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(selectedFile);
        });
      } catch (err) {
        console.warn("Failed to convert label image preview to data URL:", err);
      }
    }

    onScanComplete({
      ...scannedData,
      labelImagePreview,
    });
    reset();
    onOpenChange(false);
  };

  const styleLabels: Record<string, string> = {
    tinto: "Tinto", branco: "Branco", rose: "Rosé",
    espumante: "Espumante", sobremesa: "Sobremesa", fortificado: "Fortificado",
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg">Escanear Rótulo</SheetTitle>
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
                <h3 className="text-base font-semibold text-foreground mb-1">Fotografe o rótulo</h3>
                <p className="text-xs text-muted-foreground max-w-[260px]">
                  Tire uma foto nítida do rótulo frontal da garrafa. Nossa inteligência vai extrair todas as informações automaticamente.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full mt-4">
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
                  Escolher da Fototeca
                </Button>
              </div>

              <p className="text-[10px] leading-relaxed text-muted-foreground text-center max-w-[260px]">
                Use câmera ou fototeca para ler apenas a foto do rótulo.
              </p>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
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
              {imagePreview && (
                <div className="w-full aspect-[3/4] max-h-[220px] rounded-xl overflow-hidden border border-border/30">
                  <img src={imagePreview} alt="Label" className="w-full h-full object-cover" />
                </div>
              )}
              <AiProgressiveLoader
                steps={[
                  "Processando imagem…",
                  "Lendo rótulo com inteligência Sommelyx…",
                  "Extraindo informações…",
                  "Verificando dados…",
                ]}
                interval={2500}
              />
            </motion.div>
          )}

          {step === "preview" && scannedData && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 pt-4"
            >
              {imagePreview && (
                <div className="w-full h-32 rounded-xl overflow-hidden border border-border/30">
                  <img src={imagePreview} alt="Label" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-2 py-2">
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-success" />
                </div>
                <p className="text-xs font-medium text-success">Rótulo identificado com sucesso</p>
              </div>

              <div className="glass-card p-4 space-y-3">
                {scannedData.name && (
                  <DataRow label="Nome" value={scannedData.name} />
                )}
                {scannedData.producer && (
                  <DataRow label="Produtor" value={scannedData.producer} />
                )}
                {scannedData.vintage && (
                  <DataRow label="Safra" value={String(scannedData.vintage)} />
                )}
                {scannedData.style && (
                  <DataRow label="Estilo" value={styleLabels[scannedData.style] || scannedData.style} />
                )}
                {scannedData.grape && (
                  <DataRow label="Uva" value={scannedData.grape} />
                )}
                {scannedData.country && (
                  <DataRow label="País" value={scannedData.country} />
                )}
                {scannedData.region && (
                  <DataRow label="Região" value={scannedData.region} />
                )}
                {scannedData.drink_from && scannedData.drink_until && (
                  <DataRow label="Janela de consumo" value={`${scannedData.drink_from} – ${scannedData.drink_until}`} />
                )}
                {scannedData.food_pairing && (
                  <DataRow label="Harmonização" value={scannedData.food_pairing} />
                )}
                {scannedData.tasting_notes && (
                  <DataRow label="Notas" value={scannedData.tasting_notes} />
                )}
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Você poderá editar as informações antes de salvar
              </p>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={reset} className="flex-1 h-11 text-[13px]">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reescanear
                </Button>
                <Button variant="primary" onClick={handleConfirm} className="flex-1 h-11 text-[13px] font-semibold">
                  <Check className="h-4 w-4 mr-1.5" />
                  Usar dados
                </Button>
              </div>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 pt-12"
            >
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-7 w-7 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-1">Não foi possível analisar</p>
                <p className="text-xs text-muted-foreground max-w-[260px]">{errorMsg}</p>
                {supportCode && (
                  <p className="text-[10px] text-muted-foreground mt-2">Código do suporte: {supportCode}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={() => (lastBase64 ? runScan(lastBase64) : reset())}
                  variant="secondary"
                  className="h-11 px-6 text-[13px]"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Tentar novamente
                </Button>
                <Button onClick={() => handleClose(false)} variant="ghost" className="h-11 text-[13px] border border-border/70 bg-background/60 hover:bg-background">
                  Cadastrar manualmente
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider shrink-0 pt-0.5">{label}</span>
      <span className="text-[12px] font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
