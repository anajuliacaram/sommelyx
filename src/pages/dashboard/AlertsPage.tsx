import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, GlassWater, AlertTriangle, ArrowDownRight, Wine, ArrowRight, Sparkles, Loader2, X, BarChart3 } from "@/icons/lucide";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [analysisOpen, setAnalysisOpen] = useState(false);

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

  const cellarAnalysis = useMemo(() => {
    const list = wines ?? [];
    const inStock = list.filter(w => w.quantity > 0);
    const totalBottles = inStock.reduce((s, w) => s + w.quantity, 0);
    const totalValue = inStock.reduce((s, w) => s + (Number(w.current_value || w.purchase_price || 0) * w.quantity), 0);
    const styleCounts: Record<string, number> = {};
    inStock.forEach(w => {
      const s = (w.style || "").toLowerCase();
      let fam = "outros";
      if (s.includes("tint")) fam = "tintos";
      else if (s.includes("branc")) fam = "brancos";
      else if (s.includes("ros")) fam = "rosés";
      else if (s.includes("espum") || s.includes("champ")) fam = "espumantes";
      else if (s.includes("sobrem") || s.includes("fort")) fam = "sobremesa";
      styleCounts[fam] = (styleCounts[fam] || 0) + w.quantity;
    });
    const dominantStyle = Object.entries(styleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const dominantPct = totalBottles > 0 && styleCounts[dominantStyle]
      ? Math.round((styleCounts[dominantStyle] / totalBottles) * 100) : 0;
    const drinkNowCount = grouped.drink_now.length;
    const pastPeakCount = grouped.past_peak.length;
    const lowStockCount = grouped.low_stock.length;
    const avgRating = inStock.filter(w => w.rating).reduce((s, w, _, arr) => s + (Number(w.rating) || 0) / arr.length, 0);
    const oldestVintage = inStock.reduce((m, w) => (w.vintage && (!m || w.vintage < m) ? w.vintage : m), null as number | null);

    const lines: string[] = [];
    if (totalBottles === 0) {
      lines.push("Sua adega está vazia. Comece adicionando rótulos para receber análises técnicas reais sobre composição, evolução e janela de consumo.");
    } else {
      lines.push(`Adega com ${totalBottles} garrafa${totalBottles > 1 ? "s" : ""} ativa${totalBottles > 1 ? "s" : ""}, dominância de ${dominantStyle} (${dominantPct}% do estoque). Valor estimado em circulação: R$ ${totalValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}.`);
      if (drinkNowCount > 0) {
        lines.push(`${drinkNowCount} rótulo${drinkNowCount > 1 ? "s" : ""} no auge da janela ideal — priorize abertura nos próximos 60–90 dias para capturar o ápice de complexidade aromática terciária antes da inflexão evolutiva.`);
      }
      if (pastPeakCount > 0) {
        lines.push(`${pastPeakCount} vinho${pastPeakCount > 1 ? "s ultrapassaram" : " ultrapassou"} a janela técnica recomendada. Risco de oxidação avançada e perda de fruta primária — considere consumo imediato ou uso culinário em reduções.`);
      }
      if (lowStockCount > 0 && profileType === "commercial") {
        lines.push(`${lowStockCount} referência${lowStockCount > 1 ? "s" : ""} com estoque crítico (≤2 unidades). Revisar reposição para manter giro e disponibilidade no salão.`);
      }
      if (avgRating > 0) {
        lines.push(`Curadoria média da casa: ${avgRating.toFixed(1)}/5. ${oldestVintage ? `Safra mais antiga em estoque: ${oldestVintage}.` : ""}`);
      }
      if (drinkNowCount === 0 && pastPeakCount === 0) {
        lines.push("Nenhum vinho em janela crítica no momento — perfil de guarda equilibrado, com tempo para evolução fenólica adequada.");
      }
    }
    return { lines, totalBottles, totalValue, dominantStyle, dominantPct, drinkNowCount, pastPeakCount, lowStockCount };
  }, [wines, grouped, profileType]);

  const scrollToDrinkNow = () => {
    const el = document.getElementById("alerts-drink_now");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

      {/* ── Ações inteligentes (CTA premium) ── */}
      {visibleAlerts.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="space-y-3 pt-1">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-[#7B1E2B]" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7B1E2B]">
              Ações inteligentes
            </h2>
          </div>

          <button
            type="button"
            onClick={scrollToDrinkNow}
            className="group relative w-full overflow-hidden rounded-2xl px-5 text-left transition-all duration-300 hover:scale-[1.015] active:scale-[0.99]"
            style={{
              height: 64,
              background: "linear-gradient(135deg, #7B1E2B 0%, #A12C3A 100%)",
              boxShadow: "0 10px 25px rgba(123,30,43,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex h-full items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 backdrop-blur-sm ring-1 ring-white/15">
                <GlassWater className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[16px] font-semibold leading-none text-white">Beber agora</span>
                  {cellarAnalysis.drinkNowCount > 0 && (
                    <span className="rounded-full bg-[#C9B469] px-1.5 py-0.5 text-[10px] font-bold text-[#1A1713] shadow-[0_0_6px_rgba(201,180,105,0.45)]">
                      {cellarAnalysis.drinkNowCount}
                    </span>
                  )}
                  {/* Bolinhas por tipo de vinho na seção drink_now */}
                  {(() => {
                    const counts: Record<string, number> = {};
                    grouped.drink_now.forEach(a => {
                      const s = (a.style || "").toLowerCase();
                      let fam = "outros";
                      if (s.includes("tint")) fam = "tinto";
                      else if (s.includes("branc")) fam = "branco";
                      else if (s.includes("ros")) fam = "rose";
                      else if (s.includes("espum") || s.includes("champ")) fam = "espumante";
                      else if (s.includes("sobrem") || s.includes("fort")) fam = "fort";
                      counts[fam] = (counts[fam] || 0) + 1;
                    });
                    const colorMap: Record<string, string> = {
                      tinto: "#7B1E2B",
                      branco: "#EFE3B0",
                      rose: "#E8A4B0",
                      espumante: "#F4E27A",
                      fort: "#5A1420",
                      outros: "#C9B469",
                    };
                    const labelMap: Record<string, string> = {
                      tinto: "Tinto", branco: "Branco", rose: "Rosé", espumante: "Espumante", fort: "Fortificado", outros: "Outros",
                    };
                    return Object.entries(counts).map(([fam, n]) => (
                      <span key={fam} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/90 ring-1 ring-white/15" title={`${labelMap[fam]}: ${n}`}>
                        <span className="h-1.5 w-1.5 rounded-full ring-1 ring-white/40" style={{ background: colorMap[fam] }} />
                        {n}
                      </span>
                    ));
                  })()}
                </div>
                <p className="mt-1 text-[11.5px] font-medium leading-none text-white/75">
                  Veja os vinhos no momento ideal
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-white/85 transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAnalysisOpen(true)}
            className="group relative w-full overflow-hidden rounded-2xl px-5 text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              height: 56,
              background: "linear-gradient(135deg, #1B3B27 0%, #2A5A3C 60%, #102515 100%)",
              boxShadow: "0 10px 25px rgba(18,54,31,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
              border: "1px solid rgba(201,180,105,0.20)",
            }}
          >
            <div className="absolute -right-8 top-0 h-20 w-20 rounded-full bg-[#C9B469]/10 blur-2xl pointer-events-none" />
            <div className="relative flex h-full items-center gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                <BarChart3 className="h-4 w-4 text-[#C9B469]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold leading-none text-white">Analisar com Sommelyx</div>
                <p className="mt-1 text-[11px] font-medium leading-none text-white/70">
                  Entenda valor, giro e consumo
                </p>
              </div>
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#C9B469] transition-transform duration-300 group-hover:rotate-12" />
            </div>
          </button>
        </motion.div>
      )}
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
              <motion.div key={key} id={`alerts-${key}`} initial="hidden" animate="visible" variants={fadeUp} custom={1} className="space-y-1.5 scroll-mt-20">
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
                                  "flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-md shrink-0 transition-all text-[11px]",
                                  expandedId === a.id
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-transparent text-muted-foreground border border-border/40 hover:bg-primary/5 hover:text-primary hover:border-primary/20",
                                )}
                                onClick={(e) => { e.stopPropagation(); handleInsight(a); }}
                                disabled={loadingInsight === a.id}
                                title="Análise Sommelyx"
                              >
                                {loadingInsight === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                Analisar
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
                              <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] border border-primary/15 px-4 py-3.5">
                                {loadingInsight === a.id ? (
                                  <div className="flex items-center gap-2 py-1">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    <span className="text-[12px] text-muted-foreground italic">Consultando inteligência Sommelyx…</span>
                                  </div>
                                ) : insights[a.id] ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-primary/15">
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                      <h4
                                        className="font-serif text-[19px] font-bold leading-none tracking-[-0.01em] text-foreground"
                                        style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                                      >
                                        Análise Sommelyx
                                      </h4>
                                    </div>
                                    <p className="text-[13.5px] leading-[1.7] text-foreground/85">
                                      {insights[a.id].insight}
                                    </p>
                                    {insights[a.id].recommendation && (
                                      <div className="flex items-start gap-2 rounded-lg bg-primary/[0.07] border border-primary/10 px-3 py-2.5 mt-2">
                                        <Wine className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                        <p className="text-[12.5px] font-medium text-primary leading-snug">
                                          {insights[a.id].recommendation}
                                        </p>
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

      {/* ── Modal: Análise Sommelyx geral da adega ── */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-white border-[rgba(123,30,43,0.15)]">
          <div
            className="px-6 py-5"
            style={{ background: "linear-gradient(135deg, #7B1E2B 0%, #A12C3A 100%)" }}
          >
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <DialogTitle
                  className="text-[22px] font-bold leading-none text-white"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                >
                  Análise Sommelyx
                </DialogTitle>
              </div>
              <p className="text-[12px] font-medium leading-snug text-white/80">
                Diagnóstico técnico completo da sua adega
              </p>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[rgba(123,30,43,0.12)] bg-[rgba(123,30,43,0.04)] px-3 py-2.5">
                <div className="text-[18px] font-bold leading-none text-[#7B1E2B] tabular-nums">
                  {cellarAnalysis.totalBottles}
                </div>
                <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[rgba(58,51,39,0.55)]">
                  Garrafas
                </div>
              </div>
              <div className="rounded-xl border border-[rgba(95,127,82,0.15)] bg-[rgba(95,127,82,0.05)] px-3 py-2.5">
                <div className="text-[14px] font-bold leading-tight text-[#5F7F52] tabular-nums">
                  R$ {cellarAnalysis.totalValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[rgba(58,51,39,0.55)]">
                  Valor
                </div>
              </div>
              <div className="rounded-xl border border-[rgba(180,140,58,0.18)] bg-[rgba(180,140,58,0.06)] px-3 py-2.5">
                <div className="text-[14px] font-bold leading-tight text-[#B48C3A] capitalize">
                  {cellarAnalysis.dominantStyle}
                </div>
                <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[rgba(58,51,39,0.55)]">
                  {cellarAnalysis.dominantPct}% do estoque
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {cellarAnalysis.lines.map((line, i) => (
                <p key={i} className="text-[13.5px] leading-[1.7] text-[#2A2A2A]">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
