import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "@/icons/lucide";
import { getTasteCompatibility, compatibilityColor, compatibilityBg, type TasteCompatibility } from "@/lib/sommelier-ai";
import { useWines, type Wine } from "@/hooks/useWines";
import { cn } from "@/lib/utils";

interface TasteCompatibilityBadgeProps {
  wine: {
    name: string;
    style?: string | null;
    grape?: string | null;
    country?: string | null;
    region?: string | null;
    producer?: string | null;
  };
  className?: string;
  /** If true, fetches on mount. Otherwise, requires user action. */
  autoFetch?: boolean;
}

export function TasteCompatibilityBadge({ wine, className, autoFetch = false }: TasteCompatibilityBadgeProps) {
  const { data: allWines } = useWines();
  const [result, setResult] = useState<TasteCompatibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const hasEnoughData = (allWines?.filter((w) => w.quantity > 0)?.length ?? 0) >= 3;

  const fetchCompatibility = async () => {
    if (!allWines?.length || !hasEnoughData) return;
    setLoading(true);
    try {
      const cellar = allWines.filter((w) => w.quantity > 0).map((w) => ({
        name: w.name,
        style: w.style,
        grape: w.grape,
        country: w.country,
        region: w.region,
        producer: w.producer,
        quantity: w.quantity,
      }));
      const data = await getTasteCompatibility(wine, cellar);
      setResult(data);
      setFetched(true);
    } catch {
      // Silently fail - this is supplementary info
      setFetched(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && !fetched && hasEnoughData) {
      fetchCompatibility();
    }
  }, [autoFetch, fetched, hasEnoughData]);

  if (!hasEnoughData) return null;

  if (!fetched && !autoFetch) {
    return (
      <button
        onClick={fetchCompatibility}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[9px] font-bold",
          "bg-primary/6 text-primary/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer",
          className,
        )}
      >
        {loading ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : (
          <Sparkles className="h-2.5 w-2.5" />
        )}
        Compatibilidade
      </button>
    );
  }

  if (loading) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[9px] font-bold bg-muted/30 text-muted-foreground", className)}>
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      </span>
    );
  }

  if (!result || result.compatibility === null) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[9px] font-bold",
        compatibilityBg(result.compatibility),
        compatibilityColor(result.compatibility),
        className,
      )}
      title={result.reason}
    >
      {result.compatibility}% · {result.label}
    </span>
  );
}
