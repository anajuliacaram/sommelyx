import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Sparkles, BookOpen } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { getWinePairings, type PairingResult, type WineProfile, type Recipe } from "@/lib/sommelier-ai";
import { notifySuccess } from "@/lib/feedback";
import { Dialog } from "@/components/ui/dialog";
import { ModalBase } from "@/components/ui/ModalBase";
import {
  MatchDot,
  MatchLevelBadge,
  HarmonyTag,
  WineProfileChips,
  DishProfilePills,
  RecipeButton,
  PremiumResultCard,
  SectionHeader,
  PairingLoadingState,
  PairingErrorState,
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
      <ModalBase
        title={dishName}
        icon={<BookOpen className="h-5 w-5" />}
        onClose={() => onOpenChange(false)}
        className="sm:max-w-md"
      >
          <div className="space-y-4">
            {recipe.description && (
              <p className="text-sm text-black/70 leading-relaxed italic">{recipe.description}</p>
            )}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-black/50">Ingredientes</h4>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-black/70 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B1E2B]/35" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-black/50">Modo de preparo</h4>
              <ol className="space-y-2">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-black/70 leading-relaxed">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-[10px] font-bold text-[#5F5F5F]">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-4">
              <div className="mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-[#7B1E2B]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/50">Por que harmoniza com {wineName}</span>
              </div>
              <p className="text-sm text-black/70 leading-relaxed">{recipe.wine_reason}</p>
            </div>
          </div>
      </ModalBase>
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
      notifySuccess("Harmonização pronta", {
        description: `${Math.min(result.pairings.length, 5)} sugestões pensadas para acidez, corpo e taninos.`,
        duration: 2800,
      });
    } catch (err: any) {
      setError(err.message || "Não conseguimos concluir a análise agora.");
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
      <SectionHeader icon="chef" label="Harmoniza com" count={pairings ? Math.min(pairings.length, 5) : undefined} />

      <AnimatePresence mode="wait">
        {loading ? (
          <PairingLoadingState
            key="loading"
            steps={[
              "Lendo o perfil do vinho…",
              "Avaliando acidez, corpo e taninos…",
              "Montando 5 opções claras…",
            ]}
            subtitle="Harmonização"
          />
        ) : error ? (
          <PairingErrorState
            key="error"
            message={error}
            onRetry={handleFetch}
          />
        ) : pairings ? (
          <motion.div
            key="pairings"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.06] px-2.5 py-1 text-[10px] font-semibold text-primary/75">
              <Sparkles className="h-3 w-3" />
              Leitura concluída
            </div>
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
              {pairings.slice(0, 5).map((p, i) => (
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
                  <div className="pl-[22px]">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-primary/55 mb-1">Por que funciona</p>
                    <p className="text-[12.5px] text-[#555] leading-relaxed">{p.reason}</p>
                  </div>

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
