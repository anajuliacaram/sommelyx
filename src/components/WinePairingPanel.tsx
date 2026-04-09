import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Loader2, Sparkles } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { getWinePairings, type PairingResult } from "@/lib/sommelier-ai";
import { cn } from "@/lib/utils";
import { normalizeAppError } from "@/lib/app-error";

interface WinePairingPanelProps {
  wineName: string;
  wineStyle?: string | null;
  wineGrape?: string | null;
  wineRegion?: string | null;
  existingPairing?: string | null;
}

const matchDot: Record<string, string> = {
  perfeito: "bg-[hsl(152,42%,42%)]",
  "muito bom": "bg-[hsl(152,32%,52%)]",
  bom: "bg-[hsl(38,52%,50%)]",
};

const harmonyLabel: Record<string, string> = {
  contraste: "harmonia por contraste",
  semelhança: "harmonia por semelhança",
  complemento: "aromas complementares",
  equilíbrio: "equilíbrio de intensidade",
  limpeza: "limpeza de paladar",
};

const matchBadge: Record<string, { label: string; className: string }> = {
  perfeito: { label: "combinação perfeita", className: "bg-[hsl(152,32%,38%/0.12)] text-[hsl(152,42%,32%)]" },
  "muito bom": { label: "harmonia elegante", className: "bg-[hsl(38,36%,52%/0.12)] text-[hsl(38,50%,35%)]" },
  bom: { label: "boa combinação", className: "bg-[hsl(348,55%,28%/0.10)] text-[hsl(348,45%,35%)]" },
};

export function WinePairingPanel({
  wineName,
  wineStyle,
  wineGrape,
  wineRegion,
  existingPairing,
}: WinePairingPanelProps) {
  const [pairings, setPairings] = useState<PairingResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getWinePairings({
        name: wineName,
        style: wineStyle,
        grape: wineGrape,
        region: wineRegion,
      });
      setPairings(result);
    } catch (err) {
      setError(normalizeAppError(err).userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (existingPairing && !pairings) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Harmonização
          </span>
        </div>
        <p className="text-[13px] text-foreground/75 leading-relaxed">{existingPairing}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFetch}
          disabled={loading}
          className="h-8 px-3 text-[11px] font-semibold text-primary/70 hover:text-primary hover:bg-primary/5 rounded-xl"
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Sugestões inteligentes
        </Button>
      </div>
    );
  }

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
          <motion.ul
            key="pairings"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5"
          >
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
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full shrink-0 ring-2 ring-white/50", matchDot[p.match] || "bg-primary/40")} />
                    <span className="text-[13px] font-bold text-foreground">{p.dish}</span>
                  </div>
                  {hLabel && (
                    <span className="inline-flex items-center rounded-full bg-primary/[0.06] px-2 py-[1px] text-[9px] font-semibold uppercase tracking-wider text-primary/70 ml-[16px]">
                      {hLabel}
                    </span>
                  )}
                  <p className="text-[11px] text-foreground/55 leading-snug pl-[16px]">{p.reason}</p>
                  {badge && (
                    <div className="pl-[16px]">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-[1px] text-[9px] font-semibold tracking-wide", badge.className)}>
                        {badge.label}
                      </span>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
