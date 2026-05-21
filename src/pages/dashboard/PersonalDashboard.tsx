// Visão Geral — perfil Pessoal
// Design "Editorial" fiel ao design-reference/Adega_Pessoal (variant-editorial.jsx)
// Dados reais via Supabase (useWines / useConsumption / useWineEvent).

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  GlassWater,
  Plus,
  Search,
  Sparkles,
  Star,
  Wine as WineIcon,
  X,
} from "@/icons/lucide";

import { AddWineDialog } from "@/components/AddWineDialog";
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { DishToWineDialog } from "@/components/DishToWineDialog";
import { WineListScannerDialog } from "@/components/WineListScannerDialog";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { WineLabelPreview } from "@/components/WineLabelPreview";
import {
  Kicker,
  Sparkbar,
  STYLE_COLORS,
  getStyleFamily,
  classifyDrinkWindow,
  resolveSuggestedDrinkWindow,
} from "@/components/editorial/EditorialPrimitives";
import { useAuth } from "@/contexts/AuthContext";
import { useConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { useWineEvent, useWineMetrics } from "@/hooks/useWines";

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

function formatCurrencyShort(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

function getWineTypeClass(style?: string | null) {
  const family = getStyleFamily(style);
  return family === "rosé" ? "rose" : family;
}

export default function PersonalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Sommelier";

  const { totalBottles, totalValue, drinkNow, wines } = useWineMetrics();
  const { data: consumption = [] } = useConsumption();
  const wineEvent = useWineEvent();

  const [addOpen, setAddOpen] = useState(false);
  const [dishToWineOpen, setDishToWineOpen] = useState(false);
  const [pairingInitialWineId, setPairingInitialWineId] = useState<string | null>(null);
  const [wineListScanOpen, setWineListScanOpen] = useState(false);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [preSelectedWine, setPreSelectedWine] = useState<{
    id: string; name: string; producer?: string | null; country?: string | null;
    region?: string | null; grape?: string | null; style?: string | null; vintage?: number | null;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState("todos");
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("sommelyx_onboarding_done_personal"),
  );

  const currentYear = new Date().getFullYear();

  const inGuard = useMemo(
    () => wines.filter((w) => w.quantity > 0 && w.drink_from && currentYear < w.drink_from).length,
    [wines, currentYear],
  );
  const pastPeak = useMemo(
    () =>
      wines.filter((w) => w.quantity > 0 && w.drink_until && currentYear > w.drink_until).length,
    [wines, currentYear],
  );

  const ready = useMemo(() => {
    const list = wines
      .map((w) => {
        const drinkWindow = resolveSuggestedDrinkWindow(w);
        const classification = classifyDrinkWindow({
          current: currentYear,
          from: drinkWindow.from,
          until: drinkWindow.until,
        });

        return { wine: w, drinkWindow, classification };
      })
      .filter(({ wine, classification }) => {
        if (wine.quantity <= 0) return false;
        return classification.status === "now" || classification.status === "soon";
      });

    const filtered = list.filter(({ wine }) => {
      if (styleFilter !== "todos" && getStyleFamily(wine.style) !== styleFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        wine.name.toLowerCase().includes(q) ||
        (wine.producer || "").toLowerCase().includes(q) ||
        (wine.country || "").toLowerCase().includes(q) ||
        (wine.region || "").toLowerCase().includes(q) ||
        String(wine.vintage ?? "").includes(q)
      );
    });

    return filtered
      .sort((a, b) => a.drinkWindow.until - b.drinkWindow.until)
      .map(({ wine }) => wine)
      .slice(0, 8);
  }, [wines, currentYear, query, styleFilter]);

  const months = useMemo(() => buildMonthWindow(6), []);
  const consumptionMonthly = useMemo(() => {
    const map: Record<string, number> = {};
    consumption.forEach((c) => {
      const d = new Date(c.consumed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return months.map((m) => ({ label: m.label, value: map[m.key] || 0 }));
  }, [consumption, months]);

  const lastOpened = consumption[0];
  const daysAgo = lastOpened
    ? Math.max(0, Math.round((Date.now() - new Date(lastOpened.consumed_at).getTime()) / 86_400_000))
    : null;

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

  const handleOpenBottle = (wineId: string, _wineName: string) => {
    const w = wines.find((x) => x.id === wineId);
    if (!w) return;
    setPreSelectedWine({
      id: w.id,
      name: w.name,
      producer: w.producer,
      country: w.country,
      region: w.region,
      grape: w.grape,
      style: w.style,
      vintage: w.vintage,
    });
    setConsumptionOpen(true);
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
              <p className="overview-summary overview-greeting-sub max-w-[620px]">
                {totalBottles > 0
                  ? (
                    <>
                      Sua adega guarda <strong>{totalBottles} {totalBottles === 1 ? "garrafa" : "garrafas"}</strong>.{" "}
                      <span className="ready-accent">{drinkNow} {drinkNow === 1 ? "está pronta" : "estão prontas"}</span>{" "}
                      para abrir hoje, enquanto <strong>{inGuard}</strong> seguem em guarda.
                    </>
                  )
                  : "Sua adega está vazia. Adicione o primeiro vinho para começar a acompanhar consumo, janelas e valor."}
              </p>
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

          <div className="stats-grid stat-cards-row md:grid-cols-4">
            {[
              { label: "GARRAFAS", value: totalBottles.toLocaleString("pt-BR"), detail: "em estoque", icon: WineIcon },
              { label: "VALOR EST.", value: formatCurrencyShort(totalValue), detail: "atualizado hoje", icon: Star },
              { label: "BEBER AGORA", value: String(drinkNow), detail: "em janela ideal", icon: GlassWater, olive: true },
              { label: "EM GUARDA", value: String(inGuard), detail: "aguardando", icon: Sparkles, olive: true },
            ].map((metric) => (
              <div key={metric.label} className={`stat-card min-w-0 ${metric.olive ? "olive" : ""}`}>
                <div className="stat-card-icon">
                  <metric.icon className="stat-label-icon h-4 w-4" />
                </div>
                <div className="stat-value stat-card-number">{metric.value}</div>
                <p className="stat-label stat-card-label">{metric.label}</p>
                <p className="stat-sublabel">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-12 gap-5 lg:gap-8">
          <section className="recent-section col-span-12 lg:col-span-8">
            <div>
              <div className="ready-section curated-ready-card recent-section-header">
                <div className="min-w-0">
                  <h2 className="ready-section-title recent-section-title">Escolha a próxima garrafa</h2>
                  <p className="ready-section-sub">
                    <span className="count-badge">{ready.length}</span>{" "}
                    {ready.length === 1
                      ? "vinho pronto para abrir agora"
                      : "vinhos prontos para abrir agora"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ver-adega recent-section-link"
                  onClick={() => navigate("/dashboard/cellar")}
                >
                  Ver adega <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="overview-search">
                  <Search className="h-4 w-4" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar vinho"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-[var(--sx-t-muted)]"
                      aria-label="Limpar busca"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
              </div>

                <div className="chips-row">
                    {(["todos", "tinto", "branco", "rosé", "espumante", "sobremesa"] as const).map(
                      (s) => {
                        const styleKey = s === "todos" ? "todos" : s === "rosé" ? "rose" : s;
                        return (
                          <button
                            key={s}
                            type="button"
                            data-style={styleKey}
                            className={`chip ${styleKey} ${styleFilter === s ? "active" : ""}`}
                            onClick={() => setStyleFilter(s)}
                          >
                            {s}
                          </button>
                        );
                      },
                    )}
                </div>

              {ready.length === 0 ? (
                <PremiumEmptyState
                  icon={GlassWater}
                  title={totalBottles === 0 ? "Você ainda não adicionou vinhos" : "Nenhum vinho encontrado"}
                  description={
                    totalBottles === 0
                      ? "Comece adicionando sua primeira garrafa para acompanhar estoque, consumo e valor."
                      : "Ajuste a busca ou os filtros para encontrar um vinho específico."
                  }
                  primaryAction={
                    totalBottles === 0
                      ? {
                          label: "Adicionar vinho",
                          onClick: () => setAddOpen(true),
                          icon: <Plus className="h-4 w-4" />,
                        }
                      : undefined
                  }
                  className="px-6 py-10 lg:py-12"
                />
              ) : (
                <div className="wine-list home-ready-list">
                  {ready[0] ? (() => {
                    const w = ready[0];
                    const family = getStyleFamily(w.style);
                    return (
                      <article key={w.id} className="home-wine-hero sx-card sx-card-wine">
                        <WineLabelPreview
                          wine={w}
                          alt={w.name}
                          className="home-wine-hero-media"
                          imageClassName="h-full w-full object-contain"
                          compact
                        />
                        <div className="home-wine-hero-body">
                          <div className="home-wine-hero-kicker">Recomendação</div>
                          <h3 className="home-wine-hero-name sx-wine-name">{w.name}</h3>
                          <p className="home-wine-hero-meta">
                            {[w.producer, w.vintage, w.region || w.country].filter(Boolean).join(" · ") || "Vinho da adega"}
                          </p>
                          <div className="home-wine-hero-tags">
                            <span className={`wine-type-chip ${getWineTypeClass(w.style)}`}>{family}</span>
                            <span className="wine-qty-badge">{w.quantity} un.</span>
                            {w.drink_until ? <span className="wine-qty-badge">até {w.drink_until}</span> : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-abrir home-wine-hero-action"
                          disabled={wineEvent.isPending}
                          onClick={() => handleOpenBottle(w.id, w.name)}
                        >
                          Abrir
                        </button>
                      </article>
                    );
                  })() : null}

                  <div className="home-ready-rows">
                    {ready.slice(1).map((w) => {
                      const family = getStyleFamily(w.style);
                      return (
                        <div key={w.id} className="wine-row-card recent-wine-row">
                          <WineLabelPreview
                            wine={w}
                            alt={w.name}
                            className="wine-row-thumb recent-wine-badge"
                            imageClassName="h-full w-full object-contain"
                            compact
                          />
                          <div className="wine-row-body">
                            <div className="flex min-w-0 items-baseline gap-1.5">
                              <p className="wine-row-name recent-wine-name truncate">
                                {w.name}
                              </p>
                              {w.vintage && (
                                <span className="wine-row-year recent-wine-year tabular-nums">
                                  {w.vintage}
                                </span>
                              )}
                            </div>
                            <p className="wine-row-meta truncate">
                              {[w.producer, [w.region, w.country].filter(Boolean).join(", "), w.cellar_location]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className={`wine-type-chip ${getWineTypeClass(w.style)}`}>
                                {family}
                              </span>
                              <span className="wine-qty-badge">
                                {w.quantity} un.
                                {w.drink_until ? (
                                  <>
                                    {" · janela até "}
                                    <b className="tabular-nums">{w.drink_until}</b>
                                  </>
                                ) : null}
                              </span>
                            </div>
                          </div>
                          <div className="hidden shrink-0 flex-col items-end gap-1 md:flex">
                            {w.rating != null && (
                              <div className="flex items-center gap-1 text-[12.5px] font-semibold tabular-nums" style={{ color: "#B48C3A" }}>
                                <Star className="h-3.5 w-3.5 fill-current" />
                                <span>{Number(w.rating).toFixed(1)}</span>
                              </div>
                            )}
                            {w.current_value != null && (
                              <span
                                className="text-[11.5px] font-semibold"
                                style={{ color: "rgba(58,51,39,0.55)" }}
                              >
                                R$ {Number(w.current_value).toLocaleString("pt-BR")}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn-abrir"
                            disabled={wineEvent.isPending}
                            onClick={() => handleOpenBottle(w.id, w.name)}
                          >
                            Abrir
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-4">
            <div className="dashboard-aside-stack px-5 lg:px-1">
              <div className="space-y-3 pt-1 lg:pt-0">
                <button
                  type="button"
                  className="daily-insight-card group flex w-full items-start gap-3 text-left"
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
                <div className="dashboard-aside-card">
                  <Kicker>Hoje</Kicker>
                  {lastOpened ? (
                    <>
                      <div
                        className="mt-2 font-serif text-[18px] font-semibold"
                        style={{
                          fontFamily: "'Libre Baskerville', Georgia, serif",
                          letterSpacing: "-0.01em",
                          color: "#1a1713",
                        }}
                      >
                        {lastOpened.wine_name}
                      </div>
                      <p className="mt-1 text-[12px]" style={{ color: "rgba(58,51,39,0.58)" }}>
                        {lastOpened.tasting_notes ||
                          lastOpened.location ||
                          (lastOpened.rating != null
                            ? `Nota ${Number(lastOpened.rating).toFixed(1)}`
                            : "Consumo registrado")}
                      </p>
                      <p className="mt-2 text-[11px] font-medium" style={{ color: "rgba(58,51,39,0.52)" }}>
                        há {daysAgo} dia{daysAgo !== 1 ? "s" : ""}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-[12px]" style={{ color: "rgba(58,51,39,0.5)" }}>
                      Nenhum consumo registrado ainda.
                    </p>
                  )}
                </div>

                <div className="dashboard-aside-card">
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <h3 className="editorial-h3">Consumo recente</h3>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "#7B1E2B" }}>
                      {consumption.length}
                    </span>
                  </div>
                  <Sparkbar data={consumptionMonthly} accent="#7B1E2B" height={68} />
                </div>

                <div className="dashboard-aside-card">
                  <div className="space-y-2.5">
                    {[
                      { label: "Beber agora", value: drinkNow, tone: "#5F7F52" },
                      { label: "Em guarda", value: inGuard, tone: "#6B8298" },
                      { label: "Passaram do auge", value: pastPeak, tone: "#B48C3A" },
                    ].map((a) => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => navigate("/dashboard/alerts")}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-[12px] font-medium" style={{ color: "rgba(58,51,39,0.68)" }}>
                          {a.label}
                        </span>
                        <span className="text-[18px] font-semibold tracking-[-0.02em] tabular-nums" style={{ color: a.value > 0 ? a.tone : "rgba(58,51,39,0.24)" }}>
                          {a.value}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dashboard-aside-card quick-actions-section">
                  <div className="dashboard-shortcut-grid quick-actions-grid grid grid-cols-2 gap-2">
                    {[
                      { label: "Vinho", icon: Plus, action: () => setAddOpen(true) },
                      {
                        label: "Consumo",
                        icon: GlassWater,
                        action: () => {
                          setPreSelectedWine(null);
                          setConsumptionOpen(true);
                        },
                      },
                      { label: "Harmonizar", icon: Sparkles, action: () => setDishToWineOpen(true), olive: true },
                      { label: "Carta", icon: BookOpen, action: () => setWineListScanOpen(true), olive: true },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className={`quick-action-card flex flex-col text-left ${item.olive ? "olive" : ""}`}
                        onClick={item.action}
                      >
                        <span className="quick-action-icon">
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="quick-action-title">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
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
      <WineListScannerDialog open={wineListScanOpen} onOpenChange={setWineListScanOpen} />
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
