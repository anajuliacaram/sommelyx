// Visão Geral — perfil Pessoal — FASE 3 EDITORIAL
// Reimaginação Apple Wallet / Music / TV + Moët atmosphere.
// Garrafa-protagonista. Sem cards. Sem KPIs em containers. Sem dashboard SaaS.
//
// Funcionalidades 100% preservadas:
// AddWineDialog, AddConsumptionDialog (preSelectedWine), DishToWineDialog (Harmonizar),
// WineListScannerDialog (Analisar carta), OnboardingWizard, todas as métricas.

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
import {
  classifyDrinkWindow,
  resolveSuggestedDrinkWindow,
} from "@/components/editorial/EditorialPrimitives";
import { EditorialHero, EditorialPill } from "@/components/editorial/EditorialHero";
import { EditorialMetric, EditorialMetricDivider } from "@/components/editorial/EditorialMetric";
import { SommelierRecommendation } from "@/components/editorial/SommelierRecommendation";
import { BottleObject } from "@/components/editorial/BottleObject";
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
  const firstName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name?.split(" ")[0] ||
    "Sommelier";

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

  const insightWindow = insightWine ? resolveSuggestedDrinkWindow(insightWine) : null;
  const insightClassification = insightWindow
    ? classifyDrinkWindow({
        current: currentYear,
        from: insightWindow.from,
        until: insightWindow.until,
      })
    : null;

  /** Frase consultiva no tom sommelier — substitui "Abrir agora" / "Beber agora". */
  const insightWhisper = (() => {
    if (!insightWine || !insightWindow || !insightClassification) {
      return "Cadastre algumas garrafas para receber uma curadoria diária da sua adega.";
    }
    const region = insightWine.region || insightWine.country || "sua adega";
    if (insightClassification.status === "now") {
      return `No auge da sua janela ideal. Um momento raro para abrir este rótulo de ${region}.`;
    }
    if (insightClassification.status === "soon") {
      return `Aproxima-se da janela ideal. Vale acompanhar nos próximos meses.`;
    }
    if (insightClassification.status === "past") {
      return `Já passou do auge — mas pode revelar nuances inesperadas em uma ocasião especial.`;
    }
    return `Em guarda silenciosa. ${region}, ${insightWindow.from}–${insightWindow.until}.`;
  })();

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
      .filter((r) => insightWine ? r.wine.id !== insightWine.id : true)
      .slice(0, 3);
  }, [wines, currentYear, insightWine]);

  const recentToasts = useMemo(() => consumptionEntries.slice(0, 3), [consumptionEntries]);

  const formattedTotalValue = totalValue > 0
    ? totalValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      })
    : "—";

  const insightMeta = insightWine
    ? [insightWine.region || insightWine.country, insightWine.vintage, insightWine.style]
        .filter(Boolean)
        .join(" · ")
        .toUpperCase()
    : "";

  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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

      {/* Fundo editorial — verde profundo + vinheta quente + grão de filme */}
      <div className="ed-canvas min-h-screen w-full">
        <div className="mx-auto max-w-[1240px] px-5 py-10 md:px-10 md:py-14">

          {/* ── Saudação editorial ───────────────────────────────── */}
          <header className="mb-10 md:mb-14 ed-anim-fade-up">
            <p className="ed-kicker mb-3">{todayLabel}</p>
            <h1 className="ed-display text-[clamp(2.25rem,4.5vw,3.5rem)]">
              Olá, <em style={{ fontStyle: "italic", color: "var(--ed-gold)" }}>{firstName}</em>
            </h1>
          </header>

          {/* ── Hero garrafa-protagonista ────────────────────────── */}
          {insightWine ? (
            <EditorialHero
              kicker={
                <>
                  <span style={{ width: 24, height: 1, background: "var(--ed-gold-line)" }} />
                  Rótulo do dia
                </>
              }
              title={insightWine.name}
              meta={insightMeta}
              note={insightWhisper}
              imageUrl={insightWine.image_url}
              style={insightWine.style}
              alt={insightWine.name}
              cta={
                <>
                  <EditorialPill
                    variant="primary"
                    onClick={() => {
                      setPreSelectedWine(insightWine);
                      setConsumptionOpen(true);
                    }}
                  >
                    Abrir esta garrafa
                    <ArrowRight className="h-4 w-4" />
                  </EditorialPill>
                  <EditorialPill
                    onClick={() => {
                      setPairingInitialWineId(insightWine.id);
                      setDishToWineOpen(true);
                    }}
                  >
                    Harmonizar
                  </EditorialPill>
                </>
              }
              className="mb-16 md:mb-24"
            />
          ) : (
            <section className="ed-canvas relative w-full overflow-hidden rounded-[28px] px-6 py-16 md:px-14 md:py-20 mb-16 text-center">
              <div className="mx-auto flex max-w-md flex-col items-center gap-6 ed-anim-fade-up">
                <BottleObject style="tinto" size="lg" withSpotlight />
                <p className="ed-kicker">Sua adega aguarda</p>
                <h2 className="ed-display text-[clamp(1.75rem,4vw,2.5rem)]">
                  Sem rótulos ainda
                </h2>
                <p className="ed-note text-[16px] max-w-[36ch]">
                  Comece registrando a primeira garrafa para que possamos curar uma seleção diária para você.
                </p>
                <EditorialPill variant="primary" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Adicionar primeiro vinho
                </EditorialPill>
              </div>
            </section>
          )}

          {/* ── Prateleira: próximas garrafas ─────────────────── */}
          {readyWines.length > 0 && (
            <section className="mb-16 md:mb-24">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="ed-kicker mb-2">Curadoria pessoal</p>
                  <h2 className="ed-display text-[clamp(1.5rem,3vw,2.25rem)]">
                    Próximas da sua janela
                  </h2>
                </div>
                <div className="ed-shelf-line max-w-[200px] flex-1 mb-3 hidden md:block" aria-hidden />
              </div>

              <div className="grid gap-10 md:gap-12 grid-cols-1 md:grid-cols-3">
                {readyWines.map(({ wine, drinkWindow, classification }) => {
                  const meta = [wine.region || wine.country, wine.vintage].filter(Boolean).join(" · ").toUpperCase();
                  const status =
                    classification.status === "now"
                      ? "No auge agora"
                      : `Janela ${drinkWindow.from}–${drinkWindow.until}`;
                  return (
                    <SommelierRecommendation
                      key={wine.id}
                      imageUrl={wine.image_url}
                      style={wine.style}
                      title={wine.name}
                      meta={meta}
                      status={status}
                      onClick={() => {
                        setPreSelectedWine(wine);
                        setConsumptionOpen(true);
                      }}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Diário: últimos consumos ─────────────────────── */}
          {recentToasts.length > 0 && (
            <section className="mb-16 md:mb-24">
              <div className="mb-8">
                <p className="ed-kicker mb-2">Diário</p>
                <h2 className="ed-display text-[clamp(1.5rem,3vw,2.25rem)]">
                  Memórias recentes
                </h2>
              </div>

              <ol className="flex flex-col gap-6">
                {recentToasts.map((entry, idx) => (
                  <li
                    key={entry.id}
                    className="ed-anim-fade-up flex items-baseline gap-6 border-b border-[color:var(--ed-ivory-faint)] pb-6 last:border-0"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <time
                      className="ed-kicker shrink-0 inline-flex items-center gap-1.5"
                      style={{ color: "var(--ed-gold)", minWidth: 78 }}
                    >
                      <Clock className="h-3 w-3" />
                      {new Date(entry.consumed_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </time>
                    <div className="flex-1 min-w-0">
                      <p className="ed-display text-[18px] md:text-[20px]" style={{ lineHeight: 1.15 }}>
                        {entry.wine_name}
                      </p>
                      <p className="ed-note text-[13px] mt-1">
                        {[entry.producer, entry.vintage].filter(Boolean).join(" · ") ||
                          (entry.source === "external" ? "Encontro fora da adega" : "Da sua adega")}
                      </p>
                    </div>
                    {entry.rating ? (
                      <span
                        className="ed-display tabular-nums text-[20px] shrink-0"
                        style={{ color: "var(--ed-gold)" }}
                      >
                        {entry.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* ── Sua coleção em números (editorial, não KPI) ──── */}
          <section className="mb-16">
            <div className="mb-8">
              <p className="ed-kicker mb-2">Sua coleção</p>
              <h2 className="ed-display text-[clamp(1.5rem,3vw,2.25rem)]">
                Em silêncio na adega
              </h2>
            </div>

            <div className="flex flex-wrap items-end gap-x-10 gap-y-8 md:gap-x-16">
              <EditorialMetric
                label="Garrafas"
                value={totalBottles.toLocaleString("pt-BR")}
                size="lg"
              />
              <EditorialMetricDivider className="hidden md:block" />
              <EditorialMetric
                label="Rótulos"
                value={wines.length.toLocaleString("pt-BR")}
                size="md"
              />
              <EditorialMetricDivider className="hidden md:block" />
              <EditorialMetric
                label="No auge"
                value={drinkNow.toLocaleString("pt-BR")}
                sub={drinkNow > 0 ? "Prontas para abrir" : undefined}
                size="md"
              />
              <EditorialMetricDivider className="hidden md:block" />
              <EditorialMetric
                label="Em guarda"
                value={inGuard.toLocaleString("pt-BR")}
                sub={inGuard > 0 ? "Aguardando seu tempo" : undefined}
                size="md"
              />
              <EditorialMetricDivider className="hidden md:block" />
              <EditorialMetric
                label="Valor estimado"
                value={formattedTotalValue}
                size="md"
              />
            </div>
          </section>

          {/* ── Ações editoriais (não-cards) ──────────────────── */}
          <section
            aria-label="Ações principais"
            className="border-t border-[color:var(--ed-ivory-faint)] pt-10"
          >
            <p className="ed-kicker mb-6">Concierge</p>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <EditorialPill variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Adicionar vinho
              </EditorialPill>
              <EditorialPill
                onClick={() => {
                  setPreSelectedWine(null);
                  setConsumptionOpen(true);
                }}
              >
                <GlassWater className="h-4 w-4" />
                Registrar consumo
              </EditorialPill>
              <EditorialPill
                onClick={() => {
                  setPairingInitialWineId(null);
                  setDishToWineOpen(true);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Harmonizar
              </EditorialPill>
              <EditorialPill onClick={() => setWineListOpen(true)}>
                <WineIcon className="h-4 w-4" />
                Analisar carta
              </EditorialPill>
            </div>

            {lowStock > 0 && (
              <p className="ed-note text-[13px] mt-6" style={{ color: "var(--ed-ivory-muted)" }}>
                Algumas garrafas estão chegando ao fim — vale uma visita à adega.
              </p>
            )}
          </section>
        </div>
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
