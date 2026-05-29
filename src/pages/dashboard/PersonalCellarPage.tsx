// Minha Adega — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx CellarPage).
// Dados reais via Supabase.

import { useMemo, useState, useEffect } from "react";
import { ArrowUpDown, ChevronRight, Globe, Plus, Search, Wine as WineIcon, X } from "@/icons/lucide";

import { AddWineDialog } from "@/components/AddWineDialog";
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";
import { EditWineDialog } from "@/components/EditWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import {
  EditorialCard,
  STYLE_COLORS,
  getStyleFamily,
  classifyDrinkWindow,
  resolveSuggestedDrinkWindow,
} from "@/components/editorial/EditorialPrimitives";
import { useToast } from "@/hooks/use-toast";
import { useWineEvent, useWines, type Wine } from "@/hooks/useWines";
import { useResolveWineImages } from "@/hooks/useResolveWineImages";
import { WineLabelPreview } from "@/components/WineLabelPreview";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

const currentYear = new Date().getFullYear();

const MOBILE_BREAKPOINT = 640;

function useIsSmallScreen() {
  const [small, setSmall] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const check = () => setSmall(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return small;
}

function normalizeCountry(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function resolveWineCountry(wine: Pick<Wine, "country" | "region">) {
  const explicit = (wine.country ?? "").trim();
  if (explicit) return explicit;
  const region = normalizeCountry(wine.region);
  if (!region) return "";
  if (/(fran[çc]a|france|bourgogne|bordeaux|champagne|loire|rh[oô]ne|alsace|provence)/i.test(region)) return "França";
  if (/(it[aá]lia|italy|toscana|piemonte|veneto|sic[ií]lia|montalcino|barolo|chianti)/i.test(region)) return "Itália";
  if (/(espanha|spain|rioja|ribera del duero|priorat|jerez|catalunha)/i.test(region)) return "Espanha";
  if (/(chile|maipo|colchagua|casablanca|aconcagua)/i.test(region)) return "Chile";
  if (/(argentina|mendoza|salta|patag[oô]nia)/i.test(region)) return "Argentina";
  if (/(eua|usa|united states|calif[oó]rnia|napa|sonoma|oregon|washington)/i.test(region)) return "EUA";
  return "";
}

function getWineTypeClass(style?: string | null) {
  const family = getStyleFamily(style);
  return family === "rosé" ? "rose" : family;
}

function getDrinkBadgeClass(status: string) {
  if (status === "now") return "now";
  if (status === "soon") return "soon";
  return "aging";
}

function formatWinePrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "Preço n/i";
  return `R$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export default function PersonalCellarPage() {
  const { data: wines = [], isLoading } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();
  useResolveWineImages(wines);
  const isMobile = useIsSmallScreen();

  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("cellar:query") ?? "";
  });
  const [styleFilter, setStyleFilter] = useState(() => {
    if (typeof window === "undefined") return "todos";
    return window.localStorage.getItem("cellar:styleFilter") ?? "todos";
  });
  const [countryFilter, setCountryFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    return window.localStorage.getItem("cellar:countryFilter") ?? "all";
  });
  const [drinkWindowFilter, setDrinkWindowFilter] = useState<"all" | "now" | "guard">(() => {
    if (typeof window === "undefined") return "all";
    return (window.localStorage.getItem("cellar:drinkWindowFilter") as "all" | "now" | "guard" | null) ?? "all";
  });
  const [sort, setSort] = useState<
    "recent" | "value_low" | "value" | "vintage_old" | "vintage"
  >(() => {
    if (typeof window === "undefined") return "recent";
    return (window.localStorage.getItem("cellar:sort") as "recent" | "value_low" | "value" | "vintage_old" | "vintage" | null) ?? "recent";
  });
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (window.localStorage.getItem("cellar:view") as "grid" | "list" | null) ?? (window.innerWidth < MOBILE_BREAKPOINT ? "list" : "grid");
  });
  const [showLabels] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("cellar:showLabels");
    return v === null ? true : v === "1";
  });
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editWine, setEditWine] = useState<Wine | null>(null);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [preSelectedWine, setPreSelectedWine] = useState<Wine | null>(null);
  useEffect(() => {
    window.localStorage.setItem("cellar:query", query);
  }, [query]);
  useEffect(() => {
    window.localStorage.setItem("cellar:styleFilter", styleFilter);
  }, [styleFilter]);
  useEffect(() => {
    window.localStorage.setItem("cellar:countryFilter", countryFilter);
  }, [countryFilter]);
  useEffect(() => {
    window.localStorage.setItem("cellar:drinkWindowFilter", drinkWindowFilter);
  }, [drinkWindowFilter]);
  useEffect(() => {
    window.localStorage.setItem("cellar:sort", sort);
  }, [sort]);
  useEffect(() => {
    window.localStorage.setItem("cellar:view", view);
  }, [view]);

  const styleOptions = useMemo(() => {
    const styleSet = new Set<string>();
    wines.forEach((w) => {
      const family = getStyleFamily(w.style);
      if (family && family !== "unknown" && family !== "todos") styleSet.add(family);
    });
    const sorted = Array.from(styleSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return [{ key: "todos", label: "Todos" }, ...sorted.map((s) => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))];
  }, [wines]);

  const drinkWindowOptions = useMemo(() => {
    let hasNow = false;
    let hasGuard = false;
    wines.forEach((w) => {
      const dw = resolveSuggestedDrinkWindow(w);
      const status = classifyDrinkWindow({ current: currentYear, from: dw.from, until: dw.until }).status;
      if (status === "now") hasNow = true;
      else hasGuard = true;
    });
    const options = [];
    if (hasNow) options.push({ key: "now", label: "Beber agora" });
    if (hasGuard) options.push({ key: "guard", label: "Em guarda" });
    options.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    return [{ key: "all", label: "Todos" }, ...options];
  }, [wines]);

  const countryOptions = useMemo(() => {
    const dynamic = new Set<string>();
    wines.forEach((w) => {
      const resolved = resolveWineCountry(w);
      if (resolved) dynamic.add(resolved);
    });
    const sorted = Array.from(dynamic).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return [{ key: "all", label: "Todos" }, ...sorted.map((c) => ({ key: c, label: c }))];
  }, [wines]);

  const sortLabel = useMemo(() => {
    const labels: Record<typeof sort, string> = {
      recent: "Mais recentes",
      value_low: "Mais baratos",
      value: "Mais caros",
      vintage_old: "Safra antiga",
      vintage: "Safra nova",
    };
    return sort === "recent" ? "Ordenar" : `Ordenar: ${labels[sort]}`;
  }, [sort]);

  const totalBottles = useMemo(
    () => wines.reduce((sum, wine) => sum + Math.max(0, Number(wine.quantity) || 0), 0),
    [wines],
  );

  const uniqueLabels = wines.length;

  const drinkNowCount = useMemo(
    () =>
      wines.reduce((sum, wine) => {
        const dw = resolveSuggestedDrinkWindow(wine);
        const status = classifyDrinkWindow({ current: currentYear, from: dw.from, until: dw.until }).status;
        return status === "now" ? sum + 1 : sum;
      }, 0),
    [wines],
  );

  const agingCount = useMemo(
    () =>
      wines.reduce((sum, wine) => {
        const dw = resolveSuggestedDrinkWindow(wine);
        const status = classifyDrinkWindow({ current: currentYear, from: dw.from, until: dw.until }).status;
        return status !== "now" ? sum + 1 : sum;
      }, 0),
    [wines],
  );

  const totalEstimatedValue = useMemo(
    () =>
      wines.reduce((sum, wine) => {
        const unitValue = Number(wine.current_value ?? wine.purchase_price ?? 0);
        const quantity = Math.max(0, Number(wine.quantity) || 0);
        return sum + (Number.isFinite(unitValue) ? unitValue * quantity : 0);
      }, 0),
    [wines],
  );

  const formattedEstimatedValue = totalEstimatedValue > 0
    ? totalEstimatedValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      })
    : "R$ 0";

  const countryLabel = useMemo(() => {
    const selected = countryOptions.find((option) => option.key === countryFilter)?.label ?? "Todos";
    return countryFilter === "all" ? "País" : `País: ${selected}`;
  }, [countryFilter, countryOptions]);

  const visibleStyleOptions = isMobile
    ? ["todos", "tinto", "branco", "rosé"]
        .map((key) => styleOptions.find((option) => option.key === key))
        .filter((option): option is { key: string; label: string } => Boolean(option))
    : styleOptions;

  const pageHeader = (filteredCount: number) => (
    <>
      <section className="cellar-v2-header sx-v2-page-shell">
        <div className="cellar-v2-header-copy">
          <p className="cellar-v2-kicker sx-v2-kicker">Adega</p>
          <h1 className="cellar-v2-title sx-v2-display">Minha Adega</h1>
          <p className="cellar-v2-subtitle sx-v2-body">
            {totalBottles} garrafas em {uniqueLabels} rótulos · {formattedEstimatedValue}
          </p>
        </div>
        <div className="cellar-v2-header-actions">
          <span className="cellar-v2-count">{filteredCount} / {wines.length} vinhos</span>
          <button type="button" className="sx-v2-btn sx-v2-btn-primary cellar-v2-add-button" onClick={() => setAddOpen(true)} aria-label="Adicionar vinho">
            <Plus className="h-4 w-4" />
            <span>Adicionar vinho</span>
          </button>
        </div>
      </section>

      <section className="cellar-v2-summary sx-v2-floating-panel">
        <div className="cellar-v2-summary-head">
          <p className="cellar-v2-summary-kicker sx-v2-kicker">Coleção em foco</p>
          <p className="cellar-v2-summary-note sx-v2-muted">Um panorama calmo da sua adega privada.</p>
        </div>
        <div className="cellar-v2-summary-grid">
          <article className="cellar-v2-summary-tile sx-v2-matte-panel">
            <span className="cellar-v2-summary-label">Garrafas</span>
            <strong className="cellar-v2-summary-value">{totalBottles}</strong>
          </article>
          <article className="cellar-v2-summary-tile sx-v2-matte-panel">
            <span className="cellar-v2-summary-label">Rótulos</span>
            <strong className="cellar-v2-summary-value">{uniqueLabels}</strong>
          </article>
          <article className="cellar-v2-summary-tile sx-v2-matte-panel">
            <span className="cellar-v2-summary-label">Beber agora</span>
            <strong className="cellar-v2-summary-value">{drinkNowCount}</strong>
          </article>
          <article className="cellar-v2-summary-tile sx-v2-matte-panel">
            <span className="cellar-v2-summary-label">Em guarda</span>
            <strong className="cellar-v2-summary-value">{agingCount}</strong>
          </article>
        </div>
      </section>

      <section className="cellar-v2-controls sx-v2-floating-panel">
        <div className="cellar-v2-search overview-search adega-search-wrap">
          <Search className="adega-search-icon h-4 w-4" />
          <input
            className="adega-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, produtor ou região"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar" className="text-[var(--sx-t-muted)]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="cellar-v2-control-row adega-controls">
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger aria-label="Ordenar vinhos" className="cellar-v2-filter-btn adega-filter-btn h-auto min-w-0 shadow-none">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 text-left">
                <span className="filter-label">Ordenar</span>
                <span className="block truncate">{sortLabel.replace("Ordenar: ", "")}</span>
              </span>
            </SelectTrigger>
            <SelectContent className="cellar-v2-select-content">
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="value_low">Mais baratos</SelectItem>
              <SelectItem value="value">Mais caros</SelectItem>
              <SelectItem value="vintage_old">Safra antiga</SelectItem>
              <SelectItem value="vintage">Safra nova</SelectItem>
            </SelectContent>
          </Select>

          <Select value={countryFilter} onValueChange={(v) => setCountryFilter(v)}>
            <SelectTrigger aria-label="Filtrar por país" className="cellar-v2-filter-btn adega-filter-btn h-auto min-w-0 shadow-none">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 text-left">
                <span className="filter-label">País</span>
                <span className="block truncate">{countryLabel.replace("País: ", "")}</span>
              </span>
            </SelectTrigger>
            <SelectContent className="cellar-v2-select-content">
              <SelectItem value="all">Todos os países</SelectItem>
              {countryOptions.filter((o) => o.key !== "all").map((option) => (
                <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="cellar-v2-view-toggle">
            <button type="button" className={`cellar-v2-view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>
              Grade
            </button>
            <button type="button" className={`cellar-v2-view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
              Lista
            </button>
          </div>
        </div>

        <div className="cellar-v2-filters chips-row adega-filters-row">
        {visibleStyleOptions.map((s) => {
          const styleKey = s.key === "todos" ? "todos" : s.key === "rosé" ? "rose" : s.key;
          return (
            <button
              key={s.key}
              type="button"
              data-style={styleKey}
              className={`sx-v2-chip cellar-v2-filter-chip adega-filter-chip ${styleKey} ${styleFilter === s.key ? "active" : ""}`}
              onClick={() => setStyleFilter(s.key)}
            >
              {s.label}
            </button>
          );
        })}
        </div>

        <div className="cellar-v2-filters chips-row adega-filters-row adega-drink-window-row">
          {drinkWindowOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`sx-v2-chip cellar-v2-filter-chip adega-filter-chip ${option.key === "guard" ? "olive" : ""} ${drinkWindowFilter === option.key ? "active" : ""}`}
              onClick={() => setDrinkWindowFilter(option.key as typeof drinkWindowFilter)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );

  const filtered = useMemo(() => {
    let list = wines.filter((w) => {
      if (w.quantity <= 0) return false;
      if (styleFilter !== "todos" && getStyleFamily(w.style) !== styleFilter) return false;
      if (countryFilter !== "all") {
        const resolvedCountry = resolveWineCountry(w);
        if (!resolvedCountry || normalizeCountry(resolvedCountry) !== normalizeCountry(countryFilter)) return false;
      }
      if (drinkWindowFilter !== "all") {
        const dw = resolveSuggestedDrinkWindow(w);
        const status = classifyDrinkWindow({ current: currentYear, from: dw.from, until: dw.until }).status;
        if (drinkWindowFilter === "now" && status !== "now") return false;
        if (drinkWindowFilter === "guard" && (status === "now")) return false;
      }
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        (w.producer || "").toLowerCase().includes(q) ||
        (w.country || "").toLowerCase().includes(q) ||
        (w.region || "").toLowerCase().includes(q) ||
        String(w.vintage ?? "").includes(q)
      );
    });
    if (sort === "recent") list = list.slice().sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    else if (sort === "value_low") list = list.slice().sort((a, b) => (Number(a.current_value) || Number(a.purchase_price) || Infinity) - (Number(b.current_value) || Number(b.purchase_price) || Infinity));
    else if (sort === "value") list = list.slice().sort((a, b) => (Number(b.current_value) || Number(b.purchase_price) || 0) - (Number(a.current_value) || Number(a.purchase_price) || 0));
    else if (sort === "vintage_old") list = list.slice().sort((a, b) => (a.vintage ?? 9999) - (b.vintage ?? 9999));
    else if (sort === "vintage") list = list.slice().sort((a, b) => (b.vintage ?? 0) - (a.vintage ?? 0));
    return list;
  }, [wines, query, styleFilter, countryFilter, drinkWindowFilter, sort]);

  const handleOpenBottle = (w: Wine) => {
    setPreSelectedWine(w);
    setConsumptionOpen(true);
  };

  return (
    <>
      <div className="editorial-page cellar-page cellar-v2-page sx-v2-page-shell !px-0">
        <section className="sx-v2-content-rail cellar-v2-rail">
          {pageHeader(filtered.length)}

          {/* Results */}
          {isLoading ? (
            <EditorialCard className="cellar-v2-loading sx-v2-matte-panel">
              <div className="sx-v2-state-loader">
                <span className="sx-v2-kicker">Adega</span>
                <p>Organizando seus rótulos</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="sx-v2-loading-card">
                      <Skeleton className="h-24 w-full rounded-[20px]" />
                      <Skeleton className="mt-3 h-3 w-3/4 rounded-full" />
                      <Skeleton className="mt-2 h-3 w-1/2 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </EditorialCard>
          ) : filtered.length === 0 ? (
            <PremiumEmptyState
            icon={WineIcon}
            title={wines.length === 0 ? "Sua adega começa com a primeira garrafa" : "Nenhum rótulo nessa seleção"}
            description={
              wines.length === 0
                ? "Adicione um vinho para criar sua coleção, acompanhar janelas de consumo e receber curadoria."
                : "Ajuste a busca ou limpe os filtros para voltar à coleção completa."
            }
            primaryAction={
              wines.length === 0
                ? {
                    label: "Adicionar vinho",
                    onClick: () => setAddOpen(true),
                  }
                : undefined
            }
            secondaryAction={
              wines.length > 0
                ? {
                    label: "Limpar busca",
                    onClick: () => {
                      setQuery("");
                      setStyleFilter("todos");
                      setCountryFilter("all");
                      setDrinkWindowFilter("all");
                    },
                  }
                : undefined
            }
              className="adega-empty cellar-v2-empty"
            />
          ) : view === "grid" ? (
            <div className="adega-grid cellar-v2-grid">
            {filtered.map((w) => {
              const dw = resolveSuggestedDrinkWindow(w);
              const classification = classifyDrinkWindow({ current: currentYear, from: dw.from, until: dw.until });
              return (
                <article
                  key={w.id}
                  className="wine-card wine-card-grid cellar-v2-card sx-v2-collectible-surface"
                  onClick={() => setEditWine(w)}
                >
                  <div className="cellar-v2-card-stage sx-v2-bottle-stage">
                    {showLabels ? (
                      <WineLabelPreview
                        wine={w}
                        alt={w.name}
                        className="wine-card-image cellar-v2-card-image"
                        imageClassName="h-full w-full object-contain"
                        generated={false}
                        compact
                      />
                    ) : (
                      <div className="wine-card-image-placeholder cellar-v2-card-image-placeholder">
                        <WineIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="wine-card-body cellar-v2-card-body">
                    <span className={`drink-badge cellar-v2-drink-badge ${getDrinkBadgeClass(classification.status)}`}>
                      {classification.label}
                    </span>
                    <h3 className="wine-card-name cellar-v2-card-name sx-v2-wine-title">{w.name}</h3>
                    <p className="wine-card-vintage cellar-v2-card-meta sx-v2-wine-meta">
                      {[w.producer, w.vintage, w.region || w.country].filter(Boolean).join(" · ") || "Produtor e origem n/i"}
                    </p>
                    <div className="cellar-v2-card-tags">
                      <span className={`wine-type-chip cellar-v2-card-chip ${getWineTypeClass(w.style)}`}>
                        {getStyleFamily(w.style)}
                      </span>
                      <span className="wine-qty-badge cellar-v2-card-chip neutral">{w.quantity} garrafas</span>
                    </div>

                    <div className="wine-card-footer cellar-v2-card-footer">
                      <span className="wine-card-price cellar-v2-card-price">{formatWinePrice(w.current_value)}</span>
                      <button
                        type="button"
                        className="btn-abrir-card sx-v2-btn-capsule cellar-v2-open"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBottle(w);
                        }}
                        disabled={wineEvent.isPending}
                      >
                        Abrir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          ) : (
            <div className="adega-list cellar-v2-list sx-v2-floating-panel">
            {filtered.map((w) => {
              const family = getStyleFamily(w.style);
              const color = STYLE_COLORS[family];
              return (
                <div key={w.id} className="wine-card cellar-v2-row sx-v2-collectible-surface" onClick={() => setEditWine(w)}>
                  <div className="cellar-v2-row-stage sx-v2-object-stage">
                    {showLabels ? (
                      <WineLabelPreview
                        wine={w}
                        alt={w.name}
                        className="wine-card-thumb cellar-v2-row-thumb"
                        imageClassName="h-full w-full object-contain"
                        generated={false}
                        compact
                      />
                    ) : (
                      <div
                        className="wine-card-thumb cellar-v2-row-thumb"
                        style={{ background: `${color}14`, color }}
                      >
                        <WineIcon className="wine-card-thumb-placeholder h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="wine-card-body cellar-v2-row-body">
                    <h4 className="wine-card-name cellar-v2-row-name sx-v2-wine-title m-0">{w.name}</h4>
                    <p className="wine-card-meta cellar-v2-row-meta sx-v2-wine-meta">
                      {[w.producer, [w.region, w.country].filter(Boolean).join(", "), w.cellar_location]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="wine-card-tags cellar-v2-row-tags">
                      <span className={`wine-card-tag cellar-v2-row-chip ${getWineTypeClass(w.style)}`}>{getStyleFamily(w.style)}</span>
                      <span className="wine-card-tag cellar-v2-row-chip neutral">{w.quantity} garrafas</span>
                    </div>
                  </div>
                  <div className="wine-card-right cellar-v2-row-right">
                    {w.vintage && <span className="wine-card-year cellar-v2-row-year">{w.vintage}</span>}
                    {w.current_value != null && <span className="wine-card-price cellar-v2-row-price">{formatWinePrice(w.current_value)}</span>}
                    <button
                      type="button"
                      className="editorial-btn-open btn-abrir shrink-0 sx-v2-btn-capsule cellar-v2-open"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBottle(w);
                      }}
                      disabled={wineEvent.isPending}
                    >
                      Abrir
                    </button>
                    <ChevronRight className="wine-card-chevron cellar-v2-row-chevron h-3.5 w-3.5" />
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </section>
      </div>

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} />
      {editWine && (
        <EditWineDialog
          wine={editWine}
          open={!!editWine}
          onOpenChange={(v) => !v && setEditWine(null)}
        />
      )}
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
