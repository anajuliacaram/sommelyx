import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Sparkles, BookOpen } from "@/icons/lucide";
import { generateWinePairing, type GeneratedWinePairing } from "@/lib/sommelier-ai";
import { notifySuccess } from "@/lib/feedback";
import {
  SectionHeader,
  PairingLoadingState,
  PairingErrorState,
  WineSuggestionCard,
} from "@/components/pairing/shared";
import { AI_MODAL_CARD_CLASSNAME, AiModalActionButton, AiSectionLabel } from "@/components/ai-flow/ModalLayout";
import { cn } from "@/lib/utils";

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
        description: result.fallback
          ? "Uma seleção elegante já está pronta para revisar."
          : `${Math.min(result.pairings.length, 5)} sugestões à mesa.`,
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
          <AiSectionLabel>Harmonização</AiSectionLabel>
        </div>
        <AiModalActionButton
          variant="secondary"
          size="sm"
          onClick={handleFetch}
          disabled={loading}
          className="w-full justify-center sm:w-auto"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Sugerir pratos
        </AiModalActionButton>
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
                <span className="rounded-full border border-[rgba(198,167,104,0.18)] bg-[rgba(198,167,104,0.10)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7B6528]">
                  Curadoria assistida
                </span>
                <span className="text-[11px] font-medium text-[#6B6258]">Uma leitura versátil para seguir à mesa.</span>
              </div>
            )}
            <div className={cn("space-y-3 p-3", AI_MODAL_CARD_CLASSNAME)}>
              <div className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary/65" />
                <AiSectionLabel>Perfil do prato ideal</AiSectionLabel>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ["Acidez", pairingResult.analysis.acidity],
                  ["Gordura", pairingResult.analysis.fat],
                  ["Textura", pairingResult.analysis.texture],
                  ["Perfil", pairingResult.analysis.flavor_profile],
                  ["Preparo", pairingResult.analysis.cooking_method],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[12px] border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.58)] p-3">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#6B6258]">{label}</p>
                    <p className="mt-1 text-[12.5px] leading-5 text-[#433A32]">{value}</p>
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
