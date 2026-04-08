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
        {onHarmonize && (
          <motion.div variants={itemVariants}>
            <Button variant="outline" size="default" onClick={onHarmonize}>
              <UtensilsCrossed className="mr-1.5 h-4 w-4" />
              Harmonizar
            </Button>
          </motion.div>
        )}
        {onAnalyzeList && (
          <motion.div variants={itemVariants}>
            <Button variant="outline" size="default" onClick={onAnalyzeList}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Analisar carta
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  /* ── Stacked layout (sidebar) ── */
  return (
    <motion.div
      className="rounded-2xl border border-primary/10 bg-background/75 p-3 shadow-[0_10px_26px_-22px_rgba(25,18,22,0.4)] backdrop-blur-sm"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="space-y-2.5">
        {/* ── Primary: full-width, tallest ── */}
        <motion.div variants={itemVariants}>
          <Button
            variant="primary"
            onClick={onAddWine}
            className="h-14 w-full rounded-2xl text-[13px] font-semibold tracking-[-0.01em] gap-2 shadow-[0_8px_20px_-12px_hsl(var(--wine)/0.35)] hover:shadow-[0_12px_24px_-12px_hsl(var(--wine)/0.4)]"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
          </Button>
        </motion.div>

        {/* ── Secondary: full-width, glass style ── */}
        {onRegisterConsumption && (
          <motion.div variants={itemVariants}>
            <Button
              variant="ghost"
              onClick={onRegisterConsumption}
              className="h-14 w-full rounded-2xl border border-border/40 bg-card/40 text-[12px] font-medium text-foreground/70 gap-2 backdrop-blur-sm hover:bg-card/60 hover:border-border/60 hover:text-foreground/90"
            >
              <Wine className="h-4 w-4 shrink-0" />
              {isCommercial ? "Registrar venda" : "Registrar consumo"}
            </Button>
          </motion.div>
        )}

        {/* ── Tertiary pair: subtle, minimal ── */}
        {(onHarmonize || onAnalyzeList) && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2">
            {onHarmonize && (
              <Button
                variant="ghost"
                onClick={onHarmonize}
                className="h-12 w-full rounded-xl border border-primary/18 bg-primary/[0.07] text-[12px] font-semibold text-foreground/70 gap-2 tracking-[-0.01em] shadow-none transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:bg-primary/[0.13] hover:text-foreground/90 hover:border-primary/28 hover:shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.18)]"
              >
                <UtensilsCrossed className="h-[18px] w-[18px] shrink-0 opacity-80" />
                Harmonizar
              </Button>
            )}
            {onAnalyzeList && (
              <Button
                variant="ghost"
                onClick={onAnalyzeList}
                className="h-12 w-full rounded-xl border border-primary/18 bg-primary/[0.07] text-[12px] font-semibold text-foreground/70 gap-2 tracking-[-0.01em] shadow-none transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:bg-primary/[0.13] hover:text-foreground/90 hover:border-primary/28 hover:shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.18)]"
              >
                <Sparkles className="h-[18px] w-[18px] shrink-0 opacity-80" />
                Analisar carta
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
