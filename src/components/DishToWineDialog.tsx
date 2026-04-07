import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Search, Loader2, Wine, Sparkles, ArrowRight } from "@/icons/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getDishWineSuggestions, type WineSuggestion } from "@/lib/sommelier-ai";
import { cn } from "@/lib/utils";
import { useWines } from "@/hooks/useWines";

interface DishToWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const matchDot: Record<string, string> = {
  perfeito: "bg-green-500",
  "muito bom": "bg-emerald-400",
  bom: "bg-amber-400",
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
  const [dish, setDish] = useState("");
  const [suggestions, setSuggestions] = useState<WineSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (dishName?: string) => {
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
    } catch (err: any) {
      setError(err.message || "Não foi possível buscar sugestões");
    } finally {
      setLoading(false);
    }
  }, [dish, wines]);

  const handleClose = (v: boolean) => {
    if (!v) {
      setDish("");
      setSuggestions(null);
      setError(null);
    }
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary/70" />
            Qual é o prato?
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              value={dish}
              onChange={(e) => setDish(e.target.value)}
              placeholder="Digite o prato ou ingrediente…"
              className="pl-9 h-11 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          {!suggestions && !loading && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-10"
              >
                <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Consultando o sommelier…</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Analisando sua adega e sugerindo harmonizações
                  </p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-6"
              >
                <p className="text-[12px] text-destructive/80">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSearch()}
                  className="mt-2 text-[11px] text-primary"
                >
                  Tentar novamente
                </Button>
              </motion.div>
            )}

            {suggestions && !loading && (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-1.5 pb-1">
                  <Sparkles className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Vinhos sugeridos para "{dish}"
                  </span>
                </div>

                {suggestions.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground text-center py-4">
                    Nenhuma sugestão encontrada. Tente outro prato.
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
                  }}
                  className="w-full h-9 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/40"
                >
                  Buscar outro prato
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
