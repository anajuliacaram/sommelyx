// Visão Geral — perfil Pessoal
// Design "Editorial" fiel ao design-reference/Adega_Pessoal (variant-editorial.jsx)
// Dados reais via Supabase (useWines / useConsumption / useWineEvent).

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Clock,
  GlassWater,
  Layers,
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
import {
  Chip,
  EditorialCard,
  EditorialHeroBand,
  Kicker,
  Sparkbar,
  STYLE_COLORS,
  StyleBadge,
  getStyleFamily,
  classifyDrinkWindow,
  resolveSuggestedDrinkWindow,
} from "@/components/editorial/EditorialPrimitives";
import { useAuth } from "@/contexts/AuthContext";
import { useConsumption } from "@/hooks/useConsumption";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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

export default function PersonalDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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
    console.log("ready wines:", wines);

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

  // Insight do dia: vinho com janela mais próxima de fechar.
  // Fallback: se não houver janela definida, sugere qualquer vinho com estoque
  // (prioriza maior valor para destacar o "vinho do dia").
  const insightWine = useMemo(() => {
    const inStock = wines.filter((w) => w.quantity > 0);
    if (inStock.length === 0) return null;
    const withWindow = inStock
      .filter((w) => w.drink_until && currentYear <= w.drink_until)
      .sort((a, b) => (a.drink_until ?? 9999) - (b.drink_until ?? 9999));
    if (withWindow[0]) return withWindow[0];
    const fallback = [...inStock].sort(
      (a, b) => (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0),
    );
    return fallback[0] ?? null;
  }, [wines, currentYear]);

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

      <div className="editorial-page">
        <section className="px-1 pt-1">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <Kicker>
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Kicker>
              <h1 className={`editorial-page-h1 mt-1 ${isMobile ? "!text-[27px] leading-[1.02]" : ""}`}>
                Olá,{" "}
                <span
                  style={{
                    backgroundImage: "linear-gradient(145deg, #7B1E2B, #5A141F)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {firstName}
                </span>
              </h1>
              <p
                className={`mt-2 max-w-[560px] text-[13px] leading-[1.5] ${isMobile ? "!text-[12px] !leading-[1.38]" : ""}`}
                style={{ color: "rgba(58,51,39,0.64)" }}
              >
                {totalBottles > 0
                  ? `Sua adega guarda ${totalBottles} ${totalBottles === 1 ? "garrafa" : "garrafas"}. ${drinkNow} ${drinkNow === 1 ? "está pronta" : "estão prontas"} para abrir hoje, enquanto ${inGuard} seguem em guarda.`
                  : "Sua adega está vazia. Adicione o primeiro vinho para começar a acompanhar consumo, janelas e valor."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="editorial-btn-primary" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                <span>Adicionar vinho</span>
              </button>
              <button
                type="button"
                className="editorial-btn-ghost"
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

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-black/[0.05] pt-4 md:grid-cols-4">
            {[
              { label: "Garrafas", value: totalBottles.toLocaleString("pt-BR"), detail: "em estoque" },
              { label: "Valor estimado", value: formatCurrencyShort(totalValue), detail: "atualizado hoje" },
              { label: "Beber agora", value: String(drinkNow), detail: "em janela ideal" },
              { label: "Em guarda", value: String(inGuard), detail: "aguardando" },
            ].map((metric) => (
              <div key={metric.label} className="min-w-0">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[rgba(58,51,39,0.46)]">
                  {metric.label}
                </p>
                <div className="mt-1 text-[20px] font-semibold leading-none tracking-[-0.03em] text-[rgba(26,23,19,0.92)]">
                  {metric.value}
                </div>
                <p className="mt-1 text-[11px] text-[rgba(58,51,39,0.54)]">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── INSIGHT BAND ─── */}
        {insightWine && (
          <div>
            <EditorialHeroBand>
              <div className="relative z-10 flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
                <div className="flex items-start gap-2.5 md:gap-3">
                  <div
                    className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full md:h-10 md:w-10"
                    style={{ background: "rgba(201,180,105,0.18)", color: "#E0C879" }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: "rgba(230,215,170,0.78)" }}
                    >
                      Insight do dia
                    </div>
                    <p
                      className="line-clamp-2 font-serif text-[13.5px] font-medium leading-[1.3] sm:line-clamp-none sm:text-[16px] sm:leading-[1.4]"
                      style={{
                        fontFamily: "'Libre Baskerville', Georgia, serif",
                        letterSpacing: "-0.01em",
                        color: "#F7F4EE",
                      }}
                    >
                      O <b style={{ fontWeight: 700 }}>{insightWine.name}</b>{" "}
                      {insightWine.drink_until && insightWine.drink_until - currentYear <= 1
                        ? "entra na última janela ideal"
                        : insightWine.drink_until
                          ? `está dentro da janela ideal (até ${insightWine.drink_until})`
                          : "é o destaque da sua adega hoje"}
                      . {insightWine.quantity}{" "}
                      {insightWine.quantity === 1 ? "garrafa" : "garrafas"} — considere abrir nos
                      próximos jantares.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="editorial-btn-copper h-8 shrink-0 rounded-full px-3 text-[11px] md:h-10 md:px-4"
                  onClick={() => {
                    setPairingInitialWineId(insightWine.id);
                    setDishToWineOpen(true);
                  }}
                >
                  Ver harmonizações <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </EditorialHeroBand>
          </div>
        )}

        <div className="grid grid-cols-12 gap-4 lg:gap-5">
          <section className="col-span-12 lg:col-span-8">
            <EditorialCard>
              <div className="mb-3 flex flex-col gap-2 md:mb-4 md:flex-row md:items-end md:justify-between md:gap-3">
                <div className="min-w-0">
                  <h2 className="editorial-h2 text-[19px] md:text-[22px]">Escolha a próxima garrafa</h2>
                  <p
                    className="mt-0.5 text-[11px] leading-[1.25] md:text-[12px]"
                    style={{ color: "rgba(58,51,39,0.56)" }}
                  >
                    {ready.length}{" "}
                    {ready.length === 1
                      ? "vinho pronto para abrir agora"
                      : "vinhos prontos para abrir agora"}
                  </p>
                </div>
                <button
                  type="button"
                  className="editorial-btn-ghost h-8 w-fit px-3 text-[11px] md:h-8 md:px-3.5 md:text-[12px]"
                  onClick={() => navigate("/dashboard/cellar")}
                >
                  Ver adega <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="editorial-search mb-2.5 h-9 md:mb-3 md:h-10">
                <Search className="h-4 w-4" style={{ color: "rgba(58,51,39,0.4)" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome, produtor, região…"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    style={{ color: "rgba(58,51,39,0.4)" }}
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mb-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max items-center gap-1.25">
                  {(["todos", "tinto", "branco", "rosé", "espumante", "sobremesa"] as const).map(
                    (s) => (
                      <Chip key={s} active={styleFilter === s} onClick={() => setStyleFilter(s)} className="h-[24px] px-2 text-[10px] tracking-[0.04em]">
                        {s}
                      </Chip>
                    ),
                  )}
                </div>
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
                <div className="flex flex-col">
                  {ready.map((w) => {
                    const family = getStyleFamily(w.style);
                    const color = STYLE_COLORS[family];
                    return (
                      <div key={w.id} className="editorial-row">
                        <div
                          className="editorial-bottle-icon"
                          style={{ background: `${color}14`, color }}
                        >
                          <WineIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h4
                              className="text-[15px] font-bold"
                              style={{ color: "#1a1713", letterSpacing: "-0.01em" }}
                            >
                              {w.name}
                            </h4>
                            {w.vintage && (
                              <span
                                className="text-[12.5px] tabular-nums"
                                style={{ color: "rgba(58,51,39,0.6)" }}
                              >
                                {w.vintage}
                              </span>
                            )}
                          </div>
                          <p
                            className="mt-0.5 truncate text-[12px]"
                            style={{ color: "rgba(58,51,39,0.6)" }}
                          >
                            {[w.producer, [w.region, w.country].filter(Boolean).join(", "), w.cellar_location]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <div className="mt-1.5 flex items-center gap-3">
                            <StyleBadge style={w.style} />
                            <span
                              className="text-[11.5px] font-semibold"
                              style={{ color: "rgba(58,51,39,0.55)" }}
                            >
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
                          className="editorial-btn-open shrink-0"
                          disabled={wineEvent.isPending}
                          onClick={() => handleOpenBottle(w.id, w.name)}
                        >
                          Abrir
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </EditorialCard>
          </section>

          <aside className="col-span-12 lg:col-span-4">
            <EditorialCard style={{ padding: "18px 18px" }}>
              <div className="space-y-6">
                <div>
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

                <div className="border-t border-black/[0.05] pt-4">
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <h3 className="editorial-h3">Consumo recente</h3>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "#7B1E2B" }}>
                      {consumption.length}
                    </span>
                  </div>
                  <Sparkbar data={consumptionMonthly} accent="#7B1E2B" height={68} />
                </div>

                <div className="border-t border-black/[0.05] pt-4">
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

                <div className="border-t border-black/[0.05] pt-4">
                  <div className="flex flex-col gap-2">
                    <button type="button" className="editorial-btn-primary w-full justify-center" onClick={() => setAddOpen(true)}>
                      <Plus className="h-4 w-4" /> Adicionar vinho
                    </button>
                    <button
                      type="button"
                      className="editorial-btn-ghost w-full justify-center"
                      onClick={() => {
                        setPreSelectedWine(null);
                        setConsumptionOpen(true);
                      }}
                    >
                      <GlassWater className="h-4 w-4" /> Adicionar consumo
                    </button>
                    <button type="button" className="editorial-btn-ghost w-full justify-center" onClick={() => setDishToWineOpen(true)}>
                      <Sparkles className="h-4 w-4" /> Harmonizar prato
                    </button>
                    <button type="button" className="editorial-btn-ghost w-full justify-center" onClick={() => setWineListScanOpen(true)}>
                      <BookOpen className="h-4 w-4" /> Analisar carta
                    </button>
                  </div>
                </div>
              </div>
            </EditorialCard>
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
