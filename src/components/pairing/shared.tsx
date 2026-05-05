import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, UtensilsCrossed, ChefHat, BookOpen, RotateCcw, Wine, X } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";
import { cn } from "@/lib/utils";
import { AiModalActions, AiModalActionButton } from "@/components/ai-flow/ModalLayout";
import type { WinePairingDecisionSupport } from "@/lib/sommelier-ai";
import type { Recipe } from "@/lib/sommelier-ai";

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
      className={cn("inline-flex items-center font-bold tracking-wide rounded-full whitespace-nowrap", sizeClass)}
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
        background: "linear-gradient(135deg, rgba(198,167,104,0.14) 0%, rgba(123,30,43,0.08) 100%)",
        color: "#7b1e2b",
        border: "1px solid rgba(123,30,43,0.16)",
        boxShadow: "0 0 10px rgba(123,30,43,0.06)",
      }}
    >
      <Sparkles className="h-3 w-3 opacity-70" />
      Análise rápida
    </span>
  );
}

export function FallbackAnalysisNotice({
  message = "Esta é uma análise rápida com base nos dados disponíveis",
  confidence = "limited",
  className,
}: {
  message?: string;
  confidence?: "high" | "medium" | "limited";
  className?: string;
}) {
  const confidenceConfig = {
    high: {
      label: "Alta confiança",
      textClassName: "text-[hsl(152_42%_28%)]",
    },
    medium: {
      label: "Confiança média",
      textClassName: "text-[#8B7730]",
    },
    limited: {
      label: "Dados limitados",
      textClassName: "text-[#7b1e2b]",
    },
  }[confidence];

  return (
    <div
      className={cn("rounded-2xl border border-[rgba(123,30,43,0.12)] bg-primary/[0.04] p-4", className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <FallbackAnalysisBadge />
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/70">{message}</p>
      <p className={cn("mt-3 text-[10.5px] font-semibold uppercase tracking-[0.12em]", confidenceConfig.textClassName)}>
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
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] bg-primary/[0.07] text-primary/75 border border-primary/[0.08]">
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
      className={cn("list-none rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5", extraClass)}
      style={{
        background: isHighlighted
          ? "rgba(255,255,255,0.92)"
          : "rgba(255,255,255,0.86)",
        backdropFilter: "blur(12px) saturate(1.05)",
        WebkitBackdropFilter: "blur(12px) saturate(1.05)",
        border: isHighlighted
          ? "1px solid rgba(0,0,0,0.05)"
          : "1px solid rgba(0,0,0,0.05)",
        boxShadow: isHighlighted
          ? "0 10px 34px -12px rgba(44,20,31,0.12), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)"
          : "0 6px 22px -10px rgba(30,20,20,0.06), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.62)",
      }}
    >
      {accentColor && <div className="h-[2px] w-full" style={{ background: accentColor }} />}
      <div className="p-4 space-y-3">
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
    <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-white/55 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/12 to-[#C8A96A]/12">
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
      className="flex flex-col items-center gap-4 py-10"
    >
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-3xl"
        style={{
          background: "linear-gradient(135deg, rgba(123,35,48,0.08) 0%, rgba(123,35,48,0.03) 100%)",
          border: "1px solid rgba(123,35,48,0.08)",
          boxShadow: "0 8px 32px -12px rgba(123,35,48,0.12)",
        }}
      >
        <div className="absolute inset-0 rounded-3xl animate-pulse" style={{ background: "rgba(123,35,48,0.04)" }} />
        <Sparkles className="h-8 w-8 text-primary/50 relative z-10" />
      </div>
      <AiProgressiveLoader steps={steps} interval={2800} subtitle={subtitle} />
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
      className="flex flex-col items-center gap-4 py-10"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(185,28,28,0.03) 100%)",
          border: "1px solid rgba(220,38,38,0.12)",
        }}
      >
        <X className="h-7 w-7 text-destructive/60" />
      </div>
      <div className="space-y-1.5 text-center">
        <p className="text-[16px] font-semibold text-[#1A1A1A]">Não conseguimos concluir a leitura</p>
        <p className="mx-auto max-w-[320px] text-[13px] leading-relaxed text-[#888]">{message}</p>
      </div>
      <AiModalActions className="w-full max-w-[320px]">
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
      className="recipe-button min-h-10 h-auto px-4 py-2.5 rounded-full bg-[rgba(160,60,60,0.08)] text-[#7a2e2e] border border-[rgba(122,46,46,0.10)] hover:bg-[rgba(160,60,60,0.16)] hover:text-[#6B2424] hover:-translate-y-[1px] transition-all duration-200 shadow-[0_8px_20px_-16px_rgba(122,46,46,0.35)]"
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
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group list-none overflow-hidden rounded-[28px] border border-border/30 bg-white/72 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={{
        backdropFilter: "blur(14px) saturate(1.08)",
        WebkitBackdropFilter: "blur(14px) saturate(1.08)",
      }}
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-[#7B1E2B]/70 via-[#C8A96A]/55 to-transparent" />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/55">Sugestão {index + 1}</p>
            <h4 className="mt-1 text-[19px] font-semibold tracking-[-0.02em] leading-tight text-[#1A1713] sm:text-[22px]">
              {wineName}
            </h4>
            {style ? (
              <p className="mt-1.5 text-[12px] font-medium tracking-[0.01em] text-[#6B6258]">
                {style}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[22px] border border-[rgba(123,30,43,0.08)] bg-[rgba(123,30,43,0.04)] p-4 sm:p-4.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B1E2B]/70">
            Por que este vinho
          </p>
          <p className="mt-2 text-[13.5px] leading-7 text-[#3F362F]">
            {reason}
          </p>
        </div>

        <div className="rounded-[22px] border border-black/5 bg-[#FBFAF7] p-4 sm:p-4.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B6258]">
            Características-chave
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Acidez", value: structureMatch.acidity },
              { label: "Tanino", value: structureMatch.tannin },
              { label: "Corpo", value: structureMatch.body },
            ].map((item) => (
              <div key={item.label} className="space-y-1 rounded-2xl border border-black/5 bg-white/65 px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="text-[13px] font-medium leading-6 text-[#2B231D]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {decisionSupport ? (
          <div className="space-y-2 rounded-[22px] border border-border/30 bg-background/45 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Leitura sommelier
            </p>
            <p className="text-[12.5px] leading-6 text-foreground/75">
              <span className="font-semibold text-foreground/85">Sensorial:</span>{" "}
              aroma {decisionSupport.sensory_profile.aroma}. Palato {decisionSupport.sensory_profile.palate}. Estrutura {decisionSupport.sensory_profile.structure}.
            </p>
            <p className="text-[12.5px] leading-6 text-foreground/75">
              <span className="font-semibold text-foreground/85">Lógica:</span>{" "}
              {decisionSupport.pairing_logic.fat_vs_acidity} {decisionSupport.pairing_logic.protein_vs_tannin} {decisionSupport.pairing_logic.intensity_balance}
            </p>
            <p className="text-[12.5px] leading-6 text-foreground/75">
              <span className="font-semibold text-foreground/85">Quando abrir:</span>{" "}
              {decisionSupport.when_to_choose.ideal_scenario} {decisionSupport.when_to_choose.alternative_use}
            </p>
            <p className="text-[12.5px] leading-6 text-foreground/75">
              <span className="font-semibold text-foreground/85">Confiança:</span> {decisionSupport.confidence_explanation}
            </p>
          </div>
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
      className={cn("flex items-start", compact ? "mb-3.5 gap-3" : "mb-6 gap-4")}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[18px]",
          compact ? "h-12 w-12" : "h-14 w-14",
        )}
        style={{
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(14px) saturate(1.1)",
          WebkitBackdropFilter: "blur(14px) saturate(1.1)",
          border: "1px solid rgba(255,255,255,0.55)",
          boxShadow: "0 10px 28px -14px rgba(123,30,43,0.22), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      >
        <Icon className={cn("text-[#7B1E2B]", compact ? "h-5.5 w-5.5" : "h-6 w-6")} strokeWidth={1.75} />
      </div>
      <div className={cn("min-w-0", compact ? "pt-0.5" : "pt-1")}>
        <h2
          className={cn(
            "font-semibold tracking-[-0.02em] leading-[1.1] text-[#1A1713]",
            compact ? "text-[26px]" : "text-[28px]",
          )}
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 600 }}
        >
          {title}
        </h2>
        <p
          className={cn(
            "text-[14px] font-medium leading-snug text-[rgba(58,51,39,0.6)]",
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
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className="group w-full text-left rounded-[18px] p-[18px] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        background: selected ? "rgba(123,30,43,0.05)" : "rgba(255,255,255,0.92)",
        border: `1px solid ${selected ? accentColor : "rgba(0,0,0,0.06)"}`,
        boxShadow: selected
          ? `0 10px 26px -14px ${accentColor}33, inset 0 1px 0 rgba(255,255,255,0.7)`
          : "0 4px 14px -10px rgba(58,51,39,0.10), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-105"
          style={{
            background: selected ? `${accentColor}1A` : "rgba(123,30,43,0.07)",
            border: `1px solid ${selected ? `${accentColor}33` : "rgba(123,30,43,0.10)"}`,
          }}
        >
          <IconCmp className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-[-0.005em] text-[#1A1713]">{title}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-[rgba(58,51,39,0.6)]">{description}</p>
        </div>
      </div>
    </motion.button>
  );
}
