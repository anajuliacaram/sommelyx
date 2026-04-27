import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStyleColor, styleColor } from "@/lib/sommelyx-data";
import { WineLabelPreview } from "@/components/WineLabelPreview";
import type { Wine as WineType } from "@/hooks/useWines";

type WineCardData = WineType & {
  entries?: WineType[];
  displayPurchasePrice?: number | null;
};

type WineCardProps = {
  wine: WineCardData;
  showLabel?: boolean;
  onOpen: (wine: WineCardData) => void;
};

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatVintageLabel(vintage: number | null | undefined) {
  return vintage == null ? "Sem safra" : String(vintage);
}

function getWineTone(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return "bg-[#7B1E3A]";
  if (s.includes("branco")) return "bg-[#DDBD74]";
  if (s.includes("rose")) return "bg-[#C97A93]";
  if (s.includes("espum")) return "bg-[#B8A06A]";
  return "bg-[#C5BAAA]";
}

// Estima janela de consumo a partir do estilo + safra quando o cliente não preencheu.
// Faixas conservadoras baseadas em práticas enológicas comuns.
function estimateDrinkWindow(style?: string | null, vintage?: number | null): { from: number; until: number } {
  const s = (style || "").toLowerCase();
  const base = vintage ?? new Date().getFullYear() - 1;
  // [anos até abrir, anos de guarda total]
  let openIn = 1;
  let span = 5;
  if (s.includes("espum")) { openIn = 0; span = 3; }
  else if (s.includes("rose")) { openIn = 0; span = 2; }
  else if (s.includes("branco")) { openIn = 1; span = 4; }
  else if (s.includes("sobrem") || s.includes("fortif") || s.includes("porto") || s.includes("madeira")) { openIn = 2; span = 20; }
  else if (s.includes("chianti") || s.includes("sangiovese")) { openIn = 2; span = 8; }
  else if (s.includes("tinto")) { openIn = 2; span = 8; }
  else { openIn = 1; span = 5; }
  return { from: base + openIn, until: base + openIn + span };
}

function resolveDrinkWindow(wine: Pick<WineType, "drink_from" | "drink_until" | "vintage" | "style">) {
  const estimated = estimateDrinkWindow(wine.style, wine.vintage);
  let from = wine.drink_from ?? estimated.from;
  let until = wine.drink_until ?? estimated.until;
  if (!Number.isFinite(from) || from <= 0) from = estimated.from;
  if (!Number.isFinite(until) || until <= 0) until = estimated.until;
  if (until <= from) until = from + Math.max(2, estimated.until - estimated.from);
  return { from, until, isEstimated: wine.drink_from == null || wine.drink_until == null };
}

// Posição do indicador na barra (0-100). Garante valor sempre visível,
// mesmo quando o ano atual está antes ou depois da janela.
function getDrinkWindowIndicator(from: number, until: number) {
  const currentYear = new Date().getFullYear();
  const span = until - from;
  if (!Number.isFinite(span) || span <= 0) return 50;
  const raw = ((currentYear - from) / span) * 100;
  return Math.max(6, Math.min(94, raw));
}

function getDrinkWindowState(from: number, until: number) {
  const currentYear = new Date().getFullYear();
  if (currentYear < from) return { label: "Guardar", className: "bg-[#EEF2FF] text-[#36508A] border-[#D8E2FF]" };
  if (currentYear > until) return { label: "Atenção", className: "bg-[rgba(123,30,43,0.08)] text-[#7B1E2B] border-[rgba(123,30,43,0.16)]" };
  return { label: "Beber agora", className: "bg-[rgba(63,94,59,0.12)] text-[#2E4A2F] border-[rgba(63,94,59,0.22)]" };
}

export function WineCard({ wine, showLabel = false, onOpen }: WineCardProps) {
  const palette = {
    dot: getStyleColor(wine.style) || styleColor.tinto,
    text: getStyleColor(wine.style) || styleColor.tinto,
  };
  const drinkWindow = resolveDrinkWindow(wine);
  const indicator = getDrinkWindowIndicator(drinkWindow.from, drinkWindow.until);
  const drinkState = getDrinkWindowState(drinkWindow.from, drinkWindow.until);
  const priceLabel = formatMoney(wine.displayPurchasePrice);
  const ratingLabel = typeof wine.rating === "number" ? wine.rating.toFixed(1) : "—";

  return (
    <motion.article
      className={cn("group flex h-full flex-col overflow-hidden rounded-[20px] sm:rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.88)] shadow-[0_10px_22px_-20px_rgba(44,20,31,0.16)] sm:shadow-[0_12px_28px_-24px_rgba(44,20,31,0.16)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-28px_rgba(44,20,31,0.18)]")}
      style={{ transition: "all 0.25s ease" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
      {showLabel ? (
        <div
          className="relative h-[116px] sm:h-[200px] overflow-hidden bg-[rgba(247,243,236,0.85)]"
          style={{
            background: `linear-gradient(to bottom, ${getStyleColor(wine.style) || styleColor.tinto}26, transparent), rgba(247,243,236,0.85)`,
          }}
        >
          <WineLabelPreview
            wine={wine}
            alt={wine.name}
            className="h-full"
            imageClassName="h-full w-full object-cover"
            generated={false}
            compact
          />
        </div>
      ) : null}

      <div className={cn("flex flex-1 flex-col px-3 sm:px-5", showLabel ? "pt-2.5 pb-3 sm:pt-4 sm:pb-5" : "py-3 sm:py-5")}>
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            <span
              className="mt-0.5 h-2.5 w-2.5 sm:h-4 sm:w-4 shrink-0 rounded-full shadow-[0_0_0_2px_rgba(0,0,0,0.03)] sm:shadow-[0_0_0_3px_rgba(0,0,0,0.03)]"
              style={{
                backgroundColor: palette.dot,
                filter: "saturate(1.08)",
              }}
            />
            <span className="truncate text-[10px] sm:text-[12px] font-semibold uppercase tracking-[0.03em] sm:tracking-[0.04em]" style={{ color: "#4A4036" }}>
              {wine.style || "Vinho"}
            </span>
          </div>
          <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-[12.5px] font-semibold tracking-tight text-[#8A6A1F] shrink-0">
            <span className="text-[9px] sm:text-[11px]">⭐</span>
            {ratingLabel}
          </span>
        </div>

        <div className="mt-2 sm:mt-4 space-y-0.5 sm:space-y-1">
          <h3 className="font-serif text-[1rem] sm:text-[1.28rem] font-semibold leading-[1.1] sm:leading-[1.08] tracking-[-0.02em] sm:tracking-[-0.03em] text-[#1A1A1A] overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] min-h-[2.2em] sm:min-h-0">
            {wine.name}
          </h3>
          <p className="text-[10.5px] sm:text-[13.5px] font-medium text-[#5C544B] truncate">
            {formatVintageLabel(wine.vintage)} · {wine.region || wine.country || "Região n/i"}
          </p>
        </div>

        <div className="mt-2 sm:mt-5 space-y-1.5 sm:space-y-2">
          <div className="sm:hidden flex items-center justify-between gap-1.5">
            <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-[9px] font-semibold uppercase tracking-[0.06em]", drinkState.className)}>
              {drinkState.label}
            </span>
            <span className="text-[9.5px] font-semibold text-[#6F665C]">
              {drinkWindow.from}–{drinkWindow.until}
            </span>
          </div>

          <div className="hidden sm:block relative h-1 w-full overflow-hidden rounded-full bg-[#E7DED3]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#E5D2A6] via-[#D7C29C] to-[#C8A95B]"
              style={{ width: `${Math.max(indicator, 8)}%` }}
            />
            <span
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#C8A95B] shadow-[0_0_0_3px_rgba(255,255,255,0.86)]"
              style={{ left: `calc(${indicator}% - 5px)` }}
            />
          </div>
          <div className="hidden sm:flex items-center justify-between text-[11.5px] font-semibold text-[#6F665C]">
            <span className={drinkWindow.isEstimated ? "italic text-[#8A8276]" : undefined}>
              {drinkWindow.from}
            </span>
            <span className={drinkWindow.isEstimated ? "italic text-[#8A8276]" : undefined}>
              {drinkWindow.until}
            </span>
          </div>
          <p className="hidden sm:block text-[10px] font-medium uppercase tracking-[0.1em] text-[#A39885]">
            {drinkWindow.isEstimated ? "Janela sugerida" : "Janela de consumo"}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 sm:gap-3 pt-2.5 sm:pt-5">
          <div className="min-w-0 space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} />
              <span className="text-[9px] sm:text-[12px] font-semibold uppercase tracking-[0.06em] sm:tracking-[0.08em] text-[#4A4036] truncate">
                {wine.style || "Vinho"}
              </span>
            </div>
            <p className="text-[11px] sm:mt-1 sm:text-[15px] font-semibold text-[#1A1713] leading-tight">
              Qtd {wine.quantity} · {priceLabel}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpen(wine)}
            className="h-7 sm:h-9 rounded-full border-black/10 bg-white/80 px-2.5 sm:px-4 text-[10px] sm:text-[12px] font-medium text-[#55505A] shadow-none hover:border-black/15 hover:bg-white"
          >
            Abrir
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
