import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, Check, AlertTriangle, X, Sparkles, Loader2 } from "@/icons/lucide";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { invokeEdgeFunction } from "@/lib/edge-invoke";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateWineLocation } from "@/hooks/useWineLocations";

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

export function ImportCsvDialog({ open, onOpenChange }: ImportCsvDialogProps) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";
  const [step, setStep] = useState<"upload" | "analyzing" | "preview" | "importing" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedWine[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [aiNotes, setAiNotes] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setColumnMapping({});
    setAiNotes("");
    setParseErrors([]);
    setImportProgress(0);
    setImportErrors([]);
    setImportWarnings([]);
    setFileName("");
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStep("analyzing");

    try {
      const raw = await fileToCsvLikeText(file);
      const csvContent = raw.length > MAX_CLIENT_INPUT_CHARS ? raw.slice(0, MAX_CLIENT_INPUT_CHARS) : raw;

      const data = await invokeEdgeFunction<any>(
        "parse-csv-wines",
        { csvContent, fileName: file.name, fileType: file.type || null },
        { timeoutMs: 45_000, retries: 1 },
      );

      if (data?.error) {
        setParseErrors([String(data.error)]);
        setParsed([]);
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
      setParsed(validWines);
      setColumnMapping(data?.column_mapping || {});
      setAiNotes(data?.notes || "");
      setParseErrors([]);
      setStep("preview");
      if (validWines.length === 0) {
        setParseErrors(["Não encontramos linhas válidas de vinho neste arquivo."]);
      }

      if (raw.length > MAX_CLIENT_INPUT_CHARS) {
        toast({
          title: "Arquivo muito grande",
          description: "Importamos uma amostra do arquivo para manter a qualidade da análise. Se precisar, importe em partes.",
        });
      }
    } catch (err: any) {
      console.error("AI parse error:", err);
      setParseErrors([err?.message || "Erro ao analisar o arquivo. Tente novamente."]);
      setParsed([]);
      setStep("preview");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setStep("importing");
    const errors: string[] = [];
    const warnings: string[] = [];
    const responsibleName = getResponsibleName();

    for (let i = 0; i < parsed.length; i++) {
      const w = parsed[i];
      const wineName = w.name?.trim() || `Linha ${i + 1}`;
      try {
        const inserted = await addWine.mutateAsync({
          name: wineName,
          producer: w.producer || null,
          quantity: Math.min(9_999, Math.max(1, Math.trunc(w.quantity || 1))),
          vintage: w.vintage || null,
          style: w.style || null,
          country: w.country || null,
          region: w.region || null,
          grape: w.grape || null,
          purchase_price: typeof w.purchase_price === "number" ? w.purchase_price : null,
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
      setImportProgress(Math.round(((i + 1) / parsed.length) * 100));
    }
    setImportErrors(errors);
    setImportWarnings(warnings);
    setStep("done");
  };

  const mappingEntries = Object.entries(columnMapping);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "#8F2D56" }} />
            Importar documento / planilha
          </SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
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
                 <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
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

              <div className="mt-5 p-4 rounded-xl" style={{ background: "rgba(143,45,86,0.04)", border: "1px solid rgba(143,45,86,0.08)" }}>
                <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#8F2D56" }}>
                  <Sparkles className="h-3.5 w-3.5" /> Sommelyx Inteligente
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "#6B7280" }}>
                  Não se preocupe com a ordem ou nome das colunas. O Sommelyx analisa o conteúdo e mapeia automaticamente os dados — nome do vinho, produtor, safra, preço, quantidade e mais.
                </p>
              </div>
            </motion.div>
          )}

          {step === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center py-16">
              <div className="relative w-16 h-16 mx-auto mb-5">
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
              <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
                Identificando colunas e organizando os dados de <strong>{fileName}</strong>
              </p>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "#0F0F14" }}>
                  <Sparkles className="h-3.5 w-3.5 inline mr-1 -mt-0.5" style={{ color: "#8F2D56" }} />
                  {parsed.length} vinho(s) identificado(s)
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
                  <X className="h-3 w-3 mr-1" /> Trocar
                </Button>
              </div>

              {/* AI column mapping info */}
              {mappingEntries.length > 0 && (
                <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#16a34a" }}>
                    Mapeamento Sommelyx
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mappingEntries.map(([from, to]) => (
                      <span
                        key={from}
                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(34,197,94,0.08)", color: "#15803d" }}
                      >
                        {from} → {to}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI notes */}
              {aiNotes && (
                <div className="p-3 rounded-xl" style={{ background: "rgba(143,45,86,0.04)", border: "1px solid rgba(143,45,86,0.08)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8F2D56" }}>
                    Observações Sommelyx
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#6B7280" }}>{aiNotes}</p>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className="p-3.5 rounded-xl space-y-1.5" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  {parseErrors.map((e, i) => (
                    <p key={i} className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: "#b45309" }}>
                      <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#d97706" }} /> {e}
                    </p>
                  ))}
                </div>
              )}

              {parsed.length > 0 && (
                <div className="max-h-[280px] overflow-y-auto rounded-xl" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Nome</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Produtor</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Safra</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Estilo</th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Qtd</th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Preço</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.slice(0, 30).map((w, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                          <td className="px-3 py-2 font-medium truncate max-w-[140px]" style={{ color: "#0F0F14" }}>{w.name}</td>
                          <td className="px-3 py-2 truncate max-w-[100px]" style={{ color: "#6B7280" }}>{w.producer || "—"}</td>
                          <td className="px-3 py-2" style={{ color: "#6B7280" }}>{w.vintage || "—"}</td>
                          <td className="px-3 py-2 capitalize" style={{ color: "#6B7280" }}>{w.style || "—"}</td>
                          <td className="px-3 py-2 text-right font-medium" style={{ color: "#0F0F14" }}>{w.quantity || 1}</td>
                          <td className="px-3 py-2 text-right" style={{ color: "#6B7280" }}>
                            {w.purchase_price ? `R$ ${w.purchase_price.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.length > 30 && (
                    <p className="text-[10px] text-center py-2" style={{ color: "#9CA3AF" }}>
                      ...e mais {parsed.length - 30} vinhos
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleImport}
                variant="primary"
                className="w-full h-11 text-[13px] font-medium shadow-float"
                disabled={parsed.length === 0}
              >
                <Upload className="h-4 w-4 mr-1.5" /> Importar {parsed.length} vinho(s)
              </Button>
            </motion.div>
          )}

          {step === "importing" && (
            <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center py-12">
              <div className="w-full h-2 rounded-full overflow-hidden mb-4" style={{ background: "rgba(0,0,0,0.04)" }}>
                <motion.div className="h-full rounded-full gradient-wine" style={{ width: `${importProgress}%` }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#0F0F14" }}>Importando... {importProgress}%</p>
              <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Não feche esta janela</p>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center py-12">
              <div className="w-14 h-14 rounded-full gradient-wine flex items-center justify-center glow-wine mx-auto mb-4">
                <Check className="h-7 w-7 text-primary-foreground" />
              </div>
              <p className="text-sm font-medium" style={{ color: "#0F0F14" }}>
                {parsed.length - importErrors.length} vinho(s) importado(s) com sucesso!
              </p>
              {importErrors.length > 0 && (
                <p className="text-xs mt-2" style={{ color: "#f59e0b" }}>
                  {importErrors.length} linha(s) não puderam ser importadas
                </p>
              )}
              {importWarnings.length > 0 && (
                <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>
                  {importWarnings.length} aviso(s) de localização
                </p>
              )}
              {importErrors.length > 0 && (
                <div className="mt-4 text-left max-h-36 overflow-y-auto rounded-xl p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  {importErrors.slice(0, 5).map((error, idx) => (
                    <p key={idx} className="text-[11px] leading-relaxed" style={{ color: "#b45309" }}>
                      • {error}
                    </p>
                  ))}
                  {importErrors.length > 5 && (
                    <p className="text-[10px] mt-1.5" style={{ color: "#9CA3AF" }}>
                      ...e mais {importErrors.length - 5} erro(s)
                    </p>
                  )}
                </div>
              )}
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="mt-5 text-[13px]">
                Fechar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
