import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, UtensilsCrossed, ChefHat, BookOpen, RotateCcw, Wine, X } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { AiProgressiveLoader } from "@/components/AiProgressiveLoader";
import { cn } from "@/lib/utils";
import type { WineProfile, DishProfile, DishItemProfile, Recipe } from "@/lib/sommelier-ai";

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
   WINE PROFILE CHIPS — Technical characteristics
   ═══════════════════════════════════════════════ */

export function WineProfileChips({ profile }: { profile?: WineProfile | null }) {
  if (!profile) return null;
  const chips = [
    profile.body && `Corpo ${profile.body}`,
    profile.acidity && `Acidez ${profile.acidity}`,
    profile.tannin && profile.tannin !== "n/a" && `Taninos ${profile.tannin}`,
    profile.complexity,
    profile.style,
  ].filter(Boolean) as string[];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-semibold",
            i === chips.length - 1 && profile.style === chip
              ? "bg-primary/[0.07] text-primary/65 border border-primary/[0.08]"
              : "bg-[rgba(0,0,0,0.04)] text-[#666] border border-[rgba(0,0,0,0.06)]",
          )}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DISH PROFILE PILLS — Dish characteristics
   ═══════════════════════════════════════════════ */

export function DishProfilePills({ profile }: { profile?: DishItemProfile | null }) {
  if (!profile) return null;
  const pills = [profile.intensity, profile.texture, profile.highlight].filter(Boolean);
  if (pills.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map((pill, i) => (
        <span key={i} className="inline-flex items-center rounded-full bg-[rgba(0,0,0,0.035)] px-2 py-0.5 text-[9px] font-semibold text-[#777] border border-[rgba(0,0,0,0.04)]">
          {pill}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   WINE PROFILE CARD — Premium wine structure section
   ═══════════════════════════════════════════════ */

export function WineProfileCard({
  title,
  subtitle,
  profile,
  pairingLogic,
}: {
  title: string;
  subtitle?: string;
  profile?: WineProfile | null;
  pairingLogic?: string | null;
}) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 space-y-3"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.55) 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.55)",
        boxShadow: "0 4px 20px -8px rgba(44,20,31,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Wine className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[#1A1A1A] tracking-tight truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-[#777] truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {profile?.summary && (
        <p className="text-[12.5px] text-[#555] leading-relaxed italic pl-[46px]">{profile.summary}</p>
      )}

      {profile && <div className="pl-[46px]"><WineProfileChips profile={profile} /></div>}

      {pairingLogic && (
        <div className="rounded-xl bg-primary/[0.04] border border-primary/[0.08] p-3 ml-[46px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Lógica da harmonização
          </p>
          <p className="text-[12px] text-[#555] leading-relaxed">{pairingLogic}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DISH PROFILE CARD — Premium dish structure section
   ═══════════════════════════════════════════════ */

export function DishProfileCard({ dish, profile }: { dish: string; profile?: DishProfile | null }) {
  if (!profile || (!profile.protein && !profile.intensity)) return null;
  const pills = [
    profile.protein,
    profile.cooking,
    profile.fat && `gordura ${profile.fat}`,
    profile.intensity && `intensidade ${profile.intensity}`,
  ].filter(Boolean);

  return (
    <div
      className="rounded-2xl p-4 space-y-2.5"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.50) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.50)",
        boxShadow: "0 2px 12px -6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      <div className="flex items-center gap-2">
        <ChefHat className="h-3.5 w-3.5 text-primary/65" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70">Perfil do prato</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pills.map((pill, i) => (
          <span key={i} className="inline-flex items-center rounded-full bg-[rgba(0,0,0,0.04)] px-2.5 py-0.5 text-[10px] font-semibold text-[#666] border border-[rgba(0,0,0,0.05)]">
            {pill}
          </span>
        ))}
      </div>
    </div>
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
      className={cn("list-none rounded-2xl overflow-hidden transition-all duration-250 hover:-translate-y-0.5", extraClass)}
      style={{
        background: isHighlighted
          ? "linear-gradient(135deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.65) 100%)"
          : "linear-gradient(135deg, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.55) 100%)",
        backdropFilter: "blur(14px) saturate(1.3)",
        WebkitBackdropFilter: "blur(14px) saturate(1.3)",
        border: isHighlighted
          ? "1px solid rgba(255,255,255,0.65)"
          : "1px solid rgba(255,255,255,0.50)",
        boxShadow: isHighlighted
          ? "0 8px 32px -8px rgba(44,20,31,0.12), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)"
          : "0 4px 20px -6px rgba(30,20,20,0.08), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      {accentColor && <div className="h-[2px] w-full" style={{ background: accentColor }} />}
      <div className="p-4 sm:p-5 space-y-3">
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
    <div className="flex items-center gap-2.5 py-1">
      <div className="w-7 h-7 rounded-lg bg-primary/[0.08] flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-primary/70" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#888]">
        {label}
      </span>
      {count != null && (
        <span className="text-[10px] font-bold text-[#aaa] ml-auto">{count}</span>
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
      className="flex flex-col items-center gap-5 py-10"
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center relative"
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
      className="flex flex-col items-center gap-5 py-12"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(185,28,28,0.03) 100%)",
          border: "1px solid rgba(220,38,38,0.12)",
        }}
      >
        <X className="h-7 w-7 text-destructive/60" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-[15px] font-semibold text-[#1A1A1A]">Não foi possível analisar</p>
        <p className="text-[13px] text-[#888] max-w-[280px] leading-relaxed">{message}</p>
      </div>
      <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
        <Button onClick={onRetry} variant="secondary" className="h-11 text-[13px] font-semibold rounded-xl">
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
        </Button>
        {onClose && (
          <Button onClick={onClose} variant="ghost" className="h-10 text-[12px] text-[#888]">
            Fechar
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   RECIPE BUTTON — Premium CTA for recipes
   ═══════════════════════════════════════════════ */

export function RecipeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary/80 hover:text-primary bg-primary/[0.04] hover:bg-primary/[0.08] px-3 py-1.5 rounded-lg border border-primary/[0.06] transition-all duration-200 hover:-translate-y-[0.5px]"
    >
      <BookOpen className="h-3.5 w-3.5" />
      Ver receita
    </button>
  );
}

/* ═══════════════════════════════════════════════
   SHEET HERO HEADER — Flagship opening
   ═══════════════════════════════════════════════ */

export function PairingSheetHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative -mx-6 -mt-2 px-6 pt-6 pb-5 mb-2 overflow-hidden">
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(123,35,48,0.04) 0%, transparent 100%)",
        }}
      />
      <div className="relative flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, hsl(var(--wine)) 0%, hsl(var(--wine-light)) 100%)",
            boxShadow: "0 8px 24px -8px rgba(123,35,48,0.30)",
          }}
        >
          <UtensilsCrossed className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-[#1A1A1A] tracking-tight">{title}</h2>
          <p className="text-[12.5px] text-[#888] mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
