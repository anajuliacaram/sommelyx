import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  GlassWater,
  Layers,
  Star,
  Wine,
} from "@/icons/lucide";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { QuickActions } from "@/components/QuickActions";
import { DishToWineDialog } from "@/components/DishToWineDialog";
import { WineListScannerDialog } from "@/components/WineListScannerDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { useWineEvent, useWineMetrics } from "@/hooks/useWines";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 6 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

function buildMonthWindow(size: number) {
  const months: Array<{ key: string; label: string }> = [];
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - (size - 1));
  for (let i = 0; i < size; i++) {
    const d = new Date(cursor);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    months.push({ key, label });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export default function PersonalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";

  const { totalBottles, totalValue, drinkNow, recentCount, lowStock, wines, isLoading } = useWineMetrics();
  const { data: consumption = [] } = useConsumption();
  const wineEvent = useWineEvent();

  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [dishToWineOpen, setDishToWineOpen] = useState(false);
  const [wineListScanOpen, setWineListScanOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("sommelyx_onboarding_done_personal"));

  const currentYear = new Date().getFullYear();

  const readyToDrink = useMemo(() => {
    return wines
      .filter((w) => w.quantity > 0 && w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until)
      .slice()
      .sort((a, b) => (a.drink_until ?? 9999) - (b.drink_until ?? 9999))
      .slice(0, 8);
  }, [wines, currentYear]);

  const inGuard = useMemo(
    () => wines.filter((w) => w.quantity > 0 && w.drink_from && currentYear < w.drink_from).length,
    [wines, currentYear],
  );

  const pastPeak = useMemo(
    () => wines.filter((w) => w.quantity > 0 && w.drink_until && currentYear > w.drink_until).length,
    [wines, currentYear],
  );

  const months = useMemo(() => buildMonthWindow(6), []);

  const consumptionMonthly = useMemo(() => {
    const map: Record<string, number> = {};
    consumption.forEach((c) => {
      const d = new Date(c.consumed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return months.map((m) => ({ name: m.label, value: map[m.key] || 0 }));
  }, [consumption, months]);

  const kpis = useMemo(
    () => [
      { label: "Garrafas", value: `${totalBottles}`, icon: Layers, urgent: false },
      { label: "Valor estimado", value: totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }), icon: Star, urgent: false },
      { label: "Beber agora", value: `${drinkNow}`, icon: GlassWater, urgent: drinkNow > 0 },
    ],
    [drinkNow, totalBottles, totalValue],
  );

  const handleOpenBottle = async (wineId: string, wineName: string) => {
    try {
      await wineEvent.mutateAsync({ wineId, eventType: "open", quantity: 1 });
      toast({ title: `🍷 "${wineName}" aberto`, description: "Consumo registrado com sucesso." });
    } catch {
      toast({ title: "Erro ao registrar consumo", variant: "destructive" });
    }
  };

  const priorityItems = useMemo(() => {
    const items: { label: string; detail: string; tone: "success" | "warning" | "wine"; action?: () => void }[] = [];
    if (drinkNow > 0) items.push({ label: `${drinkNow} vinho${drinkNow > 1 ? "s" : ""} em janela ideal`, detail: "Hora de abrir", tone: "success", action: () => navigate("/dashboard/cellar") });
    if (pastPeak > 0) items.push({ label: `${pastPeak} vinho${pastPeak > 1 ? "s" : ""} — beber em breve`, detail: "Pode ter passado da janela ideal", tone: "wine", action: () => navigate("/dashboard/alerts") });
    const lastConsumed = consumption.length > 0 ? consumption[0] : null;
    if (lastConsumed) {
      const days = Math.floor((Date.now() - new Date(lastConsumed.consumed_at).getTime()) / (1000 * 60 * 60 * 24));
      items.push({ label: `Último consumo há ${days} dia${days !== 1 ? "s" : ""}`, detail: lastConsumed.wine_name, tone: "wine" });
    }
    return items;
  }, [drinkNow, pastPeak, consumption, navigate]);

  return (
    <>
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard
            profileType="personal"
            onComplete={() => {
              localStorage.setItem("sommelyx_onboarding_done_personal", "true");
              setShowOnboarding(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="max-w-[1280px] space-y-2.5">
        {/* ─── Header ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex flex-col gap-2.5 md:flex-row md:items-stretch md:justify-between">
            <div className="section-surface section-surface--full w-full md:flex-1 md:min-w-0">
              <h1 className="text-[17px] md:text-[20px] font-semibold tracking-[-0.03em] text-foreground">
                Olá, <span className="text-gradient-wine">{firstName}</span>
              </h1>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/68">
                Tudo pronto para revisar sua adega.
              </p>
            </div>

            <div className="section-surface section-surface--full w-full md:w-auto md:min-w-[260px]">
              <QuickActions
                variant="personal"
                layout="inline"
                onAddWine={() => setAddOpen(true)}
                onRegisterConsumption={() => setManageOpen(true)}
                onHarmonize={() => setDishToWineOpen(true)}
                onAnalyzeList={() => setWineListScanOpen(true)}
              />
            </div>
          </div>
        </motion.div>

        {/* ─── KPI Strip — compact inline ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="grid grid-cols-3 gap-1.5">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="card-depth p-2.5">
                  <Skeleton className="h-3 w-14 mb-1.5 rounded" />
                  <Skeleton className="h-5 w-10 rounded" />
                </div>
              ))
            ) : (
              kpis.map((kpi) => (
                <div key={kpi.label} className="card-depth p-2.5 flex items-center gap-2">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg shrink-0",
                    kpi.urgent ? "bg-primary/8" : "bg-muted/15"
                  )}>
                    <kpi.icon className={cn("h-3.5 w-3.5", kpi.urgent ? "text-primary" : "text-muted-foreground/50")} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-[13px] font-bold tracking-[-0.02em] leading-none tabular-nums",
                      kpi.urgent ? "text-primary" : "text-foreground",
                    )}>
                      {kpi.value}
                    </p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.04em] text-muted-foreground mt-0.5">{kpi.label}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* ─── Priority Block ─── */}
        {priorityItems.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            <div className="card-depth p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Hoje para decidir</p>
              <div className="grid gap-px">
                {priorityItems.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={item.action}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-200",
                      item.action ? "cursor-pointer hover:bg-muted/15" : "cursor-default",
                    )}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      item.tone === "success" && "bg-success",
                      item.tone === "warning" && "bg-warning",
                      item.tone === "wine" && "bg-primary",
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                    </div>
                    {item.action && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-12 gap-2.5">
          {/* ─── Ready to Drink ─── */}
          <motion.div className="col-span-12 lg:col-span-7" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <div className="card-depth p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">Prontos para abrir</h2>
                <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground h-7" onClick={() => navigate("/dashboard/cellar")}>
                  Ver adega <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>

              <div className="grid gap-1">
                {readyToDrink.length === 0 ? (
                  <div className="rounded-xl border border-border/20 bg-muted/8 py-7 text-center">
                    <GlassWater className="h-5 w-5 mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-[12px] font-semibold text-muted-foreground/45">Nenhum vinho em janela ideal</p>
                    <p className="text-[11px] text-muted-foreground/30 mt-1 max-w-[260px] mx-auto">Adicione vinhos com janela de consumo.</p>
                  </div>
                ) : (
                  readyToDrink.map((w) => (
                    <div key={w.id} className="flex items-center gap-2.5 rounded-xl border border-border/20 bg-background/40 px-3 py-2.5 transition-all duration-200 hover:bg-background/60 hover:shadow-sm">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/8 text-success shrink-0">
                        <GlassWater className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-foreground">{w.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[w.vintage, w.producer].filter(Boolean).join(" · ")} · {w.quantity} un.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 px-3 text-[11px] shrink-0"
                        onClick={() => handleOpenBottle(w.id, w.name)}
                        disabled={wineEvent.isPending}
                      >
                        Abrir
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* ─── Right Column ─── */}
          <div className="col-span-12 grid gap-2.5 lg:col-span-5">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
              <div className="card-depth p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">Alertas</h2>
                  <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground h-7" onClick={() => navigate("/dashboard/alerts")}>
                    Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="grid gap-px">
                  {[
                    { label: "Beber agora", value: drinkNow, tone: "text-success" },
                    { label: "Em guarda", value: inGuard, tone: "text-info" },
                    { label: "Beber em breve", value: pastPeak, tone: "text-warning" },
                  ].map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => navigate("/dashboard/alerts")}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-all duration-200 hover:bg-muted/10"
                    >
                      <span className="text-[12px] font-medium text-muted-foreground">{a.label}</span>
                      <span className={cn("text-lg font-bold tabular-nums tracking-[-0.02em]", a.value > 0 ? a.tone : "text-muted-foreground/15")}>{a.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
              <div className="chart-surface p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[12px] font-semibold text-foreground">Consumo</h2>
                  <span className="text-[10px] font-semibold text-foreground/50">
                    {consumption.length} total
                  </span>
                </div>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consumptionMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.12)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--foreground) / 0.65)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--foreground) / 0.45)" }} axisLine={false} tickLine={false} width={18} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(255,255,255,0.94)",
                          border: "1px solid rgba(255,255,255,0.22)",
                          borderRadius: 12,
                          fontSize: 11,
                          boxShadow: "0 8px 20px -8px rgba(44,20,31,0.12)",
                          backdropFilter: "blur(14px)",
                        }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--wine))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab="open" />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
      <DishToWineDialog open={dishToWineOpen} onOpenChange={setDishToWineOpen} />
      <WineListScannerDialog open={wineListScanOpen} onOpenChange={setWineListScanOpen} />
    </>
  );
}
