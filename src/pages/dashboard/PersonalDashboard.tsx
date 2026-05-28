// Visão Geral — perfil Pessoal
// Design "Editorial" fiel ao design-reference/Adega_Pessoal (variant-editorial.jsx)
// Dados reais via Supabase (useWines).

import { useMemo, useState } from "react";
import {
  CircleDollarSign,
  Clock,
  GlassWater,
  Plus,
  ShieldCheck,
  Sparkles,
  Wine as WineIcon,
} from "@/icons/lucide";

import { AddWineDialog } from "@/components/AddWineDialog";
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { DishToWineDialog } from "@/components/DishToWineDialog";
import {
  Kicker,
  classifyDrinkWindow,
  resolveSuggestedDrinkWindow,
} from "@/components/editorial/EditorialPrimitives";
import { useAuth } from "@/contexts/AuthContext";
import { useWineMetrics } from "@/hooks/useWines";
import { useConsumption } from "@/hooks/useConsumption";

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export default function PersonalDashboard() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";

  const { totalBottles, totalValue, drinkNow, lowStock, wines } = useWineMetrics();
  const { data: consumptionEntries = [] } = useConsumption();

  const [addOpen, setAddOpen] = useState(false);
  const [dishToWineOpen, setDishToWineOpen] = useState(false);
  const [pairingInitialWineId, setPairingInitialWineId] = useState<string | null>(null);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [preSelectedWine, setPreSelectedWine] = useState<{
    id: string; name: string; producer?: string | null; country?: string | null;
    region?: string | null; grape?: string | null; style?: string | null; vintage?: number | null;
  } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("sommelyx_onboarding_done_personal"),
  );

  const currentYear = new Date().getFullYear();

  const inGuard = useMemo(
    () => wines.filter((w) => w.quantity > 0 && w.drink_from && currentYear < w.drink_from).length,
    [wines, currentYear],
  );

  const insightWine = useMemo(() => {
    const inStock = wines.filter((w) => w.quantity > 0);
    if (inStock.length === 0) return null;
    const todayIndex = getDayOfYear(new Date());
    const prioritized = inStock
      .map((w) => {
        const drinkWindow = resolveSuggestedDrinkWindow(w);
        const classification = classifyDrinkWindow({
          current: currentYear,
          from: drinkWindow.from,
          until: drinkWindow.until,
        });
        const priority = classification.status === "now" ? 0 : classification.status === "soon" ? 1 : 2;
        return { wine: w, priority, until: drinkWindow.until };
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.until !== b.until) return a.until - b.until;
        const aValue = Number(a.wine.current_value ?? a.wine.purchase_price ?? 0);
        const bValue = Number(b.wine.current_value ?? b.wine.purchase_price ?? 0);
        return bValue - aValue;
      })
      .map(({ wine }) => wine);

    const preferred = prioritized.length > 0 ? prioritized : [...inStock].sort(
      (a, b) => (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0),
    );
    return preferred[todayIndex % preferred.length] ?? null;
  }, [wines, currentYear]);

  const insightReason = insightWine
    ? (() => {
        const drinkWindow = resolveSuggestedDrinkWindow(insightWine);
        const classification = classifyDrinkWindow({
          current: currentYear,
          from: drinkWindow.from,
          until: drinkWindow.until,
        });
        if (classification.status === "now") return "Abra este rótulo hoje";
        if (classification.status === "soon") return "Vale acompanhar a janela de consumo";
        return "Rótulo em destaque da sua adega";
      })()
    : "Cadastre algumas garrafas para receber sugestões diárias.";

  const readyWines = useMemo(() => {
    return wines
      .filter((wine) => wine.quantity > 0)
      .map((wine) => {
        const drinkWindow = resolveSuggestedDrinkWindow(wine);
        const classification = classifyDrinkWindow({
          current: currentYear,
          from: drinkWindow.from,
          until: drinkWindow.until,
        });
        const priority = classification.status === "now" ? 0 : classification.status === "soon" ? 1 : 2;
        const value = Number(wine.current_value ?? wine.purchase_price ?? 0);
        return { wine, classification, priority, value };
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (b.value !== a.value) return b.value - a.value;
        return a.wine.name.localeCompare(b.wine.name, "pt-BR");
      })
      .slice(0, 3);
  }, [wines, currentYear]);

  const recentToasts = useMemo(() => consumptionEntries.slice(0, 3), [consumptionEntries]);

  const formattedTotalValue = totalValue > 0
    ? totalValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      })
    : "R$ 0";

  const formatWineMeta = (wine: {
    producer?: string | null;
    region?: string | null;
    country?: string | null;
    vintage?: number | null;
  }) => [wine.producer, wine.vintage, wine.region ?? wine.country].filter(Boolean).join(" · ");

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "sem data";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <>
      {showOnboarding && (
        <OnboardingWizard
          profileType="personal"
          onComplete={() => {
            localStorage.setItem("sommelyx_onboarding_done_personal", "true");
            setShowOnboarding(false);
          }}
        />
      )}

      <div className="dashboard-root editorial-page premium-home-page !px-0">
        <section>
          <div className="overview-greeting-wrap flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="overview-date overview-greeting-eyebrow">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <h1 className="overview-greeting">
                Olá,{" "}
                <span className="name-accent">{firstName}</span>
              </h1>
            </div>
            <div className="dashboard-quick-actions flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <button type="button" className="editorial-btn-primary btn-adicionar-wine-primary" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                <span>Adicionar vinho</span>
              </button>
              <button
                type="button"
                className="editorial-btn-ghost btn-adicionar-consumo-secondary"
                onClick={() => {
                  setPreSelectedWine(null);
                  setConsumptionOpen(true);
                }}
              >
                <GlassWater className="h-4 w-4" />
                <span>Adicionar consumo</span>
              </button>
            </div>
          </div>

          <div className="overview-command-grid">
            <div className="overview-main-column">
              <button
                type="button"
                className="daily-insight-card daily-insight-card-mobile group flex items-start gap-3 text-left"
                disabled={!insightWine}
                onClick={() => {
                  if (!insightWine) return;
                  setPairingInitialWineId(insightWine.id);
                  setDishToWineOpen(true);
                }}
              >
                <div className="daily-insight-icon">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <Kicker>Insight do dia</Kicker>
                  {insightWine ? (
                    <>
                      <p className="daily-insight-action">{insightReason}</p>
                      <p className="daily-insight-name">{insightWine.name}</p>
                      <p className="daily-insight-copy">
                        {formatWineMeta(insightWine) || "Boa escolha para acompanhar sua próxima refeição."}
                      </p>
                    </>
                  ) : (
                    <p className="daily-insight-empty">{insightReason}</p>
                  )}
                </div>
              </button>

              <section className="overview-panel overview-ready-panel">
                <div className="overview-panel-head">
                  <div>
                    <p className="overview-panel-kicker">Próximas garrafas</p>
                    <h2>Para abrir com calma</h2>
                  </div>
                  <span>{readyWines.length} rótulos</span>
                </div>
                <div className="overview-ready-list">
                  {readyWines.length > 0 ? readyWines.map(({ wine, classification }) => (
                    <button
                      type="button"
                      key={wine.id}
                      className="overview-wine-row"
                      onClick={() => {
                        setPreSelectedWine(wine);
                        setConsumptionOpen(true);
                      }}
                    >
                      <span className="overview-wine-mark"><WineIcon className="h-4 w-4" /></span>
                      <span className="overview-wine-copy">
                        <strong>{wine.name}</strong>
                        <small>{formatWineMeta(wine) || wine.style || "Rótulo da adega"}</small>
                      </span>
                      <span className="overview-wine-status">{classification.label}</span>
                    </button>
                  )) : (
                    <div className="overview-empty-line">Cadastre garrafas para acompanhar o momento de abrir.</div>
                  )}
                </div>
              </section>
            </div>

            <aside className="overview-side-column">
              <div className="home-summary-strip overview-summary-grid">
                {[
                  { label: "garrafas", value: totalBottles.toLocaleString("pt-BR"), icon: WineIcon },
                  { label: "beber agora", value: String(drinkNow), icon: GlassWater },
                  { label: "em guarda", value: String(inGuard), icon: ShieldCheck },
                  { label: "valor estimado", value: formattedTotalValue, icon: CircleDollarSign },
                ].map((metric) => (
                  <div key={metric.label} className="home-summary-item">
                    <metric.icon className="home-summary-icon" />
                    <span className="home-summary-value">{metric.value}</span>
                    <span className="home-summary-label">{metric.label}</span>
                  </div>
                ))}
              </div>

              <section className="overview-panel overview-toast-panel">
                <div className="overview-panel-head">
                  <div>
                    <p className="overview-panel-kicker">Últimos brindes</p>
                    <h2>Consumo recente</h2>
                  </div>
                </div>
                <div className="overview-toast-list">
                  {recentToasts.length > 0 ? recentToasts.map((entry) => (
                    <div key={entry.id} className="overview-toast-row">
                      <span className="overview-toast-date">{formatDate(entry.consumed_at)}</span>
                      <span className="overview-toast-copy">
                        <strong>{entry.wine_name}</strong>
                        <small>{[entry.producer, entry.vintage].filter(Boolean).join(" · ") || (entry.source === "external" ? "Consumo externo" : "Da adega")}</small>
                      </span>
                      <span className="overview-toast-rating">{entry.rating ? `${entry.rating.toFixed(1)}` : "—"}</span>
                    </div>
                  )) : (
                    <div className="overview-empty-line">Registre consumos para formar seu histórico.</div>
                  )}
                </div>
              </section>

              <section className="overview-alert-strip">
                <Clock className="h-4 w-4" />
                <span>{lowStock > 0 ? `${lowStock} rótulos com poucas unidades.` : "Adega sem alertas críticos de estoque."}</span>
              </section>
            </aside>
          </div>
        </section>
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <DishToWineDialog
        open={dishToWineOpen}
        onOpenChange={(v) => {
          setDishToWineOpen(v);
          if (!v) setPairingInitialWineId(null);
        }}
        initialWineId={pairingInitialWineId}
        initialWine={insightWine}
      />
      <AddConsumptionDialog
        open={consumptionOpen}
        onOpenChange={(v) => {
          setConsumptionOpen(v);
          if (!v) setPreSelectedWine(null);
        }}
        preSelectedWine={preSelectedWine}
      />
    </>
  );
}
