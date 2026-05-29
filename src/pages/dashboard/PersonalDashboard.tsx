// Visão Geral — perfil Pessoal
// Design "Editorial" fiel ao design-reference/Adega_Pessoal (variant-editorial.jsx)
// Dados reais via Supabase (useWines).

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock,
  GlassWater,
  Plus,
  Sparkles,
  Wine as WineIcon,
} from "@/icons/lucide";

import { AddWineDialog } from "@/components/AddWineDialog";
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { DishToWineDialog } from "@/components/DishToWineDialog";
import { WineListScannerDialog } from "@/components/WineListScannerDialog";
import { WineLabelPreview } from "@/components/WineLabelPreview";
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
  const [wineListOpen, setWineListOpen] = useState(false);
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
        return { wine, classification, drinkWindow, priority, value };
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

  const insightMeta = insightWine ? formatWineMeta(insightWine) : "";

  const insightWindow = insightWine ? resolveSuggestedDrinkWindow(insightWine) : null;
  const insightWindowLabel = insightWindow
    ? insightWindow.from === insightWindow.until
      ? `${insightWindow.from}`
      : `${insightWindow.from}-${insightWindow.until}`
    : "";

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

      <div className="dashboard-root editorial-page home-rebuild-page sx-v2-page-shell !px-0">
        <section className="sx-v2-content-rail home-rebuild-rail">
          <div className="home-rebuild-header">
            <div className="home-rebuild-greeting">
              <p className="home-rebuild-date sx-v2-kicker">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <h1 className="home-rebuild-title sx-v2-display">
                Olá,{" "}
                <span className="home-rebuild-name">{firstName}</span>
              </h1>
            </div>
          </div>

          <div className="home-rebuild-mobile-actions" aria-label="Ações principais">
            <button type="button" className="home-rebuild-action home-rebuild-action-primary" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              <span>Adicionar vinho</span>
            </button>
            <button
              type="button"
              className="home-rebuild-action"
              onClick={() => {
                setPreSelectedWine(null);
                setConsumptionOpen(true);
              }}
            >
              <GlassWater className="h-4 w-4" />
              <span>Adicionar consumo</span>
            </button>
          </div>

          <div className="home-rebuild-layout">
            <main className="home-rebuild-main">
              <article className="home-rebuild-highlight sx-v2-ai-aura">
                <div className="home-rebuild-bottle-stage">
                  {insightWine ? (
                    <WineLabelPreview
                      wine={insightWine}
                      alt={insightWine.name}
                      className="home-rebuild-bottle"
                      imageClassName="h-full w-full object-contain"
                      generated={false}
                      compact
                    />
                  ) : (
                    <div className="home-rebuild-bottle-placeholder">
                      <WineIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="home-rebuild-highlight-copy">
                  <div className="home-rebuild-highlight-top">
                    <Kicker className="home-rebuild-kicker">Rótulo em destaque</Kicker>
                    {insightWindowLabel ? <span className="home-rebuild-window">{insightWindowLabel}</span> : null}
                  </div>

                  {insightWine ? (
                    <>
                      <h2 className="home-rebuild-wine sx-v2-wine-title">{insightWine.name}</h2>
                      {insightMeta ? <p className="home-rebuild-meta sx-v2-wine-meta">{insightMeta}</p> : null}
                      <div className="home-rebuild-highlight-foot">
                        <span className="home-rebuild-status">{insightReason}</span>
                        <button
                          type="button"
                          className="home-rebuild-open"
                          onClick={() => {
                            setPreSelectedWine(insightWine);
                            setConsumptionOpen(true);
                          }}
                        >
                          Abrir agora
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="home-rebuild-wine sx-v2-wine-title">Nenhum rótulo cadastrado</h2>
                      <p className="home-rebuild-meta sx-v2-wine-meta">Cadastre garrafas para ver sugestões.</p>
                      <button type="button" className="home-rebuild-open" onClick={() => setAddOpen(true)}>
                        Adicionar vinho
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </article>

              <section className="home-rebuild-panel home-rebuild-upcoming">
                <div className="home-rebuild-section-head">
                  <h2>Próximas garrafas</h2>
                  <span>{readyWines.length}</span>
                </div>

                <div className="home-rebuild-upcoming-list">
                  {readyWines.length > 0 ? readyWines.slice(0, 4).map(({ wine, classification, drinkWindow }) => (
                    <button
                      type="button"
                      key={wine.id}
                      className="home-rebuild-wine-row"
                      onClick={() => {
                        setPreSelectedWine(wine);
                        setConsumptionOpen(true);
                      }}
                    >
                      <WineLabelPreview
                        wine={wine}
                        alt={wine.name}
                        className="home-rebuild-thumb"
                        imageClassName="h-full w-full object-contain"
                        generated={false}
                        compact
                      />
                      <span className="home-rebuild-row-copy">
                        <strong>{wine.name}</strong>
                        <small>{[wine.country, wine.region].filter(Boolean).join(" · ") || wine.style || "Adega"}</small>
                      </span>
                      <span className={`home-rebuild-row-status ${classification.status}`}>
                        {classification.status === "now" ? "Abrir" : `${drinkWindow.from}-${drinkWindow.until}`}
                      </span>
                    </button>
                  )) : (
                    <div className="home-rebuild-empty">Cadastre garrafas para ver sugestões.</div>
                  )}
                </div>
              </section>

              <section className="home-rebuild-panel home-rebuild-recent">
                <div className="home-rebuild-section-head">
                  <h2>Últimos consumos</h2>
                  {lowStock > 0 ? <span>{lowStock} baixo estoque</span> : null}
                </div>

                <div className="home-rebuild-recent-list">
                  {recentToasts.length > 0 ? recentToasts.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="home-rebuild-consumption-row">
                      <span className="home-rebuild-consumption-date">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(entry.consumed_at)}
                      </span>
                      <span className="home-rebuild-row-copy">
                        <strong>{entry.wine_name}</strong>
                        <small>{[entry.producer, entry.vintage].filter(Boolean).join(" · ") || (entry.source === "external" ? "Externo" : "Adega")}</small>
                      </span>
                      <span className="home-rebuild-rating">{entry.rating ? `${entry.rating.toFixed(1)}` : "—"}</span>
                    </div>
                  )) : (
                    <div className="home-rebuild-empty">Nenhum consumo registrado.</div>
                  )}
                </div>
              </section>
            </main>

            <aside className="home-rebuild-side">
              <section className="home-rebuild-actions-card" aria-label="Ações rápidas">
                <button type="button" className="home-rebuild-action home-rebuild-action-primary" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  <span>Adicionar vinho</span>
                </button>
                <button
                  type="button"
                  className="home-rebuild-action"
                  onClick={() => {
                    setPreSelectedWine(null);
                    setConsumptionOpen(true);
                  }}
                >
                  <GlassWater className="h-4 w-4" />
                  <span>Adicionar consumo</span>
                </button>
                <button
                  type="button"
                  className="home-rebuild-action"
                  onClick={() => {
                    setPairingInitialWineId(null);
                    setDishToWineOpen(true);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Harmonizar</span>
                </button>
                <button type="button" className="home-rebuild-action" onClick={() => setWineListOpen(true)}>
                  <WineIcon className="h-4 w-4" />
                  <span>Analisar carta</span>
                </button>
              </section>

              <section className="home-rebuild-summary">
                <div className="home-rebuild-section-head">
                  <h2>Resumo</h2>
                </div>
                <div className="home-rebuild-metrics">
                  <span><strong>{totalBottles.toLocaleString("pt-BR")}</strong> garrafas</span>
                  <span><strong>{wines.length.toLocaleString("pt-BR")}</strong> rótulos</span>
                  <span><strong>{drinkNow}</strong> beber agora</span>
                  <span><strong>{inGuard}</strong> em guarda</span>
                  <span className="home-rebuild-metric-wide"><strong>{formattedTotalValue}</strong> valor estimado</span>
                </div>
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
      <WineListScannerDialog open={wineListOpen} onOpenChange={setWineListOpen} />
    </>
  );
}
