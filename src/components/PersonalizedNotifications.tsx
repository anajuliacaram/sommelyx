import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GlassWater, AlertTriangle, Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import { Wine } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";

interface Tip {
  id: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  desc: string;
  action?: string;
  route?: string;
}

const currentYear = new Date().getFullYear();

function generateTips(wines: Wine[]): Tip[] {
  const tips: Tip[] = [];

  // Wines in drink window — personalized
  const drinkNow = wines
    .filter(w => w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until && w.quantity > 0)
    .sort((a, b) => (a.drink_until ?? 9999) - (b.drink_until ?? 9999));

  if (drinkNow.length > 0) {
    const w = drinkNow[0];
    const grapeText = w.grape ? ` ${w.grape}` : "";
    const vintageText = w.vintage ? ` de ${w.vintage}` : "";
    tips.push({
      id: `drink-${w.id}`,
      icon: GlassWater,
      color: "#22c55e",
      bg: "rgba(34,197,94,0.08)",
      title: `Seu${grapeText}${vintageText} está no ponto!`,
      desc: `"${w.name}" está na janela ideal (${w.drink_from}–${w.drink_until}). Que tal abrir hoje?`,
      action: "Ver na adega",
      route: "/dashboard/cellar",
    });
  }

  // Past peak urgent
  const pastPeak = wines
    .filter(w => w.drink_until && currentYear > w.drink_until && w.quantity > 0)
    .sort((a, b) => (a.drink_until ?? 0) - (b.drink_until ?? 0));

  if (pastPeak.length > 0) {
    const w = pastPeak[0];
    tips.push({
      id: `past-${w.id}`,
      icon: AlertTriangle,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      title: "Atenção: garrafa passando do pico",
      desc: `"${w.name}" tinha janela até ${w.drink_until}. Considere abrir em breve.`,
      action: "Ver alertas",
      route: "/dashboard/alerts",
    });
  }

  // Pro tips based on collection
  const noRating = wines.filter(w => !w.rating && w.quantity > 0).length;
  if (noRating > 3) {
    tips.push({
      id: "tip-rating",
      icon: Sparkles,
      color: "#C9A86A",
      bg: "rgba(201,168,106,0.08)",
      title: "Dica: avalie seus vinhos",
      desc: `Você tem ${noRating} vinhos sem avaliação. Avaliá-los ajuda a identificar seus favoritos.`,
      action: "Ir para a adega",
      route: "/dashboard/cellar",
    });
  }

  const noLocation = wines.filter(w => w.quantity > 0 && !w.cellar_location).length;
  if (noLocation > 2) {
    tips.push({
      id: "tip-location",
      icon: Lightbulb,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
      title: "Organize por localização",
      desc: `${noLocation} vinhos sem local definido na adega. Organizar facilita encontrar a garrafa certa.`,
      action: "Organizar",
      route: "/dashboard/cellar",
    });
  }

  return tips.slice(0, 3);
}

interface Props {
  wines: Wine[];
}

export function PersonalizedNotifications({ wines }: Props) {
  const tips = useMemo(() => generateTips(wines), [wines]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const visibleTips = tips.filter(t => !dismissed.has(t.id));

  if (visibleTips.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visibleTips.map((tip, i) => (
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, x: -20, height: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="glass-card p-4 flex items-start gap-3 group relative overflow-hidden"
            style={{ borderLeft: `3px solid ${tip.color}` }}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: tip.bg }}
            >
              <tip.icon className="h-4.5 w-4.5" style={{ color: tip.color }} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground leading-tight mb-0.5">
                {tip.title}
              </p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {tip.desc}
              </p>
              {tip.action && tip.route && (
                <button
                  onClick={() => navigate(tip.route!)}
                  className="mt-2 text-[12px] font-bold flex items-center gap-1 transition-colors hover:opacity-80"
                  style={{ color: tip.color }}
                >
                  {tip.action} <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(tip.id))}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
