import { useState, useRef, useCallback, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Check, RotateCcw } from "@/icons/lucide";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { EdgeFunctionError, invokeEdgeFunction } from "@/lib/edge-invoke";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";
import { getAttachmentErrorMessage, prepareWineLabelScanAttachment } from "@/lib/ai-attachments";
import { getClientDeviceType, logFileRequestStart } from "@/lib/observability";
import { supabase } from "@/integrations/supabase/client";
import { getMeaningfulScanFields, hasMeaningfulScanResult, isMeaningfulScanValue, normalizeScanResult, type CanonicalScanResult, type NormalizedScanResult } from "@/lib/scan-normalizer";
import {
  AI_MODAL_ACTION_TILE_CLASSNAME,
  AI_MODAL_SHEET_CONTENT_CLASSNAME,
  AI_MODAL_SHEET_CONTENT_STYLE,
  AiModalHeader,
  AiModalCard,
  AiModalActions,
  AiModalActionButton,
  AiModalShell,
  AiModalHeaderBar,
  AiModalBody,
  AiModalSplitLayout,
  AiUploadPanel,
  AiSectionLabel,
} from "@/components/ai-flow/ModalLayout";
import { PairingErrorState } from "@/components/pairing/shared";
import { cn } from "@/lib/utils";

interface ScannedWineData extends CanonicalScanResult {
  labelImagePreview?: string | null;
  labelImageFile?: File | null;
  labelImageBase64?: string | null;
}

export interface ScanResultPayload {
  raw: Record<string, unknown>;
  normalized: NormalizedScanResult;
  labelImagePreview?: string | null;
  labelImageFile?: File | null;
  labelImageBase64?: string | null;
}

interface ScanWineLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: (data: ScanResultPayload) => void;
}

type ScanStep = "capture" | "scanning" | "preview" | "error";
type ScanOutcome = "success_full" | "success_partial" | "error" | null;
type ScanRequestMetadata = {
  mimeType?: string;
  fileName?: string;
};

function isAcceptedMobileImage(file: File) {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const allowedMime = new Set(["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"]);
  if (allowedMime.has(mime)) return true;
  return [".jpg", ".jpeg", ".png", ".heic", ".heif"].some((ext) => name.endsWith(ext));
}

function isCompleteScanResult(result: CanonicalScanResult, meaningfulFields: string[]) {
  const hasCoreIdentity =
    Boolean(result.name) &&
    Boolean(result.style) &&
    Boolean(result.vintage) &&
    Boolean(result.producer || result.grape) &&
    Boolean(result.country || result.region);

  return hasCoreIdentity && meaningfulFields.length >= 7;
}

export function ScanWineLabelDialog({ open, onOpenChange, onScanComplete }: ScanWineLabelDialogProps) {
  const [step, setStep] = useState<ScanStep>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedWineData | null>(null);
  const [scanPayload, setScanPayload] = useState<ScanResultPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [supportCode, setSupportCode] = useState<string | null>(null);
  const [lastBase64, setLastBase64] = useState<string | null>(null);
  const [scanOutcome, setScanOutcome] = useState<ScanOutcome>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const selectedFileRef = useRef<File | null>(null);
  const requestBusyRef = useRef(false);
  const autoCommitRef = useRef(false);
  const confirmBusyRef = useRef(false);
  const lastScanMetadataRef = useRef<ScanRequestMetadata | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const beginRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    requestSeqRef.current += 1;
    return requestSeqRef.current;
  }, []);

  const isLatestRequest = useCallback((id: number) => id === requestSeqRef.current, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    requestSeqRef.current += 1;
    requestBusyRef.current = false;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    selectedFileRef.current = null;
    lastScanMetadataRef.current = null;
    autoCommitRef.current = false;
    confirmBusyRef.current = false;
    setStep("capture");
    setImagePreview(null);
    setScannedData(null);
    setScanPayload(null);
    setErrorMsg("");
    setSupportCode(null);
    setLastBase64(null);
    setScanOutcome(null);
  }, []);

  useEffect(() => {
    if (step !== "scanning") return;
    const timeout = window.setTimeout(() => {
      abortRef.current?.abort();
      requestBusyRef.current = false;
      setErrorMsg("A leitura demorou mais que o esperado. Tente novamente.");
      setScanOutcome("error");
      setStep("error");
    }, 75_000);
    return () => window.clearTimeout(timeout);
  }, [step]);

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

  const runScan = useCallback(async (
    base64: string,
    metadata?: ScanRequestMetadata,
  ) => {
    if (requestBusyRef.current) return;
    const requestSeq = beginRequest();
    requestBusyRef.current = true;
    autoCommitRef.current = false;
    setStep("scanning");
    setErrorMsg("");
    setSupportCode(null);
    const estimatedPayloadBytes = Math.round((base64.length * 3) / 4);

    console.info("SCAN_START", {
      fileName: metadata?.fileName || null,
      mimeType: metadata?.mimeType || null,
      finalMimeType: metadata?.mimeType || null,
      imageBase64Length: base64.length,
      estimatedPayloadBytes,
      device: getClientDeviceType(),
    });

    try {
      console.info("[ScanWineLabelDialog] backend_called", {
        function: "scan-wine-label",
        payloadShape: {
          hasImageBase64: Boolean(base64),
          mimeType: metadata?.mimeType || null,
          fileName: metadata?.fileName || null,
        },
        payloadSizeEstimateBytes: estimatedPayloadBytes,
      });
      console.info("[ScanWineLabelDialog] request_started", {
        function: "scan-wine-label",
        mimeType: metadata?.mimeType || null,
        fileName: metadata?.fileName || null,
        imageBase64Length: base64.length,
        finalMimeType: metadata?.mimeType || null,
        device: getClientDeviceType(),
      });
      const data = await invokeEdgeFunction<Record<string, unknown>>(
        "scan-wine-label",
        {
          imageBase64: base64,
          mimeType: metadata?.mimeType,
          fileName: metadata?.fileName,
        },
        { timeoutMs: 30_000, retries: 1, retryOnAbort: true, signal: abortRef.current?.signal },
      );
      if (!isLatestRequest(requestSeq)) return;
      console.info("[ScanWineLabelDialog] response_received", {
        function: "scan-wine-label",
        fileName: metadata?.fileName || null,
        mimeType: metadata?.mimeType || null,
        fullJsonResponse: data,
        responseKeys: data && typeof data === "object" ? Object.keys(data as Record<string, unknown>) : [],
      });
      const originalResponse = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      console.info("[SCAN RAW OCR]", {
        ocrText: originalResponse.ocr_text ?? originalResponse.ocrText ?? null,
        ocrConfidence: originalResponse.ocr_confidence ?? originalResponse.ocrConfidence ?? null,
      });
      console.info("[SCAN AI RESPONSE]", originalResponse);
      const normalizedWine = normalizeScanResult(originalResponse);
      const meaningfulFields = getMeaningfulScanFields(normalizedWine);
      const hasIdentifyingData = hasMeaningfulScanResult(normalizedWine);
      const isPartial = !isCompleteScanResult(normalizedWine, meaningfulFields);
      console.info("[SCAN NORMALIZED DATA]", {
        before: originalResponse,
        after: normalizedWine,
        meaningfulFields,
        hasIdentifyingData,
      });
      if (!hasIdentifyingData) {
        console.warn("[SCAN FAILURE REASON]", {
          reason: "no_identifying_fields_after_normalization",
          normalized: normalizedWine,
          meaningfulFields,
        });
        setErrorMsg("Não foi possível identificar esse rótulo com segurança. Tente outra foto mais nítida ou cadastre manualmente.");
        setScanOutcome("error");
        setStep("error");
        return;
      }
      console.info("[ScanWineLabelDialog] response_normalized", {
        function: "scan-wine-label",
        fileName: metadata?.fileName || null,
        normalized: normalizedWine,
        normalizedKeys: meaningfulFields,
      });
      console.info("[ScanWineLabelDialog] scan_normalized_result", {
        function: "scan-wine-label",
        fileName: metadata?.fileName || null,
        normalizedResult: normalizedWine,
        expectedFields: ["name", "producer", "country", "region", "grape", "vintage", "style", "drink_from", "drink_until", "estimated_price", "purchase_price", "food_pairing", "cellar_location"],
        populatedFields: Object.entries(normalizedWine)
          .filter(([, value]) => {
            if (value == null) return false;
            if (typeof value === "number") return Number.isFinite(value);
            if (typeof value !== "string") return false;
            const text = value.trim();
            if (!text) return false;
            const lowered = text.toLowerCase();
            return !["null", "undefined", "unknown", "unidentified", "não identificado", "nao identificado", "n/a", "na"].includes(lowered);
          })
          .map(([key]) => key),
      });

      console.info("[ScanWineLabelDialog] request_finished", {
        function: "scan-wine-label",
        success: true,
        status: 200,
        fileName: metadata?.fileName || null,
      });
      console.info("[ScanWineLabelDialog] scan_success", {
        function: "scan-wine-label",
        fileName: metadata?.fileName || null,
        mimeType: metadata?.mimeType || null,
        scanOutcome: isPartial ? "success_partial" : "success_full",
        hasMeaningfulData: hasIdentifyingData,
        mappedFields: meaningfulFields,
      });
      console.info("SCAN_SUCCESS", {
        fileName: metadata?.fileName || null,
        mimeType: metadata?.mimeType || null,
        finalMimeType: metadata?.mimeType || null,
        imageBase64Length: base64.length,
        estimatedPayloadBytes,
        device: getClientDeviceType(),
      });
      setScannedData(normalizedWine);
      setScanPayload({
        raw: originalResponse,
        normalized: normalizedWine,
        labelImagePreview: null,
        labelImageFile: null,
        labelImageBase64: null,
      });
      setScanOutcome(isPartial ? "success_partial" : "success_full");
      setStep("preview");
    } catch (err: unknown) {
      if (!isLatestRequest(requestSeq)) return;
      const e = err as Partial<EdgeFunctionError> & { message?: string; status?: number; rawBody?: unknown };
      const code = String(e?.code || "UNKNOWN");
      const requestId = String(e?.debugId || e?.requestId || "");
      const debugPayload = {
        function: "scan-wine-label",
        code,
        message: e?.message || null,
        status: e?.status ?? null,
        requestId: e?.requestId ?? null,
        debugId: e?.debugId ?? null,
        functionName: e?.functionName ?? null,
        rawBody: e?.rawBody ?? null,
        fileName: metadata?.fileName || null,
        mimeType: metadata?.mimeType || null,
        finalMimeType: metadata?.mimeType || null,
        imageBase64Length: base64?.length || 0,
      };
      console.error("[ScanWineLabelDialog] scan_failed", debugPayload);
      console.error("SCAN_FAIL", debugPayload);

      console.info("[ScanWineLabelDialog] request_finished", {
        function: "scan-wine-label",
        success: false,
        code,
        status: e?.status ?? null,
        requestId: requestId || null,
        fileName: metadata?.fileName || null,
      });

      if (requestId) {
        setSupportCode(requestId);
      }

      let msg = "Não conseguimos analisar este rótulo.";
      console.warn("[SCAN FAILURE REASON]", debugPayload);
      if (code === "NETWORK_ERROR") {
        msg = "Sem conexão com internet";
      } else if (code === "AI_TIMEOUT") {
        msg = "A análise demorou muito. Tente novamente";
      } else if (code === "INVALID_IMAGE") {
        msg = "Imagem inválida ou ilegível";
      } else if (code === "AUTH_REQUIRED" || code === "AUTH_INVALID") {
        await supabase.auth.signOut();
        navigate("/login?reauth=1", { replace: true });
        return;
      } else if (code === "AI_UNAVAILABLE") {
        msg = "Não conseguimos analisar este rótulo.";
      } else if (code === "OCR_FAILED" || code === "OCR_LOW_CONFIDENCE" || code === "OCR_EMPTY") {
        msg = "Não foi possível ler texto suficiente no rótulo. Tente outra foto mais nítida.";
      } else if (code === "PARSE_ERROR" || code === "LABEL_NOT_IDENTIFIED") {
        msg = "Não foi possível identificar esse rótulo com segurança. Tente outra foto mais nítida.";
      }

      setErrorMsg(msg);
      setStep("error");
    } finally {
      if (isLatestRequest(requestSeq)) requestBusyRef.current = false;
    }
  }, [beginRequest, isLatestRequest, navigate]);

  const handleFile = useCallback(async (file: File) => {
    if (requestBusyRef.current) return;
    const prepareSeq = beginRequest();
    logFileRequestStart("SCAN_FILE_SELECTED", file, { source: "label_scan" });
    if (!isAcceptedMobileImage(file)) {
      toast({ title: "Selecione uma imagem válida", variant: "destructive" });
      return;
    }

    console.info("[ScanWineLabelDialog] file_selected", {
      fileName: file.name,
      mimeType: file.type || "unknown",
      sizeBytes: file.size,
    });

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setImagePreview(previewUrl);
    selectedFileRef.current = file;
    setStep("scanning");

    try {
      const prepared = await prepareWineLabelScanAttachment(file, { signal: abortRef.current?.signal });
      if (!isLatestRequest(prepareSeq)) return;
      console.info("[ScanWineLabelDialog] attachment_prepared", {
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        finalMimeType: prepared.finalMimeType || prepared.mimeType,
        sourceType: prepared.sourceType,
        wasOptimized: prepared.wasOptimized || false,
        originalMimeType: prepared.originalMimeType || null,
        decodeMethod: prepared.decodePath || null,
        originalWidth: prepared.originalWidth || null,
        originalHeight: prepared.originalHeight || null,
        resizedWidth: prepared.resizedWidth || null,
        resizedHeight: prepared.resizedHeight || null,
        imageBase64Length: prepared.imageBase64?.length || 0,
        finalBase64Length: prepared.finalBase64Length || prepared.imageBase64?.length || 0,
        estimatedPayloadBytes: prepared.imageBase64 ? Math.round((prepared.imageBase64.length * 3) / 4) : 0,
      });
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setImagePreview(prepared.previewUrl || previewUrl);
      setLastBase64(prepared.imageBase64 || null);
      lastScanMetadataRef.current = {
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      };
      if (!prepared.imageBase64) {
        throw Object.assign(new Error("Não foi possível preparar a imagem."), { code: "IMAGE_PROCESSING_FAILED" });
      }
      console.info("[ScanWineLabelDialog] sending_scan_request", {
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        finalMimeType: prepared.finalMimeType || prepared.mimeType,
        decodeMethod: prepared.decodePath || null,
        originalWidth: prepared.originalWidth || null,
        originalHeight: prepared.originalHeight || null,
        resizedWidth: prepared.resizedWidth || null,
        resizedHeight: prepared.resizedHeight || null,
        imageBase64Length: prepared.imageBase64.length,
        estimatedPayloadBytes: Math.round((prepared.imageBase64.length * 3) / 4),
      });
      await runScan(prepared.imageBase64, {
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      });
    } catch (err: unknown) {
      if (!isLatestRequest(prepareSeq)) return;
      console.error("Image error:", err);
      if (err instanceof EdgeFunctionError) {
        console.error("[ScanWineLabelDialog] backend_failure", {
          code: err.code,
          status: err.status,
          requestId: err.requestId,
          functionName: err.functionName,
          rawBody: err.rawBody,
        });
        setSupportCode(err.requestId ?? null);

        const code = err.code;
        let msg = "Não conseguimos concluir a leitura do rótulo. Tente novamente.";
        if (code === "AUTH_REQUIRED" || code === "AUTH_INVALID") {
          await supabase.auth.signOut();
          navigate("/login?reauth=1", { replace: true });
          return;
        } else if (code === "INVALID_IMAGE") {
          msg = "Imagem inválida. Envie uma foto legível do rótulo.";
        } else if (code === "INVALID_IMAGE_BASE64") {
          msg = "A imagem enviada não pôde ser lida corretamente. Tente outra foto ou use a câmera.";
        } else if (code === "IMAGE_DECODE_FAILED" || code === "UNSUPPORTED_IMAGE_FORMAT") {
          msg = "Não conseguimos processar esta imagem. Tente outra foto do rótulo.";
        } else if (code === "IMAGE_TOO_LARGE" || code === "FILE_TOO_LARGE") {
          msg = "A imagem está muito grande. Tente uma foto mais leve.";
        } else if (code === "AI_PARSE_ERROR") {
          msg = "A leitura do rótulo voltou em formato inválido. Tente novamente com outra foto.";
        } else if (code === "AI_TIMEOUT") {
          msg = "Tempo excedido. Tente novamente com uma foto mais nítida.";
        } else if (code === "AI_UNAVAILABLE") {
          msg = "O serviço está temporariamente indisponível. Tente novamente com outra foto.";
        }
        setErrorMsg(msg);
        setStep("error");
        return;
      }

      setSupportCode(null);
      const fallbackMessage = "Não conseguimos concluir a leitura do rótulo. Tente outra foto.";
      setErrorMsg(getAttachmentErrorMessage(err, fallbackMessage));
      setScanOutcome("error");
      setStep("error");
    }
  }, [beginRequest, isLatestRequest, navigate, runScan, toast]);

  const handleSelectedFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) {
        await handleFile(file);
      }
    },
    [handleFile],
  );

  const handleConfirm = useCallback(async () => {
    if (!scannedData) return;
    if (confirmBusyRef.current) return;
    confirmBusyRef.current = true;

    try {
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
        raw: scanPayload?.raw ?? {},
        normalized: scanPayload?.normalized ?? (scannedData as NormalizedScanResult),
        labelImagePreview,
        labelImageFile: selectedFile,
        labelImageBase64: lastBase64,
      });
      console.info("[SCAN APPLY STATE]", {
        appliedFields: scanPayload?.normalized ? getMeaningfulScanFields(scanPayload.normalized) : getMeaningfulScanFields(scannedData),
        normalized: scanPayload?.normalized ?? scannedData,
      });
      reset();
      onOpenChange(false);
    } finally {
      confirmBusyRef.current = false;
    }
  }, [imagePreview, lastBase64, onOpenChange, onScanComplete, reset, scanPayload, scannedData]);

  useEffect(() => {
    if (!open) return;
    if (step !== "preview") return;
    if (!scannedData) return;
    if (autoCommitRef.current) return;
    if (!hasMeaningfulScanResult(scannedData)) return;
    if (scanOutcome !== "success_full") return;

    autoCommitRef.current = true;
    void handleConfirm();
  }, [handleConfirm, open, scanOutcome, scannedData, step]);

  const styleLabels: Record<string, string> = {
    tinto: "Tinto", branco: "Branco", rose: "Rosé",
    espumante: "Espumante", sobremesa: "Sobremesa", fortificado: "Fortificado",
  };

  const resultRows = scannedData
    ? [
        isMeaningfulScanValue(scannedData.name) ? <DataRow key="name" label="Nome" value={scannedData.name} /> : null,
        isMeaningfulScanValue(scannedData.producer) ? <DataRow key="producer" label="Produtor" value={scannedData.producer} /> : null,
        isMeaningfulScanValue(scannedData.vintage) ? <DataRow key="vintage" label="Safra" value={String(scannedData.vintage)} /> : null,
        isMeaningfulScanValue(scannedData.style) ? <DataRow key="style" label="Estilo" value={styleLabels[scannedData.style] || scannedData.style} /> : null,
        isMeaningfulScanValue(scannedData.grape) ? <DataRow key="grape" label="Uva" value={scannedData.grape} /> : null,
        isMeaningfulScanValue(scannedData.country) ? <DataRow key="country" label="País" value={scannedData.country} /> : null,
        isMeaningfulScanValue(scannedData.region) ? <DataRow key="region" label="Região" value={scannedData.region} /> : null,
        isMeaningfulScanValue(scannedData.drink_from) && isMeaningfulScanValue(scannedData.drink_until)
          ? <DataRow key="drink_window" label="Janela de consumo" value={`${scannedData.drink_from} – ${scannedData.drink_until}`} />
          : null,
        isMeaningfulScanValue(scannedData.food_pairing) ? <DataRow key="pairing" label="Harmonização" value={scannedData.food_pairing} /> : null,
      ].filter(Boolean)
    : [];

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        className={AI_MODAL_SHEET_CONTENT_CLASSNAME}
        style={AI_MODAL_SHEET_CONTENT_STYLE}
        aria-label="Escanear Rótulo"
      >
        <SheetTitle className="sr-only">Escanear Rótulo</SheetTitle>
        <AiModalShell>
        <AiModalHeaderBar>
          <AiModalHeader
            icon={<Camera className="h-5 w-5" />}
            title="Escanear Rótulo"
            description="Use somente dados legíveis."
          />
        </AiModalHeaderBar>

        <AiModalBody>
          <AiModalSplitLayout>
          <AnimatePresence mode="wait">
            {step === "capture" && (
              <motion.div
                key="capture"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              className="space-y-3"
              >
                <AiModalCard className="space-y-2.5 border-y border-x-0">
                  <AiUploadPanel
                    icon={<Camera className="h-5 w-5" />}
                    title="Enviar rótulo"
                    description="Foto ou imagem."
                    onClick={() => cameraInputRef.current?.click()}
                  />

                  <div className="grid w-full gap-2 sm:grid-cols-2">
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
                    Fototeca
                  </AiModalActionButton>
                </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*,.heic,.heif,.jpg,.jpeg,.png"
                    capture="environment"
                    className="hidden"
                    onChange={handleSelectedFile}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleSelectedFile}
                  />
                </AiModalCard>
              </motion.div>
            )}

            {step === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <AiModalCard>
                  <AiProgressiveLoader
                    steps={[
                      "Lendo rótulo",
                      "Organizando dados",
                      "Preparando revisão",
                    ]}
                    interval={2200}
                  />
                </AiModalCard>
              </motion.div>
            )}

            {step === "preview" && scannedData && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {imagePreview ? (
                  <div className={cn("flex items-center gap-2.5 p-2.5", AI_MODAL_ACTION_TILE_CLASSNAME)}>
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-[12px] border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.58)]">
                      <img src={imagePreview} alt="Rótulo analisado" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-tight text-[#1A1713]">Rótulo analisado</p>
                      <p className="mt-0.5 text-[11.5px] leading-4 text-[#6B6258]">Somente dados legíveis serão aplicados.</p>
                    </div>
                  </div>
                ) : null}

                {resultRows.length > 0 && (
                  <AiModalCard className="space-y-2">
                    <div className="border-b border-[rgba(58,51,39,0.07)] pb-2">
                      <AiSectionLabel>Dados encontrados</AiSectionLabel>
                      <p className="mt-1 text-[12px] leading-5 text-[#6B6258]">Revise antes de aplicar.</p>
                    </div>
                    {resultRows}
                  </AiModalCard>
                )}

                  <AiModalActions className="pt-1 sm:max-w-[26rem]">
                    <AiModalActionButton variant="outline" onClick={reset} className="flex-1">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Reescanear
                  </AiModalActionButton>
                  <AiModalActionButton variant="primary" onClick={handleConfirm} className="flex-1">
                    <Check className="h-4 w-4 mr-1.5" />
                    Usar dados
                  </AiModalActionButton>
                </AiModalActions>
              </motion.div>
            )}

            {step === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <PairingErrorState
                  message={errorMsg}
                  onRetry={() => {
                    if (lastBase64) {
                      runScan(lastBase64, lastScanMetadataRef.current ?? undefined);
                      return;
                    }
                    reset();
                  }}
                  onClose={() => handleClose(false)}
                />
                <AiModalActionButton onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Usar outra foto
                </AiModalActionButton>
              </motion.div>
            )}
          </AnimatePresence>
          </AiModalSplitLayout>
        </AiModalBody>
        </AiModalShell>
      </SheetContent>
    </Sheet>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6258]">{label}</span>
      <span className="text-right text-[12.5px] font-medium leading-5 text-[#1A1713]">{value}</span>
    </div>
  );
}
