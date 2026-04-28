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
    <section className="rounded-[22px] bg-[#FFFFFF] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[rgba(26,23,19,0.5)]">
            Meu Consumo
          </p>
          <h2 className="mt-1 font-serif text-[1.25rem] font-semibold tracking-[-0.03em] text-[#1A1713] md:text-[1.4rem]">
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
        <div className="flex flex-col gap-3.5">
          {months.map((month) => (
            <div key={month.key}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="font-semibold text-[12px] tracking-[-0.01em] text-[#7B1E2B]">
                  {month.label}
                </span>
                <div className="h-px flex-1 bg-[rgba(95,111,82,0.08)]" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.45)] tabular-nums">
                  {month.events.length} {month.events.length === 1 ? "ABERTURA" : "ABERTURAS"}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {month.events.map((entry, index) => {
                  const date = new Date(entry.consumed_at);
                  const styleSource =
                    entry.style ?? (entry.wine_id ? wineStyleById.get(entry.wine_id) ?? null : null);
                  const color = styleSource ? getStyleColor(styleSource) : "rgba(95,111,82,0.25)";
                  const isDemo = entry.user_id === "demo";
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      onClick={() => !isDemo && setEditing(entry)}
                      disabled={isDemo}
                      className="group grid grid-cols-[44px_24px_minmax(0,1fr)_52px] items-center gap-x-2.5 rounded-[16px] px-1.5 py-2 text-left transition-colors hover:bg-[rgba(123,30,43,0.025)] disabled:cursor-default"
                    >
                      <div className="flex w-[44px] flex-col items-center justify-center text-center">
                        <span className="font-sans text-[15px] font-bold leading-none tracking-[-0.04em] text-[#1A1713] tabular-nums">
                          {date.getDate()}
                        </span>
                        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[rgba(26,23,19,0.45)]">
                          {getWeekdayLabel(date)}
                        </span>
                      </div>

                      <div className="relative flex h-full min-h-[36px] items-center justify-center">
                        <span
                          aria-hidden
                          className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(95,111,82,0.10)_0%,rgba(95,111,82,0.18)_50%,rgba(95,111,82,0.10)_100%)]"
                        />
                        <span
                          aria-hidden
                          className="relative z-10 inline-block h-2.5 w-2.5 rounded-full border border-white shadow-[0_1px_3px_rgba(0,0,0,0.10)]"
                          style={{ background: color }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-sans text-[13px] font-semibold tracking-[-0.005em] text-[#1A1713]">
                          <span className="min-w-0 truncate leading-[1.15]">{entry.wine_name}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] leading-[1.25] text-[rgba(26,23,19,0.55)]">
                          {entry.location || entry.tasting_notes || "—"}
                        </div>
                      </div>

                      <div className="flex min-w-[52px] shrink-0 items-center justify-end gap-1.5 text-[10px] font-medium text-[#C9B469]">
                        <span className="flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          <span className="tabular-nums">
                            {entry.rating != null ? entry.rating.toFixed(1) : "—"}
                          </span>
                        </span>
                        {!isDemo && (
                          <Pencil
                            className="h-3 w-3 text-[rgba(26,23,19,0.3)] opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <EditConsumptionDialog
        entry={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </section>
  );
}
