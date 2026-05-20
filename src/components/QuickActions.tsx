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
    <div className="sidebar-actions rounded-[var(--sx-r-lg)] border border-[var(--sx-b-default)] bg-[var(--sx-bg-card)] p-2">
      <div className="flex flex-col gap-0.5">
        {/* ── Primary ── */}
          <Button
            variant="primary"
            onClick={onAddWine}
            className="h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-md)] border-0 bg-[var(--sx-bordeaux)] px-4 py-3 text-[14px] font-medium text-[var(--sx-t-white)] shadow-none hover:bg-[var(--sx-bordeaux)] hover:opacity-90"
          >
            <Plus className="h-[15px] w-[15px] shrink-0" />
            {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
          </Button>

        {/* ── Secondary ── */}
        {onRegisterConsumption && (
          <Button
            variant="secondary"
            onClick={onRegisterConsumption}
            className="group h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-sm)] border-0 bg-transparent px-3.5 py-[11px] text-[14px] font-normal text-[var(--sx-t-body)] shadow-none transition-colors hover:bg-[var(--sx-bg-input)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sx-bg-input)] text-[var(--sx-t-sub)]">
              <Wine className="h-[15px] w-[15px]" />
            </span>
            {isCommercial ? "Registrar venda" : "Adicionar consumo"}
          </Button>
        )}

        {/* ── Tertiary ── */}
        {onHarmonize && (
          <Button
            variant="ghost"
            onClick={onHarmonize}
            className="group h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-sm)] border-0 bg-transparent px-3.5 py-[11px] text-[14px] font-normal text-[var(--sx-t-body)] shadow-none transition-colors hover:bg-[var(--sx-bg-input)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sx-bg-input)] text-[var(--sx-t-sub)]">
              <UtensilsCrossed className="h-[15px] w-[15px]" />
            </span>
            Harmonizar
          </Button>
        )}
        {onAnalyzeList && (
          <Button
            variant="ghost"
            onClick={onAnalyzeList}
            className="group h-auto w-full justify-start gap-2.5 rounded-[var(--sx-r-sm)] border-0 bg-transparent px-3.5 py-[11px] text-[14px] font-normal text-[var(--sx-t-body)] shadow-none transition-colors hover:bg-[var(--sx-bg-input)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sx-bg-input)] text-[var(--sx-t-sub)]">
              <BookOpen className="h-[15px] w-[15px]" />
            </span>
            Analisar carta
          </Button>
        )}
      </div>
    </div>
  );
});

QuickActions.displayName = "QuickActions";
