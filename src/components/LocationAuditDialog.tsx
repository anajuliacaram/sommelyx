import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "@/icons/lucide";
import { STOCK_AUDIT_REASONS, normalizeAuditName, normalizeAuditText, type StockAuditReason } from "@/lib/stock-audit";

export function LocationAuditDialog({
  open,
  onOpenChange,
  title = "Registrar alteração de localização",
  subtitle = "Antes de concluir, informe quem realizou esta alteração e o motivo, para manter o histórico.",
  previousLabel,
  newLabel,
  requireAudit,
  defaultResponsibleName,
  defaultReason = "Transferência",
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  previousLabel: string;
  newLabel: string;
  requireAudit?: boolean;
  defaultResponsibleName?: string;
  defaultReason?: StockAuditReason;
  busy?: boolean;
  onConfirm: (result: { responsibleName?: string; reason?: StockAuditReason; notes?: string }) => Promise<void> | void;
}) {
  const [responsibleName, setResponsibleName] = useState(defaultResponsibleName ?? "");
  const [reason, setReason] = useState<StockAuditReason | "">((defaultReason ?? "") as any);
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResponsibleName(defaultResponsibleName ?? "");
    setReason((defaultReason ?? "") as any);
    setNotes("");
    setTouched(false);
  }, [open, defaultResponsibleName, defaultReason]);

  const errors = useMemo(() => {
    const next: { responsible?: string; reason?: string; notes?: string } = {};
    const n = normalizeAuditName(responsibleName);
    const r = normalizeAuditText(String(reason || ""));
    const nn = normalizeAuditText(notes);
    if (requireAudit) {
      if (!n) next.responsible = "Informe o responsável para registrar no histórico.";
      if (!r) next.reason = "Selecione um motivo para manter a rastreabilidade.";
      if (r === "Outro" && !nn) next.notes = "Descreva o motivo em observação complementar.";
    }
    return next;
  }, [requireAudit, responsibleName, reason, notes]);

  const canSubmit = Object.keys(errors).length === 0 && !busy;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="font-serif text-[18px] tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed">{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-4">
          <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Localização</p>
            <div className="mt-2 grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 sm:col-span-6">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Anterior</p>
                <p className="text-[13px] font-semibold text-foreground truncate">{previousLabel || "—"}</p>
              </div>
              <div className="col-span-12 sm:col-span-6">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Nova</p>
                <p className="text-[13px] font-semibold text-foreground truncate">{newLabel || "—"}</p>
              </div>
            </div>
          </div>

          {requireAudit ? (
            <div className="grid gap-3">
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Nome do responsável <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Ex.: Ana / Equipe salão / Gerência"
                  className="mt-1 h-10 rounded-2xl"
                />
                {touched && errors.responsible ? (
                  <p className="mt-1 text-[11px] text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> {errors.responsible}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Motivo <span className="text-destructive">*</span>
                  </Label>
                  <Select value={reason} onValueChange={(v) => { setReason(v as any); setTouched(true); }}>
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
                  {touched && errors.reason ? (
                    <p className="mt-1 text-[11px] text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> {errors.reason}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Observação {normalizeAuditText(String(reason || "")) === "Outro" ? <span className="text-destructive">*</span> : null}
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="Adicione contexto, se necessário"
                    rows={3}
                    className="mt-1 rounded-2xl"
                  />
                  {touched && errors.notes ? (
                    <p className="mt-1 text-[11px] text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> {errors.notes}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground">
              Essa alteração será registrada no log.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-2xl" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-10 rounded-2xl"
              disabled={!canSubmit}
              onClick={async () => {
                setTouched(true);
                if (!canSubmit) return;
                await onConfirm({
                  responsibleName: normalizeAuditName(responsibleName) || undefined,
                  reason: (reason || undefined) as any,
                  notes: normalizeAuditText(notes) || undefined,
                });
                onOpenChange(false);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

