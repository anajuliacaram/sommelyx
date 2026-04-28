import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GlassWater, AlertTriangle, Lightbulb, ArrowRight, Sparkles } from "@/icons/lucide";
import { Wine } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TipTone = "success" | "warning" | "gold" | "info";

interface Tip {
  id: string;
  icon: React.ElementType;
  tone: TipTone;
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
      tone: "success",
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
      tone: "warning",
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
      tone: "gold",
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
      tone: "info",
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
          // Tone mapping keeps UI consistent with the global palette (no hex hardcoding).
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, x: -20, height: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={cn(
              "surface-clarity p-4 flex items-start gap-3 group relative overflow-hidden border-l-[3px]",
              tip.tone === "success" && "border-success/40",
              tip.tone === "warning" && "border-warning/40",
              tip.tone === "gold" && "border-gold/45",
              tip.tone === "info" && "border-info/40",
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                tip.tone === "success" && "bg-success/10 text-success",
                tip.tone === "warning" && "bg-warning/10 text-warning",
                tip.tone === "gold" && "bg-gold/10 text-gold",
                tip.tone === "info" && "bg-info/10 text-info",
              )}
            >
              <tip.icon className="h-4.5 w-4.5" />
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
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(tip.route!)}
                  className={cn(
                    "mt-2 h-auto p-0 bg-transparent hover:bg-transparent text-[12px] font-bold flex items-center gap-1",
                    tip.tone === "success" && "text-success",
                    tip.tone === "warning" && "text-warning",
                    tip.tone === "gold" && "text-gold",
                    tip.tone === "info" && "text-info",
                  )}
                >
                  {tip.action} <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Dismiss */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(prev => new Set(prev).add(tip.id))}
              className="h-8 w-8 md:h-6 md:w-6 rounded-full shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="Dispensar"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
