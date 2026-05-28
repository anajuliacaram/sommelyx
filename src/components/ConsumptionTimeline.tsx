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
    <section className="consumption-journal consumo-v2-timeline sx-v2-floating-panel">
      <div className="consumo-v2-timeline-head">
        <div className="min-w-0">
          <p className="consumo-v2-timeline-kicker">Journal</p>
          <h2 className="consumo-v2-timeline-title">{title}</h2>
        </div>
        <span className="consumo-v2-timeline-count">
          {entries.length} {entries.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      {months.length === 0 ? (
        <div className="consumo-v2-timeline-empty">
          <p className="consumo-v2-empty-title">
            Nenhum consumo encontrado neste período
          </p>
          <p className="consumo-v2-empty-copy">
            Ajuste os filtros acima para ver mais brindes
          </p>
        </div>
      ) : (
        <div className="consumo-v2-months">
          {months.map((month) => (
            <div key={month.key} className="consumo-v2-month">
              <div className="consumo-v2-month-head">
                <span className="consumo-v2-month-label">{month.label}</span>
                <span className="consumo-v2-month-count">
                  {month.events.length} {month.events.length === 1 ? "ABERTURA" : "ABERTURAS"}
                </span>
              </div>

              <div className="consumo-v2-entry-list">
                {month.events.map((entry) => {
                  const date = new Date(entry.consumed_at);
                  const styleSource =
                    entry.style ?? (entry.wine_id ? wineStyleById.get(entry.wine_id) ?? null : null);
                  const color = styleSource ? getStyleColor(styleSource) : "rgba(95,111,82,0.25)";
                  const isDemo = entry.user_id === "demo";
                  const meta = [entry.producer, entry.vintage, entry.country].filter(Boolean).join(" · ");
                  const note = entry.tasting_notes?.trim() || entry.location?.trim() || "";
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      onClick={() => !isDemo && setEditing(entry)}
                      disabled={isDemo}
                      className="consumo-v2-entry group text-left disabled:cursor-default"
                    >
                      <div className="consumo-v2-entry-date">
                        <span className="consumo-v2-entry-day">{date.getDate()}</span>
                        <span className="consumo-v2-entry-weekday">{getWeekdayLabel(date)}</span>
                      </div>

                      <div className="consumo-v2-entry-line-wrap">
                        <span
                          aria-hidden
                          className="consumo-v2-entry-line"
                          style={{ background: color }}
                        />
                      </div>

                      <div className="consumo-v2-entry-copy">
                        <div className="consumo-v2-entry-title-row">
                          <span className="consumo-v2-entry-title">{entry.wine_name}</span>
                        </div>
                        {meta ? (
                          <div className="consumo-v2-entry-meta">{meta}</div>
                        ) : null}
                        {note ? (
                          <div className="consumo-v2-entry-note">{note}</div>
                        ) : null}
                      </div>

                      <div className="consumo-v2-entry-side">
                        <div className="consumo-v2-entry-rating">
                          <span className="consumo-v2-entry-rating-icon">
                            <Star className="h-2.5 w-2.5 fill-current" />
                          </span>
                          <span className="tabular-nums">
                            {entry.rating != null ? formatRating(entry.rating) : "—"}
                          </span>
                        </div>
                        {!isDemo && (
                          <Pencil
                            className="consumo-v2-entry-edit"
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
