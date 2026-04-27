// Minha Adega — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx CellarPage).
// Dados reais via Supabase.

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Star, Wine as WineIcon, X, ImageOff, Image as ImageIcon } from "@/icons/lucide";

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

export default function PersonalCellarPage() {
  const { data: wines = [], isLoading } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();
  useResolveWineImages(wines);
  const isMobile = useIsSmallScreen();

  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState("todos");
  const [drinkWindowFilter, setDrinkWindowFilter] = useState<"all" | "now" | "guard">("all");
  const [sort, setSort] = useState<
    "recent" | "value_low" | "value" | "vintage_old" | "vintage"
  >("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showLabels, setShowLabels] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("cellar:showLabels");
    return v === null ? true : v === "1";
  });
  const toggleLabels = () => {
    setShowLabels((prev) => {
      const next = !prev;
      try { window.localStorage.setItem("cellar:showLabels", next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editWine, setEditWine] = useState<Wine | null>(null);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [preSelectedWine, setPreSelectedWine] = useState<Wine | null>(null);
  const controlBase =
    "inline-flex h-10 items-center rounded-[14px] border px-3 text-[12.5px] font-medium tracking-[-0.01em] transition-all outline-none";
  const controlSurface = "bg-[rgba(255,255,255,0.78)] border-[rgba(95,111,82,0.12)] text-[#1a1713] shadow-[0_1px_0_rgba(95,111,82,0.04)]";
  const controlMuted = "bg-[rgba(255,255,255,0.68)] border-[rgba(95,111,82,0.10)] text-[rgba(58,51,39,0.72)]";
  const sectionLabel = "text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[rgba(58,51,39,0.48)]";

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

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className={`${controlBase} ${controlSurface} min-w-0 px-2.5 pr-8 text-[11.5px]`}
            style={{
              backgroundImage:
                "linear-gradient(45deg, transparent 50%, rgba(58,51,39,0.5) 50%), linear-gradient(135deg, rgba(58,51,39,0.5) 50%, transparent 50%)",
              backgroundPosition: "calc(100% - 14px) 15px, calc(100% - 9px) 15px",
              backgroundSize: "5px 5px, 5px 5px",
              backgroundRepeat: "no-repeat",
            }}
          >
            <option value="recent">Mais recentes</option>
            <option value="value_low">Mais baratos</option>
            <option value="value">Mais caros</option>
            <option value="vintage_old">Safra antiga</option>
            <option value="vintage">Safra nova</option>
          </select>
          <div className="editorial-segmented shrink-0">
            <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}>
              Grade
            </button>
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
              Lista
            </button>
          </div>
          <button
            type="button"
            onClick={toggleLabels}
            aria-pressed={showLabels}
            title={showLabels ? "Ocultar rótulos" : "Mostrar rótulos"}
            className={`flex h-9 w-9 items-center justify-center rounded-[14px] border transition-all ${controlMuted}`}
            style={{
              background: showLabels ? "rgba(95,111,82,0.12)" : "rgba(255,255,255,0.68)",
              borderColor: showLabels ? "rgba(95,111,82,0.18)" : "rgba(95,111,82,0.10)",
              color: showLabels ? "#5F7F52" : "rgba(58,51,39,0.55)",
            }}
          >
            {showLabels ? <ImageIcon className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="editorial-btn-primary h-9 rounded-[14px] px-3 text-[12px] font-semibold tracking-[-0.01em]"
            onClick={() => setAddOpen(true)}
          >
            + Adicionar
          </button>
        </div>

        <div className="rounded-[16px] border border-[rgba(95,111,82,0.08)] bg-[rgba(255,255,255,0.28)] px-2.5 py-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className={sectionLabel}>Tipo</span>
              {(["todos", "tinto", "branco", "rosé", "espumante", "sobremesa"] as const).map((s) => (
                <Chip
                  key={s}
                  active={styleFilter === s}
                  onClick={() => setStyleFilter(s)}
                  className="whitespace-nowrap normal-case tracking-[-0.01em]"
                >
                  {s === "todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Chip>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className={sectionLabel}>Janela</span>
              {[
                { key: "all", label: "Todos" },
                { key: "now", label: "Beber agora" },
                { key: "guard", label: "Em guarda" },
              ].map((option) => (
                <Chip
                  key={option.key}
                  active={drinkWindowFilter === option.key}
                  onClick={() => setDrinkWindowFilter(option.key as typeof drinkWindowFilter)}
                  className="whitespace-nowrap normal-case tracking-[-0.01em]"
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>
    </EditorialCard>
  );

  const filtered = useMemo(() => {
    let list = wines.filter((w) => {
      if (styleFilter !== "todos" && getStyleFamily(w.style) !== styleFilter) return false;
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
  }, [wines, query, styleFilter, drinkWindowFilter, sort]);

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
          <EditorialCard style={{ padding: "14px 16px 12px" }}>
            <div className="flex flex-col gap-3">
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

                <div className="flex flex-wrap items-center justify-end gap-2 lg:justify-end">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    className={`${controlBase} ${controlSurface} pr-9 appearance-none min-w-[210px]`}
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, transparent 50%, rgba(58,51,39,0.5) 50%), linear-gradient(135deg, rgba(58,51,39,0.5) 50%, transparent 50%)",
                      backgroundPosition: "calc(100% - 16px) 16px, calc(100% - 11px) 16px",
                      backgroundSize: "5px 5px, 5px 5px",
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    <option value="recent">Adicionados mais recentemente</option>
                    <option value="value_low">Mais baratos</option>
                    <option value="value">Mais caros</option>
                    <option value="vintage_old">Safra mais antiga</option>
                    <option value="vintage">Safra mais nova</option>
                  </select>
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
                    onClick={toggleLabels}
                    aria-pressed={showLabels}
                    title={showLabels ? "Ocultar rótulos" : "Mostrar rótulos"}
                    className={`flex h-10 w-10 items-center justify-center rounded-[14px] border transition-all ${controlMuted}`}
                    style={{
                      background: showLabels ? "rgba(95,111,82,0.12)" : "rgba(255,255,255,0.68)",
                      borderColor: showLabels ? "rgba(95,111,82,0.18)" : "rgba(95,111,82,0.10)",
                      color: showLabels ? "#5F7F52" : "rgba(58,51,39,0.55)",
                    }}
                  >
                    {showLabels ? <ImageIcon className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="editorial-btn-primary h-10 rounded-[14px] px-4 text-[12.5px] font-semibold tracking-[-0.01em]"
                    onClick={() => setAddOpen(true)}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-[16px] bg-[rgba(255,255,255,0.28)] px-2.5 py-2.25 shadow-[0_1px_0_rgba(95,111,82,0.035)] sm:px-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={sectionLabel}>Tipo</span>
                  {(["todos", "tinto", "branco", "rosé", "espumante", "sobremesa"] as const).map((s) => (
                    <Chip
                      key={s}
                      active={styleFilter === s}
                      onClick={() => setStyleFilter(s)}
                      className="normal-case tracking-[-0.01em]"
                    >
                      {s === "todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Chip>
                  ))}
                </div>

                <div className="h-px bg-[rgba(95,111,82,0.055)]" />

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={sectionLabel}>Janela</span>
                  {[
                    { key: "all", label: "Todos" },
                    { key: "now", label: "Beber agora" },
                    { key: "guard", label: "Em guarda" },
                  ].map((option) => (
                    <Chip
                      key={option.key}
                      active={drinkWindowFilter === option.key}
                      onClick={() => setDrinkWindowFilter(option.key as typeof drinkWindowFilter)}
                      className="normal-case tracking-[-0.01em]"
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:[grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]"
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
              return (
                <EditorialCard
                  key={w.id}
                  className="flex h-full flex-col"
                  style={{ padding: 18, cursor: "pointer" }}
                >
                  <div className="flex min-h-0 flex-1 flex-col" onClick={() => setEditWine(w)}>
                    {showLabels && (
                      <WineLabelPreview
                        wine={w}
                        alt={w.name}
                        className="mb-3.5 h-[176px] sm:h-[168px]"
                        imageClassName="h-[176px] w-full object-contain sm:h-[168px]"
                        generated={false}
                        compact
                      />
                    )}
                    <div className="mb-3 flex min-h-6 items-start justify-between">
                      <div
                        className="h-6 w-6 rounded-full"
                        style={{
                          background: `linear-gradient(145deg, ${color}, ${color}cc)`,
                          boxShadow:
                            "0 2px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)",
                        }}
                      />
                      {w.rating != null && (
                        <div
                          className="flex items-center gap-1 text-[12px] font-bold tabular-nums"
                          style={{ color: "#B48C3A" }}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" /> {Number(w.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    <h3
                      className="min-h-[46px] font-serif"
                      style={{
                        fontFamily: "'Libre Baskerville', Georgia, serif",
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: "#1a1713",
                        lineHeight: 1.25,
                      }}
                    >
                      {w.name}
                    </h3>
                    <p
                      className="mt-1.5 min-h-[18px] truncate text-[12.5px]"
                      style={{ color: "rgba(58,51,39,0.6)" }}
                    >
                      {[w.vintage, w.region, w.country].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-3.5 min-h-[42px]">
                      <DrinkWindow from={dw.from} until={dw.until} current={currentYear} estimated={dw.estimated} />
                    </div>
                  </div>
                  <div
                    className="mt-4 border-t pt-4"
                    style={{ borderColor: "rgba(95,111,82,0.1)" }}
                  >
                    <div className="flex min-h-[96px] flex-col gap-3">
                      <div className="flex min-h-[32px] flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <StyleBadge
                          style={w.style}
                          className="min-h-[24px] text-[11px] leading-none"
                        />
                        <div className="text-right">
                          {w.current_value != null && (
                            <div
                              className="text-[15px] font-bold tracking-[-0.02em]"
                              style={{ color: "#1a1713" }}
                            >
                              R$ {Number(w.current_value).toLocaleString("pt-BR")}
                            </div>
                          )}
                          <div
                            className="text-[11.5px] font-semibold"
                            style={{ color: "rgba(58,51,39,0.55)" }}
                          >
                            {w.quantity} un.
                          </div>
                        </div>
                      </div>
                      <div className="flex min-h-[42px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span
                          className="inline-flex h-8 w-fit items-center rounded-full px-3.5 text-[11px] font-bold tracking-[0.02em] whitespace-nowrap"
                          style={statusTone}
                        >
                          {classification.label}
                        </span>
                        <button
                          type="button"
                          className="editorial-btn-open w-full sm:w-auto"
                          style={{ minHeight: 42, padding: "0 16px", fontSize: 13 }}
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
          </motion.div>
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
