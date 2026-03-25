import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, AlertTriangle, X, Sparkles, Loader2 } from "lucide-react";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();

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

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target?.result as string;

      try {
        const { data, error } = await supabase.functions.invoke("parse-csv-wines", {
          body: { csvContent },
        });

        if (error) throw new Error(error.message || "Erro ao processar arquivo");

        if (data.error) {
          setParseErrors([data.error]);
          setParsed([]);
          setStep("preview");
          return;
        }

        const wines: ParsedWine[] = (data.wines || []).map((w: any) => ({
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
        setColumnMapping(data.column_mapping || {});
        setAiNotes(data.notes || "");
        setParseErrors([]);
        setStep("preview");
      } catch (err: any) {
        console.error("AI parse error:", err);
        setParseErrors([err.message || "Erro ao analisar o arquivo com IA."]);
        setParsed([]);
        setStep("preview");
      }
    };
    reader.readAsText(file);
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
        await addWine.mutateAsync({
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
            <Sparkles className="h-4 w-4" style={{ color: "#8F2D56" }} />
            Importar com IA
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
                  Arraste o arquivo ou clique para selecionar
                </p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                  CSV, TSV ou TXT — qualquer formato de colunas
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv,.xls,.xlsx"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />

              <div className="mt-5 p-4 rounded-xl" style={{ background: "rgba(143,45,86,0.04)", border: "1px solid rgba(143,45,86,0.08)" }}>
                <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#8F2D56" }}>
                  <Sparkles className="h-3.5 w-3.5" /> IA inteligente
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "#6B7280" }}>
                  Não se preocupe com a ordem ou nome das colunas. Nossa IA analisa o conteúdo e mapeia automaticamente os dados — nome do vinho, produtor, safra, preço, quantidade e mais.
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
                Analisando planilha com IA...
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
                    Mapeamento automático
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
                    Observações da IA
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#6B7280" }}>{aiNotes}</p>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className="p-3 rounded-xl space-y-1" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  {parseErrors.map((e, i) => (
                    <p key={i} className="text-[11px] flex items-center gap-1" style={{ color: "#d97706" }}>
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
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
                className="w-full gradient-wine text-primary-foreground btn-glow h-11 text-[13px] font-medium"
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
                  {importErrors.length} erro(s) durante importação
                </p>
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
