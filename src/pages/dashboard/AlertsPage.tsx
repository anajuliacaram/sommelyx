import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, GlassWater, AlertTriangle, ArrowDownRight, Wine } from "@/icons/lucide";
import { useWines } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";

const currentYear = new Date().getFullYear();

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.45, ease: [0.4, 0, 0.2, 1] as const } }),
} as const;

export default function AlertsPage() {
  const { data: wines } = useWines();
  const navigate = useNavigate();

  const alerts = useMemo(() => {
    if (!wines) return [];
    const items: { id: string; type: string; icon: typeof Bell; color: string; bg: string; title: string; desc: string; wineName: string }[] = [];

    wines.forEach(w => {
      if (w.quantity <= 0) return;

      // Drink now
      if (w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until) {
        items.push({
          id: `now-${w.id}`, type: "drink_now", icon: GlassWater, color: "#22c55e", bg: "rgba(34,197,94,0.06)",
          title: "Beber agora", desc: `Janela ideal: ${w.drink_from}–${w.drink_until}`, wineName: w.name,
        });
      }

      // Past peak
      if (w.drink_until && currentYear > w.drink_until) {
        items.push({
          id: `past-${w.id}`, type: "past_peak", icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.06)",
          title: "Passou do pico", desc: `Janela encerrou em ${w.drink_until}`, wineName: w.name,
        });
      }

      // Low stock
      if (w.quantity > 0 && w.quantity <= 2) {
        items.push({
          id: `low-${w.id}`, type: "low_stock", icon: ArrowDownRight, color: "#E07A5F", bg: "rgba(224,122,95,0.06)",
          title: "Estoque baixo", desc: `Apenas ${w.quantity} garrafa(s) restante(s)`, wineName: w.name,
        });
      }
    });

    return items;
  }, [wines]);

  const grouped = {
    drink_now: alerts.filter(a => a.type === "drink_now"),
    past_peak: alerts.filter(a => a.type === "past_peak"),
    low_stock: alerts.filter(a => a.type === "low_stock"),
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" style={{ color: "#8F2D56" }} />
          <h1 className="text-xl font-serif font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>Alertas</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{alerts.length} alerta(s) ativo(s)</p>
      </motion.div>

      {alerts.length === 0 ? (
        <motion.div className="glass-card p-6 sm:p-12 text-center" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(34,197,94,0.08)" }}>
            <Wine className="h-6 w-6" style={{ color: "#22c55e" }} />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Tudo em ordem!</h3>
          <p className="text-sm text-muted-foreground">Nenhum alerta no momento. Continue adicionando vinhos com janela de consumo.</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([key, items]) => {
            if (items.length === 0) return null;
            const labels: Record<string, string> = { drink_now: "🍷 Beber agora", past_peak: "⚠️ Passando do pico", low_stock: "📦 Estoque baixo" };
            return (
              <motion.div key={key} initial="hidden" animate="visible" variants={fadeUp} custom={1} className="space-y-2.5">
                <h2 className="text-[13px] font-semibold font-sans uppercase tracking-[0.08em]" style={{ color: "#9CA3AF" }}>{labels[key]}</h2>
                <div className="space-y-2">
                  {items.map((a, i) => (
                    <motion.div
                      key={a.id}
                      className="glass-card p-4 flex items-center gap-4 cursor-pointer group"
                      initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
                      onClick={() => navigate("/dashboard/cellar")}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: a.bg }}>
                        <a.icon className="h-4 w-4" style={{ color: a.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "#0F0F14" }}>{a.wineName}</p>
                        <p className="text-[11px]" style={{ color: "#6B7280" }}>{a.desc}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: a.bg, color: a.color }}>
                        {a.title}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
