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
      className="rounded-2xl border border-primary/10 bg-background/75 p-4 shadow-[0_10px_26px_-22px_rgba(25,18,22,0.4)] backdrop-blur-sm"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="space-y-3">
        {/* ── Primary: full-width, tallest ── */}
        <motion.div variants={itemVariants}>
          <Button
            variant="primary"
            onClick={onAddWine}
            className="h-14 w-full rounded-2xl text-[14px] font-semibold tracking-[-0.01em] shadow-[0_14px_26px_-16px_hsl(var(--wine)/0.45)] hover:shadow-[0_18px_30px_-16px_hsl(var(--wine)/0.5)]"
          >
            <Plus className="h-[18px] w-[18px]" />
            {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
          </Button>
        </motion.div>

        {/* ── Secondary: full-width, wine-tinted glass ── */}
        {onRegisterConsumption && (
          <motion.div variants={itemVariants}>
            <Button
              variant="secondary"
              onClick={onRegisterConsumption}
              className="h-14 w-full rounded-2xl border-primary/15 bg-primary/[0.04] text-[14px] font-semibold text-primary hover:bg-primary/[0.08] hover:border-primary/25"
            >
              <Wine className="h-[18px] w-[18px]" />
              {isCommercial ? "Registrar venda" : "Registrar consumo"}
            </Button>
          </motion.div>
        )}

        {/* ── Tertiary pair: equal-width grid ── */}
        {(onHarmonize || onAnalyzeList) && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
            {onHarmonize && (
              <Button
                variant="ghost"
                onClick={onHarmonize}
                className="h-12 w-full rounded-2xl border border-border/45 bg-background/80 text-[13px] font-semibold tracking-[-0.01em] shadow-[0_8px_18px_-18px_rgba(20,15,18,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/[0.06] hover:border-accent/25 hover:text-accent hover:shadow-[0_12px_20px_-16px_rgba(20,15,18,0.45)]"
              >
                <UtensilsCrossed className="h-[18px] w-[18px]" />
                Harmonizar
              </Button>
            )}
            {onAnalyzeList && (
              <Button
                variant="ghost"
                onClick={onAnalyzeList}
                className="h-12 w-full rounded-2xl border border-border/45 bg-background/80 text-[13px] font-semibold tracking-[-0.01em] shadow-[0_8px_18px_-18px_rgba(20,15,18,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/[0.06] hover:border-accent/25 hover:text-accent hover:shadow-[0_12px_20px_-16px_rgba(20,15,18,0.45)]"
              >
                <Sparkles className="h-[18px] w-[18px]" />
                Analisar carta
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
