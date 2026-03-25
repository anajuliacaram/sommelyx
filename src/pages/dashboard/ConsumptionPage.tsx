import { useState } from "react";
import { useConsumption, useDeleteConsumption } from "@/hooks/useConsumption";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wine, MapPin, Trash2, Calendar, GlassWater } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";

export default function ConsumptionPage() {
  const { data: entries, isLoading } = useConsumption();
  const deleteConsumption = useDeleteConsumption();
  const [filter, setFilter] = useState<"all" | "cellar" | "external">("all");

  const filtered = entries?.filter((e) => {
    if (filter === "all") return true;
    return e.source === filter;
  }) ?? [];

  const cellarCount = entries?.filter(e => e.source === "cellar").length ?? 0;
  const externalCount = entries?.filter(e => e.source === "external").length ?? 0;

  const ratingLabel = (r: number) =>
    r === 1 ? "Ruim" : r === 2 ? "Regular" : r === 3 ? "Bom" : r === 4 ? "Muito bom" : "Excelente";

  const handleDelete = async (id: string) => {
    try {
      await deleteConsumption.mutateAsync(id);
      toast.success("Registro removido");
    } catch {
      toast.error("Erro ao remover registro");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu Consumo</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Registre vinhos que você tomou, dentro ou fora da adega
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">
            Todos {entries ? `(${entries.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="cellar">
            <GlassWater className="h-3.5 w-3.5 mr-1" />
            Da adega ({cellarCount})
          </TabsTrigger>
          <TabsTrigger value="external">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            Externo ({externalCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <PremiumEmptyState
          icon={Wine}
          title="Nenhum consumo registrado"
          description={filter === "all" ? "Use o botão 'Adicionar Consumo' na barra lateral para registrar" : filter === "cellar" ? "Nenhum consumo da adega registrado" : "Nenhum consumo externo registrado"}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-3">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {entry.wine_name}
                        </h3>
                        {entry.vintage && (
                          <span className="text-xs text-muted-foreground">({entry.vintage})</span>
                        )}
                        <Badge variant={entry.source === "cellar" ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {entry.source === "cellar" ? "Adega" : "Externo"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {entry.producer && <span>{entry.producer}</span>}
                        {entry.country && <span>• {entry.country}{entry.region ? `, ${entry.region}` : ""}</span>}
                        {entry.grape && <span>• {entry.grape}</span>}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.consumed_at), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                        {entry.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {entry.location}
                          </span>
                        )}
                        {entry.rating && (
                          <Badge variant="outline" className="text-[10px]">
                            {ratingLabel(entry.rating)}
                          </Badge>
                        )}
                      </div>

                      {entry.tasting_notes && (
                        <p className="text-xs text-muted-foreground/80 italic line-clamp-2 mt-1">
                          "{entry.tasting_notes}"
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
