import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Wine } from "@/icons/lucide";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { Wine as WineType } from "@/hooks/useWines";

type WindowState = "now" | "soon" | "hold" | "past" | "none";

interface DailyInsightProps {
  wines: WineType[];
  onOpenWine: (wine: WineType) => void;
  onViewRecs?: () => void;
}

const currentYear = new Date().getFullYear();

function normalizeStyleFamily(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return "tinto";
  if (s.includes("branco")) return "branco";
  if (s.includes("espum")) return "espumante";
  if (s.includes("rose") || s.includes("rosé")) return "rosé";
  if (s.includes("fort")) return "fortificado";
  return "neutro";
}

function familyLabel(family: string) {
  switch (family) {
    case "tinto":
      return "tinto";
    case "branco":
      return "branco";
    case "espumante":
      return "espumante";
    case "rosé":
      return "rosé";
    case "fortificado":
      return "fortificado";
    default:
      return "sem estilo";
  }
}

function formatVintage(vintage?: number | null) {
  return vintage == null ? "Sem safra" : String(vintage);
}

function getWindowState(wine: Pick<WineType, "drink_from" | "drink_until">): WindowState {
  if (!wine.drink_from && !wine.drink_until) return "none";
  if (wine.drink_until && currentYear > wine.drink_until) return "past";
  if (wine.drink_from && currentYear < wine.drink_from) return "hold";
  if (wine.drink_from && wine.drink_until && currentYear >= wine.drink_from && currentYear <= wine.drink_until) return "now";
  if (wine.drink_until && wine.drink_until - currentYear <= 1) return "soon";
  return "none";
}

function daysSince(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))) : Number.POSITIVE_INFINITY;
}

function getWineScore(wine: WineType, familyFrequency: Record<string, number>) {
  const state = getWindowState(wine);
  const family = normalizeStyleFamily(wine.style);
  const rating = wine.rating ?? 0;
  const recencyBase = daysSince(wine.updated_at || wine.created_at);

  let score = 0;
  if (state === "now") score += 100;
  else if (state === "soon") score += 72;
  else if (state === "hold") score += 40;
  else if (state === "past") score += 25;
  else score += 12;

  if (rating > 0) score += rating * 8;
  if (recencyBase <= 14) score += 16;
  else if (recencyBase <= 45) score += 10;
  else if (recencyBase <= 120) score += 5;

  score -= Math.max(0, (familyFrequency[family] || 0) - 1) * 5;

  return score;
}

function pickSuggestions(wines: WineType[]) {
  const active = wines.filter((wine) => wine.quantity > 0);
  if (active.length === 0) return [];

  const familyFrequency = active.reduce<Record<string, number>>((acc, wine) => {
    const family = normalizeStyleFamily(wine.style);
    acc[family] = (acc[family] || 0) + 1;
    return acc;
  }, {});

  const ranked = active
    .map((wine) => ({
      wine,
      family: normalizeStyleFamily(wine.style),
      state: getWindowState(wine),
      score: getWineScore(wine, familyFrequency),
    }))
    .sort((a, b) => b.score - a.score);

  const limit = Math.min(4, Math.max(1, active.length));
  const picked: typeof ranked = [];
  const seenFamilies = new Set<string>();

  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (seenFamilies.has(item.family)) continue;
    picked.push(item);
    seenFamilies.add(item.family);
  }

  if (picked.length < limit) {
    for (const item of ranked) {
      if (picked.length >= limit) break;
      if (picked.some((entry) => entry.wine.id === item.wine.id)) continue;
      picked.push(item);
    }
  }

  return picked.slice(0, limit);
}

function buildInsightSentence(suggestions: ReturnType<typeof pickSuggestions>, wines: WineType[]) {
  const active = wines.filter((wine) => wine.quantity > 0);
  const pastPeak = active.filter((wine) => getWindowState(wine) === "past").length;
  const missingWindow = active.filter((wine) => getWindowState(wine) === "none").length;
  const top = suggestions[0]?.wine;

  if (top) {
    const ratingText = top.rating ? ` e nota ${top.rating.toFixed(1)}` : "";
    if (suggestions[0].state === "now") {
      return `Hoje vale abrir ${top.name}: ele está na janela ideal${ratingText}.`;
    }
    if (suggestions[0].state === "soon") {
      return `${top.name} está encostando na janela ideal${ratingText}; abrir em breve evita perder o ponto.`;
    }
    if (suggestions[0].state === "hold") {
      return `Se você quiser guardar mais um pouco, segure ${top.name}; o resto da seleção já pode ser girada antes.`;
    }
    return `Abra ${top.name} antes dos demais${ratingText}: ele é o rótulo que mais pede atenção hoje.`;
  }

  if (pastPeak > 0) {
    return `Você tem ${pastPeak} vinho${pastPeak > 1 ? "s" : ""} fora da janela ideal; priorize esses rótulos antes de abrir os demais.`;
  }

  if (missingWindow > 0) {
    return `Há ${missingWindow} vinho${missingWindow > 1 ? "s" : ""} sem janela de consumo; preencher isso agora deixa a próxima decisão muito mais rápida.`;
  }

  return "Sua adega está organizada; o próximo ganho vem de registrar nota e janela de consumo nas novas entradas.";
}

function buildFeedbackSentence(wines: WineType[]) {
  const active = wines.filter((wine) => wine.quantity > 0);
  if (active.length === 0) {
    return "Cadastre alguns rótulos com safra, nota e janela de consumo para eu começar a apontar o próximo melhor movimento.";
  }

  const unrated = active.filter((wine) => !wine.rating).length;
  const missingWindow = active.filter((wine) => !wine.drink_from && !wine.drink_until).length;
  const pastPeak = active.filter((wine) => getWindowState(wine) === "past").length;

  const families = active.reduce<Record<string, number>>((acc, wine) => {
    const family = normalizeStyleFamily(wine.style);
    acc[family] = (acc[family] || 0) + 1;
    return acc;
  }, {});
  const dominantFamily = Object.entries(families).sort((a, b) => b[1] - a[1])[0];
  const secondaryFamily = Object.entries(families).sort((a, b) => a[1] - b[1])[0];

  if (pastPeak > 0) {
    return `Você já tem ${pastPeak} rótulo${pastPeak > 1 ? "s" : ""} passando da janela ideal; abrir esse grupo primeiro evita que ele fique esquecido.`;
  }

  if (missingWindow >= 3) {
    return `Existem ${missingWindow} vinhos sem janela de consumo; marcar isso agora reduz o atrito na próxima escolha.`;
  }

  if (unrated >= 3) {
    return `Você ainda não avaliou ${unrated} garrafas; registrar a nota depois de abrir ajuda a repetir o que realmente valeu a pena.`;
  }

  if (dominantFamily && secondaryFamily && dominantFamily[1] >= 5 && dominantFamily[1] >= secondaryFamily[1] * 2) {
    return `Seu acervo está puxado para ${familyLabel(dominantFamily[0])}; alternar um ${familyLabel(secondaryFamily[0])} na próxima abertura deixa a adega mais equilibrada.`;
  }

  return "Seu próximo salto está em transformar abertura em hábito: nota, janela e localização consistentes deixam a adega mais fácil de usar.";
}

function windowLabel(state: WindowState, wine: WineType) {
  if (state === "now") return "Abrir agora";
  if (state === "soon") return "Abrir em breve";
  if (state === "hold") return "Guardar";
  if (state === "past") return "Passou do ponto";
  if (wine.rating) return `Nota ${wine.rating.toFixed(1)}`;
  return "Sem janela";
}

function WineCard({
  wine,
  onOpenWine,
}: {
  wine: WineType;
  onOpenWine: (wine: WineType) => void;
}) {
  const state = getWindowState(wine);
  const minYear = wine.drink_from ?? Math.min(currentYear - 3, wine.vintage ?? currentYear - 3);
  const maxYear = wine.drink_until ?? Math.max(currentYear + 3, wine.vintage ?? currentYear + 3);
  const span = Math.max(1, maxYear - minYear);
  const current = Math.min(maxYear, Math.max(minYear, currentYear));
  const value = ((current - minYear) / span) * 100;
  const family = normalizeStyleFamily(wine.style);

  return (
    <div className="w-[280px] shrink-0 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 text-[17px] font-semibold tracking-tight text-[#1A1A1A]">{wine.name}</p>
          <p className="mt-1 text-sm text-[#5F5F5F]">
            {formatVintage(wine.vintage)} · {familyLabel(family)}
          </p>
        </div>
        <Badge variant={wine.rating ? "gold" : "outline"} className="shrink-0">
          {wine.rating ? `${wine.rating.toFixed(1)}★` : "Sem nota"}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5F5F5F]">Janela de consumo</span>
          <span className="text-[10px] font-medium text-[#5F5F5F]">{windowLabel(state, wine)}</span>
        </div>

        <Slider
          value={[value]}
          min={0}
          max={100}
          step={1}
          disabled
          className={cn(
            "pointer-events-none",
            state === "now" && "[&_[data-radix-slider-range]]:from-[#7B1E2B] [&_[data-radix-slider-range]]:to-[#5A1420]",
            state === "soon" && "[&_[data-radix-slider-range]]:from-[#B48C3A] [&_[data-radix-slider-range]]:to-[#D7B76E]",
            state === "hold" && "[&_[data-radix-slider-range]]:from-[#6F7F5B] [&_[data-radix-slider-range]]:to-[#94A38B]",
            state === "past" && "[&_[data-radix-slider-range]]:from-[#7A6A52] [&_[data-radix-slider-range]]:to-[#A6957A]",
          )}
        />

        <div className="flex items-center justify-between text-[10px] text-[#7A7A7A]">
          <span>{minYear}</span>
          <span>{currentYear}</span>
          <span>{maxYear}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-4 h-10 w-full rounded-xl font-medium"
        onClick={() => onOpenWine(wine)}
      >
        Abrir
      </Button>
    </div>
  );
}

export function DailyInsight({ wines, onOpenWine, onViewRecs }: DailyInsightProps) {
  const navigate = useNavigate();

  const suggestions = useMemo(() => pickSuggestions(wines), [wines]);
  const insightSentence = useMemo(() => buildInsightSentence(suggestions, wines), [suggestions, wines]);
  const feedbackSentence = useMemo(() => buildFeedbackSentence(wines), [wines]);
  const hasSuggestions = suggestions.length > 0;

  return (
    <section className="space-y-3">
      <motion.div
        className="relative min-h-[122px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#214A31] via-[#1B3B27] to-[#102515] p-3.5 text-white shadow-[0_14px_32px_-22px_rgba(18,54,31,0.6)] sm:p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-[#C8A96A]/10 blur-2xl" />

        <div className="relative flex items-start gap-3 md:items-center">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-[#EAD9A0] ring-1 ring-white/10">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">INSIGHT DO DIA</p>
            <p className="mt-1.5 line-clamp-2 max-w-2xl text-[14px] font-semibold leading-[1.35] tracking-tight text-white sm:line-clamp-none sm:text-[16px] sm:leading-snug">
              {insightSentence}
            </p>
          </div>

          {(onViewRecs || hasSuggestions) && (
            <Button
              type="button"
              variant="secondary"
              className="h-8 shrink-0 rounded-xl bg-white px-3 text-[11.5px] text-[#1A1A1A] hover:bg-white/95"
              onClick={onViewRecs ?? (() => navigate("/dashboard/cellar"))}
            >
              Ver recomendações
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </motion.div>

      {hasSuggestions && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#7B1E2B]" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5F5F5F]">SUGERIDOS PARA HOJE</p>
          </div>

          <div className="-mx-1 flex gap-3 overflow-x-auto pb-1 pl-1 pr-1">
            {suggestions.map((item) => (
              <WineCard key={item.wine.id} wine={item.wine} onOpenWine={onOpenWine} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6F7F5B]/10 text-[#6F7F5B]">
          <Wine className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5F5F5F]">CELLAR FEEDBACK</p>
          <p className="mt-1 text-sm leading-[1.35] text-[#5F5F5F]">
            {feedbackSentence}
          </p>
        </div>
      </div>
    </section>
  );
}
