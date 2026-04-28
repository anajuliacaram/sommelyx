import { useMemo, useState, useRef } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, Check, AlertTriangle, X, Sparkles, Loader2 } from "@/icons/lucide";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { invokeEdgeFunction } from "@/lib/edge-invoke";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateWineLocation } from "@/hooks/useWineLocations";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useWines } from "@/hooks/useWines";
import { prepareAiAnalysisAttachment, prepareSmartPdfImportAttachment } from "@/lib/ai-attachments";
import { normalizeWineData, normalizeWineText } from "@/lib/wine-normalization";
import { WineLabelPreview } from "@/components/WineLabelPreview";

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedWine {
  name: string;
  producer?: string;
  vintage?: number;
  style?: string;
  country?: string;
  region?: string;
  grape?: string;
  quantity?: number;
  purchase_price?: number;
  cellar_location?: string;
  drink_from?: number;
  drink_until?: number;
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

type RowErrors = Partial<Record<"name" | "quantity" | "type", string>>;

type ColumnKind = "text" | "number" | "select";

interface ColumnDef {
  key: EditableField;
  label: string;
  kind: ColumnKind;
  align?: "left" | "right";
  placeholder?: string;
  optional?: boolean;
}

const styleOptions = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "fortificado", label: "Fortificado" },
];

const baseColumns: ColumnDef[] = [
  { key: "name", label: "Nome", kind: "text", placeholder: "Nome do vinho" },
  { key: "producer", label: "Produtor", kind: "text", placeholder: "Produtor", optional: true },
  { key: "vintage", label: "Safra", kind: "number", placeholder: "2020", optional: true },
  { key: "style", label: "Estilo", kind: "select", placeholder: "Selecionar", optional: true },
  { key: "quantity", label: "Quantidade", kind: "number", align: "right", placeholder: "1" },
  { key: "purchase_price", label: "Varejo R$", kind: "number", align: "right", placeholder: "0,00", optional: true },
  { key: "current_value", label: "Gôndola R$", kind: "number", align: "right", placeholder: "0,00", optional: true },
];

const advancedColumns: ColumnDef[] = [
  { key: "country", label: "País", kind: "text", placeholder: "País", optional: true },
  { key: "region", label: "Região", kind: "text", placeholder: "Região", optional: true },
  { key: "grape", label: "Uva/Blend", kind: "text", placeholder: "Uva", optional: true },
  { key: "cellar_location", label: "Localização", kind: "text", placeholder: "Adega", optional: true },
  { key: "drink_from", label: "Beber de", kind: "number", placeholder: "2025", optional: true },
  { key: "drink_until", label: "Beber até", kind: "number", placeholder: "2030", optional: true },
];

export function ImportCsvDialog({ open, onOpenChange }: ImportCsvDialogProps) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";
  const [step, setStep] = useState<"upload" | "analyzing" | "preview" | "importing" | "done">("upload");
  const [draftWines, setDraftWines] = useState<DraftWine[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [aiNotes, setAiNotes] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [editMode, setEditMode] = useState(true);
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [bulkProducer, setBulkProducer] = useState("");
  const [bulkVintage, setBulkVintage] = useState("");
  const [bulkGrape, setBulkGrape] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingRows, setProcessingRows] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [autoMergedDuplicates, setAutoMergedDuplicates] = useState(0);
  const [previewLimit, setPreviewLimit] = useState(50);
  const [importSourceRows, setImportSourceRows] = useState<ImportSourceRow[]>([]);
  const [importSourceHeaders, setImportSourceHeaders] = useState<string[]>([]);
  const [importSourceConfidence, setImportSourceConfidence] = useState(1);
  const [importSummary, setImportSummary] = useState<ImportSummary>({ headerDetected: false, ignoredRows: 0 });
  const [importMode, setImportMode] = useState<"standard" | "smart-pdf" | "image">("standard");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: cellarWines } = useWines();
  const addWine = useAddWine();
  const createLocation = useCreateWineLocation();
  const { toast } = useToast();

  const MAX_CLIENT_INPUT_CHARS = 1_900_000; // keep request under edge limit after JSON overhead

  const normalizeText = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const cleaned = value.trim().replace(/\s+/g, " ");
    return cleaned.length ? cleaned : undefined;
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

  const normalizeType = (value: unknown) => normalizeStyle(value);

  const isIllustrativeImage = (value?: string | null) => !!value?.startsWith("data:image/svg+xml");

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
    if (!type) errors.push("Tipo obrigatório");
    if (!row.quantity || row.quantity <= 0) errors.push("Quantidade precisa ser maior que 0");

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

  const rebuildDraftRows = (rows: ParsedWine[]) => {
    setDraftWines(normalizeDraftRows(rows));
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

  const normalizeImportedWines = (rows: any[] = []) =>
    rows.map((w) => {
      const parsed = normalizeWineData({
        name: normalizeText(w?.name || w?.wine_name || "") || "",
        producer: normalizeText(w?.producer || w?.winery || ""),
        vintage: parseYear(w?.vintage || w?.year),
        style: normalizeStyle(w?.style || w?.type),
        country: normalizeText(w?.country),
        region: normalizeText(w?.region),
        grape: normalizeText(w?.grape || w?.varietal),
        quantity: parseQuantity(w?.quantity),
        purchase_price: parsePrice(w?.purchase_price ?? w?.price),
        cellar_location: normalizeText(w?.cellar_location),
        drink_from: parseYear(w?.drink_from || w?.drinkFrom),
        drink_until: parseYear(w?.drink_until || w?.drinkUntil),
        image_url: w?.image_url ?? w?.imageUrl ?? null,
      } as ParsedWine, { log: false });
      return {
        ...parsed,
        name: smartNormalizeImportedName(parsed.name, parsed.country),
      };
    });

  const buildGeneratedThumbnail = (row: Pick<DraftWine, "name" | "producer" | "vintage" | "country" | "region" | "grape" | "style" | "type">) => {
    const style = normalizeSearchText(row.type || row.style);
    const tone =
      style.includes("branco") ? ["#E8DDAA", "#B9984F"] :
      style.includes("espum") ? ["#EDE0BC", "#C5A45D"] :
      style.includes("rose") ? ["#DDA2B4", "#A34C68"] :
      style.includes("fort") ? ["#C58A49", "#7D4D23"] :
      ["#7B1E2B", "#4A101A"];
    const name = (row.name || "Vinho").slice(0, 24);
    const producer = (row.producer || "Sommelyx").slice(0, 24);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640" fill="none">
        <defs>
          <linearGradient id="g" x1="40" y1="20" x2="440" y2="620" gradientUnits="userSpaceOnUse">
            <stop stop-color="${tone[0]}" />
            <stop offset="1" stop-color="${tone[1]}" />
          </linearGradient>
        </defs>
        <rect width="480" height="640" rx="40" fill="url(#g)" />
        <rect x="36" y="36" width="408" height="568" rx="30" fill="rgba(255,255,255,0.16)" />
        <rect x="72" y="72" width="336" height="456" rx="24" fill="rgba(255,255,255,0.28)" />
        <text x="240" y="258" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#1B1417" font-weight="700">${name}</text>
        <text x="240" y="312" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" fill="rgba(27,20,23,0.72)">${producer}</text>
        <text x="240" y="372" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" fill="rgba(27,20,23,0.65)">${row.vintage || "Safra n/i"} · ${row.country || row.region || "Imagem ilustrativa"}</text>
        <rect x="132" y="490" width="216" height="42" rx="21" fill="rgba(255,255,255,0.60)" />
        <text x="240" y="518" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" fill="rgba(27,20,23,0.72)" font-weight="700">Prévia ilustrativa</text>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

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
      // Show advanced columns so the user sees enriched fields
      setShowAdvancedColumns(true);

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
      setShowAdvancedColumns(true);
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
      if (!row.type?.trim() && !row.style?.trim()) {
        errors.type = "Tipo obrigatório";
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

  const getVisibleColumns = () => (showAdvancedColumns ? [...baseColumns, ...advancedColumns] : baseColumns);

  const readTextFile = async (file: File) => {
    const text = await file.text();
    return text;
  };

  const readSpreadsheetAsCsv = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const xlsxModule = await import("xlsx");
    const XLSX = xlsxModule.default || xlsxModule;
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) return "";
    const ws = wb.Sheets[sheetName];
    const utils = XLSX.utils || xlsxModule.utils;
    return utils.sheet_to_csv(ws, { FS: ",", RS: "\n" });
  };

  const readPdfAsText = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const pdfjsModule = await import("pdfjs-dist");
    const pdfjs = pdfjsModule.default || pdfjsModule;

    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as any).promise;
    const maxPages = Math.min(doc.numPages, 12);
    const pages: string[] = [];
    for (let p = 1; p <= maxPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const line = (content.items || [])
        .map((it: any) => String(it.str || "").trim())
        .filter(Boolean)
        .join(" ");
      if (line) pages.push(line);
    }
    return pages.join("\n");
  };

  const readWordAsText = async (file: File) => {
    const buffer = await file.arrayBuffer();
    try {
      const mammothModule = await (0, eval)("import('mammoth')");
      const mammoth = mammothModule.default || mammothModule;
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value || "";
    } catch {
      throw new Error("Arquivos Word precisam ser convertidos em PDF, XLSX ou CSV para importação.");
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
    nome: "name", "nome do vinho": "name", vinho: "name", produto: "name", rotulo: "name", rótulo: "name", name: "name", wine: "name", label: "name",
    // producer
    produtor: "producer", vinicola: "producer", vinícola: "producer", marca: "producer", winery: "producer", producer: "producer", brand: "producer",
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
    return sourceRows
      .map((sourceRow) => {
        const row: Partial<ParsedWine> = {};
        Object.entries(mapping).forEach(([sourceHeader, field]) => {
          const value = sourceRow.values[sourceHeader];
          if (!field || value === undefined || value === null || String(value).trim() === "") return;
          if (field === "vintage" || field === "drink_from" || field === "drink_until") {
            row[field] = parseYear(value);
          } else if (field === "quantity") {
            row.quantity = parseQuantity(value);
          } else if (field === "purchase_price") {
            row.purchase_price = parsePrice(value);
          } else if (field === "style") {
            row.style = normalizeStyle(value);
          } else {
            (row as any)[field] = normalizeText(value);
          }
        });

        const normalized = normalizeWineData({
          name: row.name || "",
          producer: row.producer ?? null,
          grape: row.grape ?? null,
          country: row.country ?? null,
          region: row.region ?? null,
        }, { log: false });

        return {
          name: normalized.name || "",
          producer: row.producer,
          vintage: row.vintage,
          style: row.style,
          country: row.country,
          region: row.region,
          grape: row.grape,
          quantity: row.quantity ?? 1,
          purchase_price: row.purchase_price,
          cellar_location: row.cellar_location,
          drink_from: row.drink_from,
          drink_until: row.drink_until,
        };
      })
      .filter((row) => row.name.trim().length >= 2);
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

    const registerWine = (row: ParsedWine, rawValues: Record<string, string>) => {
      const normalizedName = normalizeWineData({
        name: stripPrefixes(row.name || ""),
        producer: row.producer ?? null,
        grape: row.grape ?? null,
        country: row.country ?? null,
        region: row.region ?? null,
      }, { log: false }).name;
      if (!normalizedName || normalizedName.trim().length < 2) return false;
      const price = typeof row.purchase_price === "number" ? row.purchase_price : undefined;
      if (price === undefined) return false;
      const parsedRow: ParsedWine = {
        name: normalizedName,
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
        if (price === undefined) {
          ignoredRows++;
          continue;
        }

        const description = nameHeaderIndex >= 0 ? (cells[nameHeaderIndex] || rowText) : rowText;
        const extracted = extractWineFieldsFromDescription(stripPrefixes(description));
        const producer = (producerHeaderIndex >= 0 ? normalizeText(cells[producerHeaderIndex]) : undefined) || extracted.producer || currentProducer;
        const country = (countryHeaderIndex >= 0 ? normalizeCountryToken(cells[countryHeaderIndex] || "") : undefined) || normalizeCountryToken(rowText) || extracted.country;
        const vintage = (vintageHeaderIndex >= 0 ? parseYear(cells[vintageHeaderIndex]) : undefined) ?? extracted.vintage ?? parseYear(rowText);
        const type = inferTypeFromRow(rowText) || inferTypeFromRow(description) || extracted.name && inferTypeFromRow(extracted.name);
        const name = normalizeWineData({
          name: stripPrefixes(extracted.name || description),
          producer: producer || null,
          country: country || null,
        }, { log: false }).name;
        if (!name || name.trim().length < 2) {
          ignoredRows++;
          continue;
        }
        registerWine({
          name,
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
        }, rawValues);
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
        if (price === undefined) {
          ignoredRows++;
          continue;
        }

        const withoutPrice = line.replace(priceRegex, "").replace(moneyRegex, "").replace(/\s{2,}/g, " ").trim();
        const extracted = extractWineFieldsFromDescription(stripPrefixes(withoutPrice));
        const name = normalizeWineData({
          name: stripPrefixes(extracted.name || withoutPrice),
          producer: currentProducer || extracted.producer || null,
          country: extracted.country || normalizeCountryToken(withoutPrice) || null,
        }, { log: false }).name;
        const rowType = inferTypeFromRow(withoutPrice) || inferTypeFromRow(line);
        const rowCountry = extracted.country || normalizeCountryToken(withoutPrice);
        sourceRows.push({
          index: sourceRows.length,
          values: {
            raw_line: line,
            name,
            producer: currentProducer || extracted.producer || "",
            price: String(price),
            vintage: extracted.vintage ? String(extracted.vintage) : "",
            country: rowCountry || "",
            type: rowType || "",
          },
        });
        if (!name || name.trim().length < 2) {
          ignoredRows++;
          continue;
        }
        registerWine({
          name,
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
        });
      }
    };

    const priceMatches = cleanedLines.filter((line) => /R\$?\s?\d+[.,]\d{2}/.test(line));
    console.log("PRICE_LINES:", priceMatches.length);

    if (structured) {
      parseDelimitedRows();
    } else {
      parseLineBlocks();
    }

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
    setImportProgress(0);
    setImportErrors([]);
    setImportWarnings([]);
    setFileName("");
    setEditMode(true);
    setShowAdvancedColumns(false);
    setSelectedRows([]);
    setEditingRowIndex(null);
    setBulkProducer("");
    setBulkVintage("");
    setBulkGrape("");
    setEnriching(false);
    setLoading(false);
    setProcessingRows(0);
    setProcessingTotal(0);
    setAutoMergedDuplicates(0);
    setPreviewLimit(50);
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

  const applyBulkProducer = () => {
    const value = bulkProducer.trim();
    if (!value) return;
    syncRows((current) => current.map((row) => ({ ...row, producer: value })));
  };

  const applyBulkVintage = () => {
    const value = Number.parseInt(bulkVintage, 10);
    if (!Number.isFinite(value)) return;
    syncRows((current) => current.map((row) => ({ ...row, vintage: value })));
  };

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

  const applyBulkAll = () => {
    const producer = bulkProducer.trim();
    const vintage = Number.parseInt(bulkVintage, 10);
    const grape = bulkGrape.trim();
    const hasProducer = producer.length > 0;
    const hasVintage = Number.isFinite(vintage);
    const hasGrape = grape.length > 0;
    if (!hasProducer && !hasVintage && !hasGrape) return;
    syncRows((current) =>
      current.map((row) => ({
        ...row,
        producer: hasProducer ? producer : row.producer,
        vintage: hasVintage ? vintage : row.vintage,
        grape: hasGrape ? grape : row.grape,
      })),
    );
  };

  const applyBulkGrape = () => {
    const value = bulkGrape.trim();
    if (!value) return;
    syncRows((current) => current.map((row) => ({ ...row, grape: value })));
  };

  const selectedSet = new Set(selectedRows);
  const rowErrors = useMemo(() => computeRowErrors(draftWines), [draftWines]);
  const allRowsSelected = draftWines.length > 0 && selectedRows.length === draftWines.length;

  const toggleRowSelection = (index: number) => {
    setSelectedRows((current) =>
      current.includes(index) ? current.filter((row) => row !== index) : [...current, index],
    );
  };

  const toggleAllRows = () => {
    setSelectedRows((current) => (current.length === draftWines.length ? [] : draftWines.map((_, index) => index)));
  };

  const applyProducerToSelected = () => {
    const value = bulkProducer.trim();
    if (!value || selectedRows.length === 0) return;
    syncRows((current) =>
      current.map((row, index) => (selectedSet.has(index) ? { ...row, producer: value } : row)),
    );
  };

  const applyVintageToSelected = () => {
    const value = Number.parseInt(bulkVintage, 10);
    if (!Number.isFinite(value) || selectedRows.length === 0) return;
    syncRows((current) =>
      current.map((row, index) => (selectedSet.has(index) ? { ...row, vintage: value } : row)),
    );
  };

  const applyGrapeToSelected = () => {
    const value = bulkGrape.trim();
    if (!value || selectedRows.length === 0) return;
    syncRows((current) =>
      current.map((row, index) => (selectedSet.has(index) ? { ...row, grape: value } : row)),
    );
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
    const visibleFields = getVisibleColumns().map((column) => column.key);
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
    const visibleFields = getVisibleColumns().map((column) => column.key);
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
    const deduped = dedupeImportedRows(rows);
    setAutoMergedDuplicates(deduped.duplicateCount + (options?.duplicateCount ?? 0));
    rebuildDraftRows(deduped.rows);
    setColumnMapping(options?.mapping || {});
    setAiNotes(options?.notes || "");
    setParseErrors(options?.parseErrors || []);
    setEditMode(true);
    setShowAdvancedColumns(false);
    setSelectedRows([]);
    setEditingRowIndex(null);
    setBulkProducer("");
    setBulkVintage("");
    setBulkGrape("");
    setPreviewLimit(50);
    setStep("preview");
    return deduped.rows;
  };

  const buildWinesFromMapping = (sourceRows: ImportSourceRow[], mapping: Record<string, string>) => {
    return mapSourceRowsToWines(sourceRows, mapping);
  };

  const getRenderableRows = (rows: DraftWine[]) =>
    rows.map((row, index) => ({ row, index }));

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

  const getRowClassifications = (rows: DraftWine[]) => {
    const duplicateIndexes = getDuplicateIndexes(rows);
    const completed: number[] = [];
    const errors: number[] = [];
    const duplicates: number[] = [];
    const lowConfidence: number[] = [];

    rows.forEach((row, index) => {
      const hasValidName = !!row.name && row.name.trim().length >= 2;
      const hasAttribute =
        !!row.producer?.trim() ||
        !!row.grape?.trim() ||
        !!row.region?.trim() ||
        !!row.country?.trim() ||
        !!row.vintage ||
        !!row.style?.trim() ||
        !!row.type?.trim();
      const missingRequired = !hasValidName || !row.type?.trim() || !row.quantity || row.quantity <= 0;

      if (duplicateIndexes.has(index)) {
        duplicates.push(index);
        return;
      }
      if (missingRequired || !hasAttribute) {
        errors.push(index);
        return;
      }
      if (row.confidence < 0.7 || Object.values(row.fieldConfidence || {}).some((value) => value < 0.7)) {
        lowConfidence.push(index);
        return;
      }
      completed.push(index);
    });

    return { completed, errors, duplicates, lowConfidence };
  };

  const getImportStatus = (row: DraftWine) => {
    const hasName = !!row.name?.trim();
    const hasPrice = row.purchase_price != null || row.price != null;
    const hasRequiredMissing = !hasName || !hasPrice;
    if (hasRequiredMissing) return "error" as const;
    const hasSecondaryMissing = !row.producer?.trim() || !row.vintage || !row.country?.trim();
    const lowConfidence = row.confidence < 0.7 || Object.values(row.fieldConfidence || {}).some((value) => value < 0.7);
    if (hasSecondaryMissing || lowConfidence) return "review" as const;
    return "ok" as const;
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
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isPdfFile = file.type === "application/pdf" || ext === "pdf";

    try {
      const isImageFile = file.type.startsWith("image/");
      if (isImageFile) {
        setImportMode("image");
        const prepared = await prepareAiAnalysisAttachment(file);
        const scanResult = await invokeEdgeFunction<any>(
          "scan-wine-label",
          { imageBase64: prepared.imageBase64 },
          { timeoutMs: 60_000, retries: 1 },
        );
        const winePayload = scanResult?.wine ?? scanResult?.data?.wine ?? scanResult;
        const imported = normalizeImportedWines([winePayload].filter(Boolean));
        commitImportedRows(imported, {
          notes: "Imagem do rótulo convertida em uma linha revisável.",
          parseErrors: imported.length > 0 ? [] : ["Não conseguimos identificar um vinho confiável nesta imagem."],
        });
        setImportSourceRows([]);
        setImportSourceHeaders([]);
        setImportSourceConfidence(imported.length > 0 ? 1 : 0);
        return;
      }

      if (isPdfFile) {
        setImportMode("smart-pdf");
        const pdfPayload = await prepareSmartPdfImportAttachment(file);
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

        const local = parseCsvLocally(smartContent);
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
          const normalized = normalizeImportedWines(local.wines);
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

      const raw = await fileToCsvLikeText(file);
      if (!raw || !raw.trim()) {
        setParseErrors(["Não conseguimos ler o conteúdo do arquivo. Verifique se ele contém dados de vinhos."]);
        setDraftWines([]);
        setStep("preview");
        return;
      }
      const csvContent = raw.length > MAX_CLIENT_INPUT_CHARS ? raw.slice(0, MAX_CLIENT_INPUT_CHARS) : raw;

      // ── 1) FAST PATH: local deterministic parser for CSV/TSV/spreadsheet exports ──
      const local = parseCsvLocally(csvContent);
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
        const normalized = normalizeImportedWines(local.wines);
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
        return;
      }

      if (local.sourceRows.length > 0) {
        setDraftWines([]);
        setColumnMapping(local.mapping);
        setAiNotes(local.failureReason || "Não conseguimos interpretar totalmente o arquivo. Selecione manualmente as colunas para continuar.");
        setParseErrors([
          local.failureReason || "Arquivo não contém estrutura reconhecível",
          "Selecione manualmente as colunas para continuar.",
        ]);
        setStep("preview");
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
      const msg = String(err?.message || "");
      const friendly =
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

  const handleImport = async () => {
    if (!validateRows(draftWines)) {
      setStep("preview");
      toast({
        title: "Revise os dados",
        description: "Corrija os campos obrigatórios antes de importar.",
        variant: "destructive",
      });
      return;
    }

    setStep("importing");
    const errors: string[] = [];
    const warnings: string[] = [];
    const responsibleName = getResponsibleName();

    for (let i = 0; i < draftWines.length; i++) {
      const w = draftWines[i];
      const wineName = w.name?.trim() || `Linha ${i + 1}`;
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

  const mappingEntries = Object.entries(columnMapping);
  const visibleColumns = getVisibleColumns();
  const classifications = getRowClassifications(draftWines);
  const renderableRows = getRenderableRows(draftWines);
  const visibleDraftWines = renderableRows.slice(0, previewLimit);
  const isTruncatedPreview = renderableRows.length > visibleDraftWines.length;
  const allFieldsVisible = showAdvancedColumns;
  const rowStatuses = draftWines.map((row) => getImportStatus(row));
  const completeRowsCount = rowStatuses.filter((status) => status === "ok").length;
  const reviewRowsCount = rowStatuses.filter((status) => status === "review").length;
  const duplicateRowsCount = classifications.duplicates.length;
  const identifiedRowsCount = completeRowsCount + reviewRowsCount;
  const canImport = completeRowsCount > 0;
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

  const renderEditableCell = (row: DraftWine, rowIndex: number, column: ColumnDef) => {
    const error =
      column.key === "style"
        ? rowErrors[rowIndex]?.type
        : rowErrors[rowIndex]?.[column.key as "name" | "quantity"];
    const stateClass = error ? "border-[#E8B8B8] bg-white" : "border-transparent bg-[#F8F6F2]";
    const sharedInputClass =
      "w-full rounded-xl border border-transparent bg-[#F8F6F2] px-3 py-2 text-[14px] shadow-none transition-colors placeholder:text-[#A39A90] focus:border-[#C8A96A] focus:bg-white focus-visible:ring-0 focus-visible:outline-none";
    const listId = column.key === "producer" ? "producer-suggestions" : column.key === "name" ? "wine-name-suggestions" : undefined;

    return (
      <td key={column.key} className={cn("px-1.5 py-1.5 align-top", column.align === "right" && "text-right")}>
        <div className={cn("rounded-xl border transition-colors", stateClass, error && "focus-within:ring-2 focus-within:ring-[#7B1E2B]/15")}>
          {column.kind === "select" ? (
            <Select
              value={(row[column.key] as string | undefined) || ""}
              onValueChange={(value) => updateWineRow(rowIndex, column.key, value || undefined)}
              disabled={!editMode}
            >
              <SelectTrigger
                className={cn(sharedInputClass, "justify-between")}
                data-grid-cell={`${rowIndex}:${column.key}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    focusNextCell(rowIndex, column.key);
                  }
                }}
              >
                <SelectValue placeholder={column.placeholder || "Selecionar"} />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : column.key === "name" ? (
            <div className="flex items-stretch gap-2 p-1.5">
              <div className="w-10 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-[#F8F6F2]">
                <WineLabelPreview
                  wine={{
                    name: row.name || "Prévia do vinho",
                    style: row.type || row.style || null,
                    image_url: row.image_url || null,
                    fallback_image: buildGeneratedThumbnail({ ...row, type: row.type || row.style }),
                  }}
                  alt={row.name || "Prévia do vinho"}
                  compact
                  generated={!row.image_url || isIllustrativeImage(row.image_url)}
                  className="h-full w-full rounded-xl"
                  imageClassName="h-full w-full object-cover"
                />
              </div>
              <Input
                value={getFieldValue(row, column.key)}
                onChange={(event) => commitField(rowIndex, column.key, event.target.value)}
                onKeyDown={(event) => handleCellKeyDown(event, rowIndex, column.key)}
                placeholder={column.placeholder}
                type={column.kind === "number" ? "number" : "text"}
                min={column.kind === "number" ? 0 : undefined}
                step={(column.key as string) === "purchase_price" ? "0.01" : undefined}
                disabled={!editMode}
                list={listId}
                className={cn(sharedInputClass, column.align === "right" && "text-right")}
                data-grid-cell={`${rowIndex}:${column.key}`}
              />
            </div>
          ) : (
            <Input
              value={getFieldValue(row, column.key)}
              onChange={(event) => commitField(rowIndex, column.key, event.target.value)}
              onKeyDown={(event) => handleCellKeyDown(event, rowIndex, column.key)}
              placeholder={column.placeholder}
              type={column.kind === "number" ? "number" : "text"}
              min={column.kind === "number" ? 0 : undefined}
              step={column.key === "purchase_price" ? "0.01" : undefined}
              disabled={!editMode}
              list={listId}
              className={cn(
                sharedInputClass,
                column.align === "right" && "text-right",
              )}
              data-grid-cell={`${rowIndex}:${column.key}`}
            />
          )}
        </div>
        {column.key === "name" && row.duplicateWarning ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium text-amber-700">{row.duplicateWarning}</p>
            {row.duplicateIndexes?.length ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => mergeDraftRows(rowIndex, row.duplicateIndexes![0])}
              >
                Mesclar
              </Button>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className={cn("mt-1 text-[10px] font-medium text-[#B4534A]")}>{error}</p>
        ) : null}
      </td>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent
        className="left-1/2 top-1/2 right-auto bottom-auto h-[90vh] max-h-[90vh] w-[min(1100px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border-0 p-0 gap-0 overflow-hidden"
        style={{
          left: "50%",
          top: "50%",
          right: "auto",
          bottom: "auto",
          transform: "translate(-50%, -50%)",
          width: "min(1100px, calc(100vw - 1rem))",
          maxWidth: "1100px",
          maxHeight: "90vh",
          height: "90vh",
          background: "#FFFFFF",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex h-full min-h-0 flex-col bg-white">
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white px-6 py-4 shrink-0">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/20 to-[#C8A96A]/20">
                <Sparkles className="h-5 w-5 text-[#7B1E2B]" />
              </div>
              <div className="min-w-0">
                <SheetTitle>Importar documento / planilha</SheetTitle>
                <SheetDescription>Revise os dados antes de confirmar a importação</SheetDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { reset(); onOpenChange(false); }}
              className="h-10 w-10 rounded-full bg-black/5 text-[#6B6B6B] hover:bg-black/10 hover:text-[#1A1A1A]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {step === "preview" ? (
            <div className="sticky top-[73px] z-20 border-b border-black/5 bg-white px-6 py-4 flex gap-3 flex-wrap shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setEditMode((v) => !v)} className="h-9 text-[12px] px-3">
                {editMode ? "Bloquear edição" : "Editar dados"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowAdvancedColumns(true)} className="h-9 text-[12px] px-3" disabled={allFieldsVisible}>
                Adicionar coluna
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowAdvancedColumns(false)} className="h-9 text-[12px] px-3" disabled={!allFieldsVisible}>
                Ocultar coluna
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={applyBulkAll}
                className="h-9 text-[12px] px-3"
                disabled={!editMode || (!bulkProducer.trim() && !bulkVintage.trim())}
              >
                Preencher todos
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={addBlankRow}
                className="h-9 text-[12px] px-3"
                disabled={!editMode}
              >
                + Adicionar linha
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={mergeSelectedRows}
                className="h-9 text-[12px] px-3"
                disabled={selectedRows.length < 2}
              >
                Mesclar selecionadas
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={removeSelectedRows}
                className="h-9 text-[12px] px-3 text-rose-700 hover:bg-rose-50"
                disabled={selectedRows.length === 0}
              >
                Remover selecionadas
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} className="h-9 text-[12px] px-3">
                <X className="h-3.5 w-3.5 mr-1" /> Trocar
              </Button>
            </div>
          ) : null}

          <div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white">
              <div className="flex-1 min-h-0 overflow-hidden">
                <AnimatePresence mode="wait">
                  {step === "upload" && (
                    <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-6">
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-xl p-10 text-center transition-colors",
                          loading ? "cursor-wait opacity-80" : "cursor-pointer hover:border-primary/30",
                        )}
                        style={{ borderColor: "rgba(143,45,86,0.15)" }}
                        onClick={() => { if (!loading) fileRef.current?.click(); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                      >
                        <Upload className="h-8 w-8 mx-auto mb-3" style={{ color: "#8F2D56" }} />
                        <p className="text-sm font-medium" style={{ color: "#0F0F14" }}>
                          Arraste um documento ou clique para selecionar
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>
                          CSV, Excel, PDF, Word e TXT para cadastro em lote
                        </p>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv,.txt,.tsv,.xls,.xlsx,.ods,.pdf,.doc,.docx,.rtf,image/*,text/plain,text/csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); }}
                      />

                      <div className="mt-5 rounded-xl border border-black/5 bg-white p-4" style={{ background: "rgba(143,45,86,0.04)" }}>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#8F2D56" }}>
                          <Sparkles className="h-3.5 w-3.5" /> Sommelyx Inteligente
                        </p>
                        <p className="text-[11px] leading-relaxed" style={{ color: "#6B7280" }}>
                          Não se preocupe com a ordem ou nome das colunas. O Sommelyx analisa o conteúdo e mapeia automaticamente os dados — nome do vinho, produtor, safra, preço, quantidade e mais.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {step === "analyzing" && (
                    <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-0 items-center justify-center px-6 py-6 text-center">
                      <div className="relative mx-auto mb-5 h-16 w-16">
                        <div
                          className="absolute inset-0 rounded-2xl animate-pulse"
                          style={{ background: "linear-gradient(135deg, rgba(143,45,86,0.15), rgba(196,69,105,0.1))" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#8F2D56" }} />
                        </div>
                      </div>
                      <div className="mx-auto mb-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-black/5">
                        <motion.div
                          className="h-full w-1/3 rounded-full gradient-wine"
                          animate={{ x: ["-20%", "220%"] }}
                          transition={{ duration: 1.25, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "#0F0F14" }}>
                        {importMode === "smart-pdf" ? "Detectamos um catálogo complexo" : "Sommelyx está analisando…"}
                      </p>
                      <p className="mt-1.5 text-xs" style={{ color: "#9CA3AF" }}>
                        {importMode === "smart-pdf"
                          ? (
                            <>
                              Usando inteligência Sommelyx para interpretar o catálogo de <strong>{fileName}</strong>
                            </>
                          )
                          : (
                            <>
                              Identificando colunas e organizando os dados de <strong>{fileName}</strong>
                            </>
                          )}
                      </p>
                    </motion.div>
                  )}

                  {step === "preview" && (
                    <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-0 flex-col gap-4 px-6 py-6">
                      <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
                        <div>
                          <p className="text-sm font-semibold tracking-tight" style={{ color: "#0F0F14" }}>
                            Revise e complete os dados antes de importar
                          </p>
                          <p className="mt-1 text-xs text-black/50">
                            {draftWines.length} vinho(s) pronto(s) para revisão
                          </p>
                        </div>
                      </div>

                      {importMode === "smart-pdf" ? (
                        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-[13px] text-sky-900">
                          <p className="font-semibold">✔ Detectamos um catálogo complexo</p>
                          <p>✔ Usando inteligência Sommelyx para interpretar produtores, vinhos e preços</p>
                          <p>✔ Você pode revisar e editar cada linha antes de importar</p>
                        </div>
                      ) : null}

                      <div className="grid gap-3 shrink-0 sm:grid-cols-3">
                        {[
                          { label: "Vinhos identificados", value: identifiedRowsCount, tone: "from-emerald-50 to-emerald-100 text-emerald-800" },
                          { label: "Precisam de revisão", value: reviewRowsCount, tone: "from-amber-50 to-amber-100 text-amber-800" },
                          { label: "Duplicados", value: duplicateRowsCount, tone: "from-rose-50 to-rose-100 text-rose-700" },
                        ].map((card) => (
                          <div key={card.label} className={cn("rounded-2xl border border-black/5 bg-gradient-to-br p-3 shadow-sm", card.tone)}>
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">{card.label}</p>
                            <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-black/5 bg-[#FBFAF7] px-4 py-3 text-[13px] text-[#4A4338]">
                        <p>✔ Cabeçalho detectado automaticamente{importSummary.headerDetected && typeof importSummary.headerRowIndex === "number" ? ` na linha ${importSummary.headerRowIndex + 1}` : ""}</p>
                        <p>✔ Coluna de preço detectada: {importSummary.priceColumn || "não identificada"}</p>
                        <p>✔ {importSummary.ignoredRows} linha(s) ignorada(s) por categoria ou vazio</p>
                        <p>✔ {identifiedRowsCount} vinhos identificados</p>
                        <p>⚠️ {reviewRowsCount} vinhos precisam de revisão</p>
                        {duplicateRowsCount + autoMergedDuplicates > 0 ? (
                          <p>🔁 {duplicateRowsCount + autoMergedDuplicates} duplicado(s) combinados ou sinalizados</p>
                        ) : null}
                      </div>

                      {(enriching || processingTotal > 0) && (
                        <div className="rounded-2xl border border-black/5 bg-[#FBFAF7] p-3 text-[12px] text-[#5F5F5F]">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="font-medium">
                              {enriching ? "Corrigindo automaticamente..." : "Processando importação"}
                            </span>
                            {processingTotal > 0 ? (
                              <span className="font-semibold text-[#7B1E2B]">
                                Processando {processingRows}/{processingTotal}
                              </span>
                            ) : null}
                          </div>
                          {processingTotal > 0 ? (
                            <div className="h-2 overflow-hidden rounded-full bg-black/5">
                              <div
                                className="h-full rounded-full gradient-wine transition-all"
                                style={{ width: `${Math.min(100, Math.round((processingRows / Math.max(processingTotal, 1)) * 100))}%` }}
                              />
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void autoFixImportedRows()}
                          className="h-9 text-[12px] px-3"
                          disabled={enriching || draftWines.length === 0}
                        >
                          ✨ Corrigir automaticamente
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={applyDefaultPrice}
                          className="h-9 text-[12px] px-3"
                          disabled={draftWines.length === 0}
                        >
                          Aplicar preço padrão
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={removeInvalidRows}
                          className="h-9 text-[12px] px-3 text-rose-700 hover:bg-rose-50"
                          disabled={draftWines.length === 0}
                        >
                          Remover inválidos
                        </Button>
                      </div>

                      <div className="grid gap-3 shrink-0 lg:grid-cols-[1fr_1fr_1fr_auto]">
                        <div className="flex items-center gap-2">
                          <Input
                            value={bulkProducer}
                            onChange={(e) => setBulkProducer(e.target.value)}
                            placeholder="Produtor em massa"
                            disabled={!editMode}
                          />
                          <Button variant="secondary" size="sm" onClick={applyBulkProducer} disabled={!editMode || !bulkProducer.trim()}>
                            Aplicar produtor
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={bulkVintage}
                            onChange={(e) => setBulkVintage(e.target.value)}
                            placeholder="Safra em massa"
                            type="number"
                            disabled={!editMode}
                          />
                          <Button variant="secondary" size="sm" onClick={applyBulkVintage} disabled={!editMode || !bulkVintage.trim()}>
                            Aplicar safra
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={bulkGrape}
                            onChange={(e) => setBulkGrape(e.target.value)}
                            placeholder="Uva em massa"
                            disabled={!editMode}
                          />
                          <Button variant="secondary" size="sm" onClick={applyBulkGrape} disabled={!editMode || !bulkGrape.trim()}>
                            Aplicar uva
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 justify-start lg:justify-end">
                          <Button variant="secondary" size="sm" onClick={applyProducerToSelected} disabled={!editMode || !bulkProducer.trim() || selectedRows.length === 0}>
                            Produtor aos selecionados
                          </Button>
                          <Button variant="secondary" size="sm" onClick={applyVintageToSelected} disabled={!editMode || !bulkVintage.trim() || selectedRows.length === 0}>
                            Safra aos selecionados
                          </Button>
                          <Button variant="secondary" size="sm" onClick={applyGrapeToSelected} disabled={!editMode || !bulkGrape.trim() || selectedRows.length === 0}>
                            Uva aos selecionados
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-black/50">
                        <span className="rounded-full bg-black/5 px-3 py-1">
                          {selectedRows.length > 0 ? `${selectedRows.length} selecionado(s)` : "Selecione linhas para ações em lote"}
                        </span>
                        <Button variant="ghost" size="sm" onClick={toggleAllRows} className="h-8 px-3 text-[11px]">
                          {allRowsSelected ? "Limpar seleção" : "Selecionar todas"}
                        </Button>
                      </div>

                      {mappingEntries.length > 0 && (
                        <div className="rounded-xl border border-black/5 bg-white p-3">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-black/50">
                            Mapeamento Sommelyx
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {mappingEntries.map(([from, to]) => (
                              <span
                                key={from}
                                className="inline-flex items-center rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-[#5F5F5F]"
                              >
                                {from} → {to}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiNotes && (
                        <div className="rounded-xl border border-black/5 bg-white p-3">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black/50">
                            Observações Sommelyx
                          </p>
                          <p className="text-[11px] leading-relaxed" style={{ color: "#6B7280" }}>{aiNotes}</p>
                        </div>
                      )}

                      {parseErrors.length > 0 && (
                        <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                          {parseErrors.map((e, i) => (
                            <p key={i} className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#b45309" }}>
                              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#d97706" }} />
                              {e}
                            </p>
                          ))}
                        </div>
                      )}

                      {importSourceConfidence < 0.7 && importSourceHeaders.length > 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold text-amber-900">
                                Precisamos de mapeamento manual
                              </p>
                              <p className="text-[13px] text-amber-800">
                                A confiança da leitura ficou baixa. Selecione as colunas manualmente para continuar.
                              </p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={applyManualMapping} disabled={importSourceHeaders.length === 0}>
                              Aplicar mapeamento
                            </Button>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {importSourceHeaders.map((header) => (
                              <div key={header} className="flex flex-col gap-2 rounded-xl border border-black/5 bg-white p-3">
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
                                    <SelectItem value="style">Tipo</SelectItem>
                                    <SelectItem value="country">País</SelectItem>
                                    <SelectItem value="region">Região</SelectItem>
                                    <SelectItem value="grape">Uva</SelectItem>
                                    <SelectItem value="quantity">Quantidade</SelectItem>
                                    <SelectItem value="purchase_price">Preço</SelectItem>
                                    <SelectItem value="cellar_location">Localização</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {renderableRows.length > 0 ? (
                        <div className="flex-1 min-h-[320px] overflow-hidden rounded-2xl border border-black/5 bg-white">
                          <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
                            <div>
                              <p className="text-[14px] font-semibold text-[#1A1A1A]">Pré-visualização dos vinhos</p>
                              <p className="text-[12px] text-black/50">
                                Nome | Produtor | Safra | Tipo | Confiança
                              </p>
                            </div>
                            {renderableRows.length > visibleDraftWines.length ? (
                              <Button variant="secondary" size="sm" onClick={() => setPreviewLimit((current) => current + 50)}>
                                Mostrar mais
                              </Button>
                            ) : null}
                          </div>

                          <div className="max-h-[420px] overflow-y-auto cellar-scroll">
                            <div className="min-w-[860px]">
                              <div className="grid grid-cols-[2fr_1.5fr_0.9fr_1fr_1fr_1fr_auto] gap-3 border-b border-black/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">
                                <span>Nome</span>
                                <span>Produtor</span>
                                <span>Safra</span>
                                <span>País</span>
                                <span>Preço</span>
                                <span>Status</span>
                                <span className="text-right">Ações</span>
                              </div>
                              {visibleDraftWines.map(({ row: wine, index }) => {
                                const rowStatus = getImportStatus(wine as DraftWine);
                                const rowHasError = rowStatus === "error" || !!rowErrors[index];
                                const rowMissingPrice = wine.purchase_price == null && (wine as DraftWine).price == null;
                                const accent = accentForRow(wine as DraftWine);
                                const confidence = (wine as DraftWine).confidence;
                                return (
                                  <div
                                    key={`row-${index}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setEditingRowIndex(index)}
                                    className={cn(
                                      "grid grid-cols-[2fr_1.5fr_0.9fr_1fr_1fr_1fr_auto] gap-3 border-b border-black/5 px-4 py-3 transition-colors hover:bg-[#FBFAF7] cursor-pointer",
                                      selectedSet.has(index) && "bg-[#7B1E2B]/[0.04]",
                                      editingRowIndex === index && "ring-1 ring-inset ring-[#7B1E2B]/15",
                                      rowHasError && "bg-rose-50/60",
                                      !rowHasError && rowMissingPrice && "bg-amber-50/60",
                                      !rowHasError && !rowMissingPrice && confidence < 0.7 && "bg-amber-50/60",
                                    )}
                                    style={{ borderLeft: `4px solid ${rowHasError ? "#D88C7A" : accent.bar}` }}
                                  >
                                    <div className="min-w-0">
                                      {editingRowIndex === index && editMode ? (
                                        <Input
                                          value={wine.name || ""}
                                          onChange={(e) => updateWineRow(index, "name", e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          className={cn("h-10 text-[14px]", !wine.name?.trim() && "border-rose-300 bg-rose-50")}
                                        />
                                      ) : (
                                        <p className={cn("truncate text-[14px] font-semibold text-[#1A1A1A]", !wine.name?.trim() && "text-rose-700")}>{wine.name}</p>
                                      )}
                                      {duplicateRowsCount > 0 && (wine as DraftWine).duplicateWarning ? (
                                        <p className="mt-0.5 text-[11px] text-amber-700">{(wine as DraftWine).duplicateWarning}</p>
                                      ) : null}
                                    </div>
                                    <div className="min-w-0">
                                      {editingRowIndex === index && editMode ? (
                                        <Input
                                          value={wine.producer || ""}
                                          onChange={(e) => updateWineRow(index, "producer", e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-10 text-[14px]"
                                        />
                                      ) : (
                                        <span className="truncate text-[13px] text-[#4B4B4B]">{wine.producer || "-"}</span>
                                      )}
                                    </div>
                                    <div>
                                      {editingRowIndex === index && editMode ? (
                                        <Input
                                          value={wine.vintage ? String(wine.vintage) : ""}
                                          onChange={(e) => updateWineRow(index, "vintage", e.target.value ? Number.parseInt(e.target.value, 10) : undefined)}
                                          onClick={(e) => e.stopPropagation()}
                                          type="number"
                                          className="h-10 text-[14px]"
                                        />
                                      ) : (
                                        <span className="text-[13px] text-[#4B4B4B]">{wine.vintage || "-"}</span>
                                      )}
                                    </div>
                                    <span className="truncate text-[13px] text-[#4B4B4B]">{wine.country || "-"}</span>
                                    <div>
                                      {editingRowIndex === index && editMode ? (
                                        <Input
                                          value={formatPrice((wine as DraftWine).price ?? wine.purchase_price)}
                                          onChange={(e) => updateWineRow(index, "purchase_price", e.target.value ? Number.parseFloat(e.target.value) : undefined)}
                                          onClick={(e) => e.stopPropagation()}
                                          type="number"
                                          step="0.01"
                                          className={cn("h-10 text-[14px]", rowMissingPrice && "border-amber-300 bg-amber-50")}
                                        />
                                      ) : (
                                        <span className={cn("text-[13px] font-medium", rowMissingPrice ? "text-amber-700" : "text-[#4B4B4B]")}>
                                          {formatPrice((wine as DraftWine).price ?? wine.purchase_price) || "Sem preço"}
                                        </span>
                                      )}
                                    </div>
                                    <span className={cn(
                                      "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                      rowStatus === "error"
                                        ? "bg-rose-100 text-rose-700"
                                        : rowStatus === "review"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-emerald-100 text-emerald-700",
                                    )}>
                                      {rowStatus === "error" ? "Erro" : rowStatus === "review" ? "Revisar" : "OK"}
                                    </span>
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleRowSelection(index);
                                        }}
                                        className="min-h-10 rounded-full px-3 text-[12px] font-semibold text-[#7B1E2B] transition-colors hover:bg-[#7B1E2B]/[0.08]"
                                      >
                                        {selectedSet.has(index) ? "Desmarcar" : "Selecionar"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] font-medium text-amber-800">
                          {importMode === "smart-pdf"
                            ? "Não conseguimos interpretar totalmente o catálogo PDF. Selecione manualmente as colunas para continuar."
                            : "Não conseguimos interpretar totalmente o arquivo. Selecione manualmente as colunas para continuar."}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {step === "importing" && (
                    <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-0 items-center justify-center px-6 py-6 text-center">
                      <div>
                        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-black/5">
                          <motion.div className="h-full rounded-full gradient-wine" style={{ width: `${importProgress}%` }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: "#0F0F14" }}>Importando... {importProgress}%</p>
                        <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>Não feche esta janela</p>
                      </div>
                    </motion.div>
                  )}

                  {step === "done" && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full min-h-0 items-center justify-center px-6 py-6 text-center">
                      <div>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full gradient-wine glow-wine">
                          <Check className="h-7 w-7 text-primary-foreground" />
                        </div>
                        <p className="text-sm font-medium" style={{ color: "#0F0F14" }}>
                          {draftWines.length - importErrors.length} vinho(s) importado(s) com sucesso!
                        </p>
                        {importErrors.length > 0 && (
                          <p className="mt-2 text-xs" style={{ color: "#f59e0b" }}>
                            {importErrors.length} linha(s) não puderam ser importadas
                          </p>
                        )}
                        {importWarnings.length > 0 && (
                          <p className="mt-1.5 text-xs" style={{ color: "#6B7280" }}>
                            {importWarnings.length} aviso(s) de localização
                          </p>
                        )}
                        {importErrors.length > 0 && (
                          <div className="mt-4 max-h-36 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
                            {importErrors.slice(0, 5).map((error, idx) => (
                              <p key={idx} className="text-[11px] leading-relaxed" style={{ color: "#b45309" }}>
                                • {error}
                              </p>
                            ))}
                            {importErrors.length > 5 && (
                              <p className="mt-1.5 text-[10px]" style={{ color: "#9CA3AF" }}>
                                ...e mais {importErrors.length - 5} erro(s)
                              </p>
                            )}
                          </div>
                        )}
                        <Button variant="secondary" onClick={() => { reset(); onOpenChange(false); }} className="mt-5 text-[13px]">
                          Fechar
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {step === "preview" ? (
            <div className="sticky bottom-0 z-30 border-t border-black/5 bg-white p-4 flex justify-end shrink-0">
              <div className="mr-auto flex flex-col gap-1">
                {isTruncatedPreview ? (
                  <div className="flex items-center text-[11px] font-medium text-black/50">
                    Mostrando {visibleDraftWines.length} de {renderableRows.length} vinhos
                  </div>
                ) : null}
                {!canImport ? (
                  <div className="flex items-center text-[12px] font-medium text-rose-700">
                    Nenhum vinho válido para importar
                  </div>
                ) : null}
              </div>
              <Button
                onClick={handleImport}
                variant="primary"
                className="h-12"
                disabled={!canImport}
              >
                <Upload className="h-4 w-4 mr-1.5" /> Importar {draftWines.length} vinho(s)
              </Button>
            </div>
          ) : null}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
