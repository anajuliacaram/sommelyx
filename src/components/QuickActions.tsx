import { Plus, Wine, UtensilsCrossed, Sparkles } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface QuickActionsProps {
  onAddWine: () => void;
  onRegisterConsumption?: () => void;
  onHarmonize?: () => void;
  onAnalyzeList?: () => void;
  variant?: "personal" | "commercial";
  /** compact = sidebar (stacked), inline = dashboard header row */
  layout?: "stacked" | "inline";
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

export function QuickActions({
  onAddWine,
  onRegisterConsumption,
  onHarmonize,
  onAnalyzeList,
  variant = "personal",
  layout = "stacked",
}: QuickActionsProps) {
  const isCommercial = variant === "commercial";

  if (layout === "inline") {
    return (
      <motion.div
        className="flex flex-wrap items-center gap-2.5"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Button variant="primary" size="default" onClick={onAddWine}>
            <Plus className="mr-1.5 h-4 w-4" />
            {isCommercial ? "Cadastrar produto" : "Adicionar"}
          </Button>
        </motion.div>
        {onRegisterConsumption && (
          <motion.div variants={itemVariants}>
            <Button variant="secondary" size="default" onClick={onRegisterConsumption}>
              <Wine className="mr-1.5 h-4 w-4" />
              {isCommercial ? "Registrar venda" : "Consumo"}
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  /* ── Stacked layout (sidebar — dark context) ── */
  return (
    <motion.div
      className="rounded-2xl border border-white/[0.04] bg-white/5 p-3 backdrop-blur-sm"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="space-y-2">
        {/* ── Primary ── */}
        <motion.div variants={itemVariants}>
          <Button
            variant="primary"
            onClick={onAddWine}
            className="h-11 w-full rounded-2xl text-[14px] font-semibold tracking-[-0.01em] gap-1.5 px-4 shadow-[0_8px_20px_-12px_hsl(var(--wine)/0.35)] hover:shadow-[0_12px_24px_-12px_hsl(var(--wine)/0.4)]"
          >
            <Plus className="h-[15px] w-[15px] shrink-0" />
            {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
          </Button>
        </motion.div>

        {/* ── Secondary ── */}
        {onRegisterConsumption && (
          <motion.div variants={itemVariants}>
            <Button
              variant="ghost"
              onClick={onRegisterConsumption}
              className="group h-11 w-full rounded-2xl border border-[rgba(110,30,42,0.10)] bg-[rgba(255,255,255,0.055)] text-[14px] font-semibold text-[rgba(245,245,243,0.92)] gap-1.5 px-4 backdrop-blur-md transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(110,30,42,0.16)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:translate-y-[0.5px]"
            >
              <Wine className="h-[15px] w-[15px] shrink-0 text-[hsl(var(--wine))]/80 opacity-85 transition-colors group-hover:text-[hsl(var(--wine))]" />
              {isCommercial ? "Registrar venda" : "Registrar consumo"}
            </Button>
          </motion.div>
        )}

        {/* ── Tertiary ── */}
        {onHarmonize && (
          <motion.div variants={itemVariants}>
            <Button
              variant="ghost"
              onClick={onHarmonize}
              className="group h-10 w-full rounded-2xl border border-[rgba(196,169,106,0.10)] bg-[rgba(255,255,255,0.055)] text-[13.5px] font-semibold text-[rgba(245,245,243,0.92)] gap-1.5 px-4 tracking-[-0.01em] backdrop-blur-md transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(196,169,106,0.16)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:translate-y-[0.5px]"
            >
              <UtensilsCrossed className="h-[15px] w-[15px] shrink-0 text-[hsl(var(--gold))]/80 opacity-85 transition-colors group-hover:text-[hsl(var(--gold))]" />
              Harmonizar
            </Button>
          </motion.div>
        )}
        {onAnalyzeList && (
          <motion.div variants={itemVariants}>
            <Button
              variant="ghost"
              onClick={onAnalyzeList}
              className="group h-10 w-full rounded-2xl border border-[rgba(181,107,144,0.10)] bg-[rgba(255,255,255,0.055)] text-[13.5px] font-semibold text-[rgba(245,245,243,0.92)] gap-1.5 px-4 tracking-[-0.01em] backdrop-blur-md transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(181,107,144,0.16)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:translate-y-[0.5px]"
            >
              <Sparkles className="h-[15px] w-[15px] shrink-0 text-[#B56B90]/85 opacity-85 transition-colors group-hover:text-[#C47BAC]" />
              Analisar carta
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
