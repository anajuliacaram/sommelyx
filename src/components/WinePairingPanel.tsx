import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Loader2, Sparkles, ChevronDown, X, BookOpen } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { getWinePairings, type PairingResult, type WineProfile, type Recipe } from "@/lib/sommelier-ai";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WinePairingPanelProps {
  wineName: string;
  wineStyle?: string | null;
  wineGrape?: string | null;
  wineRegion?: string | null;
  wineProducer?: string | null;
  wineVintage?: number | null;
  existingPairing?: string | null;
}

const matchDot: Record<string, string> = {
  perfeito: "bg-[hsl(152,42%,42%)]",
  "muito bom": "bg-[hsl(152,32%,52%)]",
  bom: "bg-[hsl(38,52%,50%)]",
};

const matchBadge: Record<string, { label: string; className: string }> = {
  perfeito: { label: "Combinação perfeita", className: "bg-[hsl(152,32%,38%/0.12)] text-[hsl(152,42%,32%)]" },
  "muito bom": { label: "Alta compatibilidade", className: "bg-[hsl(152,32%,38%/0.10)] text-[hsl(152,32%,40%)]" },
  bom: { label: "Boa opção", className: "bg-[hsl(38,36%,52%/0.12)] text-[hsl(38,50%,35%)]" },
};

const harmonyLabel: Record<string, string> = {
  contraste: "harmonia por contraste",
  semelhança: "harmonia por semelhança",
  complemento: "aromas complementares",
  equilíbrio: "equilíbrio de intensidade",
  limpeza: "limpeza de paladar",
};

function RecipeModal({ recipe, dishName, wineName, open, onOpenChange }: { recipe: Recipe; dishName: string; wineName: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/20">
          <DialogTitle className="text-base font-serif font-bold">{dishName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          <div className="px-5 py-4 space-y-4">
            {recipe.description && (
              <p className="text-[13px] text-foreground/70 leading-relaxed italic">{recipe.description}</p>
            )}

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Ingredientes</h4>
              <ul className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-[13px] text-foreground/80 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-1.5 shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Modo de preparo</h4>
              <ol className="space-y-2">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="text-[13px] text-foreground/80 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/8 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Por que harmoniza com {wineName}</span>
              </div>
              <p className="text-[12px] text-foreground/70 leading-relaxed">{recipe.wine_reason}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function WinePairingPanel({
  wineName,
  wineStyle,
  wineGrape,
  wineRegion,
  wineProducer,
  wineVintage,
  existingPairing,
}: WinePairingPanelProps) {
  const [pairings, setPairings] = useState<PairingResult[] | null>(null);
  const [wineProfile, setWineProfile] = useState<WineProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeModal, setRecipeModal] = useState<{ recipe: Recipe; dish: string } | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getWinePairings({
        name: wineName,
        style: wineStyle,
        grape: wineGrape,
        region: wineRegion,
        producer: wineProducer,
        vintage: wineVintage,
      });
      setPairings(result.pairings);
      setWineProfile(result.wineProfile || null);
    } catch (err: any) {
      setError(err.message || "Não foi possível gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  if (!pairings && !loading) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Harmonização
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFetch}
          disabled={loading}
          className="h-9 px-3.5 text-[12px] font-semibold border border-border/40 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/20 hover:text-primary text-muted-foreground rounded-xl transition-all duration-200"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Sugerir pratos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <UtensilsCrossed className="h-3.5 w-3.5 text-primary/70" />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Harmoniza com
        </span>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 py-4"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
            <span className="text-[12px] text-foreground/60">Analisando harmonizações…</span>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-3"
          >
            <p className="text-[12px] text-destructive/80 font-medium">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFetch}
              className="h-8 mt-1.5 px-3 text-[11px] text-primary/70 rounded-xl"
            >
              Tentar novamente
            </Button>
          </motion.div>
        ) : pairings ? (
          <motion.div
            key="pairings"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Wine Structure Section */}
            {wineProfile?.summary && (
              <div className="rounded-xl border border-primary/10 bg-primary/[0.03] p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70">Estrutura do vinho</span>
                </div>
                <p className="text-[12px] text-foreground/70 leading-relaxed">{wineProfile.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {wineProfile.body && (
                    <span className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      Corpo {wineProfile.body}
                    </span>
                  )}
                  {wineProfile.acidity && (
                    <span className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      Acidez {wineProfile.acidity}
                    </span>
                  )}
                  {wineProfile.tannin && wineProfile.tannin !== "n/a" && (
                    <span className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      Taninos {wineProfile.tannin}
                    </span>
                  )}
                  {wineProfile.complexity && (
                    <span className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      {wineProfile.complexity}
                    </span>
                  )}
                  {wineProfile.style && (
                    <span className="inline-flex items-center rounded-full bg-primary/[0.06] px-2 py-0.5 text-[9px] font-semibold text-primary/60">
                      {wineProfile.style}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Pairing Cards */}
            <ul className="space-y-2.5">
              {pairings.map((p, i) => {
                const badge = matchBadge[p.match];
                const hLabel = p.harmony_label || (p.harmony_type && harmonyLabel[p.harmony_type]);
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.25 }}
                    className="rounded-2xl border border-border/30 bg-card/60 p-3.5 space-y-1.5 transition-all duration-200 hover:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]"
                  >
                    {/* Header: dish name + match badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0 ring-2 ring-white/50", matchDot[p.match] || "bg-primary/40")} />
                        <span className="text-[13px] font-bold text-foreground">{p.dish}</span>
                      </div>
                      {badge && (
                        <span className={cn("shrink-0 inline-flex items-center rounded-full px-2 py-[1px] text-[9px] font-semibold tracking-wide", badge.className)}>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    {/* Harmony label */}
                    {hLabel && (
                      <span className="inline-flex items-center rounded-full bg-primary/[0.06] px-2 py-[1px] text-[9px] font-semibold uppercase tracking-wider text-primary/70 ml-[16px]">
                        {hLabel}
                      </span>
                    )}

                    {/* Dish profile pills */}
                    {p.dish_profile && (
                      <div className="flex flex-wrap gap-1 pl-[16px]">
                        {p.dish_profile.intensity && (
                          <span className="inline-flex items-center rounded-full bg-muted/30 px-1.5 py-[1px] text-[8px] font-semibold text-muted-foreground">
                            {p.dish_profile.intensity}
                          </span>
                        )}
                        {p.dish_profile.texture && (
                          <span className="inline-flex items-center rounded-full bg-muted/30 px-1.5 py-[1px] text-[8px] font-semibold text-muted-foreground">
                            {p.dish_profile.texture}
                          </span>
                        )}
                        {p.dish_profile.highlight && (
                          <span className="inline-flex items-center rounded-full bg-muted/30 px-1.5 py-[1px] text-[8px] font-semibold text-muted-foreground">
                            {p.dish_profile.highlight}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Explanation */}
                    <p className="text-[11px] text-foreground/55 leading-snug pl-[16px]">{p.reason}</p>

                    {/* Recipe button */}
                    {p.recipe && (
                      <div className="pl-[16px]">
                        <button
                          type="button"
                          onClick={() => setRecipeModal({ recipe: p.recipe!, dish: p.dish })}
                          className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary/70 hover:text-primary transition-colors"
                        >
                          <BookOpen className="h-3 w-3" />
                          Ver receita
                        </button>
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {recipeModal && (
        <RecipeModal
          recipe={recipeModal.recipe}
          dishName={recipeModal.dish}
          wineName={wineName}
          open={!!recipeModal}
          onOpenChange={(v) => !v && setRecipeModal(null)}
        />
      )}
    </div>
  );
}
