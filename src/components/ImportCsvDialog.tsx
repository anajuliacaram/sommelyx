import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, AlertTriangle, X } from "lucide-react";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

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

function parseCsv(text: string): { wines: ParsedWine[]; errors: string[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { wines: [], errors: ["Arquivo vazio ou sem dados."] };

  const header = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/"/g, ""));
  const errors: string[] = [];
  const wines: ParsedWine[] = [];

  const col = (name: string) => header.indexOf(name);
  const nameIdx = Math.max(col("name"), col("nome"), col("vinho"));
  if (nameIdx === -1) return { wines: [], errors: ['Coluna "nome" ou "name" não encontrada no cabeçalho.'] };

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(/[,;\t]/).map(v => v.trim().replace(/^"|"$/g, ""));
    const name = vals[nameIdx];
    if (!name) { errors.push(`Linha ${i + 1}: nome vazio, ignorada.`); continue; }

    const getVal = (keys: string[]) => {
      for (const k of keys) {
        const idx = col(k);
        if (idx >= 0 && vals[idx]) return vals[idx];
      }
      return undefined;
    };

    wines.push({
      name,
      producer: getVal(["producer", "produtor"]),
      vintage: getVal(["vintage", "safra"]) ? parseInt(getVal(["vintage", "safra"])!) : undefined,
      style: getVal(["style", "estilo", "tipo"]),
      country: getVal(["country", "pais", "país"]),
      region: getVal(["region", "regiao", "região"]),
      grape: getVal(["grape", "uva"]),
      quantity: getVal(["quantity", "quantidade", "qty"]) ? parseInt(getVal(["quantity", "quantidade", "qty"])!) : 1,
      purchase_price: getVal(["price", "preco", "preço", "purchase_price"]) ? parseFloat(getVal(["price", "preco", "preço", "purchase_price"])!) : undefined,
      cellar_location: getVal(["location", "localização", "localizacao", "cellar_location"]),
      drink_from: getVal(["drink_from", "beber_de"]) ? parseInt(getVal(["drink_from", "beber_de"])!) : undefined,
      drink_until: getVal(["drink_until", "beber_ate"]) ? parseInt(getVal(["drink_until", "beber_ate"])!) : undefined,
    });
  }

  return { wines, errors };
}

export function ImportCsvDialog({ open, onOpenChange }: ImportCsvDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsed, setParsed] = useState<ParsedWine[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const addWine = useAddWine();
  const { toast } = useToast();

  const reset = () => {
    setStep("upload"); setParsed([]); setParseErrors([]); setImportProgress(0); setImportErrors([]);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { wines, errors } = parseCsv(text);
      setParsed(wines);
      setParseErrors(errors);
      setStep("preview");
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

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg">Importar CSV</SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              <div
                className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors hover:border-primary/30"
                style={{ borderColor: "rgba(143,45,86,0.15)" }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 mx-auto mb-3" style={{ color: "#8F2D56" }} />
                <p className="text-sm font-medium" style={{ color: "#0F0F14" }}>Arraste o arquivo CSV ou clique para selecionar</p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Colunas aceitas: nome, produtor, safra, estilo, país, uva, quantidade, preço</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              
              <div className="mt-5 p-4 rounded-xl" style={{ background: "rgba(143,45,86,0.04)", border: "1px solid rgba(143,45,86,0.08)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "#8F2D56" }}>
                  <FileText className="h-3.5 w-3.5 inline mr-1 -mt-0.5" /> Formato esperado
                </p>
                <code className="text-[10px] block font-mono leading-relaxed" style={{ color: "#6B7280" }}>
                  nome,produtor,safra,estilo,país,uva,quantidade,preço
                  <br />Malbec Reserva,Catena,2020,tinto,Argentina,Malbec,6,89.90
                </code>
              </div>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "#0F0F14" }}>
                  {parsed.length} vinho(s) encontrado(s)
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
                  <X className="h-3 w-3 mr-1" /> Trocar arquivo
                </Button>
              </div>

              {parseErrors.length > 0 && (
                <div className="p-3 rounded-xl space-y-1" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  {parseErrors.map((e, i) => (
                    <p key={i} className="text-[11px] flex items-center gap-1" style={{ color: "#d97706" }}>
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
                    </p>
                  ))}
                </div>
              )}

              <div className="max-h-[300px] overflow-y-auto rounded-xl" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Nome</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Safra</th>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Estilo</th>
                      <th className="text-right px-3 py-2 font-semibold" style={{ color: "#6B7280" }}>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 20).map((w, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <td className="px-3 py-2 font-medium truncate max-w-[160px]" style={{ color: "#0F0F14" }}>{w.name}</td>
                        <td className="px-3 py-2" style={{ color: "#6B7280" }}>{w.vintage || "—"}</td>
                        <td className="px-3 py-2 capitalize" style={{ color: "#6B7280" }}>{w.style || "—"}</td>
                        <td className="px-3 py-2 text-right font-medium" style={{ color: "#0F0F14" }}>{w.quantity || 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 20 && (
                  <p className="text-[10px] text-center py-2" style={{ color: "#9CA3AF" }}>...e mais {parsed.length - 20} vinhos</p>
                )}
              </div>

              <Button onClick={handleImport} className="w-full gradient-wine text-primary-foreground btn-glow h-11 text-[13px] font-medium" disabled={parsed.length === 0}>
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
