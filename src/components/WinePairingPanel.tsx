import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Loader2, Sparkles } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { getWinePairings, type PairingResult } from "@/lib/sommelier-ai";
import { cn } from "@/lib/utils";

interface WinePairingPanelProps {
  wineName: string;
  wineStyle?: string | null;
  wineGrape?: string | null;
  wineRegion?: string | null;
  existingPairing?: string | null;
}

const matchDot: Record<string, string> = {
  perfeito: "bg-success",
  "muito bom": "bg-success/70",
  bom: "bg-warning",
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
    } catch (err: any) {
      setError(err.message || "Não foi possível gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  if (existingPairing && !pairings) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3 w-3 text-primary/70" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Harmonização
          </span>
        </div>
        <p className="text-[12px] text-foreground/80 leading-relaxed">{existingPairing}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFetch}
          disabled={loading}
          className="h-7 px-2.5 text-[10px] font-semibold text-primary/70 hover:text-primary hover:bg-primary/5"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Sugestões inteligentes
        </Button>
      </div>
    );
  }

  if (!pairings && !loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3 w-3 text-primary/70" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Harmonização
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFetch}
          disabled={loading}
          className="h-8 px-3 text-[11px] font-semibold border border-border/50 bg-background/60 hover:bg-primary/5 hover:border-primary/20 hover:text-primary text-muted-foreground"
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Sugerir pratos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <UtensilsCrossed className="h-3 w-3 text-primary/70" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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
            className="flex items-center gap-2 py-3"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
            <span className="text-[11px] text-muted-foreground">Analisando harmonizações…</span>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-2"
          >
            <p className="text-[11px] text-destructive/80">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFetch}
              className="h-7 mt-1 px-2 text-[10px] text-primary/70"
            >
              Tentar novamente
            </Button>
          </motion.div>
        ) : pairings ? (
          <motion.ul
            key="pairings"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1.5"
          >
            {pairings.map((p, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2 py-1"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", matchDot[p.match] || "bg-primary/40")} />
                <div className="min-w-0">
                  <span className="text-[12px] font-semibold text-foreground">{p.dish}</span>
                  <p className="text-[10px] text-muted-foreground leading-snug">{p.reason}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
