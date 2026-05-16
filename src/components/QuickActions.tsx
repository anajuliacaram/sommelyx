import { Plus, Wine, UtensilsCrossed, BookOpen } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { memo } from "react";

interface QuickActionsProps {
  onAddWine: () => void;
  onRegisterConsumption?: () => void;
  onHarmonize?: () => void;
  onAnalyzeList?: () => void;
  variant?: "personal" | "commercial";
  /** compact = sidebar (stacked), inline = dashboard header row */
  layout?: "stacked" | "inline";
}

export const QuickActions = memo(function QuickActions({
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
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="default" onClick={onAddWine}>
          <Plus className="mr-1.5 h-4 w-4" />
          {isCommercial ? "Cadastrar produto" : "Adicionar"}
        </Button>
        {onRegisterConsumption && (
          <Button variant="secondary" size="default" onClick={onRegisterConsumption}>
            <Wine className="mr-1.5 h-4 w-4 text-[#7B1E2B]" />
            {isCommercial ? "Registrar venda" : "Adicionar consumo"}
          </Button>
        )}
      </div>
    );
  }

  /* ── Stacked layout (sidebar — dark context) ── */
  return (
    <div
      className="premium-card-surface rounded-[20px] p-3"
    >
      <div className="space-y-2">
        {/* ── Primary ── */}
          <Button
            variant="primary"
            onClick={onAddWine}
            className="h-11 w-full rounded-[16px] text-[13px] font-semibold tracking-[-0.01em] gap-1.5 px-4 shadow-[0_12px_22px_-18px_hsl(var(--primary)/0.26)] hover:shadow-[0_14px_24px_-20px_hsl(var(--primary)/0.28)]"
          >
            <Plus className="h-[15px] w-[15px] shrink-0" />
            {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
          </Button>

        {/* ── Secondary ── */}
        {onRegisterConsumption && (
          <Button
            variant="secondary"
            onClick={onRegisterConsumption}
            className="group h-10.5 w-full rounded-[16px] gap-1.5 px-4 text-[13px] font-semibold text-[rgba(36,30,24,0.88)] transition-all duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-[0.5px]"
          >
            <Wine className="h-[15px] w-[15px] shrink-0 text-[#7B1E2B] transition-colors group-hover:text-[#8E2433]" />
            {isCommercial ? "Registrar venda" : "Adicionar consumo"}
          </Button>
        )}

        {/* ── Tertiary ── */}
        {onHarmonize && (
          <Button
            variant="ghost"
            onClick={onHarmonize}
            className="group h-9.5 w-full rounded-[16px] gap-1.5 px-4 text-[12.5px] font-semibold tracking-[-0.01em] text-[rgba(36,30,24,0.82)] transition-all duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-[0.5px]"
          >
            <UtensilsCrossed className="h-[15px] w-[15px] shrink-0 text-[#B7791F] transition-colors group-hover:text-[#C98922]" />
            Harmonizar
          </Button>
        )}
        {onAnalyzeList && (
          <Button
            variant="ghost"
            onClick={onAnalyzeList}
            className="group h-9.5 w-full rounded-[16px] gap-1.5 px-4 text-[12.5px] font-semibold tracking-[-0.01em] text-[rgba(36,30,24,0.82)] transition-all duration-180 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-[0.5px]"
          >
            <BookOpen className="h-[15px] w-[15px] shrink-0 text-[#9B5DE5] transition-colors group-hover:text-[#A776EA]" />
            Analisar carta
          </Button>
        )}
      </div>
    </div>
  );
});

QuickActions.displayName = "QuickActions";
