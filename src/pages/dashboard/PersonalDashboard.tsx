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
import { useQuery } from "@tanstack/react-query";
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

const fadeUp = {
  hidden: { opacity: 0, y: 10 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.035, duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
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
      { label: "Garrafas", value: `${totalBottles}`, icon: Layers },
      { label: "Valor estimado", value: totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }), icon: Star },
      { label: "Beber agora", value: `${drinkNow}`, icon: GlassWater },
      { label: "Estoque baixo", value: `${lowStock}`, icon: AlertTriangle },
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

      <div className="max-w-[1320px] space-y-3">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="glass-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Acervo pessoal</p>
                <h1 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-foreground sm:text-[34px]">
                  Olá, <span className="font-serif italic text-wine">{firstName}</span>. Vamos decidir com clareza.
                </h1>
                <p className="mt-3 max-w-[720px] text-[13px] font-medium leading-relaxed text-muted-foreground">
                  Sinais do seu acervo: janela ideal, risco de passar do pico e ações rápidas sem navegar.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" className="h-10 rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar vinho
                </Button>
                <Button variant="ghost" className="h-10 rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]" onClick={() => setManageOpen(true)}>
                  <Wine className="mr-2 h-4 w-4" /> Registrar consumo
                </Button>
                <Button variant="ghost" className="h-10 rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]" onClick={() => setCsvOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Importar acervo
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-2xl border border-black/[0.06] bg-white/70 p-3 shadow-sm">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-3 h-7 w-24" />
                  </div>
                ))
              ) : (
                kpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-2xl border border-black/[0.06] bg-white/70 p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-wine/10 text-wine ring-1 ring-black/[0.04]">
                        <kpi.icon className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{kpi.label}</p>
                    </div>
                    <p className="mt-2 text-[20px] font-black tracking-tight text-foreground">{kpi.value}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-12 gap-3">
          <motion.div className="col-span-12 lg:col-span-7" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <div className="glass-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Hoje</p>
                  <h2 className="mt-1 text-[16px] font-bold tracking-tight text-foreground">Prontos para abrir</h2>
                </div>
                <Button variant="ghost" className="h-9 rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]" onClick={() => navigate("/dashboard/cellar")}>
                  Ver adega
                </Button>
              </div>

              <div className="mt-3 grid gap-2">
                {readyToDrink.length === 0 ? (
                  <div className="rounded-2xl border border-black/[0.06] bg-white/70 p-4 text-[13px] font-medium text-muted-foreground">
                    Nenhum vinho na janela ideal agora.
                  </div>
                ) : (
                  readyToDrink.map((w) => (
                    <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/70 px-3 py-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 ring-1 ring-black/[0.04]">
                        <GlassWater className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-foreground">{w.name}</p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                          {[w.vintage, w.producer].filter(Boolean).join(" · ")} · {w.quantity} un.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        className="h-9 rounded-2xl text-[12px] font-black uppercase tracking-[0.12em]"
                        onClick={() => handleOpenBottle(w.id, w.name)}
                        disabled={wineEvent.isPending}
                      >
                        Abrir <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          <div className="col-span-12 grid gap-3 lg:col-span-5">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
              <div className="glass-card p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Alertas</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: "Beber agora", value: drinkNow, tone: "emerald" },
                    { label: "Em guarda", value: inGuard, tone: "blue" },
                    { label: "Passaram do pico", value: pastPeak, tone: "amber" },
                    { label: "Baixo estoque", value: lowStock, tone: "wine" },
                  ].map((a) => (
                    <Button
                      key={a.label}
                      type="button"
                      variant="ghost"
                      onClick={() => navigate("/dashboard/alerts")}
                      className="rounded-2xl border border-black/[0.06] bg-white/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-white/80"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{a.label}</p>
                      <p className="mt-1 text-[20px] font-black tracking-tight text-foreground">{a.value}</p>
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
              <div className="glass-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Consumo</p>
                    <h3 className="mt-1 text-[15px] font-bold tracking-tight text-foreground">Últimos 6 meses</h3>
                  </div>
                  <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-black text-muted-foreground">
                    {consumption.length}
                  </span>
                </div>
                <div className="mt-3 h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consumptionMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(23,20,29,0.6)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "rgba(23,20,29,0.45)" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(255,255,255,0.92)",
                          border: "1px solid rgba(0,0,0,0.06)",
                          borderRadius: 14,
                          fontSize: 12,
                          boxShadow: "0 16px 40px -28px rgba(15,15,20,0.65)",
                        }}
                      />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="hsl(var(--wine))" />
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
