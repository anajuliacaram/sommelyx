import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, UtensilsCrossed, ChefHat, BookOpen, RotateCcw, Wine, X } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";
import { cn } from "@/lib/utils";
import {
  AI_MODAL_ACTION_TILE_CLASSNAME,
  AI_MODAL_CARD_CLASSNAME,
  AiModalActions,
  AiModalActionButton,
} from "@/components/ai-flow/ModalLayout";
import type { WinePairingDecisionSupport } from "@/lib/sommelier-ai";
import type { Recipe } from "@/lib/sommelier-ai";
import { buildPresentationStructureLine, cleanAiPresentationText } from "@/lib/ai-presentation";

/* ═══════════════════════════════════════════════
   COMPATIBILITY BADGE — Flagship visual element
   ═══════════════════════════════════════════════ */

const compatConfig: Record<string, {
  bg: string;
  text: string;
  border: string;
  glow: string;
  icon: string;
}> = {
  "Excelente escolha": {
    bg: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)",
    text: "#047857",
    border: "rgba(16,185,129,0.22)",
    glow: "0 0 12px rgba(16,185,129,0.10)",
    icon: "✦",
  },
  "Combinação perfeita": {
    bg: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)",
    text: "#047857",
    border: "rgba(16,185,129,0.22)",
    glow: "0 0 12px rgba(16,185,129,0.10)",
    icon: "✦",
  },
  "Alta compatibilidade": {
    bg: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.05) 100%)",
    text: "#0e7a5a",
    border: "rgba(16,185,129,0.16)",
    glow: "0 0 8px rgba(16,185,129,0.06)",
    icon: "◆",
  },
  "Harmonização elegante": {
    bg: "linear-gradient(135deg, rgba(198,167,104,0.12) 0%, rgba(180,155,80,0.08) 100%)",
    text: "#8B7730",
    border: "rgba(198,167,104,0.22)",
    glow: "0 0 8px rgba(198,167,104,0.08)",
    icon: "◇",
  },
  "Boa opção": {
    bg: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(217,119,6,0.06) 100%)",
    text: "#b45309",
    border: "rgba(245,158,11,0.18)",
    glow: "none",
    icon: "●",
  },
  "Escolha ousada": {
    bg: "linear-gradient(135deg, rgba(147,51,234,0.10) 0%, rgba(124,58,237,0.06) 100%)",
    text: "#7c3aed",
    border: "rgba(147,51,234,0.18)",
    glow: "none",
    icon: "◈",
  },
  "Pouco indicado": {
    bg: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(185,28,28,0.04) 100%)",
    text: "#dc2626",
    border: "rgba(220,38,38,0.15)",
    glow: "none",
    icon: "○",
  },
};

const matchLevelConfig: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  glow: string;
  icon: string;
}> = {
  perfeito: {
    label: "Combinação perfeita",
    ...compatConfig["Excelente escolha"],
  },
  "muito bom": {
    label: "Alta compatibilidade",
    ...compatConfig["Alta compatibilidade"],
  },
  bom: {
    label: "Boa opção",
    ...compatConfig["Boa opção"],
  },
};

export function CompatibilityBadge({ label, size = "md" }: { label?: string | null; size?: "sm" | "md" | "lg" }) {
  if (!label) return null;
  const config = compatConfig[label] || compatConfig["Boa opção"];
  const sizeClass = size === "lg"
    ? "text-[12px] px-3.5 py-1.5 gap-1.5"
    : size === "sm"
    ? "text-[9px] px-2 py-0.5 gap-1"
    : "text-[10px] px-2.5 py-1 gap-1";

  return (
    <span
      className={cn("inline-flex items-center font-semibold tracking-[0.02em] rounded-full whitespace-nowrap", sizeClass)}
      style={{
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        boxShadow: config.glow,
      }}
    >
      <span className="opacity-70">{config.icon}</span>
      {label}
    </span>
  );
}

export function FallbackAnalysisBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClass = size === "sm"
    ? "text-[9px] px-2 py-0.5 gap-1"
    : "text-[10px] px-2.5 py-1 gap-1";

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold tracking-wide rounded-full whitespace-nowrap",
        sizeClass,
      )}
      style={{
        background: "linear-gradient(135deg, rgba(198,167,104,0.12) 0%, rgba(95,111,82,0.08) 100%)",
        color: "#6B5A2A",
        border: "1px solid rgba(198,167,104,0.18)",
        boxShadow: "0 0 10px rgba(198,167,104,0.05)",
      }}
    >
      <Sparkles className="h-3 w-3 opacity-70" />
      Curadoria assistida
    </span>
  );
}

export function FallbackAnalysisNotice({
  message = "Uma leitura inicial já organiza os caminhos mais promissores.",
  confidence = "limited",
  className,
}: {
  message?: string;
  confidence?: "high" | "medium" | "limited";
  className?: string;
}) {
  const confidenceConfig = {
    high: {
      label: "Assinatura precisa",
      textClassName: "text-[hsl(152_42%_28%)]",
    },
    medium: {
      label: "Curadoria equilibrada",
      textClassName: "text-[#8B7730]",
    },
    limited: {
      label: "Seleção inicial",
      textClassName: "text-[#7b1e2b]",
    },
  }[confidence];

  return (
    <div
      className={cn("rounded-[14px] border border-[rgba(58,51,39,0.08)] bg-[rgba(255,251,244,0.70)] p-3", className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <FallbackAnalysisBadge />
      </div>
      <p className="mt-1.5 text-[12.5px] leading-5 text-[#4A4338]">{message}</p>
      <p className={cn("mt-2 text-[10px] font-semibold uppercase tracking-[0.12em]", confidenceConfig.textClassName)}>
        {confidenceConfig.label}
      </p>
    </div>
  );
}

export function MatchLevelBadge({ match, size = "md" }: { match: string; size?: "sm" | "md" | "lg" }) {
  const config = matchLevelConfig[match];
  if (!config) return null;
  return <CompatibilityBadge label={config.label} size={size} />;
}

/* ═══════════════════════════════════════════════
   MATCH DOT — Color-coded compatibility indicator
   ═══════════════════════════════════════════════ */

export const matchDotColor: Record<string, string> = {
  perfeito: "bg-emerald-500",
  "muito bom": "bg-emerald-400",
  bom: "bg-amber-500",
};

export function MatchDot({ match }: { match: string }) {
  return (
    <div className={cn(
      "w-2.5 h-2.5 rounded-full shrink-0 ring-[2.5px] ring-white/70 shadow-sm",
      matchDotColor[match] || "bg-primary/40",
    )} />
  );
}

/* ═══════════════════════════════════════════════
   HARMONY TAG — Sensory harmony type indicator
   ═══════════════════════════════════════════════ */

export const harmonyLabelMap: Record<string, string> = {
  contraste: "harmonia por contraste",
  semelhança: "harmonia por semelhança",
  complemento: "aromas complementares",
  equilíbrio: "equilíbrio de intensidade",
  limpeza: "limpeza de paladar",
};

export function HarmonyTag({ type, label }: { type?: string | null; label?: string | null }) {
  const text = label || (type && harmonyLabelMap[type]);
  if (!text) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(123,30,43,0.10)] bg-[rgba(123,30,43,0.07)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#7B1E2B]">
      {text}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   PREMIUM RESULT CARD — Base container for results
   ═══════════════════════════════════════════════ */

export function PremiumResultCard({
  children,
  index = 0,
  isHighlighted = false,
  accentColor,
  className: extraClass,
}: {
  children: React.ReactNode;
  index?: number;
  isHighlighted?: boolean;
  accentColor?: string;
  className?: string;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("list-none overflow-hidden transition-all duration-200 hover:-translate-y-px", AI_MODAL_CARD_CLASSNAME, extraClass)}
      style={{
        backdropFilter: "blur(12px) saturate(1.05)",
        WebkitBackdropFilter: "blur(12px) saturate(1.05)",
      }}
    >
      {accentColor && <div className="h-[2px] w-full" style={{ background: accentColor }} />}
      <div className="space-y-2.5 p-3 sm:p-3.5">
        {children}
      </div>
    </motion.li>
  );
}

/* ═══════════════════════════════════════════════
   SECTION HEADER — Premium section divider
   ═══════════════════════════════════════════════ */

export function SectionHeader({ icon, label, count }: { icon?: "sparkles" | "chef" | "wine"; label: string; count?: number }) {
  const Icon = icon === "chef" ? ChefHat : icon === "wine" ? Wine : Sparkles;
  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2", AI_MODAL_CARD_CLASSNAME)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[rgba(123,30,43,0.10)] bg-[rgba(123,30,43,0.06)]">
        <Icon className="h-4.5 w-4.5 text-[#7B1E2B]" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">
        {label}
      </span>
      {count != null && (
        <span className="ml-auto text-[10px] font-semibold text-[#999]">{count}</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PREMIUM LOADING STATE
   ═══════════════════════════════════════════════ */

export function PairingLoadingState({ steps, subtitle }: { steps: string[]; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("p-3", AI_MODAL_CARD_CLASSNAME)}
    >
      <div className="space-y-2.5">
          {subtitle ? <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/55">{subtitle}</p> : null}
          <AiProgressiveLoader steps={steps} interval={2200} />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   PREMIUM ERROR STATE
   ═══════════════════════════════════════════════ */

export function PairingErrorState({
  message,
  onRetry,
  onClose,
}: {
  message: string;
  onRetry: () => void;
  onClose?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={cn("px-4 py-4 text-center", AI_MODAL_CARD_CLASSNAME)}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[13px]"
        style={{
          background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(185,28,28,0.03) 100%)",
          border: "1px solid rgba(220,38,38,0.12)",
        }}
      >
        <X className="h-5 w-5 text-destructive/60" />
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-[15px] font-semibold text-[#1A1713]">Ainda não foi possível concluir</p>
        <p className="mx-auto max-w-[360px] text-[12.5px] leading-5 text-[#6B6258]">{message}</p>
      </div>
      <AiModalActions className="mx-auto mt-3 w-full max-w-[320px]">
        <AiModalActionButton onClick={onRetry} variant="secondary" className="w-full">
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
        </AiModalActionButton>
        {onClose && (
          <AiModalActionButton onClick={onClose} variant="ghost" className="w-full text-[#888]">
            Fechar
          </AiModalActionButton>
        )}
      </AiModalActions>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   RECIPE BUTTON — Premium CTA for recipes
   ═══════════════════════════════════════════════ */

export function RecipeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      className="recipe-button min-h-9 h-auto rounded-[12px] border border-[rgba(123,30,43,0.10)] bg-[rgba(123,30,43,0.07)] px-3 py-2 text-[#7B1E2B] shadow-none transition-all duration-200 hover:-translate-y-px hover:bg-[rgba(123,30,43,0.10)] hover:text-[#5A1528]"
    >
      <BookOpen className="h-4 w-4" />
      Ver receita
    </Button>
  );
}

export function WineSuggestionCard({
  index,
  wineName,
  style,
  reason,
  structureMatch,
  decisionSupport,
  className,
}: {
  index: number;
  wineName: string;
  style?: string | null;
  reason: string;
  structureMatch: {
    acidity: string;
    tannin: string;
    body: string;
  };
  decisionSupport?: WinePairingDecisionSupport | null;
  className?: string;
}) {
  const summaryText = cleanAiPresentationText(reason, {
    maxLength: 210,
    fallback: buildPresentationStructureLine([
      style,
      `Acidez ${structureMatch.acidity}`,
      `Corpo ${structureMatch.body}`,
      `Taninos ${structureMatch.tannin}`,
    ]) || "Curadoria da casa",
  });
  const aromaText = cleanAiPresentationText(decisionSupport?.sensory_profile.aroma, { maxLength: 80 });
  const palateText = cleanAiPresentationText(decisionSupport?.sensory_profile.palate, { maxLength: 80 });
  const momentText = cleanAiPresentationText(decisionSupport?.when_to_choose.ideal_scenario, { maxLength: 80 });
  const structureText = buildPresentationStructureLine([
    `corpo ${structureMatch.body}`,
    `acidez ${structureMatch.acidity}`,
    `tanino ${structureMatch.tannin}`,
  ]);

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group list-none overflow-hidden transition-all duration-200 hover:-translate-y-px",
        AI_MODAL_ACTION_TILE_CLASSNAME,
        className,
      )}
      style={{
        backdropFilter: "blur(14px) saturate(1.08)",
        WebkitBackdropFilter: "blur(14px) saturate(1.08)",
      }}
    >
      <div className="space-y-2.5 p-3 sm:p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7B1E2B] text-[12px] font-semibold text-white">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h4 className="text-[16px] font-semibold leading-tight tracking-[-0.018em] text-[#1A1713] sm:text-[18px]">
              {wineName}
            </h4>
            {style ? <p className="mt-1 text-[12px] font-medium text-[#6B6258]">{style}</p> : null}
          </div>
        </div>

        <p className="text-[13px] leading-5 text-[#3F362F]">{summaryText}</p>
        {structureText ? <p className="text-[12.5px] leading-5 text-[#6B6258]">{structureText}</p> : null}
        {[aromaText, palateText, momentText].filter(Boolean).length > 0 ? (
          <p className="text-[12px] leading-5 text-[#5B5146]">
            {[aromaText, palateText, momentText].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
    </motion.li>
  );
}

/* ═══════════════════════════════════════════════
   SHEET HERO HEADER — Premium unified opening
   ═══════════════════════════════════════════════ */

export function PairingSheetHero({
  title,
  subtitle,
  icon = "utensils",
  compact = false,
}: {
  title: string;
  subtitle: string;
  icon?: "utensils" | "sparkles" | "wine" | "chef";
  compact?: boolean;
}) {
  const Icon = icon === "sparkles" ? Sparkles : icon === "wine" ? Wine : icon === "chef" ? ChefHat : UtensilsCrossed;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex items-start", compact ? "mb-3 gap-3" : "mb-4 gap-3")}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[14px]",
          compact ? "h-10 w-10" : "h-11 w-11",
        )}
        style={{
          background: "rgba(255,251,244,0.70)",
          backdropFilter: "blur(14px) saturate(1.1)",
          WebkitBackdropFilter: "blur(14px) saturate(1.1)",
          border: "1px solid rgba(58,51,39,0.08)",
          boxShadow: "none",
        }}
      >
        <Icon className={cn("text-[#7B1E2B]", compact ? "h-5.5 w-5.5" : "h-6 w-6")} strokeWidth={1.75} />
      </div>
      <div className={cn("min-w-0", compact ? "pt-0.5" : "pt-1")}>
        <h2
          className={cn(
            "font-semibold tracking-[-0.02em] leading-[1.1] text-[#1A1713]",
            compact ? "text-[22px]" : "text-[24px]",
          )}
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 600 }}
        >
          {title}
        </h2>
        <p
          className={cn(
            "text-[12.5px] font-medium leading-snug text-[rgba(58,51,39,0.6)]",
            compact ? "mt-1" : "mt-1.5",
          )}
        >
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   PREMIUM CHOICE CARD — Unified selectable card
   Used across Harmonizar / Analisar Carta flows
   ═══════════════════════════════════════════════ */

export function PremiumChoiceCard({
  icon: IconCmp,
  title,
  description,
  onClick,
  selected = false,
  accent = "wine",
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  onClick: () => void;
  selected?: boolean;
  accent?: "wine" | "gold";
  index?: number;
}) {
  const accentColor = accent === "gold" ? "#B7791F" : "#7B1E2B";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
      className="group w-full rounded-[14px] p-3 text-left transition-all duration-200"
      style={{
        background: selected ? "rgba(123,30,43,0.06)" : "rgba(255,251,244,0.70)",
        border: `1px solid ${selected ? accentColor : "rgba(58,51,39,0.08)"}`,
        boxShadow: "none",
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-all duration-200 group-hover:scale-105"
          style={{
            background: selected ? `${accentColor}1A` : "rgba(123,30,43,0.07)",
            border: `1px solid ${selected ? `${accentColor}33` : "rgba(123,30,43,0.10)"}`,
          }}
        >
          <IconCmp className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold tracking-[-0.005em] text-[#1A1713]">{title}</p>
          <p className="mt-0.5 text-[11.5px] leading-4 text-[rgba(58,51,39,0.64)]">{description}</p>
        </div>
      </div>
    </motion.button>
  );
}
