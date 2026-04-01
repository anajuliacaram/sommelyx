import { Plus, Wine, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface QuickActionsProps {
  onAddWine: () => void;
  onOpenBottle?: () => void;
  onViewCellar: () => void;
  variant?: "personal" | "commercial";
}

export function QuickActions({ onAddWine, onOpenBottle, onViewCellar, variant = "personal" }: QuickActionsProps) {
  return (
    <motion.div
      className="flex flex-wrap gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Button variant="primary" onClick={onAddWine} className="h-10 px-5 text-[13px] font-medium">
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {variant === "commercial" ? "Cadastrar Produto" : "Adicionar Vinho"}
      </Button>
      {onOpenBottle && (
        <Button
          onClick={onOpenBottle}
          variant={variant === "commercial" ? "success" : "secondary"}
          className="h-10 px-5 text-[13px] font-medium"
        >
          <Wine className="h-3.5 w-3.5 mr-1.5" />
          {variant === "commercial" ? "Registrar Venda" : "Registrar Abertura"}
        </Button>
      )}
      <Button onClick={onViewCellar} variant="ghost" className="h-10 px-5 text-[13px] font-medium border border-border/70 bg-background/50 hover:bg-background">
        <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
        {variant === "commercial" ? "Checar Estoque" : "Ver Adega"}
      </Button>
    </motion.div>
  );
}
