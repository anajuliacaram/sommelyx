import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLocationLabel, normalizeLocationPart, type StructuredLocation } from "@/lib/location";
import { useLocationOptions } from "@/hooks/useWineLocations";

export function LocationFields({
  value,
  onChange,
  label = "Localização na adega",
  required,
  className,
}: {
  value: StructuredLocation;
  onChange: (next: StructuredLocation) => void;
  label?: string;
  required?: boolean;
  className?: string;
}) {
  const opts = useLocationOptions();
  const [manual, setManual] = useState<boolean>(!!value.manualLabel);

  const formatted = useMemo(() => formatLocationLabel(value), [value]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            {label} {required ? <span className="text-destructive">*</span> : null}
          </Label>
          <p className="mt-1 text-[10px] text-muted-foreground/80">
            {formatted ? (
              <>
                Formato final: <span className="font-semibold text-foreground">{formatted}</span>
              </>
            ) : (
              "Escolha setor, gôndola e linha para encontrar rápido na adega."
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-2 text-[11px] font-semibold"
          onClick={() => setManual((v) => !v)}
        >
          {manual ? "Usar seleção" : "Escrever manualmente"}
        </Button>
      </div>

      {manual ? (
        <Input
          value={value.manualLabel ?? ""}
          onChange={(e) => onChange({ ...value, manualLabel: normalizeLocationPart(e.target.value) })}
          placeholder="Ex.: Fundos • Gôndola 2 • Linha 3"
          className="h-10 rounded-2xl"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Setor</Label>
              <Input
                list="sommelyx-sector"
                value={value.sector ?? ""}
                onChange={(e) => onChange({ ...value, sector: normalizeLocationPart(e.target.value), manualLabel: "" })}
                placeholder="Ex.: Adega principal"
                className="mt-1 h-10 rounded-2xl"
              />
              <datalist id="sommelyx-sector">
                {opts.sectors.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Zona / gôndola</Label>
              <Input
                list="sommelyx-zone"
                value={value.zone ?? ""}
                onChange={(e) => onChange({ ...value, zone: normalizeLocationPart(e.target.value), manualLabel: "" })}
                placeholder="Ex.: Gôndola 2"
                className="mt-1 h-10 rounded-2xl"
              />
              <datalist id="sommelyx-zone">
                {opts.zones.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Nível / linha</Label>
              <Input
                list="sommelyx-level"
                value={value.level ?? ""}
                onChange={(e) => onChange({ ...value, level: normalizeLocationPart(e.target.value), manualLabel: "" })}
                placeholder="Ex.: Linha 3"
                className="mt-1 h-10 rounded-2xl"
              />
              <datalist id="sommelyx-level">
                {opts.levels.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Posição (opcional)</Label>
              <Input
                list="sommelyx-position"
                value={value.position ?? ""}
                onChange={(e) => onChange({ ...value, position: normalizeLocationPart(e.target.value), manualLabel: "" })}
                placeholder="Ex.: Esquerda"
                className="mt-1 h-10 rounded-2xl"
              />
              <datalist id="sommelyx-position">
                {opts.positions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

