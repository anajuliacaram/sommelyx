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
} from "@/components/editorial/EditorialPrimitives";
import { useToast } from "@/hooks/use-toast";
import { useWineEvent, useWines, type Wine } from "@/hooks/useWines";

const currentYear = new Date().getFullYear();

export default function PersonalCellarPage() {
  const { data: wines = [], isLoading } = useWines();
  const wineEvent = useWineEvent();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState("todos");
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

  const filtered = useMemo(() => {
    let list = wines.filter((w) => {
      if (styleFilter !== "todos" && getStyleFamily(w.style) !== styleFilter) return false;
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
    if (sort === "window") list = list.slice().sort((a, b) => (a.drink_until ?? 9999) - (b.drink_until ?? 9999));
    else if (sort === "recent") list = list.slice().sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    else if (sort === "rating") list = list.slice().sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    else if (sort === "vintage") list = list.slice().sort((a, b) => (b.vintage ?? 0) - (a.vintage ?? 0));
    else if (sort === "vintage_old") list = list.slice().sort((a, b) => (a.vintage ?? 9999) - (b.vintage ?? 9999));
    else if (sort === "value") list = list.slice().sort((a, b) => (Number(b.current_value) || 0) - (Number(a.current_value) || 0));
    else if (sort === "value_low") list = list.slice().sort((a, b) => (Number(a.current_value) || Infinity) - (Number(b.current_value) || Infinity));
    return list;
  }, [wines, query, styleFilter, sort]);

  const handleOpenBottle = (w: Wine) => {
    setPreSelectedWine(w);
    setConsumptionOpen(true);
  };

  return (
    <>
      <div className="editorial-page">
        {/* Unified Header + Controls */}
        <EditorialCard style={{ padding: "16px 18px" }}>
          {/* Top row: title + counter + filter chips + add */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col">
              <Kicker>Adega</Kicker>
              <h1 className="editorial-page-h1 mt-0.5 !text-[26px] sm:!text-[28px] leading-tight">
                Minha Adega
              </h1>
            </div>
            <div className="text-[12px]" style={{ color: "rgba(58,51,39,0.6)" }}>
              <b style={{ color: "#1a1713", fontWeight: 700 }}>{filtered.length}</b> / {wines.length} vinhos
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {(["todos", "tinto", "branco", "rosé", "espumante", "sobremesa"] as const).map((s) => (
                <Chip key={s} active={styleFilter === s} onClick={() => setStyleFilter(s)}>
                  {s}
                </Chip>
              ))}
              <button
                type="button"
                className="editorial-btn-primary ml-1"
                onClick={() => setAddOpen(true)}
              >
                + Adicionar
              </button>
            </div>
          </div>

          {/* Bottom row: search + sort + view + labels */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="editorial-search min-w-[200px] flex-1">
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
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-10 rounded-[14px] px-3 text-[12.5px] font-semibold outline-none"
              style={{
                background: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(95,111,82,0.12)",
                color: "#1a1713",
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
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all"
              style={{
                background: showLabels ? "rgba(95,111,82,0.14)" : "rgba(255,255,255,0.78)",
                border: `1px solid ${showLabels ? "rgba(95,111,82,0.22)" : "rgba(95,111,82,0.12)"}`,
                color: showLabels ? "#5F7F52" : "rgba(58,51,39,0.55)",
              }}
            >
              {showLabels ? <ImageIcon className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />}
            </button>
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
              const inWindow =
                w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until;
              const past = w.drink_until && currentYear > w.drink_until;
              return (
                <EditorialCard key={w.id} style={{ padding: 18, cursor: "pointer" }}>
                  <div onClick={() => setEditWine(w)}>
                    {showLabels && (
                      w.image_url ? (
                        <div
                          className="mb-3 flex h-[160px] items-center justify-center overflow-hidden rounded-[16px] transition-all duration-200"
                          style={{ background: "rgba(95,111,82,0.06)" }}
                        >
                          <img
                            src={w.image_url}
                            alt={w.name}
                            loading="lazy"
                            className="h-full w-auto object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          className="mb-3 relative flex h-[160px] items-center justify-center overflow-hidden rounded-[16px] transition-all duration-200"
                          style={{
                            background: `linear-gradient(160deg, ${color} 0%, ${color}dd 60%, ${color}88 100%)`,
                          }}
                        >
                          <div
                            className="rounded-[14px] px-5 py-3 text-center backdrop-blur-md"
                            style={{
                              background: "rgba(255,255,255,0.22)",
                              border: "1px solid rgba(255,255,255,0.30)",
                            }}
                          >
                            <div
                              className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full"
                              style={{ background: "rgba(255,255,255,0.85)" }}
                            >
                              <WineIcon className="h-4 w-4" style={{ color }} />
                            </div>
                            <p
                              className="text-[10px] font-bold uppercase"
                              style={{ letterSpacing: "0.14em", color: "rgba(255,255,255,0.95)" }}
                            >
                              Rótulo indisponível
                            </p>
                            <p className="mt-0.5 text-[10px]" style={{ color: "rgba(255,255,255,0.78)" }}>
                              Prévia ilustrativa
                            </p>
                          </div>
                        </div>
                      )
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
                    {w.drink_from && w.drink_until && (
                      <div className="mt-3">
                        <DrinkWindow from={w.drink_from} until={w.drink_until} current={currentYear} />
                      </div>
                    )}
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
                    {inWindow ? (
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
                    ) : (
                      <span
                        className="rounded-full px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em]"
                        style={{
                          background: past ? "rgba(201,107,85,0.12)" : "rgba(107,130,152,0.12)",
                          color: past ? "#B55A43" : "#566C82",
                        }}
                      >
                        {past ? "Beber em breve" : "Em guarda"}
                      </span>
                    )}
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
              const inWindow =
                w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until;
              return (
                <div key={w.id} className="editorial-row" onClick={() => setEditWine(w)}>
                  {showLabels && w.image_url ? (
                    <div
                      className="editorial-bottle-icon overflow-hidden"
                      style={{ background: "rgba(95,111,82,0.06)", padding: 0 }}
                    >
                      <img
                        src={w.image_url}
                        alt={w.name}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>
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
                        {w.quantity} un.
                        {w.drink_from && w.drink_until
                          ? ` · janela ${w.drink_from}–${w.drink_until}`
                          : ""}
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
                  {inWindow && (
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
                  )}
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
