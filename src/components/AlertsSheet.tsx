import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, GlassWater, AlertTriangle, ArrowDownRight, Wine, Sparkles, Loader2, X } from "@/icons/lucide";
import { useWines } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getWineInsight, type WineInsight } from "@/lib/sommelier-ai";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getStyleColor, getStyleFamily } from "@/components/editorial/EditorialPrimitives";

const STYLE_LABELS: Record<string, string> = { tinto: "Tinto", branco: "Branco", "rosé": "Rosé", espumante: "Espumante", sobremesa: "Sobremesa" };

const currentYear = new Date().getFullYear();

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

interface AlertsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileType?: "personal" | "commercial" | null;
}

export function AlertsSheet({ open, onOpenChange, profileType }: AlertsSheetProps) {
  const { data: wines } = useWines();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [insights, setInsights] = useState<Record<string, WineInsight>>({});
  const [loadingInsight, setLoadingInsight] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

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
          title: "Estoque baixo", desc: `Apenas ${w.quantity} garrafa(s)`, wineName: w.name,
        });
      }
    });

    return items;
  }, [wines]);

  const handleInsight = useCallback(async (alert: AlertItem) => {
    if (expandedId === alert.id) { setExpandedId(null); return; }
    if (insights[alert.id]) { setExpandedId(alert.id); return; }

    setLoadingInsight(alert.id);
    setExpandedId(alert.id);
    try {
      const result = await getWineInsight({
        name: alert.wineName,
        alertType: alert.type as "drink_now" | "past_peak",
        style: alert.style, grape: alert.grape, region: alert.region,
        country: alert.country, vintage: alert.vintage,
        drinkFrom: alert.drinkFrom, drinkUntil: alert.drinkUntil,
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

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  const grouped = {
    drink_now: visibleAlerts.filter(a => a.type === "drink_now"),
    past_peak: visibleAlerts.filter(a => a.type === "past_peak"),
    low_stock: visibleAlerts.filter(a => a.type === "low_stock"),
  };

  const labels: Record<string, string> = { drink_now: "Beber agora", past_peak: "Beber em breve", low_stock: "Estoque baixo" };
  const icons: Record<string, typeof Bell> = { drink_now: GlassWater, past_peak: AlertTriangle, low_stock: ArrowDownRight };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/30 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base font-serif font-bold">Alertas</SheetTitle>
              <p className="text-[11px] text-muted-foreground">{visibleAlerts.length} ativo{visibleAlerts.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {visibleAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => setDismissedIds(new Set(alerts.map(a => a.id)))}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/20"
            >
              Limpar tudo
            </button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {visibleAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-success/8 flex items-center justify-center mb-3">
                <Wine className="h-5 w-5 text-success" />
              </div>
              <h3 className="text-[14px] font-semibold text-foreground mb-1">Tudo em ordem!</h3>
              <p className="text-[12px] text-muted-foreground max-w-[220px]">Nenhum alerta no momento.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([key, items]) => {
              if (items.length === 0) return null;
              const SectionIcon = icons[key] || Bell;
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <SectionIcon className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{labels[key]} · {items.length}</span>
                  </div>
                  {items.map((a) => {
                    const wineColor = getStyleColor(a.style);
                    const familyLabel = STYLE_LABELS[getStyleFamily(a.style)] || "Tinto";
                    return (
                    <div key={a.id} className="rounded-xl border border-border/30 bg-card/60 overflow-hidden relative">
                      {/* Barra lateral colorida por tipo de vinho */}
                      <span
                        aria-hidden
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-[2px]"
                        style={{ background: wineColor, boxShadow: `0 0 6px ${wineColor}40` }}
                      />
                      <div
                        className="p-3 pl-4 flex items-center gap-2.5 cursor-pointer active:bg-muted/10 transition-colors"
                        onClick={() => { onOpenChange(false); navigate("/dashboard/cellar"); }}
                      >
                        {/* Bolinha colorida tipo de vinho */}
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/5"
                          style={{ background: wineColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 leading-none">
                            <span
                              className="text-[10px] font-semibold uppercase"
                              style={{ letterSpacing: "0.12em", color: wineColor }}
                            >
                              {familyLabel}
                            </span>
                            {a.vintage && (
                              <span className="text-[10px] font-medium text-muted-foreground/60">· {a.vintage}</span>
                            )}
                          </div>
                          <p className="text-[13px] font-semibold truncate text-foreground mt-0.5">{a.wineName}</p>
                          <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                        </div>

                        {hasAiSupport(a.type) && (
                          <button
                            type="button"
                            className={cn(
                              "flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg shrink-0 transition-all",
                              expandedId === a.id
                                ? "bg-primary/10 text-primary"
                                : "bg-muted/20 text-muted-foreground hover:bg-primary/8 hover:text-primary",
                            )}
                            onClick={(e) => { e.stopPropagation(); handleInsight(a); }}
                            disabled={loadingInsight === a.id}
                          >
                            {loadingInsight === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          </button>
                        )}

                        <Badge variant="outline" className={cn("text-[9px] h-5 shrink-0 border-0", a.bg, a.tone)}>
                          {a.title}
                        </Badge>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDismissedIds(prev => new Set(prev).add(a.id)); }}
                          className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-colors"
                          title="Dispensar"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {expandedId === a.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-1 border-t border-border/15">
                              {loadingInsight === a.id ? (
                                <div className="flex items-center gap-2 py-2">
                                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                  <span className="text-[11px] text-muted-foreground italic">Analisando...</span>
                                </div>
                              ) : insights[a.id] ? (
                                <div className="space-y-1.5 py-1.5">
                                  <p className="text-[11px] leading-relaxed text-foreground/85">{insights[a.id].insight}</p>
                                  {insights[a.id].recommendation && (
                                    <div className="rounded-lg bg-primary/5 px-2.5 py-1.5">
                                      <p className="text-[11px] font-medium text-primary">{insights[a.id].recommendation}</p>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );})}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
