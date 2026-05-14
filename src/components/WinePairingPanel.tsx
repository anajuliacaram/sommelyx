import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Sparkles, BookOpen } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { generateWinePairing, type GeneratedWinePairing } from "@/lib/sommelier-ai";
import { notifySuccess } from "@/lib/feedback";
import { Dialog } from "@/components/ui/dialog";
import { ModalBase } from "@/components/ui/ModalBase";
import {
  SectionHeader,
  PairingLoadingState,
  PairingErrorState,
  FallbackAnalysisBadge,
  FallbackAnalysisNotice,
  WineSuggestionCard,
} from "@/components/pairing/shared";

interface WinePairingPanelProps {
  wineName: string;
  wineStyle?: string | null;
  wineGrape?: string | null;
  wineRegion?: string | null;
  wineProducer?: string | null;
  wineVintage?: number | null;
}

export function WinePairingPanel({
  wineName,
  wineStyle,
  wineGrape,
  wineRegion,
  wineProducer,
  wineVintage,
}: WinePairingPanelProps) {
  const [pairingResult, setPairingResult] = useState<GeneratedWinePairing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const handleFetch = async () => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    setLoading(true);
    setError(null);
    setPairingResult(null);
    try {
      const requestId = crypto.randomUUID();
      console.info("[WINE_PAIRING_PANEL_START]", {
        requestId,
        wineName,
        wineStyle,
        wineGrape,
        wineRegion,
        wineProducer,
        wineVintage,
      });
      const result = await generateWinePairing({
        wineName,
        wineStyle,
        wineGrape,
        wineRegion,
        wineProducer,
        wineVintage,
        requestId,
      });
      if (requestSeq !== requestSeqRef.current) return;
      setPairingResult(result);
      notifySuccess("Harmonização pronta", {
        description: `${Math.min(result.pairings.length, 5)} sugestões pensadas para acidez, corpo e taninos.`,
        duration: 2800,
      });
      console.info("[WINE_PAIRING_PANEL_SUCCESS]", {
        requestId,
        pairings: result.pairings.length,
        fallback: Boolean(result.fallback),
      });
    } catch (err: any) {
      if (requestSeq !== requestSeqRef.current) return;
      console.error("[WINE_PAIRING_PANEL_FAILED]", {
        error: err?.message,
        code: err?.code,
        status: err?.status,
        requestId: err?.requestId,
      });
      setError(err.message || "Não conseguimos concluir a análise agora.");
    } finally {
      if (requestSeq === requestSeqRef.current) setLoading(false);
    }
  };

  if (!pairingResult && !loading && !error) {
    return (
      <div className="space-y-3">
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
      <SectionHeader icon="chef" label="Harmoniza com" count={pairingResult ? Math.min(pairingResult.pairings.length, 5) : undefined} />

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
        ) : pairingResult ? (
          <motion.div
            key="pairings"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {pairingResult.fallback && (
              <div className="flex items-center gap-2">
                <FallbackAnalysisBadge />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/60">Sugestões simplificadas</span>
              </div>
            )}
            {pairingResult.fallback && (
              <FallbackAnalysisNotice />
            )}
            <div className="surface-clarity rounded-2xl border border-[rgba(0,0,0,0.05)] p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary/65" />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/65">Análise</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ["Acidez", pairingResult.analysis.acidity],
                  ["Gordura", pairingResult.analysis.fat],
                  ["Textura", pairingResult.analysis.texture],
                  ["Perfil", pairingResult.analysis.flavor_profile],
                  ["Preparo", pairingResult.analysis.cooking_method],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[rgba(0,0,0,0.05)] bg-white/55 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/75">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <ul className="space-y-4">
              {pairingResult.pairings.slice(0, 5).map((p, i) => (
                <WineSuggestionCard
                  key={i}
                  index={i}
                  wineName={p.wine}
                  style={p.style}
                  reason={p.why_it_works}
                  structureMatch={p.structure_match}
                  decisionSupport={p.decision_support || null}
                />
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
