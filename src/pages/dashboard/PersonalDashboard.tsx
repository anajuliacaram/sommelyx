import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wine, GlassWater, Plus, AlertTriangle, ArrowDownRight,
  Clock, MapPin, Upload, Star, Grape, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { WineMesh } from "@/components/WineMesh";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { useWineMetrics, useWineEvent } from "@/hooks/useWines";
import { useNavigate } from "react-router-dom";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { PersonalizedNotifications } from "@/components/PersonalizedNotifications";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { DashboardExecutiveSummary } from "@/components/DashboardExecutiveSummary";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const currentYear = new Date().getFullYear();
const PIE_COLORS = ["#8F2D56", "#C44569", "#E07A5F", "#C9A86A", "#6B7280", "#22c55e"];

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";
  const { totalBottles, drinkNow, recentCount, lowStock, wines, isLoading } = useWineMetrics();
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"add" | "open" | "exit">("open");
  const wineEvent = useWineEvent();
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("sommelyx_onboarding_done_personal"));

  const suggestions = useMemo(() => {
    return wines
      .filter(w => w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until && w.quantity > 0)
      .slice(0, 4);
  }, [wines]);

  const drinkWindowData = useMemo(() => {
    const late = wines.filter(w => w.drink_until && currentYear > w.drink_until && w.quantity > 0).length;
    const now = wines.filter(w => w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until && w.quantity > 0).length;
    const future = wines.filter(w => w.drink_from && currentYear < w.drink_from && w.quantity > 0).length;
    return [
      { name: "Atrasados", value: late, color: "#E07A5F" },
      { name: "Agora", value: now, color: "#22c55e" },
      { name: "Futuro", value: future, color: "#8F2D56" },
    ].filter(d => d.value > 0);
  }, [wines]);

  const compositionData = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach(w => {
      const key = w.style || "Outro";
      map[key] = (map[key] || 0) + w.quantity;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [wines]);

  const countryData = useMemo(() => {
    const map: Record<string, number> = {};
    wines.forEach(w => { const key = w.country || "Outro"; map[key] = (map[key] || 0) + w.quantity; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [wines]);

  const recentWines = wines
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const inGuard = wines.filter(w => w.drink_from && currentYear < w.drink_from && w.quantity > 0).length;
  const pastPeak = wines.filter(w => w.drink_until && currentYear > w.drink_until && w.quantity > 0).length;
  const noLocation = wines.filter(w => w.quantity > 0 && !w.cellar_location).length;

  const alerts = [
    ...(drinkNow > 0 ? [{ label: "Beber agora", count: drinkNow, icon: GlassWater, color: "#22c55e", bg: "rgba(34,197,94,0.07)" }] : []),
    ...(pastPeak > 0 ? [{ label: "Passaram do pico", count: pastPeak, icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.07)" }] : []),
    ...(lowStock > 0 ? [{ label: "Estoque baixo", count: lowStock, icon: ArrowDownRight, color: "#E07A5F", bg: "rgba(224,122,95,0.07)" }] : []),
    ...(noLocation > 0 ? [{ label: "Sem localização", count: noLocation, icon: MapPin, color: "#6B7280", bg: "rgba(107,114,128,0.07)" }] : []),
  ];

  // 4 KPIs: Garrafas, Beber agora, Em guarda, Consumo recente
  const metrics = [
    { label: "Garrafas", value: totalBottles.toString(), icon: Wine, color: "#8F2D56", badge: recentCount > 0 ? `+${recentCount}` : undefined, onClick: () => navigate("/dashboard/cellar") },
    { label: "Beber agora", value: drinkNow.toString(), icon: GlassWater, color: "#22c55e", onClick: () => navigate("/dashboard/cellar") },
    { label: "Em guarda", value: inGuard.toString(), icon: Clock, color: "#3b82f6", onClick: () => navigate("/dashboard/cellar") },
    { label: "Consumo recente", value: recentCount.toString(), icon: Star, color: "#C44569" },
  ];

  const handleOpenBottle = async (wineId: string, wineName: string) => {
    try {
      await wineEvent.mutateAsync({ wineId, eventType: "open", quantity: 1 });
      toast({ title: `🍷 "${wineName}" aberto!`, description: "Saída registrada com sucesso." });
    } catch {
      toast({ title: "Erro ao registrar abertura", variant: "destructive" });
    }
  };

  return (
    <>
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard profileType="personal" onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>
    <div className="space-y-5 max-w-[1200px] relative">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <DashboardExecutiveSummary
          eyebrow="Acervo Pessoal"
          title={`Ola, ${firstName}. Sua adega agora fala com mais clareza.`}
          description="Centralize consumo, guarda e proximos movimentos em uma experiencia mais elegante, orientada a contexto e pronta para decisoes rapidas."
          badges={[
            `${totalBottles} garrafas ativas`,
            `${suggestions.length} prontas para abrir`,
            `${alerts.length} frentes de atencao`,
          ]}
          metrics={[
            {
              label: "Prontas agora",
              value: drinkNow.toString(),
              detail: "Rotulos que merecem prioridade na sua agenda de consumo.",
              icon: GlassWater,
              tone: "emerald",
            },
            {
              label: "Em guarda",
              value: inGuard.toString(),
              detail: "Garrafas que pedem paciencia antes da melhor janela.",
              icon: Clock,
              tone: "wine",
            },
            {
              label: "Sem posicao",
              value: noLocation.toString(),
              detail: "Itens que ainda precisam de endereco claro na adega.",
              icon: MapPin,
              tone: "slate",
            },
          ]}
          actions={[
            { label: "Adicionar vinho", onClick: () => setAddOpen(true), icon: Plus, variant: "premium" },
            { label: "Importar acervo", onClick: () => setCsvOpen(true), icon: Upload, variant: "outline" },
          ]}
        />
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl shimmer-premium" />
              <div className="h-8 w-16 rounded shimmer-premium" />
              <div className="h-3 w-20 rounded shimmer-premium" />
            </div>
          ))
        ) : (
          metrics.map((m, i) => (
            <motion.div
              key={m.label}
              className="glass-card p-5 group cursor-pointer border border-white/5 ring-1 ring-black/[0.03]"
              onClick={m.onClick}
              initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
              whileHover={{ y: -3, boxShadow: "0 16px 32px -10px rgba(140,32,68,0.12)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${m.color}14` }}>
                  <m.icon className="h-5 w-5" style={{ color: m.color }} />
                </div>
                {m.badge && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: m.color }}>
                    {m.badge}
                  </span>
                )}
              </div>
              <p className="text-3xl lg:text-4xl font-black font-sans tracking-tight text-foreground">{m.value}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{m.label}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Notifications */}
      {wines.length > 0 && <PersonalizedNotifications wines={wines} />}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT (3/5) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Ready to drink */}
          {suggestions.length > 0 && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold font-sans text-foreground">🍷 Prontos para abrir</h2>
                  <p className="text-xs text-muted-foreground font-medium">Na janela ideal de consumo</p>
                </div>
                <button className="text-xs font-semibold text-primary hover:underline" onClick={() => navigate("/dashboard/cellar")}>Ver todos →</button>
              </div>
              <div className="space-y-2">
                {suggestions.map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary/[0.02] transition-colors" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.08)" }}>
                      <GlassWater className="h-4 w-4" style={{ color: "#22c55e" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{w.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">{[w.vintage, w.producer].filter(Boolean).join(" · ")} · {w.quantity} un.</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-3 shrink-0 hover:bg-green-50 hover:border-green-200 hover:text-green-700 font-semibold" onClick={() => handleOpenBottle(w.id, w.name)} disabled={wineEvent.isPending}>
                      Abrir
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
              <h2 className="text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Atenção</h2>
              <div className="grid grid-cols-2 gap-3">
                {alerts.map(a => (
                  <div key={a.label} className="glass-card p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/dashboard/alerts")}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: a.bg }}>
                      <a.icon className="h-4 w-4" style={{ color: a.color }} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-foreground">{a.count}</p>
                      <p className="text-xs font-semibold" style={{ color: a.color }}>{a.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent wines */}
          {recentWines.length > 0 && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> Adicionados recentemente
                </h2>
                <button className="text-xs font-semibold text-primary hover:underline" onClick={() => navigate("/dashboard/cellar")}>Ver todos →</button>
              </div>
              <div className="glass-card overflow-hidden hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 text-muted-foreground">Vinho</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 text-muted-foreground">Estilo</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 text-muted-foreground">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentWines.map((w, i) => (
                      <tr key={w.id} className="hover:bg-black/[0.015] cursor-pointer" style={{ borderBottom: i < recentWines.length - 1 ? "1px solid rgba(0,0,0,0.03)" : "none" }} onClick={() => navigate("/dashboard/cellar")}>
                        <td className="px-3 py-2.5">
                          <p className="text-sm font-semibold truncate max-w-[180px] text-foreground">{w.name}</p>
                          <p className="text-xs text-muted-foreground font-medium">{w.producer}{w.vintage ? ` · ${w.vintage}` : ""}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(143,45,86,0.06)", color: "#8F2D56" }}>{w.style || "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-sm font-bold text-foreground">{w.quantity}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 sm:hidden">
                {recentWines.map(w => (
                  <div key={w.id} className="glass-card p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate("/dashboard/cellar")}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(143,45,86,0.06)" }}>
                      <Wine className="h-4 w-4" style={{ color: "#8F2D56" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{w.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">{w.producer}{w.vintage ? ` · ${w.vintage}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-foreground">{w.quantity}</span>
                      <p className="text-[10px] text-muted-foreground">un.</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT (2/5) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Drink Window Chart */}
          {totalBottles > 0 && drinkWindowData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
              <h3 className="text-sm font-bold font-sans text-foreground mb-0.5">Janela de Consumo</h3>
              <p className="text-xs text-muted-foreground font-medium mb-3">Quando cada garrafa está pronta</p>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={drinkWindowData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={3} dataKey="value">
                    {drinkWindowData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8, fontSize: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {drinkWindowData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs font-medium text-muted-foreground">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* By style */}
          {totalBottles > 0 && compositionData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
              <div className="flex items-center gap-2 mb-3">
                <Grape className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-bold font-sans text-foreground">Por estilo</h3>
              </div>
              <div className="space-y-2.5">
                {compositionData.map((d, i) => {
                  const pct = totalBottles > 0 ? Math.round((d.value / totalBottles) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2.5">
                      <span className="text-xs font-medium w-20 truncate text-muted-foreground">{d.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/[0.04]">
                        <motion.div className="h-full rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.06, duration: 0.4, ease: "easeOut" }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right text-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* By country */}
          {totalBottles > 0 && countryData.length > 0 && (
            <motion.div className="glass-card p-5" initial="hidden" animate="visible" variants={fadeUp} custom={7}>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-bold font-sans text-foreground">Por país</h3>
              </div>
              <div className="space-y-2.5">
                {countryData.map((d, i) => {
                  const pct = totalBottles > 0 ? Math.round((d.value / totalBottles) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2.5">
                      <span className="text-xs font-medium w-20 truncate text-muted-foreground">{d.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/[0.04]">
                        <motion.div className="h-full rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.06, duration: 0.4, ease: "easeOut" }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right text-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {totalBottles === 0 && (
        <motion.div
          className="glass-card p-12 text-center relative overflow-hidden flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at center, rgba(140,32,68,0.06) 0%, transparent 70%)" }} />
          <WineMesh variant="empty-state" />
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6 relative"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-xl border border-white/40 shadow-premium" />
              <div className="absolute inset-0 rounded-full gradient-wine opacity-10" />
              <Wine className="h-7 w-7 text-primary relative z-10" />
            </motion.div>
            <h3 className="text-2xl font-serif font-bold mb-2 tracking-tight text-foreground">Sua coleção começa aqui</h3>
            <p className="text-sm mb-4 max-w-sm mx-auto font-medium leading-relaxed text-muted-foreground">
              Adicione seu primeiro vinho e saiba exatamente quando abrir cada garrafa.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 text-xs text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5"><Wine className="h-3.5 w-3.5 text-primary" /> Cadastro manual</span>
              <span className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5 text-primary" /> Importação CSV</span>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="premium" size="sm" onClick={() => setAddOpen(true)} className="h-11 px-7 text-sm font-bold">
                <Plus className="h-4 w-4 mr-1.5" /> Começar minha adega
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)} className="h-11 px-5 text-sm font-bold">
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Importar lista
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* FAB */}
      <motion.button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center text-white cursor-pointer"
        style={{ background: "linear-gradient(135deg, #8F2D56, #C44569)", boxShadow: "0 6px 20px rgba(143,45,86,0.3)" }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 15 }}
      >
        <Plus className="h-4.5 w-4.5" />
      </motion.button>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} defaultTab={manageTab} />
      <ImportCsvDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </div>
    </>
  );
}
