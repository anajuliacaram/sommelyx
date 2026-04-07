import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Search, Loader2, Wine, Sparkles, Camera, ArrowLeft, ChefHat, FileText } from "@/icons/lucide";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDishWineSuggestions, getWinePairings, analyzeWineList, analyzeMenuForWine, buildUserProfile, type WineSuggestion, type PairingResult, type WineListAnalysis, type MenuAnalysis } from "@/lib/sommelier-ai";
import { prepareAiAnalysisAttachment, type AiAnalysisAttachmentPayload } from "@/lib/ai-attachments";
import { cn } from "@/lib/utils";
import { useWines } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";

interface DishToWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Source = null | "cellar" | "external";
type SubMode = null | "by-dish" | "by-wine";
type Step =
  | "source"
  | "sub-mode"
  | "dish"
  | "select-wine"
  | "results"
  | "wine-results"
  | "photo"
  | "scanning"
  | "scan-results"
  | "ext-wine-input"
  | "ext-menu-photo"
  | "ext-menu-scanning"
  | "ext-menu-results";

const matchDot: Record<string, string> = {
  perfeito: "bg-success",
  "muito bom": "bg-success/70",
  bom: "bg-warning",
};

const popularDishes = [
  "Picanha na brasa",
  "Risoto de funghi",
  "Salmão grelhado",
  "Pasta ao pesto",
  "Pizza margherita",
  "Cordeiro assado",
];

export function DishToWineDialog({ open, onOpenChange }: DishToWineDialogProps) {
  const { data: wines } = useWines();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const menuFileRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<Source>(null);
  const [subMode, setSubMode] = useState<SubMode>(null);
  const [step, setStep] = useState<Step>("source");
  const [dish, setDish] = useState("");
  const [extWineName, setExtWineName] = useState("");
  const [selectedWineId, setSelectedWineId] = useState("");
  const [suggestions, setSuggestions] = useState<WineSuggestion[] | null>(null);
  const [pairings, setPairings] = useState<PairingResult[] | null>(null);
  const [scanResults, setScanResults] = useState<WineListAnalysis | null>(null);
  const [menuResults, setMenuResults] = useState<MenuAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url?: string | null; fileName: string; isPdf: boolean } | null>(null);
  const [lastWineListAttachment, setLastWineListAttachment] = useState<AiAnalysisAttachmentPayload | null>(null);
  const [lastMenuAttachment, setLastMenuAttachment] = useState<AiAnalysisAttachmentPayload | null>(null);

  const reset = () => {
    setSource(null);
    setSubMode(null);
    setStep("source");
    setDish("");
    setExtWineName("");
    setSelectedWineId("");
    setSuggestions(null);
    setPairings(null);
    setScanResults(null);
    setMenuResults(null);
    setLoading(false);
    setError(null);
    setPreview(null);
    setLastWineListAttachment(null);
    setLastMenuAttachment(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSelectSource = (s: Source) => {
    setSource(s);
    setStep("sub-mode");
  };

  const handleSelectSubMode = (mode: SubMode) => {
    setSubMode(mode);
    if (source === "cellar") {
      if (mode === "by-dish") setStep("dish");
      else setStep("select-wine");
    } else {
      if (mode === "by-dish") setStep("dish");
      else setStep("ext-wine-input");
    }
  };

  // Search cellar wines for a dish
  const handleSearchCellar = useCallback(async (dishName?: string) => {
    const query = dishName || dish.trim();
    if (!query) return;
    setDish(query);
    setLoading(true);
    setError(null);
    try {
      const cellarWines = wines?.filter((w) => w.quantity > 0)?.map((w) => ({
        name: w.name,
        style: w.style,
        grape: w.grape,
        region: w.region,
      }));
      const result = await getDishWineSuggestions(query, cellarWines);
      setSuggestions(result);
      setStep("results");
    } catch (err: any) {
      setError(err.message || "Não foi possível buscar sugestões");
    } finally {
      setLoading(false);
    }
  }, [dish, wines]);

  // Search food pairings for a selected wine
  const handleSearchWinePairings = useCallback(async () => {
    const wine = wines?.find((w) => w.id === selectedWineId);
    if (!wine) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getWinePairings({
        name: wine.name,
        style: wine.style,
        grape: wine.grape,
        region: wine.region,
      });
      setPairings(result);
      setStep("wine-results");
    } catch (err: any) {
      setError(err.message || "Não foi possível buscar sugestões");
    } finally {
      setLoading(false);
    }
  }, [selectedWineId, wines]);

  const handleSearchExternal = useCallback(async (dishName?: string) => {
    const query = dishName || dish.trim();
    if (!query) return;
    setDish(query);
    setStep("photo");
  }, [dish]);

  const handleSearch = source === "cellar" ? handleSearchCellar : handleSearchExternal;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep("scanning");
    setLoading(true);
    setError(null);
    try {
      const prepared = await prepareAiAnalysisAttachment(file);
      const payload: AiAnalysisAttachmentPayload = {
        imageBase64: prepared.imageBase64,
        extractedText: prepared.extractedText,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      };
      setPreview({ url: prepared.previewUrl, fileName: prepared.fileName || file.name, isPdf: prepared.sourceType !== "image" });
      setLastWineListAttachment(payload);

      const profile = wines ? buildUserProfile(wines.filter(w => w.quantity > 0)) : undefined;
      const result = await analyzeWineList(payload, profile);
      setScanResults(result);
      setStep("scan-results");
    } catch (err: any) {
      setError(err.message || "Erro ao analisar a carta");
      setStep("photo");
    } finally {
      setLoading(false);
    }
    e.target.value = "";
  };

  const handleMenuFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep("ext-menu-scanning");
    setLoading(true);
    setError(null);
    try {
      const prepared = await prepareAiAnalysisAttachment(file);
      const payload: AiAnalysisAttachmentPayload = {
        imageBase64: prepared.imageBase64,
        extractedText: prepared.extractedText,
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      };
      setPreview({ url: prepared.previewUrl, fileName: prepared.fileName || file.name, isPdf: prepared.sourceType !== "image" });
      setLastMenuAttachment(payload);

      const result = await analyzeMenuForWine(payload, extWineName);
      setMenuResults(result);
      setStep("ext-menu-results");
    } catch (err: any) {
      setError(err.message || "Erro ao analisar o cardápio");
      setStep("ext-menu-photo");
    } finally {
      setLoading(false);
    }
    e.target.value = "";
  };

  const goBack = () => {
    setError(null);
    if (step === "sub-mode") {
      setSource(null);
      setSubMode(null);
      setStep("source");
    } else if (step === "dish") {
      setStep("sub-mode");
      setSubMode(null);
    } else if (step === "select-wine") {
      setStep("sub-mode");
      setSubMode(null);
      setSelectedWineId("");
    } else if (step === "ext-wine-input") {
      setStep("sub-mode");
      setSubMode(null);
      setExtWineName("");
    } else if (step === "photo") {
      setStep("dish");
      setPreview(null);
    } else if (step === "ext-menu-photo") {
      setStep("ext-wine-input");
      setPreview(null);
    } else if (step === "results") {
      setStep("dish");
      setSuggestions(null);
    } else if (step === "wine-results") {
      setStep("select-wine");
      setPairings(null);
    } else if (step === "scan-results") {
      setStep("photo");
      setScanResults(null);
    } else if (step === "ext-menu-results") {
      setStep("ext-menu-photo");
      setMenuResults(null);
    }
  };

  const selectedWine = wines?.find((w) => w.id === selectedWineId);
  const availableWines = wines?.filter((w) => w.quantity > 0) || [];

  const subModeTitle = source === "cellar" ? "Da minha adega" : "Adega externa";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary/70" />
            Harmonizar
          </SheetTitle>
          <p className="text-[12px] text-muted-foreground -mt-1">
            Encontre o vinho ideal para o seu prato
          </p>
        </SheetHeader>

        <div className="space-y-5 pt-5">
          {step !== "source" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground -mt-2"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Voltar
            </Button>
          )}

          <AnimatePresence mode="wait">
            {/* ── Step 1: Source Selection ── */}
            {step === "source" && (
              <motion.div
                key="source"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  De onde vem o vinho?
                </p>

                <button
                  onClick={() => handleSelectSource("cellar")}
                  className="w-full text-left rounded-xl border border-border/50 bg-background/60 hover:bg-primary/[0.04] hover:border-primary/20 p-4 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
                      <Wine className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Da minha adega</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Harmonize com vinhos que você já tem
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectSource("external")}
                  className="w-full text-left rounded-xl border border-border/50 bg-background/60 hover:bg-primary/[0.04] hover:border-primary/20 p-4 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/12 flex items-center justify-center group-hover:bg-accent/18 transition-colors">
                      <Camera className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Adega externa</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Envie a foto da carta de vinhos ou do cardápio
                      </p>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}

            {/* ── Step 1b: Sub-mode (by dish or by wine) ── */}
            {step === "sub-mode" && (
              <motion.div
                key="sub-mode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {subModeTitle} — Como quer harmonizar?
                </p>

                <button
                  onClick={() => handleSelectSubMode("by-dish")}
                  className="w-full text-left rounded-xl border border-border/50 bg-background/60 hover:bg-primary/[0.04] hover:border-primary/20 p-4 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
                      <ChefHat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Tenho um prato em mente</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {source === "cellar"
                          ? "A IA sugere vinhos da sua adega para o prato"
                          : "Digite o prato e envie a foto da carta de vinhos"}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectSubMode("by-wine")}
                  className="w-full text-left rounded-xl border border-border/50 bg-background/60 hover:bg-primary/[0.04] hover:border-primary/20 p-4 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
                      <Wine className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">Tenho um vinho em mente</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {source === "cellar"
                          ? "A IA sugere pratos ideais para o vinho escolhido"
                          : "Digite o vinho e envie a foto do cardápio"}
                      </p>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}

            {/* ── Step 2a: Dish Input ── */}
            {step === "dish" && (
              <motion.div
                key="dish"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Qual o prato que você quer harmonizar?
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      value={dish}
                      onChange={(e) => setDish(e.target.value)}
                      placeholder="Digite o prato ou ingrediente…"
                      className="pl-9 h-11 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleSearch()}
                  disabled={!dish.trim() || loading}
                  className="w-full h-10 text-[13px] font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Consultando sommelier…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {source === "cellar" ? "Buscar na minha adega" : "Continuar"}
                    </>
                  )}
                </Button>

                {!loading && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Sugestões populares
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {popularDishes.map((d) => (
                        <Button
                          key={d}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSearch(d)}
                          className="h-8 px-3 text-[11px] font-medium border border-border/50 bg-background/60 hover:bg-primary/5 hover:border-primary/20 hover:text-primary rounded-xl"
                        >
                          {d}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-[12px] text-destructive/80 text-center">{error}</p>
                )}
              </motion.div>
            )}

            {/* ── Step 2b: Select Wine from Cellar ── */}
            {step === "select-wine" && (
              <motion.div
                key="select-wine"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Qual vinho da sua adega?
                  </p>
                  <Select value={selectedWineId} onValueChange={setSelectedWineId}>
                    <SelectTrigger className="h-11 text-[13px]">
                      <SelectValue placeholder="Selecione um vinho…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWines.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} {w.vintage ? `(${w.vintage})` : ""} — {w.quantity} garrafa{w.quantity !== 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedWine && (
                  <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3 space-y-0.5">
                    <p className="text-[13px] font-semibold text-foreground">{selectedWine.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[selectedWine.style, selectedWine.grape, selectedWine.region, selectedWine.country].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSearchWinePairings}
                  disabled={!selectedWineId || loading}
                  className="w-full h-10 text-[13px] font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Consultando sommelier…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Sugerir pratos
                    </>
                  )}
                </Button>

                {error && (
                  <p className="text-[12px] text-destructive/80 text-center">{error}</p>
                )}

                {availableWines.length === 0 && (
                  <p className="text-[12px] text-muted-foreground text-center py-4">
                    Nenhum vinho com estoque na adega.
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Ext: Wine name input ── */}
            {step === "ext-wine-input" && (
              <motion.div
                key="ext-wine-input"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                    Qual vinho você quer harmonizar?
                  </p>
                  <div className="relative">
                    <Wine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      value={extWineName}
                      onChange={(e) => setExtWineName(e.target.value)}
                      placeholder="Nome do vinho (ex: Malbec Catena Zapata)…"
                      className="pl-9 h-11 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && extWineName.trim() && setStep("ext-menu-photo")}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  onClick={() => setStep("ext-menu-photo")}
                  disabled={!extWineName.trim()}
                  className="w-full h-10 text-[13px] font-medium"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Continuar — Enviar foto do cardápio
                </Button>
              </motion.div>
            )}

            {/* ── Ext: Menu photo upload ── */}
            {step === "ext-menu-photo" && (
              <motion.div
                key="ext-menu-photo"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
                  <p className="text-[12px] font-medium text-foreground">
                    Vinho: <span className="font-semibold">{extWineName}</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                    Envie a foto do cardápio do restaurante
                  </p>

                  <input
                    ref={menuFileRef}
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    capture="environment"
                    className="hidden"
                    onChange={handleMenuFileChange}
                  />

                  <button
                    onClick={() => menuFileRef.current?.click()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-primary/20 bg-card/40 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Camera className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-[12px] font-medium text-foreground">Tirar foto ou anexar PDF</p>
                    <p className="text-[10px] text-muted-foreground">Cardápio de comidas do restaurante</p>
                  </button>
                </div>

                {error && (
                  <p className="text-[12px] text-destructive/80 text-center">{error}</p>
                )}
              </motion.div>
            )}

            {/* ── Ext: Menu scanning ── */}
            {step === "ext-menu-scanning" && (
              <motion.div
                key="ext-menu-scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                {preview && (
                  preview.url ? (
                    <img src={preview.url} alt={preview.fileName} className="w-20 h-20 object-cover rounded-xl border border-border/30" />
                  ) : (
                    <div className="w-full rounded-xl border border-border/40 bg-background/60 px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{preview.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">PDF anexado para leitura inteligente</p>
                      </div>
                    </div>
                  )
                )}
                <AiProgressiveLoader
                  steps={[
                    "Processando imagem…",
                    "Lendo cardápio com IA…",
                    "Identificando pratos…",
                    "Avaliando harmonizações…",
                  ]}
                  interval={3000}
                  subtitle={`Vinho: ${extWineName}`}
                />
              </motion.div>
            )}

            {/* ── Ext: Menu results ── */}
            {step === "ext-menu-results" && menuResults && (
              <motion.div
                key="ext-menu-results"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
                  <p className="text-[12px] font-medium text-foreground">
                    Vinho: <span className="font-semibold">{extWineName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pb-1">
                  <ChefHat className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Pratos do cardápio que harmonizam
                  </span>
                </div>

                {menuResults.summary && (
                  <p className="text-[11px] text-foreground/80 leading-relaxed italic">
                    "{menuResults.summary}"
                  </p>
                )}

                {menuResults.dishes.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground text-center py-4">
                    Não foi possível identificar pratos no cardápio. Tente outra foto.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {menuResults.dishes.map((d, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="glass-card p-3.5 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", matchDot[d.match] || "bg-primary/40")} />
                            <span className="text-[13px] font-semibold text-foreground">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {d.highlight && (
                              <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/8 rounded-full px-2 py-[2px]">
                                {d.highlight === "top-pick" ? "Melhor escolha" : "Melhor custo-benefício"}
                              </span>
                            )}
                            {d.price != null && (
                              <span className="text-[12px] font-bold text-foreground">
                                R$ {d.price.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug pl-3.5">
                          {d.reason}
                        </p>
                      </motion.li>
                    ))}
                  </ul>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMenuResults(null);
                    setPreview(null);
                    setStep("ext-menu-photo");
                  }}
                  className="w-full h-9 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/40"
                >
                  Enviar outra foto
                </Button>
              </motion.div>
            )}

            {/* ── Photo Upload (external dish → wine list) ── */}
            {step === "photo" && (
              <motion.div
                key="photo"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
                  <p className="text-[12px] font-medium text-foreground">
                    Prato: <span className="font-semibold">{dish}</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                    Envie a foto da carta de vinhos
                  </p>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-primary/20 bg-card/40 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Camera className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-[12px] font-medium text-foreground">Tirar foto ou anexar PDF</p>
                    <p className="text-[10px] text-muted-foreground">Carta de vinhos, garrafa ou PDF do restaurante</p>
                  </button>
                </div>

                {error && (
                  <p className="text-[12px] text-destructive/80 text-center">{error}</p>
                )}
              </motion.div>
            )}

            {/* ── Scanning ── */}
            {step === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                {preview && (
                  preview.url ? (
                    <img src={preview.url} alt={preview.fileName} className="w-20 h-20 object-cover rounded-xl border border-border/30" />
                  ) : (
                    <div className="w-full rounded-xl border border-border/40 bg-background/60 px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{preview.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">PDF anexado para leitura inteligente</p>
                      </div>
                    </div>
                  )
                )}
                <AiProgressiveLoader
                  steps={[
                    "Processando imagem…",
                    "Identificando vinhos na carta…",
                    "Consultando sommelier…",
                    "Selecionando os melhores para o prato…",
                  ]}
                  interval={3000}
                  subtitle={`Prato: ${dish}`}
                />
              </motion.div>
            )}

            {/* ── Cellar Results (dish → wine suggestions) ── */}
            {step === "results" && suggestions && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-1.5 pb-1">
                  <Sparkles className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Vinhos da sua adega para "{dish}"
                  </span>
                </div>

                {suggestions.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground text-center py-4">
                    Nenhum vinho na sua adega combina com esse prato. Tente outro prato.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {suggestions.map((s, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={cn(
                          "glass-card p-3.5 space-y-1.5",
                          s.fromCellar && "border-primary/15 bg-primary/[0.03]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", matchDot[s.match] || "bg-primary/40")} />
                            <span className="text-[13px] font-semibold text-foreground truncate">
                              {s.wineName}
                            </span>
                          </div>
                          {s.fromCellar && (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-[2px] text-[9px] font-bold uppercase tracking-wider text-primary">
                              <Wine className="h-2.5 w-2.5" />
                              Na adega
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug pl-3.5">
                          {s.reason}
                        </p>
                      </motion.li>
                    ))}
                  </ul>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSuggestions(null);
                    setDish("");
                    setStep("dish");
                  }}
                  className="w-full h-9 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/40"
                >
                  Buscar outro prato
                </Button>
              </motion.div>
            )}

            {/* ── Wine Results (wine → food suggestions) ── */}
            {step === "wine-results" && pairings && (
              <motion.div
                key="wine-results"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {selectedWine && (
                  <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3 space-y-0.5">
                    <p className="text-[13px] font-semibold text-foreground">{selectedWine.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[selectedWine.style, selectedWine.grape, selectedWine.region].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 pb-1">
                  <ChefHat className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Pratos sugeridos
                  </span>
                </div>

                {pairings.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground text-center py-4">
                    Nenhuma sugestão encontrada. Tente outro vinho.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {pairings.map((p, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="glass-card p-3.5 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", matchDot[p.match] || "bg-primary/40")} />
                          <span className="text-[13px] font-semibold text-foreground">{p.dish}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug pl-3.5">
                          {p.reason}
                        </p>
                      </motion.li>
                    ))}
                  </ul>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPairings(null);
                    setSelectedWineId("");
                    setStep("select-wine");
                  }}
                  className="w-full h-9 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/40"
                >
                  Escolher outro vinho
                </Button>
              </motion.div>
            )}

            {/* ── External Scan Results (dish → wine list photo) ── */}
            {step === "scan-results" && scanResults && (
              <motion.div
                key="scan-results"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
                  <p className="text-[12px] font-medium text-foreground">
                    Prato: <span className="font-semibold">{dish}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pb-1">
                  <Sparkles className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Melhores opções da carta
                  </span>
                </div>

                {scanResults.wines.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground text-center py-4">
                    Não foi possível identificar vinhos na imagem. Tente outra foto.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {scanResults.wines.map((w, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="glass-card p-3.5 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-foreground">{w.name}</span>
                          {w.price && (
                            <span className="shrink-0 text-[12px] font-bold text-foreground">
                              R$ {w.price}
                            </span>
                          )}
                        </div>
                        {w.highlight && (
                          <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/8 rounded-full px-2 py-[2px]">
                            {w.highlight === "best-value" ? "Melhor custo-benefício" : w.highlight === "top-pick" ? "Melhor escolha" : "Para experimentar"}
                          </span>
                        )}
                        <p className="text-[11px] text-muted-foreground leading-snug">{w.verdict}</p>
                      </motion.li>
                    ))}
                  </ul>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setScanResults(null);
                    setPreview(null);
                    setStep("photo");
                  }}
                  className="w-full h-9 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/40"
                >
                  Enviar outra foto
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
