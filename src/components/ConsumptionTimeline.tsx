import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { Star } from "@/icons/lucide";
import type { ConsumptionEntry } from "@/hooks/useConsumption";
import { getStyleColor, styleColor } from "@/lib/sommelyx-data";

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
  const monthsMap = new Map<string, { key: string; label: string; events: ConsumptionEntry[] }>();

  entries.forEach((entry) => {
    const date = new Date(entry.consumed_at);
    const key = getMonthKey(date);
    const current = monthsMap.get(key) ?? { key, label: getMonthLabel(date), events: [] as ConsumptionEntry[] };
    current.events.push(entry);
    monthsMap.set(key, current);
  });

  const months = Array.from(monthsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

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

      <div className="flex flex-col gap-4">
        {months
          .slice()
          .reverse()
          .filter((month) => month.events.length > 0)
          .map((month) => (
            <div key={month.key}>
              <div className="mb-2.5 flex items-center gap-3">
                <span className="font-semibold text-[13px] tracking-[-0.01em] text-[#7B1E2B]">
                  {month.label}
                </span>
                <div className="h-px flex-1 bg-[rgba(0,0,0,0.08)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.45)] tabular-nums">
                  {month.events.length} {month.events.length === 1 ? "ABERTURA" : "ABERTURAS"}
                </span>
              </div>

              <div className="flex flex-col">
                {month.events.map((entry, index) => {
                  const date = new Date(entry.consumed_at);
                  const color = getStyleColor(entry.style) || styleColor.tinto;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-stretch gap-3 py-3"
                      style={{
                        borderBottom:
                          index < month.events.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                      }}
                    >
                      <div className="flex w-9 shrink-0 flex-col items-center justify-start text-center">
                        <span className="font-sans text-[18px] font-semibold leading-none tracking-[-0.04em] text-[#1A1713] tabular-nums">
                          {date.getDate()}
                        </span>
                        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[rgba(26,23,19,0.45)]">
                          {getWeekdayLabel(date)}
                        </span>
                      </div>

                      <div
                        className="w-[4px] shrink-0 rounded-full self-stretch"
                        style={{ background: color, minHeight: 32 }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="font-serif text-[14px] font-semibold tracking-[-0.01em] text-[#1A1713]">
                          {entry.wine_name}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-[rgba(26,23,19,0.6)]">
                          {entry.location || entry.tasting_notes || "—"}
                        </div>
                      </div>

                      <div className="flex min-w-[52px] shrink-0 items-center justify-end gap-1 text-[11px] font-medium text-[#C9B469]">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="tabular-nums">{entry.rating != null ? entry.rating.toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
