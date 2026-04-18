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
  errors: string[];
  image_url?: string | null;
  duplicateWarning?: string | null;
  duplicateGroupKey?: string | null;
  duplicateIndexes?: number[];
}

type EditableField =
  | "name"
  | "producer"
  | "vintage"
  | "style"
  | "quantity"
  | "purchase_price"
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
  { key: "purchase_price", label: "Preço", kind: "number", align: "right", placeholder: "0,00", optional: true },
];

const advancedColumns: ColumnDef[] = [
  { key: "country", label: "País", kind: "text", placeholder: "País", optional: true },
  { key: "region", label: "Região", kind: "text", placeholder: "Região", optional: true },
  { key: "grape", label: "Uva", kind: "text", placeholder: "Uva", optional: true },
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
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [bulkProducer, setBulkProducer] = useState("");
  const [bulkVintage, setBulkVintage] = useState("");
  const [enriching, setEnriching] = useState(false);
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
      errors,
      image_url: cellarDuplicate?.image_url || buildGeneratedThumbnail({ ...row, style: type }),
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

  const enrichDraftRows = async () => {
    setEnriching(true);
    try {
      // Show advanced columns so the user sees enriched fields
      setShowAdvancedColumns(true);

      // Identify rows that need enrichment (missing producer/country/region/grape/style)
      const rowsNeedingEnrichment = draftWines
        .map((row, index) => ({ row, index }))
        .filter(({ row }) =>
          row.name?.trim() && (!row.producer || !row.country || !row.region || !row.grape || !row.style),
        );

      // Build a CSV-style batch payload: one chunk of up to 30 wines per AI call
      // This is dramatically faster than 1 call per row.
      const BATCH_SIZE = 30;
      const aiResultsByName = new Map<string, any>();

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
        }
      }

      // Apply AI enrichment + price estimation per row (in parallel for prices, capped)
      const PRICE_CONCURRENCY = 5;
      const enriched: DraftWine[] = [];
      for (let i = 0; i < draftWines.length; i += PRICE_CONCURRENCY) {
        const slice = draftWines.slice(i, i + PRICE_CONCURRENCY);
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
              image_url: row.image_url || match?.wine?.image_url || buildGeneratedThumbnail({ ...row, type: finalStyle }),
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
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    }

    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
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

  const parseCsvLocally = (text: string): { wines: ParsedWine[]; mapping: Record<string, string> } => {
    if (!text || !text.trim()) return { wines: [], mapping: {} };
    const delimiter = detectDelimiter(text);
    const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 2) return { wines: [], mapping: {} };

    const headerCells = splitCsvLine(lines[0], delimiter);
    const fieldByCol: (EditableField | undefined)[] = headerCells.map(mapHeaderToField);
    const mapping: Record<string, string> = {};
    headerCells.forEach((h, i) => {
      if (fieldByCol[i]) mapping[h] = fieldByCol[i] as string;
    });

    // Need at least the name column to be useful
    const hasName = fieldByCol.includes("name");
    if (!hasName) return { wines: [], mapping };

    const wines: ParsedWine[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cells = splitCsvLine(lines[r], delimiter);
      const row: Partial<ParsedWine> = {};
      cells.forEach((value, colIndex) => {
        const field = fieldByCol[colIndex];
        if (!field || !value) return;
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
      const name = (row.name || "").trim();
      if (name.length >= 2 && name.length <= 120) {
        wines.push({
          name,
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
        });
      }
    }
    return { wines, mapping };
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
    setBulkProducer("");
    setBulkVintage("");
    setEnriching(false);
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

  const applyBulkAll = () => {
    const producer = bulkProducer.trim();
    const vintage = Number.parseInt(bulkVintage, 10);
    const hasProducer = producer.length > 0;
    const hasVintage = Number.isFinite(vintage);
    if (!hasProducer && !hasVintage) return;
    syncRows((current) =>
      current.map((row) => ({
        ...row,
        producer: hasProducer ? producer : row.producer,
        vintage: hasVintage ? vintage : row.vintage,
      })),
    );
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

  const getFieldValue = (row: DraftWine, field: EditableField) => {
    switch (field) {
      case "quantity":
        return row.quantity ?? "";
      case "purchase_price":
        return formatPrice((row as DraftWine).price ?? row.purchase_price);
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

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStep("analyzing");

    try {
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
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isStructured = ["csv", "tsv", "txt", "xlsx", "xls", "ods"].includes(ext);

      // Only use the fast path if the local parse extracted RICH data (avg ≥4 fields per row).
      const avgFieldsPerRow = local.wines.length > 0
        ? local.wines.reduce((sum, w) => {
            return sum + Object.values(w).filter((v) => v !== undefined && v !== null && v !== "").length;
          }, 0) / local.wines.length
        : 0;

      if (isStructured && local.wines.length >= 1 && avgFieldsPerRow >= 4) {
        rebuildDraftRows(local.wines);
        setColumnMapping(local.mapping);
        setAiNotes(`Identificamos ${local.wines.length} vinho(s) automaticamente. Revise antes de importar.`);
        setParseErrors([]);
        setEditMode(true);
        setShowAdvancedColumns(false);
        setSelectedRows([]);
        setBulkProducer("");
        setBulkVintage("");
        setStep("preview");
        return;
      }

      // ── 2) AI FALLBACK: PDFs, Word, or CSVs without recognizable headers ──
      let data: any = null;
      try {
        data = await invokeEdgeFunction<any>(
          "parse-csv-wines",
          { csvContent, fileName: file.name, fileType: file.type || null },
          { timeoutMs: 60_000, retries: 1 },
        );
      } catch (aiErr: any) {
        // If we have ANY local rows, use them as fallback even if AI fails
        if (local.wines.length > 0) {
          rebuildDraftRows(local.wines);
          setColumnMapping(local.mapping);
          setAiNotes("Importação automática (sem IA). Revise os campos antes de confirmar.");
          setParseErrors([]);
          setStep("preview");
          return;
        }
        throw aiErr;
      }

      if (data?.error) {
        if (local.wines.length > 0) {
          rebuildDraftRows(local.wines);
          setColumnMapping(local.mapping);
          setAiNotes("");
          setParseErrors([`A análise inteligente falhou (${data.error}). Mostrando dados extraídos localmente para você revisar.`]);
          setStep("preview");
          return;
        }
        setParseErrors([
          String(data.error),
          "Nossa inteligência está instável agora. Tente novamente em alguns instantes ou divida o arquivo em partes menores.",
          "Para CSV/Excel, garanta uma linha de cabeçalho com colunas como 'Nome', 'Produtor', 'Safra', 'Tipo', 'Quantidade', 'Preço'.",
        ]);
        setDraftWines([]);
        setStep("preview");
        return;
      }

      const wines: ParsedWine[] = (data?.wines || []).map((w: any) => ({
        name: normalizeText(w.name) || "",
        producer: normalizeText(w.producer),
        vintage: parseYear(w.vintage),
        style: normalizeStyle(w.style),
        country: normalizeText(w.country),
        region: normalizeText(w.region),
        grape: normalizeText(w.grape),
        quantity: parseQuantity(w.quantity),
        purchase_price: parsePrice(w.purchase_price),
        cellar_location: normalizeText(w.cellar_location),
        drink_from: parseYear(w.drink_from),
        drink_until: parseYear(w.drink_until),
      }));

      const validWines = wines.filter((w) => w.name.length >= 2 && w.name.length <= 120);
      // Merge AI + local results when both produced rows
      const merged = validWines.length > 0 ? validWines : local.wines;
      rebuildDraftRows(merged);
      setColumnMapping({ ...(local.mapping || {}), ...(data?.column_mapping || {}) });
      setAiNotes(data?.notes || "");
      setParseErrors([]);
      setEditMode(true);
      setShowAdvancedColumns(false);
      setSelectedRows([]);
      setBulkProducer("");
      setBulkVintage("");
      setStep("preview");
      if (merged.length === 0) {
        setParseErrors([
          "Não encontramos linhas válidas de vinho neste arquivo.",
          "Dica: para CSV/Excel, inclua um cabeçalho com 'Nome', 'Produtor', 'Safra', 'Tipo', 'Quantidade'.",
        ]);
      }

      if (raw.length > MAX_CLIENT_INPUT_CHARS) {
        toast({
          title: "Arquivo muito grande",
          description: "Importamos uma amostra do arquivo para manter a qualidade da análise. Se precisar, importe em partes.",
        });
      }
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
          current_value: null,
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
  const hasValidationErrors = Object.keys(rowErrors).length > 0;
  const canImport = draftWines.length > 0 && !hasValidationErrors;
  const allFieldsVisible = showAdvancedColumns;
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
                <div className="relative h-full w-full">
                  <img
                    src={row.image_url || buildGeneratedThumbnail({ ...row, type: row.type || row.style })}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {isIllustrativeImage(row.image_url) ? (
                    <div className="absolute right-1.5 top-1.5 rounded-full border border-white/20 bg-white/72 px-1.5 py-0.5 text-[8px] font-medium text-[#6F6B61] backdrop-blur-sm">
                      Ilustrativa
                    </div>
                  ) : null}
                </div>
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
        className="left-1/2 top-1/2 right-auto bottom-auto h-[85vh] w-[90vw] max-w-[1300px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-0 p-0 gap-0 overflow-hidden"
        style={{
          left: "50%",
          top: "50%",
          right: "auto",
          bottom: "auto",
          transform: "translate(-50%, -50%)",
          width: "90vw",
          maxWidth: "1300px",
          height: "85vh",
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
                onClick={() => void enrichDraftRows()}
                className="h-9 text-[12px] px-3"
                disabled={enriching || draftWines.length === 0}
              >
                {enriching ? "Completando..." : "✨ Completar com IA"}
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
              <div className="flex-1 min-h-0 overflow-auto">
                <AnimatePresence mode="wait">
                  {step === "upload" && (
                    <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-6">
                      <div
                        className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors hover:border-primary/30"
                        style={{ borderColor: "rgba(143,45,86,0.15)" }}
                        onClick={() => fileRef.current?.click()}
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
                        accept=".csv,.txt,.tsv,.xls,.xlsx,.ods,.pdf,.doc,.docx,.rtf,text/plain,text/csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
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
                      <p className="text-sm font-semibold" style={{ color: "#0F0F14" }}>
                        Sommelyx está analisando…
                      </p>
                      <p className="mt-1.5 text-xs" style={{ color: "#9CA3AF" }}>
                        Identificando colunas e organizando os dados de <strong>{fileName}</strong>
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

                      <div className="grid gap-3 shrink-0 lg:grid-cols-[1fr_1fr_auto]">
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
                        <div className="flex items-center gap-2 justify-start lg:justify-end">
                          <Button variant="secondary" size="sm" onClick={applyProducerToSelected} disabled={!editMode || !bulkProducer.trim() || selectedRows.length === 0}>
                            Produtor aos selecionados
                          </Button>
                          <Button variant="secondary" size="sm" onClick={applyVintageToSelected} disabled={!editMode || !bulkVintage.trim() || selectedRows.length === 0}>
                            Safra aos selecionados
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

              {draftWines.length > 0 && (
                        <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-black/5 bg-white">
                          <div className="h-full overflow-auto">
                            <table className="min-w-full border-separate border-spacing-0 text-[12px]">
                              <thead className="sticky top-0 z-10 bg-white">
                                <tr className="text-xs uppercase tracking-wide" style={{ background: "linear-gradient(180deg, #F8F6F2 0%, #F2EFE9 100%)" }}>
                                  <th className="sticky top-0 z-20 w-12 px-3 py-3 text-left font-semibold text-black/50 border-b border-black/10">
                                    <Checkbox checked={allRowsSelected} onCheckedChange={toggleAllRows} />
                                  </th>
                                  {visibleColumns.map((column) => (
                                    <th
                                      key={column.key}
                                      className={cn(
                                        "sticky top-0 z-20 px-3 py-3 text-left font-semibold text-[#5F5F5F] text-[10.5px] tracking-[0.08em] border-b border-black/10",
                                        column.align === "right" && "text-right",
                                      )}
                                      style={{
                                        width: column.key === "name" ? "20rem" :
                                          column.key === "producer" ? "14rem" :
                                          column.key === "style" ? "10rem" :
                                          column.key === "vintage" || column.key === "quantity" ? "6.5rem" : undefined,
                                      }}
                                    >
                                      {column.label}{!column.optional ? <span className="text-[#7B1E2B] ml-0.5">*</span> : null}
                                    </th>
                                  ))}
                                  <th className="sticky top-0 z-20 w-12 px-2 py-3 text-center font-semibold text-black/40 border-b border-black/10">
                                    
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {draftWines.map((w, i) => {
                                  const rowHasError = !!rowErrors[i];
                                  const accent = accentForRow(w);
                                  return (
                                    <tr
                                      key={`row-${i}`}
                            className={cn(
                              "transition hover:bg-[#FAF8F4] group",
                              selectedSet.has(i) && "bg-[#7B1E2B]/[0.03]",
                            )}
                            style={{ borderLeft: `4px solid ${rowHasError ? "#D88C7A" : accent.bar}` }}
                          >
                            <td className="px-3 py-2 align-top border-b border-black/5">
                              <div className="flex flex-col items-center gap-2 pt-1">
                                <Checkbox checked={selectedSet.has(i)} onCheckedChange={() => toggleRowSelection(i)} />
                                <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent.dot }} title={w.type || w.style || "Tipo n/i"} />
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]",
                                    rowHasError
                                      ? "bg-rose-100 text-rose-700"
                                      : w.confidence >= 0.78
                                        ? "bg-emerald-100 text-emerald-700"
                                        : w.confidence >= 0.55
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-rose-50 text-rose-600",
                                  )}
                                >
                                  {rowHasError ? "Crítico" : w.confidence >= 0.78 ? "Completo" : w.confidence >= 0.55 ? "Parcial" : "Revisar"}
                                </span>
                              </div>
                            </td>
                            {visibleColumns.map((column) => renderEditableCell(w, i, column))}
                            <td className="px-2 py-2 align-top text-center border-b border-black/5">
                              <button
                                type="button"
                                onClick={() => removeRow(i)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 inline-flex items-center justify-center rounded-full text-[#A39A90] hover:bg-rose-50 hover:text-rose-600"
                                title="Remover linha"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                              </tbody>
                            </table>
                            <div className="px-3 py-3 border-t border-black/5 bg-[#FBFAF7]">
                              <button
                                type="button"
                                onClick={addBlankRow}
                                disabled={!editMode}
                                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium text-[#5F5F5F] hover:bg-white hover:text-[#7B1E2B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <span className="text-[16px] leading-none">+</span> Adicionar linha em branco
                              </button>
                            </div>
                          </div>
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
