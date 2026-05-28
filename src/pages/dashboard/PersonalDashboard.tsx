// Visão Geral — perfil Pessoal
// Design "Editorial" fiel ao design-reference/Adega_Pessoal (variant-editorial.jsx)
// Dados reais via Supabase (useWines).

import { useMemo, useState } from "react";
import {
  ArrowRight,
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

  const insightMeta = insightWine ? formatWineMeta(insightWine) : "";

  const insightSentence = insightWine
    ? insightReason === "Abra este rótulo hoje"
      ? "Boa escolha para acompanhar sua próxima refeição."
      : insightReason === "Vale acompanhar a janela de consumo"
        ? "Vale observar a evolução e decidir com calma."
        : "Um rótulo da sua adega que merece atenção agora."
    : insightReason;

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

      <div className="dashboard-root editorial-page home-v2-page sx-v2-page-shell !px-0">
        <section className="sx-v2-content-rail home-v2-rail">
          <div className="home-v2-header">
            <div className="home-v2-greeting">
              <p className="home-v2-date sx-v2-kicker">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <h1 className="home-v2-title sx-v2-display">
                Olá,{" "}
                <span className="home-v2-name">{firstName}</span>
              </h1>
            </div>
            <div className="home-v2-actions">
              <button type="button" className="sx-v2-btn sx-v2-btn-primary home-v2-primary-action" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                <span>Adicionar vinho</span>
              </button>
              <button
                type="button"
                className="sx-v2-btn sx-v2-btn-secondary home-v2-secondary-action"
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

          <div className="home-v2-stage">
            <article className="home-v2-hero sx-v2-insight-card sx-v2-ai-aura">
              <div className="home-v2-hero-copy">
                <div className="home-v2-hero-kicker-row">
                  <span className="home-v2-hero-sigil">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <Kicker className="home-v2-hero-kicker">Insight do dia</Kicker>
                </div>

                {insightWine ? (
                  <>
                    <p className="home-v2-hero-eyebrow">{insightReason}</p>
                    <h2 className="home-v2-hero-wine sx-v2-wine-title">{insightWine.name}</h2>
                    {insightMeta ? (
                      <p className="home-v2-hero-meta sx-v2-wine-meta">{insightMeta}</p>
                    ) : null}
                    <p className="home-v2-hero-note sx-v2-body">{insightSentence}</p>

                    <div className="home-v2-hero-actions">
                      <button
                        type="button"
                        className="sx-v2-btn-capsule home-v2-hero-action"
                        onClick={() => {
                          setPairingInitialWineId(insightWine.id);
                          setDishToWineOpen(true);
                        }}
                      >
                        <span>Harmonizar</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="home-v2-hero-eyebrow">Sua adega começa a ganhar vida aqui.</p>
                    <h2 className="home-v2-hero-wine sx-v2-wine-title">Cadastre os primeiros rótulos</h2>
                    <p className="home-v2-hero-note sx-v2-body">Adicione algumas garrafas para receber sugestões diárias e acompanhar o melhor momento de abrir.</p>
                  </>
                )}
              </div>

              <div className="home-v2-hero-stage sx-v2-bottle-stage">
                {insightWine?.image_url ? (
                  <img
                    src={insightWine.image_url}
                    alt={insightWine.name}
                    className="home-v2-hero-image"
                  />
                ) : (
                  <div className="home-v2-hero-placeholder sx-v2-wine-object">
                    <WineIcon className="h-10 w-10" />
                  </div>
                )}
              </div>
            </article>

            <aside className="home-v2-summary sx-v2-floating-panel">
              <div className="home-v2-summary-head">
                <Kicker className="home-v2-summary-kicker">Sua adega em resumo</Kicker>
                <p className="home-v2-summary-copy sx-v2-muted">Quatro sinais para decidir com calma o próximo passo.</p>
              </div>

              <div className="home-v2-metrics">
                {[
                  { label: "garrafas", value: totalBottles.toLocaleString("pt-BR"), icon: WineIcon },
                  { label: "beber agora", value: String(drinkNow), icon: GlassWater },
                  { label: "em guarda", value: String(inGuard), icon: ShieldCheck },
                  { label: "valor estimado", value: formattedTotalValue, icon: CircleDollarSign },
                ].map((metric) => (
                  <div key={metric.label} className="home-v2-metric sx-v2-collectible-surface">
                    <metric.icon className="home-v2-metric-icon" />
                    <span className="home-v2-metric-value">{metric.value}</span>
                    <span className="home-v2-metric-label">{metric.label}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="home-v2-sections">
            <section className="home-v2-section sx-v2-collection-card">
              <div className="home-v2-section-head">
                <div>
                  <Kicker className="home-v2-section-kicker">Próximas garrafas</Kicker>
                  <h2 className="home-v2-section-title sx-v2-section-title">Para abrir com calma</h2>
                </div>
                <span className="home-v2-section-count">{readyWines.length} rótulos</span>
              </div>

              <div className="home-v2-collection-list">
                {readyWines.length > 0 ? readyWines.map(({ wine, classification }) => (
                  <button
                    type="button"
                    key={wine.id}
                    className="home-v2-wine-row sx-v2-wine-row"
                    onClick={() => {
                      setPreSelectedWine(wine);
                      setConsumptionOpen(true);
                    }}
                  >
                    <span className="home-v2-wine-mark">
                      <WineIcon className="h-4 w-4" />
                    </span>
                    <span className="home-v2-wine-copy">
                      <strong>{wine.name}</strong>
                      <small>{formatWineMeta(wine) || wine.style || "Rótulo da adega"}</small>
                    </span>
                    <span className="home-v2-wine-status">{classification.label}</span>
                  </button>
                )) : (
                  <div className="home-v2-empty">Cadastre garrafas para acompanhar o momento de abrir.</div>
                )}
              </div>
            </section>

            <section className="home-v2-section home-v2-ritual sx-v2-floating-panel">
              <div className="home-v2-section-head">
                <div>
                  <Kicker className="home-v2-section-kicker">Movimentos recentes</Kicker>
                  <h2 className="home-v2-section-title sx-v2-section-title">Ritual recente</h2>
                </div>
              </div>

              <div className="home-v2-ritual-list">
                {recentToasts.length > 0 ? recentToasts.map((entry) => (
                  <div key={entry.id} className="home-v2-ritual-row">
                    <span className="home-v2-ritual-date">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(entry.consumed_at)}
                    </span>
                    <span className="home-v2-ritual-copy">
                      <strong>{entry.wine_name}</strong>
                      <small>{[entry.producer, entry.vintage].filter(Boolean).join(" · ") || (entry.source === "external" ? "Consumo externo" : "Da adega")}</small>
                    </span>
                    <span className="home-v2-ritual-rating">{entry.rating ? `${entry.rating.toFixed(1)}` : "—"}</span>
                  </div>
                )) : (
                  <div className="home-v2-empty">Registre consumos para formar seu histórico.</div>
                )}
              </div>

              <div className="home-v2-ritual-foot">
                <span className="home-v2-ritual-note">{lowStock > 0 ? `${lowStock} rótulos com poucas unidades.` : "Adega sem alertas críticos de estoque."}</span>
              </div>
            </section>
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
