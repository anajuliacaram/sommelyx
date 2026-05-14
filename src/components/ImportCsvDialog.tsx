import { useMemo, useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, Check, AlertTriangle, X, Sparkles, Loader2, Search } from "@/icons/lucide";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { invokeEdgeFunction } from "@/lib/edge-invoke";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateWineLocation } from "@/hooks/useWineLocations";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useWines } from "@/hooks/useWines";
import { prepareAiAnalysisAttachment, prepareSmartPdfImportAttachment } from "@/lib/ai-attachments";
import { normalizeWineData, normalizeWineText } from "@/lib/wine-normalization";
import { getClientDeviceType, logFileRequestStart } from "@/lib/observability";
import { normalizeScanResult } from "@/lib/scan-normalizer";
import { AiModalActionButton, AiModalShell, AiModalHeaderBar, AiModalBody, AiModalFooterBar, AiToolbarSurface, AiMetricPill } from "@/components/ai-flow/ModalLayout";

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedWine {
  name: string;
  producer?: string | null;
  vintage?: number | null;
  style?: string | null;
  country?: string | null;
  region?: string | null;
  grape?: string | null;
  quantity?: number | null;
  purchase_price?: number | null;
  cellar_location?: string | null;
  drink_from?: number | null;
  drink_until?: number | null;
  status?: "valid" | "review" | "invalid";
}

interface DraftWine extends ParsedWine {
  type?: string;
  price?: number;
  confidence: number;
  fieldConfidence?: {
    name_confidence: number;
    producer_confidence: number;
    grape_confidence: number;
    vintage_confidence: number;
    country_confidence: number;
    region_confidence: number;
    style_confidence: number;
  };
  errors: string[];
  image_url?: string | null;
  duplicateWarning?: string | null;
  duplicateGroupKey?: string | null;
  duplicateIndexes?: number[];
}

interface ImportSourceRow {
  index: number;
  values: Record<string, string>;
}

interface ImportSummary {
  headerDetected: boolean;
  headerRowIndex?: number;
  priceColumn?: string;
  ignoredRows: number;
}

type EditableField =
  | "name"
  | "producer"
  | "vintage"
  | "style"
  | "quantity"
  | "purchase_price"
  | "current_value"
  | "country"
  | "region"
  | "grape"
  | "cellar_location"
  | "drink_from"
  | "drink_until";

type RowErrors = Partial<Record<"name" | "quantity", string>>;

type ColumnKind = "text" | "number" | "select";
type StatusFilter = "all" | "ready" | "review" | "invalid" | "duplicates" | "low_confidence";
type EmptyFilterField = "producer" | "vintage" | "grape" | "country" | "region" | "quantity" | "purchase_price";
type BulkTargetField = "producer" | "vintage" | "grape" | "country" | "region" | "quantity" | "purchase_price";
type BulkMode = "fill_empty" | "replace";
type BulkScope = "selected" | "filtered" | "all";

interface ColumnDef {
  key: EditableField;
  label: string;
  kind: ColumnKind;
  align?: "left" | "right";
  placeholder?: string;
  optional?: boolean;
}

const baseColumns: ColumnDef[] = [
  { key: "name", label: "Nome", kind: "text", placeholder: "Nome do vinho" },
  { key: "producer", label: "Produtor", kind: "text", placeholder: "Produtor", optional: true },
  { key: "vintage", label: "Safra", kind: "number", placeholder: "2020", optional: true },
  { key: "country", label: "País", kind: "text", placeholder: "País", optional: true },
  { key: "region", label: "Região", kind: "text", placeholder: "Região", optional: true },
  { key: "grape", label: "Uva", kind: "text", placeholder: "Uva", optional: true },
  { key: "quantity", label: "Quantidade", kind: "number", align: "right", placeholder: "1" },
  { key: "purchase_price", label: "Preço", kind: "number", align: "right", placeholder: "0,00", optional: true },
];

const emptyFieldOptions: Array<{ key: EmptyFilterField; label: string }> = [
  { key: "producer", label: "Produtor" },
  { key: "vintage", label: "Safra" },
  { key: "grape", label: "Uva" },
  { key: "country", label: "País" },
  { key: "region", label: "Região" },
  { key: "quantity", label: "Qtd." },
  { key: "purchase_price", label: "Preço" },
];

const bulkFieldOptions: Array<{ key: BulkTargetField; label: string; kind: "text" | "number" }> = [
  { key: "producer", label: "Produtor", kind: "text" },
  { key: "vintage", label: "Safra", kind: "number" },
  { key: "grape", label: "Uva", kind: "text" },
  { key: "country", label: "País", kind: "text" },
  { key: "region", label: "Região", kind: "text" },
  { key: "quantity", label: "Quantidade", kind: "number" },
  { key: "purchase_price", label: "Preço", kind: "number" },
];

export function ImportCsvDialog({ open, onOpenChange }: ImportCsvDialogProps) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";
  const [step, setStep] = useState<"upload" | "analyzing" | "preview" | "review" | "importing" | "done">("upload");
  const [draftWines, setDraftWines] = useState<DraftWine[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [aiNotes, setAiNotes] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [analysisStage, setAnalysisStage] = useState<"processing" | "extracting" | "parsing" | "normalizing">("processing");
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [editMode, setEditMode] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [emptyFieldFilters, setEmptyFieldFilters] = useState<EmptyFilterField[]>([]);
  const [bulkTargetField, setBulkTargetField] = useState<BulkTargetField>("producer");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkMode, setBulkMode] = useState<BulkMode>("fill_empty");
  const [bulkScope, setBulkScope] = useState<BulkScope>("selected");
  const [enriching, setEnriching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingRows, setProcessingRows] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [autoMergedDuplicates, setAutoMergedDuplicates] = useState(0);
  const [importWarningOpen, setImportWarningOpen] = useState(false);
  const [importWarningRows, setImportWarningRows] = useState<{ index: number; name: string; issues: string[] }[]>([]);
  const [importSourceRows, setImportSourceRows] = useState<ImportSourceRow[]>([]);
  const [importSourceHeaders, setImportSourceHeaders] = useState<string[]>([]);
  const [importSourceConfidence, setImportSourceConfidence] = useState(1);
  const [importSummary, setImportSummary] = useState<ImportSummary>({ headerDetected: false, ignoredRows: 0 });
  const [importMode, setImportMode] = useState<"standard" | "smart-pdf" | "image">("standard");
  const fileRef = useRef<HTMLInputElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const { data: cellarWines } = useWines();
  const addWine = useAddWine();
  const createLocation = useCreateWineLocation();
  const { toast } = useToast();

  const MAX_CLIENT_INPUT_CHARS = 1_900_000; // keep request under edge limit after JSON overhead

  const logImportRows = (label: string, rows: unknown) => {
    console.log(`[IMPORT] ${label}`, rows);
  };

  const normalizeText = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const cleaned = value.trim().replace(/\s+/g, " ");
    return cleaned.length ? cleaned : undefined;
  };

  const pickFirstValue = (source: Record<string, unknown>, aliases: string[]) => {
    for (const alias of aliases) {
      const value = source[alias];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return undefined;
  };

  const looksLikeSyntheticName = (value?: string | null) => {
    const normalized = normalizeText(value);
    if (!normalized) return true;
    return /^vinho sem nome$/i.test(normalized) || /^linha\s+\d+$/i.test(normalized);
  };

  const CSV_FIELD_ALIASES = {
    name: ["name", "wine", "wine_name", "wineName", "nome", "nome_vinho", "vinho", "produto", "label", "title"],
    producer: ["producer", "producer_name", "produtor", "winery", "winery_name", "vinicola", "vinícola", "brand", "marca"],
    vintage: ["vintage", "year", "ano", "safra", "vintage_year"],
    style: ["style", "type", "tipo", "estilo"],
    country: ["country", "pais", "país", "origem"],
    region: ["region", "regiao", "região", "appellation"],
    grape: ["grape", "grapes", "varietal", "varieties", "uva", "uvas"],
    quantity: ["quantity", "qty", "quantidade"],
    purchase_price: ["purchase_price", "price", "preco", "preço", "custo", "valor"],
    cellar_location: ["cellar_location", "localizacao", "localização", "adega", "location"],
    drink_from: ["drink_from", "drinkFrom", "beber_de"],
    drink_until: ["drink_until", "drinkUntil", "beber_ate", "beber_até"],
  } as const;

  const getObjectValues = (value: unknown) => {
    if (!value || typeof value !== "object") return [] as string[];
    return Object.values(value as Record<string, unknown>)
      .map((entry) => normalizeText(entry))
      .filter((entry): entry is string => !!entry);
  };

  const inferNameFromUnknownRow = (row: unknown) => {
    const explicitName = normalizeText(pickFirstValue(row ?? {}, [...CSV_FIELD_ALIASES.name]));
    if (explicitName && !looksLikeSyntheticName(explicitName)) return explicitName;
    const objectValues = getObjectValues(row);
    const firstColumn = objectValues[0];
    if (firstColumn && !looksLikeSyntheticName(firstColumn)) return firstColumn;
    const joined = normalizeText(objectValues.join(" "));
    if (joined && !looksLikeSyntheticName(joined)) return joined;
    return "";
  };

  const normalizeRow = (row?: Partial<ParsedWine> | null): ParsedWine => {
    const safeName = looksLikeSyntheticName(row?.name) ? "" : normalizeText(row?.name) || "";
    return {
      name: safeName,
      producer: normalizeText(row?.producer) ?? null,
      vintage: parseYear(row?.vintage ?? null) ?? null,
      style: normalizeStyle(row?.style || undefined) || null,
      country: normalizeText(row?.country) ?? null,
      region: normalizeText(row?.region) ?? null,
      grape: normalizeText(row?.grape) ?? null,
      quantity: parseQuantity(row?.quantity) ?? 1,
      purchase_price: parsePrice(row?.purchase_price ?? null) ?? null,
      cellar_location: normalizeText(row?.cellar_location) ?? null,
      drink_from: parseYear(row?.drink_from ?? null) ?? null,
      drink_until: parseYear(row?.drink_until ?? null) ?? null,
      status: row?.status ?? resolveParsedStatus({
        name: safeName,
        producer: normalizeText(row?.producer) ?? null,
        country: normalizeText(row?.country) ?? null,
        grape: normalizeText(row?.grape) ?? null,
        vintage: parseYear(row?.vintage ?? null) ?? null,
        purchase_price: parsePrice(row?.purchase_price ?? null) ?? null,
      }),
    };
  };

  const setParsedRows = (rows: ParsedWine[]) => {
    logImportRows("raw_rows", rows);
    const parsedRows = normalizeImportedWines(rows);
    logImportRows("normalized_rows", parsedRows);
    const normalizedRows = normalizeDraftRows(parsedRows);
    logImportRows("rows_for_review_ui", normalizedRows);
    console.log("[FINAL ROWS FOR UI]", normalizedRows);
    if (normalizedRows.length === 0) {
      throw new Error("CSV_EMPTY_ROWS");
    }
    setDraftWines(normalizedRows);
    setStep(normalizedRows.length > 0 ? "review" : "preview");
    return normalizedRows;
  };

  const parseNumberLoose = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return undefined;
      const cleaned = raw
        .replace(/\s/g, "")
        .replace(/[R$r$€£]/gi, "")
        .replace(/[^0-9,.-]/g, "")
        .replace(/\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".");
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };

  const parseYear = (value: unknown) => {
    const n = parseNumberLoose(value);
    if (n === undefined) return undefined;
    const year = Math.trunc(n);
    const max = new Date().getFullYear() + 1;
    if (year < 1900 || year > max) return undefined;
    return year;
  };

  const parseQuantity = (value: unknown) => {
    const n = parseNumberLoose(value);
    if (n === undefined) return 1;
    const qty = Math.min(9_999, Math.max(1, Math.trunc(n)));
    return Number.isFinite(qty) ? qty : 1;
  };

  const parsePrice = (value: unknown) => {
    const n = parseNumberLoose(value);
    if (n === undefined || n < 0 || n > 200_000) return undefined;
    return Number(n.toFixed(2));
  };

  const formatPrice = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
    return "";
  };

  const normalizeStyle = (value: unknown) => {
    const style = normalizeText(value)?.toLowerCase();
    if (!style) return undefined;
    if (style.includes("espum") || style.includes("champ")) return "espumante";
    if (style.includes("ros")) return "rose";
    if (style.includes("fort")) return "fortificado";
    if (style.includes("sobrem")) return "sobremesa";
    if (style.includes("branc") || style.includes("white")) return "branco";
    if (style.includes("tint") || style.includes("red")) return "tinto";
    return style;
  };

  const resolveParsedStatus = (row: {
    name?: string | null;
    producer?: string | null;
    country?: string | null;
    grape?: string | null;
    vintage?: number | null;
    purchase_price?: number | null;
    price?: number | null;
    style?: string | null;
    type?: string | null;
  }): ParsedWine["status"] => {
    if (!normalizeText(row.name)) return "invalid";
    const hasCoreFields =
      !!normalizeText(row.producer) &&
      !!normalizeText(row.country) &&
      !!normalizeText(row.grape) &&
      !!row.vintage;
    return hasCoreFields ? "valid" : "review";
  };

  const normalizeType = (value: unknown) => normalizeStyle(value);

  const normalizeSearchText = (value?: string | null) =>
    (value || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const similarityScore = (left?: string | null, right?: string | null) => {
    const a = normalizeSearchText(left);
    const b = normalizeSearchText(right);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.85;
    const aTokens = a.split(" ").filter(Boolean);
    const bTokens = b.split(" ").filter(Boolean);
    const overlap = aTokens.filter((token) => bTokens.includes(token)).length;
    const denom = Math.max(aTokens.length, bTokens.length, 1);
    return overlap / denom;
  };

  const scoreDraftRow = (row: DraftWine) => {
    let score = 0.25;
    if (row.name?.trim()) score += 0.3;
    if (row.type?.trim() || row.style?.trim()) score += 0.15;
    if (row.producer?.trim()) score += 0.15;
    if (row.vintage) score += 0.05;
    if (row.quantity && row.quantity > 0) score += 0.05;
    if (row.country?.trim() || row.region?.trim() || row.grape?.trim()) score += 0.05;
    if (row.image_url) score += 0.05;
    if (row.errors.length > 0) score -= Math.min(0.25, row.errors.length * 0.08);
    return Math.max(0, Math.min(1, Number(score.toFixed(2))));
  };

  const fieldConfidence = (value: unknown, inferred = false) => {
    if (value === undefined || value === null || value === "") return 0.08;
    return inferred ? 0.72 : 0.96;
  };

  const draftToParsed = (row: DraftWine): ParsedWine => ({
    name: row.name,
    producer: row.producer,
    vintage: row.vintage,
    style: row.type || row.style,
    country: row.country,
    region: row.region,
    grape: row.grape,
    quantity: row.quantity,
    purchase_price: row.price ?? row.purchase_price,
    cellar_location: row.cellar_location,
    drink_from: row.drink_from,
    drink_until: row.drink_until,
  });

  const LARGE_IMPORT_DUPLICATE_THRESHOLD = 220;

  const buildDraftRow = (row: ParsedWine, index: number, sourceRows: ParsedWine[] = []): DraftWine => {
    const type = normalizeType(row.style);
    const duplicateGroupKey = normalizeSearchText(row.name);
    const shouldCheckDuplicates = sourceRows.length > 0 && sourceRows.length <= LARGE_IMPORT_DUPLICATE_THRESHOLD;
    const duplicates = shouldCheckDuplicates
      ? sourceRows.filter((candidate, candidateIndex) => {
          if (candidateIndex === index) return false;
          const nameSimilarity = similarityScore(candidate.name, row.name);
          const producerSimilarity = similarityScore(candidate.producer, row.producer);
          return nameSimilarity > 0.82 || (nameSimilarity > 0.68 && producerSimilarity > 0.5);
        })
      : [];
    const duplicateIndexes = shouldCheckDuplicates
      ? sourceRows
          .map((candidate, candidateIndex) => {
            if (candidateIndex === index) return null;
            const nameSimilarity = similarityScore(candidate.name, row.name);
            const producerSimilarity = similarityScore(candidate.producer, row.producer);
            return nameSimilarity > 0.82 || (nameSimilarity > 0.68 && producerSimilarity > 0.5) ? candidateIndex : null;
          })
          .filter((value): value is number => value !== null)
      : [];
    const cellarDuplicate = shouldCheckDuplicates
      ? cellarWines?.find((wine) => {
          const nameSimilarity = similarityScore(wine.name, row.name);
          const producerSimilarity = similarityScore(wine.producer, row.producer);
          return nameSimilarity > 0.82 || (nameSimilarity > 0.68 && producerSimilarity > 0.5);
        })
      : null;

    const errors: string[] = [];
    if (!row.name?.trim()) errors.push("Nome obrigatório");
    if (!row.quantity || row.quantity <= 0) errors.push("Quantidade precisa ser maior que 0");
    const status = row.status ?? (errors.length === 0 ? "valid" : errors.some((error) => error.includes("Nome")) ? "invalid" : "review");

    const confidence = scoreDraftRow({
      ...row,
      type,
      price: row.purchase_price,
      confidence: 0,
      errors,
    });

    return {
      ...row,
      type,
      price: row.purchase_price,
      confidence,
      status,
      fieldConfidence: {
        name_confidence: fieldConfidence(row.name),
        producer_confidence: fieldConfidence(row.producer),
        grape_confidence: fieldConfidence(row.grape),
        vintage_confidence: fieldConfidence(row.vintage),
        country_confidence: fieldConfidence(row.country),
        region_confidence: fieldConfidence(row.region),
        style_confidence: fieldConfidence(type || row.style),
      },
      errors,
      image_url: cellarDuplicate?.image_url || null,
      duplicateWarning: shouldCheckDuplicates && (duplicates.length > 0 || cellarDuplicate) ? `Possível duplicado${duplicates.length + 1 > 1 || cellarDuplicate ? "s" : ""} detectado${duplicates.length + 1 > 1 || cellarDuplicate ? "s" : ""}` : null,
      duplicateGroupKey,
      duplicateIndexes,
    };
  };

  const normalizeDraftRows = (rows: Array<ParsedWine | DraftWine>) => {
    const parsedRows = rows.map((row) => draftToParsed(row as DraftWine));
    return rows.map((row, index) => {
      const base = buildDraftRow(parsedRows[index], index, parsedRows);
      const source = row as DraftWine;
      return {
        ...base,
        image_url: source.image_url || base.image_url,
        price: source.price ?? base.price,
        purchase_price: source.purchase_price ?? base.purchase_price,
        duplicateWarning: base.duplicateWarning,
        duplicateIndexes: base.duplicateIndexes,
        duplicateGroupKey: base.duplicateGroupKey,
      };
    });
  };

  const dedupeImportedRows = (rows: ParsedWine[]) => {
    const normalized = rows.map((row) => normalizeWineData({
      ...row,
      name: row.name,
      producer: row.producer ?? null,
      grape: row.grape ?? null,
      country: row.country ?? null,
      region: row.region ?? null,
    }, { log: false }));
    const merged: ParsedWine[] = [];
    let duplicateCount = 0;

    for (const row of normalized) {
      const key = normalizeSearchText(`${row.name}|${row.producer || ""}|${row.vintage || ""}`);
      const existingIndex = merged.findIndex((candidate) =>
        normalizeSearchText(`${candidate.name}|${candidate.producer || ""}|${candidate.vintage || ""}`) === key ||
        (similarityScore(candidate.name, row.name) > 0.92 && similarityScore(candidate.producer, row.producer) > 0.7)
      );
      if (existingIndex >= 0) {
        duplicateCount++;
        merged[existingIndex] = {
          ...merged[existingIndex],
          producer: merged[existingIndex].producer || row.producer,
          vintage: merged[existingIndex].vintage ?? row.vintage,
          style: merged[existingIndex].style || row.style,
          country: merged[existingIndex].country || row.country,
          region: merged[existingIndex].region || row.region,
          grape: merged[existingIndex].grape || row.grape,
          quantity: (merged[existingIndex].quantity || 1) + (row.quantity || 1),
          purchase_price: merged[existingIndex].purchase_price ?? row.purchase_price,
          cellar_location: merged[existingIndex].cellar_location || row.cellar_location,
          drink_from: merged[existingIndex].drink_from ?? row.drink_from,
          drink_until: merged[existingIndex].drink_until ?? row.drink_until,
        };
      } else {
        merged.push(row);
      }
    }

    return { rows: merged.map((row) => normalizeWineData(row)), duplicateCount };
  };

  const buildFallbackRowsFromSourceRows = (sourceRows: ImportSourceRow[], headers: string[] = []) => {
    return sourceRows.map((sourceRow, index) => {
      try {
        const values = Object.values(sourceRow.values).map((value) => normalizeText(value)).filter((value): value is string => !!value);
        const headerValue = (headerName: string) => {
          const entry = headers.find((header) => normalizeSearchText(header) === normalizeSearchText(headerName));
          return entry ? normalizeText(sourceRow.values[entry]) : undefined;
        };
        const rawName = headerValue("name") || headerValue("nome") || values[0] || normalizeText(values.join(" ")) || "";
        const fallbackName = normalizeText(rawName);
        const rawProducer = headerValue("producer") || headerValue("produtor") || values[1] || null;
        const rawCountry = headerValue("country") || headerValue("país") || headerValue("pais") || values.find((value) => /Brasil|Argentina|Chile|Portugal|França|Itália|Espanha|Estados Unidos/i.test(value)) || null;
        const rawGrape = headerValue("grape") || headerValue("uva") || values.find((value) => /Blend|Cabernet|Merlot|Malbec|Chardonnay|Syrah|Pinot|Sauvignon|Riesling|Tempranillo/i.test(value)) || null;
        const rawVintage = parseYear(headerValue("vintage") || headerValue("safra") || values.find((value) => /\b(19|20)\d{2}\b/.test(value))) ?? null;
        const rawPrice = parsePrice(headerValue("price") || headerValue("preço") || headerValue("preco") || values.find((value) => /R\$|\d+[.,]\d{2}/.test(value))) ?? null;
        const rawRegion = headerValue("region") || headerValue("região") || headerValue("regiao") || null;
        const rawStyle = normalizeStyle(headerValue("type") || headerValue("style") || values.find((value) => /Tinto|Branco|Ros[eé]|Espumante|Fortificado/i.test(value))) || null;
        const rawCellarLocation = headerValue("cellar_location") || headerValue("localização") || headerValue("localizacao") || null;
        return normalizeRow({
          name: fallbackName || "",
          producer: rawProducer,
          vintage: rawVintage,
          style: rawStyle,
          country: rawCountry,
          region: rawRegion,
          grape: rawGrape,
          quantity: 1,
          purchase_price: rawPrice,
          cellar_location: rawCellarLocation,
          drink_from: parseYear(headerValue("drink_from") || headerValue("beber de")) ?? null,
          drink_until: parseYear(headerValue("drink_until") || headerValue("beber até") || headerValue("beber ate")) ?? null,
          status: resolveParsedStatus({
            name: normalizeText(rawName),
            producer: rawProducer,
            country: rawCountry,
            grape: rawGrape,
            vintage: rawVintage,
            purchase_price: rawPrice,
          }),
        });
      } catch (error) {
        console.warn("[ImportCsvDialog] fallback row normalization failed", { index, error });
        return normalizeRow({
          name: "",
          producer: null,
          country: null,
          grape: null,
          vintage: null,
          quantity: 1,
          purchase_price: null,
          cellar_location: null,
          drink_from: null,
          drink_until: null,
          status: "review",
        });
      }
    });
  };

  const normalizeImportedWines = (rows: any[] = []) =>
    rows.map((w, index) => {
      try {
        const rawName = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.name]) || inferNameFromUnknownRow(w);
        const rawProducer = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.producer]) || getObjectValues(w)[1];
        const rawVintage = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.vintage]) || getObjectValues(w)[2];
        const rawStyle = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.style]);
        const rawCountry = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.country]);
        const rawRegion = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.region]);
        const rawGrape = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.grape]);
        const rawQuantity = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.quantity]);
        const rawPurchasePrice = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.purchase_price]);
        const rawCellarLocation = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.cellar_location]);
        const rawDrinkFrom = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.drink_from]);
        const rawDrinkUntil = pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.drink_until]);
        const safeRow = normalizeRow({
          name: normalizeText(rawName) || "",
          producer: normalizeText(rawProducer) ?? null,
          vintage: parseYear(rawVintage) ?? null,
          style: normalizeStyle(rawStyle) || null,
          country: normalizeText(rawCountry) ?? null,
          region: normalizeText(rawRegion) ?? null,
          grape: normalizeText(rawGrape) ?? null,
          quantity: parseQuantity(rawQuantity),
          purchase_price: parsePrice(rawPurchasePrice) ?? null,
          cellar_location: normalizeText(rawCellarLocation) ?? null,
          drink_from: parseYear(rawDrinkFrom) ?? null,
          drink_until: parseYear(rawDrinkUntil) ?? null,
          status: w?.status,
        });
        const parsed = normalizeWineData({
          ...safeRow,
          name: safeRow.name,
          producer: safeRow.producer ?? null,
          grape: safeRow.grape ?? null,
          country: safeRow.country ?? null,
          region: safeRow.region ?? null,
        }, { log: false });
        const normalized = {
          ...safeRow,
          ...parsed,
          name: smartNormalizeImportedName(parsed.name || safeRow.name, parsed.country || safeRow.country),
          producer: parsed.producer ?? safeRow.producer ?? null,
          country: parsed.country ?? safeRow.country ?? null,
          grape: parsed.grape ?? safeRow.grape ?? null,
          region: parsed.region ?? safeRow.region ?? null,
          vintage: parsed.vintage ?? safeRow.vintage ?? null,
          style: parsed.style ?? safeRow.style ?? null,
          purchase_price: parsed.purchase_price ?? safeRow.purchase_price ?? null,
          cellar_location: parsed.cellar_location ?? safeRow.cellar_location ?? null,
          drink_from: parsed.drink_from ?? safeRow.drink_from ?? null,
          drink_until: parsed.drink_until ?? safeRow.drink_until ?? null,
        } satisfies ParsedWine;
        console.log("[CSV NORMALIZED ROW]", normalized);
        return {
          ...normalized,
          status: resolveParsedStatus({
            name: normalized.name,
            producer: normalized.producer ?? null,
            country: normalized.country ?? null,
            grape: normalized.grape ?? null,
            vintage: normalized.vintage ?? null,
            purchase_price: normalized.purchase_price ?? null,
          }),
        };
      } catch (error) {
        console.warn("[ImportCsvDialog] normalizeImportedWines row failed", { index, error, row: w });
        return normalizeRow({
          name: inferNameFromUnknownRow(w),
          producer: normalizeText(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.producer]) || getObjectValues(w)[1]) ?? null,
          country: normalizeText(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.country])) ?? null,
          grape: normalizeText(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.grape])) ?? null,
          vintage: parseYear(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.vintage]) || getObjectValues(w)[2]) ?? null,
          style: normalizeStyle(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.style])) || null,
          quantity: parseQuantity(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.quantity])),
          purchase_price: parsePrice(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.purchase_price])) ?? null,
          cellar_location: normalizeText(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.cellar_location])) ?? null,
          drink_from: parseYear(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.drink_from])) ?? null,
          drink_until: parseYear(pickFirstValue(w ?? {}, [...CSV_FIELD_ALIASES.drink_until])) ?? null,
          status: "review",
        });
      }
    });

  const inferTypeFromText = (value?: string | null) => {
    const text = normalizeSearchText(value);
    if (!text) return undefined;
    if (text.includes("espum") || text.includes("champ")) return "espumante";
    if (text.includes("ros")) return "rose";
    if (text.includes("fort")) return "fortificado";
    if (text.includes("sobrem")) return "sobremesa";
    if (text.includes("branc") || text.includes("white")) return "branco";
    if (text.includes("tint") || text.includes("red")) return "tinto";
    return undefined;
  };

  const findBestCellarMatch = (row: DraftWine) => {
    const options = cellarWines ?? [];
    let best: (typeof options)[number] | null = null;
    let bestScore = 0;
    for (const wine of options) {
      const score =
        similarityScore(wine.name, row.name) * 0.55 +
        similarityScore(wine.producer, row.producer) * 0.2 +
        similarityScore(wine.grape, row.grape) * 0.1 +
        similarityScore(wine.region, row.region) * 0.1 +
        similarityScore(wine.country, row.country) * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = wine;
      }
    }
    return bestScore >= 0.48 ? { wine: best, score: bestScore } : null;
  };

  const enrichDraftRows = async (sourceRows: DraftWine[] = draftWines) => {
    setEnriching(true);
    try {
      // Identify rows that need enrichment (missing producer/country/region/grape/style)
      const rowsNeedingEnrichment = sourceRows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) =>
          row.name?.trim() && (!row.producer || !row.country || !row.region || !row.grape || !row.style),
        );

      // Build a CSV-style batch payload: one chunk of up to 30 wines per AI call
      // This is dramatically faster than 1 call per row.
      const BATCH_SIZE = 30;
      const aiResultsByName = new Map<string, any>();

      setProcessingTotal(rowsNeedingEnrichment.length || sourceRows.length);
      setProcessingRows(0);

      for (let i = 0; i < rowsNeedingEnrichment.length; i += BATCH_SIZE) {
        const batch = rowsNeedingEnrichment.slice(i, i + BATCH_SIZE);
        const csvLines = ["name,producer,vintage"];
        for (const { row } of batch) {
          const safeName = (row.name || "").replace(/"/g, '""');
          const safeProducer = (row.producer || "").replace(/"/g, '""');
          csvLines.push(`"${safeName}","${safeProducer}",${row.vintage ?? ""}`);
        }
        try {
          const ai = await invokeEdgeFunction<{ wines?: any[] }>(
            "parse-csv-wines",
            { csvContent: csvLines.join("\n"), fileName: "enrich-batch.csv", fileType: "text/csv" },
            { timeoutMs: 90_000, retries: 1 },
          );
          for (const w of ai?.wines || []) {
            if (w && typeof w === "object" && typeof w.name === "string") {
              aiResultsByName.set(normalizeSearchText(w.name), w);
            }
          }
        } catch (batchErr) {
          console.warn("Enrichment batch failed", batchErr);
        } finally {
          setProcessingRows(Math.min(rowsNeedingEnrichment.length || sourceRows.length, i + batch.length));
        }
      }

      // Apply AI enrichment + price estimation per row (in parallel for prices, capped)
      const PRICE_CONCURRENCY = 5;
      const enriched: DraftWine[] = [];
      for (let i = 0; i < sourceRows.length; i += PRICE_CONCURRENCY) {
        const slice = sourceRows.slice(i, i + PRICE_CONCURRENCY);
        const settled = await Promise.all(
          slice.map(async (row) => {
            const match = findBestCellarMatch(row);
            const aiMatch = aiResultsByName.get(normalizeSearchText(row.name)) || {};
            const inferredType =
              row.type ||
              normalizeStyle(aiMatch.style) ||
              inferTypeFromText(row.name) ||
              inferTypeFromText(row.producer) ||
              inferTypeFromText(row.grape);

            const aiEnriched = {
              producer: row.producer || (typeof aiMatch.producer === "string" ? aiMatch.producer : undefined),
              country: row.country || (typeof aiMatch.country === "string" ? aiMatch.country : undefined),
              region: row.region || (typeof aiMatch.region === "string" ? aiMatch.region : undefined),
              grape: row.grape || (typeof aiMatch.grape === "string" ? aiMatch.grape : undefined),
              style: row.style || row.type || normalizeStyle(aiMatch.style),
              vintage: row.vintage ?? (typeof aiMatch.vintage === "number" ? aiMatch.vintage : undefined),
            };

            let resolvedPrice = row.price ?? row.purchase_price;
            if (resolvedPrice == null) {
              try {
                const result = await invokeEdgeFunction<{ estimated_price?: number }>(
                  "estimate-wine-price",
                  {
                    name: row.name,
                    producer: row.producer || aiEnriched.producer || match?.wine?.producer || null,
                    vintage: row.vintage ?? aiEnriched.vintage ?? match?.wine?.vintage ?? null,
                    style: inferredType || aiEnriched.style || row.style || null,
                    country: row.country || aiEnriched.country || match?.wine?.country || null,
                    region: row.region || aiEnriched.region || match?.wine?.region || null,
                    grape: row.grape || aiEnriched.grape || match?.wine?.grape || null,
                  },
                  { timeoutMs: 30_000, retries: 0 },
                );
                if (typeof result?.estimated_price === "number") {
                  resolvedPrice = result.estimated_price;
                }
              } catch {
                // Keep undefined if price estimation fails
              }
            }

            const finalStyle = aiEnriched.style || inferredType || row.type || row.style;
            const nextRow: DraftWine = {
              ...row,
              name: row.name?.trim() || row.name,
              producer: row.producer || aiEnriched.producer || match?.wine?.producer || undefined,
              vintage: row.vintage ?? aiEnriched.vintage ?? match?.wine?.vintage ?? undefined,
              type: finalStyle,
              style: finalStyle,
              country: row.country || aiEnriched.country || match?.wine?.country || undefined,
              region: row.region || aiEnriched.region || match?.wine?.region || undefined,
              grape: row.grape || aiEnriched.grape || match?.wine?.grape || undefined,
              price: resolvedPrice,
              purchase_price: resolvedPrice,
              image_url: row.image_url || match?.wine?.image_url || null,
            };
            const validation = computeRowErrors([nextRow])[0];
            const errors = validation ? (Object.values(validation).filter(Boolean) as string[]) : [];
            return {
              ...nextRow,
              errors,
              confidence: scoreDraftRow({ ...nextRow, errors }),
              duplicateWarning: row.duplicateWarning || (match ? "Combinação semelhante à sua adega" : null),
            };
          }),
        );
        enriched.push(...settled);
      }

      setDraftWines(enriched);
      setProcessingRows(sourceRows.length);
      toast({
        title: "Dados enriquecidos",
        description: `Produtor, região, uva, tipo e preço completados em ${enriched.length} vinho(s).`,
      });
    } catch (err) {
      console.error("Enrichment error:", err);
      toast({
        title: "Não foi possível completar todos os dados",
        description: "Tente novamente em alguns instantes ou complete manualmente.",
        variant: "destructive",
      });
    } finally {
      setEnriching(false);
      setProcessingRows(0);
      setProcessingTotal(0);
    }
  };

  const autoFixImportedRows = async () => {
    if (draftWines.length === 0) return;
    try {
      const parsedRows = draftWines.map((row) => draftToParsed(row));
      const deduped = dedupeImportedRows(parsedRows);
      setAutoMergedDuplicates(deduped.duplicateCount);
      const normalized = normalizeDraftRows(deduped.rows);
      setDraftWines(normalized);
      setSelectedRows([]);
      await enrichDraftRows(normalized);
    } catch (error) {
      console.error("Auto-fix error:", error);
      toast({
        title: "Não foi possível corrigir automaticamente",
        description: "Revise os dados manualmente e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const mergeDraftRows = (primaryIndex: number, duplicateIndex: number) => {
    syncRows((current) => {
      const primary = current[primaryIndex];
      const duplicate = current[duplicateIndex];
      if (!primary || !duplicate) return current;
      const merged: DraftWine = {
        ...primary,
        producer: primary.producer || duplicate.producer,
        vintage: primary.vintage ?? duplicate.vintage,
        type: primary.type || duplicate.type,
        style: primary.style || duplicate.style,
        country: primary.country || duplicate.country,
        region: primary.region || duplicate.region,
        grape: primary.grape || duplicate.grape,
        quantity: Math.max(primary.quantity || 1, 1) + Math.max(duplicate.quantity || 1, 1),
        price: primary.price ?? duplicate.price,
        purchase_price: primary.purchase_price ?? duplicate.purchase_price,
        image_url: primary.image_url || duplicate.image_url,
      };
      const next = current.filter((_, index) => index !== duplicateIndex);
      next[primaryIndex > duplicateIndex ? primaryIndex - 1 : primaryIndex] = {
        ...merged,
        errors: computeRowErrors([merged])[0] ? (Object.values(computeRowErrors([merged])[0]).filter(Boolean) as string[]) : [],
        confidence: scoreDraftRow({ ...merged, errors: [] }),
        duplicateWarning: null,
      };
      return next.map((row, index) => ({
        ...row,
        confidence: scoreDraftRow(row),
        errors: computeRowErrors(next)[index] ? (Object.values(computeRowErrors(next)[index]).filter(Boolean) as string[]) : [],
      }));
    });
    setSelectedRows([]);
  };

  const mergeSelectedRows = () => {
    if (selectedRows.length < 2) return;
    const [primary, duplicate] = [...selectedRows].sort((a, b) => a - b);
    mergeDraftRows(primary, duplicate);
  };

  const getResponsibleName = () => {
    const fullName = normalizeText(user?.user_metadata?.full_name);
    const preferredName = normalizeText(user?.user_metadata?.name);
    const emailName = normalizeText(user?.email?.split("@")[0]?.replace(/[._-]+/g, " "));
    return fullName || preferredName || emailName || "Equipe Sommelyx";
  };

  const getImportErrorLabel = (err: unknown) => {
    const e = err as any;
    const message = String(e?.message || e?.details || e?.error_description || "Falha ao salvar no banco");
    if (/not authenticated|auth required|jwt|session/i.test(message)) {
      return "Sessão expirada. Faça login novamente para continuar.";
    }
    if (/safra inválida/i.test(message)) return "Safra inválida";
    if (/quantidade inválida|invalid quantity/i.test(message)) return "Quantidade inválida";
    if (/numeric|number|invalid input syntax/i.test(message)) return "Preço ou número inválido";
    return message;
  };

  const computeRowErrors = (rows: DraftWine[]) => {
    const nextErrors: Record<number, RowErrors> = {};
    rows.forEach((row, index) => {
      const errors: RowErrors = {};
      if (!row.name?.trim()) {
        errors.name = "Nome obrigatório";
      }
      if (!row.quantity || row.quantity <= 0) {
        errors.quantity = "Quantidade precisa ser maior que 0";
      }
      if (Object.keys(errors).length > 0) {
        nextErrors[index] = errors;
      }
    });
    return nextErrors;
  };

  const addBlankRow = () => {
    syncRows((current) => [
      ...current,
      {
        name: "",
        producer: "",
        type: "tinto",
        style: "tinto",
        quantity: 1,
        confidence: 0,
        errors: [],
      } as DraftWine,
    ]);
  };

  const removeRow = (index: number) => {
    syncRows((current) => current.filter((_, i) => i !== index));
    setSelectedRows((current) => current.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
  };

  const removeSelectedRows = () => {
    if (selectedRows.length === 0) return;
    const set = new Set(selectedRows);
    syncRows((current) => current.filter((_, i) => !set.has(i)));
    setSelectedRows([]);
  };

  const STYLE_ACCENT: Record<string, { bar: string; dot: string; chip: string; chipText: string }> = {
    tinto: { bar: "#7B1E2B", dot: "#7B1E2B", chip: "rgba(123,30,43,0.10)", chipText: "#7B1E2B" },
    branco: { bar: "#C8A96A", dot: "#C8A96A", chip: "rgba(200,169,106,0.16)", chipText: "#8A6E2E" },
    rose: { bar: "#E8A0A6", dot: "#E8A0A6", chip: "rgba(232,160,166,0.18)", chipText: "#A34C68" },
    espumante: { bar: "#6A8F6B", dot: "#6A8F6B", chip: "rgba(106,143,107,0.16)", chipText: "#3F5E40" },
    sobremesa: { bar: "#A67C52", dot: "#A67C52", chip: "rgba(166,124,82,0.16)", chipText: "#6F4F2C" },
    fortificado: { bar: "#6B2C2C", dot: "#6B2C2C", chip: "rgba(107,44,44,0.14)", chipText: "#4A1010" },
  };

  const accentForRow = (row: DraftWine) => {
    const key = (row.type || row.style || "").toLowerCase();
    return STYLE_ACCENT[key] || { bar: "#D4D0C7", dot: "#A39A90", chip: "rgba(0,0,0,0.05)", chipText: "#5F5F5F" };
  };

  const syncRows = (updater: (rows: DraftWine[]) => DraftWine[]) => {
    setDraftWines((current) => {
      const next = updater(current);
      const normalized = normalizeDraftRows(next);
      const validation = computeRowErrors(normalized);
      return normalized.map((row, index) => {
        const nextErrors = validation[index] ? (Object.values(validation[index]).filter(Boolean) as string[]) : [];
        const nextRow = { ...row, errors: nextErrors } as DraftWine;
        return {
          ...nextRow,
          confidence: scoreDraftRow(nextRow),
        };
      });
    });
  };

  const yieldToBrowser = () => new Promise<void>((resolve) => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      resolve();
      return;
    }
    window.requestAnimationFrame(() => resolve());
  });

  const readTextFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const decoders = ["utf-8", "windows-1252", "iso-8859-1"];
    for (const encoding of decoders) {
      try {
        const decoded = new TextDecoder(encoding as any, { fatal: false }).decode(bytes);
        const cleaned = decoded.replace(/^\uFEFF/, "");
        if (cleaned.trim()) return cleaned;
      } catch {
        continue;
      }
    }
    return "";
  };

  const readSpreadsheetAsCsv = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await yieldToBrowser();
      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      await yieldToBrowser();
      const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) return "";
      const ws = wb.Sheets[sheetName];
      const utils = XLSX.utils || xlsxModule.utils;
      return utils.sheet_to_csv(ws, { FS: ",", RS: "\n" });
    } catch (error) {
      const err = new Error("Não conseguimos ler esta planilha.");
      (err as any).code = "INVALID_SPREADSHEET";
      throw err;
    }
  };

  const readPdfAsText = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await yieldToBrowser();
      const pdfjsModule = await import("pdfjs-dist");
      const pdfjs = pdfjsModule.default || pdfjsModule;

      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as any).promise;
      const maxPages = Math.min(doc.numPages, 12);
      const pages: string[] = [];
      for (let p = 1; p <= maxPages; p++) {
        await yieldToBrowser();
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const line = (content.items || [])
          .map((it: any) => String(it.str || "").trim())
          .filter(Boolean)
          .join(" ");
        if (line) pages.push(line);
      }
      return pages.join("\n");
    } catch (error) {
      const err = new Error("Não conseguimos ler este PDF.");
      (err as any).code = "INVALID_PDF";
      throw err;
    }
  };

  const readWordAsText = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const mammothModule = await (0, eval)("import('mammoth')");
      const mammoth = mammothModule.default || mammothModule;
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value || "";
    } catch {
      const err = new Error("Arquivos Word precisam ser convertidos em PDF, XLSX ou CSV para importação.");
      (err as any).code = "UNSUPPORTED_FILE_TYPE";
      throw err;
    }
  };

  const fileToCsvLikeText = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (ext === "xlsx" || ext === "xls" || ext === "ods") {
      return await readSpreadsheetAsCsv(file);
    }
    if (ext === "pdf") {
      return await readPdfAsText(file);
    }
    if (ext === "docx" || ext === "doc") {
      return await readWordAsText(file);
    }
    // csv/tsv/txt and any other text file fallback
    return await readTextFile(file);
  };

  // ── LOCAL DETERMINISTIC CSV PARSER ──
  // Auto-detects delimiter (`,`, `;`, `\t`, `|`), maps PT/EN headers, returns parsed wines.
  const detectDelimiter = (sample: string): string => {
    const candidates = [",", ";", "\t", "|"];
    const firstLine = sample.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
    let best = ",";
    let bestCount = 0;
    for (const d of candidates) {
      const count = firstLine.split(d).length - 1;
      if (count > bestCount) {
        bestCount = count;
        best = d;
      }
    }
    return best;
  };

  const splitCsvLine = (line: string, delimiter: string): string[] => {
    const out: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    out.push(current);
    return out.map((c) => c.trim().replace(/^"|"$/g, ""));
  };

  const HEADER_ALIAS: Record<string, EditableField> = {
    // name
    nome: "name", "nome do vinho": "name", vinho: "name", produto: "name", rotulo: "name", rótulo: "name", name: "name", wine: "name", label: "name", wine_name: "name", nome_vinho: "name",
    // producer
    produtor: "producer", produtor_name: "producer", vinicola: "producer", vinícola: "producer", marca: "producer", winery: "producer", producer: "producer", brand: "producer",
    // vintage
    safra: "vintage", ano: "vintage", year: "vintage", vintage: "vintage",
    // style
    tipo: "style", estilo: "style", style: "style", type: "style", categoria: "style",
    // country
    pais: "country", país: "country", country: "country", origem: "country",
    // region
    regiao: "region", região: "region", region: "region", "denominação": "region", denominacao: "region", appellation: "region",
    // grape
    uva: "grape", uvas: "grape", varietal: "grape", grape: "grape", cepage: "grape", cépage: "grape", grapes: "grape",
    // quantity
    quantidade: "quantity", qtd: "quantity", qte: "quantity", qty: "quantity", quantity: "quantity", estoque: "quantity", garrafas: "quantity",
    // price
    preco: "purchase_price", preço: "purchase_price", "preço de compra": "purchase_price", "preco de compra": "purchase_price",
    valor: "purchase_price", custo: "purchase_price", price: "purchase_price", cost: "purchase_price",
    // location
    "localizacao": "cellar_location", "localização": "cellar_location", local: "cellar_location", adega: "cellar_location", location: "cellar_location", posicao: "cellar_location", posição: "cellar_location",
    // drink window
    "beber de": "drink_from", "drink from": "drink_from", "consumir de": "drink_from",
    "beber ate": "drink_until", "beber até": "drink_until", "drink until": "drink_until", "consumir ate": "drink_until", "consumir até": "drink_until",
  };

  const normalizeHeader = (h: string) =>
    h
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const mapHeaderToField = (header: string): EditableField | undefined => {
    const norm = normalizeHeader(header);
    if (HEADER_ALIAS[norm]) return HEADER_ALIAS[norm];
    // partial match
    for (const [alias, field] of Object.entries(HEADER_ALIAS)) {
      if (norm.includes(alias) || alias.includes(norm)) return field;
    }
    return undefined;
  };

  const isUnnamedHeader = (header: string) => {
    const norm = normalizeHeader(header);
    return !norm || /^unnamed/i.test(norm) || /^col(una)?\s*\d+$/i.test(norm);
  };

  const scoreHeaderRow = (cells: string[]) => {
    const normalized = cells.map((cell) => normalizeHeader(cell));
    let score = 0;
    for (const cell of normalized) {
      if (!cell) continue;
      if (cell.includes("descricao") || cell.includes("descrição")) score += 4;
      if (cell.includes("ean")) score += 3;
      if (cell.includes("preco") || cell.includes("preço") || cell.includes("price")) score += 4;
      if (cell.includes("produto")) score += 3;
      if (cell.includes("distribuidor") || cell.includes("distribuidora")) score += 2;
      if (cell.includes("valor") || cell.includes("custo")) score += 1.5;
      if (cell.includes("unnamed")) score -= 1;
    }
    return score;
  };

  const findHeaderRowIndex = (lines: string[], delimiter: string) => {
    let bestIndex = 0;
    let bestScore = -1;
    const limit = Math.min(lines.length, 20);
    for (let i = 0; i < limit; i++) {
      const cells = splitCsvLine(lines[i], delimiter);
      const score = scoreHeaderRow(cells);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    return { headerRowIndex: bestIndex, headerScore: bestScore };
  };

  const extractWineFieldsFromDescription = (description: string) => {
    const cleaned = normalizeText(description) || "";
    const countryKeywords = [
      "Argentina",
      "Chile",
      "Brasil",
      "Portugal",
      "França",
      "France",
      "Itália",
      "Italy",
      "Espanha",
      "Spain",
      "Uruguai",
      "Uruguay",
      "Alemanha",
      "Germany",
      "África do Sul",
      "South Africa",
      "Estados Unidos",
      "USA",
    ];
    const yearMatch = cleaned.match(/\b(19|20)\d{2}\b/);
    const countryMatch = countryKeywords.find((keyword) => normalizeSearchText(cleaned).includes(normalizeSearchText(keyword)));
    const pieces = cleaned
      .replace(/\s+\|\s+/g, " - ")
      .replace(/\s{2,}/g, " ")
      .split(/[-–—|]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    let producer: string | undefined;
    let name: string | undefined;
    if (pieces.length >= 2) {
      producer = normalizeWineText(pieces[0]) || undefined;
      name = normalizeWineText(pieces.slice(1).join(" ")) || undefined;
    }

    if (!name) {
      const withoutYear = cleaned.replace(/\b(19|20)\d{2}\b/g, "").trim();
      const tokens = withoutYear.split(/\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        producer = producer || normalizeWineText(tokens.slice(0, Math.min(2, tokens.length - 1)).join(" ")) || undefined;
        name = normalizeWineText(tokens.slice(Math.min(2, tokens.length - 1)).join(" ")) || normalizeWineText(withoutYear) || undefined;
      } else {
        name = normalizeWineText(withoutYear) || undefined;
      }
    }

    if (name && producer && name.toLowerCase().startsWith(producer.toLowerCase())) {
      name = normalizeWineText(name.replace(new RegExp(`^${producer}\\s*[-–—:]?\\s*`, "i"), "")) || name;
    }

    return {
      name: name || normalizeWineText(cleaned) || "",
      producer,
      vintage: yearMatch ? Number.parseInt(yearMatch[0], 10) : undefined,
      country: countryMatch ? normalizeWineText(countryMatch) : undefined,
    };
  };

  const parseDistributorPrice = (rowCells: string[], headerCells: string[]) => {
    const headerIndexes = headerCells
      .map((header, index) => ({ header: normalizeHeader(header), index }))
      .filter(({ header }) => header.length > 0);
    const preferredIndex = headerIndexes.find(({ header }) =>
      header.includes("distribuidor 4") ||
      header.includes("distribuidora 4") ||
      header.includes("4%") ||
      header.includes("distribuidor") && header.includes("4"),
    )?.index;
    const explicitIndex = headerIndexes.find(({ header }) =>
      header.includes("preco") ||
      header.includes("preço") ||
      header.includes("price") ||
      header.includes("valor") ||
      header.includes("custo"),
    )?.index;
    const candidateIndexes = [preferredIndex, explicitIndex].filter((value): value is number => typeof value === "number");
    for (const index of candidateIndexes) {
      const parsed = parsePrice(rowCells[index]);
      if (parsed !== undefined) return parsed;
    }
    for (let i = 0; i < rowCells.length; i++) {
      const parsed = parsePrice(rowCells[i]);
      if (parsed !== undefined) return parsed;
    }
    return undefined;
  };

  const mapSourceRowsToWines = (sourceRows: ImportSourceRow[], mapping: Record<string, string>): ParsedWine[] => {
    return sourceRows.map((sourceRow, index) => {
      try {
        const row: Partial<ParsedWine> = {};
        Object.entries(mapping).forEach(([sourceHeader, field]) => {
          const value = sourceRow.values[sourceHeader];
          if (!field || value === undefined || value === null || String(value).trim() === "") return;
          if (field === "vintage" || field === "drink_from" || field === "drink_until") {
            row[field] = parseYear(value) ?? null;
          } else if (field === "quantity") {
            row.quantity = parseQuantity(value);
          } else if (field === "purchase_price") {
            row.purchase_price = parsePrice(value) ?? null;
          } else if (field === "style") {
            row.style = normalizeStyle(value) || null;
          } else {
            (row as any)[field] = normalizeText(value) ?? null;
          }
        });

        const sourceFallbackName = inferNameFromUnknownRow(sourceRow.values);

        const normalized = normalizeWineData({
          name: normalizeText(row.name) || sourceFallbackName || "",
          producer: row.producer ?? null,
          grape: row.grape ?? null,
          country: row.country ?? null,
          region: row.region ?? null,
        }, { log: false });

        return normalizeRow({
          name: normalized.name || normalizeText(row.name) || sourceFallbackName || "",
          producer: row.producer ?? normalized.producer ?? null,
          vintage: row.vintage ?? normalized.vintage ?? null,
          style: row.style ?? normalized.style ?? null,
          country: row.country ?? normalized.country ?? null,
          region: row.region ?? normalized.region ?? null,
          grape: row.grape ?? normalized.grape ?? null,
          quantity: row.quantity ?? 1,
          purchase_price: row.purchase_price ?? normalized.purchase_price ?? null,
          cellar_location: row.cellar_location ?? normalized.cellar_location ?? null,
          drink_from: row.drink_from ?? normalized.drink_from ?? null,
          drink_until: row.drink_until ?? normalized.drink_until ?? null,
        });
      } catch (error) {
        console.warn("[ImportCsvDialog] mapSourceRowsToWines row failed", { index, error, sourceRow });
        return normalizeRow({
          name: inferNameFromUnknownRow(sourceRow.values),
          producer: null,
          country: null,
          grape: null,
          vintage: null,
          quantity: 1,
          purchase_price: null,
          cellar_location: null,
          drink_from: null,
          drink_until: null,
          status: "review",
        });
      }
    });
  };

  const parseCsvLocally = (text: string): {
    wines: ParsedWine[];
    mapping: Record<string, string>;
    headers: string[];
    sourceRows: ImportSourceRow[];
    confidence: number;
    successRate: number;
    manualMappingRequired: boolean;
    headerRowIndex: number;
    priceColumn?: string;
    ignoredRows: number;
    failureReason?: string;
    totalRows: number;
    cleanedRows: number;
    confidenceDistribution: { high: number; medium: number; low: number };
  } => {
    const empty = {
      wines: [],
      mapping: {},
      headers: [],
      sourceRows: [],
      confidence: 0,
      successRate: 0,
      manualMappingRequired: true,
      headerRowIndex: 0,
      priceColumn: undefined,
      ignoredRows: 0,
      failureReason: "Arquivo não contém estrutura reconhecível",
      totalRows: 0,
      cleanedRows: 0,
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
    };
    if (!text || !text.trim()) return empty;

    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const allLines = normalized.split("\n");
    const cleanedLines = allLines.map((line) => line.trim()).filter((line) => line.length > 0 && !/^[-=*_•·\s|]+$/.test(line));
    console.log("LINES_COUNT:", cleanedLines.length);
    if (cleanedLines.length === 0) return { ...empty, totalRows: allLines.length, cleanedRows: 0 };

    const priceRegex = /R\$?\s?(\d+[.,]\d{2})/i;
    const moneyRegex = /(?:R\$|[$€£])\s?(\d+[.,]\d{2})/i;
    const yearRegex = /\b(19|20)\d{2}\b/;
    const countryCodes = new Set(["FRA", "ARG", "ITA", "POR", "ESP", "CHI", "CHL", "USA", "AUS", "NZL", "DEU", "GER", "PRT"]);
    const countryWords = ["França", "France", "Argentina", "Chile", "Itália", "Italy", "Portugal", "Espanha", "Spain", "Brasil", "Brazil", "Estados Unidos", "USA", "Austrália", "Australia", "Nova Zelândia", "New Zealand", "Alemanha", "Germany", "África do Sul", "South Africa"];

    const stripPrefixes = (value: string) =>
      value
        .replace(/^\s*VINHO\s+(FRA|ARG|ITA|POR|ESP|CHI|CHL|USA|AUS|NZL|DEU|GER|PRT)\s+/i, "")
        .replace(/^\s*VINHO\s+/i, "")
        .replace(/\b(EXCLUSIVO|CATÁLOGO|CATALOGO|PROMOÇÃO|PROMOCAO|OFERTA|NOVO|NOVIDADE)\b/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

    const extractPrice = (textValue: string) => {
      const match = textValue.match(priceRegex) || textValue.match(moneyRegex);
      if (match?.[1]) return parsePrice(match[1]);
      const candidates = textValue.match(/\b\d+[.,]\d{2}\b/g) || [];
      for (const candidate of candidates) {
        const parsed = parsePrice(candidate);
        if (parsed !== undefined) return parsed;
      }
      return undefined;
    };

    const normalizeCountryToken = (value: string) => {
      const cleaned = normalizeText(value);
      if (!cleaned) return undefined;
      const upper = cleaned.toUpperCase();
      if (countryCodes.has(upper)) {
        const map: Record<string, string> = {
          FRA: "França",
          ARG: "Argentina",
          ITA: "Itália",
          POR: "Portugal",
          ESP: "Espanha",
          CHI: "Chile",
          CHL: "Chile",
          USA: "Estados Unidos",
          AUS: "Austrália",
          NZL: "Nova Zelândia",
          DEU: "Alemanha",
          GER: "Alemanha",
          PRT: "Portugal",
        };
        return map[upper];
      }
      const lower = normalizeSearchText(cleaned);
      const match = countryWords.find((word) => normalizeSearchText(word) === lower || normalizeSearchText(word).includes(lower) || lower.includes(normalizeSearchText(word)));
      return match ? normalizeWineText(match) || cleaned : undefined;
    };

    const scoreHeaderRow = (cells: string[]) => {
      const normalizedCells = cells.map((cell) => normalizeSearchText(cell));
      let score = 0;
      for (const cell of normalizedCells) {
        if (!cell) continue;
        if (cell.includes("descricao") || cell.includes("descrição")) score += 5;
        if (cell.includes("produto")) score += 4;
        if (cell.includes("vinho")) score += 4;
        if (cell.includes("nome")) score += 3;
        if (cell.includes("preco") || cell.includes("preço") || cell.includes("valor") || cell.includes("custo")) score += 4;
        if (cell.includes("distribuidor")) score += 3;
        if (cell.includes("ean")) score += 2;
      }
      return score;
    };

    const scanWindow = cleanedLines.slice(0, 30);
    const headerRowIndex = (() => {
      let bestIndex = 0;
      let bestScore = -1;
      for (let i = 0; i < scanWindow.length; i++) {
        const cells = scanWindow[i].includes(",") || scanWindow[i].includes(";") || scanWindow[i].includes("\t") || scanWindow[i].includes("|")
          ? splitCsvLine(scanWindow[i], detectDelimiter(scanWindow[i]))
          : scanWindow[i].split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
        const score = scoreHeaderRow(cells);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      return bestIndex;
    })();

    const headerLine = scanWindow[headerRowIndex] || "";
    const delimiter = detectDelimiter(headerLine || cleanedLines[0] || ",");
    const structured = (headerLine.split(delimiter).length >= 2 || cleanedLines.some((line) => line.split(delimiter).length >= 2));
    const headerCellsRaw = structured ? splitCsvLine(headerLine, delimiter) : [];
    const headers = structured ? headerCellsRaw.filter((header) => !isUnnamedHeader(header)) : ["raw_line", "name", "producer", "price", "vintage", "country", "type"];
    const mapping: Record<string, string> = {};
    const sourceRows: ImportSourceRow[] = [];
    const wines: ParsedWine[] = [];
    const confidenceDistribution = { high: 0, medium: 0, low: 0 };
    let ignoredRows = 0;
    let cleanedRowCount = 0;
    let currentProducer: string | undefined;

    const scoreWine = (row: ParsedWine) => {
      let score = 0;
      if (row.name?.trim()) score += 0.35;
      if (row.purchase_price != null) score += 0.35;
      if (row.producer?.trim()) score += 0.15;
      if (row.vintage) score += 0.1;
      if (row.country?.trim()) score += 0.05;
      return Number(Math.min(1, score).toFixed(2));
    };

    const registerWine = (row: ParsedWine, rawValues: Record<string, string>, fallbackName?: string) => {
      const normalizedName = normalizeWineData({
        name: stripPrefixes(row.name || fallbackName || ""),
        producer: row.producer ?? null,
        grape: row.grape ?? null,
        country: row.country ?? null,
        region: row.region ?? null,
      }, { log: false }).name;
      const objectValueFallback = normalizeText(Object.values(rawValues).join(" "));
      const safeName =
        normalizedName && normalizedName.trim().length >= 2
          ? normalizedName
          : (normalizeWineText(fallbackName || row.name || Object.values(rawValues)[0] || objectValueFallback || "") || "");
      const price = typeof row.purchase_price === "number" ? row.purchase_price : undefined;
      const parsedRow: ParsedWine = {
        name: safeName,
        producer: row.producer?.trim() || undefined,
        vintage: row.vintage,
        style: row.style,
        country: row.country?.trim() || undefined,
        region: row.region?.trim() || undefined,
        grape: row.grape?.trim() || undefined,
        quantity: row.quantity ?? 1,
        purchase_price: price,
        cellar_location: row.cellar_location?.trim() || undefined,
        drink_from: row.drink_from,
        drink_until: row.drink_until,
        status: !safeName?.trim() ? "invalid" : "review",
      };
      const confidence = scoreWine(parsedRow);
      if (confidence >= 0.8) confidenceDistribution.high++;
      else if (confidence >= 0.55) confidenceDistribution.medium++;
      else confidenceDistribution.low++;
      wines.push(parsedRow);
      return true;
    };

    const inferTypeFromRow = (textValue: string) => {
      const inferred = inferTypeFromText(textValue) || normalizeStyle(textValue);
      return inferred;
    };

    const parseDelimitedRows = () => {
      const dataStart = headerRowIndex + 1;
      const headerFieldMap = headerCellsRaw.map((header) => mapHeaderToField(header));
      const priceHeaderIndex = headerCellsRaw.findIndex((header) => {
        const norm = normalizeSearchText(header);
        return norm.includes("preco") || norm.includes("preço") || norm.includes("valor") || norm.includes("custo") || norm.includes("price") || norm.includes("4%");
      });
      const nameHeaderIndex = headerCellsRaw.findIndex((header) => {
        const norm = normalizeSearchText(header);
        return norm.includes("descricao") || norm.includes("descrição") || norm.includes("produto") || norm.includes("vinho") || norm.includes("nome") || norm.includes("item");
      });
      const producerHeaderIndex = headerCellsRaw.findIndex((header) => {
        const norm = normalizeSearchText(header);
        return norm.includes("produtor") || norm.includes("vinicola") || norm.includes("vinícola") || norm.includes("producer") || norm.includes("winery") || norm.includes("marca");
      });
      const vintageHeaderIndex = headerCellsRaw.findIndex((header) => {
        const norm = normalizeSearchText(header);
        return norm.includes("safra") || norm.includes("vintage") || norm.includes("ano") || norm.includes("year");
      });
      const countryHeaderIndex = headerCellsRaw.findIndex((header) => {
        const norm = normalizeSearchText(header);
        return norm.includes("pais") || norm.includes("país") || norm.includes("country") || norm.includes("origem");
      });

      headerCellsRaw.forEach((header, index) => {
        const mapped = headerFieldMap[index];
        if (mapped) mapping[header] = mapped;
      });

      for (let rowIndex = dataStart; rowIndex < cleanedLines.length; rowIndex++) {
        const line = cleanedLines[rowIndex];
        if (!line || /^[-=*_•·\s|]+$/.test(line)) continue;
        const cells = splitCsvLine(line, delimiter);
        const rowText = cells.join(" ").replace(/\s+/g, " ").trim();
        if (!rowText) continue;
        cleanedRowCount++;
        const rawValues: Record<string, string> = {};
        headerCellsRaw.forEach((header, index) => {
          rawValues[header] = cells[index] || "";
        });
        sourceRows.push({ index: sourceRows.length, values: rawValues });

        const price = extractPrice(rowText) ?? (priceHeaderIndex >= 0 ? parsePrice(cells[priceHeaderIndex]) : undefined);
        const firstNonEmptyCell = cells.find((cell) => normalizeText(cell));
        const description = nameHeaderIndex >= 0 ? (cells[nameHeaderIndex] || firstNonEmptyCell || rowText) : (firstNonEmptyCell || rowText);
        const extracted = extractWineFieldsFromDescription(stripPrefixes(description));
        const producer = (producerHeaderIndex >= 0 ? normalizeText(cells[producerHeaderIndex]) : undefined) || normalizeText(cells[1]) || extracted.producer || currentProducer;
        const country = (countryHeaderIndex >= 0 ? normalizeCountryToken(cells[countryHeaderIndex] || "") : undefined) || normalizeCountryToken(rowText) || extracted.country;
        const vintage = (vintageHeaderIndex >= 0 ? parseYear(cells[vintageHeaderIndex]) : undefined) ?? parseYear(cells[2]) ?? extracted.vintage ?? parseYear(rowText);
        const type = inferTypeFromRow(rowText) || inferTypeFromRow(description) || extracted.name && inferTypeFromRow(extracted.name);
        const name = normalizeWineData({
          name: stripPrefixes(extracted.name || description || firstNonEmptyCell || rowText),
          producer: producer || null,
          country: country || null,
        }, { log: false }).name;
        const finalName = normalizeWineText(name || firstNonEmptyCell || rowText) || normalizeText(firstNonEmptyCell || rowText) || "";
        if (!finalName || finalName.trim().length < 2) {
          ignoredRows++;
          continue;
        }
        registerWine({
          name: finalName,
          producer,
          vintage,
          style: type,
          country,
          region: undefined,
          grape: undefined,
          quantity: 1,
          purchase_price: price,
          cellar_location: undefined,
          drink_from: undefined,
          drink_until: undefined,
        }, rawValues, rowText);
      }
    };

    const parseLineBlocks = () => {
      for (let rowIndex = 0; rowIndex < cleanedLines.length; rowIndex++) {
        const line = cleanedLines[rowIndex];
        if (!line || /^[-=*_•·\s|]+$/.test(line)) continue;
        const price = extractPrice(line);
        const upperLine = normalizeText(line)?.toUpperCase() || "";
        const isProducerBlock = !!upperLine && upperLine === line.toUpperCase() && !price && upperLine.length >= 4 && !/\b(19|20)\d{2}\b/.test(line);
        if (isProducerBlock) {
          const extractedBlock = stripPrefixes(normalizeWineText(line) || line);
          currentProducer = normalizeWineText(extractedBlock || line) || currentProducer;
          continue;
        }
        const withoutPrice = line.replace(priceRegex, "").replace(moneyRegex, "").replace(/\s{2,}/g, " ").trim();
        const extracted = extractWineFieldsFromDescription(stripPrefixes(withoutPrice));
        const name = normalizeWineData({
          name: stripPrefixes(extracted.name || withoutPrice),
          producer: currentProducer || extracted.producer || null,
          country: extracted.country || normalizeCountryToken(withoutPrice) || null,
        }, { log: false }).name;
        const finalName = normalizeWineText(name || withoutPrice) || normalizeText(withoutPrice) || "";
        const rowType = inferTypeFromRow(withoutPrice) || inferTypeFromRow(line);
        const rowCountry = extracted.country || normalizeCountryToken(withoutPrice);
        sourceRows.push({
          index: sourceRows.length,
          values: {
            raw_line: line,
            name: finalName,
            producer: currentProducer || extracted.producer || "",
            price: String(price),
            vintage: extracted.vintage ? String(extracted.vintage) : "",
            country: rowCountry || "",
            type: rowType || "",
          },
        });
        if (!finalName || finalName.trim().length < 2) {
          ignoredRows++;
          continue;
        }
        registerWine({
          name: finalName,
          producer: currentProducer || extracted.producer,
          vintage: extracted.vintage ?? parseYear(withoutPrice),
          style: rowType,
          country: rowCountry,
          region: undefined,
          grape: undefined,
          quantity: 1,
          purchase_price: price,
          cellar_location: undefined,
          drink_from: undefined,
          drink_until: undefined,
        }, {
          raw_line: line,
          name,
          producer: currentProducer || extracted.producer || "",
          price: String(price),
          vintage: extracted.vintage ? String(extracted.vintage) : "",
          country: rowCountry || "",
          type: rowType || "",
        }, withoutPrice || line);
      }
    };

    const priceMatches = cleanedLines.filter((line) => /R\$?\s?\d+[.,]\d{2}/.test(line));
    console.log("PRICE_LINES:", priceMatches.length);

    if (structured) {
      parseDelimitedRows();
    } else {
      parseLineBlocks();
    }

    logImportRows("raw_rows", wines);
    console.log("WINES_EXTRACTED:", wines.length);

    const successRate = cleanedRowCount > 0 ? wines.length / cleanedRowCount : 0;
    const confidence = wines.length > 0
      ? Math.min(1, 0.2 + confidenceDistribution.high * 0.12 + confidenceDistribution.medium * 0.08 + (successRate * 0.5))
      : 0;
    const priceColumn = structured
      ? headerCellsRaw.find((header) => {
          const norm = normalizeSearchText(header);
          return norm.includes("preco") || norm.includes("preço") || norm.includes("valor") || norm.includes("custo") || norm.includes("price") || norm.includes("4%");
        })
      : "R$ / numérico";
    const failureReason =
      wines.length === 0
        ? (cleanedRowCount > 0 && priceColumn ? "Arquivo não contém estrutura reconhecível" : "Não encontramos coluna de preço")
        : undefined;

    return {
      wines,
      mapping,
      headers,
      sourceRows,
      confidence: Number(confidence.toFixed(2)),
      successRate: Number(successRate.toFixed(2)),
      manualMappingRequired: successRate < 0.5 || wines.length === 0,
      headerRowIndex: structured ? headerRowIndex : -1,
      priceColumn,
      ignoredRows,
      failureReason,
      totalRows: allLines.length,
      cleanedRows: cleanedRowCount,
      confidenceDistribution,
    };
  };

  const reset = () => {
    setStep("upload");
    setDraftWines([]);
    setColumnMapping({});
    setAiNotes("");
    setParseErrors([]);
    setAnalysisStage("processing");
    setImportProgress(0);
    setImportErrors([]);
    setImportWarnings([]);
    setFileName("");
    setEditMode(true);
    setSelectedRows([]);
    setSearchQuery("");
    setStatusFilter("all");
    setEmptyFieldFilters([]);
    setBulkTargetField("producer");
    setBulkValue("");
    setBulkMode("fill_empty");
    setBulkScope("selected");
    setEnriching(false);
    setLoading(false);
    setProcessingRows(0);
    setProcessingTotal(0);
    setAutoMergedDuplicates(0);
    setImportWarningOpen(false);
    setImportWarningRows([]);
    setImportSourceRows([]);
    setImportSourceHeaders([]);
    setImportSourceConfidence(1);
    setImportSummary({ headerDetected: false, ignoredRows: 0 });
    setImportMode("standard");
  };

  const updateWineRow = (index: number, field: EditableField, value: string | number | undefined) => {
    syncRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return {
          ...row,
          [field]: value === "" ? undefined : value,
        };
      }),
    );
  };

  const validateRows = (rows = draftWines) => {
    const normalizedRows = normalizeDraftRows(rows);
    const errorsByRow = computeRowErrors(normalizedRows);
    setDraftWines((current) =>
      normalizedRows.map((row, index) => {
        const nextErrors = errorsByRow[index] ? (Object.values(errorsByRow[index]).filter(Boolean) as string[]) : [];
        const nextRow = { ...row, errors: nextErrors } as DraftWine;
        return { ...nextRow, confidence: scoreDraftRow(nextRow) };
      }),
    );
    return Object.keys(errorsByRow).length === 0;
  };

  useEffect(() => {
    if (step === "preview" || step === "review") {
      logImportRows("rows_for_review_ui", draftWines);
    }
  }, [draftWines, step]);

  const getRowStatus = (row: DraftWine) => {
    const hasName = !!row.name?.trim();
    const hasPrice = row.purchase_price != null || row.price != null;
    const missingSecondary = !row.producer?.trim() || !row.vintage || !row.country?.trim();
    if (!hasName || !hasPrice) return "error";
    if (missingSecondary) return "review";
    return "ok";
  };

  const smartNormalizeImportedName = (name?: string, country?: string | null) => {
    const cleaned = normalizeText(name) || "";
    if (!cleaned) return "";
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const trailingCountry = tokens.length > 1 ? tokens[tokens.length - 1] : "";
    const countryKey = normalizeSearchText(country);
    const knownCountry = [
      "Argentina",
      "Chile",
      "Brasil",
      "Portugal",
      "França",
      "France",
      "Itália",
      "Italy",
      "Espanha",
      "Spain",
      "Uruguai",
      "Uruguay",
      "Alemanha",
      "Germany",
      "África do Sul",
      "South Africa",
      "Estados Unidos",
      "USA",
    ].find((keyword) => normalizeSearchText(keyword) === normalizeSearchText(trailingCountry));
    const looksLikeCountry = !!countryKey && normalizeSearchText(trailingCountry) === countryKey;
    const maybeCountry = looksLikeCountry ? trailingCountry : knownCountry;
    const core = tokens
      .filter((token, index) => {
        if ((looksLikeCountry || knownCountry) && index === tokens.length - 1) return false;
        return true;
      })
      .join(" ");
    const title = normalizeWineText(core) || normalizeWineText(cleaned) || cleaned;
    const suffix = normalizeWineText(country || maybeCountry) || undefined;
    return suffix ? `${title} · ${suffix}` : title;
  };

  const selectedSet = new Set(selectedRows);
  const rowErrors = useMemo(() => computeRowErrors(draftWines), [draftWines]);

  const toggleRowSelection = (index: number) => {
    setSelectedRows((current) =>
      current.includes(index) ? current.filter((row) => row !== index) : [...current, index],
    );
  };

  const toggleAllRows = () => {
    if (filteredRowIndexes.length === 0) return;
    setSelectedRows((current) => {
      const visibleSet = new Set(filteredRowIndexes);
      const allVisibleSelected = filteredRowIndexes.every((index) => current.includes(index));
      if (allVisibleSelected) {
        return current.filter((index) => !visibleSet.has(index));
      }
      return Array.from(new Set([...current, ...filteredRowIndexes])).sort((a, b) => a - b);
    });
  };

  const getFieldValue = (row: DraftWine, field: EditableField) => {
    switch (field) {
      case "quantity":
        return row.quantity ?? "";
      case "purchase_price":
        return formatPrice((row as DraftWine).price ?? row.purchase_price);
      case "current_value":
        return formatPrice((row as any).current_value);
      case "vintage":
        return row.vintage ?? "";
      case "drink_from":
        return row.drink_from ?? "";
      case "drink_until":
        return row.drink_until ?? "";
      case "style":
        return (row as DraftWine).type || row.style || "";
      default:
        return (row[field] as string | undefined) ?? "";
    }
  };

  const isFieldMissing = (row: ParsedWine, field: EditableField) => {
    const value = row[field];
    return value === undefined || value === null || value === "";
  };

  const focusCell = (rowIndex: number, field: EditableField) => {
    requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-grid-cell=\"${rowIndex}:${field}\"]`);
      element?.focus();
    });
  };

  const focusNextCell = (rowIndex: number, field: EditableField) => {
    const visibleFields = baseColumns.map((column) => column.key);
    const currentIndex = visibleFields.indexOf(field);
    if (currentIndex === -1) return;
    const nextField = visibleFields[currentIndex + 1];
    if (nextField) {
      focusCell(rowIndex, nextField);
      return;
    }
    if (rowIndex + 1 < draftWines.length) {
      focusCell(rowIndex + 1, visibleFields[0]);
    }
  };

  const focusPreviousCell = (rowIndex: number, field: EditableField) => {
    const visibleFields = baseColumns.map((column) => column.key);
    const currentIndex = visibleFields.indexOf(field);
    if (currentIndex === -1) return;
    const prevField = visibleFields[currentIndex - 1];
    if (prevField) {
      focusCell(rowIndex, prevField);
      return;
    }
    if (rowIndex > 0) {
      focusCell(rowIndex - 1, visibleFields[visibleFields.length - 1]);
    }
  };

  const handleCellKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: EditableField) => {
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey && event.key === "Tab") {
        focusPreviousCell(rowIndex, field);
      } else {
        focusNextCell(rowIndex, field);
      }
    }
  };

  const commitImportedRows = (
    rows: ParsedWine[],
    options?: {
      mapping?: Record<string, string>;
      notes?: string;
      parseErrors?: string[];
      duplicateCount?: number;
    },
  ) => {
    console.info("[CSV NORMALIZED]", rows);
    const deduped = dedupeImportedRows(rows);
    setAutoMergedDuplicates(deduped.duplicateCount + (options?.duplicateCount ?? 0));
    const normalized = setParsedRows(deduped.rows);
    console.info("[draftWines]", normalized);
    setColumnMapping(options?.mapping || {});
    setAiNotes(options?.notes || "");
    setParseErrors(options?.parseErrors || []);
    setEditMode(true);
    setSelectedRows([]);
    setSearchQuery("");
    setStatusFilter("all");
    setEmptyFieldFilters([]);
    setBulkTargetField("producer");
    setBulkValue("");
    setBulkMode("fill_empty");
    setBulkScope("selected");
    return normalized;
  };

  const buildWinesFromMapping = (sourceRows: ImportSourceRow[], mapping: Record<string, string>) => {
    return mapSourceRowsToWines(sourceRows, mapping);
  };

  const getDuplicateIndexes = (rows: DraftWine[]) => {
    const seen = new Map<string, number>();
    const duplicates = new Set<number>();
    rows.forEach((row, index) => {
      const key = normalizeSearchText(`${row.name}|${row.producer || ""}`);
      if (!key) return;
      if (seen.has(key)) {
        duplicates.add(index);
      } else {
        seen.set(key, index);
      }
    });
    return duplicates;
  };

  const getRowIssues = (row: DraftWine) => {
    const issues: string[] = [];
    if (!row.name?.trim()) issues.push("Nome obrigatório");
    if (!row.quantity || row.quantity <= 0) issues.push("Quantidade precisa ser maior que 0");
    if (row.purchase_price == null && row.price == null) issues.push("Preço ausente");
    if (!row.producer?.trim()) issues.push("Produtor precisa de revisão");
    if (!row.country?.trim()) issues.push("País precisa de revisão");
    if (!row.grape?.trim()) issues.push("Uva precisa de revisão");
    if (!row.vintage) issues.push("Safra precisa de revisão");
    if (row.confidence < 0.7 || Object.values(row.fieldConfidence || {}).some((value) => value < 0.7)) {
      issues.push("Confiança baixa");
    }
    return issues;
  };

  const getImportStatus = (row: DraftWine) => {
    const hasName = !!row.name?.trim();
    if (!hasName) return "invalid" as const;
    if (!row.quantity || row.quantity <= 0) return "invalid" as const;
    const missingSecondary = !row.producer?.trim() || !row.country?.trim() || !row.grape?.trim() || !row.vintage || (row.purchase_price == null && row.price == null);
    const lowConfidence = row.confidence < 0.7 || Object.values(row.fieldConfidence || {}).some((value) => value < 0.7);
    if (missingSecondary || lowConfidence) return "incomplete" as const;
    return "valid" as const;
  };

  const getDisplayRowStatus = (row: DraftWine) => {
    const status = getImportStatus(row);
    if ((row as DraftWine).duplicateWarning) return "duplicate";
    if (status === "invalid") return "invalid";
    if (status === "incomplete") return "warning";
    return "valid";
  };

  const isLowConfidenceRow = (row: DraftWine) =>
    row.confidence < 0.7 || Object.values(row.fieldConfidence || {}).some((value) => value < 0.7);

  const isRowMissingField = (row: DraftWine, field: EmptyFilterField | BulkTargetField) => {
    if (field === "purchase_price") return row.purchase_price == null && row.price == null;
    const value = row[field as keyof DraftWine];
    return value === undefined || value === null || value === "";
  };

  const parseBulkValue = (field: BulkTargetField, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (field === "vintage" || field === "quantity") {
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (field === "purchase_price") {
      const parsed = Number.parseFloat(trimmed.replace(",", "."));
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return trimmed;
  };

  const applyManualMapping = () => {
    if (importSourceRows.length === 0 || importSourceHeaders.length === 0) return;
    const remapped = buildWinesFromMapping(importSourceRows, columnMapping);
    if (remapped.length === 0) {
      setParseErrors(["Não conseguimos interpretar totalmente o arquivo. Selecione manualmente as colunas para continuar."]);
      return;
    }
    const normalized = normalizeImportedWines(remapped);
    commitImportedRows(normalized, {
      mapping: columnMapping,
      notes: "Mapeamento manual aplicado. Revise os vinhos antes de importar.",
      parseErrors: [],
    });
    setImportSourceConfidence(1);
  };

  const applyDefaultPrice = () => {
    const defaultPrice = 89;
    syncRows((current) =>
      current.map((row) =>
        row.purchase_price == null && row.price == null
          ? { ...row, purchase_price: defaultPrice, price: defaultPrice }
          : row,
      ),
    );
  };

  const removeInvalidRows = () => {
    syncRows((current) =>
      current.filter((row) => {
        const hasValidName = !!row.name && row.name.trim().length >= 2;
        const hasPrice = row.purchase_price != null || row.price != null;
        const hasAttribute =
          !!row.producer?.trim() ||
          !!row.grape?.trim() ||
          !!row.region?.trim() ||
          !!row.country?.trim() ||
          !!row.vintage ||
          !!row.style?.trim() ||
          !!row.type?.trim();
        return hasValidName && hasAttribute && hasPrice;
      }),
    );
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStep("analyzing");
    setLoading(true);
    setImportMode("standard");
    setAnalysisStage("processing");
    setAiNotes("Processando arquivo...");
    logFileRequestStart("IMPORT_START", file, { flow: "spreadsheet_import" });
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isPdfFile = file.type === "application/pdf" || ext === "pdf";
    const isSpreadsheetFile = ["xls", "xlsx", "ods"].includes(ext);
    const isPlainTextFile = ["csv", "tsv", "txt"].includes(ext);
    const isImageFile = file.type.startsWith("image/");
    const supportedExtensions = new Set(["csv", "tsv", "txt", "pdf", "doc", "docx", "rtf", "xls", "xlsx", "ods"]);

    if (!isPdfFile && !isImageFile && !supportedExtensions.has(ext) && !file.type.startsWith("text/")) {
      setLoading(false);
      setStep("preview");
      setParseErrors(["Este formato ainda não é suportado. Envie JPG, PNG, PDF, CSV ou Excel (.xlsx/.xls)."]);
      return;
    }

    try {
      if (isImageFile) {
        setImportMode("image");
        setAnalysisStage("extracting");
        console.info("[ImportCsvDialog] preparation_started", {
          flow: "image",
          fileName: file.name,
          fileType: file.type || "unknown",
          fileSizeBytes: file.size,
        });
        const prepared = await prepareAiAnalysisAttachment(file);
        console.info("IMPORT_IMAGE_PREPARED", {
          fileName: file.name,
          fileType: file.type || "unknown",
          fileSizeBytes: file.size,
          device: getClientDeviceType(),
        });
        const scanResult = await invokeEdgeFunction<any>(
          "scan-wine-label",
          {
            imageBase64: prepared.imageBase64,
            mimeType: prepared.mimeType,
            fileName: prepared.fileName || file.name,
          },
          { timeoutMs: 60_000, retries: 1 },
        );
        const winePayload = normalizeScanResult(scanResult);
        setAnalysisStage("normalizing");
        const imported = normalizeImportedWines([winePayload].filter(Boolean));
        logImportRows("normalized_rows", imported);
        commitImportedRows(imported, {
          notes: "Imagem do rótulo convertida em uma linha revisável.",
          parseErrors: imported.length > 0 ? [] : ["Não conseguimos identificar um vinho confiável nesta imagem."],
        });
        setImportSourceRows([]);
        setImportSourceHeaders([]);
        setImportSourceConfidence(imported.length > 0 ? 1 : 0);
        console.info("[ImportCsvDialog] preparation_completed", {
          flow: "image",
          fileName: file.name,
          success: true,
        });
        return;
      }

      if (isPdfFile) {
        setImportMode("smart-pdf");
        setAnalysisStage("processing");
        setAiNotes("Processando arquivo...");
        console.info("IMPORT_PDF_START", {
          fileName: file.name,
          fileType: file.type || "unknown",
          fileSizeBytes: file.size,
          device: getClientDeviceType(),
        });
        await yieldToBrowser();
        console.info("[ImportCsvDialog] preparation_started", {
          flow: "pdf",
          fileName: file.name,
          fileType: file.type || "unknown",
          fileSizeBytes: file.size,
        });
        const pdfPayload = await prepareSmartPdfImportAttachment(file);
        setAnalysisStage("extracting");
        const smartContent = [
          `SMART PDF IMPORT MODE`,
          `FILE: ${pdfPayload.fileName || file.name}`,
          `SOURCE: catalog/distributor PDF`,
          `OCR USED: ${pdfPayload.ocrUsed ? "true" : "false"}`,
          `PAGE BLOCKS: ${pdfPayload.textBlocks.length}`,
          `RAW BLOCKS:`,
          pdfPayload.extractedText || "",
        ].join("\n");

        if (!pdfPayload.extractedText || pdfPayload.extractedText.trim().length === 0) {
          setParseErrors([
            "Não conseguimos interpretar totalmente o PDF.",
            "Selecione manualmente as colunas para continuar.",
          ]);
          setDraftWines([]);
          setImportSourceRows([]);
          setImportSourceHeaders([]);
          setImportSourceConfidence(0);
          setImportSummary({ headerDetected: false, ignoredRows: 0 });
          setStep("preview");
          return;
        }
        if (pdfPayload.ocrUsed) {
          setAiNotes("Detectamos um catálogo visual. Aplicando leitura inteligente (OCR)...");
          setParseErrors(["Detectamos um catálogo visual. Aplicando leitura inteligente (OCR)..."]);
        }

        setAnalysisStage("parsing");
        const local = parseCsvLocally(smartContent);
        console.info("[CSV RAW FILE]", {
          fileName: file.name,
          fileType: file.type || "application/pdf",
          fileSizeBytes: file.size,
          textLength: smartContent.length,
          preview: smartContent.slice(0, 4_000),
        });
        console.info("[CSV PARSED]", {
          wines: local.wines,
          headers: local.headers,
          mapping: local.mapping,
          sourceRows: local.sourceRows,
          confidence: local.confidence,
          successRate: local.successRate,
        });
        setImportSourceRows(local.sourceRows);
        setImportSourceHeaders(local.headers);
        setImportSourceConfidence(Math.min(local.confidence, local.successRate));
        setImportSummary({
          headerDetected: local.headerRowIndex >= 0,
          headerRowIndex: local.headerRowIndex,
          priceColumn: local.priceColumn,
          ignoredRows: local.ignoredRows,
        });

        if (local.wines.length > 0) {
          setAnalysisStage("normalizing");
          const normalized = normalizeImportedWines(local.wines);
          logImportRows("normalized_rows", normalized);
          commitImportedRows(normalized, {
            mapping: local.mapping,
            notes: "Catálogo PDF interpretado automaticamente. Revise os itens antes de importar.",
            parseErrors: local.manualMappingRequired ? [local.failureReason || "Selecione manualmente as colunas para continuar."] : [],
          });
          if (local.manualMappingRequired) {
            setColumnMapping(local.mapping);
          }
          return;
        }

        setDraftWines([]);
        setColumnMapping(local.mapping);
        setAiNotes(local.failureReason || "Não conseguimos interpretar totalmente o PDF. Selecione manualmente as colunas para continuar.");
        setParseErrors([
          local.failureReason || "Não conseguimos interpretar totalmente o PDF.",
          "Selecione manualmente as colunas para continuar.",
        ]);
        setStep("preview");
        return;
      }

      setAnalysisStage("extracting");
      setAiNotes("Extraindo dados...");
      console.info("IMPORT_TEXT_START", {
        fileName: file.name,
        fileType: file.type || "unknown",
        fileSizeBytes: file.size,
        device: getClientDeviceType(),
      });
      console.info("[ImportCsvDialog] preparation_started", {
        flow: isSpreadsheetFile ? "spreadsheet" : isPlainTextFile ? "text" : "document",
        fileName: file.name,
        fileType: file.type || "unknown",
        fileSizeBytes: file.size,
      });
      const raw = await fileToCsvLikeText(file);
      console.info("[CSV RAW FILE]", {
        fileName: file.name,
        fileType: file.type || "unknown",
        fileSizeBytes: file.size,
        textLength: raw.length,
        preview: raw.slice(0, 4_000),
      });
      if (!raw || !raw.trim()) {
        setParseErrors(["Não conseguimos ler o conteúdo do arquivo. Verifique se ele contém dados de vinhos."]);
        setDraftWines([]);
        setStep("preview");
        return;
      }
      const csvContent = raw.length > MAX_CLIENT_INPUT_CHARS ? raw.slice(0, MAX_CLIENT_INPUT_CHARS) : raw;

      // ── 1) FAST PATH: local deterministic parser for CSV/TSV/spreadsheet exports ──
      setAnalysisStage("parsing");
      const local = parseCsvLocally(csvContent);
      console.info("[CSV PARSED]", {
        wines: local.wines,
        headers: local.headers,
        mapping: local.mapping,
        sourceRows: local.sourceRows,
        confidence: local.confidence,
        successRate: local.successRate,
      });
      setImportSourceRows(local.sourceRows);
      setImportSourceHeaders(local.headers);
      setImportSourceConfidence(Math.min(local.confidence, local.successRate));
      setImportSummary({
        headerDetected: local.headerRowIndex >= 0,
        headerRowIndex: local.headerRowIndex,
        priceColumn: local.priceColumn,
        ignoredRows: local.ignoredRows,
      });
      const shouldUseManualMapping = local.manualMappingRequired || local.successRate < 0.5;

      console.log("UNIVERSAL IMPORT DEBUG:", {
        totalRows: local.totalRows,
        cleanedRows: local.cleanedRows,
        winesDetected: local.wines.length,
        rejectedRows: local.ignoredRows,
        confidenceDistribution: local.confidenceDistribution,
        headerDetected: local.headerRowIndex >= 0,
        priceColumn: local.priceColumn,
        successRate: local.successRate,
        manualMappingRequired: shouldUseManualMapping,
      });

      if (local.wines.length > 0) {
        setAnalysisStage("normalizing");
        const normalized = normalizeImportedWines(local.wines);
        logImportRows("normalized_rows", normalized);
        const reviewNotes = shouldUseManualMapping
          ? ["Não conseguimos interpretar totalmente a estrutura. Selecione manualmente as colunas para continuar."]
          : [];
        commitImportedRows(normalized, {
          mapping: local.mapping,
          notes: shouldUseManualMapping ? "A leitura automática identificou parte da estrutura. Revise os itens destacados." : `Identificamos ${local.wines.length} vinho(s) automaticamente. Revise antes de importar.`,
          parseErrors: reviewNotes,
        });
        setImportSourceConfidence(Math.max(local.confidence, local.successRate));
        if (shouldUseManualMapping) {
          setColumnMapping(local.mapping);
        }
        if (raw.length > MAX_CLIENT_INPUT_CHARS) {
          toast({
            title: "Arquivo muito grande",
            description: "Importamos uma amostra do arquivo para manter a qualidade da análise. Se precisar, importe em partes.",
          });
        }
        console.info("[ImportCsvDialog] preparation_completed", {
          flow: isSpreadsheetFile ? "spreadsheet" : isPlainTextFile ? "text" : "document",
          fileName: file.name,
          success: true,
        });
        return;
      }

      if (local.sourceRows.length > 0) {
        setAnalysisStage("normalizing");
        const fallbackRows = buildFallbackRowsFromSourceRows(local.sourceRows, local.headers);
        const normalizedFallback = normalizeImportedWines(fallbackRows);
        logImportRows("normalized_rows", normalizedFallback);
        commitImportedRows(normalizedFallback, {
          mapping: local.mapping,
          notes: local.failureReason || "Não conseguimos interpretar totalmente o arquivo. Revise os itens antes de importar.",
          parseErrors: [local.failureReason || "Arquivo não contém estrutura reconhecível"],
        });
        setColumnMapping(local.mapping);
        setImportSourceConfidence(local.successRate);
        return;
      }

      setParseErrors([
        local.failureReason || "Arquivo não contém estrutura reconhecível",
        "Se persistir, tente exportar o arquivo como CSV ou Excel (.xlsx) com cabeçalho.",
      ]);
      setDraftWines([]);
      setStep("preview");
      setImportSourceConfidence(local.successRate);
      return;
    } catch (err: any) {
      console.error("Import parse error:", err);
      console.error("[ImportCsvDialog] preparation_failed", {
        fileName: file.name,
        fileType: file.type || "unknown",
        code: err?.code,
        message: err?.message,
      });
      const msg = String(err?.message || "");
      const friendly =
        err?.code === "UNSUPPORTED_FILE_TYPE" ? "Este formato ainda não é suportado. Envie JPG, PNG, PDF, CSV ou Excel (.xlsx/.xls)." :
        err?.code === "INVALID_SPREADSHEET" ? "Não conseguimos ler esta planilha. Verifique o formato e tente novamente." :
        err?.code === "INVALID_CSV" ? "Não conseguimos ler este arquivo CSV. Verifique cabeçalhos e codificação." :
        err?.code === "FILE_TOO_LARGE" ? "O arquivo está muito pesado. Envie uma versão menor." :
        /timeout|abort/i.test(msg) ? "A análise demorou demais. Tente um arquivo menor ou divida em partes."
          : /rate|429/i.test(msg) ? "Muitas tentativas seguidas. Aguarde 1 minuto e tente novamente."
          : /unauth|401|sess/i.test(msg) ? "Sessão expirada. Faça login novamente."
          : /word|mammoth/i.test(msg) ? msg
          : /dns|network|connect|fetch|gateway|503|502|504/i.test(msg)
            ? "Nossa inteligência está instável no momento. Aguarde alguns instantes e tente novamente."
            : "Erro ao analisar o arquivo. Verifique o formato e tente novamente.";
      setParseErrors([friendly, "Se persistir, tente exportar o arquivo como CSV ou Excel (.xlsx) com colunas: Nome, Produtor, Safra, Tipo, Quantidade, Preço."]);
      setDraftWines([]);
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const performImport = async () => {
    setStep("importing");
    const errors: string[] = [];
    const warnings: string[] = [];
    const responsibleName = getResponsibleName();
    const rowsUsedForImport = draftWines.map((row) => draftToParsed(row));
    logImportRows("rows_used_for_import", rowsUsedForImport);

    for (let i = 0; i < draftWines.length; i++) {
      const w = draftWines[i];
      const wineName = w.name?.trim();
      if (!wineName) {
        errors.push(`Linha ${i + 1}: nome obrigatório`);
        continue;
      }
      try {
        const inserted = await addWine.mutateAsync({
          name: wineName,
          producer: w.producer || null,
          quantity: Math.min(9_999, Math.max(1, Math.trunc(w.quantity || 1))),
          vintage: w.vintage || null,
          style: w.type || w.style || null,
          country: w.country || null,
          region: w.region || null,
          grape: w.grape || null,
          purchase_price: typeof (w.price ?? w.purchase_price) === "number" ? (w.price ?? w.purchase_price) : null,
          current_value: typeof (w as any).current_value === "number" ? (w as any).current_value : null,
          cellar_location: w.cellar_location || null,
          drink_from: w.drink_from || null,
          drink_until: w.drink_until || null,
          food_pairing: null,
          tasting_notes: null,
          rating: null,
          image_url: null,
        });

        if (inserted?.id && user && (isCommercial || !!w.cellar_location)) {
          try {
            await createLocation.mutateAsync({
              wineId: inserted.id,
              manualLabel: w.cellar_location || null,
              quantity: Math.min(9_999, Math.max(1, Math.trunc(w.quantity || 1))),
              responsibleName: isCommercial ? responsibleName : null,
              reason: isCommercial ? "Entrada manual" : null,
              notes: null,
            });
          } catch (locationError: any) {
            const reason = getImportErrorLabel(locationError);
            warnings.push(`"${wineName}" foi salvo, mas sem localização (${reason})`);
            console.warn("location import warning", {
              wineName,
              reason,
              location: w.cellar_location,
            });
          }
        }

        if (inserted?.id) {
          void invokeEdgeFunction(
            "wine-image-resolver",
            { wineId: inserted.id },
            { timeoutMs: 30_000, retries: 0 },
          ).catch(() => null);
        }
      } catch (err: any) {
        const reason = getImportErrorLabel(err);
        errors.push(`"${wineName}": ${reason}`);
        console.error("wine import error", {
          wineName,
          error: err,
          message: reason,
          payload: w,
          table: "wines",
        });
      }
      setImportProgress(Math.round(((i + 1) / draftWines.length) * 100));
    }
    setImportErrors(errors);
    setImportWarnings(warnings);
    setStep("done");
  };

  const handleImport = async () => {
    const invalidRows = draftWines
      .map((row, index) => ({ row, index, issues: getRowIssues(row) }))
      .filter(({ row }) => getImportStatus(row) === "invalid");

    if (invalidRows.length > 0) {
      setImportWarningRows(
        invalidRows.slice(0, 8).map(({ row, index, issues }) => ({
          index,
          name: row.name?.trim() || "Nome ausente",
          issues,
        })),
      );
      setImportWarningOpen(true);
      toast({
        title: "Revise as linhas antes de importar",
        description: "O arquivo só pode ser importado quando todas as linhas visíveis estiverem completas.",
        variant: "destructive",
      });
      return;
    }

    await performImport();
  };

  const mappingEntries = Object.entries(columnMapping);
  const visibleColumns = baseColumns;
  const duplicateIndexes = useMemo(() => getDuplicateIndexes(draftWines), [draftWines]);
  const rowStatuses = draftWines.map((row) => getImportStatus(row));
  const completeRowsCount = rowStatuses.filter((status) => status === "valid").length;
  const reviewRowsCount = rowStatuses.filter((status) => status === "incomplete").length;
  const invalidRowsCount = rowStatuses.filter((status) => status === "invalid").length;
  const duplicateRowsCount = draftWines.filter((row, index) => duplicateIndexes.has(index) || !!row.duplicateWarning).length;
  const lowConfidenceRowsCount = draftWines.filter((row) => isLowConfidenceRow(row)).length;
  const identifiedRowsCount = completeRowsCount + reviewRowsCount;
  const canImport = identifiedRowsCount > 0 && invalidRowsCount === 0 && step !== "importing" && step !== "done";
  const hasDraftRows = draftWines.length > 0;
  const normalizedSearchQuery = normalizeSearchText(searchQuery);
  const filteredRowIndexes = useMemo(() => {
    return draftWines
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => {
        if (normalizedSearchQuery) {
          const searchable = normalizeSearchText([
            row.name,
            row.producer,
            row.grape,
            row.country,
            row.region,
            row.vintage ? String(row.vintage) : "",
          ].filter(Boolean).join(" "));
          if (!searchable.includes(normalizedSearchQuery)) return false;
        }

        if (statusFilter === "ready" && getImportStatus(row) !== "valid") return false;
        if (statusFilter === "review" && getImportStatus(row) !== "incomplete") return false;
        if (statusFilter === "invalid" && getImportStatus(row) !== "invalid") return false;
        if (statusFilter === "duplicates" && !duplicateIndexes.has(index) && !row.duplicateWarning) return false;
        if (statusFilter === "low_confidence" && !isLowConfidenceRow(row)) return false;

        if (emptyFieldFilters.length > 0 && !emptyFieldFilters.every((field) => isRowMissingField(row, field))) {
          return false;
        }

        return true;
      })
      .map(({ index }) => index);
  }, [draftWines, duplicateIndexes, emptyFieldFilters, normalizedSearchQuery, statusFilter]);
  const filteredRows = filteredRowIndexes.map((index) => ({ row: draftWines[index], index }));
  const allRowsSelected = filteredRowIndexes.length > 0 && filteredRowIndexes.every((index) => selectedSet.has(index));
  const bulkTarget = bulkFieldOptions.find((field) => field.key === bulkTargetField) || bulkFieldOptions[0];
  const bulkScopeCount =
    bulkScope === "selected" ? selectedRows.length :
    bulkScope === "filtered" ? filteredRowIndexes.length :
    draftWines.length;
  const activeFilterCount =
    (normalizedSearchQuery ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    emptyFieldFilters.length;

  const knownProducers = useMemo(() => {
    const all = [...(cellarWines ?? []), ...draftWines];
    return Array.from(new Set(all.map((wine) => wine.producer).filter((value): value is string => !!value && value.trim().length > 1)))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [cellarWines, draftWines]);

  const knownWineNames = useMemo(() => {
    const all = [...(cellarWines ?? []), ...draftWines];
    return Array.from(new Set(all.map((wine) => wine.name).filter((value): value is string => !!value && value.trim().length > 1)))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [cellarWines, draftWines]);

  const knownCountries = useMemo(() => {
    const values = [
      "Brasil",
      "Argentina",
      "Chile",
      "Uruguai",
      "Portugal",
      "França",
      "Itália",
      "Espanha",
      "Alemanha",
      "Estados Unidos",
      ...draftWines.map((wine) => wine.country).filter((value): value is string => !!value?.trim()),
      ...(cellarWines ?? []).map((wine) => wine.country).filter((value): value is string => !!value?.trim()),
    ];
    return Array.from(new Set(values.map((value) => normalizeText(value)).filter((value): value is string => !!value && value.length > 1)))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [cellarWines, draftWines]);

  const knownGrapes = useMemo(() => {
    const values = [
      "Blend",
      "Cabernet Sauvignon",
      "Merlot",
      "Malbec",
      "Pinot Noir",
      "Syrah",
      "Chardonnay",
      "Sauvignon Blanc",
      "Riesling",
      "Tempranillo",
      ...draftWines.map((wine) => wine.grape).filter((value): value is string => !!value?.trim()),
      ...(cellarWines ?? []).map((wine) => wine.grape).filter((value): value is string => !!value?.trim()),
    ];
    return Array.from(new Set(values.map((value) => normalizeText(value)).filter((value): value is string => !!value && value.length > 1)))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [cellarWines, draftWines]);

  const toggleEmptyFieldFilter = (field: EmptyFilterField) => {
    setEmptyFieldFilters((current) =>
      current.includes(field) ? current.filter((item) => item !== field) : [...current, field],
    );
  };

  const clearOperationalFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setEmptyFieldFilters([]);
  };

  const clearVisibleSelection = () => {
    if (filteredRowIndexes.length === 0) return;
    const visibleSet = new Set(filteredRowIndexes);
    setSelectedRows((current) => current.filter((index) => !visibleSet.has(index)));
  };

  const applyBulkOperation = () => {
    const nextValue = parseBulkValue(bulkTargetField, bulkValue);
    if (nextValue === undefined) {
      toast({
        title: "Informe um valor válido",
        description: "Preencha o valor que será aplicado nas linhas escolhidas.",
        variant: "destructive",
      });
      return;
    }

    const targetIndexes =
      bulkScope === "selected" ? selectedRows :
      bulkScope === "filtered" ? filteredRowIndexes :
      draftWines.map((_, index) => index);
    if (targetIndexes.length === 0) {
      toast({
        title: "Nenhuma linha para aplicar",
        description: "Selecione linhas ou ajuste o escopo da ação em massa.",
        variant: "destructive",
      });
      return;
    }

    const targetSet = new Set(targetIndexes);
    syncRows((current) =>
      current.map((row, index) => {
        if (!targetSet.has(index)) return row;
        if (bulkMode === "fill_empty" && !isRowMissingField(row, bulkTargetField)) return row;
        if (bulkTargetField === "purchase_price") {
          return { ...row, purchase_price: nextValue as number, price: nextValue as number };
        }
        return { ...row, [bulkTargetField]: nextValue };
      }),
    );
  };

  const commitField = (rowIndex: number, field: EditableField, rawValue: string) => {
    switch (field) {
      case "style":
        syncRows((current) =>
          current.map((row, index) => (index === rowIndex ? { ...row, type: rawValue || undefined, style: rawValue || undefined } : row)),
        );
        return;
      case "vintage":
      case "drink_from":
      case "drink_until":
        updateWineRow(rowIndex, field, rawValue ? Number.parseInt(rawValue, 10) : undefined);
        return;
      case "quantity":
        updateWineRow(rowIndex, field, rawValue ? Math.max(0, Number.parseInt(rawValue, 10) || 0) : undefined);
        return;
      case "purchase_price":
        syncRows((current) =>
          current.map((row, index) =>
            index === rowIndex
              ? {
                  ...row,
                  price: rawValue ? Number.parseFloat(rawValue) : undefined,
                  purchase_price: rawValue ? Number.parseFloat(rawValue) : undefined,
                }
              : row,
          ),
        );
        return;
      case "current_value":
        updateWineRow(rowIndex, field, rawValue ? Number.parseFloat(rawValue) : undefined);
        return;
      default:
        updateWineRow(rowIndex, field, rawValue);
    }
  };

  const renderSpreadsheetInput = (row: DraftWine, rowIndex: number, column: ColumnDef, selected = false) => {
    const error = rowErrors[rowIndex]?.[column.key as "name" | "quantity"];
    const listId =
      column.key === "producer" ? "producer-suggestions" :
      column.key === "name" ? "wine-name-suggestions" :
      column.key === "country" ? "country-suggestions" :
      column.key === "grape" ? "grape-suggestions" :
      undefined;
    const stickyNameColumn = column.key === "name";

    return (
      <td
        key={column.key}
        className={cn(
          "border-b border-[#EEE6DC] px-1.5 py-1.5 align-top transition-colors duration-150",
          stickyNameColumn && [
            "sticky left-[6.5rem] z-10 shadow-[10px_0_18px_-22px_rgba(42,33,26,0.45)]",
            selected ? "bg-[#FBF1F2]/95" : "bg-white/95 group-hover:bg-[#FFF9EF]/95",
          ],
        )}
      >
        <Input
          value={getFieldValue(row, column.key)}
          onChange={(event) => commitField(rowIndex, column.key, event.target.value)}
          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, column.key)}
          placeholder={column.placeholder}
          type={column.kind === "number" ? "number" : "text"}
          min={column.kind === "number" ? 0 : undefined}
          step={column.key === "purchase_price" ? "0.01" : undefined}
          disabled={!editMode || step === "importing" || step === "done"}
          list={listId}
          data-grid-cell={`${rowIndex}:${column.key}`}
          className={cn(
            "h-8 rounded-lg border bg-transparent px-2.5 text-[13px] shadow-none transition-all duration-150 placeholder:text-[#B7ADA1] hover:bg-white/70 focus:border-[#B98C45]/50 focus:bg-white focus-visible:ring-2 focus-visible:ring-[#B98C45]/20",
            error ? "border-[#D98A80]" : "border-transparent",
            column.align === "right" && "text-right",
          )}
        />
        {error ? <p className="mt-1 text-[10px] font-medium text-[#B4534A]">{error}</p> : null}
      </td>
    );
  };

  const renderSpreadsheetTable = () => {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-[22px] border border-[#E6DACE] bg-[rgba(255,252,248,0.82)] shadow-[0_16px_32px_-24px_rgba(54,36,22,0.22)]">
        <div className="h-full min-h-0 w-full overflow-auto scroll-smooth" ref={tableScrollRef}>
          <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[rgba(247,241,232,0.9)] backdrop-blur-xl">
                <th className="sticky left-0 z-30 w-12 border-b border-[#E3D6C7] bg-[rgba(247,241,232,0.9)] px-3 py-2 text-center backdrop-blur-xl">
                  <input
                    type="checkbox"
                    checked={allRowsSelected}
                    onChange={toggleAllRows}
                    className="h-4 w-4 rounded border-[#CDBFAE] accent-[#7B1E2B] transition-transform duration-150 hover:scale-105"
                    aria-label="Selecionar todos os vinhos"
                  />
                </th>
                <th className="sticky left-12 z-30 w-14 border-b border-[#E3D6C7] bg-[rgba(247,241,232,0.9)] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A6F65] backdrop-blur-xl">
                  #
                </th>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "border-b border-[#DDD0BF] px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A6F65]",
                      column.key === "name" && "sticky left-[6.5rem] z-30 min-w-[260px] bg-[rgba(247,241,232,0.9)] backdrop-blur-xl shadow-[10px_0_18px_-22px_rgba(42,33,26,0.45)]",
                      column.key === "producer" && "min-w-[190px]",
                      column.key === "vintage" && "min-w-[100px]",
                      column.key === "country" && "min-w-[150px]",
                      column.key === "region" && "min-w-[180px]",
                      column.key === "grape" && "min-w-[170px]",
                      column.key === "quantity" && "min-w-[110px]",
                      column.key === "purchase_price" && "min-w-[130px]",
                      column.align === "right" && "text-right",
                    )}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="w-28 border-b border-[#DDD0BF] px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A6F65]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="px-6 py-12 text-center">
                    <Sparkles className="mx-auto mb-3 h-5 w-5 text-[#B98C45]" />
                    <p className="text-sm font-semibold text-[#4A4338]">Nenhuma linha encontrada</p>
                    <p className="mt-1 text-xs text-[#8A8075]">Ajuste a busca ou remova filtros para voltar à revisão completa.</p>
                  </td>
                </tr>
              ) : null}
              {filteredRows.map(({ row, index }) => {
                const status = getDisplayRowStatus(row);
                const selected = selectedSet.has(index);
                return (
                  <tr
                    key={`${index}-${row.name || "row"}`}
                    className={cn(
                      "group bg-white/80 transition-colors duration-150 hover:bg-[#FFF9EF]",
                      selected && "bg-[#FBF1F2] shadow-[inset_3px_0_0_rgba(123,30,43,0.36)]",
                    )}
                  >
                    <td className={cn(
                      "sticky left-0 z-10 border-b border-[#EEE6DC] px-3 py-1.5 text-center transition-colors duration-150",
                      selected ? "bg-[#FBF1F2]/95" : "bg-white/95 group-hover:bg-[#FFF9EF]/95",
                    )}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRowSelection(index)}
                        className="h-4 w-4 rounded border-[#CDBFAE] accent-[#7B1E2B] transition-transform duration-150 hover:scale-105"
                        aria-label={`Selecionar linha ${index + 1}`}
                      />
                    </td>
                    <td className={cn(
                      "sticky left-12 z-10 border-b border-[#EEE6DC] px-2 py-1.5 text-[12px] font-medium text-[#8A8075] transition-colors duration-150",
                      selected ? "bg-[#FBF1F2]/95 text-[#7B1E2B]" : "bg-white/95 group-hover:bg-[#FFF9EF]/95",
                    )}>
                      {index + 1}
                    </td>
                    {visibleColumns.map((column) => renderSpreadsheetInput(row, index, column, selected))}
                    <td className="border-b border-[#EEE6DC] px-3 py-1.5 text-right">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.11em]",
                          status === "valid" && "border-emerald-100 bg-emerald-50/75 text-emerald-700",
                          status === "warning" && "border-amber-100 bg-amber-50/75 text-amber-700",
                          status === "invalid" && "border-rose-100 bg-rose-50/75 text-rose-700",
                          status === "duplicate" && "border-[#E9D3D8] bg-[#F8EDEF]/80 text-[#7B1E2B]",
                        )}
                      >
                        {status === "valid" ? "Pronto" : status === "invalid" ? "Corrigir" : status === "duplicate" ? "Duplicado" : "Revisar"}
                      </span>
                      {row.duplicateWarning && row.duplicateIndexes?.length ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-7 px-2 text-[10px] text-[#7B1E2B]"
                          onClick={() => mergeDraftRows(index, row.duplicateIndexes![0])}
                        >
                          Mesclar
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent
        className="left-1/2 top-1/2 right-auto bottom-auto h-[90vh] max-h-[90vh] w-[92vw] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-[26px] border-0 p-0 gap-0 overflow-hidden"
        style={{
          left: "50%",
          top: "50%",
          right: "auto",
          bottom: "auto",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 1760px)",
          maxWidth: "1760px",
          maxHeight: "90vh",
          height: "90vh",
          background:
            "linear-gradient(135deg, rgba(248,244,238,0.98) 0%, rgba(241,234,225,0.98) 42%, rgba(234,226,214,0.98) 100%)",
          backdropFilter: "blur(18px) saturate(1.05)",
          WebkitBackdropFilter: "blur(18px) saturate(1.05)",
          boxShadow: "0 28px 72px rgba(40,25,15,0.14)",
        }}
      >
        <AiModalShell>
          <AiModalHeaderBar className="z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-3 pr-14">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#7b1e2b]/10 bg-[rgba(123,30,43,0.08)]">
                <Sparkles className="h-5 w-5 text-[#7B1E2B]" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-[20px] font-semibold tracking-tight text-[#1E1E1E]">
                  {hasDraftRows ? "Revise seus vinhos antes de importar" : "Importar planilha de vinhos"}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-[12px] font-medium leading-relaxed tracking-tight text-[#6B6B6B]">
                  {hasDraftRows
                    ? `${draftWines.length} linha(s) carregadas em uma área de revisão editável.`
                    : "Envie CSV, Excel, PDF, texto ou imagem para criar uma revisão editável."}
                </SheetDescription>
              </div>
            </div>
            {hasDraftRows ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "Prontos", value: completeRowsCount, tone: "success" as const },
                  { label: "Revisão", value: reviewRowsCount, tone: "warning" as const },
                  { label: "Corrigir", value: invalidRowsCount, tone: "danger" as const },
                  { label: "Duplicados", value: duplicateRowsCount + autoMergedDuplicates, tone: "accent" as const },
                ].map((pill) => (
                  <AiMetricPill
                    key={pill.label}
                    label={pill.label}
                    value={pill.value}
                    tone={pill.tone}
                  />
                ))}
              </div>
            ) : null}
          </AiModalHeaderBar>

          <AiModalBody className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5 sm:px-4">
            {hasDraftRows ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2.5">
                {step === "importing" ? (
                  <div className="shrink-0 rounded-2xl border border-[#E2D7CA] bg-white/75 px-3 py-2">
                    <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-semibold text-[#2A211A]">
                      <span>Importando vinhos...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/5">
                      <div className="h-full rounded-full gradient-wine transition-all" style={{ width: `${importProgress}%` }} />
                    </div>
                  </div>
                ) : null}

                {step === "done" ? (
                  <div className="shrink-0 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-[#2F4A2B]">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <Check className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold">{Math.max(0, draftWines.length - importErrors.length)} vinho(s) importado(s).</p>
                        <p className="text-[11px] text-[#5F6F52]">A revisão permanece visível para conferência.</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <AiToolbarSurface className="grid shrink-0 gap-2 xl:grid-cols-[minmax(280px,1fr)_auto]">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <div className="relative min-w-[260px] flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8075]/70" />
                      <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Buscar por vinho, produtor, uva, país, região ou safra"
                        className="h-9 rounded-[16px] border-white/75 bg-white/82 pl-8 pr-3 text-[12px] shadow-[inset_0_1px_2px_rgba(42,33,26,0.04)] transition-all duration-150 placeholder:text-[#A99E91] hover:bg-white focus:border-[#B98C45]/30 focus:bg-white focus-visible:ring-[#B98C45]/20"
                      />
                    </div>
                    {[
                      { key: "all" as StatusFilter, label: "Todos", count: draftWines.length },
                      { key: "ready" as StatusFilter, label: "Ready", count: completeRowsCount },
                      { key: "review" as StatusFilter, label: "Review", count: reviewRowsCount },
                      { key: "invalid" as StatusFilter, label: "Invalid", count: invalidRowsCount },
                      { key: "duplicates" as StatusFilter, label: "Duplicados", count: duplicateRowsCount },
                      { key: "low_confidence" as StatusFilter, label: "Baixa confiança", count: lowConfidenceRowsCount },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => setStatusFilter(filter.key)}
                        className={cn(
                          "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition-all duration-150",
                          statusFilter === filter.key
                            ? "border-[#7B1E2B]/20 bg-[#F8EDEF] text-[#7B1E2B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_18px_rgba(123,30,43,0.08)]"
                            : "border-white/70 bg-white/60 text-[#6B6258] hover:-translate-y-px hover:bg-white hover:text-[#4A4338]",
                        )}
                      >
                        {filter.label}
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", statusFilter === filter.key ? "bg-white/70 text-[#7B1E2B]" : "bg-black/5")}>
                          {filter.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-start gap-2 xl:justify-end">
                    <span className="rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-medium text-[#6B6258]">
                      {filteredRowIndexes.length} visíveis
                    </span>
                    {activeFilterCount > 0 ? (
                      <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-[11px]" onClick={clearOperationalFilters}>
                        Limpar filtros
                      </Button>
                    ) : null}
                  </div>
                </AiToolbarSurface>

                <AiToolbarSurface className="flex shrink-0 flex-wrap items-center gap-1.5 border-white/40 bg-white/40 shadow-none">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8075]">Vazios</span>
                  {emptyFieldOptions.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => toggleEmptyFieldFilter(field.key)}
                      className={cn(
                        "h-7 rounded-full border px-2.5 text-[11px] font-semibold transition-all duration-150",
                        emptyFieldFilters.includes(field.key)
                          ? "border-[#C8A96A]/40 bg-[#FAF0DA] text-[#7B6528] shadow-[0_6px_14px_rgba(123,101,40,0.06)]"
                          : "border-white/70 bg-white/60 text-[#6B6258] hover:-translate-y-px hover:bg-white hover:text-[#4A4338]",
                      )}
                    >
                      {field.label}
                    </button>
                  ))}
                  {searchQuery.trim() ? (
                    <button type="button" onClick={() => setSearchQuery("")} className="inline-flex h-7 items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2.5 text-[11px] font-medium text-[#6B6258] transition-all duration-150 hover:bg-white">
                      Busca: {searchQuery.trim().slice(0, 24)}
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {statusFilter !== "all" ? (
                    <button type="button" onClick={() => setStatusFilter("all")} className="inline-flex h-7 items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2.5 text-[11px] font-medium text-[#6B6258] transition-all duration-150 hover:bg-white">
                      Status: {statusFilter === "ready" ? "Ready" : statusFilter === "review" ? "Review" : statusFilter === "invalid" ? "Invalid" : statusFilter === "duplicates" ? "Duplicados" : "Baixa confiança"}
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                  {emptyFieldFilters.map((field) => (
                    <button key={field} type="button" onClick={() => toggleEmptyFieldFilter(field)} className="inline-flex h-7 items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2.5 text-[11px] font-medium text-[#6B6258] transition-all duration-150 hover:bg-white">
                      Sem {emptyFieldOptions.find((item) => item.key === field)?.label.toLowerCase()}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </AiToolbarSurface>

                <AiToolbarSurface className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => setEditMode((v) => !v)} className="h-8 rounded-full px-3 text-[11px] transition-all duration-150 hover:-translate-y-px" disabled={step === "importing" || step === "done"}>
                      {editMode ? "Bloquear edição" : "Editar dados"}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void autoFixImportedRows()} className="h-8 rounded-full px-3 text-[11px] transition-all duration-150 hover:-translate-y-px" disabled={enriching || step === "importing" || step === "done"}>
                      Corrigir automaticamente
                    </Button>
                    <Button variant="secondary" size="sm" onClick={applyDefaultPrice} className="h-8 rounded-full px-3 text-[11px] transition-all duration-150 hover:-translate-y-px" disabled={!editMode || step === "importing" || step === "done"}>
                      Preço padrão
                    </Button>
                    <Button variant="secondary" size="sm" onClick={addBlankRow} className="h-8 rounded-full px-3 text-[11px] transition-all duration-150 hover:-translate-y-px" disabled={!editMode || step === "importing" || step === "done"}>
                      + Linha
                    </Button>
                    <Button variant="secondary" size="sm" onClick={removeInvalidRows} className="h-8 rounded-full px-3 text-[11px] text-rose-700 transition-all duration-150 hover:-translate-y-px" disabled={!editMode || step === "importing" || step === "done"}>
                      Remover vazios
                    </Button>
                    <Button variant="secondary" size="sm" onClick={removeSelectedRows} className="h-8 rounded-full px-3 text-[11px] transition-all duration-150 hover:-translate-y-px" disabled={!editMode || selectedRows.length === 0 || step === "importing" || step === "done"}>
                      Remover selecionados
                    </Button>
                    <Button variant="ghost" size="sm" onClick={reset} className="h-8 rounded-full px-3 text-[11px] transition-all duration-150 hover:-translate-y-px" disabled={step === "importing"}>
                      <X className="mr-1 h-3.5 w-3.5" /> Trocar arquivo
                    </Button>
                  </div>
                  <div className="rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-medium text-[#6B6258]">
                    {selectedRows.length} selecionada(s) · {filteredRowIndexes.length} filtrada(s)
                  </div>
                </AiToolbarSurface>

                {selectedRows.length > 0 ? (
                <AiToolbarSurface className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-[#E5D4D8] text-[12px] text-[#4A4338]">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-[#7B1E2B]" />
                      {selectedRows.length} linha(s) selecionada(s)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button variant="secondary" size="sm" className="h-8 rounded-full px-3 text-[11px] transition-all duration-150 hover:-translate-y-px" onClick={clearVisibleSelection}>
                        Limpar seleção visível
                      </Button>
                      <Button variant="secondary" size="sm" className="h-8 rounded-full px-3 text-[11px] text-rose-700 transition-all duration-150 hover:-translate-y-px" onClick={removeSelectedRows} disabled={!editMode || step === "importing" || step === "done"}>
                        Remover selecionadas
                      </Button>
                    </div>
                  </AiToolbarSurface>
                ) : null}

                <AiToolbarSurface className="grid shrink-0 gap-2 xl:grid-cols-[160px_minmax(170px,1fr)_150px_145px_130px]">
                  <Select value={bulkTargetField} onValueChange={(value) => setBulkTargetField(value as BulkTargetField)}>
                    <SelectTrigger className="h-8 rounded-lg border-white/70 bg-white/75 text-[12px] focus:ring-[#B98C45]/20">
                      <SelectValue placeholder="Campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkFieldOptions.map((field) => (
                        <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 rounded-lg border-white/70 bg-white/75 text-[12px] shadow-none transition-all duration-150 focus:border-[#B98C45]/30 focus-visible:ring-[#B98C45]/20"
                    value={bulkValue}
                    onChange={(event) => setBulkValue(event.target.value)}
                    placeholder={`Valor para ${bulkTarget.label.toLowerCase()}`}
                    type={bulkTarget.kind === "number" ? "number" : "text"}
                    disabled={!editMode || step === "importing" || step === "done"}
                  />
                  <Select value={bulkMode} onValueChange={(value) => setBulkMode(value as BulkMode)}>
                    <SelectTrigger className="h-8 rounded-lg border-white/70 bg-white/75 text-[12px] focus:ring-[#B98C45]/20">
                      <SelectValue placeholder="Modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fill_empty">Preencher vazios</SelectItem>
                      <SelectItem value="replace">Substituir existentes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={bulkScope} onValueChange={(value) => setBulkScope(value as BulkScope)}>
                    <SelectTrigger className="h-8 rounded-lg border-white/70 bg-white/75 text-[12px] focus:ring-[#B98C45]/20">
                      <SelectValue placeholder="Escopo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selected">Selecionadas</SelectItem>
                      <SelectItem value="filtered">Filtradas</SelectItem>
                      <SelectItem value="all">Todas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 rounded-lg text-[11px] transition-all duration-150 hover:-translate-y-px"
                    onClick={applyBulkOperation}
                    disabled={!editMode || !bulkValue.trim() || bulkScopeCount === 0 || step === "importing" || step === "done"}
                  >
                    Aplicar ({bulkScopeCount})
                  </Button>
                </AiToolbarSurface>

                {(enriching || processingTotal > 0) ? (
                  <div className="shrink-0 rounded-2xl border border-black/5 bg-[#FBFAF7] px-3 py-2 text-[12px] text-[#5F5F5F]">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-medium">{enriching ? "Corrigindo automaticamente..." : "Processando importação"}</span>
                      {processingTotal > 0 ? <span className="font-semibold text-[#7B1E2B]">{processingRows}/{processingTotal}</span> : null}
                    </div>
                    {processingTotal > 0 ? (
                      <div className="h-2 overflow-hidden rounded-full bg-black/5">
                        <div className="h-full rounded-full gradient-wine transition-all" style={{ width: `${Math.min(100, Math.round((processingRows / Math.max(processingTotal, 1)) * 100))}%` }} />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {parseErrors.length > 0 ? (
                  <div className="shrink-0 space-y-1 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                    {parseErrors.map((error, index) => (
                      <p key={index} className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {error}
                      </p>
                    ))}
                  </div>
                ) : null}

                {renderSpreadsheetTable()}

                {importSourceConfidence < 0.7 && importSourceHeaders.length > 0 ? (
                  <div className="max-h-44 shrink-0 overflow-auto rounded-2xl border border-[rgba(198,167,104,0.18)] bg-[rgba(198,167,104,0.08)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-[#7B6528]">Mapeamento manual disponível</p>
                        <p className="text-[13px] text-[#6B6258]">A confiança ficou baixa. Ajuste colunas sem esconder a tabela já carregada.</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={applyManualMapping} disabled={importSourceHeaders.length === 0 || step === "importing" || step === "done"}>
                        Aplicar mapeamento
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {importSourceHeaders.map((header) => (
                        <div key={header} className="flex flex-col gap-2 rounded-xl border border-black/5 bg-white p-2">
                          <p className="truncate text-[12px] font-semibold text-[#1A1A1A]">{header}</p>
                          <Select
                            value={columnMapping[header] || "ignore"}
                            onValueChange={(value) =>
                              setColumnMapping((current) => ({
                                ...current,
                                [header]: value === "ignore" ? "" : value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecionar coluna" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ignore">Ignorar coluna</SelectItem>
                              <SelectItem value="name">Nome do vinho</SelectItem>
                              <SelectItem value="producer">Produtor</SelectItem>
                              <SelectItem value="vintage">Safra</SelectItem>
                              <SelectItem value="country">País</SelectItem>
                              <SelectItem value="region">Região</SelectItem>
                              <SelectItem value="grape">Uva</SelectItem>
                              <SelectItem value="quantity">Quantidade</SelectItem>
                              <SelectItem value="purchase_price">Preço</SelectItem>
                              <SelectItem value="style">Tipo</SelectItem>
                              <SelectItem value="cellar_location">Localização</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(mappingEntries.length > 0 || aiNotes) ? (
                  <div className="shrink-0 rounded-2xl border border-white/50 bg-white/60 px-3 py-2 text-[11px] text-[#6B6258]">
                    {aiNotes ? <p className="mb-2 font-medium text-[#4A4338]">{aiNotes}</p> : null}
                    {mappingEntries.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {mappingEntries.map(([from, to]) => (
                          <span key={from} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium">
                            {from} {"->"} {to}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {step === "analyzing" ? (
                  <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[520px] items-center justify-center text-center">
                    <div>
                      <div className="relative mx-auto mb-5 h-16 w-16">
                        <div className="absolute inset-0 rounded-2xl bg-[rgba(143,45,86,0.14)] animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-7 w-7 animate-spin text-[#8F2D56]" />
                        </div>
                      </div>
                      <p className="text-[15px] font-semibold text-[#0F0F14]">
                        {analysisStage === "processing" ? "Processando arquivo..." : analysisStage === "extracting" ? "Extraindo dados..." : analysisStage === "parsing" ? "Organizando os vinhos..." : "Normalizando dados..."}
                      </p>
                      <p className="mt-1.5 text-[13px] text-[#8A8075]">A prévia será exibida assim que existirem vinhos detectados.</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[520px]">
                    <div
                      className={cn(
                        "rounded-[26px] border-2 border-dashed p-10 text-center transition-colors",
                        loading ? "cursor-wait opacity-80" : "cursor-pointer hover:border-[#8F2D56]/40",
                      )}
                      style={{ borderColor: "rgba(143,45,86,0.15)", background: "rgba(255,255,255,0.62)" }}
                      onClick={() => { if (!loading) fileRef.current?.click(); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                    >
                      <Upload className="mx-auto mb-3 h-8 w-8 text-[#8F2D56]" />
                      <p className="text-sm font-semibold text-[#0F0F14]">Arraste um documento ou clique para selecionar</p>
                      <p className="mt-1 text-xs text-[#8A8075]">CSV, Excel, PDF, Word, TXT ou imagem para cadastro em lote</p>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt,.tsv,.xls,.xlsx,.ods,.pdf,.doc,.docx,.rtf,image/*,text/plain,text/csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); }}
                    />
                    <div className="mt-5 rounded-[22px] border border-black/5 p-4" style={{ background: "rgba(143,45,86,0.04)" }}>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#8F2D56]">
                        <Sparkles className="h-3.5 w-3.5" /> Importação inteligente
                      </p>
                      <p className="text-[12px] leading-relaxed text-[#6B6258]">
                        A leitura aceita cabeçalhos em português ou inglês e, se houver linhas detectadas, a planilha editável aparece imediatamente.
                      </p>
                    </div>
                    {parseErrors.length > 0 ? (
                      <div className="mt-4 space-y-1.5 rounded-[20px] border border-amber-200 bg-amber-50 p-3">
                        {parseErrors.map((error, index) => (
                          <p key={index} className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {error}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </AiModalBody>

          {hasDraftRows ? (
            <AiModalFooterBar className="z-30 flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#5F5F5F]">
                <AiMetricPill label="total" value={draftWines.length} />
                <AiMetricPill label="visíveis" value={filteredRowIndexes.length} />
                <AiMetricPill label="selecionadas" value={selectedRows.length} />
                <AiMetricPill label="prontos" value={completeRowsCount} tone="success" />
                <AiMetricPill label="revisão" value={reviewRowsCount} tone="warning" />
                <AiMetricPill label="corrigir" value={invalidRowsCount} tone="danger" />
                <span className="text-[11px] font-normal text-[#7A6F65]">
                  {invalidRowsCount > 0
                    ? "Corrija nome/quantidade antes de importar."
                    : "Linhas parciais podem ser importadas sem preencher campos opcionais."}
                </span>
              </div>
              {step === "done" ? (
                <AiModalActionButton variant="secondary" onClick={() => { reset(); onOpenChange(false); }} className="h-12 rounded-2xl px-5 text-[14px] font-semibold transition-all duration-150 hover:-translate-y-px">
                  Fechar
                </AiModalActionButton>
              ) : (
                <AiModalActionButton
                  onClick={handleImport}
                  variant="primary"
                  className="h-11 rounded-[16px] px-6 text-[14px] font-semibold shadow-[0_14px_32px_rgba(123,30,43,0.18)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_18px_38px_rgba(123,30,43,0.22)] active:translate-y-0"
                  disabled={!canImport}
                >
                  <Upload className="mr-1.5 h-4 w-4" /> Importar {identifiedRowsCount} linha(s)
                </AiModalActionButton>
              )}
            </AiModalFooterBar>
          ) : null}
          <AlertDialog open={importWarningOpen} onOpenChange={setImportWarningOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revise os campos críticos</AlertDialogTitle>
                <AlertDialogDescription>
                  Existem linhas com dados obrigatórios faltando. Corrija os itens abaixo para concluir a importação.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {importWarningRows.map((row) => (
                  <div key={`${row.index}-${row.name}`} className="rounded-[22px] border border-[rgba(198,167,104,0.18)] bg-[rgba(198,167,104,0.08)] px-3 py-2">
                    <p className="text-sm font-semibold text-[#7B6528]">{row.name}</p>
                    <p className="text-xs text-[#6B6258]">{row.issues.slice(0, 3).join(" · ")}</p>
                  </div>
                ))}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setImportWarningOpen(false)}>Voltar para revisar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setImportWarningOpen(false);
                    toast({
                      title: "Revise os campos críticos",
                      description: "Corrija os itens marcados em vermelho para continuar.",
                      variant: "destructive",
                    });
                  }}
                >
                  Entendi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <datalist id="producer-suggestions">
            {knownProducers.map((producer) => (
              <option key={producer} value={producer} />
            ))}
          </datalist>
          <datalist id="wine-name-suggestions">
            {knownWineNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <datalist id="country-suggestions">
            {knownCountries.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
          <datalist id="grape-suggestions">
            {knownGrapes.map((grape) => (
              <option key={grape} value={grape} />
            ))}
          </datalist>
        </AiModalShell>
      </SheetContent>
    </Sheet>
  );
}
