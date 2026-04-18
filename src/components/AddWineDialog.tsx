import { useState, useEffect, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Check, Camera, FileSpreadsheet, Sparkles, Wine } from "@/icons/lucide";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScanWineLabelDialog } from "@/components/ScanWineLabelDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { LocationFields } from "@/components/LocationFields";
import { formatLocationLabel, type StructuredLocation } from "@/lib/location";
import { useCreateWineLocation } from "@/hooks/useWineLocations";
import { supabase } from "@/integrations/supabase/client";

interface AddWineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScan?: boolean;
}

const styles = [
  { value: "tinto", label: "Tinto" },
  { value: "branco", label: "Branco" },
  { value: "rose", label: "Rosé" },
  { value: "espumante", label: "Espumante" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "fortificado", label: "Fortificado" },
];

type ScanSuggestionInput = {
  name?: string | null;
  producer?: string | null;
  vintage?: number | null;
  style?: string | null;
  country?: string | null;
  region?: string | null;
  grape?: string | null;
  drink_from?: number | null;
  drink_until?: number | null;
  purchase_price?: number | null;
  labelImagePreview?: string | null;
  labelImageFile?: File | null;
  labelImageBase64?: string | null;
};

function normalizeSuggestionText(value?: string | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function suggestPurchasePrice(input: ScanSuggestionInput) {
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

function suggestDrinkWindow(input: ScanSuggestionInput) {
  const style = normalizeSuggestionText(input.style);
  const grape = normalizeSuggestionText(input.grape);
  const currentYear = new Date().getFullYear();

  let startOffset = 0;
  let span = 5;

  if (style.includes("espum")) {
    startOffset = 0;
    span = 3;
  } else if (style.includes("branc") || style.includes("rose")) {
    startOffset = 0;
    span = 4;
  } else if (style.includes("sobrem") || style.includes("fort")) {
    startOffset = 0;
    span = 10;
  } else if (style.includes("tint")) {
    startOffset = 1;
    span = 6;
  }

  if (/nebbiolo|tannat|cabernet|sangiovese|syrah|tempranillo/i.test(grape)) {
    span += 2;
  } else if (/riesling|chardonnay|sauvignon|pinot grigio|alvarinho/i.test(grape)) {
    span = Math.max(3, span - 1);
  }

  const baseYear = typeof input.vintage === "number" ? input.vintage : currentYear;
  const from = baseYear + startOffset;
  const until = from + span;

  return {
    from,
    until,
  };
}

export function AddWineDialog({ open, onOpenChange, initialScan = false }: AddWineDialogProps) {
  const { user, profileType } = useAuth();
  const isCommercial = profileType === "commercial";

  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [vintage, setVintage] = useState("");
  const [style, setStyle] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [lastPaid, setLastPaid] = useState("");
  const [lastPaidDate, setLastPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [noPriceInfo, setNoPriceInfo] = useState(false);
  const [currentValue, setCurrentValue] = useState("");
  const [currentValueTouched, setCurrentValueTouched] = useState(false);
  const [location, setLocation] = useState<StructuredLocation>({});
  const [drinkFrom, setDrinkFrom] = useState("");
  const [drinkUntil, setDrinkUntil] = useState("");
  const [foodPairing, setFoodPairing] = useState("");
  const [notes, setNotes] = useState("");
  const [labelImagePreview, setLabelImagePreview] = useState<string | null>(null);
  const [labelImageFile, setLabelImageFile] = useState<File | null>(null);
  const [labelImageBase64, setLabelImageBase64] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimateConfidence, setEstimateConfidence] = useState<string | null>(null);
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addWine = useAddWine();
  const createLocation = useCreateWineLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (open && initialScan) {
      setScanOpen(true);
    }
  }, [open, initialScan]);

  useEffect(() => {
    if (open && isCommercial) setMoreOpen(true);
  }, [open, isCommercial]);

  // Debounced AI price estimation
  const fetchEstimate = useCallback(async (n: string, p: string, v: string, s: string, c: string, r: string, g: string) => {
    if (!n.trim()) return;
    setEstimating(true);
    setEstimateConfidence(null);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-wine-price", {
        body: {
          name: n.trim(),
          producer: p || null,
          vintage: v ? parseInt(v) : null,
          style: s || null,
          country: c || null,
          region: r || null,
          grape: g || null,
        },
      });
      if (!error && data?.estimated_price) {
        if (isCommercial || !currentValueTouched) {
          setCurrentValue(String(data.estimated_price));
        }
        setEstimateConfidence(data.confidence || "media");
      } else {
        // Fallback to heuristic
        const fallback = suggestPurchasePrice({ name: n, producer: p, vintage: v ? parseInt(v) : null, style: s, country: c, region: r, grape: g });
        if (isCommercial || !currentValueTouched) {
          setCurrentValue(String(fallback));
        }
        setEstimateConfidence(null);
      }
    } catch {
      const fallback = suggestPurchasePrice({ name: n, producer: p, vintage: v ? parseInt(v) : null, style: s, country: c, region: r, grape: g });
      if (isCommercial || !currentValueTouched) {
        setCurrentValue(String(fallback));
      }
      setEstimateConfidence(null);
    } finally {
      setEstimating(false);
    }
  }, [currentValueTouched, isCommercial]);

  useEffect(() => {
    if (!name.trim()) return;
    if (!isCommercial && !currentValueTouched) {
      const fallback = suggestPurchasePrice({
        name,
        producer,
        vintage: vintage ? parseInt(vintage) : null,
        style,
        country,
        region,
        grape,
      });
      setCurrentValue(String(fallback));
    }
    if (estimateTimer.current) clearTimeout(estimateTimer.current);
    estimateTimer.current = setTimeout(() => {
      fetchEstimate(name, producer, vintage, style, country, region, grape);
    }, 1200);
    return () => { if (estimateTimer.current) clearTimeout(estimateTimer.current); };
  }, [name, producer, vintage, style, country, region, grape, fetchEstimate, currentValueTouched, isCommercial]);

  const reset = () => {
    setName(""); setProducer(""); setQuantity("1"); setVintage(""); setStyle("");
    setCountry(""); setRegion(""); setGrape(""); setLastPaid(""); setLastPaidDate(new Date().toISOString().split("T")[0]); setCurrentValue(""); setLocation({});
    setDrinkFrom(""); setDrinkUntil(""); setFoodPairing(""); setNotes("");
    setLabelImagePreview(null); setLabelImageFile(null); setLabelImageBase64(null); setNoPriceInfo(false);
    setEstimating(false); setEstimateConfidence(null); setCurrentValueTouched(false);
    setMissingFields([]);
    setMoreOpen(false); setSuccess(false);
  };

  const handleScanComplete = (data: any) => {
    if (data.name) setName(data.name);
    if (data.producer) setProducer(data.producer);
    if (data.vintage) setVintage(String(data.vintage));
    if (data.style) setStyle(data.style);
    if (data.country) setCountry(data.country);
    if (data.region) setRegion(data.region);
    if (data.grape) setGrape(data.grape);
    if (data.food_pairing) setFoodPairing(data.food_pairing);
    if (data.tasting_notes) setNotes(data.tasting_notes);
    if (data.drink_from) setDrinkFrom(String(data.drink_from));
    if (data.drink_until) setDrinkUntil(String(data.drink_until));
    if (data.purchase_price) setLastPaid(String(data.purchase_price));
    if (data.current_value) {
      setCurrentValue(String(data.current_value));
      setCurrentValueTouched(false);
    } else if (!isCommercial) {
      setCurrentValue(String(suggestPurchasePrice(data)));
      setCurrentValueTouched(false);
    }
    if (data.cellar_location) setLocation({ manualLabel: String(data.cellar_location) });
    if (data.labelImagePreview) setLabelImagePreview(String(data.labelImagePreview));
    if (data.labelImageFile) setLabelImageFile(data.labelImageFile);
    if (data.labelImageBase64) setLabelImageBase64(String(data.labelImageBase64));
    if (!data.purchase_price && !isCommercial) setNoPriceInfo(true);

    // Only set drink window if AI returned them from the label
    // Do NOT use heuristic fallbacks — better to leave blank than fill wrong data

    if (
      data.country || data.region || data.grape || data.food_pairing || data.tasting_notes ||
      data.drink_from || data.drink_until
    ) {
      setMoreOpen(true);
    }
    toast({ title: isCommercial ? "Dados do produto preenchidos!" : "🍷 Dados do rótulo preenchidos!" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      let imageUrl: string | null = null;
      if (labelImageBase64 && user) {
        try {
          const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
          const response = await fetch(`data:image/jpeg;base64,${labelImageBase64}`);
          const blob = await response.blob();
          const { error } = await supabase.storage.from("wine-label-images").upload(path, blob, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          });
          if (!error) {
            const { data } = supabase.storage.from("wine-label-images").getPublicUrl(path);
            imageUrl = data.publicUrl;
          }
        } catch (uploadError) {
          console.warn("Wine label upload failed, falling back to internet image lookup:", uploadError);
        }
      } else if (labelImageFile && user) {
        try {
          const ext = labelImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
          const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from("wine-label-images").upload(path, labelImageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: labelImageFile.type,
          });
          if (!error) {
            const { data } = supabase.storage.from("wine-label-images").getPublicUrl(path);
            imageUrl = data.publicUrl;
          }
        } catch (uploadError) {
          console.warn("Wine label upload failed, falling back to internet image lookup:", uploadError);
        }
      }

      const formattedLocation = formatLocationLabel(location) || null;
      const inserted = await addWine.mutateAsync({
        name: name.trim(),
        producer: producer || null,
        quantity: parseInt(quantity) || 1,
        vintage: vintage ? parseInt(vintage) : null,
        style: style || null,
        country: country || null,
        region: region || null,
        grape: grape || null,
        purchase_price: lastPaid ? parseFloat(lastPaid) : null,
        current_value: currentValue ? parseFloat(currentValue) : null,
        cellar_location: formattedLocation,
        drink_from: drinkFrom ? parseInt(drinkFrom) : null,
        drink_until: drinkUntil ? parseInt(drinkUntil) : null,
        food_pairing: foodPairing || null,
        tasting_notes: notes || null,
        rating: null,
        image_url: imageUrl,
      });

      // Persist structured location — non-blocking so wine save succeeds even if location RPC fails
      if (inserted?.id && user) {
        try {
          const resp = typeof user.user_metadata?.full_name === "string" ? String(user.user_metadata.full_name) : null;
          await createLocation.mutateAsync({
            wineId: inserted.id,
            sector: location.sector ?? null,
            zone: location.zone ?? null,
            level: location.level ?? null,
            position: location.position ?? null,
            manualLabel: location.manualLabel ?? null,
            quantity: parseInt(quantity) || 1,
            responsibleName: isCommercial ? resp : null,
            reason: isCommercial ? "Entrada manual" : null,
            notes: null,
          });
        } catch (locErr) {
          console.warn("Location save failed (wine was saved):", locErr);
        }
      }

      // Lembrete sobre campos opcionais não preenchidos
      const missing: string[] = [];
      if (!lastPaid && !noPriceInfo) missing.push("último valor pago");
      if (!drinkFrom && !drinkUntil) missing.push("prazo para beber");
      if (!currentValue) missing.push("valor atual estimado");
      setMissingFields(missing);

      setSuccess(true);
    } catch (err: any) {
      console.error("Wine save error:", err);
      toast({ title: isCommercial ? "Erro ao cadastrar produto" : "Erro ao adicionar vinho", description: err?.message || "Tente novamente", variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 border-l border-black/5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]" style={{ backgroundColor: '#F6F3EF' }}>

          <div className="px-6 py-6 flex h-full flex-col">
            <SheetHeader className="mb-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B1E2B]/20 to-[#C8A96A]/20">
                  <Wine className="h-5 w-5 text-[#7B1E2B]" />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="font-serif text-2xl font-semibold tracking-tight" style={{ color: '#1E1E1E' }}>
                    {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
                  </SheetTitle>
                  <p className="mt-1 text-sm font-medium tracking-tight text-[#6B6B6B] leading-relaxed">
                    Complete manualmente ou use rótulo, escaneamento e CSV.
                  </p>
                </div>
              </div>
            </SheetHeader>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 gap-4"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6F7F5B' }}>
                    <Check className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-[15px] font-medium" style={{ color: '#1F1F1F' }}>
                    {isCommercial ? "Produto cadastrado!" : `${parseInt(quantity) || 1} garrafa(s) adicionada(s)!`}
                  </p>
                  {missingFields.length > 0 && (
                    <div
                      className="w-full rounded-2xl border px-4 py-3 text-left"
                      style={{ backgroundColor: 'rgba(200,169,106,0.08)', borderColor: 'rgba(200,169,106,0.18)' }}
                    >
                      <p className="text-[12px] font-semibold mb-1" style={{ color: '#7C5C17' }}>
                        Campos sugeridos para completar depois
                      </p>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#8B6B2B' }}>
                        Faltaram {missingFields.join(", ")}. O cadastro já foi salvo e você pode editar essas informações quando quiser.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 w-full pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => { reset(); onOpenChange(false); }}
                    >
                      Concluir
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      className="flex-1"
                      onClick={() => reset()}
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar outro
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit} className="space-y-5">
                  {/* Scan Label Card */}
                  <div
                    className="group cursor-pointer rounded-2xl border bg-white p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]"
                    style={{ borderColor: '#E5E2DC' }}
                    onClick={() => setScanOpen(true)}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105" style={{ backgroundColor: 'rgba(111,127,91,0.1)' }}>
                      <Camera className="h-5 w-5" style={{ color: '#6F7F5B' }} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[14px] font-semibold" style={{ color: '#1F1F1F' }}>Escanear foto do rótulo</p>
                      <p className="text-[12px] mt-0.5" style={{ color: '#6B6B6B' }}>
                        Use câmera ou fototeca para ler a garrafa
                      </p>
                    </div>
                  </div>

                  {labelImagePreview && (
                    <div className="rounded-2xl border bg-white p-3 flex items-center gap-3" style={{ borderColor: '#E5E2DC' }}>
                      <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 border" style={{ borderColor: '#EFEAE3', backgroundColor: '#F8F6F2' }}>
                        <img
                          src={labelImagePreview}
                          alt="Foto do rótulo analisado"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: '#1F1F1F' }}>Foto do rótulo analisada</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#6B6B6B' }}>
                          A imagem fica como referência visual durante o cadastro.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Import File Card */}
                  <div
                    className="group cursor-pointer rounded-2xl border bg-white p-4 flex items-center gap-3.5 transition-all duration-200 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]"
                    style={{ borderColor: '#E5E2DC' }}
                    onClick={() => setImportCsvOpen(true)}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105" style={{ backgroundColor: 'rgba(200,169,106,0.12)' }}>
                      <FileSpreadsheet className="h-4 w-4" style={{ color: '#C8A96A' }} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[13px] font-semibold" style={{ color: '#1F1F1F' }}>Importar documento / planilha</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#6B6B6B' }}>
                        CSV, PDF, Excel e outros arquivos para cadastro em lote
                      </p>
                    </div>
                  </div>

                  {/* Essential fields */}
                  <div className="space-y-4 pt-1">
                    <div>
                      <label htmlFor="name" className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>{isCommercial ? "Nome do produto *" : "Nome do vinho *"}</label>
                      <input
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: Malbec Reserva"
                        required
                        className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]"
                        style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="producer" className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Produtor</label>
                      <input
                        id="producer"
                        value={producer}
                        onChange={e => setProducer(e.target.value)}
                        placeholder="Ex: Catena Zapata"
                        className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]"
                        style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="qty" className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Quantidade</label>
                        <input
                          id="qty"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={e => setQuantity(e.target.value)}
                          className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]"
                          style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }}
                        />
                      </div>
                      <div>
                        <label htmlFor="vintage" className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Safra</label>
                        <input
                          id="vintage"
                          type="number"
                          value={vintage}
                          onChange={e => setVintage(e.target.value)}
                          placeholder="2020"
                          className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]"
                          style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Estilo</label>
                      <Select value={style} onValueChange={setStyle}>
                        <SelectTrigger className="h-12 rounded-[14px] border bg-white text-[16px] px-4 hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)] transition-all duration-150" style={{ borderColor: '#E5E2DC', color: style ? '#1F1F1F' : '#9A9A9A' }}>
                          <SelectValue placeholder="Selecionar estilo..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border bg-white shadow-lg" style={{ borderColor: '#E5E2DC' }}>
                          {styles.map(s => <SelectItem key={s.value} value={s.value} className="text-[15px]" style={{ color: '#1F1F1F' }}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Collapsible advanced fields */}
                  <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between text-[13px] font-semibold h-10 px-3 rounded-xl transition-colors duration-150 hover:bg-white/60"
                        style={{ color: '#6F7F5B' }}
                      >
                        Mais detalhes
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} style={{ color: '#6F7F5B' }} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>País</label>
                          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Argentina" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                        </div>
                        <div>
                          <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Região</label>
                          <input value={region} onChange={e => setRegion(e.target.value)} placeholder="Mendoza" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Uva</label>
                        <input value={grape} onChange={e => setGrape(e.target.value)} placeholder="Malbec" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                      </div>
                        <div>
                          <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>
                            {isCommercial ? "Último valor pago (R$)" : "Último valor pago (opcional)"}
                          </label>
                          {!isCommercial && (
                            <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={noPriceInfo}
                                onChange={e => {
                                  setNoPriceInfo(e.target.checked);
                                  if (e.target.checked) {
                                    setLastPaid("");
                                    setLastPaidDate(new Date().toISOString().split("T")[0]);
                                  }
                                }}
                                className="w-4 h-4 rounded border accent-[#6F7F5B]"
                                style={{ borderColor: '#D0CDC6' }}
                              />
                              <span className="text-[12px]" style={{ color: '#6B6B6B' }}>Não fui eu que comprei / não sei o valor</span>
                            </label>
                          )}
                          {isCommercial && (
                            <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={noPriceInfo}
                                onChange={e => {
                                  setNoPriceInfo(e.target.checked);
                                  if (e.target.checked) { setLastPaid(""); setLastPaidDate(new Date().toISOString().split("T")[0]); }
                                }}
                                className="w-4 h-4 rounded border accent-[#6F7F5B]"
                                style={{ borderColor: '#D0CDC6' }}
                              />
                              <span className="text-[12px]" style={{ color: '#6B6B6B' }}>Não sei / foi presente / sem informação de valor</span>
                            </label>
                          )}
                          {!noPriceInfo && (
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" step="0.01" min="0" value={lastPaid} onChange={e => setLastPaid(e.target.value)} placeholder="0.00" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                            <input type="date" value={lastPaidDate} onChange={e => setLastPaidDate(e.target.value)} className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                          </div>
                        )}
                        {!noPriceInfo && (
                          <p className="mt-1.5 text-[12px]" style={{ color: '#6B6B6B' }}>
                            Quanto e quando você pagou por último.
                          </p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <label className="block text-[14px] font-medium" style={{ color: '#4A4A4A' }}>
                          {isCommercial ? "Valor atual estimado (R$)" : "Valor médio estimado (R$)"}
                        </label>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: 'rgba(111,127,91,0.12)', color: '#6F7F5B' }}>
                            <Sparkles className="h-3 w-3" />
                            {estimating ? "Estimando..." : "Estimativa Sommelyx"}
                          </span>
                          {estimateConfidence && !estimating && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{
                              backgroundColor: estimateConfidence === 'alta' ? 'rgba(111,127,91,0.1)' : estimateConfidence === 'media' ? 'rgba(200,169,106,0.12)' : 'rgba(180,80,80,0.1)',
                              color: estimateConfidence === 'alta' ? '#6F7F5B' : estimateConfidence === 'media' ? '#8B6B2B' : '#9B4444',
                            }}>
                              Confiança {estimateConfidence}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input type="number" step="0.01" min="0" value={currentValue} onChange={e => { setCurrentValue(e.target.value); setCurrentValueTouched(true); }} placeholder={estimating ? "Calculando..." : "0.00"} className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC', opacity: estimating ? 0.6 : 1 }} />
                          {estimating && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-[#6F7F5B] border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 text-[12px]" style={{ color: '#6B6B6B' }}>
                          {isCommercial
                            ? "Média estimada de valor de mercado atual, calculada pela inteligência Sommelyx com base no nome do vinho, vinícola, safra, uva e região."
                            : "Média estimada de valor de mercado atual, calculada pela inteligência Sommelyx com base no nome do vinho, vinícola, safra, uva e região."}
                        </p>
                      </div>
                      <div>
                        <LocationFields
                          value={location}
                          onChange={setLocation}
                          label="Localização na adega"
                        />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium mb-1" style={{ color: '#4A4A4A' }}>Janela de consumo sugerida</p>
                        <p className="text-[11px] leading-relaxed mb-3" style={{ color: '#6B6B6B' }}>
                          Referência de melhor expressão do vinho em condições ideais de guarda. Vinhos fora dessa janela não estão necessariamente ruins — o potencial real depende do armazenamento, da safra específica e das características da uva.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>A partir de</label>
                            <input type="number" value={drinkFrom} onChange={e => setDrinkFrom(e.target.value)} placeholder="2024" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Até</label>
                            <input type="number" value={drinkUntil} onChange={e => setDrinkUntil(e.target.value)} placeholder="2030" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Harmonização</label>
                        <input value={foodPairing} onChange={e => setFoodPairing(e.target.value)} placeholder="Carnes vermelhas, queijos" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                      </div>
                      <div>
                        <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Notas de degustação</label>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Aromas, sabores, impressões..."
                          rows={3}
                          className="w-full px-4 py-3 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)] resize-none"
                          style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Button
                    type="submit"
                    disabled={addWine.isPending || !name.trim()}
                    variant="primary"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4" />
                    {addWine.isPending ? "Salvando..." : isCommercial ? "Cadastrar produto" : "Salvar vinho"}
                  </Button>

                  {missingFields.length > 0 && (
                    <div
                      className="rounded-2xl border px-4 py-3"
                      style={{ backgroundColor: 'rgba(200,169,106,0.08)', borderColor: 'rgba(200,169,106,0.18)' }}
                    >
                      <p className="text-[12px] font-semibold mb-1" style={{ color: '#7C5C17' }}>
                        Campos sugeridos para completar depois
                      </p>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#8B6B2B' }}>
                        Faltaram {missingFields.join(", ")}. O cadastro já foi salvo e você pode editar essas informações quando quiser.
                      </p>
                    </div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </SheetContent>
      </Sheet>

      <ScanWineLabelDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScanComplete={handleScanComplete}
      />
      <ImportCsvDialog open={importCsvOpen} onOpenChange={setImportCsvOpen} />
    </>
  );
}
