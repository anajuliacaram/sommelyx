// Minha Adega — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx CellarPage).
// Dados reais via Supabase.

import { useMemo, useState, useEffect } from "react";
import { ArrowUpDown, ChevronRight, Globe, Plus, Search, Star, Wine as WineIcon, X } from "@/icons/lucide";

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
      <section className="adega-header">
        <div className="adega-title-row">
          <div className="min-w-0">
            <p className="adega-eyebrow">Adega</p>
            <h1 className="adega-title">Minha Adega</h1>
          </div>
          <span className="adega-count adega-count-badge">
            <strong>{filteredCount}</strong> / {wines.length} vinhos
          </span>
        </div>
      </section>

      <div className="overview-search adega-search-wrap">
        <Search className="adega-search-icon h-4 w-4" />
        <input
          className="adega-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, produtor, região…"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Limpar" className="text-[var(--sx-t-muted)]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="adega-controls">
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger aria-label="Ordenar vinhos" className="adega-filter-btn h-auto min-w-0 shadow-none">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--sx-bordeaux)]" />
            <span className="min-w-0 text-left">
              <span className="filter-label">Ordenar</span>
              <span className="block truncate">{sortLabel.replace("Ordenar: ", "")}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Ordenar: Mais recentes</SelectItem>
            <SelectItem value="value_low">Ordenar: Mais baratos</SelectItem>
            <SelectItem value="value">Ordenar: Mais caros</SelectItem>
            <SelectItem value="vintage_old">Ordenar: Safra antiga</SelectItem>
            <SelectItem value="vintage">Ordenar: Safra nova</SelectItem>
          </SelectContent>
        </Select>

        <Select value={countryFilter} onValueChange={(v) => setCountryFilter(v)}>
          <SelectTrigger aria-label="Filtrar por país" className="adega-filter-btn h-auto min-w-0 shadow-none">
            <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--sx-olive)]" />
            <span className="min-w-0 text-left">
              <span className="filter-label">País</span>
              <span className="block truncate">{countryLabel.replace("País: ", "")}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">País</SelectItem>
            {countryOptions.filter((o) => o.key !== "all").map((option) => (
              <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button type="button" className="btn-adicionar-adega cellar-add-button" onClick={() => setAddOpen(true)} aria-label="Adicionar vinho">
          <Plus className="h-3.5 w-3.5" />
          <span className="cellar-add-full">Adicionar vinho</span>
          <span className="cellar-add-short">Adicionar</span>
        </button>
      </div>

      <div className="chips-row adega-filters-row">
        {visibleStyleOptions.map((s) => {
          const styleKey = s.key === "todos" ? "todos" : s.key === "rosé" ? "rose" : s.key;
          return (
            <button
              key={s.key}
              type="button"
              data-style={styleKey}
              className={`chip adega-filter-chip ${styleKey} ${styleFilter === s.key ? "active" : ""}`}
              onClick={() => setStyleFilter(s.key)}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {!isMobile && (
        <div className="chips-row adega-filters-row adega-drink-window-row">
          {drinkWindowOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`chip adega-filter-chip ${option.key === "guard" ? "olive" : ""} ${drinkWindowFilter === option.key ? "active" : ""}`}
              onClick={() => setDrinkWindowFilter(option.key as typeof drinkWindowFilter)}
            >
              {option.label}
            </button>
          ))}
          <span className="ml-auto inline-flex rounded-[var(--sx-r-pill)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-card)] p-1">
            <button className={`chip !border-0 !px-3 ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>
              Grade
            </button>
            <button className={`chip !border-0 !px-3 ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
              Lista
            </button>
          </span>
        </div>
      )}
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
      <div className="editorial-page cellar-page !px-0">
        {pageHeader(filtered.length)}

        {/* Results */}
        {isLoading ? (
          <EditorialCard>
            <p style={{ color: "rgba(58,51,39,0.5)" }}>Carregando adega…</p>
          </EditorialCard>
        ) : filtered.length === 0 ? (
          <PremiumEmptyState
            icon={WineIcon}
            title={wines.length === 0 ? "Sua adega está vazia" : "Nenhum vinho encontrado"}
            description={
              wines.length === 0
                ? "Adicione seu primeiro vinho para começar a organizar a coleção e acompanhar janelas de consumo."
                : "Ajuste a busca ou os filtros para encontrar outro rótulo."
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
            className="adega-empty"
          />
        ) : view === "grid" ? (
          <div className="adega-grid">
            {filtered.map((w) => {
              const dw = resolveSuggestedDrinkWindow(w);
              const classification = classifyDrinkWindow({ current: currentYear, from: dw.from, until: dw.until });
              return (
                <article
                  key={w.id}
                  className="wine-card wine-card-grid"
                  onClick={() => setEditWine(w)}
                >
                  {showLabels ? (
                    <WineLabelPreview
                      wine={w}
                      alt={w.name}
                      className="wine-card-image"
                      imageClassName="h-full w-full object-contain"
                      generated={false}
                      compact
                    />
                  ) : (
                    <div className="wine-card-image-placeholder">
                      <WineIcon className="h-8 w-8" />
                    </div>
                  )}

                  <div className="wine-card-body">
                    <span className={`drink-badge ${getDrinkBadgeClass(classification.status)}`}>
                      {classification.label}
                    </span>
                    <h3 className="wine-card-name">{w.name}</h3>
                    <p className="wine-card-vintage">
                      {[w.vintage, w.region || w.country].filter(Boolean).join(" · ") || "Safra NV · Região n/i"}
                    </p>
                    <span className={`wine-type-chip ${getWineTypeClass(w.style)}`}>
                      {getStyleFamily(w.style)}
                    </span>
                    <span className="wine-qty-badge">{w.quantity} un.</span>

                    <div className="wine-card-footer">
                      <span className="wine-card-price">{formatWinePrice(w.current_value)}</span>
                      <button
                        type="button"
                        className="btn-abrir-card"
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
          <div className="adega-list">
            {filtered.map((w) => {
              const family = getStyleFamily(w.style);
              const color = STYLE_COLORS[family];
              return (
                <div key={w.id} className="wine-card" onClick={() => setEditWine(w)}>
                  {showLabels ? (
                    <WineLabelPreview
                      wine={w}
                      alt={w.name}
                      className="wine-card-thumb"
                      imageClassName="h-full w-full object-contain"
                      generated={false}
                      compact
                    />
                  ) : (
                    <div
                      className="wine-card-thumb"
                      style={{ background: `${color}14`, color }}
                    >
                      <WineIcon className="wine-card-thumb-placeholder h-5 w-5" />
                    </div>
                  )}
                  <div className="wine-card-body">
                    <h4 className="wine-card-name m-0">{w.name}</h4>
                    <p className="wine-card-meta">
                      {[w.producer, [w.region, w.country].filter(Boolean).join(", "), w.cellar_location]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="wine-card-tags">
                      <span className={`wine-card-tag ${getWineTypeClass(w.style)}`}>{getStyleFamily(w.style)}</span>
                      <span className="wine-card-tag neutral">{w.quantity} un.</span>
                    </div>
                  </div>
                  <div className="wine-card-right">
                    {w.vintage && <span className="wine-card-year">{w.vintage}</span>}
                    {w.current_value != null && <span className="wine-card-price">{formatWinePrice(w.current_value)}</span>}
                    {w.rating != null && (
                      <div
                        className="flex items-center gap-1 text-[11px] font-semibold tabular-nums"
                        style={{ color: "#B48C3A" }}
                      >
                        <Star className="h-3 w-3 fill-current" /> {Number(w.rating).toFixed(1)}
                      </div>
                    )}
                    <button
                      type="button"
                      className="editorial-btn-open btn-abrir shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBottle(w);
                      }}
                      disabled={wineEvent.isPending}
                    >
                      Abrir
                    </button>
                    <ChevronRight className="wine-card-chevron h-3.5 w-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
