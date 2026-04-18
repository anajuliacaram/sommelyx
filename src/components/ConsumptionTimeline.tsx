import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Star, Pencil } from "@/icons/lucide";
import type { ConsumptionEntry } from "@/hooks/useConsumption";
import { useWines } from "@/hooks/useWines";
import { getStyleColor } from "@/lib/sommelyx-data";
import { EditConsumptionDialog } from "@/components/EditConsumptionDialog";

function getMonthKey(date: Date) {
  return format(date, "yyyy-MM");
}

function getMonthLabel(date: Date) {
  return format(date, "MMM yy", { locale: ptBR }).replace(".", "").toLowerCase();
}

function getWeekdayLabel(date: Date) {
  return format(date, "EEE", { locale: ptBR }).replace(".", "").slice(0, 3).toUpperCase();
}

type ConsumptionTimelineProps = {
  entries: ConsumptionEntry[];
  title?: string;
};

export function ConsumptionTimeline({ entries, title = "Brindes recentes" }: ConsumptionTimelineProps) {
  const { data: wines = [] } = useWines();
  const [editing, setEditing] = useState<ConsumptionEntry | null>(null);

  const wineStyleById = useMemo(() => {
    const map = new Map<string, string | null>();
    wines.forEach((w) => map.set(w.id, w.style));
    return map;
  }, [wines]);

  const months = useMemo(() => {
    const map = new Map<string, { key: string; label: string; events: ConsumptionEntry[] }>();
    entries.forEach((entry) => {
      const date = new Date(entry.consumed_at);
      const key = getMonthKey(date);
      const current = map.get(key) ?? { key, label: getMonthLabel(date), events: [] as ConsumptionEntry[] };
      current.events.push(entry);
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [entries]);

  return (
    <section className="rounded-[24px] bg-[#FFFFFF] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(26,23,19,0.5)]">
            Meu Consumo
          </p>
          <h2 className="mt-1 font-serif text-[1.45rem] font-semibold tracking-[-0.03em] text-[#1A1713]">
            {title}
          </h2>
        </div>
      </div>

      {months.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <p className="font-serif text-[15px] text-[rgba(26,23,19,0.55)]">
            Nenhum consumo encontrado neste período
          </p>
          <p className="mt-1 text-[12px] text-[#7A746B]">
            Ajuste os filtros acima para ver mais brindes
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {months.map((month) => (
            <div key={month.key}>
              <div className="mb-3 flex items-center gap-3">
                <span className="font-semibold text-[13px] tracking-[-0.01em] text-[#7B1E2B]">
                  {month.label}
                </span>
                <div className="h-px flex-1 bg-[rgba(95,111,82,0.08)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.45)] tabular-nums">
                  {month.events.length} {month.events.length === 1 ? "ABERTURA" : "ABERTURAS"}
                </span>
              </div>

              <div className="flex flex-col">
                {month.events.map((entry, index) => {
                  const date = new Date(entry.consumed_at);
                  const styleSource =
                    entry.style ?? (entry.wine_id ? wineStyleById.get(entry.wine_id) ?? null : null);
                  const color = styleSource ? getStyleColor(styleSource) : "rgba(95,111,82,0.25)";
                  return (
                    <div
                      key={entry.id}
                      className="flex items-stretch gap-3 py-3"
                      style={{
                        borderBottom:
                          index < month.events.length - 1
                            ? "1px solid rgba(0,0,0,0.05)"
                            : "none",
                      }}
                    >
                      <div className="flex w-9 shrink-0 flex-col items-center justify-start text-center">
                        <span className="font-sans text-[18px] font-bold leading-none tracking-[-0.04em] text-[#1A1713] tabular-nums">
                          {date.getDate()}
                        </span>
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgba(26,23,19,0.45)]">
                          {getWeekdayLabel(date)}
                        </span>
                      </div>

                      <div
                        className="w-[3px] shrink-0 self-stretch rounded-[2px]"
                        style={{ background: color, minHeight: 32 }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-sans text-[14px] font-semibold tracking-[-0.005em] text-[#1A1713]">
                          <span
                            aria-hidden
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: color }}
                          />
                          <span className="truncate">{entry.wine_name}</span>
                        </div>
                        <div className="mt-0.5 text-[12px] text-[rgba(26,23,19,0.55)]">
                          {entry.location || entry.tasting_notes || "—"}
                        </div>
                      </div>

                      <div className="flex min-w-[52px] shrink-0 items-center justify-end gap-1 text-[11px] font-medium text-[#C9B469]">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="tabular-nums">
                          {entry.rating != null ? entry.rating.toFixed(1) : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
