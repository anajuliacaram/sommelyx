import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, GlassWater, AlertTriangle, ArrowDownRight, Wine, ArrowRight, Sparkles, Loader2, X } from "@/icons/lucide";
import { useWines } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getWineInsight, type WineInsight } from "@/lib/sommelier-ai";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const currentYear = new Date().getFullYear();

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.45, ease: [0.4, 0, 0.2, 1] as const } }),
} as const;

interface AlertItem {
  id: string;
  wineId: string;
  type: string;
  icon: typeof Bell;
  tone: string;
  bg: string;
  title: string;
  desc: string;
  wineName: string;
  style?: string | null;
  grape?: string | null;
  region?: string | null;
  country?: string | null;
  vintage?: number | null;
  drinkFrom?: number | null;
  drinkUntil?: number | null;
}

export default function AlertsPage() {
  const { data: wines } = useWines();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profileType } = useAuth();

  const [insights, setInsights] = useState<Record<string, WineInsight>>({});
  const [loadingInsight, setLoadingInsight] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const alerts = useMemo(() => {
    if (!wines) return [];
    const items: AlertItem[] = [];

    wines.forEach(w => {
      if (w.quantity <= 0) return;

      if (w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until) {
        items.push({
          id: `now-${w.id}`, wineId: w.id, type: "drink_now", icon: GlassWater, tone: "text-success", bg: "bg-success/8",
          title: "Beber agora", desc: `Janela ideal: ${w.drink_from}–${w.drink_until}`, wineName: w.name,
          style: w.style, grape: w.grape, region: w.region, country: w.country, vintage: w.vintage,
          drinkFrom: w.drink_from, drinkUntil: w.drink_until,
        });
      }

      if (w.drink_until && currentYear > w.drink_until) {
        items.push({
          id: `past-${w.id}`, wineId: w.id, type: "past_peak", icon: AlertTriangle, tone: "text-warning", bg: "bg-warning/8",
          title: "Beber em breve", desc: `Janela ideal encerrou em ${w.drink_until} — recomendamos consumir logo`, wineName: w.name,
          style: w.style, grape: w.grape, region: w.region, country: w.country, vintage: w.vintage,
          drinkFrom: w.drink_from, drinkUntil: w.drink_until,
        });
      }

      if (w.quantity > 0 && w.quantity <= 2 && profileType === "commercial") {
        items.push({
          id: `low-${w.id}`, wineId: w.id, type: "low_stock", icon: ArrowDownRight, tone: "text-wine", bg: "bg-wine/8",
          title: "Estoque baixo", desc: `Apenas ${w.quantity} garrafa(s) restante(s)`, wineName: w.name,
        });
      }
    });

    return items;
  }, [wines]);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  const grouped = {
    drink_now: visibleAlerts.filter(a => a.type === "drink_now"),
    past_peak: visibleAlerts.filter(a => a.type === "past_peak"),
    low_stock: visibleAlerts.filter(a => a.type === "low_stock"),
  };

  const handleInsight = useCallback(async (alert: AlertItem) => {
    // Toggle if already expanded
    if (expandedId === alert.id) {
      setExpandedId(null);
      return;
    }

    // If already fetched, just expand
    if (insights[alert.id]) {
      setExpandedId(alert.id);
      return;
    }

    // Fetch from AI
    setLoadingInsight(alert.id);
    setExpandedId(alert.id);
    try {
      const result = await getWineInsight({
        name: alert.wineName,
        alertType: alert.type as "drink_now" | "past_peak",
        style: alert.style,
        grape: alert.grape,
        region: alert.region,
        country: alert.country,
        vintage: alert.vintage,
        drinkFrom: alert.drinkFrom,
        drinkUntil: alert.drinkUntil,
      });
      setInsights(prev => ({ ...prev, [alert.id]: result }));
    } catch (err) {
      toast({ title: "Não foi possível gerar a análise", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
      setExpandedId(null);
    } finally {
      setLoadingInsight(null);
    }
  }, [expandedId, insights, toast]);

  const hasAiSupport = (type: string) => type === "drink_now" || type === "past_peak";

  return (
    <div className="space-y-5 max-w-4xl">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="section-surface">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-primary" />
              <h1 className="text-lg font-serif font-bold text-foreground tracking-tight">Alertas</h1>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">{visibleAlerts.length} alerta{visibleAlerts.length !== 1 ? "s" : ""} ativo{visibleAlerts.length !== 1 ? "s" : ""}</p>
          </div>
          {visibleAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => setDismissedIds(new Set(alerts.map(a => a.id)))}
              className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/20"
            >
              Limpar tudo
            </button>
          )}
        </div>
        </div>
      </motion.div>

      {visibleAlerts.length === 0 ? (
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
            const labels: Record<string, string> = { drink_now: "Beber agora", past_peak: "Beber em breve", low_stock: "Estoque baixo" };
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
                    <motion.div
                      key={a.id}
                      initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
                    >
                      <div className="glass-card overflow-hidden">
                        <div
                          className="p-3 flex items-center gap-3 cursor-pointer group w-full text-left transition-all hover:shadow-md"
                          onClick={() => navigate("/dashboard/cellar")}
                          role="button"
                          tabIndex={0}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", a.bg)}>
                            <a.icon className={cn("h-3.5 w-3.5", a.tone)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate text-foreground">{a.wineName}</p>
                            <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                          </div>

                          {hasAiSupport(a.type) && (
                            <button
                              type="button"
                              className={cn(
                                "flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg shrink-0 transition-all",
                                expandedId === a.id
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted/20 text-muted-foreground hover:bg-primary/8 hover:text-primary",
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInsight(a);
                              }}
                              disabled={loadingInsight === a.id}
                            >
                              {loadingInsight === a.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              Análise
                            </button>
                          )}

                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", a.bg, a.tone)}>
                            {a.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDismissedIds(prev => new Set(prev).add(a.id)); }}
                            className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-colors"
                            title="Dispensar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
                        </div>

                        <AnimatePresence>
                          {expandedId === a.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 border-t border-border/20">
                                {loadingInsight === a.id ? (
                                  <div className="flex items-center gap-2 py-3">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    <span className="text-[12px] text-muted-foreground italic">Analisando o vinho...</span>
                                  </div>
                                ) : insights[a.id] ? (
                                  <div className="space-y-2 py-2">
                                    <div className="flex items-start gap-2">
                                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                      <p className="text-[12px] leading-relaxed text-foreground/90">{insights[a.id].insight}</p>
                                    </div>
                                    {insights[a.id].recommendation && (
                                      <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2">
                                        <Wine className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                        <p className="text-[12px] font-medium text-primary">{insights[a.id].recommendation}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
