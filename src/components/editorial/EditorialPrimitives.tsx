// Primitivas visuais do design "Editorial" (referência: design-reference/Adega_Pessoal)
// Adaptadas ao tema claro/creme do Sommelyx, accent vinho #7B1E2B.

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

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
export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.06em] transition-all"
      style={{
        background: active ? "rgba(95,111,82,0.14)" : "rgba(255,255,255,0.76)",
        color: active ? "#5F7F52" : "rgba(26,23,21,0.72)",
        border: `1px solid ${active ? "rgba(95,111,82,0.22)" : "rgba(95,111,82,0.10)"}`,
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
export function EditorialKpiCard({
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
      <div className="mb-5 flex items-center justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[12px]"
          style={{ color: accent, background: `${accent}14` }}
        >
          {icon}
        </div>
        {sub && (
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(58,51,39,0.42)]">
            {sub}
          </span>
        )}
      </div>
      <div className="text-[28px] sm:text-[32px] font-bold leading-none tracking-[-0.04em] text-[#1a1713] tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-[rgba(58,51,39,0.52)]">
        {label}
      </div>
    </div>
  );
}

/* ── DrinkWindow timeline ────────────────────────────── */
export function DrinkWindow({
  from,
  until,
  current = new Date().getFullYear(),
}: {
  from: number;
  until: number;
  current?: number;
}) {
  const min = from - 2;
  const max = until + 2;
  const range = Math.max(1, max - min);
  const pct = (y: number) => `${((y - min) / range) * 100}%`;
  const inWindow = current >= from && current <= until;

  return (
    <div className="relative h-6 w-full">
      <div
        className="absolute inset-x-0 top-[11px] h-[2px] rounded-full"
        style={{ background: "rgba(95,111,82,0.12)" }}
      />
      <div
        className="absolute top-[9px] h-[6px] rounded-full"
        style={{
          left: pct(from),
          width: `calc(${pct(until)} - ${pct(from)})`,
          background:
            "linear-gradient(90deg, rgba(95,111,82,0.3), rgba(95,111,82,0.6), rgba(95,111,82,0.3))",
        }}
      />
      <div
        className="absolute top-[5px] flex h-[14px] w-[14px] -translate-x-1/2 items-center justify-center rounded-full border-[2px]"
        style={{
          left: pct(current),
          borderColor: inWindow ? "#5F7F52" : "rgba(160,100,80,0.85)",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(58,51,39,0.18)",
        }}
      >
        <div
          className="h-[6px] w-[6px] rounded-full"
          style={{ background: inWindow ? "#5F7F52" : "rgba(160,100,80,0.9)" }}
        />
      </div>
      <div className="absolute -bottom-[1px] left-0 text-[9px] font-semibold tabular-nums text-[rgba(58,51,39,0.5)]">
        {min}
      </div>
      <div className="absolute -bottom-[1px] right-0 text-[9px] font-semibold tabular-nums text-[rgba(58,51,39,0.5)]">
        {max}
      </div>
    </div>
  );
}

/* ── Sparkbar ────────────────────────────────────────── */
export function Sparkbar({
  data,
  height = 80,
  accent = "#7B1E2B",
}: {
  data: { label: string; value: number }[];
  height?: number;
  accent?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="relative flex w-full items-end" style={{ height: height - 14 }}>
            <div
              className="w-full rounded-t-[4px] transition-all"
              style={{
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
