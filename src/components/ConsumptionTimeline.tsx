import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Star, Pencil } from "@/icons/lucide";
import type { ConsumptionEntry } from "@/hooks/useConsumption";
import { useWines } from "@/hooks/useWines";
import { getStyleColor } from "@/lib/sommelyx-data";
import { EditConsumptionDialog } from "@/components/EditConsumptionDialog";

function getMonthKey(date: Date) {
  if (Number.isNaN(date.getTime())) return "sem-data";
  return format(date, "yyyy-MM");
}

function getMonthLabel(date: Date) {
  if (Number.isNaN(date.getTime())) return "sem data";
  return format(date, "MMM yy", { locale: ptBR }).replace(".", "").toLowerCase();
}

function getWeekdayLabel(date: Date) {
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "EEE", { locale: ptBR }).replace(".", "").slice(0, 3).toUpperCase();
}

function formatRating(value: unknown) {
  const rating = Number(value);
  return Number.isFinite(rating) ? rating.toFixed(1) : "—";
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
    <section className="consumption-journal rounded-[28px] bg-[rgba(255,253,248,0.58)] p-4 shadow-none md:p-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[rgba(26,23,19,0.5)]">
            Meu Consumo
          </p>
          <h2 className="mt-1 font-serif text-[1.2rem] font-medium leading-[1.02] tracking-[-0.035em] text-[#1A1713] md:text-[1.45rem]">
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
        <div className="flex flex-col gap-3">
          {months.map((month) => (
            <div key={month.key}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="font-semibold text-[12px] tracking-[-0.01em] text-[var(--sx-bordeaux)]">
                  {month.label}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[rgba(117,107,99,0.52)] tabular-nums">
                  {month.events.length} {month.events.length === 1 ? "ABERTURA" : "ABERTURAS"}
                </span>
              </div>

              <div className="flex flex-col gap-2">
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
                      className="group flex items-center gap-2.5 rounded-[20px] bg-[rgba(255,253,248,0.66)] px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,253,248,0.9)] disabled:cursor-default"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[15px] bg-[rgba(232,221,207,0.54)] text-center">
                        <span className="font-sans text-[15px] font-semibold leading-none tracking-[-0.04em] text-[#1A1713] tabular-nums">
                          {date.getDate()}
                        </span>
                        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[rgba(26,23,19,0.45)]">
                          {getWeekdayLabel(date)}
                        </span>
                      </div>

                      <div className="flex h-full min-h-[36px] items-center justify-center">
                        <span
                          aria-hidden
                          className="inline-block h-[34px] w-[3px] rounded-[2px]"
                          style={{ background: color }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-serif text-[15px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#1A1713]">
                          <span className="min-w-0 truncate leading-[1.15]">{entry.wine_name}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] leading-[1.25] text-[rgba(26,23,19,0.55)]">
                          {entry.location || entry.tasting_notes || "—"}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-1.5 rounded-full bg-[rgba(199,168,90,0.10)] px-2 py-1 text-[10px] font-medium text-[#9A7A2C]">
                        <span className="flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          <span className="tabular-nums">
                            {entry.rating != null ? formatRating(entry.rating) : "—"}
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
