import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, GlassWater, AlertTriangle, ArrowDownRight, Wine, ArrowRight } from "@/icons/lucide";
import { useWines } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
    const items: { id: string; type: string; icon: typeof Bell; tone: string; bg: string; title: string; desc: string; wineName: string }[] = [];

    wines.forEach(w => {
      if (w.quantity <= 0) return;

      if (w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until) {
        items.push({
          id: `now-${w.id}`, type: "drink_now", icon: GlassWater, tone: "text-success", bg: "bg-success/8",
          title: "Beber agora", desc: `Janela ideal: ${w.drink_from}–${w.drink_until}`, wineName: w.name,
        });
      }

      if (w.drink_until && currentYear > w.drink_until) {
        items.push({
          id: `past-${w.id}`, type: "past_peak", icon: AlertTriangle, tone: "text-warning", bg: "bg-warning/8",
          title: "Passou do pico", desc: `Janela encerrou em ${w.drink_until}`, wineName: w.name,
        });
      }

      if (w.quantity > 0 && w.quantity <= 2) {
        items.push({
          id: `low-${w.id}`, type: "low_stock", icon: ArrowDownRight, tone: "text-wine", bg: "bg-wine/8",
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
    <div className="space-y-5 max-w-4xl">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="flex items-center gap-2">
          <Bell className="h-4.5 w-4.5 text-primary" />
          <h1 className="text-lg font-serif font-bold text-foreground tracking-tight">Alertas</h1>
        </div>
        <p className="text-[12px] text-muted-foreground mt-0.5">{alerts.length} alerta{alerts.length !== 1 ? "s" : ""} ativo{alerts.length !== 1 ? "s" : ""}</p>
      </motion.div>

      {alerts.length === 0 ? (
        <motion.div className="glass-card p-8 text-center" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 bg-success/8">
            <Wine className="h-5 w-5 text-success" />
          </div>
          <h3 className="text-[14px] font-semibold text-foreground mb-1">Tudo em ordem!</h3>
          <p className="text-[12px] text-muted-foreground max-w-xs mx-auto">Nenhum alerta no momento. Continue adicionando vinhos com janela de consumo.</p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([key, items]) => {
            if (items.length === 0) return null;
            const labels: Record<string, string> = { drink_now: "Beber agora", past_peak: "Passando do pico", low_stock: "Estoque baixo" };
            const icons: Record<string, typeof Bell> = { drink_now: GlassWater, past_peak: AlertTriangle, low_stock: ArrowDownRight };
            const SectionIcon = icons[key] || Bell;
            return (
              <motion.div key={key} initial="hidden" animate="visible" variants={fadeUp} custom={1} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <SectionIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">{labels[key]} · {items.length}</h2>
                </div>
                <div className="grid gap-1.5">
                  {items.map((a, i) => (
                    <motion.button
                      key={a.id}
                      type="button"
                      className="glass-card p-3 flex items-center gap-3 cursor-pointer group w-full text-left transition-all hover:shadow-md"
                      initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
                      onClick={() => navigate("/dashboard/cellar")}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", a.bg)}>
                        <a.icon className={cn("h-3.5 w-3.5", a.tone)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate text-foreground">{a.wineName}</p>
                        <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", a.bg, a.tone)}>
                        {a.title}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
                    </motion.button>
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
