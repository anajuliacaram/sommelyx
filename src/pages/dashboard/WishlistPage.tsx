import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Heart, Loader2, Plus, Search, Sparkles, Trash2, Upload, Wine, X } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { WineLabelPreview } from "@/components/WineLabelPreview";
import { useAddWishlist, useDeleteWishlist, useWishlist } from "@/hooks/useBusinessData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invokeEdgeFunction } from "@/lib/edge-invoke";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

type WishlistSuggestion = {
  wine_name: string | null;
  producer: string | null;
  vintage: number | null;
  style: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  target_price: number | null;
  ai_summary: string | null;
  notes: string | null;
  image_url: string | null;
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Tente novamente em instantes.");

export default function WishlistPage() {
  const { data: items = [], isLoading } = useWishlist();
  const addWishlist = useAddWishlist();
  const deleteWishlist = useDeleteWishlist();
  const { toast } = useToast();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [wineName, setWineName] = useState("");
  const [producer, setProducer] = useState("");
  const [vintage, setVintage] = useState("");
  const [style, setStyle] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastAiQuery, setLastAiQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) =>
      [
        item.wine_name,
        item.producer,
        item.country,
        item.region,
        item.grape,
        item.ai_summary,
        item.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [items, search]);

  const resetForm = () => {
    setWineName("");
    setProducer("");
    setVintage("");
    setStyle("");
    setCountry("");
    setRegion("");
    setGrape("");
    setTargetPrice("");
    setNotes("");
    setAiSummary("");
    setImageUrl("");
    setImagePreview(null);
    setImageFile(null);
    setIsAiLoading(false);
    setLastAiQuery("");
  };

  const applySuggestion = (suggestion: WishlistSuggestion, force = false) => {
    if ((force || !wineName.trim()) && suggestion.wine_name) setWineName(suggestion.wine_name);
    if ((force || !producer.trim()) && suggestion.producer) setProducer(suggestion.producer);
    if ((force || !vintage.trim()) && suggestion.vintage) setVintage(String(suggestion.vintage));
    if ((force || !style.trim()) && suggestion.style) setStyle(suggestion.style);
    if ((force || !country.trim()) && suggestion.country) setCountry(suggestion.country);
    if ((force || !region.trim()) && suggestion.region) setRegion(suggestion.region);
    if ((force || !grape.trim()) && suggestion.grape) setGrape(suggestion.grape);
    if ((force || !targetPrice.trim()) && suggestion.target_price) setTargetPrice(String(suggestion.target_price));
    if ((force || !aiSummary.trim()) && suggestion.ai_summary) setAiSummary(suggestion.ai_summary);
    if ((force || !notes.trim()) && suggestion.notes) setNotes(suggestion.notes);
    if (!imageFile && suggestion.image_url) setImageUrl(suggestion.image_url);
  };

  const compressImage = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 1400;
          let width = img.width;
          let height = img.height;

          if (width > MAX || height > MAX) {
            if (width > height) {
              height = (height * MAX) / width;
              width = MAX;
            } else {
              width = (width * MAX) / height;
              height = MAX;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Não foi possível preparar a imagem."));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.88).split(",")[1]);
        };
        img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        img.src = String(event.target?.result ?? "");
      };
      reader.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
      reader.readAsDataURL(file);
    });
  };

  const requestAiSuggestion = async ({ query, file, force }: { query?: string; file?: File; force?: boolean }) => {
    const safeQuery = query?.trim() ?? "";

    if (!safeQuery && !file) return;

    try {
      setIsAiLoading(true);
      const imageBase64 = file ? await compressImage(file) : undefined;
      const data = await invokeEdgeFunction<any>(
        "wishlist-wine-assistant",
        { query: safeQuery || undefined, imageBase64 },
        { timeoutMs: 75_000, retries: 2 },
      );

      if (data?.error) throw new Error(String(data.error));
      if (!data?.suggestion) throw new Error("Não foi possível identificar este vinho agora.");

      applySuggestion(data.suggestion as WishlistSuggestion, !!force);
      if (safeQuery) setLastAiQuery(safeQuery);
    } catch (error) {
      toast({
        title: "Inteligência indisponível no momento",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleImageSelected = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem válida", variant: "destructive" });
      return;
    }

    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    await requestAiSuggestion({ query: wineName, file, force: true });
    toast({
      title: "Foto recebida",
      description: "Nossa inteligência analisou a imagem e preencheu os campos automaticamente.",
    });
  };

  const uploadWishlistImage = async () => {
    if (!user || !imageFile) return imageUrl || null;

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("wishlist-images").upload(path, imageFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: imageFile.type,
    });

    if (error) throw error;

    const { data } = supabase.storage.from("wishlist-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAdd = async () => {
    if (!wineName.trim()) return;

    try {
      const uploadedImageUrl = await uploadWishlistImage();
      await addWishlist.mutateAsync({
        wine_name: wineName.trim(),
        notes: notes.trim() || null,
        producer: producer.trim() || null,
        vintage: vintage ? Number(vintage) : null,
        style: style.trim() || null,
        country: country.trim() || null,
        region: region.trim() || null,
        grape: grape.trim() || null,
        target_price: targetPrice ? Number(targetPrice.replace(",", ".")) : null,
        image_url: uploadedImageUrl || imageUrl || null,
        ai_summary: aiSummary.trim() || null,
        source: imageFile ? "image" : lastAiQuery ? "ai" : "manual",
      });

      toast({
        title: "Item salvo na wishlist",
        description: "O vinho entrou na sua lista com os dados enriquecidos.",
      });
      resetForm();
      setShowForm(false);
    } catch (error) {
      toast({
        title: "Não foi possível salvar",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (id: string) => {
    await deleteWishlist.mutateAsync(id);
  };

  useEffect(() => {
    if (!showForm) return;
    const query = wineName.trim();
    if (query.length < 4 || query === lastAiQuery) return;

    const timeout = window.setTimeout(() => {
      void requestAiSuggestion({ query });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [showForm, wineName, lastAiQuery]);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando wishlist…</div>;

  return (
    <div className="space-y-7 max-w-[980px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="glass-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="t-title">Wishlist inteligente</h1>
            <p className="t-subtitle mt-1.5">
              Digite um rótulo ou anexe uma foto — o Sommelyx completa os detalhes para você.
            </p>
          </div>
          <Button variant="primary" size="sm" className="h-9 px-4 text-[11px] font-bold shrink-0" onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {showForm ? "Fechar" : "Novo item"}
          </Button>
        </div>
      </motion.div>

      {showForm && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="glass-card p-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wishlist-name" className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  O que o cliente quer encontrar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="wishlist-name"
                    placeholder="Ex: Sassicaia 2020, Dom Pérignon, Chablis Premier Cru..."
                    value={wineName}
                    onChange={(event) => setWineName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      void requestAiSuggestion({ query: wineName, force: true });
                    }}
                    className="h-11 pl-10 text-[13px]"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Conforme o cliente digita, o Sommelyx identifica rótulo, produtor, safra e contexto de compra.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-9 text-[11px] font-bold"
                    onClick={() => void requestAiSuggestion({ query: wineName, force: true })}
                    disabled={!wineName.trim() || isAiLoading}
                  >
                    {isAiLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                    Pesquisar com Sommelyx
                  </Button>
                  {lastAiQuery ? (
                    <span className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Última busca: {lastAiQuery}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Produtor</Label>
                  <Input placeholder="Ex: Tenuta San Guido" value={producer} onChange={(event) => setProducer(event.target.value)} className="h-10 text-[12px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Safra</Label>
                  <Input placeholder="2020" value={vintage} onChange={(event) => setVintage(event.target.value)} className="h-10 text-[12px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Estilo</Label>
                  <Input placeholder="Tinto, branco, espumante..." value={style} onChange={(event) => setStyle(event.target.value)} className="h-10 text-[12px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Preço alvo</Label>
                  <Input placeholder="Ex: 299,90" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} className="h-10 text-[12px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">País</Label>
                  <Input placeholder="Ex: Itália" value={country} onChange={(event) => setCountry(event.target.value)} className="h-10 text-[12px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Região</Label>
                  <Input placeholder="Ex: Toscana" value={region} onChange={(event) => setRegion(event.target.value)} className="h-10 text-[12px]" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Uva ou corte</Label>
                <Input placeholder="Ex: Cabernet Sauvignon / Cabernet Franc" value={grape} onChange={(event) => setGrape(event.target.value)} className="h-10 text-[12px]" />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Observações do cliente</Label>
                <Textarea
                  placeholder="Ex: presente para aniversário, jantar especial, cliente quer comparar com Bordeaux..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-[88px] text-[12px]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/30 bg-white/70 p-4 shadow-[0_12px_36px_-24px_rgba(45,20,31,0.4)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C2044]">Assistente Sommelyx</p>
                    <h3 className="mt-1 text-[18px] font-black tracking-[-0.03em] text-foreground">Preenchimento inteligente</h3>
                  </div>
                  {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#8C2044]" /> : <Sparkles className="h-4 w-4 text-[#8C2044]" />}
                </div>

                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                  O Sommelyx ajusta os textos, sugere contexto de venda e busca uma imagem de referência do vinho automaticamente.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" className="h-10 text-[11px] font-bold" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Anexar foto
                  </Button>
                  <Button type="button" variant="outline" className="h-10 text-[11px] font-bold" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5 mr-1.5" />
                    Tirar foto
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImageSelected(file);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImageSelected(file);
                  }}
                />
              </div>

              {(imagePreview || imageUrl) && (
                <div className="relative overflow-hidden rounded-[24px] border border-border/60 bg-card/80">
                  <img
                    src={imagePreview || imageUrl}
                    alt={wineName || "Preview do vinho"}
                    className="h-56 w-full object-cover"
                  />
                  {imagePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-3 h-8 w-8 rounded-full bg-foreground/70 text-background hover:bg-foreground/85"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      aria-label="Remover imagem"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              <div className="rounded-[24px] border border-border/60 bg-card/80 p-4">
                <div className="flex items-center gap-2">
                  <Wine className="h-4 w-4 text-primary" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Texto sugerido pelo Sommelyx</p>
                </div>
                <Textarea
                  placeholder="O Sommelyx vai sugerir um texto elegante para apoiar a venda ou a recomendação do vinho."
                  value={aiSummary}
                  onChange={(event) => setAiSummary(event.target.value)}
                  className="mt-3 min-h-[120px] text-[12px]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="h-9 text-[11px] font-bold" onClick={handleAdd} disabled={!wineName.trim() || addWishlist.isPending}>
              {addWishlist.isPending ? "Salvando..." : "Salvar na wishlist"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 text-[11px]"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" size="sm" variant="secondary" className="h-9 text-[11px] font-bold" onClick={() => void requestAiSuggestion({ query: wineName, force: true })} disabled={!wineName.trim() || isAiLoading}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Pesquisar com Sommelyx
            </Button>
          </div>
        </motion.div>
      )}

      {items.length > 0 && (
        <Input
          placeholder="Buscar por vinho, produtor, região ou observação..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 text-[12px] max-w-md"
        />
      )}

      {filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((item, index) => (
            <motion.div key={item.id} className="glass-card p-3 sm:p-4 flex gap-3 group" initial="hidden" animate="visible" variants={fadeUp} custom={index + 2}>
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[20px] border border-border/50 bg-primary/5">
                <WineLabelPreview
                  wine={{
                    name: item.wine_name,
                    style: item.style,
                    image_url: item.image_url,
                  }}
                  alt={item.wine_name}
                  compact
                  className="h-full w-full rounded-[20px]"
                  imageClassName="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-foreground">{item.wine_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[item.producer, item.vintage, item.region || item.country].filter(Boolean).join(" · ") || "Item salvo manualmente"}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                </div>

                {(item.ai_summary || item.notes) && (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {item.ai_summary || item.notes}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[item.style, item.country, item.grape].filter(Boolean).map((value) => (
                    <span key={`${item.id}-${value}`} className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold capitalize text-primary">
                      {value}
                    </span>
                  ))}
                  {item.target_price ? (
                    <span className="rounded-full border border-[#C9A86A]/20 bg-[#C9A86A]/10 px-2.5 py-1 text-[10px] font-semibold text-[#9A6A17]">
                      Meta R$ {item.target_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                    {item.source === "image" ? "Foto do cliente" : item.source === "ai" ? "Assistido por Sommelyx" : "Manual"}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 md:h-8 md:w-8 shrink-0 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => void handleRemove(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <PremiumEmptyState
          icon={Heart}
          title="Wishlist inteligente"
          description="Adicione um vinho digitando o nome ou anexando a foto. O Sommelyx ajuda a completar os dados e organizar cada interesse do cliente."
          primaryAction={{ label: "Criar primeiro item", onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <p className="text-[12px] text-muted-foreground text-center py-8">Nenhum resultado para "{search}"</p>
      )}
    </div>
  );
}
