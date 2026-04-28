// Minha Adega — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx CellarPage).
// Dados reais via Supabase.

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Globe, Search, Star, Wine as WineIcon, X } from "@/icons/lucide";

import { AddWineDialog } from "@/components/AddWineDialog";
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";
import { EditWineDialog } from "@/components/EditWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import {
  Chip,
  DrinkWindow,
  EditorialCard,
  Kicker,
  STYLE_COLORS,
  StyleBadge,
  getStyleFamily,
  classifyDrinkWindow,
  getDrinkWindowIndicatorPosition,
  resolveSuggestedDrinkWindow,
} from "@/components/editorial/EditorialPrimitives";
import { useToast } from "@/hooks/use-toast";
import { useWineEvent, useWines, type Wine } from "@/hooks/useWines";
import { useResolveWineImages } from "@/hooks/useResolveWineImages";
import { WineLabelPreview } from "@/components/WineLabelPreview";
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

export default function PersonalCellarPage() {
  const { data: wines = [], isLoading } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();
  useResolveWineImages(wines);
  const isMobile = useIsSmallScreen();

  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState("todos");
  const [countryFilter, setCountryFilter] = useState("all");
  const [drinkWindowFilter, setDrinkWindowFilter] = useState<"all" | "now" | "guard">("all");
  const [sort, setSort] = useState<
    "recent" | "value_low" | "value" | "vintage_old" | "vintage"
  >("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
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
  const controlBase =
    "inline-flex h-9 sm:h-10 items-center rounded-[12px] sm:rounded-[14px] border px-2.5 sm:px-3 text-[11.5px] sm:text-[12.5px] font-medium tracking-[-0.01em] transition-all outline-none";
  const controlSurface = "bg-[rgba(255,255,255,0.78)] border-[rgba(95,111,82,0.12)] text-[#1a1713] shadow-[0_1px_0_rgba(95,111,82,0.04)]";
  const controlMuted = "bg-[rgba(255,255,255,0.68)] border-[rgba(95,111,82,0.10)] text-[rgba(58,51,39,0.72)]";
  const sectionLabel = "text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[rgba(58,51,39,0.48)]";

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

  const mobileHeader = (filteredCount: number) => (
    <EditorialCard style={{ padding: "12px 12px 10px" }}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Kicker>Adega</Kicker>
            <h1 className="editorial-page-h1 mt-0.5 !text-[24px] leading-tight tracking-[-0.04em]">
              Minha Adega
            </h1>
            <div className="mt-1 text-[11px] font-medium tracking-[-0.01em]" style={{ color: "rgba(58,51,39,0.58)" }}>
              <b style={{ color: "#1a1713", fontWeight: 700 }}>{filteredCount}</b> / {wines.length} vinhos
            </div>
          </div>
        </div>

        <div className="editorial-search min-w-0 h-10 px-3">
          <Search className="h-4 w-4" style={{ color: "rgba(58,51,39,0.4)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, produtor, região…"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar">
              <X className="h-4 w-4" style={{ color: "rgba(58,51,39,0.4)" }} />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-1.5">
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger
                  aria-label="Ordenar vinhos"
                  className={`${controlBase} ${controlSurface} h-9 min-w-[118px] px-2.5 text-[11.5px]`}
                >
                  <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                    <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#7B1E2B]/75" />
                    <span className="min-w-0 truncate">{sortLabel}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-black/10 bg-white/98 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-md">
                  <SelectItem value="recent">Ordenar: Mais recentes</SelectItem>
                  <SelectItem value="value_low">Ordenar: Mais baratos</SelectItem>
                  <SelectItem value="value">Ordenar: Mais caros</SelectItem>
                  <SelectItem value="vintage_old">Ordenar: Safra antiga</SelectItem>
                  <SelectItem value="vintage">Ordenar: Safra nova</SelectItem>
                </SelectContent>
              </Select>
              <Select value={countryFilter} onValueChange={(v) => setCountryFilter(v)}>
                <SelectTrigger
                  aria-label="Filtrar por país"
                  className={`${controlBase} ${controlSurface} h-9 min-w-[104px] px-2.5 text-[11.5px]`}
                >
                  <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-[#5F7F52]/80" />
                    <span className="min-w-0 truncate">{countryLabel}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-black/10 bg-white/98 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-md">
                  <SelectItem value="all">País</SelectItem>
                  {countryOptions.filter((o) => o.key !== "all").map((option) => (
                    <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="editorial-segmented shrink-0">
                <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}>
                  Grade
                </button>
                <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
                  Lista
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="editorial-btn-primary h-9 w-full rounded-[14px] px-3 text-[12px] font-semibold tracking-[-0.01em]"
            onClick={() => setAddOpen(true)}
          >
            + Adicionar
          </button>
        </div>

          <div className="rounded-[14px] border border-[rgba(95,111,82,0.08)] bg-[rgba(255,255,255,0.28)] px-2 py-1.5">
            <div className="space-y-1.25">
              <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max items-center gap-1.5">
                <span className={`${sectionLabel} shrink-0 whitespace-nowrap`}>Tipo</span>
                {styleOptions.map((s) => (
                  <Chip
                    key={s.key}
                    active={styleFilter === s.key}
                    onClick={() => setStyleFilter(s.key)}
                    className="h-[24px] px-2 text-[10px] normal-case tracking-[-0.01em] shrink-0 whitespace-nowrap"
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-1.5">
                <span className={`${sectionLabel} shrink-0 whitespace-nowrap`}>Janela</span>
                {drinkWindowOptions.map((option) => (
                  <Chip
                    key={option.key}
                    active={drinkWindowFilter === option.key}
                    onClick={() => setDrinkWindowFilter(option.key as typeof drinkWindowFilter)}
                    className="h-[24px] px-2 text-[10px] normal-case tracking-[-0.01em] shrink-0 whitespace-nowrap"
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </EditorialCard>
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
      <div className="editorial-page">
        {isMobile ? (
          mobileHeader(filtered.length)
        ) : (
          <EditorialCard style={{ padding: "12px 14px 10px" }}>
            <div className="flex flex-col gap-2">
              <div className="grid gap-2.5 lg:grid-cols-[minmax(210px,300px)_minmax(0,1fr)_auto] lg:items-center lg:gap-3">
                <div className="flex min-w-0 flex-col">
                  <Kicker>Adega</Kicker>
                  <h1 className="editorial-page-h1 mt-0.5 !text-[26px] sm:!text-[28px] leading-tight tracking-[-0.04em]">
                    Minha Adega
                  </h1>
                  <div className="mt-1 text-[12px] font-medium tracking-[-0.01em]" style={{ color: "rgba(58,51,39,0.58)" }}>
                    <b style={{ color: "#1a1713", fontWeight: 700 }}>{filtered.length}</b> / {wines.length} vinhos
                  </div>
                </div>

                <div className="editorial-search min-w-0">
                  <Search className="h-4 w-4" style={{ color: "rgba(58,51,39,0.4)" }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome, produtor, região…"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} aria-label="Limpar">
                      <X className="h-4 w-4" style={{ color: "rgba(58,51,39,0.4)" }} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5 lg:justify-end">
                  <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                    <SelectTrigger
                      aria-label="Ordenar vinhos"
                      className={`${controlBase} ${controlSurface} min-w-[170px] lg:min-w-[190px] px-3 pr-3 text-[11.5px] sm:text-[12px]`}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#7B1E2B]/75" />
                        <span className="min-w-0 truncate">{sortLabel}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-black/10 bg-white/98 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-md">
                      <SelectItem value="recent">Ordenar: Mais recentes</SelectItem>
                      <SelectItem value="value_low">Ordenar: Mais baratos</SelectItem>
                      <SelectItem value="value">Ordenar: Mais caros</SelectItem>
                      <SelectItem value="vintage_old">Ordenar: Safra antiga</SelectItem>
                      <SelectItem value="vintage">Ordenar: Safra nova</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={countryFilter} onValueChange={(v) => setCountryFilter(v)}>
                    <SelectTrigger
                      aria-label="Filtrar por país"
                      className={`${controlBase} ${controlSurface} min-w-[130px] lg:min-w-[150px] px-3 pr-3 text-[11.5px] sm:text-[12px]`}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-[#5F7F52]/80" />
                        <span className="min-w-0 truncate">{countryLabel}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-black/10 bg-white/98 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-md">
                      <SelectItem value="all">País</SelectItem>
                      {countryOptions.filter((o) => o.key !== "all").map((option) => (
                        <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="editorial-segmented">
                    <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}>
                      Grade
                    </button>
                    <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
                      Lista
                    </button>
                  </div>
                  <button
                    type="button"
                    className="editorial-btn-primary h-9 sm:h-10 rounded-[12px] sm:rounded-[14px] px-3.5 text-[12px] sm:text-[12.5px] font-semibold tracking-[-0.01em]"
                    onClick={() => setAddOpen(true)}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              <div className="rounded-[14px] bg-[rgba(255,255,255,0.24)] px-2.5 py-1.5 shadow-[0_1px_0_rgba(95,111,82,0.03)]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className={sectionLabel}>Tipo</span>
                  {styleOptions.map((s) => (
                    <Chip
                      key={s.key}
                      active={styleFilter === s.key}
                      onClick={() => setStyleFilter(s.key)}
                      className="h-[24px] px-2 text-[10px] normal-case tracking-[-0.01em]"
                    >
                      {s.label}
                    </Chip>
                  ))}
                  <span className="mx-1 hidden h-4 w-px bg-[rgba(95,111,82,0.10)] sm:inline-block" />
                  <span className={sectionLabel}>Janela</span>
                  {drinkWindowOptions.map((option) => (
                    <Chip
                      key={option.key}
                      active={drinkWindowFilter === option.key}
                      onClick={() => setDrinkWindowFilter(option.key as typeof drinkWindowFilter)}
                      className="h-[24px] px-2 text-[10px] normal-case tracking-[-0.01em]"
                    >
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </EditorialCard>
        )}

        {/* Results */}
        {isLoading ? (
          <EditorialCard>
            <p style={{ color: "rgba(58,51,39,0.5)" }}>Carregando adega…</p>
          </EditorialCard>
        ) : filtered.length === 0 ? (
          <EditorialCard>
            <div className="editorial-empty">
              <p
                className="font-serif text-[16px] font-semibold"
                style={{
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  color: "rgba(58,51,39,0.7)",
                }}
              >
                {wines.length === 0 ? "Sua adega está vazia" : "Nenhum vinho encontrado"}
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "rgba(58,51,39,0.48)" }}>
                {wines.length === 0
                  ? "Adicione seu primeiro vinho para começar."
                  : "Ajuste a busca ou filtros."}
              </p>
            </div>
          </EditorialCard>
        ) : view === "grid" ? (
          <div
            className={isMobile
              ? "grid grid-cols-2 gap-2"
              : "grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:[grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]"}
          >
            {filtered.map((w) => {
              const family = getStyleFamily(w.style);
              const color = STYLE_COLORS[family];
              const dw = resolveSuggestedDrinkWindow(w);
              const classification = classifyDrinkWindow({ current: currentYear, from: dw.from, until: dw.until });
              const past = classification.status === "past";
              const statusTone = past
                ? { background: "rgba(201,107,85,0.12)", color: "#B55A43" }
                : classification.status === "now"
                  ? { background: "rgba(95,127,82,0.14)", color: "#4C6B43" }
                  : classification.status === "soon"
                    ? { background: "rgba(198,167,104,0.16)", color: "#8B6914" }
                    : { background: "rgba(107,130,152,0.12)", color: "#566C82" };
              return isMobile ? (
                <EditorialCard
                  key={w.id}
                  className="flex h-full flex-col overflow-hidden"
                  style={{ padding: 8, cursor: "pointer" }}
                >
                  <div className="flex min-h-0 flex-1 flex-col" onClick={() => setEditWine(w)}>
                    {showLabels && (
                      <WineLabelPreview
                        wine={w}
                        alt={w.name}
                        className="mb-2 h-[88px] overflow-hidden rounded-[14px]"
                        imageClassName="h-[88px] w-full object-cover"
                        generated={false}
                        compact
                      />
                    )}

                    <div className="mb-1.25 flex min-h-0 items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <div
                          className="mt-[0.34rem] h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            background: `linear-gradient(145deg, ${color}, ${color}cc)`,
                            boxShadow:
                              "0 1px 3px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.28)",
                          }}
                        />
                        <h3
                          className="font-serif text-[13px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1a1713]"
                          style={{
                            fontFamily: "'Libre Baskerville', Georgia, serif",
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                            overflow: "hidden",
                            minHeight: 0,
                          }}
                        >
                          {w.name}
                        </h3>
                      </div>
                      {w.rating != null && (
                        <div
                          className="flex items-center gap-1 text-[9.5px] font-bold tabular-nums"
                          style={{ color: "#B48C3A" }}
                        >
                          <Star className="h-2.5 w-2.5 fill-current" /> {Number(w.rating).toFixed(1)}
                        </div>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-[10px] font-medium text-[#6F665C]">
                      {[w.vintage, w.region || w.country].filter(Boolean).join(" · ") || "Safra NV · Região n/i"}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <StyleBadge
                        style={w.style}
                        className="min-h-[18px] text-[8.5px] leading-none"
                      />
                      <span
                        className="text-[9.5px] font-semibold text-[#6F665C]"
                      >
                        {w.quantity} un.
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span
                        className="inline-flex h-5.5 items-center rounded-full px-2.5 text-[8.5px] font-bold tracking-[0.02em] whitespace-nowrap"
                        style={statusTone}
                      >
                        {classification.label}
                      </span>
                      <p className="text-right text-[9.5px] font-semibold text-[#1a1713]">
                        {w.current_value != null
                          ? `R$ ${Number(w.current_value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                          : "Preço n/i"}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="editorial-btn-open mt-1.5 h-7.5 w-full rounded-full px-3 text-[10.5px]"
                      style={{ minHeight: 30 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBottle(w);
                      }}
                      disabled={wineEvent.isPending}
                    >
                      Abrir
                    </button>
                  </div>
                </EditorialCard>
              ) : (
                <EditorialCard
                  key={w.id}
                  className="flex h-full flex-col"
                  style={{ padding: 16, cursor: "pointer" }}
                >
                  <div className="flex min-h-0 flex-1 flex-col" onClick={() => setEditWine(w)}>
                    {showLabels && (
                      <WineLabelPreview
                        wine={w}
                        alt={w.name}
                        className="mb-2.5 h-[176px] sm:h-[168px]"
                        imageClassName="h-[176px] w-full object-contain sm:h-[168px]"
                        generated={false}
                        compact
                      />
                    )}
                    <div className="mb-1.5 flex min-h-0 items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <div
                          className="mt-[0.38rem] h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            background: `linear-gradient(145deg, ${color}, ${color}cc)`,
                            boxShadow:
                              "0 1px 3px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.28)",
                          }}
                        />
                        <h3
                          className="min-w-0 font-serif text-[18px] font-semibold leading-[1.18] tracking-[-0.01em]"
                          style={{
                            fontFamily: "'Libre Baskerville', Georgia, serif",
                            color: "#1a1713",
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                            overflow: "hidden",
                          }}
                        >
                          {w.name}
                        </h3>
                      </div>
                      {w.rating != null && (
                        <div
                          className="flex items-center gap-1 text-[12px] font-bold tabular-nums"
                          style={{ color: "#B48C3A" }}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" /> {Number(w.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    <p
                      className="mt-0.5 min-h-[18px] truncate text-[12.25px]"
                      style={{ color: "rgba(58,51,39,0.6)" }}
                    >
                      {[w.vintage, w.region, w.country].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-2.25 min-h-[34px]">
                      <DrinkWindow from={dw.from} until={dw.until} current={currentYear} estimated={dw.estimated} />
                    </div>
                  </div>
                  <div
                    className="mt-3 pt-0"
                  >
                    <div className="flex min-h-[84px] flex-col gap-2.5">
                      <div className="flex min-h-[28px] flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <StyleBadge
                          style={w.style}
                          className="min-h-[22px] text-[10px] leading-none"
                        />
                        <div className="text-right">
                          {w.current_value != null && (
                            <div
                              className="text-[14px] font-bold tracking-[-0.02em]"
                              style={{ color: "#1a1713" }}
                            >
                              R$ {Number(w.current_value).toLocaleString("pt-BR")}
                            </div>
                          )}
                          <div
                            className="text-[11px] font-semibold"
                            style={{ color: "rgba(58,51,39,0.55)" }}
                          >
                            {w.quantity} un.
                          </div>
                        </div>
                      </div>
                      <div className="flex min-h-[34px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span
                          className="inline-flex h-7 w-fit items-center rounded-full px-3 text-[10px] font-bold tracking-[0.02em] whitespace-nowrap"
                          style={statusTone}
                        >
                          {classification.label}
                        </span>
                        <button
                          type="button"
                          className="editorial-btn-open w-full sm:w-auto"
                          style={{ minHeight: 36, padding: "0 14px", fontSize: 12 }}
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
                  </div>
                </EditorialCard>
              );
            })}
          </div>
        ) : (
          <EditorialCard style={{ padding: "8px" }}>
            {filtered.map((w) => {
              const family = getStyleFamily(w.style);
              const color = STYLE_COLORS[family];
              const dwRow = resolveSuggestedDrinkWindow(w);
              const classification = classifyDrinkWindow({ current: currentYear, from: dwRow.from, until: dwRow.until });
              return (
                <div key={w.id} className="editorial-row" onClick={() => setEditWine(w)}>
                  {showLabels ? (
                    <WineLabelPreview
                      wine={w}
                      alt={w.name}
                      className="editorial-bottle-icon overflow-hidden"
                      imageClassName="h-full w-full object-contain"
                      generated={false}
                      compact
                    />
                  ) : (
                    <div
                      className="editorial-bottle-icon"
                      style={{ background: `${color}14`, color }}
                    >
                      <WineIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="text-[14px] font-bold" style={{ color: "#1a1713" }}>
                        {w.name}
                      </h4>
                      {w.vintage && (
                        <span
                          className="text-[11px] tabular-nums"
                          style={{ color: "rgba(58,51,39,0.55)" }}
                        >
                          {w.vintage}
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-0.5 truncate text-[11px]"
                      style={{ color: "rgba(58,51,39,0.58)" }}
                    >
                      {[w.producer, [w.region, w.country].filter(Boolean).join(", "), w.cellar_location]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <StyleBadge style={w.style} />
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: "rgba(58,51,39,0.5)" }}
                      >
                        {w.quantity} un. · janela {dwRow.from}–{dwRow.until}
                        {dwRow.estimated ? " (sugerida)" : ""} · {classification.label}
                      </span>
                    </div>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1 md:flex">
                    {w.rating != null && (
                      <div
                        className="flex items-center gap-1 text-[11px] font-semibold tabular-nums"
                        style={{ color: "#B48C3A" }}
                      >
                        <Star className="h-3 w-3 fill-current" /> {Number(w.rating).toFixed(1)}
                      </div>
                    )}
                    {w.current_value != null && (
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: "rgba(58,51,39,0.45)" }}
                      >
                        R$ {Number(w.current_value).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="editorial-btn-open shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBottle(w);
                    }}
                    disabled={wineEvent.isPending}
                  >
                    Abrir
                  </button>
                </div>
              );
            })}
          </EditorialCard>
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
