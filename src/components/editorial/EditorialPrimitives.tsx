// Primitivas visuais do design "Editorial" (referência: design-reference/Adega_Pessoal)
// Adaptadas ao tema claro/creme do Sommelyx, accent vinho #7B1E2B.

import { cn } from "@/lib/utils";
import { memo, ReactNode } from "react";

export const STYLE_COLORS: Record<string, string> = {
  tinto: "#7B1E2B",
  branco: "#C9B469",
  rosé: "#D89BA0",
  rose: "#D89BA0",
  espumante: "#B8C49A",
  sobremesa: "#B4793F",
  fortificado: "#B4793F",
};

export function getStyleFamily(style?: string | null): string {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return "tinto";
  if (s.includes("branco") || s.includes("white")) return "branco";
  if (s.includes("ros")) return "rosé";
  if (s.includes("espum") || s.includes("champ") || s.includes("sparkl")) return "espumante";
  if (s.includes("sobrem") || s.includes("dessert") || s.includes("fortif")) return "sobremesa";
  return "tinto";
}

export function getStyleColor(style?: string | null) {
  return STYLE_COLORS[getStyleFamily(style)] || "#7B1E2B";
}

/* ── Kicker (rótulo pequeno) ─────────────────────────── */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.5)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/* ── Style badge ─────────────────────────────────────── */
export function StyleBadge({ style, className }: { style?: string | null; className?: string }) {
  const family = getStyleFamily(style);
  const color = STYLE_COLORS[family];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
        className,
      )}
      style={{ color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {family}
    </span>
  );
}

/* ── Chip (filtro) ───────────────────────────────────── */
export type ChipTone = "default" | "tinto" | "branco" | "rosé" | "espumante" | "sobremesa";

const CHIP_TONES: Record<ChipTone, { bg: string; color: string; border: string }> = {
  // Verde sálvia (padrão / "todos")
  default:    { bg: "rgba(95,111,82,0.14)",  color: "#5F7F52", border: "rgba(95,111,82,0.22)" },
  // Bordô suave
  tinto:      { bg: "rgba(123,30,43,0.10)",  color: "#7B1E2B", border: "rgba(123,30,43,0.22)" },
  // Amarelo dourado suave
  branco:     { bg: "rgba(212,175,55,0.16)", color: "#8B6914", border: "rgba(212,175,55,0.30)" },
  // Rosa suave
  "rosé":     { bg: "rgba(216,123,143,0.16)", color: "#B0556C", border: "rgba(216,123,143,0.28)" },
  // Verde claro
  espumante:  { bg: "rgba(132,168,108,0.16)", color: "#4F7A3D", border: "rgba(132,168,108,0.28)" },
  // Laranja suave
  sobremesa:  { bg: "rgba(214,124,52,0.14)", color: "#A85A1F", border: "rgba(214,124,52,0.26)" },
};

function inferChipTone(children: ReactNode): ChipTone {
  if (typeof children !== "string") return "default";
  const s = children.trim().toLowerCase();
  if (s === "tinto") return "tinto";
  if (s === "branco") return "branco";
  if (s === "rosé" || s === "rose") return "rosé";
  if (s === "espumante") return "espumante";
  if (s === "sobremesa") return "sobremesa";
  return "default";
}

export function Chip({
  active,
  onClick,
  children,
  tone,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  const resolvedTone = tone ?? inferChipTone(children);
  const palette = CHIP_TONES[resolvedTone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-semibold uppercase leading-none tracking-[0.05em] transition-all",
        className,
      )}
      style={{
        background: active ? palette.bg : "rgba(255,255,255,0.76)",
        color: active ? palette.color : "rgba(26,23,21,0.72)",
        border: `1px solid ${active ? palette.border : "rgba(95,111,82,0.10)"}`,
      }}
    >
      {children}
    </button>
  );
}


/* ── Card editorial (card-depth-v1) ──────────────────── */
export function EditorialCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("editorial-card", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/* ── Hero band (insight do dia) ──────────────────────── */
export function EditorialHeroBand({ children }: { children: ReactNode }) {
  return <section className="editorial-hero-band">{children}</section>;
}

/* ── KPI Card editorial ──────────────────────────────── */
export const EditorialKpiCard = memo(function EditorialKpiCard({
  icon,
  label,
  value,
  sub,
  accent = "#5F7F52",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="editorial-kpi">
      <div className="mb-2 flex items-start justify-between gap-2 sm:mb-5">
        <div className="flex min-w-0 items-start gap-1.5">
          <div
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[10px] sm:h-9 sm:w-9 sm:rounded-[12px]"
            style={{ color: accent, background: `${accent}14` }}
          >
            {icon}
          </div>
          <span className="min-h-[2.1em] min-w-0 text-[9px] font-bold uppercase leading-[1.12] tracking-[0.11em] text-[rgba(58,51,39,0.56)] sm:text-[9px] sm:tracking-[0.12em]">
            {label}
          </span>
        </div>
        {sub && (
          <span className="shrink-0 text-[8.5px] font-bold uppercase tracking-[0.12em] text-[rgba(58,51,39,0.42)] sm:text-[9px]">
            {sub}
          </span>
        )}
      </div>
      <div className="text-[20px] font-bold leading-none tracking-[-0.04em] text-[#1a1713] tabular-nums sm:text-[32px]">
        {value}
      </div>
    </div>
  );
});

EditorialKpiCard.displayName = "EditorialKpiCard";

/* ── DrinkWindow timeline ──────────────────────────────
   Padronizado: sempre exibe a mesma estrutura visual.
   - Trilha cinza fina (sempre visível)
   - Faixa colorida da janela (verde = ideal | dourado = sugerida)
   - Indicador (bolinha) sempre visível, com clamp interno (4%-96%)
   - Rótulo central inferior sempre presente:
       "Janela ideal" (manual)  ou  "Janela sugerida" (estimada)
   - Anos extremos (min/max) sempre nas pontas */
export function DrinkWindow({
  from,
  until,
  current = new Date().getFullYear(),
  estimated = false,
}: {
  from: number;
  until: number;
  current?: number;
  estimated?: boolean;
}) {
  // Garante intervalo válido
  const safeFrom = Number.isFinite(from) && from > 0 ? from : new Date().getFullYear();
  const safeUntil = Number.isFinite(until) && until > safeFrom ? until : safeFrom + 5;
  const min = safeFrom - 2;
  const max = safeUntil + 2;
  const range = Math.max(1, max - min);
  // Clamp interno (4%-96%) para que a bolinha NUNCA fique colada na borda
  const pct = (y: number) => {
    const raw = ((y - min) / range) * 100;
    return `${Math.max(0, Math.min(100, raw))}%`;
  };
  const classification = classifyDrinkWindow({ current, from: safeFrom, until: safeUntil });
  const inWindow = classification.status === "now";
  const clampedCurrent = Math.max(min, Math.min(max, current));
  const indicatorPct = Math.max(4, Math.min(96, getDrinkWindowIndicatorPosition({ current: clampedCurrent, from: safeFrom, until: safeUntil })));
  const trackColor = estimated ? "rgba(180,140,58,0.85)" : "#5F7F52";
  const dotBorder = inWindow ? trackColor : "rgba(160,100,80,0.85)";
  const dotInner = inWindow ? trackColor : "rgba(160,100,80,0.9)";

  return (
    <div className="relative h-9 w-full">
      {/* Trilha base */}
      <div
        className="absolute inset-x-0 top-[12px] h-[2px] rounded-full"
        style={{ background: "rgba(95,111,82,0.14)" }}
      />
      {/* Faixa da janela */}
      <div
        className="absolute top-[10px] h-[6px] rounded-full"
        style={{
          left: pct(safeFrom),
          width: `calc(${pct(safeUntil)} - ${pct(safeFrom)})`,
          background: estimated
            ? "linear-gradient(90deg, rgba(180,140,58,0.25), rgba(180,140,58,0.55), rgba(180,140,58,0.25))"
            : "linear-gradient(90deg, rgba(95,111,82,0.3), rgba(95,111,82,0.6), rgba(95,111,82,0.3))",
        }}
      />
      {/* Indicador (bolinha) — clamp interno para não colar na borda */}
      <div
        className="absolute top-[6px] flex h-[14px] w-[14px] -translate-x-1/2 items-center justify-center rounded-full border-[2px]"
        style={{
          left: `${indicatorPct}%`,
          borderColor: dotBorder,
          background: "#fff",
          boxShadow: "0 1px 3px rgba(58,51,39,0.18)",
        }}
      >
        <div
          className="h-[6px] w-[6px] rounded-full"
          style={{ background: dotInner }}
        />
      </div>
      {/* Rodapé padronizado: ano min · rótulo central · ano max */}
      <div className="absolute bottom-0 left-0 text-[10px] font-semibold tabular-nums text-[rgba(58,51,39,0.56)] sm:text-[10.5px]">
        {min}
      </div>
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: estimated ? "rgba(180,140,58,0.85)" : "rgba(95,111,82,0.75)" }}
      >
        {classification.label}
      </div>
      <div className="absolute bottom-0 right-0 text-[10px] font-semibold tabular-nums text-[rgba(58,51,39,0.56)] sm:text-[10.5px]">
        {max}
      </div>
    </div>
  );
}

/* ── Estimativa de janela de consumo (fallback inteligente) ──
   Usa estilo + safra para estimar uma janela conservadora quando
   o cliente não preencheu drink_from / drink_until. */
export function resolveSuggestedDrinkWindow(wine: {
  style?: string | null;
  vintage?: number | null;
  drink_from?: number | null;
  drink_until?: number | null;
}): { from: number; until: number; estimated: boolean } {
  if (wine.drink_from && wine.drink_until && wine.drink_until > wine.drink_from) {
    return { from: wine.drink_from, until: wine.drink_until, estimated: false };
  }
  const s = (wine.style || "").toLowerCase();
  const base = wine.vintage ?? new Date().getFullYear() - 1;
  let openIn = 1;
  let span = 5;
  if (s.includes("espum")) { openIn = 0; span = 3; }
  else if (s.includes("rose") || s.includes("rosé")) { openIn = 0; span = 2; }
  else if (s.includes("branco")) { openIn = 1; span = 4; }
  else if (s.includes("sobrem") || s.includes("fortif") || s.includes("porto") || s.includes("madeira")) { openIn = 2; span = 20; }
  else if (s.includes("chianti") || s.includes("sangiovese")) { openIn = 2; span = 8; }
  else if (s.includes("tinto")) { openIn = 2; span = 8; }
  else { openIn = 1; span = 5; }
  const from = wine.drink_from ?? base + openIn;
  const until = wine.drink_until ?? base + openIn + span;
  return { from, until: until > from ? until : from + span, estimated: true };
}

export function classifyDrinkWindow({
  current = new Date().getFullYear(),
  from,
  until,
}: {
  current?: number;
  from: number;
  until: number;
}): { status: "guard" | "soon" | "now" | "past"; label: string } {
  const safeFrom = Number.isFinite(from) && from > 0 ? from : current;
  const safeUntil = Number.isFinite(until) && until >= safeFrom ? until : safeFrom + 5;
  const toleranceYearBeforeStart = current >= safeFrom - 1 && current < safeFrom;

  if (current > safeUntil) {
    return { status: "past", label: "Após o auge" };
  }
  if (current >= safeFrom && current <= safeUntil) {
    return { status: "now", label: "No auge" };
  }
  if (toleranceYearBeforeStart) {
    return { status: "soon", label: "Beber em breve" };
  }
  return { status: "guard", label: "Em guarda" };
}

export function getDrinkWindowIndicatorPosition({
  current = new Date().getFullYear(),
  from,
  until,
}: {
  current?: number;
  from: number;
  until: number;
}): number {
  const safeFrom = Number.isFinite(from) && from > 0 ? from : current;
  const safeUntil = Number.isFinite(until) && until > safeFrom ? until : safeFrom + 1;
  const span = Math.max(1, safeUntil - safeFrom);
  const raw = ((current - safeFrom) / span) * 100;
  return Math.max(-8, Math.min(108, raw));
}

/* ── Sparkbar ────────────────────────────────────────── */
export function Sparkbar({
  data,
  height = 80,
  accent = "#7B1E2B",
  showValues = true,
  barWidth = 10,
}: {
  data: { label: string; value: number }[];
  height?: number;
  accent?: string;
  showValues?: boolean;
  barWidth?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          {showValues && (
            <span
              className="text-[10px] font-semibold tabular-nums leading-none"
              style={{ color: d.value > 0 ? accent : "rgba(58,51,39,0.35)" }}
            >
              {d.value}
            </span>
          )}
          <div className="relative flex w-full items-end justify-center" style={{ height: height - (showValues ? 26 : 14) }}>
            <div
              className="rounded-t-[3px] transition-all"
              style={{
                width: barWidth,
                height: `${Math.max(4, (d.value / max) * 100)}%`,
                background: d.value > 0 ? accent : "rgba(95,111,82,0.14)",
                opacity: d.value > 0 ? 0.92 : 1,
              }}
            />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[rgba(58,51,39,0.45)]">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
