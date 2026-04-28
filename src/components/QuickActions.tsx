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
      <div
        className="flex flex-wrap items-center gap-2.5"
      >
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
      className="rounded-2xl border border-[rgba(95,111,82,0.08)] bg-[rgba(255,255,255,0.82)] p-3.5 backdrop-blur-sm shadow-[0_10px_24px_-20px_rgba(58,51,39,0.20)]"
    >
      <div className="space-y-2.5">
        {/* ── Primary ── */}
          <Button
            variant="primary"
            onClick={onAddWine}
            className="h-12 w-full rounded-[18px] text-[14px] font-semibold tracking-[-0.01em] gap-1.5 px-4 shadow-[0_14px_28px_-18px_hsl(var(--primary)/0.28)] hover:shadow-[0_18px_34px_-18px_hsl(var(--primary)/0.32)]"
          >
            <Plus className="h-[15px] w-[15px] shrink-0" />
            {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
          </Button>

        {/* ── Secondary ── */}
        {onRegisterConsumption && (
          <Button
            variant="secondary"
            onClick={onRegisterConsumption}
            className="group h-11 w-full rounded-[18px] border border-[rgba(95,111,82,0.10)] bg-[linear-gradient(180deg,rgba(255,247,248,0.92)_0%,rgba(255,255,255,0.92)_100%)] text-[14px] font-semibold text-neutral-900 gap-1.5 px-4 backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(255,240,242,0.96)_0%,rgba(255,255,255,0.96)_100%)] hover:border-[rgba(123,30,43,0.16)] hover:shadow-[0_8px_20px_-16px_rgba(58,51,39,0.16)] active:translate-y-[0.5px]"
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
            className="group h-10 w-full rounded-[18px] border border-[rgba(183,121,31,0.12)] bg-[linear-gradient(180deg,rgba(255,249,240,0.92)_0%,rgba(255,255,255,0.88)_100%)] text-[13.5px] font-semibold text-neutral-900 gap-1.5 px-4 tracking-[-0.01em] backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(255,244,225,0.96)_0%,rgba(255,255,255,0.94)_100%)] hover:border-[rgba(183,121,31,0.18)] hover:shadow-[0_6px_16px_-16px_rgba(58,51,39,0.14)] active:translate-y-[0.5px]"
          >
            <UtensilsCrossed className="h-[15px] w-[15px] shrink-0 text-[#B7791F] transition-colors group-hover:text-[#C98922]" />
            Harmonizar
          </Button>
        )}
        {onAnalyzeList && (
          <Button
            variant="ghost"
            onClick={onAnalyzeList}
            className="group h-10 w-full rounded-[18px] border border-[rgba(155,93,229,0.12)] bg-[linear-gradient(180deg,rgba(248,244,255,0.92)_0%,rgba(255,255,255,0.88)_100%)] text-[13.5px] font-semibold text-neutral-900 gap-1.5 px-4 tracking-[-0.01em] backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(243,236,255,0.96)_0%,rgba(255,255,255,0.94)_100%)] hover:border-[rgba(155,93,229,0.18)] hover:shadow-[0_6px_16px_-16px_rgba(58,51,39,0.14)] active:translate-y-[0.5px]"
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
