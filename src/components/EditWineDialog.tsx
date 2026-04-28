import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, Save } from "@/icons/lucide";
import { useUpdateWine, useWineEvent, type Wine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { StockAuditDialog } from "@/components/StockAuditDialog";
import { LocationFields } from "@/components/LocationFields";
import { formatLocationLabel, type StructuredLocation } from "@/lib/location";
import { useCreateWineLocation, useUpdateWineLocation, useWineLocations } from "@/hooks/useWineLocations";
import { LocationAuditDialog } from "@/components/LocationAuditDialog";
import { TransferLocationDialog } from "@/components/TransferLocationDialog";
import { CreateLocationDialog } from "@/components/CreateLocationDialog";
import { normalizeWineData } from "@/lib/wine-normalization";

interface EditWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wine: Wine | null;
}

const styles = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
];

function normalizeSuggestionText(value?: string | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function suggestMarketValue(input: {
  name?: string | null;
  producer?: string | null;
  vintage?: number | null;
  style?: string | null;
  country?: string | null;
  region?: string | null;
  grape?: string | null;
}) {
  const style = normalizeSuggestionText(input.style);
  const grape = normalizeSuggestionText(input.grape);
  const country = normalizeSuggestionText(input.country);
  const region = normalizeSuggestionText(input.region);
  const producer = normalizeSuggestionText(input.producer);
  const name = normalizeSuggestionText(input.name);

  let price = 78;

  if (style.includes("espum")) price = 120;
  else if (style.includes("fort")) price = 150;
  else if (style.includes("sobrem")) price = 110;
  else if (style.includes("branc")) price = 85;
  else if (style.includes("rose")) price = 82;
  else if (style.includes("tint")) price = 95;

  if (country.includes("fran")) price += 18;
  else if (country.includes("ital")) price += 14;
  else if (country.includes("port")) price += 10;
  else if (country.includes("argentin") || country.includes("chil")) price += 6;

  if (region.includes("barolo") || region.includes("bordeaux") || region.includes("burg")) price += 20;
  else if (region.includes("mendoza") || region.includes("douro") || region.includes("tosc")) price += 8;

  if (producer && /catena|antinori|ruffino|gaja|chateau|château|vega|almaviva|quintarelli/i.test(producer)) price += 15;
  if (grape && /nebbiolo|tannat|cabernet|syrah|sangiovese|riesling|chardonnay/i.test(grape)) price += 6;
  if (name && /reserve|reserva|gran|grand|cru|riserva|selection|seleção/i.test(name)) price += 10;

  if (typeof input.vintage === "number") {
    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - input.vintage);
    if (age > 10) price += 12;
    else if (age > 5) price += 8;
    else if (age <= 2) price -= 4;
  }

  return Math.max(30, Math.round(price / 5) * 5);
}

export function EditWineDialog({ open, onOpenChange, wine }: EditWineDialogProps) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";
  const { data: locations } = useWineLocations(wine?.id);
  const updateLocation = useUpdateWineLocation();
  const createLocation = useCreateWineLocation();

  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [vintage, setVintage] = useState("");
  const [style, setStyle] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [lastPaidSnapshot, setLastPaidSnapshot] = useState("");
  const [lastPaidDateSnapshot, setLastPaidDateSnapshot] = useState("");
  const [lastPaid, setLastPaid] = useState("");
  const [lastPaidDate, setLastPaidDate] = useState("");
  const [purchasePriceUnknown, setPurchasePriceUnknown] = useState(false);
  const [currentValue, setCurrentValue] = useState("");
  const [location, setLocation] = useState<StructuredLocation>({});
  const [drinkFrom, setDrinkFrom] = useState("");
  const [drinkUntil, setDrinkUntil] = useState("");
  const [foodPairing, setFoodPairing] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("");
  const [success, setSuccess] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [createLocOpen, setCreateLocOpen] = useState(false);
  const commercialCost = lastPaid ? Number(lastPaid) : null;
  const commercialSale = currentValue ? Number(currentValue) : null;
  const commercialMargin =
    commercialCost != null && commercialSale != null && Number.isFinite(commercialCost) && Number.isFinite(commercialSale)
      ? commercialSale - commercialCost
      : null;
  const commercialMarginPct =
    commercialMargin != null && commercialCost != null && commercialCost > 0
      ? (commercialMargin / commercialCost) * 100
      : null;

  const updateWine = useUpdateWine();
  const wineEvent = useWineEvent();
  const { toast } = useToast();
  const [auditOpen, setAuditOpen] = useState(false);
  const [locationAuditOpen, setLocationAuditOpen] = useState(false);
  const [pendingLocationOnly, setPendingLocationOnly] = useState<{
    wineId: string;
    wineName: string;
    locationId: string | null;
    previousLabel: string;
    newLabel: string;
    locationUpdates: { sector?: string | null; zone?: string | null; level?: string | null; position?: string | null; manual_label?: string | null };
  } | null>(null);
  const [pendingAudit, setPendingAudit] = useState<{
    wineId: string;
    wineName: string;
    prevQty: number;
    nextQty: number;
    delta: number;
    quantityAbs: number;
    eventType: "stock_increase" | "stock_decrease";
    baseUpdates: Record<string, any>;
    locationMeta?: {
      locationId: string | null;
      previousLabel: string;
      newLabel: string;
      locationUpdates: { sector?: string | null; zone?: string | null; level?: string | null; position?: string | null; manual_label?: string | null };
    };
  } | null>(null);

  useEffect(() => {
    if (wine) {
      const normalizedWine = normalizeWineData(wine, { log: true });
      const primaryLoc = (locations ?? []).find((l) => l.wine_id === wine.id) ?? null;
      setName(normalizedWine.name);
      setProducer(normalizedWine.producer || "");
      setQuantity(String(normalizedWine.quantity));
      setVintage(normalizedWine.vintage ? String(normalizedWine.vintage) : "");
      setStyle(normalizedWine.style || "");
      setCountry(normalizedWine.country || "");
      setRegion(normalizedWine.region || "");
      setGrape(normalizedWine.grape || "");
      setLastPaidSnapshot(normalizedWine.purchase_price != null ? String(normalizedWine.purchase_price) : "");
      setLastPaidDateSnapshot("");
      setLastPaid(normalizedWine.purchase_price ? String(normalizedWine.purchase_price) : "");
      setPurchasePriceUnknown(!isCommercial && !normalizedWine.purchase_price);
      setLastPaidDate(new Date().toISOString().split("T")[0]);
      setCurrentValue(
        normalizedWine.current_value
          ? String(normalizedWine.current_value)
          : (!isCommercial ? String(suggestMarketValue(normalizedWine)) : "")
      );
      setLocation(
        primaryLoc
          ? {
              sector: primaryLoc.sector ?? undefined,
              zone: primaryLoc.zone ?? undefined,
              level: primaryLoc.level ?? undefined,
              position: primaryLoc.position ?? undefined,
              manualLabel: primaryLoc.manual_label ?? undefined,
            }
          : (normalizedWine.cellar_location ? { manualLabel: normalizedWine.cellar_location } : {})
      );
      setDrinkFrom(normalizedWine.drink_from ? String(normalizedWine.drink_from) : "");
      setDrinkUntil(normalizedWine.drink_until ? String(normalizedWine.drink_until) : "");
      setFoodPairing(normalizedWine.food_pairing || "");
      setNotes(normalizedWine.tasting_notes || "");
      setRating(normalizedWine.rating ? String(normalizedWine.rating) : "");
      setSuccess(false);
    }
  }, [wine, locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wine || !name.trim()) return;

    const nextQty = Math.max(0, Number.parseInt(quantity || "0", 10) || 0);
    const prevQty = wine.quantity;
    const formattedLocation = formatLocationLabel(location) || null;
    const primaryLoc = (locations ?? []).find((l) => l.wine_id === wine.id) ?? null;
    const prevLocationLabel = (primaryLoc?.formatted_label ?? primaryLoc?.manual_label ?? wine.cellar_location ?? "") || "";
    const locationChanged = (formattedLocation ?? "") !== (prevLocationLabel ?? "");

    const locationUpdates = {
      sector: location.sector ? location.sector : null,
      zone: location.zone ? location.zone : null,
      level: location.level ? location.level : null,
      position: location.position ? location.position : null,
      manual_label: location.manualLabel ? location.manualLabel : null,
    };

    const baseUpdates: Record<string, any> = {
      name: name.trim(),
      producer: producer || null,
      // quantity: handled separately for commercial (audit trail required)
      vintage: vintage ? parseInt(vintage) : null,
      style: style || null,
      country: country || null,
      region: region || null,
      grape: grape || null,
      purchase_price: isCommercial || !purchasePriceUnknown
        ? (lastPaid ? parseFloat(lastPaid) : null)
        : null,
      current_value: currentValue ? parseFloat(currentValue) : null,
      cellar_location: formattedLocation,
      drink_from: drinkFrom ? parseInt(drinkFrom) : null,
      drink_until: drinkUntil ? parseInt(drinkUntil) : null,
      food_pairing: foodPairing || null,
      tasting_notes: notes || null,
      rating: rating ? parseFloat(rating) : null,
    };

    if (isCommercial && nextQty !== prevQty) {
      const delta = nextQty - prevQty;
      setPendingAudit({
        wineId: wine.id,
        wineName: name.trim(),
        prevQty,
        nextQty,
        delta,
        quantityAbs: Math.abs(delta),
        eventType: delta > 0 ? "stock_increase" : "stock_decrease",
        baseUpdates,
        locationMeta: locationChanged ? {
          locationId: primaryLoc?.id ?? null,
          previousLabel: prevLocationLabel,
          newLabel: formattedLocation ?? "",
          locationUpdates,
        } : undefined,
      });
      setAuditOpen(true);
      return;
    }

    if (locationChanged) {
      // Location meta changes must be logged; commercial requires responsible + reason.
      setPendingLocationOnly({
        wineId: wine.id,
        wineName: name.trim(),
        locationId: primaryLoc?.id ?? null,
        previousLabel: prevLocationLabel,
        newLabel: formattedLocation ?? "",
        locationUpdates,
      });
      setLocationAuditOpen(true);
      return;
    }

    try {
      await updateWine.mutateAsync({
        id: wine.id,
        updates: {
          ...baseUpdates,
          quantity: nextQty,
        },
      });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onOpenChange(false); }, 1200);
    } catch {
      toast({ title: "Não conseguimos salvar as alterações", description: "Verifique sua conexão e tente novamente. Suas edições foram preservadas no formulário.", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-border/50">
        <SheetHeader>
          <SheetTitle className="font-serif text-lg">{isCommercial ? "Editar vinho" : "Editar vinho"}</SheetTitle>
        </SheetHeader>

        <StockAuditDialog
          open={auditOpen}
          onOpenChange={(v) => { setAuditOpen(v); if (!v) setPendingAudit(null); }}
          payload={pendingAudit ? {
            wineName: pendingAudit.wineName,
            actionLabel: "Ajuste manual de estoque (edição)",
            previousQuantity: pendingAudit.prevQty,
            newQuantity: pendingAudit.nextQty,
            delta: pendingAudit.delta,
          } : null}
          locations={
            wine && locations
              ? locations
                  .filter((l) => l.wine_id === wine.id)
                  .map((l) => ({ id: l.id, label: l.formatted_label ?? l.manual_label ?? "Sem localização", quantity: l.quantity }))
              : undefined
          }
          requireLocation={isCommercial}
          defaultLocationId={wine && locations ? (locations.find((l) => l.wine_id === wine.id)?.id ?? undefined) : undefined}
          defaultResponsibleName={
            typeof user?.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : undefined
          }
          defaultReason="Ajuste de inventário"
          confirmLabel="Confirmar alteração"
          busy={updateWine.isPending || wineEvent.isPending}
          onConfirm={async ({ responsibleName, reason, notes: auditNotes, locationId }) => {
            if (!pendingAudit) return;
            try {
              // 1) Update non-stock fields
              await updateWine.mutateAsync({
                id: pendingAudit.wineId,
                updates: pendingAudit.baseUpdates,
              });

              // 1b) If location meta changed, persist and log using the same audit metadata
              if (pendingAudit.locationMeta) {
                const locId = pendingAudit.locationMeta.locationId;
                if (locId) {
                  await updateLocation.mutateAsync({
                    id: locId,
                    updates: pendingAudit.locationMeta.locationUpdates,
                    responsibleName: responsibleName ?? null,
                    reason: reason ?? null,
                    notes: auditNotes ?? null,
                  });
                } else {
                  const created = await createLocation.mutateAsync({
                    wineId: pendingAudit.wineId,
                    sector: pendingAudit.locationMeta.locationUpdates.sector ?? null,
                    zone: pendingAudit.locationMeta.locationUpdates.zone ?? null,
                    level: pendingAudit.locationMeta.locationUpdates.level ?? null,
                    position: pendingAudit.locationMeta.locationUpdates.position ?? null,
                    manualLabel: pendingAudit.locationMeta.locationUpdates.manual_label ?? null,
                    quantity: pendingAudit.prevQty,
                    responsibleName: responsibleName ?? null,
                    reason: reason ?? null,
                    notes: auditNotes ?? null,
                  });
                  void created;
                }
              }

              // 2) Apply stock delta with required audit metadata
              await wineEvent.mutateAsync({
                wineId: pendingAudit.wineId,
                eventType: pendingAudit.eventType,
                quantity: pendingAudit.quantityAbs,
                notes: auditNotes,
                responsibleName,
                reason,
                locationId,
              });
              setSuccess(true);
              setTimeout(() => { setSuccess(false); onOpenChange(false); }, 900);
            } catch (err: any) {
              toast({
                title: "Erro ao registrar alteração",
                description: err?.message,
                variant: "destructive",
              });
            }
          }}
        />

        <LocationAuditDialog
          open={locationAuditOpen}
          onOpenChange={(v) => { setLocationAuditOpen(v); if (!v) setPendingLocationOnly(null); }}
          previousLabel={pendingLocationOnly?.previousLabel ?? ""}
          newLabel={pendingLocationOnly?.newLabel ?? ""}
          requireAudit={isCommercial}
          defaultResponsibleName={typeof user?.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : undefined}
          onConfirm={async ({ responsibleName, reason, notes: auditNotes }) => {
            if (!pendingLocationOnly) return;
            try {
              const locId = pendingLocationOnly.locationId;
              if (locId) {
                await updateLocation.mutateAsync({
                  id: locId,
                  updates: pendingLocationOnly.locationUpdates,
                  responsibleName: responsibleName ?? null,
                  reason: reason ?? null,
                  notes: auditNotes ?? null,
                });
              } else {
                await createLocation.mutateAsync({
                  wineId: pendingLocationOnly.wineId,
                  sector: pendingLocationOnly.locationUpdates.sector ?? null,
                  zone: pendingLocationOnly.locationUpdates.zone ?? null,
                  level: pendingLocationOnly.locationUpdates.level ?? null,
                  position: pendingLocationOnly.locationUpdates.position ?? null,
                  manualLabel: pendingLocationOnly.locationUpdates.manual_label ?? null,
                  quantity: wine?.quantity ?? 0,
                  responsibleName: responsibleName ?? null,
                  reason: reason ?? null,
                  notes: auditNotes ?? null,
                });
              }

              await updateWine.mutateAsync({
                id: pendingLocationOnly.wineId,
                updates: { cellar_location: pendingLocationOnly.newLabel || null },
              });

              setSuccess(true);
              setTimeout(() => { setSuccess(false); onOpenChange(false); }, 900);
            } catch (err: any) {
              toast({ title: "Erro ao atualizar localização", description: err?.message, variant: "destructive" });
            }
          }}
        />

        {wine && isCommercial ? (
          <>
            <TransferLocationDialog
              open={transferOpen}
              onOpenChange={setTransferOpen}
              wineId={wine.id}
              wineName={wine.name}
              locations={(locations ?? []).filter((l) => l.wine_id === wine.id)}
            />
            <CreateLocationDialog
              open={createLocOpen}
              onOpenChange={setCreateLocOpen}
              wineId={wine.id}
              wineName={wine.name}
            />
          </>
        ) : null}

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full gradient-wine flex items-center justify-center glow-wine">
                <Check className="h-7 w-7 text-primary-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Vinho atualizado!</p>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div>
                <Label className="text-xs text-muted-foreground">Nome *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Produtor</Label>
                <Input value={producer} onChange={e => setProducer(e.target.value)} />
              </div>
              <div className={isCommercial ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"}>
                <div>
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                  {isCommercial ? (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Ao salvar com quantidade diferente, você registrará responsável e motivo no log.
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Safra</Label>
                  <Input type="number" value={vintage} onChange={e => setVintage(e.target.value)} />
                </div>
                {!isCommercial && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Nota</Label>
                    <Input type="number" step="0.1" min="0" max="100" value={rating} onChange={e => setRating(e.target.value)} />
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Estilo</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {styles.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">País</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Região</Label>
                  <Input value={region} onChange={e => setRegion(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Uva</Label>
                <Input value={grape} onChange={e => setGrape(e.target.value)} />
              </div>
              {isCommercial ? (
                <div className="surface-clarity p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Precificação comercial</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Atualize custo e venda com leitura clara para operação.
                      </p>
                    </div>
                    {commercialMarginPct != null ? (
                      <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${commercialMargin != null && commercialMargin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        Margem {commercialMargin != null && commercialMargin >= 0 ? "+" : ""}{commercialMarginPct.toFixed(0)}%
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Preço de custo (R$)</Label>
                      <Input type="number" step="0.01" min="0" value={lastPaid} onChange={e => setLastPaid(e.target.value)} placeholder="0,00" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Preço de venda (R$)</Label>
                      <div className="relative">
                        <Input type="number" step="0.01" min="0" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0,00" />
                        {currentValue ? null : (
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60">Estimado pela Sommelyx</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Último valor pago (opcional)</Label>
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={purchasePriceUnknown}
                        onChange={(e) => {
                          setPurchasePriceUnknown(e.target.checked);
                          if (e.target.checked) {
                            setLastPaid("");
                            setLastPaidDate("");
                          }
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <span>Não fui eu que comprei / não sei o valor</span>
                    </label>
                    {lastPaidSnapshot && !purchasePriceUnknown && (
                      <p className="mt-1 mb-2 text-[11px] text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                        Último registro:{" "}
                        <span className="font-semibold text-foreground">
                          R$ {Number(lastPaidSnapshot).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        {lastPaidDateSnapshot && (
                          <span className="text-muted-foreground"> em {new Date(lastPaidDateSnapshot + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                        )}
                      </p>
                    )}
                    {!purchasePriceUnknown && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" step="0.01" min="0" value={lastPaid} onChange={e => setLastPaid(e.target.value)} placeholder="0.00" />
                          <Input type="date" value={lastPaidDate} onChange={e => setLastPaidDate(e.target.value)} />
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                          Se não souber o valor, marque a opção acima e seguimos com a estimativa de mercado.
                        </p>
                      </>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor médio estimado (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0.00" />
                    <p className="mt-1 text-[10px] text-muted-foreground/80">
                      Estimativa automática de mercado, editável a qualquer momento.
                    </p>
                  </div>
                </div>
              )}
              <div>
                <LocationFields
                  value={location}
                  onChange={setLocation}
                  label={isCommercial ? "Localização (principal)" : "Localização na adega"}
                />
                {isCommercial ? (
                  <div className="mt-3 surface-clarity p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Localizações</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Quantidade por ponto físico. Use transferência para mover entre locais.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="h-9 rounded-2xl text-[11px] font-bold" onClick={() => setCreateLocOpen(true)}>
                          Adicionar
                        </Button>
                        <Button type="button" variant="primary" className="h-9 rounded-2xl text-[11px] font-bold" onClick={() => setTransferOpen(true)}>
                          Transferir
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(locations ?? []).filter((l) => l.wine_id === wine?.id).map((l) => (
                        <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2 ring-1 ring-black/[0.05]">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-foreground truncate">
                              {l.formatted_label ?? l.manual_label ?? "Sem localização"}
                            </p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {[
                                l.sector ? `Setor: ${l.sector}` : null,
                                l.zone ? `Gôndola: ${l.zone}` : null,
                                l.level ? `Linha: ${l.level}` : null,
                              ].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[13px] font-black text-foreground">{l.quantity}</p>
                            <p className="text-[9px] text-muted-foreground">un.</p>
                          </div>
                        </div>
                      ))}
                      {(locations ?? []).filter((l) => l.wine_id === wine?.id).length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">Nenhuma localização cadastrada ainda.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              {!isCommercial && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Beber de</Label>
                    <Input type="number" value={drinkFrom} onChange={e => setDrinkFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Beber até</Label>
                    <Input type="number" value={drinkUntil} onChange={e => setDrinkUntil(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Harmonização</Label>
                <Input value={foodPairing} onChange={e => setFoodPairing(e.target.value)} />
              </div>
              {!isCommercial && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notas de degustação</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                </div>
              )}
              <Button variant="primary" type="submit" disabled={!name.trim()} loading={updateWine.isPending} loadingText="Salvando…" className="w-full h-11 text-[13px] font-medium">
                <Save className="h-4 w-4 mr-1.5" />
                {updateWine.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
