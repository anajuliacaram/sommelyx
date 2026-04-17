import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Wine, Plus, Pencil, Trash2, LayoutGrid, List, GlassWater, X, UtensilsCrossed, MapPin } from "@/icons/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  return "bg-[#8F2D56]";
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
  compact = false,
}: {
  src: string | null | undefined;
  alt: string;
  toneClassName: string;
  compact?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const wrapperClassName = compact
    ? "relative h-[104px] sm:h-[110px] overflow-hidden rounded-[20px] border border-[rgba(95,111,82,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84)_0%,rgba(244,241,236,0.82)_100%)] shadow-[0_14px_28px_-22px_rgba(58,51,39,0.18)]"
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
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/16 to-transparent" />
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
      toast({ title: "Erro ao remover vinho", variant: "destructive" });
    }
  };

  const handleOpen = async (wine: WineType) => {
    try {
      await wineEvent.mutateAsync({ wineId: wine.id, eventType: "open", quantity: 1 });
      toast({ title: `🍷 "${wine.name}" aberto!` });
    } catch {
      toast({ title: "Erro ao registrar abertura", variant: "destructive" });
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
      <div className="space-y-4 max-w-[1200px]">
      {/* Header */}
      <div className="section-surface section-surface--full rounded-[24px] px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-[1.95rem] font-serif font-semibold text-foreground tracking-[-0.03em]">Minha Adega</h1>
          <p className="text-[13px] md:text-[14px] text-foreground/62 font-medium mt-0.5">
            {filtered.length} rótulo{filtered.length !== 1 ? "s" : ""} · {visibleBottleCount} garrafa{visibleBottleCount !== 1 ? "s" : ""} em estoque
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)} className="h-9 px-5 text-xs font-semibold">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar vinho
        </Button>
      </div>

      {/* Search + Actions */}
      <div className="flex flex-col gap-2.5">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquise vinho, produtor, uva, safra…"
            className="pl-9 h-10 text-[13px] font-medium rounded-xl border-white/40 shadow-[0_10px_20px_-18px_rgba(0,0,0,0.18)] focus:ring-primary/10 focus:border-primary/20 transition-all w-full text-[#19141b] placeholder:text-[#7b707f]"
            style={{ background: "rgba(255,255,255,0.64)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-1.5 rounded-[22px] border border-white/14 bg-[rgba(255,255,255,0.44)] p-2.5 shadow-[0_14px_30px_-26px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <MultiSelectDropdown title="Estilo" options={dynamicOptions.styles || styleOptions} selected={selectedStyles} onChange={(v) => { setSelectedStyles(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedStyles([]); setActiveSavedFilter(null); }} />
              <MultiSelectDropdown title="País" options={dynamicOptions.countries} selected={selectedCountries} onChange={(v) => { setSelectedCountries(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedCountries([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar país..." />
              <MultiSelectDropdown title="Uva" options={dynamicOptions.grapes} selected={selectedGrapes} onChange={(v) => { setSelectedGrapes(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedGrapes([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar uva..." />
              <MultiSelectDropdown title="Safra" options={dynamicOptions.vintageOptions || []} selected={selectedVintages} onChange={(v) => { setSelectedVintages(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedVintages([]); setActiveSavedFilter(null); }} searchPlaceholder="Buscar safra..." />
              <MultiSelectDropdown title="Janela" options={dynamicOptions.drinkWindows || drinkWindowOptions} selected={selectedDrinkWindows} onChange={(v) => { setSelectedDrinkWindows(prev => toggleInArray(prev, v)); setActiveSavedFilter(null); }} onClear={() => { setSelectedDrinkWindows([]); setActiveSavedFilter(null); }} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setLowStock(!lowStock); setActiveSavedFilter(null); }}
                 className={cn(
                   "h-[28px] px-3 rounded-full text-[10px] font-semibold flex items-center gap-1 border transition-[transform,background-color,filter,box-shadow] duration-200 ease-out cursor-pointer active:scale-[0.98]",
                   lowStock
                     ? "bg-[hsl(var(--wine))] text-white border-[hsl(var(--wine))] shadow-[0_10px_20px_-18px_rgba(0,0,0,0.28)] hover:brightness-110"
                     : "bg-white/54 backdrop-blur-sm text-[#5a5260] border-white/22 shadow-[0_8px_18px_-16px_rgba(0,0,0,0.14)] hover:bg-white/64 hover:text-[#19141b]"
                 )}
              >
                Baixo estoque
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex rounded-full p-[2px] bg-[rgba(255,255,255,0.48)] backdrop-blur-sm border border-white/16 shadow-[0_8px_18px_-16px_rgba(0,0,0,0.16)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={cn("h-7 w-7 rounded-full transition-[transform,background-color,color,opacity] duration-200 ease-out active:scale-[0.98] cursor-pointer", viewMode === "grid" ? "bg-[hsl(var(--wine))] text-white shadow-sm hover:bg-[hsl(var(--wine))]" : "text-[#6f6675] hover:text-[#19141b]")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                  className={cn("h-7 w-7 rounded-full transition-[transform,background-color,color,opacity] duration-200 ease-out active:scale-[0.98] cursor-pointer", viewMode === "list" ? "bg-[hsl(var(--wine))] text-white shadow-sm hover:bg-[hsl(var(--wine))]" : "text-[#6f6675] hover:text-[#19141b]")}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-[30px] px-3 pr-7 text-[11px] font-semibold rounded-full bg-[rgba(255,255,255,0.52)] backdrop-blur-sm cursor-pointer border border-white/18 text-[#5b5261] shadow-[0_8px_18px_-16px_rgba(0,0,0,0.16)] hover:bg-white/64 hover:text-[#19141b] transition-[transform,background-color,color,filter] duration-200 ease-out active:scale-[0.98]"
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
            </div>
          </div>

          {/* Compact Range Sliders — single row */}
          <div className="grid grid-cols-2 gap-2">
             <div className="rounded-xl px-3 py-1.5" style={{ background: "rgba(255,255,255,0.64)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.30)", boxShadow: "0 10px 20px -18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.28)" }}>
               <RangeSliderFilter label="Safra" min={dynamicOptions.minVintage} max={dynamicOptions.maxVintage} step={1} value={vintageRange} onChange={v => { setVintageRange(v); setActiveSavedFilter(null); }} />
             </div>
             <div className="rounded-xl px-3 py-1.5" style={{ background: "rgba(255,255,255,0.64)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.30)", boxShadow: "0 10px 20px -18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.28)" }}>
               <RangeSliderFilter label="Preço" min={0} max={dynamicOptions.maxPrice} step={10} value={priceRange} onChange={v => { setPriceRange(v); setActiveSavedFilter(null); }} formatValue={v => `R$ ${v}`} />
            </div>
          </div>
        </div>
      </div>


      {/* Active filter chips summary */}
      {activeChips.length > 0 && (
        <div className="glass-card p-2.5 flex flex-wrap gap-1.5 items-center">
          <span className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#6f6572] mr-1">Filtros ativos:</span>
          {activeChips.map((chip, i) => (
            <Badge key={i} variant="secondary" className="pl-3 pr-2 h-[24px] text-[9.5px] rounded-full group border-[hsl(var(--wine)/0.20)] bg-[hsl(var(--wine)/0.08)] text-[hsl(var(--wine))] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[filter] duration-200 ease-out hover:brightness-[1.03]">
              {chip.label}
              <X className="ml-1.5 h-3 w-3 cursor-pointer opacity-40 hover:opacity-100 transition-opacity duration-150" onClick={chip.onRemove} />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-[10px] font-semibold text-destructive hover:bg-destructive/10 ml-1 transition-[transform,background-color,opacity] duration-200 ease-out active:scale-[0.98] cursor-pointer">
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
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((wine, i) => {
            const status = drinkStatus(wine);
            const smartStatus = getSmartCellarStatus(wine);
            const aiState = getCardAiState(wine.id);
            const cardInsight = buildLocalCellarInsight(wine, smartStatus);
            const isExpanded = !!expandedGroups[wine.groupKey];
            const hasGroupDetails = wine.entries.length > 1;
            const hasPriceVariance = wine.distinctPriceCount > 1;
            const coverImageUrl = wine.image_url ?? wine.entries.find((entry) => entry.image_url)?.image_url ?? null;
            return (
              <motion.div
                key={wine.id}
                className="group relative flex h-full min-h-[312px] flex-col overflow-hidden wine-card-glass px-[4px] py-[3px] transition-[transform,box-shadow,filter] duration-200 ease-out border-l-[3px] cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_18px_34px_-26px_rgba(44,20,31,0.24)]"
                style={getWineTypeAccent(wine.style)}
                onMouseEnter={(e) => { Object.assign(e.currentTarget.style, getWineTypeAccentHover(wine.style)); }}
                onMouseLeave={(e) => { Object.assign(e.currentTarget.style, getWineTypeAccent(wine.style)); }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="transition-[filter,transform] duration-200 ease-out group-hover:brightness-[1.025]">
                  <WineImageThumb src={coverImageUrl} alt={wine.name} toneClassName={getWineTone(wine.style)} compact />
                </div>

                <div className="mt-0.25 flex flex-1 min-h-0 flex-col rounded-[18px] border border-white/70 bg-[rgba(255,255,255,0.96)] px-2 py-[5px] shadow-[0_14px_32px_-26px_rgba(44,20,31,0.28)] backdrop-blur-[12px]">
                  {/* ── Top: Name + Status ── */}
                  <div className="mb-0.75 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-[12.5px] font-serif font-semibold leading-snug text-[#17131a] tracking-[-0.018em]">
                        {wine.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1 text-[8.75px] text-[#6e6573]">
                        <span className="font-semibold text-[#544a59]">{formatVintageLabel(wine.vintage)}</span>
                        <span className="text-[#9a8fa0]">·</span>
                        <span className="truncate font-medium">{wine.region || wine.country || "Região n/i"}</span>
                      </p>
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-1 text-[10.5px] sm:text-[11px] font-semibold leading-none tracking-[-0.01em]", smartStatus.badgeClass)}>
                      {smartStatus.label}
                    </span>
                  </div>

                  {/* ── Middle: Tags + AI insight ── */}
                  <div className="mb-0.75 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {wine.style && (
                        <span className={getCardTypeTagClass(wine.style)}>
                          {wine.style}
                        </span>
                      )}
                      {wine.country && (
                        <span className="inline-flex min-h-[24px] items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-[11px] font-medium leading-none text-neutral-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-[filter,opacity] duration-200 ease-out group-hover:brightness-[1.02]">
                          {wine.country}
                        </span>
                      )}
                      {wine.grape && (
                        <span className="inline-flex min-h-[24px] items-center justify-center rounded-full border border-white/60 bg-white/78 px-3 py-1.5 text-[11px] font-medium leading-none text-[#645b69] shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-sm transition-[filter,opacity] duration-200 ease-out group-hover:brightness-[1.02]">
                          {wine.grape}
                        </span>
                      )}
                    </div>

                    <div className="rounded-[16px] border border-white/60 bg-[rgba(255,255,255,0.70)] px-2.5 py-2 shadow-[0_10px_24px_-22px_rgba(58,51,39,0.18)] backdrop-blur-sm">
                      <div className="space-y-2">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-[10.5px] font-medium leading-snug text-[#665c6b]">
                            {cardInsight}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-10 w-full rounded-full border border-[rgba(183,121,31,0.14)] bg-[linear-gradient(180deg,rgba(255,249,240,0.96)_0%,rgba(255,255,255,0.94)_100%)] px-3.5 text-[11px] font-semibold text-[#584f61] shadow-[0_8px_18px_-16px_rgba(58,51,39,0.14)] hover:text-[#1b161d] hover:bg-[linear-gradient(180deg,rgba(255,244,225,0.98)_0%,rgba(255,255,255,0.96)_100%)] active:scale-[0.98] transition-[transform,background-color,color] duration-200 ease-out"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleCardAi(wine);
                          }}
                        >
                          <UtensilsCrossed className="mr-1.5 h-3.5 w-3.5 text-[#B7791F]" />
                          Harmonizar esta garrafa
                        </Button>
                      </div>

                      <AnimatePresence initial={false}>
                        {aiState.open && (
                          <motion.div
                            key={`ai-${wine.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-2 border-t border-black/5 pt-2">
                              {aiState.loading ? (
                                <div className="flex items-center gap-2 text-[10px] text-[#6e6573]">
                                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
                                  Aguardando sugestões...
                                </div>
                              ) : (
                                <>
                                  <p className="text-[10px] leading-relaxed text-[#5f5564]">
                                    {aiState.pairingLogic || cardInsight}
                                  </p>
                                  {aiState.error && (
                                    <p className="text-[10px] font-medium text-amber-700">
                                      {aiState.error}
                                    </p>
                                  )}
                                  <div className="space-y-1.5">
                                    {aiState.pairings.slice(0, 5).map((pairing, index) => (
                                      <div
                                        key={`${pairing.dish}-${index}`}
                                        className="rounded-xl border border-white/60 bg-white/86 px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-semibold leading-tight text-[#17131a]">
                                              {pairing.dish}
                                            </p>
                                            <p className="mt-0.5 text-[9.5px] leading-snug text-[#6f6671]">
                                              {pairing.reason}
                                            </p>
                                          </div>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-[22px] shrink-0 rounded-full border border-white/60 bg-white/80 px-2 text-[8.5px] font-semibold text-[#5d5260] hover:text-primary hover:bg-white/95"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRecipeClick(pairing.dish);
                                            }}
                                          >
                                            Ver receita
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* ── Actions ── */}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/5 pt-1.5">
                    <div className="min-w-0">
                      <p className="text-[6.5px] uppercase tracking-[0.11em] text-[#908595] font-medium">Preço</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-[15px] font-bold leading-none text-[#121212] tracking-[-0.025em]">
                          {wine.displayPurchasePrice != null ? `R$ ${wine.displayPurchasePrice.toFixed(0)}` : "—"}
                        </p>
                        <span className="inline-flex h-[18px] items-center rounded-full border border-white/60 bg-white/78 px-2 text-[8.25px] font-semibold leading-none text-[#645b69]">
                          Qtd {wine.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-[22px] flex-none rounded-full px-2.5 text-[8.5px] font-semibold text-[#5d5260] hover:text-primary hover:bg-primary/[0.06] active:scale-[0.98] transition-[transform,background-color,color] duration-200 ease-out cursor-pointer"
                        onClick={() => setConsumptionWine(wine)}
                      >
                        <UtensilsCrossed className="mr-1 h-2.5 w-2.5" /> Consumo
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-[22px] w-[22px] rounded-full p-0 text-[#7a6f78]/80 hover:text-[#2f2730] hover:bg-black/[0.05] active:scale-[0.98] transition-[transform,background-color,color,opacity] duration-200 ease-out cursor-pointer"
                        onClick={() => setEditWine(wine)}
                        title="Editar"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-[22px] w-[22px] rounded-full p-0 text-[#7a6f78]/80 hover:text-destructive hover:bg-destructive/[0.06] active:scale-[0.98] transition-[transform,background-color,color,opacity] duration-200 ease-out cursor-pointer"
                        onClick={() => setDeleteTarget(wine)}
                        title="Remover"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>

                  {hasGroupDetails && (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => setExpandedGroups((prev) => ({ ...prev, [wine.groupKey]: !prev[wine.groupKey] }))}
                        className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/68 px-2.5 py-0.5 text-[8.5px] font-semibold text-[#665c6b] backdrop-blur-sm transition-all duration-200 hover:border-primary/20 hover:text-primary/80"
                      >
                        {isExpanded ? "Ocultar" : `${wine.entries.length} registros`}
                      </button>
                      {isExpanded && (
                        <div className="mt-1.5 space-y-1 rounded-xl border border-white/50 bg-white/72 p-2 backdrop-blur-[10px]">
                          {wine.entries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/84 px-2.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[filter] duration-200 ease-out hover:brightness-[1.01]">
                              <div className="min-w-0">
                                <p className="truncate text-[10.5px] font-semibold text-[#17131a]">
                                  {entry.cellar_location || "Sem localização"}
                                </p>
                                <p className="text-[8.5px] text-[#6f6671] font-medium">
                                  {formatVintageLabel(entry.vintage)} · {entry.quantity} gf
                                </p>
                              </div>
                      <span className="text-[9.5px] font-semibold text-primary/78">
                                {entry.purchase_price != null ? `R$ ${entry.purchase_price.toFixed(0)}` : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left text-[8.5px] font-semibold uppercase tracking-[0.14em] px-3 py-2.5 text-[#7a707f]">Vinho</th>
                <th className="text-left text-[8.5px] font-semibold uppercase tracking-[0.14em] px-3 py-2.5 hidden sm:table-cell text-[#7a707f]">Estilo</th>
                <th className="text-right text-[8.5px] font-semibold uppercase tracking-[0.14em] px-3 py-2.5 hidden md:table-cell text-[#7a707f]">Preço</th>
                <th className="text-center text-[8.5px] font-semibold uppercase tracking-[0.14em] px-3 py-2.5 text-[#7a707f]">Qtd</th>
                <th className="text-center text-[8.5px] font-semibold uppercase tracking-[0.14em] px-3 py-2.5 hidden md:table-cell text-[#7a707f]">Status</th>
                <th className="text-right text-[8.5px] font-semibold uppercase tracking-[0.14em] px-3 py-2.5 text-[#7a707f]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((wine) => {
                const status = drinkStatus(wine);
                const coverImageUrl = wine.image_url ?? wine.entries.find((entry) => entry.image_url)?.image_url ?? null;
                return (
                  <tr
                    key={wine.id}
                    className="group transition-[transform,background-color,box-shadow,filter] duration-200 ease-out border-b border-[rgba(0,0,0,0.05)] last:border-0 border-l-[3px] hover:bg-[rgba(255,255,255,0.80)] hover:-translate-y-[1px] hover:shadow-[0_10px_20px_-18px_rgba(44,20,31,0.16)]"
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
  );
}
