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
  TrendingUp,
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
import { QuickActions } from "@/components/QuickActions";
import { DishToWineDialog } from "@/components/DishToWineDialog";
import { WineListScannerDialog } from "@/components/WineListScannerDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { useWineEvent, useWineMetrics } from "@/hooks/useWines";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 12 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
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

/* ── Glass card wrapper ── */
function GlassPanel({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[20px] p-6", className)}
      style={{
        background: "rgba(255, 255, 255, 0.78)",
        backdropFilter: "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        border: "1px solid rgba(255, 255, 255, 0.45)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 8px 32px -8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/* ── Section label ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-bold uppercase tracking-[0.10em] mb-4"
      style={{ color: "#7B7B7B" }}
    >
      {children}
    </p>
  );
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
      {
        label: "Valor estimado",
        value: totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
        icon: TrendingUp,
        urgent: false,
      },
      { label: "Beber agora", value: `${drinkNow}`, icon: GlassWater, urgent: drinkNow > 0 },
      { label: "Próximos do pico", value: `${pastPeak}`, icon: Clock, urgent: pastPeak > 0 },
    ],
    [drinkNow, totalBottles, totalValue, pastPeak],
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
    if (drinkNow > 0)
      items.push({
        label: `${drinkNow} vinho${drinkNow > 1 ? "s" : ""} em janela ideal`,
        detail: "Hora de abrir",
        tone: "success",
        action: () => navigate("/dashboard/cellar"),
      });

    if (pastPeak > 0)
      items.push({
        label: `${pastPeak} vinho${pastPeak > 1 ? "s" : ""} — beber em breve`,
        detail: "Pode ter passado da janela ideal",
        tone: "wine",
        action: () => navigate("/dashboard/alerts"),
      });

    const lastConsumed = consumption.length > 0 ? consumption[0] : null;
    if (lastConsumed) {
      const days = Math.floor((Date.now() - new Date(lastConsumed.consumed_at).getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        label: `Último consumo há ${days} dia${days !== 1 ? "s" : ""}`,
        detail: lastConsumed.wine_name,
        tone: "wine",
      });
    }
    return items;
  }, [drinkNow, pastPeak, consumption, navigate]);

  /* ── Last 3 consumptions ── */
  const recentConsumptions = useMemo(() => consumption.slice(0, 3), [consumption]);

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

      <div className="max-w-[1280px] space-y-5">
        {/* ─── Header ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1
                className="text-[26px] sm:text-[32px] font-bold tracking-[-0.03em] leading-[1.1]"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                Olá,{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(198,167,104,0.85))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {firstName}
                </span>
              </h1>
              <p className="text-[14px] mt-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                Sua adega pessoal — sempre atualizada.
              </p>
            </div>
            <QuickActions
              variant="personal"
              layout="inline"
              onAddWine={() => setAddOpen(true)}
              onRegisterConsumption={() => setManageOpen(true)}
              onHarmonize={() => setDishToWineOpen(true)}
              onAnalyzeList={() => setWineListScanOpen(true)}
            />
          </div>
        </motion.div>

        {/* ─── KPI Strip ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isLoading
              ? [1, 2, 3, 4].map((i) => (
                  <GlassPanel key={i} className="p-5">
                    <Skeleton className="h-3.5 w-20 mb-3 rounded-lg" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </GlassPanel>
                ))
              : kpis.map((kpi) => (
                  <GlassPanel key={kpi.label} className="p-5 group">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={cn(
                          "flex items-center justify-center h-8 w-8 rounded-xl transition-colors duration-200",
                          kpi.urgent ? "bg-[rgba(123,30,43,0.10)]" : "bg-[rgba(0,0,0,0.04)]",
                        )}
                      >
                        <kpi.icon
                          className={cn("h-4 w-4", kpi.urgent ? "text-primary" : "text-[#888]")}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: "#888" }}>
                      {kpi.label}
                    </p>
                    <p
                      className={cn(
                        "text-[28px] font-bold tracking-[-0.03em] leading-none tabular-nums",
                        kpi.urgent ? "text-primary" : "",
                      )}
                      style={kpi.urgent ? {} : { color: "#111" }}
                    >
                      {kpi.value}
                    </p>
                  </GlassPanel>
                ))}
          </div>
        </motion.div>

        {/* ─── Priority Block: "Hoje para decidir" ─── */}
        {priorityItems.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            <GlassPanel>
              <SectionLabel>Hoje para decidir</SectionLabel>
              <div className="grid gap-1">
                {priorityItems.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={item.action}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-all duration-200",
                      item.action ? "cursor-pointer hover:bg-[rgba(0,0,0,0.03)]" : "cursor-default",
                    )}
                  >
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0 ring-4",
                        item.tone === "success" && "bg-[hsl(var(--success))] ring-[hsl(var(--success)/0.15)]",
                        item.tone === "warning" && "bg-[hsl(var(--warning))] ring-[hsl(var(--warning)/0.15)]",
                        item.tone === "wine" && "bg-primary ring-primary/15",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold" style={{ color: "#111" }}>
                        {item.label}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#777" }}>
                        {item.detail}
                      </p>
                    </div>
                    {item.action && <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "#ccc" }} />}
                  </button>
                ))}
              </div>
            </GlassPanel>
          </motion.div>
        )}

        <div className="grid grid-cols-12 gap-4">
          {/* ─── Ready to Drink ─── */}
          <motion.div className="col-span-12 lg:col-span-7" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
            <GlassPanel>
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="text-[18px] font-bold tracking-[-0.02em]" style={{ color: "#111" }}>
                  Prontos para abrir
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[13px]"
                  style={{ color: "#888" }}
                  onClick={() => navigate("/dashboard/cellar")}
                >
                  Ver adega <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-2">
                {readyToDrink.length === 0 ? (
                  <div
                    className="rounded-2xl py-10 text-center"
                    style={{
                      background: "rgba(0,0,0,0.02)",
                      border: "1px dashed rgba(0,0,0,0.08)",
                    }}
                  >
                    <GlassWater className="h-6 w-6 mx-auto mb-3" style={{ color: "rgba(0,0,0,0.15)" }} />
                    <p className="text-[14px] font-semibold" style={{ color: "#999" }}>
                      Nenhum vinho em janela ideal
                    </p>
                    <p className="text-[13px] mt-1.5 max-w-[300px] mx-auto leading-relaxed" style={{ color: "#bbb" }}>
                      Adicione vinhos com janela de consumo para ver sugestões aqui.
                    </p>
                  </div>
                ) : (
                  readyToDrink.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200 hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.08)]"
                      style={{
                        background: "rgba(255,255,255,0.55)",
                        border: "1px solid rgba(255,255,255,0.50)",
                      }}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                        style={{ background: "rgba(56,142,60,0.08)" }}
                      >
                        <GlassWater className="h-4.5 w-4.5" style={{ color: "hsl(var(--success))" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold" style={{ color: "#111" }}>
                          {w.name}
                        </p>
                        <p className="truncate text-[13px] mt-0.5" style={{ color: "#888" }}>
                          {[w.vintage, w.producer].filter(Boolean).join(" · ")} · {w.quantity} un.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-9 px-5 text-[12px] shrink-0 rounded-xl"
                        onClick={() => handleOpenBottle(w.id, w.name)}
                        disabled={wineEvent.isPending}
                      >
                        Consumir
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </motion.div>

          {/* ─── Right Column ─── */}
          <div className="col-span-12 grid gap-4 lg:col-span-5">
            {/* Alerts */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
              <GlassPanel>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-bold tracking-[-0.02em]" style={{ color: "#111" }}>
                    Alertas
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[13px]"
                    style={{ color: "#888" }}
                    onClick={() => navigate("/dashboard/alerts")}
                  >
                    Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid gap-1">
                  {[
                    { label: "Beber agora", value: drinkNow, color: "hsl(var(--success))" },
                    { label: "Em guarda", value: inGuard, color: "hsl(var(--info))" },
                    { label: "Beber em breve", value: pastPeak, color: "hsl(var(--warning))" },
                  ].map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => navigate("/dashboard/alerts")}
                      className="flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-200 hover:bg-[rgba(0,0,0,0.02)]"
                    >
                      <span className="text-[14px] font-medium" style={{ color: "#555" }}>
                        {a.label}
                      </span>
                      <span
                        className="text-[24px] font-bold tabular-nums tracking-[-0.02em]"
                        style={{ color: a.value > 0 ? a.color : "rgba(0,0,0,0.12)" }}
                      >
                        {a.value}
                      </span>
                    </button>
                  ))}
                </div>
              </GlassPanel>
            </motion.div>

            {/* Consumption chart */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
              <GlassPanel>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[18px] font-bold tracking-[-0.02em]" style={{ color: "#111" }}>
                    Consumo
                  </h2>
                  <span className="text-[12px] font-semibold" style={{ color: "#999" }}>
                    {consumption.length} total
                  </span>
                </div>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consumptionMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#888", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "rgba(0,0,0,0.25)" }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(255,255,255,0.90)",
                          backdropFilter: "blur(16px)",
                          WebkitBackdropFilter: "blur(16px)",
                          border: "1px solid rgba(255,255,255,0.50)",
                          borderRadius: 14,
                          fontSize: 13,
                          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.15)",
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#7B1E2B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassPanel>
            </motion.div>
          </div>
        </div>

        {/* ─── Recent Consumptions (Experiência) ─── */}
        {recentConsumptions.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
            <GlassPanel>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-bold tracking-[-0.02em]" style={{ color: "#111" }}>
                  Últimos consumos
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[13px]"
                  style={{ color: "#888" }}
                  onClick={() => navigate("/dashboard/consumption")}
                >
                  Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid gap-2">
                {recentConsumptions.map((c) => {
                  const d = new Date(c.consumed_at);
                  const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-4 rounded-2xl px-4 py-3.5"
                      style={{
                        background: "rgba(255,255,255,0.50)",
                        border: "1px solid rgba(255,255,255,0.45)",
                      }}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                        style={{ background: "rgba(123,30,43,0.08)" }}
                      >
                        <Wine className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold" style={{ color: "#111" }}>
                          {c.wine_name}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: "#888" }}>
                          {[c.producer, c.vintage].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-semibold tabular-nums" style={{ color: "#555" }}>
                          {dateStr}
                        </p>
                        {c.rating && (
                          <p className="text-[11px] mt-0.5" style={{ color: "#C6A768" }}>
                            {"★".repeat(Math.round(c.rating))}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* ─── Insight Card ─── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <div
            className="rounded-[20px] p-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, hsl(var(--forest)), hsl(var(--forest-muted)))",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Subtle glow */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: "linear-gradient(to right, transparent, rgba(198,167,104,0.2), transparent)",
              }}
            />
            <div className="relative z-10">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
                style={{ color: "rgba(198,167,104,0.70)" }}
              >
                Insight
              </p>
              <p
                className="text-[15px] font-medium leading-relaxed max-w-xl"
                style={{ color: "rgba(232,228,219,0.80)" }}
              >
                {totalBottles === 0
                  ? "Adicione seus primeiros vinhos e comece a construir sua adega inteligente."
                  : drinkNow > 0
                    ? `Você tem ${drinkNow} garrafa${drinkNow > 1 ? "s" : ""} na janela ideal. Este é o momento perfeito para uma experiência memorável.`
                    : `Sua adega tem ${totalBottles} garrafa${totalBottles > 1 ? "s" : ""}. Continue adicionando para receber sugestões cada vez mais precisas.`}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab="open" />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
      <DishToWineDialog open={dishToWineOpen} onOpenChange={setDishToWineOpen} />
      <WineListScannerDialog open={wineListScanOpen} onOpenChange={setWineListScanOpen} />
    </>
  );
}
