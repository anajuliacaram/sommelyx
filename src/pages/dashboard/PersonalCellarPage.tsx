// Minha Adega — perfil Pessoal
// Design "Editorial" fiel ao design-reference (extras.jsx CellarPage).
// Dados reais via Supabase.

import { useMemo, useState } from "react";
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

export default function PersonalCellarPage() {
  const { data: wines = [], isLoading } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();
  useResolveWineImages(wines);

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
        <EditorialCard style={{ padding: "16px 18px 14px" }}>
          <div className="flex flex-col gap-3.5">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,320px)_minmax(0,1fr)_auto] lg:items-start lg:gap-3.5">
              <div className="flex min-w-0 flex-col">
                  <Kicker>Adega</Kicker>
                  <h1 className="editorial-page-h1 mt-0.5 !text-[26px] sm:!text-[28px] leading-tight tracking-[-0.04em]">
                    Minha Adega
                  </h1>
                  <div className="mt-1 text-[12px] font-medium tracking-[-0.01em]" style={{ color: "rgba(58,51,39,0.58)" }}>
                    <b style={{ color: "#1a1713", fontWeight: 700 }}>{filtered.length}</b> / {wines.length} vinhos
                  </div>
                </div>

              <div className="editorial-search min-w-0 h-10 rounded-[14px] border border-[rgba(95,111,82,0.12)] bg-[rgba(255,255,255,0.82)] px-3 shadow-[0_1px_0_rgba(95,111,82,0.04)]">
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
                  className={`${controlBase} ${controlSurface} pr-9 appearance-none`}
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, transparent 50%, rgba(58,51,39,0.5) 50%), linear-gradient(135deg, rgba(58,51,39,0.5) 50%, transparent 50%)",
                    backgroundPosition: "calc(100% - 16px) 17px, calc(100% - 11px) 17px",
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

            <div className="flex flex-col gap-2 rounded-[16px] bg-[rgba(255,255,255,0.32)] px-2.5 py-2.5 shadow-[0_1px_0_rgba(95,111,82,0.04)] sm:px-3">
              <div className="flex flex-wrap items-center gap-2">
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

              <div className="h-px bg-[rgba(95,111,82,0.06)]" />

              <div className="flex flex-wrap items-center gap-2">
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
            className="grid gap-3 grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]"
          >
            {filtered.map((w) => {
              const family = getStyleFamily(w.style);
              const color = STYLE_COLORS[family];
              const dw = resolveSuggestedDrinkWindow(w);
              const classification = classifyDrinkWindow({ current: currentYear, from: dw.from, until: dw.until });
              const inWindow = classification.status === "now";
              const past = classification.status === "past";
              return (
                <EditorialCard key={w.id} style={{ padding: 18, cursor: "pointer" }}>
                  <div onClick={() => setEditWine(w)}>
                    {showLabels && (
                      <WineLabelPreview
                        wine={w}
                        alt={w.name}
                        className="mb-3 h-[160px]"
                        imageClassName="h-[160px] w-full object-contain"
                        generated={false}
                        compact
                      />
                    )}
                    <div className="mb-3 flex items-start justify-between">
                      <div
                        className="h-[22px] w-[22px] rounded-full"
                        style={{
                          background: `linear-gradient(145deg, ${color}, ${color}cc)`,
                          boxShadow:
                            "0 2px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)",
                        }}
                      />
                      {w.rating != null && (
                        <div
                          className="flex items-center gap-1 text-[10.5px] font-bold tabular-nums"
                          style={{ color: "#B48C3A" }}
                        >
                          <Star className="h-3 w-3 fill-current" /> {Number(w.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    <h3
                      className="font-serif"
                      style={{
                        fontFamily: "'Libre Baskerville', Georgia, serif",
                        fontSize: 15,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: "#1a1713",
                        lineHeight: 1.25,
                      }}
                    >
                      {w.name}
                    </h3>
                    <p
                      className="mt-1 truncate text-[11px]"
                      style={{ color: "rgba(58,51,39,0.6)" }}
                    >
                      {[w.vintage, w.region, w.country].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-3">
                      <DrinkWindow from={dw.from} until={dw.until} current={currentYear} estimated={dw.estimated} />
                    </div>
                  </div>
                  <div
                    className="mt-3 flex items-center justify-between border-t pt-3"
                    style={{ borderColor: "rgba(95,111,82,0.1)" }}
                  >
                    <div>
                      <StyleBadge style={w.style} />
                      <div
                        className="mt-1 text-[10px] font-semibold"
                        style={{ color: "rgba(58,51,39,0.55)" }}
                      >
                        {w.quantity} un.
                        {w.current_value != null
                          ? ` · R$ ${Number(w.current_value).toLocaleString("pt-BR")}`
                          : ""}
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em]"
                      style={{
                        background: past ? "rgba(201,107,85,0.12)" : "rgba(107,130,152,0.12)",
                        color: past ? "#B55A43" : "#566C82",
                      }}
                    >
                      {classification.label}
                    </span>
                    <button
                      type="button"
                      className="editorial-btn-open"
                      style={{ height: 30, padding: "0 12px", fontSize: 11 }}
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
