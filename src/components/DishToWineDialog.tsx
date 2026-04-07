import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Search, Loader2, Wine, Sparkles, Camera, Upload, ArrowLeft } from "@/icons/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getDishWineSuggestions, analyzeWineList, buildUserProfile, type WineSuggestion, type WineListAnalysis } from "@/lib/sommelier-ai";
import { cn } from "@/lib/utils";
import { useWines } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";

interface DishToWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Source = null | "cellar" | "external";
type Step = "source" | "dish" | "results" | "photo" | "scanning" | "scan-results";

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

  const [source, setSource] = useState<Source>(null);
  const [step, setStep] = useState<Step>("source");
  const [dish, setDish] = useState("");
  const [suggestions, setSuggestions] = useState<WineSuggestion[] | null>(null);
  const [scanResults, setScanResults] = useState<WineListAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const reset = () => {
    setSource(null);
    setStep("source");
    setDish("");
    setSuggestions(null);
    setScanResults(null);
    setLoading(false);
    setError(null);
    setPreview(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSelectSource = (s: Source) => {
    setSource(s);
    setStep("dish");
  };

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

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setPreview(reader.result as string);
      setStep("scanning");
      setLoading(true);
      setError(null);
      try {
        const profile = wines ? buildUserProfile(wines.filter(w => w.quantity > 0)) : undefined;
        const result = await analyzeWineList(base64, profile);
        setScanResults(result);
        setStep("scan-results");
      } catch (err: any) {
        setError(err.message || "Erro ao analisar a carta");
        setStep("photo");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const goBack = () => {
    if (step === "dish") {
      setSource(null);
      setStep("source");
    } else if (step === "photo") {
      setStep("dish");
      setPreview(null);
    } else if (step === "results" || step === "scan-results") {
      if (source === "external") {
        setStep("photo");
        setScanResults(null);
      } else {
        setStep("dish");
        setSuggestions(null);
      }
    }
  };

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
                        Sugerir vinhos que você já tem em estoque
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
                        Envie a foto da carta de vinhos do restaurante
                      </p>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}

            {/* ── Step 2: Dish Input ── */}
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

            {/* ── Step 3a: Photo Upload (external) ── */}
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
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="space-y-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-32 rounded-xl border-2 border-dashed border-primary/20 bg-card/40 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Camera className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-[12px] font-medium text-foreground">Tirar foto ou escolher da galeria</p>
                      <p className="text-[10px] text-muted-foreground">Carta de vinhos, garrafa ou menu</p>
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] text-destructive/80 text-center">{error}</p>
                )}
              </motion.div>
            )}

            {/* ── Step: Scanning ── */}
            {step === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-10"
              >
                {preview && (
                  <img src={preview} alt="Carta" className="w-24 h-24 object-cover rounded-xl border border-border/30 mb-2" />
                )}
                <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Analisando a carta…</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Identificando os melhores vinhos para "{dish}"
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Step 3b: Cellar Results ── */}
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

            {/* ── Step 3c: External Scan Results ── */}
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
