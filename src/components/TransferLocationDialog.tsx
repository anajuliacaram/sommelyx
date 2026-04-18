import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STOCK_AUDIT_REASONS, normalizeAuditName, normalizeAuditText } from "@/lib/stock-audit";
import { useTransferWineLocation, type WineLocation } from "@/hooks/useWineLocations";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function TransferLocationDialog({
  open,
  onOpenChange,
  wineId,
  wineName,
  locations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wineId: string;
  wineName: string;
  locations: WineLocation[];
}) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";
  const transfer = useTransferWineLocation();
  const { toast } = useToast();

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [qty, setQty] = useState("1");
  const [responsibleName, setResponsibleName] = useState("");
  const [reason, setReason] = useState("Transferência");
  const [notes, setNotes] = useState("");

  const fromLoc = useMemo(() => locations.find((l) => l.id === fromId) ?? null, [locations, fromId]);

  const canSubmit = useMemo(() => {
    const q = Number.parseInt(qty || "0", 10);
    if (!fromId || !toId || fromId === toId) return false;
    if (!Number.isFinite(q) || q <= 0) return false;
    if (fromLoc && q > fromLoc.quantity) return false;
    if (isCommercial) {
      const resp = normalizeAuditName(responsibleName);
      const rsn = normalizeAuditText(reason);
      if (!resp || !rsn) return false;
      if (rsn === "Outro" && !normalizeAuditText(notes)) return false;
    }
    return true;
  }, [fromId, toId, qty, fromLoc, isCommercial, responsibleName, reason, notes]);

  const close = () => {
    setFromId(""); setToId(""); setQty("1"); setResponsibleName(""); setReason("Transferência"); setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!transfer.isPending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Transferir entre localizações</DialogTitle>
          <DialogDescription>
            Mova garrafas entre setores, gôndolas e linhas sem alterar o total do estoque. Isso fica registrado no Log.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur-xl">
            <p className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">Vinho</p>
            <p className="mt-1 text-[13px] font-semibold text-foreground truncate">{wineName}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">De</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {(l.formatted_label ?? l.manual_label ?? "Sem localização")} • {l.quantity} un.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">Para</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {(l.formatted_label ?? l.manual_label ?? "Sem localização")} • {l.quantity} un.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">Quantidade</Label>
            <Input
              type="number"
              min={1}
              max={fromLoc?.quantity ?? 999}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1"
            />
            {fromLoc && Number.parseInt(qty || "0", 10) > fromLoc.quantity ? (
              <p className="mt-1 text-[11px] text-destructive">Quantidade maior que o disponível na localização de origem.</p>
            ) : null}
          </div>

          {isCommercial ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">
                  Responsável <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Ex.: Ana / Equipe salão / Gerência"
                  className="mt-1"
                  onFocus={() => {
                    if (!responsibleName && typeof user?.user_metadata?.full_name === "string") {
                      setResponsibleName(String(user.user_metadata.full_name));
                    }
                  }}
                />
              </div>
              <div>
                <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">
                  Motivo <span className="text-destructive">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
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
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs tracking-[0.12em] uppercase text-black/50 mb-2">
                  Observação {normalizeAuditText(reason) === "Outro" ? <span className="text-destructive">*</span> : null}
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione contexto, se necessário"
                  className="mt-1"
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={transfer.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!canSubmit || transfer.isPending}
            onClick={async () => {
              try {
                await transfer.mutateAsync({
                  wineId,
                  fromLocationId: fromId,
                  toLocationId: toId,
                  quantity: Number.parseInt(qty, 10) || 0,
                  notes: normalizeAuditText(notes) || undefined,
                  responsibleName: isCommercial ? normalizeAuditName(responsibleName) : undefined,
                  reason: isCommercial ? normalizeAuditText(reason) : undefined,
                });
                toast({ title: "Transferência registrada!" });
                close();
              } catch (err: any) {
                toast({ title: "Erro ao transferir", description: err?.message, variant: "destructive" });
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
