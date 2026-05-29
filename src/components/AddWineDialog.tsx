import { useState, useEffect, useRef, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, Camera, FileSpreadsheet, Sparkles, Wine, ArrowLeft, ArrowRight, Search } from "@/icons/lucide";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScanWineLabelDialog } from "@/components/ScanWineLabelDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { ActionDialog, ActionDialogContent, ActionDialogTitle } from "@/components/ai-flow/ActionDialog";
import { LocationFields } from "@/components/LocationFields";
import { formatLocationLabel, type StructuredLocation } from "@/lib/location";
import { useCreateWineLocation } from "@/hooks/useWineLocations";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edge-invoke";
import { normalizeWineData, normalizeWineSearchText, normalizeWineText } from "@/lib/wine-normalization";
import { resolveStorageImageUrl } from "@/lib/storage-urls";
import { getErrorReason } from "@/lib/feedback";
import { isMeaningfulScanValue, normalizeScanResult } from "@/lib/scan-normalizer";
import { normalizeStyleFamily } from "@/lib/sommelyx-data";
import { cn } from "@/lib/utils";
import {
  AI_MODAL_SHEET_CONTENT_CLASSNAME,
  AI_MODAL_SHEET_CONTENT_STYLE,
  AI_MODAL_TEXTAREA_CLASSNAME,
  AiModalActionButton,
  AiModalBody,
  AiModalCard,
  AiModalFooterBar,
  AiModalHeader,
  AiModalHeaderBar,
  AiModalShell,
  AiModalSplitLayout,
} from "@/components/ai-flow/ModalLayout";

interface AddWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScan?: boolean;
  initialValues?: AddWinePrefillValues | null;
}

type AddWinePrefillValues = {
  name?: string | null;
  producer?: string | null;
  vintage?: number | null;
  style?: string | null;
  country?: string | null;
  region?: string | null;
  grape?: string | null;
  grapes?: string | null;
  drinkFrom?: number | null;
  drinkUntil?: number | null;
  purchasePrice?: number | null;
  estimatedPrice?: number | null;
  foodPairing?: string | null;
  cellarLocation?: string | null;
  labelImagePreview?: string | null;
  labelImageFile?: File | null;
  labelImageBase64?: string | null;
  confidence?: Record<string, number | null | undefined> | null;
};

const SCAN_PREFILL_FORM_FIELDS = [
  "name",
  "producer",
  "vintage",
  "style",
  "country",
  "region",
  "grape",
  "drink_from",
  "drink_until",
  "purchase_price",
  "estimated_price",
  "food_pairing",
  "cellar_location",
] as const;

const styles = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "fortificado", label: "Fortificado" },
];

type AddWineStep = "choice" | "identity" | "storage" | "purchase" | "aging" | "review";

const addWineStepOrder: AddWineStep[] = ["identity", "storage", "purchase", "aging", "review"];

const addWineStepLabels: Record<Exclude<AddWineStep, "choice">, string> = {
  identity: "Identificar",
  storage: "Adega",
  purchase: "Compra",
  aging: "Guarda",
  review: "Revisar",
};

type ScanResultEnvelope = {
  raw?: Record<string, unknown> | null;
  normalized?: Record<string, unknown> | null;
  labelImagePreview?: string | null;
  labelImageFile?: File | null;
  labelImageBase64?: string | null;
};

function normalizeLabelText(value: unknown) {
  if (typeof value !== "string") return "";
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (["null", "undefined", "unknown", "unidentified", "não identificado", "nao identificado", "n/a", "na"].includes(lowered)) {
    return "";
  }
  return text;
}

function pickFirstMeaningfulString(values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeLabelText(value);
    if (normalized) return normalized;
  }
  return "";
}

function normalizeConfidenceValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value > 1 ? value / 100 : value;
}

function getScanConfidence(source: Record<string, unknown>, normalizedSource: Record<string, unknown>, field: string) {
  const confidenceSource =
    (normalizedSource.confidence && typeof normalizedSource.confidence === "object" ? normalizedSource.confidence : null) ||
    (source.confidence && typeof source.confidence === "object" ? source.confidence : null);
  if (!confidenceSource) return null;
  const confidence = confidenceSource as Record<string, unknown>;
  return normalizeConfidenceValue(confidence[field] ?? confidence[field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)]);
}

function getRawOcrText(source: Record<string, unknown>, normalizedSource: Record<string, unknown>) {
  return normalizeWineSearchText(
    [
      source.full_text,
      source.label_text,
      source.ocr_text,
      source.text,
      normalizedSource.full_text,
      normalizedSource.label_text,
      normalizedSource.ocr_text,
      normalizedSource.text,
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" "),
  );
}

function keepOnlyConfidentScanValue(
  value: string | number | null | undefined,
  field: string,
  source: Record<string, unknown>,
  normalizedSource: Record<string, unknown>,
  rawOcrText: string,
) {
  if (value == null || value === "") return "";
  const confidence = getScanConfidence(source, normalizedSource, field);
  if (confidence != null) return confidence >= 0.72 ? String(value) : "";
  if (!rawOcrText.trim()) return String(value);
  const normalizedValue = normalizeWineSearchText(String(value));
  if (normalizedValue && rawOcrText.includes(normalizedValue)) return value;
  return "";
}

function keepOnlyConfidentScanNumber(
  value: number | null | undefined,
  field: string,
  source: Record<string, unknown>,
  normalizedSource: Record<string, unknown>,
  rawOcrText: string,
) {
  if (value == null || !Number.isFinite(value)) return null;
  const kept = keepOnlyConfidentScanValue(value, field, source, normalizedSource, rawOcrText);
  return kept ? value : null;
}

function getFirstDetectedString(source: Record<string, unknown>) {
  const ignoredKeys = new Set([
    "labelImagePreview",
    "labelImageFile",
    "labelImageBase64",
    "imagePreview",
    "imageBase64",
  ]);
  for (const [key, value] of Object.entries(source)) {
    if (ignoredKeys.has(key)) continue;
    const normalized = normalizeLabelText(value);
    if (normalized) return normalized;
  }
  return "";
}

function sanitizeOcrLine(line: string) {
  return line
    .replace(/\s+/g, " ")
    .replace(/[|•·]/g, " ")
    .trim();
}

function base64ImageToBlob(base64: string, mimeType = "image/jpeg") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function splitOcrTextIntoLines(value: string) {
  return value
    .split(/\r?\n+/)
    .map(sanitizeOcrLine)
    .filter(Boolean);
}

function looksLikeProducerLine(line: string) {
  const normalized = line.toLowerCase();
  return /vinicola|vinícola|winery|bodega|cantina|producer|produtor|estate|vineyards|adega/.test(normalized);
}

function looksLikeNameLine(line: string) {
  const normalized = line.toLowerCase();
  if (normalized.length < 3) return false;
  if (looksLikeProducerLine(line)) return false;
  return (
    /reserva|reserve|riserva|chianti|malbec|cabernet|merlot|pinot|syrah|shiraz|chardonnay|sauvignon|riesling|brut|rosso|bianco|gran|grand|cru|classico/.test(normalized) ||
    /^[A-ZÀ-Ý0-9'’\-\s]{6,}$/.test(line)
  );
}

function extractNameFromFullText(fullText: string) {
  const lines = splitOcrTextIntoLines(fullText);
  const bestNamedLine = lines.find(looksLikeNameLine);
  if (bestNamedLine) return normalizeWineText(bestNamedLine) || bestNamedLine;
  const firstMeaningful = lines.find((line) => line.length >= 5 && !looksLikeProducerLine(line));
  return firstMeaningful ? normalizeWineText(firstMeaningful) || firstMeaningful : "";
}

function extractWineNameFromText(text?: string | null) {
  if (!text) return "";
  const lines = splitOcrTextIntoLines(text)
    .map((line) =>
      line
        .replace(/\b(wine|vinho|dry|red|white|rosso|bianco)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  const bestLine = lines.find(looksLikeNameLine);
  if (bestLine) return normalizeWineText(bestLine) || bestLine;
  const firstTwo = lines.slice(0, 2).join(" ").trim();
  return firstTwo ? normalizeWineText(firstTwo) || firstTwo : "";
}

function extractProducerFromFullText(fullText: string) {
  const lines = splitOcrTextIntoLines(fullText);
  const explicitProducer = lines.find(looksLikeProducerLine);
  if (explicitProducer) return normalizeWineText(explicitProducer) || explicitProducer;
  const fallback = lines.find((line) => !looksLikeNameLine(line) && line.length >= 4);
  return fallback ? normalizeWineText(fallback) || fallback : "";
}

function mapScanResultToInitialValues(rawResult: unknown, normalizedResult?: unknown): AddWinePrefillValues {
  const source = rawResult && typeof rawResult === "object" ? (rawResult as Record<string, unknown>) : {};
  const normalizedSource = normalizedResult && typeof normalizedResult === "object" ? (normalizedResult as Record<string, unknown>) : {};
  const normalized = normalizeScanResult(normalizedSource);
  const normalizedName = pickFirstMeaningfulString([
    normalized.name,
    normalizedSource.name,
    source.wineName,
    source.wine_name,
    source.name,
  ]);
  const normalizedProducer = pickFirstMeaningfulString([
    normalized.producer,
    normalizedSource.producer,
    source.producer,
    source.producer_name,
    source.producerName,
    source.winery,
    source.winemaker,
  ]);
  const fallbackVintage = parseInt(String(source.year ?? source.vintage_year ?? ""), 10);
  const normalizedVintage = normalized.vintage ?? (Number.isFinite(fallbackVintage) ? fallbackVintage : null);
  const normalizedStyle = pickFirstMeaningfulString([
    normalized.style,
    normalizedSource.style,
    source.style,
    source.wine_style,
    source.type,
  ]);
  const normalizedCountry = pickFirstMeaningfulString([
    normalized.country,
    normalizedSource.country,
    source.country,
    source.pais,
    source["país"],
  ]);
  const normalizedRegion = pickFirstMeaningfulString([
    normalized.region,
    normalizedSource.region,
    source.region,
    source.regiao,
    source["região"],
  ]);
  const normalizedGrape = pickFirstMeaningfulString([
    normalized.grape,
    normalizedSource.grape,
    source.grape,
    source.grapes,
    source.varietal,
    source.varieties,
  ]);
  const rawOcrText = getRawOcrText(source, normalizedSource);
  const confidentStyle = keepOnlyConfidentScanValue(normalizedStyle, "style", source, normalizedSource, rawOcrText);
  const confidentCountry = keepOnlyConfidentScanValue(normalizedCountry, "country", source, normalizedSource, rawOcrText);
  const confidentRegion = keepOnlyConfidentScanValue(normalizedRegion, "region", source, normalizedSource, rawOcrText);
  const confidentGrape = keepOnlyConfidentScanValue(normalizedGrape, "grape", source, normalizedSource, rawOcrText);
  const confidentName = keepOnlyConfidentScanValue(normalizedName, "name", source, normalizedSource, rawOcrText);
  const confidentProducer = keepOnlyConfidentScanValue(normalizedProducer, "producer", source, normalizedSource, rawOcrText);
  const confidentVintage = keepOnlyConfidentScanNumber(normalizedVintage, "vintage", source, normalizedSource, rawOcrText);
  const confidentPurchasePrice = keepOnlyConfidentScanNumber(normalized.purchase_price, "purchase_price", source, normalizedSource, rawOcrText);
  const confidentEstimatedPrice = keepOnlyConfidentScanNumber(normalized.estimated_price, "estimated_price", source, normalizedSource, rawOcrText);
  const confidentDrinkFrom = keepOnlyConfidentScanNumber(normalized.drink_from, "drink_from", source, normalizedSource, rawOcrText);
  const confidentDrinkUntil = keepOnlyConfidentScanNumber(normalized.drink_until, "drink_until", source, normalizedSource, rawOcrText);
  const confidentFoodPairing = keepOnlyConfidentScanValue(normalized.food_pairing || "", "food_pairing", source, normalizedSource, rawOcrText);
  const confidentCellarLocation = keepOnlyConfidentScanValue(normalized.cellar_location || "", "cellar_location", source, normalizedSource, rawOcrText);
  const mappedData: AddWinePrefillValues = {
    name: confidentName || null,
    producer: confidentProducer || null,
    vintage: confidentVintage,
    style: confidentStyle || null,
    country: confidentCountry || null,
    region: confidentRegion || null,
    grape: confidentGrape || null,
    grapes: confidentGrape || null,
    drinkFrom: confidentDrinkFrom,
    drinkUntil: confidentDrinkUntil,
    purchasePrice: confidentPurchasePrice,
    estimatedPrice: confidentEstimatedPrice,
    foodPairing: confidentFoodPairing || null,
    cellarLocation: confidentCellarLocation || null,
    confidence:
      (normalizedSource.confidence && typeof normalizedSource.confidence === "object"
        ? (normalizedSource.confidence as Record<string, number | null | undefined>)
        : source.confidence && typeof source.confidence === "object"
          ? (source.confidence as Record<string, number | null | undefined>)
          : null),
  };

  return mappedData;
}

export function AddWineDialog({ open, onOpenChange, initialScan = false, initialValues = null }: AddWineDialogProps) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";

  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [vintage, setVintage] = useState("");
  const [style, setStyle] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [lastPaid, setLastPaid] = useState("");
  const [lastPaidDate, setLastPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [noPriceInfo, setNoPriceInfo] = useState(false);
  const [currentValue, setCurrentValue] = useState("");
  const [currentValueTouched, setCurrentValueTouched] = useState(false);
  const [location, setLocation] = useState<StructuredLocation>({});
  const [noLocationInfo, setNoLocationInfo] = useState(false);
  const [drinkFrom, setDrinkFrom] = useState("");
  const [drinkUntil, setDrinkUntil] = useState("");
  const [foodPairing, setFoodPairing] = useState("");
  const [notes, setNotes] = useState("");
  const [labelImagePreview, setLabelImagePreview] = useState<string | null>(null);
  const [labelImageFile, setLabelImageFile] = useState<File | null>(null);
  const [labelImageBase64, setLabelImageBase64] = useState<string | null>(null);
  const [aiPrefilledFields, setAiPrefilledFields] = useState<Record<string, boolean>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [manualFormVisible, setManualFormVisible] = useState(false);
  const [addWineStep, setAddWineStep] = useState<AddWineStep>("choice");
  const [estimating, setEstimating] = useState(false);
  const [estimateConfidence, setEstimateConfidence] = useState<string | null>(null);
  const [estimateRange, setEstimateRange] = useState<{ min: number; max: number } | null>(null);
  const [scanHydrated, setScanHydrated] = useState(false);
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHydrationTraceRef = useRef<{ source: "scan" | "initialValues"; payload: AddWinePrefillValues } | null>(null);
  const finalFormStateLoggedRef = useRef(false);
  const commercialCost = lastPaid ? Number(lastPaid) : null;
  const commercialSale = currentValue ? Number(currentValue) : null;
  const commercialMargin =
    commercialCost != null && commercialSale != null && Number.isFinite(commercialCost) && Number.isFinite(commercialSale)
      ? commercialSale - commercialCost
      : null;
  const commercialMarginPct =
    commercialMargin != null && commercialCost != null && commercialCost > 0
      ? (commercialMargin / commercialCost) * 100
      : null;

  const addWine = useAddWine();
  const createLocation = useCreateWineLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (open && initialScan) {
      setScanOpen(true);
    }
  }, [open, initialScan]);

  // Debounced AI price estimation
  const fetchEstimate = useCallback(async (n: string, p: string, v: string, s: string, c: string, r: string, g: string) => {
    if (!n.trim()) return;
    setEstimating(true);
    setEstimateConfidence(null);
    try {
      const data = await invokeEdgeFunction<{ estimated_price?: number; confidence?: string | null; faixa_min?: number; faixa_max?: number; confianca?: string | null }>(
        "estimate-wine-price",
        {
          name: n.trim(),
          producer: p || null,
          vintage: v ? parseInt(v) : null,
          style: s || null,
          country: c || null,
          region: r || null,
          grape: g || null,
        },
      );
      if (data?.estimated_price) {
        if (isCommercial || !currentValueTouched) {
          setCurrentValue(String(data.estimated_price));
        }
        setEstimateConfidence(data.confianca || data.confidence || "media");
        setEstimateRange(
          typeof data.faixa_min === "number" && typeof data.faixa_max === "number"
            ? { min: data.faixa_min, max: data.faixa_max }
            : null,
        );
      }
    } catch {
      setEstimateConfidence(null);
      setEstimateRange(null);
    } finally {
      setEstimating(false);
    }
  }, [currentValueTouched, isCommercial]);

  useEffect(() => {
    if (!name.trim()) return;
    if (scanHydrated) return;
    if (estimateTimer.current) clearTimeout(estimateTimer.current);
    estimateTimer.current = setTimeout(() => {
      fetchEstimate(name, producer, vintage, style, country, region, grape);
    }, 1200);
    return () => { if (estimateTimer.current) clearTimeout(estimateTimer.current); };
  }, [name, producer, vintage, style, country, region, grape, fetchEstimate, scanHydrated]);

  const reset = useCallback(() => {
    setName(""); setProducer(""); setQuantity("1"); setVintage(""); setStyle("");
    setCountry(""); setRegion(""); setGrape(""); setLastPaid(""); setLastPaidDate(new Date().toISOString().split("T")[0]); setCurrentValue(""); setLocation({});
    setNoLocationInfo(false);
    setDrinkFrom(""); setDrinkUntil(""); setFoodPairing(""); setNotes("");
    setLabelImagePreview(null); setLabelImageFile(null); setLabelImageBase64(null); setNoPriceInfo(false);
    setEstimating(false); setEstimateConfidence(null); setEstimateRange(null); setCurrentValueTouched(false);
    setScanHydrated(false);
    setAiPrefilledFields({});
    setMissingFields([]);
    setSuccess(false);
    setManualFormVisible(false);
    setAddWineStep("choice");
  }, []);

  const applyScanPrefill = useCallback((prefill: AddWinePrefillValues) => {
    const nextPrefilled: Record<string, boolean> = {};
    setScanHydrated(true);

    if (isMeaningfulScanValue(prefill.name)) {
      setName(String(prefill.name));
      nextPrefilled.name = true;
    }
    if (isMeaningfulScanValue(prefill.producer)) {
      setProducer(String(prefill.producer));
      nextPrefilled.producer = true;
    }
    if (prefill.vintage != null) {
      setVintage(String(prefill.vintage));
      nextPrefilled.vintage = true;
    }
    if (isMeaningfulScanValue(prefill.style)) {
      const normalizedStyle = normalizeStyleFamily(String(prefill.style));
      const styleValue = normalizedStyle === "rosé" ? "rose" : normalizedStyle || String(prefill.style).trim().toLowerCase();
      setStyle(styleValue);
      nextPrefilled.style = true;
    }
    if (isMeaningfulScanValue(prefill.country)) {
      setCountry(String(prefill.country));
      nextPrefilled.country = true;
    }
    if (isMeaningfulScanValue(prefill.region)) {
      setRegion(String(prefill.region));
      nextPrefilled.region = true;
    }
    if (isMeaningfulScanValue(prefill.grape) || isMeaningfulScanValue(prefill.grapes)) {
      setGrape(String(prefill.grape ?? prefill.grapes));
      nextPrefilled.grape = true;
    }
    if (isMeaningfulScanValue(prefill.foodPairing)) {
      setFoodPairing(String(prefill.foodPairing));
      nextPrefilled.food_pairing = true;
    }
    if (prefill.drinkFrom != null) {
      setDrinkFrom(String(prefill.drinkFrom));
      nextPrefilled.drink_from = true;
    }
    if (prefill.drinkUntil != null) {
      setDrinkUntil(String(prefill.drinkUntil));
      nextPrefilled.drink_until = true;
    }
    if (prefill.purchasePrice != null) {
      setLastPaid(String(prefill.purchasePrice));
      setNoPriceInfo(false);
      nextPrefilled.purchase_price = true;
    }
    if (prefill.estimatedPrice != null) {
      setCurrentValue(String(prefill.estimatedPrice));
      nextPrefilled.current_value = true;
    }
    if (isMeaningfulScanValue(prefill.cellarLocation)) {
      setLocation({ manualLabel: String(prefill.cellarLocation) });
      setNoLocationInfo(false);
      nextPrefilled.cellar_location = true;
    }

    if (prefill.labelImagePreview) setLabelImagePreview(String(prefill.labelImagePreview));
    if (prefill.labelImageFile) setLabelImageFile(prefill.labelImageFile);
    if (prefill.labelImageBase64) setLabelImageBase64(String(prefill.labelImageBase64));

    setAiPrefilledFields(nextPrefilled);

    return nextPrefilled;
  }, []);

  const hydrateScanPrefill = useCallback((prefill: AddWinePrefillValues, source: "scan" | "initialValues", _scanMeta?: ScanResultEnvelope) => {
    pendingHydrationTraceRef.current = { source, payload: prefill };
    finalFormStateLoggedRef.current = false;
    setManualFormVisible(true);
    setAddWineStep("identity");
    const appliedFields = applyScanPrefill(prefill);

    return appliedFields;
  }, [applyScanPrefill]);

  const getRenderedFieldValue = useCallback(
    (_field: keyof AddWinePrefillValues, currentValue: string) => {
      if (isMeaningfulScanValue(currentValue)) return currentValue;
      return currentValue;
    },
    [],
  );

  useEffect(() => {
    if (!open || !initialValues) return;
    reset();
    hydrateScanPrefill(initialValues, "initialValues", {
      raw: initialValues as Record<string, unknown>,
      normalized: initialValues as Record<string, unknown>,
      labelImagePreview: initialValues.labelImagePreview ?? null,
      labelImageFile: initialValues.labelImageFile ?? null,
      labelImageBase64: initialValues.labelImageBase64 ?? null,
    });
  }, [hydrateScanPrefill, initialValues, open]);

  useEffect(() => {
    const pending = pendingHydrationTraceRef.current;
    if (!open || !pending || finalFormStateLoggedRef.current === true) return;

    finalFormStateLoggedRef.current = true;
    pendingHydrationTraceRef.current = null;
  }, [open, pendingHydrationTraceRef.current]);

  const handleScanComplete = (data: ScanResultEnvelope | Record<string, unknown>) => {
    const rawScan = data && typeof data === "object" && "raw" in data && data.raw && typeof data.raw === "object"
      ? (data.raw as Record<string, unknown>)
      : data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};
    const normalizedScan = data && typeof data === "object" && "normalized" in data && data.normalized && typeof data.normalized === "object"
      ? (data.normalized as Record<string, unknown>)
      : rawScan;
    const mappedData = mapScanResultToInitialValues(rawScan, normalizedScan);
    const prefill: AddWinePrefillValues = {
      name: mappedData.name || null,
      producer: mappedData.producer || null,
      vintage: mappedData.vintage,
      style: mappedData.style || null,
      country: mappedData.country || null,
      region: mappedData.region || null,
      grape: mappedData.grape || null,
      drinkFrom: mappedData.drink_from,
      drinkUntil: mappedData.drink_until,
      purchasePrice: mappedData.purchase_price,
      estimatedPrice: mappedData.estimated_price,
      foodPairing: mappedData.food_pairing,
      cellarLocation: mappedData.cellar_location,
    };

    reset();

    const appliedFields = hydrateScanPrefill({
      ...prefill,
      labelImagePreview: data?.labelImagePreview ?? null,
      labelImageFile: data?.labelImageFile ?? null,
      labelImageBase64: data?.labelImageBase64 ?? null,
    }, "scan", {
      raw: rawScan,
      normalized: normalizedScan,
      labelImagePreview: data?.labelImagePreview ?? null,
      labelImageFile: data?.labelImageFile ?? null,
      labelImageBase64: data?.labelImageBase64 ?? null,
    });

    const populatedCount = Object.keys(appliedFields).filter((field) => SCAN_PREFILL_FORM_FIELDS.includes(field as (typeof SCAN_PREFILL_FORM_FIELDS)[number])).length;
    if (populatedCount > 0) {
      toast({ title: isCommercial ? "Vinho interpretado" : "Rótulo interpretado" });
    }
  };

  const aiFieldStyle = (field: string) => aiPrefilledFields[field]
    ? {
        backgroundColor: "rgba(111,127,91,0.06)",
        borderColor: "rgba(111,127,91,0.28)",
        boxShadow: "0 0 0 1px rgba(111,127,91,0.12)",
      }
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addWineStep !== "review") return;
    if (!name.trim()) return;

    try {
      let imageUrl: string | null = null;
      if (labelImageBase64 && user) {
        try {
          const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
          const blob = base64ImageToBlob(labelImageBase64, "image/jpeg");
          const { error } = await supabase.storage.from("wishlist-images").upload(path, blob, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          });
          if (!error) {
            imageUrl = await resolveStorageImageUrl(path, { fallbackBucket: "wishlist-images" });
          }
        } catch (uploadError) {
          console.warn("Wine label upload failed, falling back to internet image lookup:", uploadError);
        }
      } else if (labelImageFile && user) {
        try {
          const ext = labelImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
          const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("wishlist-images").upload(path, labelImageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: labelImageFile.type,
          });
          if (!error) {
            imageUrl = await resolveStorageImageUrl(path, { fallbackBucket: "wishlist-images" });
          }
        } catch (uploadError) {
          console.warn("Wine label upload failed, falling back to internet image lookup:", uploadError);
        }
      }

      const formattedLocation = formatLocationLabel(location) || null;
      const normalizedPayload = normalizeWineData({
        name,
        producer,
        quantity: parseInt(quantity) || 1,
        vintage: vintage ? parseInt(vintage) : null,
        style,
        country,
        region,
        grape,
        purchase_price: lastPaid ? parseFloat(lastPaid) : null,
        current_value: currentValue ? parseFloat(currentValue) : null,
        cellar_location: formattedLocation,
        drink_from: drinkFrom ? parseInt(drinkFrom) : null,
        drink_until: drinkUntil ? parseInt(drinkUntil) : null,
        food_pairing: foodPairing || null,
        tasting_notes: notes || null,
        rating: null,
        image_url: imageUrl,
      }, { log: false });
      const inserted = await addWine.mutateAsync({
        name: normalizedPayload.name || name.trim(),
        producer: normalizedPayload.producer || null,
        quantity: parseInt(quantity) || 1,
        vintage: vintage ? parseInt(vintage) : null,
        style: normalizedPayload.style || style || null,
        country: normalizedPayload.country || null,
        region: normalizedPayload.region || null,
        grape: normalizedPayload.grape || null,
        purchase_price: lastPaid ? parseFloat(lastPaid) : null,
        current_value: currentValue ? parseFloat(currentValue) : null,
        cellar_location: formattedLocation,
        drink_from: drinkFrom ? parseInt(drinkFrom) : null,
        drink_until: drinkUntil ? parseInt(drinkUntil) : null,
        food_pairing: foodPairing || null,
        tasting_notes: notes || null,
        rating: null,
        image_url: imageUrl,
      });

      // Persist structured location — non-blocking so wine save succeeds even if location RPC fails
      if (inserted?.id && user) {
        try {
          const resp = typeof user.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : null;
          await createLocation.mutateAsync({
            wineId: inserted.id,
            sector: location.sector ?? null,
            zone: location.zone ?? null,
            level: location.level ?? null,
            position: location.position ?? null,
            manualLabel: location.manualLabel ?? null,
            quantity: parseInt(quantity) || 1,
            responsibleName: isCommercial ? resp : null,
            reason: isCommercial ? "Entrada manual" : null,
            notes: null,
          });
        } catch (locErr) {
          console.warn("Location save failed (wine was saved):", locErr);
        }
      }

      // Se não enviou foto, dispara resolver de imagem em background (busca rótulo na internet)
      if (inserted?.id && !imageUrl) {
        void invokeEdgeFunction(
          "wine-image-resolver",
          { wineId: inserted.id },
          { timeoutMs: 30_000, retries: 0 },
        ).catch((err) => console.warn("wine-image-resolver background failed:", err));
      }

      // Lembrete sobre campos opcionais não preenchidos
      const missing: string[] = [];
      if (isCommercial) {
        if (!lastPaid) missing.push("preço de custo");
        if (!currentValue) missing.push("preço de venda");
      } else {
        if (!lastPaid && !noPriceInfo) missing.push("último valor pago");
        if (!drinkFrom && !drinkUntil) missing.push("prazo para beber");
        if (!currentValue) missing.push("valor atual estimado");
      }
      setMissingFields(missing);

      setSuccess(true);
    } catch (err: unknown) {
      console.error("Wine save error:", err);
      toast({
        title: "Não foi possível concluir",
        description: getErrorReason(err, "Tente novamente em instantes."),
        variant: "destructive",
      });
    }
  };

  const startManualFlow = (step: AddWineStep = "identity") => {
    setManualFormVisible(true);
    setAddWineStep(step);
  };

  const currentStepIndex = addWineStep === "choice" ? -1 : addWineStepOrder.indexOf(addWineStep);
  const currentStepLabel = addWineStep !== "choice" ? addWineStepLabels[addWineStep] : "";
  const canGoBack = manualFormVisible && currentStepIndex >= 0;
  const canGoNext = manualFormVisible && addWineStep !== "review";
  const goBackStep = () => {
    if (!manualFormVisible || addWineStep === "choice") return;
    if (currentStepIndex <= 0) {
      setManualFormVisible(false);
      setAddWineStep("choice");
      return;
    }
    setAddWineStep(addWineStepOrder[currentStepIndex - 1]);
  };
  const goNextStep = () => {
    if (!manualFormVisible || addWineStep === "review") return;
    const nextStep = addWineStepOrder[Math.min(currentStepIndex + 1, addWineStepOrder.length - 1)];
    setAddWineStep(nextStep);
  };

  const reviewRows = [
    ["Vinho", name || "—"],
    ["Produtor", producer || "—"],
    ["Safra", vintage || "—"],
    ["Estilo", styles.find((item) => item.value === style)?.label || style || "—"],
    ["Quantidade", quantity || "1"],
    ["Local", noLocationInfo ? "Depois" : formatLocationLabel(location) || "—"],
    ["Valor", currentValue ? `R$ ${Number(currentValue).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"],
    ["Janela", [drinkFrom, drinkUntil].filter(Boolean).join("–") || "—"],
  ];

  return (
    <>
      <ActionDialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <ActionDialogContent
        className={cn(AI_MODAL_SHEET_CONTENT_CLASSNAME, "add-wine-modal")}
        style={AI_MODAL_SHEET_CONTENT_STYLE}
        aria-label={isCommercial ? "Cadastrar vinho" : "Adicionar vinho"}
      >
          <ActionDialogTitle className="sr-only">{isCommercial ? "Cadastrar vinho" : "Adicionar vinho"}</ActionDialogTitle>

          <AiModalShell>
          <AiModalHeaderBar>
            <AiModalHeader
              icon={<Wine className="h-5 w-5 text-[#7B1E2B]" />}
              title={isCommercial ? "Cadastrar vinho" : "Adicionar vinho"}
              tone="wine"
            />
          </AiModalHeaderBar>

          <AiModalBody>
          <AiModalSplitLayout>
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center gap-3 py-9"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(111,127,91,0.10)] text-[#6F7F5B]">
                    <Check className="h-5 w-5" />
                  </div>
                  <p className="text-[15px] font-medium" style={{ color: 'rgba(26,23,19,0.9)' }}>
                    {isCommercial ? "Vinho cadastrado!" : `${parseInt(quantity) || 1} garrafa(s) adicionada(s)!`}
                  </p>
                  {missingFields.length > 0 && (
                    <AiModalCard className="w-full space-y-1 rounded-[16px] px-3 py-2.5 text-left">
                      <p className="text-[12px] font-medium text-[rgba(72,60,46,0.76)]">
                        Campos sugeridos para completar depois
                      </p>
                      <p className="text-[11px] leading-5 text-[#6B6258]">
                        Faltaram {missingFields.join(", ")}. O cadastro já foi salvo e você pode editar essas informações quando quiser.
                      </p>
                    </AiModalCard>
                  )}
                  <div className="flex gap-2 w-full pt-1">
                    <AiModalActionButton
                      type="button"
                      variant="secondary"
                      className="mt-0 h-10 flex-1"
                      onClick={() => { reset(); onOpenChange(false); }}
                    >
                      Concluir
                    </AiModalActionButton>
                    <AiModalActionButton
                      type="button"
                      variant="primary"
                      className="mt-0 h-10 flex-1"
                      onClick={() => reset()}
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar outro
                    </AiModalActionButton>
                  </div>
                </motion.div>
              ) : (
                <motion.form id="add-wine-form" key="form" onSubmit={handleSubmit} className="add-wine-form add-wine-v3-form">
                  {!manualFormVisible ? (
                    <div className="add-wine-v3-choice">
                      <button
                        type="button"
                        className="add-wine-v3-option is-primary"
                        onClick={() => setScanOpen(true)}
                      >
                        <span className="add-wine-v3-option-icon">
                          <Camera className="h-4 w-4" />
                        </span>
                        <span>Escanear rótulo</span>
                      </button>

                      <button
                        type="button"
                        className="add-wine-v3-option"
                        onClick={() => setImportCsvOpen(true)}
                      >
                        <span className="add-wine-v3-option-icon is-gold">
                          <FileSpreadsheet className="h-4 w-4" />
                        </span>
                        <span>Importar arquivo</span>
                      </button>

                      <button
                        type="button"
                        className="add-wine-v3-option"
                        onClick={() => startManualFlow("identity")}
                      >
                        <span className="add-wine-v3-option-icon is-olive">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <span>Adicionar manualmente</span>
                      </button>

                      <button
                        type="button"
                        className="add-wine-v3-option"
                        onClick={() => startManualFlow("identity")}
                      >
                        <span className="add-wine-v3-option-icon">
                          <Search className="h-4 w-4" />
                        </span>
                        <span>Buscar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="add-wine-v3-flow">
                      <div className="add-wine-v3-progress" aria-label={`Etapa ${currentStepLabel}`}>
                        {addWineStepOrder.map((step, index) => (
                          <span
                            key={step}
                            className={cn(
                              "add-wine-v3-step-dot",
                              index === currentStepIndex && "is-current",
                              index < currentStepIndex && "is-done",
                            )}
                          >
                            {addWineStepLabels[step]}
                          </span>
                        ))}
                      </div>

                      {labelImagePreview && (
                        <div className="add-wine-label-preview add-wine-v3-label-preview">
                          <div className="add-wine-label-image">
                            <img
                              src={labelImagePreview}
                              alt="Foto do rótulo analisado"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-medium text-[rgba(26,23,19,0.9)]">Rótulo analisado</p>
                          </div>
                        </div>
                      )}

                      {addWineStep === "identity" && (
                        <section className="add-wine-v3-step-panel">
                          <div className="add-wine-field">
                            <label htmlFor="name">Vinho *</label>
                            <input
                              id="name"
                              value={getRenderedFieldValue("name", name)}
                              onChange={e => { setScanHydrated(false); setName(e.target.value); }}
                              placeholder="Nome no rótulo"
                              required
                              className="input-premium"
                              style={aiFieldStyle("name")}
                            />
                          </div>
                          <div className="add-wine-field">
                            <label htmlFor="producer">Produtor</label>
                            <input
                              id="producer"
                              value={getRenderedFieldValue("producer", producer)}
                              onChange={e => { setScanHydrated(false); setProducer(e.target.value); }}
                              placeholder="Produtor"
                              className="input-premium"
                              style={aiFieldStyle("producer")}
                            />
                          </div>
                          <div className="add-wine-field-grid">
                            <div className="add-wine-field">
                              <label htmlFor="vintage">Safra</label>
                              <input
                                id="vintage"
                                type="number"
                                value={getRenderedFieldValue("vintage", vintage)}
                                onChange={e => setVintage(e.target.value)}
                                placeholder="2020"
                                className="input-premium"
                                style={aiFieldStyle("vintage")}
                              />
                            </div>
                            <div className="add-wine-field">
                              <label>Estilo</label>
                              <Select value={getRenderedFieldValue("style", style)} onValueChange={setStyle}>
                                <SelectTrigger className="input-premium" style={{ color: getRenderedFieldValue("style", style) ? 'rgba(36,30,24,0.88)' : 'rgba(108,96,84,0.58)', ...(aiPrefilledFields.style ? aiFieldStyle("style") : {}) }}>
                                  <SelectValue placeholder="Estilo" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[16px] border border-[rgba(95,111,82,0.10)] bg-[rgba(252,249,244,0.98)] shadow-[0_22px_40px_-32px_rgba(58,51,39,0.26)]">
                                  {styles.map(s => <SelectItem key={s.value} value={s.value} className="text-[14px]" style={{ color: 'rgba(36,30,24,0.88)' }}>{s.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="add-wine-field-grid">
                            <div className="add-wine-field">
                              <label>País</label>
                              <input value={getRenderedFieldValue("country", country)} onChange={e => { setScanHydrated(false); setCountry(e.target.value); }} placeholder="País" className="input-premium" style={aiFieldStyle("country")} />
                            </div>
                            <div className="add-wine-field">
                              <label>Região</label>
                              <input value={getRenderedFieldValue("region", region)} onChange={e => { setScanHydrated(false); setRegion(e.target.value); }} placeholder="Região" className="input-premium" style={aiFieldStyle("region")} />
                            </div>
                          </div>
                          <div className="add-wine-field">
                            <label>Uva</label>
                            <input value={getRenderedFieldValue("grape", grape)} onChange={e => { setScanHydrated(false); setGrape(e.target.value); }} placeholder="Uva ou corte" className="input-premium" style={aiFieldStyle("grape")} />
                          </div>
                        </section>
                      )}

                      {addWineStep === "storage" && (
                        <section className="add-wine-v3-step-panel">
                          <div className="add-wine-field-grid">
                            <div className="add-wine-field">
                              <label htmlFor="qty">Quantidade</label>
                              <input
                                id="qty"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                className="input-premium"
                              />
                            </div>
                            <label className="add-wine-check-row add-wine-v3-check">
                              <input
                                id="no-location-info"
                                type="checkbox"
                                checked={noLocationInfo}
                                onChange={(e) => {
                                  setNoLocationInfo(e.target.checked);
                                  if (e.target.checked) setLocation({});
                                }}
                              />
                              <span>Definir localização depois</span>
                            </label>
                          </div>
                          <LocationFields
                            value={location}
                            onChange={setLocation}
                            label="Localização"
                            disabled={noLocationInfo}
                            className="add-wine-location-fields add-wine-v3-location"
                          />
                        </section>
                      )}

                      {addWineStep === "purchase" && (
                        <section className="add-wine-v3-step-panel">
                          {isCommercial ? (
                            <>
                              {commercialMarginPct != null && (
                                <div className="add-wine-margin-pill">
                                  Margem {commercialMargin >= 0 ? "+" : ""}{commercialMarginPct.toFixed(0)}%
                                </div>
                              )}
                              <div className="add-wine-field-grid">
                                <div className="add-wine-field">
                                  <label>Preço de custo</label>
                                  <input type="number" step="0.01" min="0" value={lastPaid} onChange={e => setLastPaid(e.target.value)} placeholder="0,00" className="input-premium" style={aiFieldStyle("purchase_price")} />
                                </div>
                                <div className="add-wine-field">
                                  <label>Preço de venda</label>
                                  <input type="number" step="0.01" min="0" value={currentValue} onChange={e => { setCurrentValue(e.target.value); setCurrentValueTouched(true); }} placeholder={estimating ? "Calculando..." : "0,00"} className="input-premium" style={{ opacity: estimating ? 0.6 : 1 }} />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <label className="add-wine-check-row add-wine-v3-check">
                                <input
                                  type="checkbox"
                                  checked={noPriceInfo}
                                  onChange={e => {
                                    setNoPriceInfo(e.target.checked);
                                    if (e.target.checked) {
                                      setLastPaid("");
                                      setLastPaidDate(new Date().toISOString().split("T")[0]);
                                    }
                                  }}
                                />
                                <span>Não sei o valor pago</span>
                              </label>
                              {!noPriceInfo && (
                                <div className="add-wine-field-grid">
                                  <div className="add-wine-field">
                                    <label>Último valor pago</label>
                                    <input type="number" step="0.01" min="0" value={lastPaid} onChange={e => setLastPaid(e.target.value)} placeholder="0,00" className="input-premium" style={aiFieldStyle("purchase_price")} />
                                  </div>
                                  <div className="add-wine-field">
                                    <label>Data</label>
                                    <input type="date" value={lastPaidDate} onChange={e => setLastPaidDate(e.target.value)} className="input-premium" />
                                  </div>
                                </div>
                              )}
                              <div className="add-wine-field">
                                <label>Valor atual estimado</label>
                                <div className="relative">
                                  <input type="number" step="0.01" min="0" value={currentValue} onChange={e => { setCurrentValue(e.target.value); setCurrentValueTouched(true); }} placeholder={estimating ? "Calculando..." : "0,00"} className="input-premium" style={{ opacity: estimating ? 0.6 : 1, ...(aiPrefilledFields.current_value ? aiFieldStyle("current_value") : {}) }} />
                                  {estimating && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#6F7F5B] border-t-transparent" />
                                    </div>
                                  )}
                                </div>
                                {estimateConfidence && (
                                  <p className="add-wine-microcopy">
                                    {estimateConfidence === "baixa" && estimateRange
                                      ? `R$ ${estimateRange.min.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} – ${estimateRange.max.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                                      : "Estimativa sugerida"}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </section>
                      )}

                      {addWineStep === "aging" && (
                        <section className="add-wine-v3-step-panel">
                          <div className="add-wine-field-grid">
                            <div className="add-wine-field">
                              <label>Abrir a partir de</label>
                              <input type="number" value={drinkFrom} onChange={e => setDrinkFrom(e.target.value)} placeholder="2024" className="input-premium" style={aiFieldStyle("drink_from")} />
                            </div>
                            <div className="add-wine-field">
                              <label>Guardar até</label>
                              <input type="number" value={drinkUntil} onChange={e => setDrinkUntil(e.target.value)} placeholder="2030" className="input-premium" style={aiFieldStyle("drink_until")} />
                            </div>
                          </div>
                          <div className="add-wine-field">
                            <label>Harmonização</label>
                            <input value={foodPairing} onChange={e => setFoodPairing(e.target.value)} placeholder="Carnes, massas, queijos" className="input-premium" style={aiFieldStyle("food_pairing")} />
                          </div>
                          {!isCommercial && (
                            <div className="add-wine-field">
                              <label>Notas</label>
                              <Textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Observações"
                                rows={3}
                                className={cn(AI_MODAL_TEXTAREA_CLASSNAME, "resize-none input-premium")}
                                style={aiFieldStyle("tasting_notes")}
                              />
                            </div>
                          )}
                        </section>
                      )}

                      {addWineStep === "review" && (
                        <section className="add-wine-v3-step-panel add-wine-v3-review">
                          <div className="add-wine-v3-review-head">
                            <Wine className="h-5 w-5" />
                            <span>Resumo</span>
                          </div>
                          <dl className="add-wine-v3-review-list">
                            {reviewRows.map(([label, value]) => (
                              <div key={label}>
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      )}
                    </div>
                  )}

                  {manualFormVisible && missingFields.length > 0 && (
                    <AiModalCard className="space-y-1 rounded-[16px] px-3 py-2.5">
                      <p className="text-[12px] font-medium text-[rgba(72,60,46,0.76)]">
                        Campos sugeridos para completar depois
                      </p>
                      <p className="text-[11px] leading-5 text-[#6B6258]">
                        Faltaram {missingFields.join(", ")}. O cadastro já foi salvo e você pode editar essas informações quando quiser.
                      </p>
                    </AiModalCard>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </AiModalSplitLayout>
          </AiModalBody>
          {!success && manualFormVisible && (
            <AiModalFooterBar className="add-wine-v3-footer">
              {canGoBack ? (
                <button
                  type="button"
                  className="add-wine-v3-back"
                  onClick={goBackStep}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              ) : null}

              {canGoNext ? (
                <button
                  type="button"
                  className="add-wine-v3-next"
                  onClick={goNextStep}
                  disabled={addWineStep === "identity" && !name.trim()}
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <AiModalActionButton
                  form="add-wine-form"
                  type="submit"
                  disabled={!name.trim()}
                  loading={addWine.isPending}
                  loadingText="Salvando…"
                  variant="primary"
                  className="add-wine-v3-submit"
                >
                  <Plus className="h-4 w-4" />
                  {isCommercial ? "Cadastrar vinho" : "Salvar vinho"}
                </AiModalActionButton>
              )}
            </AiModalFooterBar>
          )}
          </AiModalShell>
        </ActionDialogContent>
      </ActionDialog>

      <ScanWineLabelDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScanComplete={handleScanComplete}
      />
      <ImportCsvDialog open={importCsvOpen} onOpenChange={setImportCsvOpen} />
    </>
  );
}
