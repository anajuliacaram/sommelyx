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
  hidden: { opacity: 0, y: 6 } as const,
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } }),
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

const sectionConfig: Record<string, { label: string; icon: typeof Bell; accent: string; accentBg: string }> = {
  drink_now: { label: "Beber agora", icon: GlassWater, accent: "text-emerald-700", accentBg: "bg-emerald-600/8" },
  past_peak: { label: "Beber em breve", icon: AlertTriangle, accent: "text-[#a5723b]", accentBg: "bg-amber-500/8" },
  low_stock: { label: "Estoque baixo", icon: ArrowDownRight, accent: "text-wine", accentBg: "bg-wine/8" },
};

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
          id: `now-${w.id}`, wineId: w.id, type: "drink_now", icon: GlassWater, tone: "text-emerald-700", bg: "bg-emerald-600/8",
          title: "Beber agora", desc: `Janela ideal: ${w.drink_from}–${w.drink_until}`, wineName: w.name,
          style: w.style, grape: w.grape, region: w.region, country: w.country, vintage: w.vintage,
          drinkFrom: w.drink_from, drinkUntil: w.drink_until,
        });
      }
      if (w.drink_until && currentYear > w.drink_until) {
        items.push({
          id: `past-${w.id}`, wineId: w.id, type: "past_peak", icon: AlertTriangle, tone: "text-[#824917]", bg: "bg-amber-500/8",
          title: "Beber em breve", desc: `Janela encerrou em ${w.drink_until}`, wineName: w.name,
          style: w.style, grape: w.grape, region: w.region, country: w.country, vintage: w.vintage,
          drinkFrom: w.drink_from, drinkUntil: w.drink_until,
        });
      }
      if (w.quantity > 0 && w.quantity <= 2 && profileType === "commercial") {
        items.push({
          id: `low-${w.id}`, wineId: w.id, type: "low_stock", icon: ArrowDownRight, tone: "text-wine", bg: "bg-wine/8",
          title: "Estoque baixo", desc: `${w.quantity} garrafa(s)`, wineName: w.name,
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
    if (expandedId === alert.id) { setExpandedId(null); return; }
    if (insights[alert.id]) { setExpandedId(alert.id); return; }
    setLoadingInsight(alert.id);
    setExpandedId(alert.id);
    try {
      const result = await getWineInsight({
        name: alert.wineName, alertType: alert.type as "drink_now" | "past_peak",
        style: alert.style, grape: alert.grape, region: alert.region, country: alert.country,
        vintage: alert.vintage, drinkFrom: alert.drinkFrom, drinkUntil: alert.drinkUntil,
      });
      setInsights(prev => ({ ...prev, [alert.id]: result }));
    } catch (err) {
      toast({ title: "Erro na análise", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
      setExpandedId(null);
    } finally { setLoadingInsight(null); }
  }, [expandedId, insights, toast]);

  const hasAiSupport = (type: string) => type === "drink_now" || type === "past_peak";

  return (
    <div className="space-y-3 max-w-3xl">
      {/* ── Header ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="glass-card px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[10px] bg-primary/8 flex items-center justify-center">
                <Bell className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h1 className="text-[15px] font-serif font-bold text-foreground leading-tight">Alertas</h1>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {visibleAlerts.length} alerta{visibleAlerts.length !== 1 ? "s" : ""} ativo{visibleAlerts.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {visibleAlerts.length > 0 && (
              <button
                type="button"
                onClick={() => setDismissedIds(new Set(alerts.map(a => a.id)))}
                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded-lg hover:bg-black/[0.04]"
              >
                Limpar tudo
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Empty state ── */}
      {visibleAlerts.length === 0 ? (
        <motion.div className="glass-card px-5 py-10 text-center" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="w-9 h-9 rounded-xl bg-emerald-600/8 flex items-center justify-center mx-auto mb-2.5">
            <Wine className="h-4 w-4 text-emerald-700" />
          </div>
          <h3 className="text-[13px] font-semibold text-foreground mb-0.5">Tudo em ordem!</h3>
          <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto">Nenhum alerta no momento. Seus vinhos estão bem cuidados.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, items]) => {
            if (items.length === 0) return null;
            const cfg = sectionConfig[key] || sectionConfig.drink_now;
            const SectionIcon = cfg.icon;

            return (
              <motion.div key={key} initial="hidden" animate="visible" variants={fadeUp} custom={1} className="space-y-1.5">
                {/* ── Section header ── */}
                <div className="flex items-center gap-2 px-1">
                  <div className={cn("w-5 h-5 rounded-md flex items-center justify-center px-[4px]", cfg.accentBg)}>
                    <SectionIcon className={cn("h-2.5 w-2.5", key === "past_peak" ? "text-[#956437] text-4xl" : cfg.accent)} />
                  </div>
                  <h2 className={cn("font-bold tracking-wide", key === "past_peak" ? "text-[#a5723b] text-lg" : cn("text-[11px]", cfg.accent))}>
                    {cfg.label}
                  </h2>
                  <span className="text-[10px] text-muted-foreground/60 font-medium">{items.length}</span>
                </div>

                {/* ── Alert cards ── */}
                <div className="space-y-1">
                  {items.map((a, i) => (
                    <motion.div key={a.id} initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}>
                      <div className="glass-card overflow-hidden">
                        {/* Card row */}
                        <div
                          className="py-2 gap-2 cursor-pointer group transition-colors hover:bg-black/[0.015] flex items-center justify-start px-[30px]"
                          onClick={() => navigate("/dashboard/cellar")}
                          role="button"
                          tabIndex={0}
                        >
                          {/* Icon */}
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", a.bg)}>
                            <a.icon className={cn("h-2.5 w-2.5", a.tone)} />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-foreground leading-tight text-base font-sans">{a.wineName}</p>
                            <p className="text-muted-foreground leading-tight mt-px font-medium text-xs">{a.desc}</p>
                          </div>

                          {/* Actions cluster */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasAiSupport(a.type) && (
                              <button
                                type="button"
                                className={cn(
                                  "flex items-center gap-1 font-semibold pl-1.5 pr-2 rounded-md shrink-0 transition-all text-sm",
                                  expandedId === a.id
                                    ? "bg-primary/8 text-primary border-primary/15 py-0.5 border"
                                    : "bg-transparent text-muted-foreground border-border/30 hover:bg-primary/5 hover:text-primary hover:border-primary/15 border-2 px-[2px] py-[2px]",
                                )}
                                onClick={(e) => { e.stopPropagation(); handleInsight(a); }}
                                disabled={loadingInsight === a.id}
                              >
                                {loadingInsight === a.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                                IA
                              </button>
                            )}

                            <span className={cn(
                              "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0",
                              a.bg, a.tone
                            )}>
                              {a.title}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDismissedIds(prev => new Set(prev).add(a.id)); }}
                              className="h-5 w-5 rounded-md flex items-center justify-center shrink-0 text-muted-foreground/30 hover:text-foreground hover:bg-black/[0.04] transition-colors"
                              title="Dispensar"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>

                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/20 shrink-0 group-hover:text-muted-foreground/50 transition-colors" />
                          </div>
                        </div>

                        {/* ── Expanded AI insight ── */}
                        <AnimatePresence>
                          {expandedId === a.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="mx-3 mb-2.5 rounded-lg bg-black/[0.02] border border-border/15 px-3 py-2">
                                {loadingInsight === a.id ? (
                                  <div className="flex items-center gap-2 py-1">
                                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                    <span className="text-[10px] text-muted-foreground italic">Analisando…</span>
                                  </div>
                                ) : insights[a.id] ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-start gap-1.5">
                                      <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                                      <p className="text-[10px] leading-[1.6] text-foreground/80">{insights[a.id].insight}</p>
                                    </div>
                                    {insights[a.id].recommendation && (
                                      <div className="flex items-start gap-1.5 rounded-md bg-primary/[0.04] px-2 py-1.5">
                                        <Wine className="h-3 w-3 text-primary shrink-0 mt-px" />
                                        <p className="text-[10px] font-medium text-primary leading-snug">{insights[a.id].recommendation}</p>
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
