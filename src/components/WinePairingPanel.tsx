import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Loader2, Sparkles, BookOpen } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { getWinePairings, type PairingResult, type WineProfile, type Recipe } from "@/lib/sommelier-ai";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MatchDot,
  MatchLevelBadge,
  HarmonyTag,
  WineProfileChips,
  DishProfilePills,
  RecipeButton,
  PremiumResultCard,
  SectionHeader,
} from "@/components/pairing/shared";

interface WinePairingPanelProps {
  wineName: string;
  wineStyle?: string | null;
  wineGrape?: string | null;
  wineRegion?: string | null;
  wineProducer?: string | null;
  wineVintage?: number | null;
  existingPairing?: string | null;
}

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
  const [pairingLogic, setPairingLogic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeModal, setRecipeModal] = useState<{ recipe: Recipe; dish: string } | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setPairingLogic(null);
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
      setPairingLogic(result.pairingLogic || null);
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
    <div className="space-y-3">
      <SectionHeader icon="chef" label="Harmoniza com" />

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
            <span className="text-[12px] text-[#888]">Analisando harmonizações…</span>
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
              <div
                className="rounded-xl p-3.5 space-y-2"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.48) 100%)",
                  border: "1px solid rgba(255,255,255,0.50)",
                  boxShadow: "0 2px 12px -6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70">Estrutura do vinho</span>
                </div>
                <p className="text-[12px] text-[#555] leading-relaxed">{wineProfile.summary}</p>
                <WineProfileChips profile={wineProfile} />
              </div>
            )}

            {pairingLogic && (
              <div
                className="rounded-xl p-3.5 space-y-1.5"
                style={{
                  background: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(255,255,255,0.40)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">Lógica da harmonização</span>
                </div>
                <p className="text-[12px] text-[#666] leading-relaxed">{pairingLogic}</p>
              </div>
            )}

            {/* Pairing Cards */}
            <ul className="space-y-2.5">
              {pairings.map((p, i) => (
                <PremiumResultCard key={i} index={i}>
                  {/* Header: dish name + match badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <MatchDot match={p.match} />
                      <span className="text-[14px] font-bold text-[#1A1A1A] tracking-tight">{p.dish}</span>
                    </div>
                    <MatchLevelBadge match={p.match} size="sm" />
                  </div>

                  {/* Harmony label */}
                  <div className="pl-[22px] flex items-center gap-2 flex-wrap">
                    <HarmonyTag type={p.harmony_type} label={p.harmony_label} />
                  </div>

                  {/* Dish profile pills */}
                  <div className="pl-[22px]">
                    <DishProfilePills profile={p.dish_profile} />
                  </div>

                  {/* Explanation */}
                  <p className="text-[12.5px] text-[#555] leading-relaxed pl-[22px]">{p.reason}</p>

                  {/* Recipe button */}
                  {p.recipe && (
                    <div className="pl-[22px]">
                      <RecipeButton onClick={() => setRecipeModal({ recipe: p.recipe!, dish: p.dish })} />
                    </div>
                  )}
                </PremiumResultCard>
              ))}
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
