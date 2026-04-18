import { motion } from "framer-motion";
import { Wine as WineIcon } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStyleColor, styleColor } from "@/lib/sommelyx-data";
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

function getDrinkWindowIndicator(wine: Pick<WineType, "drink_from" | "drink_until" | "vintage">) {
  const currentYear = new Date().getFullYear();

  if (wine.drink_from != null && wine.drink_until != null && wine.drink_until > wine.drink_from) {
    const span = wine.drink_until - wine.drink_from;
    const raw = ((currentYear - wine.drink_from) / span) * 100;
    return Math.max(6, Math.min(94, raw));
  }

  if (wine.drink_from != null && wine.drink_until == null) {
    return currentYear <= wine.drink_from ? 20 : 78;
  }

  if (wine.drink_until != null && wine.drink_from == null) {
    return currentYear > wine.drink_until ? 84 : 56;
  }

  if (wine.vintage != null) {
    const age = currentYear - wine.vintage;
    return Math.max(16, Math.min(84, 28 + age * 4));
  }

  return 50;
}

export function WineCard({ wine, showLabel = false, onOpen }: WineCardProps) {
  const palette = {
    dot: getStyleColor(wine.style) || styleColor.tinto,
    text: getStyleColor(wine.style) || styleColor.tinto,
  };
  const coverImageUrl = wine.image_url ?? wine.entries?.find((entry) => entry.image_url)?.image_url ?? null;
  const coverIsGenerated = !!coverImageUrl?.startsWith("data:image/svg+xml");
  const indicator = getDrinkWindowIndicator(wine);
  const priceLabel = formatMoney(wine.displayPurchasePrice);
  const ratingLabel = typeof wine.rating === "number" ? wine.rating.toFixed(1) : "—";

  return (
    <motion.article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.88)] shadow-[0_12px_28px_-24px_rgba(44,20,31,0.16)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-28px_rgba(44,20,31,0.18)]",
      )}
      style={{ transition: "all 0.25s ease" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      {showLabel ? (
        <div
          className="relative h-[200px] overflow-hidden bg-[rgba(247,243,236,0.85)]"
          style={{
            background: `linear-gradient(to bottom, ${getStyleColor(wine.style) || styleColor.tinto}26, transparent), rgba(247,243,236,0.85)`,
          }}
        >
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={wine.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={cn("flex h-full items-center justify-center", getWineTone(wine.style))}>
              <div className="flex flex-col items-center gap-2 rounded-3xl bg-white/65 px-4 py-3 text-center shadow-[0_10px_24px_-20px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#7B1E2B]">
                  <WineIcon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6F6A60]">Rótulo indisponível</p>
                  <p className="text-[10px] font-medium text-[#8A8276]">Prévia ilustrativa</p>
                </div>
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F4F1EC] via-[#F4F1EC]/75 to-transparent" />
          {coverIsGenerated ? (
            <div className="absolute right-3 top-3 rounded-full border border-black/5 bg-white/72 px-2 py-1 text-[9px] font-medium text-[#6F6A60] shadow-[0_8px_18px_-16px_rgba(0,0,0,0.18)] backdrop-blur-sm">
              Imagem ilustrativa
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn("flex flex-1 flex-col px-5", showLabel ? "pt-4 pb-5" : "py-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="mt-0.5 h-4 w-4 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(0,0,0,0.03)]"
              style={{
                backgroundColor: palette.dot,
                filter: "saturate(1.08)",
              }}
            />
            <span className="text-[12px] font-semibold uppercase tracking-[0.04em]" style={{ color: "#4A4036" }}>
              {wine.style || "Vinho"}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold tracking-tight text-[#8A6A1F]">
            <span className="text-[11px]">⭐</span>
            {ratingLabel}
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="font-serif text-[1.28rem] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1A1A1A]">
            {wine.name}
          </h3>
          <p className="text-[13.5px] font-medium text-[#5C544B]">
            {formatVintageLabel(wine.vintage)} · {wine.region || wine.country || "Região n/i"}
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <div className="relative h-px rounded-full bg-[#E7DED3]">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#D7C29C]"
              style={{ width: `${indicator}%` }}
            />
            <span
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#C8A95B] shadow-[0_0_0_3px_rgba(255,255,255,0.86)]"
              style={{ left: `calc(${indicator}% - 5px)` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11.5px] font-semibold text-[#6F665C]">
            <span>{wine.drink_from ?? "—"}</span>
            <span>{wine.drink_until ?? "—"}</span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.dot }} />
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4A4036]">
                {wine.style || "Vinho"}
              </span>
            </div>
            <p className="mt-1 text-[15px] font-semibold text-[#1A1713]">
              Qtd {wine.quantity} · {priceLabel}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpen(wine)}
            className="h-9 rounded-full border-black/10 bg-white/80 px-4 text-[12px] font-medium text-[#55505A] shadow-none hover:border-black/15 hover:bg-white"
          >
            Abrir
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
