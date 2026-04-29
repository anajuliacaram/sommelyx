import { Plus, Wine, UtensilsCrossed, Sparkles } from "@/icons/lucide";
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
            {isCommercial ? "Registrar venda" : "Consumo"}
          </Button>
        )}
      </div>
    );
  }

  /* ── Stacked layout (sidebar — dark context) ── */
  return (
    <div
      className="rounded-[20px] border border-[rgba(255,255,255,0.42)] bg-[rgba(255,255,255,0.64)] p-3.5 backdrop-blur-md shadow-[0_18px_38px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.58)]"
    >
      <div className="space-y-2.5">
        {/* ── Primary ── */}
          <Button
            variant="primary"
            onClick={onAddWine}
            className="h-12 w-full rounded-[18px] text-[14px] font-semibold tracking-[-0.01em] gap-1.5 px-4 shadow-[0_12px_24px_-16px_hsl(var(--primary)/0.28)] hover:shadow-[0_14px_28px_-18px_hsl(var(--primary)/0.30)]"
          >
            <Plus className="h-[15px] w-[15px] shrink-0" />
            {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
          </Button>

        {/* ── Secondary ── */}
        {onRegisterConsumption && (
          <Button
            variant="secondary"
            onClick={onRegisterConsumption}
            className="group h-11 w-full rounded-[18px] border border-[rgba(255,255,255,0.42)] bg-[rgba(255,255,255,0.72)] text-[14px] font-semibold text-neutral-900 gap-1.5 px-4 backdrop-blur-md transition-all duration-180 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:bg-[rgba(255,255,255,0.86)] hover:border-[rgba(123,30,43,0.14)] hover:shadow-[0_12px_24px_-18px_rgba(58,51,39,0.14)] active:translate-y-[0.5px]"
          >
            <Wine className="h-[15px] w-[15px] shrink-0 text-[#7B1E2B] transition-colors group-hover:text-[#8E2433]" />
            {isCommercial ? "Registrar venda" : "Registrar consumo"}
          </Button>
        )}

        {/* ── Tertiary ── */}
        {onHarmonize && (
          <Button
            variant="ghost"
            onClick={onHarmonize}
            className="group h-10 w-full rounded-[18px] border border-[rgba(255,255,255,0.42)] bg-[rgba(255,255,255,0.68)] text-[13.5px] font-semibold text-neutral-900 gap-1.5 px-4 tracking-[-0.01em] backdrop-blur-md transition-all duration-180 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:bg-[rgba(255,255,255,0.84)] hover:border-[rgba(183,121,31,0.16)] hover:shadow-[0_10px_20px_-16px_rgba(58,51,39,0.12)] active:translate-y-[0.5px]"
          >
            <UtensilsCrossed className="h-[15px] w-[15px] shrink-0 text-[#B7791F] transition-colors group-hover:text-[#C98922]" />
            Harmonizar
          </Button>
        )}
        {onAnalyzeList && (
          <Button
            variant="ghost"
            onClick={onAnalyzeList}
            className="group h-10 w-full rounded-[18px] border border-[rgba(255,255,255,0.42)] bg-[rgba(255,255,255,0.68)] text-[13.5px] font-semibold text-neutral-900 gap-1.5 px-4 tracking-[-0.01em] backdrop-blur-md transition-all duration-180 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:bg-[rgba(255,255,255,0.84)] hover:border-[rgba(155,93,229,0.16)] hover:shadow-[0_10px_20px_-16px_rgba(58,51,39,0.12)] active:translate-y-[0.5px]"
          >
            <Sparkles className="h-[15px] w-[15px] shrink-0 text-[#9B5DE5] transition-colors group-hover:text-[#A776EA]" />
            Analisar carta
          </Button>
        )}
      </div>
    </div>
  );
});

QuickActions.displayName = "QuickActions";
