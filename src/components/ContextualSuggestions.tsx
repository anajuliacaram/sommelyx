import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, ArrowRight, Star, MapPin, Bell, Grape, Wine } from "@/icons/lucide";
import { Wine as WineType } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Suggestion {
  icon: React.ElementType;
  text: string;
  route: string;
  tone: "gold" | "info" | "success" | "warning";
}

interface Props {
  wines: WineType[];
}

export function ContextualSuggestions({ wines }: Props) {
  const navigate = useNavigate();
  const { profileType } = useAuth();

  const suggestions = useMemo(() => {
    const s: Suggestion[] = [];

    const noRating = wines.filter(w => !w.rating && w.quantity > 0).length;
    if (noRating > 2) {
      s.push({ icon: Star, text: `Avalie ${noRating} vinhos sem nota`, route: "/dashboard/cellar", tone: "gold" });
    }

    const noLocation = wines.filter(w => !w.cellar_location && w.quantity > 0).length;
    if (noLocation > 2) {
      s.push({ icon: MapPin, text: `Defina localização de ${noLocation} garrafas`, route: "/dashboard/cellar", tone: "info" });
    }

    const noGrape = wines.filter(w => !w.grape && w.quantity > 0).length;
    if (noGrape > 2) {
      s.push({ icon: Grape, text: `Adicione a uva de ${noGrape} vinhos`, route: "/dashboard/cellar", tone: "success" });
    }

    const noWindow = wines.filter(w => !w.drink_from && !w.drink_until && w.quantity > 0).length;
    if (noWindow > 2 && profileType === "personal") {
      s.push({ icon: Bell, text: "Configure alertas de janela de consumo", route: "/dashboard/cellar", tone: "warning" });
    }

    return s.slice(0, 3);
  }, [wines, profileType]);

  if (suggestions.length === 0) return null;

  return (
    <motion.div
      className="glass-card p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sugestões para você</h3>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => (
          <Button
            type="button"
            key={i}
            onClick={() => navigate(s.route)}
            variant="ghost"
            className="h-auto w-full justify-start gap-2.5 p-2 rounded-xl group hover:bg-muted/40"
          >
            <s.icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                s.tone === "gold" && "text-[hsl(var(--gold))]",
                s.tone === "info" && "text-info",
                s.tone === "success" && "text-success",
                s.tone === "warning" && "text-warning",
              )}
            />
            <span className="text-[13px] font-medium text-foreground flex-1 text-left">{s.text}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
