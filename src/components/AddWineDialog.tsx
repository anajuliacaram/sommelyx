import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Check, Camera, Upload, Sparkles } from "@/icons/lucide";
import { useAddWine } from "@/hooks/useWines";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ScanWineLabelDialog } from "@/components/ScanWineLabelDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { LocationFields } from "@/components/LocationFields";
import { formatLocationLabel, type StructuredLocation } from "@/lib/location";
import { useCreateWineLocation } from "@/hooks/useWineLocations";

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
  const [currentValue, setCurrentValue] = useState("");
  const [location, setLocation] = useState<StructuredLocation>({});
  const [drinkFrom, setDrinkFrom] = useState("");
  const [drinkUntil, setDrinkUntil] = useState("");
  const [foodPairing, setFoodPairing] = useState("");
  const [notes, setNotes] = useState("");
  const [labelImagePreview, setLabelImagePreview] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [importCsvOpen, setImportCsvOpen] = useState(false);

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

  const reset = () => {
    setName(""); setProducer(""); setQuantity("1"); setVintage(""); setStyle("");
    setCountry(""); setRegion(""); setGrape(""); setLastPaid(""); setLastPaidDate(new Date().toISOString().split("T")[0]); setCurrentValue(""); setLocation({});
    setDrinkFrom(""); setDrinkUntil(""); setFoodPairing(""); setNotes("");
    setLabelImagePreview(null);
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
    if (data.current_value) setCurrentValue(String(data.current_value));
    if (data.cellar_location) setLocation({ manualLabel: String(data.cellar_location) });
    if (data.labelImagePreview) setLabelImagePreview(String(data.labelImagePreview));

    const inferredDrinkWindow = (!data.drink_from || !data.drink_until)
      ? suggestDrinkWindow(data)
      : null;

    if (!data.purchase_price && !isCommercial && !lastPaid) {
      setLastPaid(String(suggestPurchasePrice(data)));
    }

    if (!data.drink_from && inferredDrinkWindow && !drinkFrom) {
      setDrinkFrom(String(inferredDrinkWindow.from));
    }

    if (!data.drink_until && inferredDrinkWindow && !drinkUntil) {
      setDrinkUntil(String(inferredDrinkWindow.until));
    }

    if (
      data.country || data.region || data.grape || data.food_pairing || data.tasting_notes ||
      data.drink_from || data.drink_until || inferredDrinkWindow || (!isCommercial && !data.purchase_price)
    ) {
      setMoreOpen(true);
    }
    toast({ title: isCommercial ? "Dados do produto preenchidos!" : "🍷 Dados do rótulo preenchidos!" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
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
        image_url: null,
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
      if (!lastPaid) missing.push("último valor pago");
      if (!drinkFrom && !drinkUntil) missing.push("prazo para beber");
      if (!currentValue) missing.push("valor atual");
      setMissingFields(missing);

      setSuccess(true);
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 1200);
    } catch (err: any) {
      console.error("Wine save error:", err);
      toast({ title: isCommercial ? "Erro ao cadastrar produto" : "Erro ao adicionar vinho", description: err?.message || "Tente novamente", variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 border-l border-[#E5E2DC] shadow-[0_0_40px_-10px_rgba(0,0,0,0.12)]" style={{ backgroundColor: '#F4F1EC' }}>

          <div className="px-6 pt-6 pb-8 h-full flex flex-col">
            <SheetHeader className="mb-7">
              <SheetTitle className="font-serif text-[28px] font-semibold tracking-[-0.01em]" style={{ color: '#1F1F1F' }}>
                {isCommercial ? "Cadastrar produto" : "Adicionar vinho"}
              </SheetTitle>
            </SheetHeader>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-4"
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
                      <p className="text-[14px] font-semibold" style={{ color: '#1F1F1F' }}>Escanear rótulo</p>
                      <p className="text-[12px] mt-0.5" style={{ color: '#6B6B6B' }}>Extração instantânea dos dados do rótulo</p>
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
                      <Upload className="h-4 w-4" style={{ color: '#C8A96A' }} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[13px] font-semibold" style={{ color: '#1F1F1F' }}>Importar arquivo</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#6B6B6B' }}>Leitura inteligente do Sommelyx</p>
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
                        <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Último valor pago (R$)</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <input type="number" step="0.01" min="0" value={lastPaid} onChange={e => setLastPaid(e.target.value)} placeholder="0.00" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                          <input type="date" value={lastPaidDate} onChange={e => setLastPaidDate(e.target.value)} className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                        </div>
                        <p className="mt-1.5 text-[12px]" style={{ color: '#6B6B6B' }}>
                          Quanto e quando você pagou por último.
                        </p>
                      </div>
                      <div>
                        <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Valor atual (R$)</label>
                        <input type="number" step="0.01" min="0" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0.00" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                        <p className="mt-1.5 text-[12px]" style={{ color: '#6B6B6B' }}>
                          Referência de valor de mercado atual.
                        </p>
                      </div>
                      <div>
                        <LocationFields
                          value={location}
                          onChange={setLocation}
                          label="Localização na adega"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Beber a partir de</label>
                          <input type="number" value={drinkFrom} onChange={e => setDrinkFrom(e.target.value)} placeholder="2024" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
                        </div>
                        <div>
                          <label className="block text-[14px] font-medium mb-1.5" style={{ color: '#4A4A4A' }}>Beber até</label>
                          <input type="number" value={drinkUntil} onChange={e => setDrinkUntil(e.target.value)} placeholder="2030" className="w-full h-12 px-4 text-[16px] rounded-[14px] border bg-white outline-none transition-all duration-150 placeholder:text-[#9A9A9A] hover:border-[#D0CDC6] focus:border-[#6F7F5B] focus:shadow-[0_0_0_2px_rgba(111,127,91,0.15)]" style={{ color: '#1F1F1F', borderColor: '#E5E2DC' }} />
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

                  <button
                    type="submit"
                    disabled={addWine.isPending || !name.trim()}
                    className="w-full h-[52px] rounded-[14px] text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-150 hover:brightness-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#6F7F5B' }}
                  >
                    <Plus className="h-4 w-4" />
                    {addWine.isPending ? "Salvando..." : isCommercial ? "Cadastrar produto" : "Salvar vinho"}
                  </button>

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
