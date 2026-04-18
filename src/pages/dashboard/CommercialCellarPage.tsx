import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Wine, Plus, Pencil, Trash2, LayoutGrid, List, GlassWater, X, UtensilsCrossed, MapPin } from "@/icons/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RangeSliderFilter } from "@/components/RangeSliderFilter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import { useWines, useDeleteWine, useWineEvent, type Wine as WineType } from "@/hooks/useWines";
import { AddWineDialog } from "@/components/AddWineDialog";
import { ManageBottleDialog } from "@/components/ManageBottleDialog";
import { AddConsumptionDialog } from "@/components/AddConsumptionDialog";
import { EditWineDialog } from "@/components/EditWineDialog";
import { WineCard } from "@/components/WineCard";
import { useToast } from "@/hooks/use-toast";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { cn } from "@/lib/utils";
import { getWinePairings, type PairingResult } from "@/lib/sommelier-ai";
import { AnimatePresence } from "framer-motion";
const MOBILE_BREAKPOINT = 640;
function useIsSmallScreen() {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const check = () => setSmall(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return small;
}

const currentYear = new Date().getFullYear();

function normalizeGroupValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function formatVintageLabel(vintage: number | null | undefined) {
  return vintage == null ? "Sem safra" : String(vintage);
}

function drinkStatus(w: { drink_from: number | null; drink_until: number | null }) {
  if (!w.drink_from && !w.drink_until) return null;
  if (w.drink_until && currentYear > w.drink_until) return "past";
  if (w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until) return "now";
  if (w.drink_from && currentYear < w.drink_from) return "young";
  return null;
}

const statusLabel = { now: "Beber agora", past: "Pode ter perdido seu auge", young: "Guardar" };
const statusColor = {
  now: "bg-[rgba(47,116,79,0.10)] text-[hsl(152_38%_26%)] border-[rgba(47,116,79,0.16)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(16,185,129,0.05)]",
  past: "bg-[rgba(243,234,221,0.94)] text-[hsl(28_7%_42%)] border-[rgba(180,160,137,0.22)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(245,158,11,0.04)]",
  young: "bg-[rgba(89,141,186,0.10)] text-[hsl(210_38%_30%)] border-[rgba(89,141,186,0.16)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(14,165,233,0.05)]",
};

function getWineTone(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return "bg-[#7B1E3A]";
  if (s.includes("branco")) return "bg-[#DDBD74]";
  if (s.includes("rose")) return "bg-[#C97A93]";
  if (s.includes("espum")) return "bg-[#B8A06A]";
  return "bg-[#C5BAAA]";
}

function getStyleBadgeClass(style?: string | null, compact = false) {
  const s = (style || "").toLowerCase();
  const sizing = compact
    ? "min-h-[24px] rounded-full px-2.5 text-[9px] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.03)]"
    : "min-h-[24px] rounded-full px-3 text-[9px] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.03)]";

  if (s.includes("tinto")) return `${sizing} bg-gradient-to-br from-[#5B1831] via-[#651D36] to-[#451326] text-[#FCF7F8] border-[rgba(113,52,72,0.22)] group-hover:brightness-[1.03] group-hover:saturate-[0.96]`;
  if (s.includes("branco")) return `${sizing} bg-gradient-to-br from-[#F7F2E6] via-[#E9DEBF] to-[#D7C99E] text-[#5A4A22] border-[rgba(216,198,154,0.58)] group-hover:brightness-[1.03] group-hover:saturate-[0.96]`;
  if (s.includes("rose")) return `${sizing} bg-gradient-to-br from-[#F4DCE3] via-[#E2B2C2] to-[#C87B95] text-[#4C2232] border-[rgba(220,167,184,0.46)] group-hover:brightness-[1.03] group-hover:saturate-[0.96]`;
  if (s.includes("espum")) return `${sizing} bg-gradient-to-br from-[#F6F0DD] via-[#E8DAB7] to-[#D6C48F] text-[#5B4C2A] border-[rgba(222,207,170,0.58)] group-hover:brightness-[1.03] group-hover:saturate-[0.96]`;
  return `${sizing} bg-[rgba(255,255,255,0.82)] text-[#564d5c] border-white/40 group-hover:brightness-[1.02]`;
}

function getCardTypeTagClass(style?: string | null) {
  const s = (style || "").toLowerCase();
  const base = "inline-flex min-h-[24px] items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-medium leading-none tracking-[-0.01em] border shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-[filter,opacity] duration-200 ease-out group-hover:brightness-[1.02]";
  if (s.includes("tinto")) return `${base} bg-red-50 text-red-700 border-red-100`;
  if (s.includes("branco")) return `${base} bg-amber-50 text-amber-700 border-amber-100`;
  if (s.includes("espum")) return `${base} bg-yellow-50 text-yellow-700 border-yellow-100`;
  if (s.includes("rose") || s.includes("rosé")) return `${base} bg-pink-50 text-pink-700 border-pink-100`;
  return `${base} bg-neutral-100 text-neutral-600 border-neutral-200`;
}

function getPriorityTagClass() {
  return "inline-flex min-h-[24px] items-center justify-center rounded-full border border-[rgba(31,122,87,0.18)] bg-[rgba(31,122,87,0.12)] px-3 py-1.5 text-[11px] font-medium leading-none tracking-[-0.01em] text-[hsl(152_42%_28%)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-[filter,opacity] duration-200 ease-out group-hover:brightness-[1.02]";
}

type SmartCellarStatusKey = "ready" | "soon" | "hold" | "past" | "pronto";

type SmartCellarStatus = {
  key: SmartCellarStatusKey;
  label: string;
  badgeClass: string;
  hint: string;
};

type CardAiState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  source: "ai" | "fallback" | null;
  pairingLogic: string | null;
  pairings: PairingResult[];
};

function getStyleFamily(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return "tinto";
  if (s.includes("branco")) return "branco";
  if (s.includes("espum")) return "espumante";
  if (s.includes("rose") || s.includes("rosé")) return "rosé";
  if (s.includes("fortif")) return "fortificado";
  return "neutro";
}

function getSmartCellarStatus(wine: Pick<WineType, "drink_from" | "drink_until" | "vintage" | "style">): SmartCellarStatus {
  const styleFamily = getStyleFamily(wine.style);
  const age = wine.vintage ? currentYear - wine.vintage : null;

  if (!wine.vintage && !wine.drink_from && !wine.drink_until) {
    return {
      key: "pronto",
      label: "Pronto",
      badgeClass: "bg-green-100 text-green-800 border-green-200",
      hint: "Momento ideal para abrir.",
    };
  }

  if (wine.drink_from || wine.drink_until) {
    if (wine.drink_until && currentYear > wine.drink_until) {
      return {
        key: "past",
        label: "Pode ter perdido seu auge",
        badgeClass: "bg-neutral-100 text-neutral-600 border-neutral-200",
        hint: "Talvez tenha passado do ponto ideal.",
      };
    }
    if (wine.drink_from && currentYear < wine.drink_from) {
      return {
        key: "hold",
        label: "Guardar",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
        hint: "Ainda pede um pouco de guarda.",
      };
    }
    if (wine.drink_until && wine.drink_until - currentYear <= 1) {
      return {
        key: "soon",
        label: "Beber em breve",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-100",
        hint: "Melhor abrir em breve.",
      };
    }
    return {
      key: "ready",
      label: "Beber agora",
      badgeClass: "bg-green-100 text-green-800 border-green-200",
      hint: "Janela ideal de consumo.",
    };
  }

  if (age == null) {
    return {
      key: "pronto",
      label: "Pronto",
      badgeClass: "bg-neutral-100 text-neutral-600 border-neutral-200",
      hint: "Sem safra suficiente para estimativa.",
    };
  }

  const thresholds: Record<string, { hold: number; ready: number; soon: number }> = {
    tinto: { hold: 2, ready: 8, soon: 12 },
    branco: { hold: 1, ready: 4, soon: 6 },
    espumante: { hold: 1, ready: 3, soon: 5 },
    rosé: { hold: 1, ready: 3, soon: 4 },
    fortificado: { hold: 3, ready: 12, soon: 18 },
    neutro: { hold: 2, ready: 6, soon: 9 },
  };
  const limits = thresholds[styleFamily];

  if (age < limits.hold) {
    return {
      key: "hold",
      label: "Guardar",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
      hint: "Ainda tende a ganhar com guarda.",
    };
  }
  if (age <= limits.ready) {
    return {
      key: "ready",
      label: "Beber agora",
      badgeClass: "bg-green-100 text-green-800 border-green-200",
      hint: "Momento ideal para abrir.",
    };
  }
  if (age <= limits.soon) {
    return {
      key: "soon",
      label: "Beber em breve",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-100",
      hint: "Começa a pedir atenção.",
    };
  }
  return {
    key: "past",
    label: "Pode ter perdido seu auge",
    badgeClass: "bg-neutral-100 text-neutral-600 border-neutral-200",
    hint: "Talvez tenha passado do ponto ideal.",
  };
}

function buildLocalCellarInsight(wine: Pick<WineType, "style" | "grape" | "region" | "country" | "vintage" | "drink_from" | "drink_until">, status: SmartCellarStatus) {
  const family = getStyleFamily(wine.style);
  const age = wine.vintage ? currentYear - wine.vintage : null;
  const region = wine.region || wine.country;

  if (status.key === "past") {
    if (family === "tinto") return "Pode ter perdido seu auge: funciona melhor com carnes braseadas, cogumelos e molhos reduzidos.";
    if (family === "branco") return "Pode ter perdido seu auge: fica mais confortável com pratos cremosos, delicados e pouco agressivos.";
    if (family === "espumante") return "Pode ter perdido seu auge: ainda pode acompanhar frituras, sal e entradas crocantes com alguma elegância.";
    return "Pode ter perdido seu auge: prefira pratos de maior intensidade e textura para equilibrar a evolução.";
  }

  if (status.key === "soon") {
    if (family === "tinto") return "Beber em breve: carnes grelhadas, cogumelos e ragu mantêm o vinho em boa companhia.";
    if (family === "branco") return "Beber em breve: combina especialmente com pratos de textura média, como massas leves, aves grelhadas e preparações com molho branco.";
    if (family === "espumante") return "Beber em breve: petiscos salinos, ostras e entradas crocantes preservam a energia do vinho.";
    return "Beber em breve: pratos equilibrados e de textura macia ajudam a mostrar seu melhor lado.";
  }

  if (status.key === "hold") {
    if (family === "tinto") return "Guardar: ainda pode ganhar profundidade, especialmente se for acompanhado por pratos de textura mais suave.";
    if (family === "branco") return "Guardar: ainda está jovem, então prefira pratos frescos, ácidos e pouco gordurosos.";
    if (family === "espumante") return "Guardar: vale mais tempo de garrafa, ou serviço em contexto leve e frio.";
    return "Guardar: ainda está em construção; dê tempo ou acompanhe com pratos discretos.";
  }

  if (family === "tinto") {
    return `Momento ideal para abrir: carnes, cogumelos ou ragu${region ? ` ajudam a traduzir melhor a ${region}` : ""}.`;
  }
  if (family === "branco") {
    return `Momento ideal para abrir: peixe, aves e massas leves${region ? `, especialmente se vier de ${region}` : ""}.`;
  }
  if (family === "espumante") {
    return `Momento ideal para abrir: frituras, ostras e petiscos salgados${age != null ? `, mantendo frescor mesmo com ${age} anos` : ""}.`;
  }
  if (family === "rosé") {
    return `Momento ideal para abrir: saladas, frango e pratos mediterrâneos${region ? `, com eco de ${region}` : ""}.`;
  }
  return "Momento ideal para abrir com pratos de textura média e acidez equilibrada.";
}

function buildFallbackPairings(wine: WineType): PairingResult[] {
  const family = getStyleFamily(wine.style);
  const familyMap: Record<string, Array<{ dish: string; reason: string; label: string }>> = {
    tinto: [
      { dish: "Picanha grelhada", reason: "Tanino e gordura se encontram com mais equilíbrio em carne suculenta.", label: "gordura + estrutura" },
      { dish: "Ragu de cogumelos", reason: "A textura terrosa acompanha a profundidade de um tinto.", label: "umami + corpo" },
      { dish: "Massa ao molho vermelho", reason: "A acidez do molho ajuda a manter o vinho vivo no paladar.", label: "acidez + molho" },
      { dish: "Cordeiro assado", reason: "A intensidade do prato pede um vinho com presença de boca.", label: "intensidade + intensidade" },
      { dish: "Queijo curado", reason: "O sal e a untuosidade equilibram a estrutura do vinho.", label: "sal + tanino" },
    ],
    branco: [
      { dish: "Peixe grelhado", reason: "A acidez limpa a textura delicada e preserva frescor.", label: "frescor + leveza" },
      { dish: "Frango com ervas", reason: "Ervas e leveza pedem um branco mais preciso e elegante.", label: "ervas + precisão" },
      { dish: "Risoto de limão", reason: "A cremosidade ganha corte com a acidez do vinho.", label: "cremosidade + corte" },
      { dish: "Queijo de cabra", reason: "O sal do queijo e o frescor do vinho se encontram bem.", label: "sal + acidez" },
      { dish: "Camarão", reason: "Fruto do mar e branco seco costumam andar no mesmo ritmo.", label: "mar + frescor" },
    ],
    espumante: [
      { dish: "Ostras", reason: "Bolha e salinidade criam limpeza imediata no paladar.", label: "bolha + iodo" },
      { dish: "Tempurá", reason: "A carbonatação corta a fritura com facilidade.", label: "fritura + bolha" },
      { dish: "Queijo brie", reason: "A cremosidade do queijo pede contraste de acidez e gás.", label: "cremosidade + acidez" },
      { dish: "Petiscos salgados", reason: "Salgado e crocância reforçam a sensação de frescor.", label: "sal + crocância" },
      { dish: "Frango crocante", reason: "A textura frita melhora com bolha fina e final seco.", label: "crocância + corte" },
    ],
    rosé: [
      { dish: "Salmão grelhado", reason: "A gordura delicada do peixe pede um rosé fresco e versátil.", label: "gordura leve + frescor" },
      { dish: "Frango assado", reason: "Peso médio e tempero leve deixam espaço para a fruta do rosé.", label: "peso médio" },
      { dish: "Salada com queijo", reason: "Frescor e leveza equilibram sal e folhas.", label: "salada + frescor" },
      { dish: "Tábua de frios", reason: "Petiscos frios funcionam com fruta e acidez moderadas.", label: "petisco + fruta" },
      { dish: "Cozinha mediterrânea", reason: "Ervas e tomate pedem um vinho mais ágil e relaxado.", label: "ervas + tomate" },
    ],
    fortificado: [
      { dish: "Queijo azul", reason: "Doçura e sal são a chave para esse estilo.", label: "doce + sal" },
      { dish: "Chocolate amargo", reason: "A intensidade do cacau pede mais volume e persistência.", label: "cacau + persistência" },
      { dish: "Pudim de caramelo", reason: "Caramelo e concentração encontram o lado doce do vinho.", label: "caramelo + doçura" },
      { dish: "Nozes", reason: "Fruta seca ecoa os aromas mais oxidados do fortificado.", label: "fruta seca" },
      { dish: "Tarte de amêndoas", reason: "A estrutura densa do doce pede um vinho igualmente intenso.", label: "intensidade + doçura" },
    ],
    neutro: [
      { dish: "Massa ao sugo", reason: "Um prato de base simples deixa o vinho aparecer sem atrito.", label: "base + equilíbrio" },
      { dish: "Frango grelhado", reason: "Textura moderada e preparo limpo funcionam sem exagero.", label: "simples + limpo" },
      { dish: "Cogumelos", reason: "Umami e textura ajudam a dar direção ao conjunto.", label: "umami + textura" },
      { dish: "Queijo suave", reason: "Sal e gordura leves organizam o paladar.", label: "sal + gordura" },
      { dish: "Legumes assados", reason: "Assado e vegetal mantêm o vinho em bom ritmo.", label: "vegetal + assado" },
    ],
  };

  return (familyMap[family] || familyMap.neutro).slice(0, 5).map((item, index) => ({
    dish: item.dish,
    reason: item.reason,
    match: index === 0 ? "perfeito" : index < 3 ? "muito bom" : "bom",
    harmony_type: index === 0 ? "equilíbrio" : index === 1 ? "complemento" : "contraste",
    harmony_label: item.label,
    category: index === 0 ? "classico" : "afinidade",
  }));
}

/** Returns inline style for wine-type accent on cards */
function getWineTypeAccent(style?: string | null): React.CSSProperties {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return { borderLeftColor: "rgba(120, 20, 30, 0.18)", background: "linear-gradient(90deg, rgba(120, 20, 30, 0.04) 0%, transparent 44%)" };
  if (s.includes("branco")) return { borderLeftColor: "rgba(180, 150, 60, 0.18)", background: "linear-gradient(90deg, rgba(180, 150, 60, 0.04) 0%, transparent 44%)" };
  if (s.includes("rose") || s.includes("rosé")) return { borderLeftColor: "rgba(200, 120, 140, 0.18)", background: "linear-gradient(90deg, rgba(200, 120, 140, 0.04) 0%, transparent 44%)" };
  if (s.includes("espum")) return { borderLeftColor: "rgba(210, 190, 120, 0.18)", background: "linear-gradient(90deg, rgba(210, 190, 120, 0.04) 0%, transparent 44%)" };
  return {};
}

/** Returns hover accent for wine type */
function getWineTypeAccentHover(style?: string | null): React.CSSProperties {
  const s = (style || "").toLowerCase();
  if (s.includes("tinto")) return { borderLeftColor: "rgba(120, 20, 30, 0.24)", background: "linear-gradient(90deg, rgba(120, 20, 30, 0.065) 0%, transparent 44%)" };
  if (s.includes("branco")) return { borderLeftColor: "rgba(180, 150, 60, 0.24)", background: "linear-gradient(90deg, rgba(180, 150, 60, 0.065) 0%, transparent 44%)" };
  if (s.includes("rose") || s.includes("rosé")) return { borderLeftColor: "rgba(200, 120, 140, 0.24)", background: "linear-gradient(90deg, rgba(200, 120, 140, 0.065) 0%, transparent 44%)" };
  if (s.includes("espum")) return { borderLeftColor: "rgba(210, 190, 120, 0.24)", background: "linear-gradient(90deg, rgba(210, 190, 120, 0.065) 0%, transparent 44%)" };
  return {};
}

function WineImageThumb({
  src,
  alt,
  toneClassName,
  isGenerated = false,
  compact = false,
}: {
  src: string | null | undefined;
  alt: string;
  toneClassName: string;
  isGenerated?: boolean;
  compact?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const wrapperClassName = compact
    ? "relative h-[200px] sm:h-[214px] overflow-hidden rounded-t-3xl bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(244,241,236,0.82)_100%)]"
    : "relative h-[132px] sm:h-[140px] overflow-hidden rounded-[20px] border border-[rgba(95,111,82,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(244,241,236,0.82)_100%)] shadow-[0_14px_28px_-22px_rgba(58,51,39,0.18)]";

  return (
    <div className={wrapperClassName}>
      {src && !failed ? (
        <>
          {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/12 to-transparent" />
          {isGenerated && (
            <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-white/70 px-2.5 py-1 text-[10px] font-medium tracking-wide text-[#5F5F5F] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.28)] backdrop-blur-md">
              Imagem ilustrativa
            </div>
          )}
        </>
      ) : (
        <div className={cn("relative flex h-full w-full items-center justify-center overflow-hidden", toneClassName)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(95,111,82,0.10)_56%,rgba(255,255,255,0.78)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-transparent to-black/5" />
          <div className="relative flex flex-col items-center gap-1.5 px-2 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/55 text-[hsl(var(--primary))] shadow-[0_8px_18px_-12px_rgba(58,51,39,0.26)] backdrop-blur-md">
              <Wine className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-full border border-white/50 bg-white/45 px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-foreground/70 backdrop-blur-sm">
              Cover indisponível
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styleOptions = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "fortificado", label: "Fortificado" },
];

const drinkWindowOptions = [
  { value: "now", label: "Beber agora" },
  { value: "young", label: "Guardar" },
  { value: "past", label: "Pode ter perdido seu auge" },
];

const wineTypePalette: Record<string, { dot: string; text: string; label: string }> = {
  tinto: { dot: "#7B1E2B", text: "#7B1E2B", label: "Tinto" },
  rose: { dot: "#D8A7A7", text: "#A96F7A", label: "Rosé" },
  branco: { dot: "#C8A95B", text: "#A68B34", label: "Branco" },
  espumante: { dot: "#8FAF8B", text: "#6F8F6B", label: "Espumante" },
  neutral: { dot: "#C5BAAA", text: "#7A746B", label: "Vinho" },
};

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function getWineTypePaletteFor(style?: string | null) {
  const s = (style || "").toLowerCase();
  if (s.includes("tint")) return wineTypePalette.tinto;
  if (s.includes("ros")) return wineTypePalette.rose;
  if (s.includes("branc") || s.includes("white")) return wineTypePalette.branco;
  if (s.includes("espum") || s.includes("champ")) return wineTypePalette.espumante;
  return wineTypePalette.neutral;
}

function getDrinkWindowIndicator(wine: Pick<WineType, "drink_from" | "drink_until" | "vintage">) {
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

function getTypeAccentLabel(style?: string | null) {
  return getWineTypePaletteFor(style).label;
}

function getWineTypeLabelColor(style?: string | null) {
  return getWineTypePaletteFor(style).text;
}

function EditorialLabelPreview({
  src,
  alt,
  styleTone,
  generated = false,
}: {
  src: string | null | undefined;
  alt: string;
  styleTone: string;
  generated?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className="relative h-[180px] overflow-hidden rounded-[22px] border border-black/5 bg-[#F7F3EC]">
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className={`flex h-full items-center justify-center ${styleTone}`}>
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-white/65 px-4 py-3 text-center shadow-[0_10px_24px_-20px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[#7B1E2B]">
              <Wine className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6F6A60]">Rótulo indisponível</p>
              <p className="text-[10px] font-medium text-[#8A8276]">Prévia ilustrativa</p>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F4F1EC] via-[#F4F1EC]/75 to-transparent" />
      {generated && (
        <div className="absolute right-3 top-3 rounded-full border border-black/5 bg-white/72 px-2 py-1 text-[9px] font-medium text-[#6F6A60] shadow-[0_8px_18px_-16px_rgba(0,0,0,0.18)] backdrop-blur-sm">
          Imagem ilustrativa
        </div>
      )}
    </div>
  );
}

function EditorialWineCard({
  wine,
  showLabels,
  onOpen,
}: {
  wine: CellarWineGroup;
  showLabels: boolean;
  onOpen: (wine: CellarWineGroup) => void;
}) {
  const palette = getWineTypePaletteFor(wine.style);
  const coverImageUrl = wine.image_url ?? wine.entries.find((entry) => entry.image_url)?.image_url ?? null;
  const coverIsGenerated = !!coverImageUrl?.startsWith("data:image/svg+xml");
  const indicator = getDrinkWindowIndicator(wine);
  const priceLabel = formatMoney(wine.displayPurchasePrice);
  const ratingLabel = typeof wine.rating === "number" ? wine.rating.toFixed(1) : "—";

  return (
    <motion.article
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.88)] shadow-[0_12px_28px_-24px_rgba(44,20,31,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-28px_rgba(44,20,31,0.18)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      {showLabels ? (
        <EditorialLabelPreview
          src={coverImageUrl}
          alt={wine.name}
          generated={coverIsGenerated}
          styleTone={getWineTone(wine.style)}
        />
      ) : null}

      <div className={cn("flex flex-1 flex-col px-5", showLabels ? "pt-4 pb-5" : "py-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: palette.dot }}
            />
            <span
              className="text-[11px] font-medium tracking-[0.12em] uppercase"
              style={{ color: palette.text }}
            >
              {getTypeAccentLabel(wine.style)}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-tight text-[#B48B34]">
            <span className="text-[10px]">⭐</span>
            {ratingLabel}
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="font-serif text-[1.28rem] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1A1A1A]">
            {wine.name}
          </h3>
          <p className="text-[13px] font-medium text-[#7A7A7A]">
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
          <div className="flex items-center justify-between text-[10px] font-medium text-[#A39A90]">
            <span>{wine.drink_from ?? "—"}</span>
            <span>{wine.drink_until ?? "—"}</span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: palette.dot }}
              />
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#6F6A60]">
                {getTypeAccentLabel(wine.style)}
              </span>
            </div>
            <p className="text-[12px] text-[#7A7A7A]">
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

type CellarWineGroup = WineType & {
  groupKey: string;
  entries: WineType[];
  totalQuantity: number;
  displayPurchasePrice: number | null;
  distinctPriceCount: number;
};

// Filter components are now using MultiSelectDropdown

// Filter components are now using MultiSelectDropdown

function toggleInArray(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

export default function CellarPage() {
  const { data: wines, isLoading } = useWines();
  const deleteWine = useDeleteWine();
  const wineEvent = useWineEvent();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("drink");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedGrapes, setSelectedGrapes] = useState<string[]>([]);
  const [selectedDrinkWindows, setSelectedDrinkWindows] = useState<string[]>([]);
  const [selectedVintages, setSelectedVintages] = useState<string[]>([]);
  const [lowStock, setLowStock] = useState(false);
  const [vintageRange, setVintageRange] = useState<[number, number]>([1980, currentYear]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showLabels, setShowLabels] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editWine, setEditWine] = useState<WineType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WineType | null>(null);
  const [activeSavedFilter, setActiveSavedFilter] = useState<string | null>(null); // kept for filter reset logic
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [consumptionWine, setConsumptionWine] = useState<WineType | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [cardAiStates, setCardAiStates] = useState<Record<string, CardAiState>>({});
  const isMobile = useIsSmallScreen();

  // Derive dynamic filter options from wine data
  const dynamicOptions = useMemo(() => {
    if (!wines) return { countries: [], grapes: [], styles: [], vintages: [], maxPrice: 5000, minVintage: 1980, maxVintage: currentYear };
    
    // Count wines per country
    const countryMap: Record<string, number> = {};
    wines.forEach(w => { if (w.country) countryMap[w.country] = (countryMap[w.country] || 0) + w.quantity; });
    const countries = Object.entries(countryMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ value: v, label: v, count: c }));
    
    // Count wines per grape (add "Blend" for wines without a grape)
    const grapeMap: Record<string, number> = {};
    let noGrapeCount = 0;
    wines.forEach(w => {
      if (w.grape) grapeMap[w.grape] = (grapeMap[w.grape] || 0) + w.quantity;
      else noGrapeCount += w.quantity;
    });
    const grapes = [
      ...(noGrapeCount > 0 ? [{ value: "blend", label: "Blend", count: noGrapeCount }] : []),
      ...Object.entries(grapeMap).sort(([a], [b]) => a.localeCompare(b)).map(([v, c]) => ({ value: v, label: v, count: c })),
    ];
    
    // Count wines per style
    const styleMap: Record<string, number> = {};
    wines.forEach(w => { if (w.style) styleMap[w.style] = (styleMap[w.style] || 0) + w.quantity; });
    const styles = styleOptions.map(s => ({ ...s, count: styleMap[s.value] || 0 }));
    
    // Count wines per drink window
    const dwMap: Record<string, number> = {};
    wines.forEach(w => { const s = drinkStatus(w); if (s) dwMap[s] = (dwMap[s] || 0) + w.quantity; });
    const drinkWindows = drinkWindowOptions.map(d => ({ ...d, count: dwMap[d.value] || 0 }));

    // Count wines per vintage (include "Sem safra")
    const vintageMap: Record<string, number> = {};
    let noVintageCount = 0;
    wines.forEach(w => {
      if (w.vintage) {
        vintageMap[String(w.vintage)] = (vintageMap[String(w.vintage)] || 0) + w.quantity;
      } else {
        noVintageCount += w.quantity;
      }
    });
    const vintageOptions = [
      ...(noVintageCount > 0 ? [{ value: "sem-safra", label: "Sem safra", count: noVintageCount }] : []),
      ...Object.entries(vintageMap).sort(([a], [b]) => Number(b) - Number(a)).map(([v, c]) => ({ value: v, label: v, count: c })),
    ];
    
    const prices = wines.map(w => w.purchase_price ?? 0).filter(p => p > 0);
    const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices) / 100) * 100 : 5000;
    const vintageNums = wines.map(w => w.vintage).filter(Boolean) as number[];
    const minVintage = vintageNums.length > 0 ? Math.min(...vintageNums) : 1980;
    const maxVintage = vintageNums.length > 0 ? Math.max(...vintageNums) : currentYear;
    return { countries, grapes, styles, drinkWindows, vintageOptions, maxPrice: Math.max(maxPrice, 100), minVintage: Math.min(minVintage, 1980), maxVintage: Math.max(maxVintage, currentYear) };
  }, [wines]);

  // Sync range filters with dynamic options so they don't appear as "active" on load
  useEffect(() => {
    setPriceRange([0, dynamicOptions.maxPrice]);
    setVintageRange([dynamicOptions.minVintage, dynamicOptions.maxVintage]);
  }, [dynamicOptions.maxPrice, dynamicOptions.minVintage, dynamicOptions.maxVintage]);

  const groupedWines = useMemo<CellarWineGroup[]>(() => {
    if (!wines) return [];

    const groups = new Map<string, WineType[]>();
    wines.forEach((wine) => {
      const groupKey = [
        normalizeGroupValue(wine.name),
        normalizeGroupValue(wine.producer),
        wine.vintage == null ? "sem-safra" : String(wine.vintage),
      ].join("::");
      const current = groups.get(groupKey) ?? [];
      current.push(wine);
      groups.set(groupKey, current);
    });

    return Array.from(groups.entries()).map(([groupKey, entries]) => {
      const representative = entries[0];
      const prices = entries
        .map((entry) => entry.purchase_price ?? entry.current_value ?? null)
        .filter((price): price is number => typeof price === "number" && Number.isFinite(price));
      const distinctPriceCount = new Set(prices).size;
      const displayPurchasePrice = prices.length > 0 ? prices[0] : null;
      const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);

      return {
        ...representative,
        quantity: totalQuantity,
        groupKey,
        entries,
        totalQuantity,
        displayPurchasePrice,
        distinctPriceCount,
      };
    });
  }, [wines]);

  const getCardAiState = (id: string): CardAiState => cardAiStates[id] || {
    open: false,
    loading: false,
    error: null,
    source: null,
    pairingLogic: null,
    pairings: [],
  };

  const toggleCardAi = async (wine: CellarWineGroup) => {
    const current = getCardAiState(wine.id);
    if (current.open) {
      setCardAiStates((prev) => ({
        ...prev,
        [wine.id]: { ...current, open: false },
      }));
      return;
    }

    setCardAiStates((prev) => ({
      ...prev,
      [wine.id]: {
        ...current,
        open: true,
        loading: current.pairings.length === 0 && current.source !== "fallback",
        error: null,
      },
    }));

    if (current.pairings.length > 0) return;

    try {
      const result = await getWinePairings({
        name: wine.name,
        style: wine.style,
        grape: wine.grape,
        region: wine.region,
        producer: wine.producer,
        vintage: wine.vintage,
        country: wine.country,
      });

      setCardAiStates((prev) => ({
        ...prev,
        [wine.id]: {
          open: true,
          loading: false,
          error: null,
          source: result.fallback ? "fallback" : "ai",
          pairingLogic: result.pairingLogic || buildLocalCellarInsight(wine, getSmartCellarStatus(wine)),
          pairings: (result.pairings || []).slice(0, 5),
        },
      }));
    } catch (error) {
      const fallbackPairings = buildFallbackPairings(wine);
      setCardAiStates((prev) => ({
        ...prev,
        [wine.id]: {
          open: true,
          loading: false,
          error: error instanceof Error ? error.message : "Não foi possível carregar sugestões agora.",
          source: "fallback",
          pairingLogic: buildLocalCellarInsight(wine, getSmartCellarStatus(wine)),
          pairings: fallbackPairings,
        },
      }));
    }
  };

  const toggleCardInsight = (wine: CellarWineGroup) => {
    const current = getCardAiState(wine.id);
    setCardAiStates((prev) => ({
      ...prev,
      [wine.id]: {
        ...current,
        open: !current.open,
      },
    }));
    if (!current.open && current.pairings.length === 0 && !current.loading) {
      void toggleCardAi(wine);
    }
  };

  const handleRecipeClick = (dish: string) => {
    toast({
      title: "Ver receita",
      description: `Receita de ${dish} em breve.`,
    });
  };


  const clearFilters = () => {
    setSelectedStyles([]);
    setSelectedCountries([]);
    setSelectedGrapes([]);
    setSelectedVintages([]);
    setSelectedDrinkWindows([]);
    setLowStock(false);
    setVintageRange([dynamicOptions.minVintage, dynamicOptions.maxVintage]);
    setPriceRange([0, dynamicOptions.maxPrice]);
    setActiveSavedFilter(null);
    setSearch("");
  };

  const vintageActive = vintageRange[0] !== dynamicOptions.minVintage || vintageRange[1] !== dynamicOptions.maxVintage;
  const priceActive = priceRange[0] !== 0 || priceRange[1] !== dynamicOptions.maxPrice;
  const activeFilterCount = selectedStyles.length + selectedCountries.length + selectedGrapes.length + selectedVintages.length + selectedDrinkWindows.length + (lowStock ? 1 : 0) + (vintageActive ? 1 : 0) + (priceActive ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || !!search;

  const filtered = useMemo(() => {
    let list = groupedWines.filter(w => w.quantity > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        w.name.toLowerCase().includes(q) || w.producer?.toLowerCase().includes(q) ||
        w.grape?.toLowerCase().includes(q) || w.country?.toLowerCase().includes(q) ||
        w.region?.toLowerCase().includes(q) || w.cellar_location?.toLowerCase().includes(q) ||
        (w.vintage && String(w.vintage).includes(q)) ||
        w.entries.some((entry) =>
          entry.name.toLowerCase().includes(q) ||
          entry.producer?.toLowerCase().includes(q) ||
          entry.cellar_location?.toLowerCase().includes(q)
        )
      );
    }
    if (selectedStyles.length > 0) list = list.filter(w => w.style && selectedStyles.includes(w.style));
    if (selectedCountries.length > 0) list = list.filter(w => w.country && selectedCountries.includes(w.country));
    if (selectedGrapes.length > 0) list = list.filter(w => {
      if (selectedGrapes.includes("blend") && !w.grape) return true;
      return w.grape && selectedGrapes.includes(w.grape);
    });
    if (selectedVintages.length > 0) list = list.filter(w => {
      if (selectedVintages.includes("sem-safra") && !w.vintage) return true;
      return w.vintage && selectedVintages.includes(String(w.vintage));
    });
    if (vintageActive) list = list.filter(w => w.vintage && w.vintage >= vintageRange[0] && w.vintage <= vintageRange[1]);
    if (priceActive) list = list.filter(w => {
      const price = w.purchase_price ?? 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });
    if (selectedDrinkWindows.length > 0) list = list.filter(w => {
      const s = drinkStatus(w);
      return s && selectedDrinkWindows.includes(s);
    });
    if (lowStock) list = list.filter(w => w.quantity <= 2);

    list.sort((a, b) => {
      if (sortBy === "drink") {
        const order = { now: 0, young: 1, past: 2 };
        return (order[drinkStatus(a) as keyof typeof order] ?? 3) - (order[drinkStatus(b) as keyof typeof order] ?? 3);
      }
      if (sortBy === "drinkNow") {
        const aNow = drinkStatus(a) === "now" ? 1 : 0;
        const bNow = drinkStatus(b) === "now" ? 1 : 0;
        return bNow - aNow || a.name.localeCompare(b.name);
      }
      if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "expensive") return (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0);
      if (sortBy === "lowStock") return a.quantity - b.quantity;
      if (sortBy === "value") return (b.current_value ?? b.purchase_price ?? 0) - (a.current_value ?? a.purchase_price ?? 0);
      if (sortBy === "qty") return b.quantity - a.quantity;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [groupedWines, search, sortBy, selectedStyles, selectedCountries, selectedGrapes, selectedVintages, vintageRange, priceRange, selectedDrinkWindows, lowStock, vintageActive, priceActive]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWine.mutateAsync(deleteTarget.id);
      toast({ title: `"${deleteTarget.name}" removido da adega.` });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Não conseguimos remover o vinho", description: "Verifique sua conexão e tente novamente. O vinho permanece na adega.", variant: "destructive" });
    }
  };

  const handleOpen = async (wine: WineType) => {
    try {
      await wineEvent.mutateAsync({ wineId: wine.id, eventType: "open", quantity: 1 });
      toast({ title: `🍷 "${wine.name}" aberto!` });
    } catch {
      toast({ title: "Não conseguimos registrar a abertura", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
    }
  };

  // Build active filter summary chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  selectedStyles.forEach(s => {
    const opt = styleOptions.find(o => o.value === s);
    activeChips.push({ label: opt?.label || s, onRemove: () => setSelectedStyles(prev => prev.filter(v => v !== s)) });
  });
  selectedCountries.forEach(c => {
    activeChips.push({ label: c, onRemove: () => setSelectedCountries(prev => prev.filter(v => v !== c)) });
  });
  selectedGrapes.forEach(g => {
    activeChips.push({ label: g, onRemove: () => setSelectedGrapes(prev => prev.filter(v => v !== g)) });
  });
  selectedVintages.forEach(v => {
    activeChips.push({ label: `Safra ${v}`, onRemove: () => setSelectedVintages(prev => prev.filter(x => x !== v)) });
  });
  if (vintageActive) {
    activeChips.push({ label: `Safra ${vintageRange[0]}–${vintageRange[1]}`, onRemove: () => setVintageRange([dynamicOptions.minVintage, dynamicOptions.maxVintage]) });
  }
  if (priceActive) {
    activeChips.push({ label: `R$ ${priceRange[0]}–${priceRange[1]}`, onRemove: () => setPriceRange([0, dynamicOptions.maxPrice]) });
  }
  selectedDrinkWindows.forEach(dw => {
    const opt = drinkWindowOptions.find(o => o.value === dw);
    activeChips.push({ label: opt?.label || dw, onRemove: () => setSelectedDrinkWindows(prev => prev.filter(v => v !== dw)) });
  });
  if (lowStock) {
    activeChips.push({ label: "Baixo estoque", onRemove: () => setLowStock(false) });
  }

  const visibleBottleCount = filtered.reduce((sum, wine) => sum + wine.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F4F1EC] text-[#1A1A1A]">
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.78)] px-5 py-5 shadow-[0_12px_28px_-26px_rgba(0,0,0,0.16)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl space-y-2">
              <p className="t-eyebrow">Adega pessoal</p>
              <h1 className="t-title mt-1.5">Minha adega</h1>
              <p className="t-subtitle mt-1.5">
                {filtered.length} rótulo{filtered.length !== 1 ? "s" : ""} · {visibleBottleCount} garrafa{visibleBottleCount !== 1 ? "s" : ""} em estoque
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setAddOpen(true)} className="h-10 px-5 text-[13px] font-medium">
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar vinho
            </Button>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-4 shadow-[0_10px_24px_-24px_rgba(0,0,0,0.14)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-[460px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9C9488]" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquise vinho, produtor, uva, safra…"
                className="h-11 rounded-full border-black/5 bg-white/85 pl-9 text-[13px] font-medium text-[#1A1A1A] placeholder:text-[#9C9488] shadow-none focus:border-[#C8A95B] focus:ring-[#C8A95B]/15"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/75 px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C8578]">Rótulos</span>
                <Switch checked={showLabels} onCheckedChange={setShowLabels} />
                <span className="text-[11px] font-medium text-[#6F6A60]">Exibir rótulos</span>
              </div>
              <div className="hidden sm:flex rounded-full border border-black/5 bg-white/75 p-[2px]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-8 w-8 rounded-full transition-[transform,background-color,color,opacity] duration-200 ease-out active:scale-[0.98] cursor-pointer",
                    viewMode === "grid" ? "bg-[#7B1E2B] text-white hover:bg-[#7B1E2B]" : "text-[#7B6F76] hover:text-[#1A1A1A]",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-8 w-8 rounded-full transition-[transform,background-color,color,opacity] duration-200 ease-out active:scale-[0.98] cursor-pointer",
                    viewMode === "list" ? "bg-[#7B1E2B] text-white hover:bg-[#7B1E2B]" : "text-[#7B6F76] hover:text-[#1A1A1A]",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-9 rounded-full border border-black/5 bg-white/78 px-3 pr-7 text-[11px] font-medium text-[#5F5A53] shadow-none transition-[transform,background-color,color,filter] duration-200 ease-out hover:bg-white active:scale-[0.98]"
              >
                <option value="drink">Prioridade</option>
                <option value="drinkNow">Beber agora</option>
                <option value="expensive">Mais caros</option>
                <option value="lowStock">Menos estoque</option>
                <option value="date">Recentes</option>
                <option value="name">Nome A-Z</option>
                <option value="value">Valor</option>
                <option value="qty">Quantidade</option>
              </select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setLowStock(!lowStock); setActiveSavedFilter(null); }}
                className={cn(
                  "h-9 rounded-full border px-3 text-[11px] font-medium transition-[transform,background-color,color,filter] duration-200 ease-out active:scale-[0.98]",
                  lowStock
                    ? "border-[#7B1E2B]/20 bg-[#7B1E2B]/8 text-[#7B1E2B] hover:bg-[#7B1E2B]/10"
                    : "border-black/5 bg-white/78 text-[#6F6A60] hover:bg-white hover:text-[#1A1A1A]",
                )}
              >
                Baixo estoque
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
            <div className="rounded-[24px] border border-black/5 bg-white/72 p-2.5">
              <div className="flex flex-wrap items-center gap-1">
                <MultiSelectDropdown title="Estilo" options={dynamicOptions.styles || styleOptions} selected={selectedStyles} onChange={(v) => { setSelectedStyles(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedStyles([]); setActiveSavedFilter(null); }} />
                <MultiSelectDropdown title="País" options={dynamicOptions.countries} selected={selectedCountries} onChange={(v) => { setSelectedCountries(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedCountries([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar país..." />
                <MultiSelectDropdown title="Uva" options={dynamicOptions.grapes} selected={selectedGrapes} onChange={(v) => { setSelectedGrapes(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedGrapes([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar uva..." />
                <MultiSelectDropdown title="Safra" options={dynamicOptions.vintageOptions || []} selected={selectedVintages} onChange={(v) => { setSelectedVintages(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedVintages([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar safra..." />
                <MultiSelectDropdown title="Janela" options={dynamicOptions.drinkWindows || drinkWindowOptions} selected={selectedDrinkWindows} onChange={(v) => { setSelectedDrinkWindows(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedDrinkWindows([]); setActiveSavedFilter(null); }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 rounded-[24px] border border-black/5 bg-white/72 p-2.5">
              <div className="rounded-[18px] border border-black/5 bg-white/78 px-3 py-2">
                <RangeSliderFilter label="Safra" min={dynamicOptions.minVintage} max={dynamicOptions.maxVintage} step={1} value={vintageRange} onChange={v => { setVintageRange(v); setActiveSavedFilter(null); }} />
              </div>
              <div className="rounded-[18px] border border-black/5 bg-white/78 px-3 py-2">
                <RangeSliderFilter label="Preço" min={0} max={dynamicOptions.maxPrice} step={10} value={priceRange} onChange={v => { setPriceRange(v); setActiveSavedFilter(null); }} formatValue={v => `R$ ${v}`} />
              </div>
            </div>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-[24px] border border-black/5 bg-[rgba(255,255,255,0.70)] p-3 shadow-[0_10px_24px_-24px_rgba(0,0,0,0.12)]">
            <span className="mr-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#8C8578]">Filtros ativos:</span>
            {activeChips.map((chip, i) => (
              <Badge key={i} variant="secondary" className="group h-[24px] rounded-full border-[hsl(var(--wine)/0.16)] bg-[hsl(var(--wine)/0.08)] pl-3 pr-2 text-[9.5px] font-semibold text-[hsl(var(--wine))] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[filter] duration-200 ease-out hover:brightness-[1.03]">
                {chip.label}
                <X className="ml-1.5 h-3 w-3 cursor-pointer opacity-40 transition-opacity duration-150 hover:opacity-100" onClick={chip.onRemove} />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-1 h-7 text-[10px] font-medium text-[#7B1E2B] hover:bg-[#7B1E2B]/8">
              Limpar tudo
            </Button>
          </div>
        )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <PremiumEmptyState
          icon={Wine}
          title="Sua coleção começa aqui"
          description={hasActiveFilters
            ? "Não encontramos vinhos com esses critérios. Tente simplificar seus filtros para explorar novos rótulos."
            : "Cada garrafa conta uma história. Comece a catalogar seu acervo e tenha controle total da sua adega na palma da mão."}
          primaryAction={!hasActiveFilters ? {
            label: "Adicionar primeiro vinho",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setAddOpen(true)
          } : undefined}
          secondaryAction={hasActiveFilters ? {
            label: "Limpar todos os filtros",
            onClick: clearFilters
          } : undefined}
        />
      ) : viewMode === "grid" ? (
        <div className={cn("grid gap-4", showLabels ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-[repeat(auto-fill,minmax(260px,1fr))]") }>
          {filtered.map((wine) => (
            <WineCard
              key={wine.id}
              wine={wine}
              showLabel={showLabels}
              onOpen={handleOpen}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.76)] shadow-[0_10px_24px_-24px_rgba(0,0,0,0.14)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 bg-black/[0.02]">
                <th className="px-3 py-2.5 text-left text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#8C8578]">Vinho</th>
                <th className="hidden px-3 py-2.5 text-left text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#8C8578] sm:table-cell">Estilo</th>
                <th className="hidden px-3 py-2.5 text-right text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#8C8578] md:table-cell">Preço</th>
                <th className="px-3 py-2.5 text-center text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#8C8578]">Qtd</th>
                <th className="hidden px-3 py-2.5 text-center text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#8C8578] md:table-cell">Status</th>
                <th className="px-3 py-2.5 text-right text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#8C8578]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wine) => {
                const status = drinkStatus(wine);
                const coverImageUrl = wine.image_url ?? wine.entries.find((entry) => entry.image_url)?.image_url ?? null;
                return (
                  <tr
                    key={wine.id}
                    className="group border-b border-black/5 transition-[transform,background-color,box-shadow,filter] duration-200 ease-out last:border-0 hover:bg-black/[0.015] hover:-translate-y-[1px]"
                    style={{ borderLeftColor: getWineTypeAccent(wine.style).borderLeftColor || 'transparent' }}
                  >
                    <td className="px-3 py-2.25 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-7 shrink-0 overflow-hidden rounded-lg border border-border/20 bg-muted/20 transition-[filter,transform] duration-200 ease-out group-hover:brightness-[1.03]">
                          {coverImageUrl ? (
                            <img src={coverImageUrl} alt={wine.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className={cn("h-full w-full", getWineTone(wine.style))} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10.75px] font-semibold text-[#18131b] truncate max-w-[200px] tracking-[-0.015em]">{wine.name}</p>
                          <p className="text-[8.75px] text-[#6e6573] leading-snug">{[wine.producer, formatVintageLabel(wine.vintage), wine.country].filter(Boolean).join(" · ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.25 hidden sm:table-cell align-middle">
                      <span className={cn("inline-flex items-center justify-center px-2.25 py-0.5 capitalize transition-[filter,opacity] duration-200 ease-out group-hover:brightness-[1.03]", getStyleBadgeClass(wine.style, true))}>{wine.style || "—"}</span>
                    </td>
                    <td className="px-3 py-2.25 text-right hidden md:table-cell align-middle">
                      <span className="text-[9.75px] font-semibold text-[#665f6d]">{wine.displayPurchasePrice != null ? `R$ ${wine.displayPurchasePrice.toFixed(0)}` : "—"}</span>
                    </td>
                    <td className="px-3 py-2.25 text-center align-middle">
                      <span className="text-[10.75px] font-semibold text-[#17131a] tabular-nums">{wine.quantity}</span>
                    </td>
                    <td className="px-3 py-2.25 text-center hidden md:table-cell align-middle">
                      {status ? (
                        <Badge variant="secondary" className={cn("text-[8.5px] h-[18px] px-1.75 transition-[filter,opacity] duration-200 ease-out group-hover:brightness-[1.03]", statusColor[status])}>{statusLabel[status]}</Badge>
                      ) : <span className="text-[9px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.25 text-right align-middle">
                      <div className="flex gap-0.5 justify-end">
                        <Button size="sm" variant="secondary" className="h-5.5 w-5.5 p-0 transition-[transform,background-color,filter] duration-200 ease-out active:scale-[0.98] hover:brightness-[1.03] cursor-pointer" title="Registrar consumo" onClick={() => setConsumptionWine(wine)}>
                          <UtensilsCrossed className="h-2.75 w-2.75" />
                        </Button>
                        {status === "now" && (
                          <Button size="sm" variant="secondary" className="h-5.5 w-5.5 p-0 transition-[transform,background-color,filter] duration-200 ease-out active:scale-[0.98] hover:brightness-[1.03] cursor-pointer" title="Abrir garrafa" onClick={() => handleOpen(wine)}>
                            <GlassWater className="h-2.75 w-2.75" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-5.5 w-5.5 p-0 text-[#7a6f78]/80 hover:text-[#2f2730] hover:bg-black/[0.05] active:scale-[0.98] transition-[transform,background-color,color,opacity] duration-200 ease-out cursor-pointer" title="Editar" onClick={() => setEditWine(wine)}>
                          <Pencil className="h-2.75 w-2.75" />
                        </Button>
                        <Button size="sm" variant="danger" className="h-5.5 w-5.5 p-0 transition-[transform,background-color,filter] duration-200 ease-out active:scale-[0.98] hover:brightness-[1.03] cursor-pointer" title="Remover" onClick={() => setDeleteTarget(wine)}>
                          <Trash2 className="h-2.75 w-2.75" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddWineDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageBottleDialog open={manageOpen} onOpenChange={setManageOpen} />
      <EditWineDialog open={!!editWine} onOpenChange={v => { if (!v) setEditWine(null); }} wine={editWine} />
      <AddConsumptionDialog
        open={!!consumptionWine}
        onOpenChange={v => { if (!v) setConsumptionWine(null); }}
        preSelectedWine={consumptionWine}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Remover vinho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>"{deleteTarget?.name}"</strong> da sua adega? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}
