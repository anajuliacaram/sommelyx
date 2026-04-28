import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight } from "@/icons/lucide";
import { Wine } from "@/hooks/useWines";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  wines: Wine[];
  profileType: "personal" | "commercial";
}

export function DashboardProfileProgress({ wines, profileType }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const steps = useMemo(() => {
    const hasName = !!user?.user_metadata?.full_name;
    const hasWines = wines.length > 0;
    const hasRating = wines.some(w => w.rating);
    const hasLocation = wines.some(w => w.cellar_location);
    const hasDrinkWindow = wines.some(w => w.drink_from || w.drink_until);

    if (profileType === "personal") {
      return [
        { label: "Perfil configurado", done: hasName, route: "/dashboard/settings" },
        { label: "Primeiro vinho cadastrado", done: hasWines, route: "/dashboard/cellar" },
        { label: "Avaliação registrada", done: hasRating, route: "/dashboard/cellar" },
        { label: "Localização definida", done: hasLocation, route: "/dashboard/cellar" },
        { label: "Janela de consumo definida", done: hasDrinkWindow, route: "/dashboard/cellar" },
      ];
    }
    return [
      { label: "Perfil configurado", done: hasName, route: "/dashboard/settings" },
      { label: "Primeiro produto cadastrado", done: hasWines, route: "/dashboard/inventory" },
      { label: "Preço de compra definido", done: wines.some(w => w.purchase_price), route: "/dashboard/inventory" },
      { label: "Valor atual definido", done: wines.some(w => w.current_value), route: "/dashboard/inventory" },
      { label: "Localização definida", done: hasLocation, route: "/dashboard/inventory" },
    ];
  }, [wines, user, profileType]);

  const completedCount = steps.filter(s => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  // Don't show if all done
  if (pct === 100) return null;

  const nextStep = steps.find(s => !s.done);

  return (
    <motion.div
      className="surface-clarity p-4 relative overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#8F2D56]/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold font-sans text-foreground">Configure seu espaço</h3>
          <p className="text-xs text-muted-foreground font-medium">{completedCount} de {steps.length} passos completos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-foreground">{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-black/[0.04] overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #8F2D56, #C44569)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 text-[13px] cursor-pointer rounded-lg px-2 py-1.5 transition-colors ${s.done ? "opacity-50" : "hover:bg-black/[0.02]"}`}
            onClick={() => !s.done && navigate(s.route)}
          >
            {s.done ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className={`font-medium ${s.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {s.label}
            </span>
            {!s.done && nextStep === s && (
              <ArrowRight className="h-3 w-3 text-primary ml-auto shrink-0" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
