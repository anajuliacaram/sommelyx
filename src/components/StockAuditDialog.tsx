import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2 } from "@/icons/lucide";
import { STOCK_AUDIT_REASONS, normalizeAuditName, normalizeAuditText, type StockAuditReason } from "@/lib/stock-audit";

type AuditPayload = {
  title?: string;
  wineName: string;
  actionLabel: string;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
};

type AuditResult = {
  responsibleName: string;
  reason: StockAuditReason;
  notes?: string;
  locationId?: string;
};

export function StockAuditDialog({
  open,
  onOpenChange,
  payload,
  locations,
  requireLocation,
  defaultLocationId,
  defaultResponsibleName,
  defaultReason,
  confirmLabel = "Confirmar alteração",
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: AuditPayload | null;
  locations?: { id: string; label: string; quantity?: number }[];
  requireLocation?: boolean;
  defaultLocationId?: string;
  defaultResponsibleName?: string;
  defaultReason?: StockAuditReason;
  confirmLabel?: string;
  onConfirm: (result: AuditResult) => Promise<void> | void;
  busy?: boolean;
}) {
  const [responsibleName, setResponsibleName] = useState(defaultResponsibleName ?? "");
  const [reason, setReason] = useState<StockAuditReason | "">((defaultReason ?? "") as any);
  const [notes, setNotes] = useState("");
  const [locationId, setLocationId] = useState(defaultLocationId ?? "");
  const [touched, setTouched] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResponsibleName(defaultResponsibleName ?? "");
    setReason((defaultReason ?? "") as any);
    setNotes("");
    setLocationId(defaultLocationId ?? "");
    setTouched(false);
    setSuccess(false);
  }, [open, defaultResponsibleName, defaultReason, defaultLocationId]);

  const errors = useMemo(() => {
    const next: { responsible?: string; reason?: string; notes?: string; location?: string } = {};
    const n = normalizeAuditName(responsibleName);
    const r = normalizeAuditText(String(reason || ""));
    const nn = normalizeAuditText(notes);
    if (!n) next.responsible = "Informe o responsável para registrar no histórico.";
    if (!r) next.reason = "Selecione um motivo para manter a rastreabilidade.";
    if (r === "Outro" && !nn) next.notes = "Descreva o motivo em observação complementar.";
    if (requireLocation && (!locationId || !locations?.some((l) => l.id === locationId))) {
      next.location = "Selecione a localização para registrar corretamente.";
    }
    return next;
  }, [responsibleName, reason, notes, requireLocation, locationId, locations]);

  const canSubmit = Object.keys(errors).length === 0 && !!payload && !busy && !success;

  if (!payload) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{payload.title ?? "Registrar alteração de estoque"}</DialogTitle>
          <DialogDescription>
            Antes de concluir, informe quem realizou esta alteração e o motivo, para manter o histórico da operação.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-4">
          <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Resumo</p>
            <div className="mt-2 grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 sm:col-span-7">
                <p className="text-[13px] font-semibold text-foreground truncate">{payload.wineName}</p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{payload.actionLabel}</p>
              </div>
              <div className="col-span-12 sm:col-span-5">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2 ring-1 ring-black/[0.05]">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">De</p>
                    <p className="text-[14px] font-black text-foreground">{payload.previousQuantity}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Variação</p>
                    <p className="text-[13px] font-black text-foreground">
                      {payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Para</p>
                    <p className="text-[14px] font-black text-foreground">{payload.newQuantity}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {success ? (
            <div className="rounded-2xl border border-black/5 bg-white p-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-success/10 text-success flex items-center justify-center ring-1 ring-success/15">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">Alteração registrada com sucesso.</p>
                <p className="text-[11px] text-muted-foreground">O log da operação foi atualizado.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {locations?.length ? (
                  <div>
                    <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">
                      Localização {requireLocation ? <span className="text-destructive">*</span> : null}
                    </Label>
                    <Select value={locationId} onValueChange={(v) => { setLocationId(v); setTouched(true); }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.label}{typeof l.quantity === "number" ? ` • ${l.quantity} un.` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touched && errors.location ? (
                      <p className="mt-1 text-[11px] text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> {errors.location}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div>
                    <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">
                      Nome do responsável <span className="text-destructive">*</span>
                    </Label>
                  <Input
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="Ex.: Ana / Equipe salão / Gerência"
                    className="mt-1"
                  />
                  {touched && errors.responsible ? (
                    <p className="mt-1 text-[11px] text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> {errors.responsible}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">
                      Motivo da alteração <span className="text-destructive">*</span>
                    </Label>
                    <Select value={reason} onValueChange={(v) => { setReason(v as any); setTouched(true); }}>
                      <SelectTrigger className="mt-1">
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
                    {touched && errors.reason ? (
                      <p className="mt-1 text-[11px] text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> {errors.reason}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">
                      Observação complementar
                    </Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="Adicione contexto, se necessário"
                      rows={3}
                      className="mt-1"
                    />
                    {touched && errors.notes ? (
                      <p className="mt-1 text-[11px] text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> {errors.notes}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-2 gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  disabled={busy}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!canSubmit}
                  onClick={async () => {
                    setTouched(true);
                    if (!canSubmit) return;
                    await onConfirm({
                      responsibleName: normalizeAuditName(responsibleName),
                      reason: reason as StockAuditReason,
                      notes: normalizeAuditText(notes) || undefined,
                      locationId: locationId || undefined,
                    });
                    setSuccess(true);
                    setTimeout(() => onOpenChange(false), 650);
                  }}
                >
                  {confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
