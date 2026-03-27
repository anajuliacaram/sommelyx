import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, ArrowRight, Star, MapPin, Bell, Grape, Wine } from "lucide-react";
import { Wine as WineType } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Suggestion {
  icon: React.ElementType;
  text: string;
  route: string;
  color: string;
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
      s.push({ icon: Star, text: `Avalie ${noRating} vinhos sem nota`, route: "/dashboard/cellar", color: "#C9A86A" });
    }

    const noLocation = wines.filter(w => !w.cellar_location && w.quantity > 0).length;
    if (noLocation > 2) {
      s.push({ icon: MapPin, text: `Defina localização de ${noLocation} garrafas`, route: "/dashboard/cellar", color: "#3b82f6" });
    }

    const noGrape = wines.filter(w => !w.grape && w.quantity > 0).length;
    if (noGrape > 2) {
      s.push({ icon: Grape, text: `Adicione a uva de ${noGrape} vinhos`, route: "/dashboard/cellar", color: "#22c55e" });
    }

    const noWindow = wines.filter(w => !w.drink_from && !w.drink_until && w.quantity > 0).length;
    if (noWindow > 2 && profileType === "personal") {
      s.push({ icon: Bell, text: "Configure alertas de janela de consumo", route: "/dashboard/cellar", color: "#E07A5F" });
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
        <Lightbulb className="h-3.5 w-3.5 text-[#C9A86A]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sugestões para você</h3>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => navigate(s.route)}
            className="flex items-center gap-2.5 w-full text-left p-2 rounded-lg hover:bg-black/[0.02] transition-colors group"
          >
            <s.icon className="h-3.5 w-3.5 shrink-0" style={{ color: s.color }} />
            <span className="text-[13px] font-medium text-foreground flex-1">{s.text}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
