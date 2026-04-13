import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationFields } from "@/components/LocationFields";
import { formatLocationLabel, type StructuredLocation } from "@/lib/location";
import { STOCK_AUDIT_REASONS, normalizeAuditName, normalizeAuditText } from "@/lib/stock-audit";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateWineLocation } from "@/hooks/useWineLocations";
import { useToast } from "@/hooks/use-toast";

export function CreateLocationDialog({
  open,
  onOpenChange,
  wineId,
  wineName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wineId: string;
  wineName: string;
}) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";
  const createLocation = useCreateWineLocation();
  const { toast } = useToast();

  const [location, setLocation] = useState<StructuredLocation>({});
  const [responsibleName, setResponsibleName] = useState("");
  const [reason, setReason] = useState("Correção de cadastro");
  const [notes, setNotes] = useState("");

  const canSubmit = useMemo(() => {
    const label = formatLocationLabel(location);
    if (!label) return false;
    if (isCommercial) {
      const resp = normalizeAuditName(responsibleName);
      const rsn = normalizeAuditText(reason);
      if (!resp || !rsn) return false;
      if (rsn === "Outro" && !normalizeAuditText(notes)) return false;
    }
    return true;
  }, [location, isCommercial, responsibleName, reason, notes]);

  const close = () => {
    setLocation({});
    setResponsibleName("");
    setReason("Correção de cadastro");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!createLocation.isPending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[18px] tracking-tight">Adicionar localização</DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed">
            Crie um novo ponto físico para este vinho. Você pode transferir garrafas para ele depois.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Vinho</p>
            <p className="mt-1 text-[13px] font-semibold text-foreground truncate">{wineName}</p>
          </div>

          <LocationFields value={location} onChange={setLocation} label="Nova localização" />

          {isCommercial ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Responsável <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Ex.: Ana / Equipe salão / Gerência"
                  className="mt-1 h-10 rounded-2xl"
                  onFocus={() => {
                    if (!responsibleName && typeof user?.user_metadata?.full_name === "string") {
                      setResponsibleName(String(user.user_metadata.full_name));
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Motivo <span className="text-destructive">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="mt-1 h-10 rounded-2xl">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {STOCK_AUDIT_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Observação {normalizeAuditText(reason) === "Outro" ? <span className="text-destructive">*</span> : null}
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione contexto, se necessário"
                  className="mt-1 h-10 rounded-2xl"
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-2xl" onClick={close} disabled={createLocation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            className="h-10 rounded-2xl"
            disabled={!canSubmit || createLocation.isPending}
            onClick={async () => {
              try {
                const created = await createLocation.mutateAsync({
                  wineId,
                  sector: location.sector ?? null,
                  zone: location.zone ?? null,
                  level: location.level ?? null,
                  position: location.position ?? null,
                  manualLabel: location.manualLabel ?? null,
                  quantity: 0,
                  responsibleName: isCommercial ? normalizeAuditName(responsibleName) : null,
                  reason: isCommercial ? normalizeAuditText(reason) : null,
                  notes: isCommercial ? (normalizeAuditText(notes) || null) : null,
                });
                void created;

                toast({ title: "Localização adicionada!" });
                close();
              } catch (err: any) {
                toast({ title: "Erro ao adicionar localização", description: err?.message, variant: "destructive" });
              }
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
