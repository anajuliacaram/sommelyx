// Visão Geral — perfil Pessoal
// Design "Editorial" fiel ao design-reference/Adega_Pessoal (variant-editorial.jsx)
// Dados reais via Supabase (useWines).

import { useMemo, useState } from "react";
import {
  GlassWater,
  Plus,
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

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export default function PersonalDashboard() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";

  const { totalBottles, drinkNow, wines } = useWineMetrics();

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

          <button
            type="button"
            className="daily-insight-card daily-insight-card-mobile group flex w-full items-start gap-3 text-left"
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
                    Boa escolha para acompanhar sua próxima refeição.
                  </p>
                </>
              ) : (
                <p className="daily-insight-empty">{insightReason}</p>
              )}
            </div>
          </button>

          <div className="home-summary-strip">
            {[
              { label: "garrafas", value: totalBottles.toLocaleString("pt-BR"), icon: WineIcon },
              { label: "beber agora", value: String(drinkNow), icon: GlassWater },
              { label: "em guarda", value: String(inGuard), icon: Sparkles },
            ].map((metric) => (
              <div key={metric.label} className="home-summary-item">
                <metric.icon className="home-summary-icon" />
                <span className="home-summary-value">{metric.value}</span>
                <span className="home-summary-label">{metric.label}</span>
              </div>
            ))}
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
