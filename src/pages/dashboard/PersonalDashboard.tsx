import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  GlassWater,
  Layers,
  Plus,
  Star,
  Upload,
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
import { useAuth } from "@/contexts/AuthContext";
import { useConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { useWineEvent, useWineMetrics } from "@/hooks/useWines";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
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
      { label: "Estoque baixo", value: `${lowStock}`, icon: AlertTriangle, urgent: lowStock > 0 },
    ],
    [drinkNow, lowStock, totalBottles, totalValue],
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
    if (lowStock > 0) items.push({ label: `${lowStock} rótulo${lowStock > 1 ? "s" : ""} com estoque baixo`, detail: "Considere repor", tone: "warning", action: () => navigate("/dashboard/alerts") });
    if (pastPeak > 0) items.push({ label: `${pastPeak} vinho${pastPeak > 1 ? "s" : ""} passaram do pico`, detail: "Atenção ao prazo", tone: "wine", action: () => navigate("/dashboard/alerts") });
    const lastConsumed = consumption.length > 0 ? consumption[0] : null;
    if (lastConsumed) {
      const days = Math.floor((Date.now() - new Date(lastConsumed.consumed_at).getTime()) / (1000 * 60 * 60 * 24));
      items.push({ label: `Último consumo há ${days} dia${days !== 1 ? "s" : ""}`, detail: lastConsumed.wine_name, tone: "wine" });
    }
    return items;
  }, [drinkNow, lowStock, pastPeak, consumption, navigate]);

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

      <div className="max-w-[1280px] space-y-6">
        {/* ─── Header ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-serif text-[28px] font-bold tracking-[-0.015em] text-foreground sm:text-[32px]">
                Olá, <span className="italic text-primary">{firstName}</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="primary" size="default" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar
              </Button>
              <Button variant="outline" size="default" onClick={() => setManageOpen(true)}>
                <Wine className="mr-1.5 h-3.5 w-3.5" /> Consumo
              </Button>
              <Button variant="ghost" size="default" onClick={() => setCsvOpen(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Importar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ─── KPI Strip ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-border/30 bg-card/80 p-5">
                  <Skeleton className="h-3 w-16 mb-4" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            ) : (
              kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-border/30 bg-card/80 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <kpi.icon className={cn("h-3.5 w-3.5", kpi.urgent ? "text-primary" : "text-muted-foreground/40")} />
                    <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{kpi.label}</p>
                  </div>
                  <p className={cn(
                    "font-serif text-[26px] font-bold tracking-[-0.02em] leading-none",
                    kpi.urgent ? "text-primary" : "text-foreground",
                  )}>
                    {kpi.value}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* ─── Priority Block ─── */}
        {priorityItems.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            <div className="rounded-xl border border-border/30 bg-card/80 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 mb-4">Hoje para decidir</p>
              <div className="grid gap-0.5">
                {priorityItems.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={item.action}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                      item.action ? "cursor-pointer hover:bg-muted/20" : "cursor-default",
                    )}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      item.tone === "success" && "bg-success",
                      item.tone === "warning" && "bg-warning",
                      item.tone === "wine" && "bg-primary",
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground">{item.label}</p>
                      <p className="text-[12px] text-muted-foreground/70 mt-0.5">{item.detail}</p>
                    </div>
                    {item.action && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/25 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-12 gap-4">
          {/* ─── Ready to Drink ─── */}
          <motion.div className="col-span-12 lg:col-span-7" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <div className="rounded-xl border border-border/30 bg-card/80 p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="font-serif text-[18px] font-bold tracking-[-0.01em] text-foreground">Prontos para abrir</h2>
                <Button variant="ghost" size="sm" className="text-[12px] text-muted-foreground" onClick={() => navigate("/dashboard/cellar")}>
                  Ver adega <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>

              <div className="grid gap-2">
                {readyToDrink.length === 0 ? (
                  <div className="rounded-lg border border-border/15 bg-muted/5 py-10 text-center">
                    <GlassWater className="h-5 w-5 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-[13px] font-medium text-muted-foreground/60">Nenhum vinho em janela ideal</p>
                    <p className="text-[12px] text-muted-foreground/40 mt-1.5 max-w-[280px] mx-auto leading-relaxed">Adicione vinhos com janela de consumo para ver sugestões aqui.</p>
                  </div>
                ) : (
                  readyToDrink.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 rounded-lg border border-border/15 bg-background/50 px-4 py-3.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/8 text-success shrink-0">
                        <GlassWater className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{w.name}</p>
                        <p className="truncate text-[12px] text-muted-foreground/70 mt-0.5">
                          {[w.vintage, w.producer].filter(Boolean).join(" · ")} · {w.quantity} un.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-4 text-[12px] shrink-0"
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
          <div className="col-span-12 grid gap-4 lg:col-span-5">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
              <div className="rounded-xl border border-border/30 bg-card/80 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-serif text-[18px] font-bold tracking-[-0.01em] text-foreground">Alertas</h2>
                  <Button variant="ghost" size="sm" className="text-[12px] text-muted-foreground" onClick={() => navigate("/dashboard/alerts")}>
                    Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="grid gap-0.5">
                  {[
                    { label: "Beber agora", value: drinkNow, tone: "text-success" },
                    { label: "Em guarda", value: inGuard, tone: "text-info" },
                    { label: "Passaram do pico", value: pastPeak, tone: "text-warning" },
                    { label: "Baixo estoque", value: lowStock, tone: "text-primary" },
                  ].map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => navigate("/dashboard/alerts")}
                      className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-muted/15"
                    >
                      <span className="text-[13px] text-muted-foreground">{a.label}</span>
                      <span className={cn("font-serif text-[22px] font-bold tabular-nums", a.value > 0 ? a.tone : "text-muted-foreground/25")}>{a.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
              <div className="rounded-xl border border-border/30 bg-card/80 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-serif text-[18px] font-bold tracking-[-0.01em] text-foreground">Consumo</h2>
                  <span className="text-[11px] font-medium text-muted-foreground/50">
                    {consumption.length} total
                  </span>
                </div>
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consumptionMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.25)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground)/0.4)" }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 10,
                          fontSize: 12,
                          boxShadow: "0 4px 12px -4px rgba(0,0,0,0.08)",
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
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
    </>
  );
}
