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
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const addWine = useAddWine();
  const createLocation = useCreateWineLocation();
  const { toast } = useToast();

  const MAX_CLIENT_INPUT_CHARS = 1_900_000;

  const readTextFile = async (file: File) => {
    const text = await file.text();
    return text;
  };

  const readSpreadsheetAsCsv = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) return "";
    const ws = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(ws, { FS: ",", RS: "\n" });
  };

  const readPdfAsText = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

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

  const fileToCsvLikeText = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (ext === "xlsx" || ext === "xls" || ext === "ods") {
      return await readSpreadsheetAsCsv(file);
    }
    if (ext === "pdf") {
      return await readPdfAsText(file);
    }
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
        { timeoutMs: 75_000, retries: 2 },
      );

      if (data?.error) {
        setParseErrors([String(data.error)]);
        setParsed([]);
        setStep("preview");
        return;
      }

      const wines: ParsedWine[] = (data?.wines || []).map((w: any) => ({
        name: w.name || "",
        producer: w.producer || undefined,
        vintage: w.vintage ? Number(w.vintage) : undefined,
        style: w.style || undefined,
        country: w.country || undefined,
        region: w.region || undefined,
        grape: w.grape || undefined,
        quantity: w.quantity ? Number(w.quantity) : 1,
        purchase_price: w.purchase_price ? Number(w.purchase_price) : undefined,
        cellar_location: w.cellar_location || undefined,
        drink_from: w.drink_from ? Number(w.drink_from) : undefined,
        drink_until: w.drink_until ? Number(w.drink_until) : undefined,
      }));

      setParsed(wines.filter((w) => w.name));
      setColumnMapping(data?.column_mapping || {});
      setAiNotes(data?.notes || "");
      setParseErrors([]);
      setStep("preview");

      if (raw.length > MAX_CLIENT_INPUT_CHARS) {
        toast({
          title: "Arquivo muito grande",
          description: "Importamos uma amostra do arquivo para manter a qualidade da análise com IA. Se precisar, importe em partes.",
        });
      }
    } catch (err: any) {
      console.error("AI parse error:", err);
      setParseErrors([err?.message || "Erro ao analisar o arquivo com IA."]);
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
    for (let i = 0; i < parsed.length; i++) {
      const w = parsed[i];
      try {
        const inserted = await addWine.mutateAsync({
          name: w.name,
          producer: w.producer || null,
          quantity: w.quantity || 1,
          vintage: w.vintage || null,
          style: w.style || null,
          country: w.country || null,
          region: w.region || null,
          grape: w.grape || null,
          purchase_price: w.purchase_price || null,
          current_value: null,
          cellar_location: w.cellar_location || null,
          drink_from: w.drink_from || null,
          drink_until: w.drink_until || null,
          food_pairing: null,
          tasting_notes: null,
          rating: null,
          image_url: null,
        });

        if (inserted?.id && user) {
          const resp = typeof user.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : null;
          await createLocation.mutateAsync({
            wineId: inserted.id,
            manualLabel: w.cellar_location || null,
            quantity: w.quantity || 1,
            responsibleName: isCommercial ? resp : null,
            reason: isCommercial ? "Entrada manual" : null,
            notes: null,
          });
        }
      } catch {
        errors.push(`Erro ao importar "${w.name}"`);
      }
      setImportProgress(Math.round(((i + 1) / parsed.length) * 100));
    }
    setImportErrors(errors);
    setStep("done");
  };

  const mappingEntries = Object.entries(columnMapping);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary/70" />
            Importar com IA
          </SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 pt-6">
              <div
                className="border-2 border-dashed border-border/50 rounded-xl p-10 text-center cursor-pointer transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-primary/50" />
                <p className="text-sm font-medium text-foreground">
                  Arraste o arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV, Excel (XLS/XLSX) ou PDF
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv,.xls,.xlsx,.ods,.pdf,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />

              <div className="p-4 rounded-xl bg-primary/[0.04] border border-primary/[0.08]">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> IA inteligente
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Não se preocupe com a ordem ou nome das colunas. Nossa IA analisa o conteúdo e mapeia automaticamente os dados — nome do vinho, produtor, safra, preço, quantidade e mais.
                </p>
              </div>
            </motion.div>
          )}

          {step === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5 pt-16 pb-12">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  Analisando planilha com IA…
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Identificando colunas e organizando os dados de <strong className="text-foreground/80">{fileName}</strong>
                </p>
              </div>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                  {parsed.length} vinho(s) identificado(s)
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-[11px] text-muted-foreground">
                  <X className="h-3 w-3 mr-1" /> Trocar
                </Button>
              </div>

              {mappingEntries.length > 0 && (
                <div className="p-3 rounded-xl bg-success/[0.05] border border-success/[0.12]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-success mb-1.5">
                    Mapeamento automático
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mappingEntries.map(([from, to]) => (
                      <span
                        key={from}
                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium bg-success/[0.08] text-success"
                      >
                        {from} → {to}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {aiNotes && (
                <div className="p-3 rounded-xl bg-primary/[0.04] border border-primary/[0.08]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                    Observações da IA
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{aiNotes}</p>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className="p-3 rounded-xl space-y-1 bg-warning/[0.06] border border-warning/[0.12]">
                  {parseErrors.map((e, i) => (
                    <p key={i} className="text-[11px] flex items-center gap-1 text-warning">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
                    </p>
                  ))}
                </div>
              )}

              {parsed.length > 0 && (
                <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border/40">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/40">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nome</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Produtor</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Safra</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Estilo</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Qtd</th>
                        <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Preço</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.slice(0, 30).map((w, i) => (
                        <tr key={i} className="border-b border-border/20 last:border-0">
                          <td className="px-3 py-2 font-medium text-foreground truncate max-w-[140px]">{w.name}</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{w.producer || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{w.vintage || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground capitalize">{w.style || "—"}</td>
                          <td className="px-3 py-2 text-right font-medium text-foreground">{w.quantity || 1}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {w.purchase_price ? `R$ ${w.purchase_price.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.length > 30 && (
                    <p className="text-[10px] text-center py-2 text-muted-foreground">
                      …e mais {parsed.length - 30} vinhos
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleImport}
                variant="primary"
                className="w-full h-11 text-[13px] font-semibold"
                disabled={parsed.length === 0}
              >
                <Upload className="h-4 w-4 mr-1.5" /> Importar {parsed.length} vinho(s)
              </Button>
            </motion.div>
          )}

          {step === "importing" && (
            <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5 pt-16 pb-12">
              <div className="w-full max-w-xs">
                <div className="w-full h-2 rounded-full overflow-hidden bg-muted/30">
                  <motion.div className="h-full rounded-full gradient-wine" style={{ width: `${importProgress}%` }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Importando… {importProgress}%</p>
                <p className="text-xs text-muted-foreground mt-1">Não feche esta janela</p>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 pt-16 pb-12">
              <div className="w-14 h-14 rounded-full gradient-wine flex items-center justify-center glow-wine">
                <Check className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {parsed.length - importErrors.length} vinho(s) importado(s) com sucesso!
                </p>
                {importErrors.length > 0 && (
                  <p className="text-xs text-warning mt-1.5">
                    {importErrors.length} erro(s) durante importação
                  </p>
                )}
              </div>
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} className="h-10 text-[13px] mt-2">
                Fechar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
