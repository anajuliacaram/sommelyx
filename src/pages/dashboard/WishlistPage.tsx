import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, Trash2, ExternalLink, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

interface WishlistItem {
  id: string;
  name: string;
  producer: string;
  region: string;
  notes: string;
  addedAt: string;
}

const STORAGE_KEY = "sommelyx_wishlist";

function loadWishlist(): WishlistItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveWishlist(items: WishlistItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>(loadWishlist);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [producer, setProducer] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || i.producer.toLowerCase().includes(q));
  }, [items, search]);

  const handleAdd = () => {
    if (!name.trim()) return;
    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      producer: producer.trim(),
      region: region.trim(),
      notes: notes.trim(),
      addedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...items];
    setItems(updated);
    saveWishlist(updated);
    setName(""); setProducer(""); setRegion(""); setNotes("");
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveWishlist(updated);
  };

  return (
    <div className="space-y-4 max-w-[900px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Wishlist</h1>
          <p className="text-[11px] text-muted-foreground">Vinhos que você quer experimentar ou adquirir</p>
        </div>
        <Button variant="premium" size="sm" className="h-8 px-3 text-[11px] font-bold" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </motion.div>

      {showForm && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="glass-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Nome do vinho *" value={name} onChange={e => setName(e.target.value)} className="h-9 text-[12px]" />
            <Input placeholder="Produtor" value={producer} onChange={e => setProducer(e.target.value)} className="h-9 text-[12px]" />
            <Input placeholder="Região / País" value={region} onChange={e => setRegion(e.target.value)} className="h-9 text-[12px]" />
            <Input placeholder="Notas" value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-[12px]" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-[11px]" onClick={handleAdd} disabled={!name.trim()}>Salvar</Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </motion.div>
      )}

      {items.length > 0 && (
        <Input placeholder="Buscar na wishlist…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 text-[12px] max-w-xs" />
      )}

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              className="glass-card p-3 flex items-center gap-3 group"
              initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(143,45,86,0.06)" }}>
                <Heart className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate text-foreground">{item.name}</p>
                <p className="text-[9px] text-muted-foreground">
                  {[item.producer, item.region].filter(Boolean).join(" · ") || "Sem detalhes"}
                  {item.notes && ` — ${item.notes}`}
                </p>
              </div>
              <span className="text-[9px] text-muted-foreground hidden sm:block">
                {new Date(item.addedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
              <Button
                size="sm" variant="ghost"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => handleRemove(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <PremiumEmptyState
          icon={Heart}
          title="Sua lista de desejos"
          description="Adicione vinhos que você quer experimentar ou adquirir. Organize sua próxima compra."
          primaryAction={{ label: "Adicionar primeiro", onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <p className="text-[12px] text-muted-foreground text-center py-8">Nenhum resultado para "{search}"</p>
      )}
    </div>
  );
}
