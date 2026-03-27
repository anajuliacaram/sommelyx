import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { useAddWishlist, useDeleteWishlist, useWishlist } from "@/hooks/useBusinessData";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

export default function WishlistPage() {
  const { data: items = [], isLoading } = useWishlist();
  const addWishlist = useAddWishlist();
  const deleteWishlist = useDeleteWishlist();

  const [showForm, setShowForm] = useState(false);
  const [wineName, setWineName] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.wine_name.toLowerCase().includes(q) || (i.notes ?? "").toLowerCase().includes(q));
  }, [items, search]);

  const handleAdd = async () => {
    if (!wineName.trim()) return;
    await addWishlist.mutateAsync({ wine_name: wineName.trim(), notes: notes.trim() });
    setWineName("");
    setNotes("");
    setShowForm(false);
  };

  const handleRemove = async (id: string) => {
    await deleteWishlist.mutateAsync(id);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando wishlist…</div>;

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
            <Input placeholder="Nome do vinho *" value={wineName} onChange={(e) => setWineName(e.target.value)} className="h-9 text-[12px]" />
            <Input placeholder="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-9 text-[12px]" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-[11px]" onClick={handleAdd} disabled={!wineName.trim() || addWishlist.isPending}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </motion.div>
      )}

      {items.length > 0 && <Input placeholder="Buscar na wishlist…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 text-[12px] max-w-xs" />}

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((item, i) => (
            <motion.div key={item.id} className="glass-card p-3 flex items-center gap-3 group" initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                <Heart className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold truncate text-foreground">{item.wine_name}</p>
                <p className="text-[9px] text-muted-foreground">{item.notes || "Sem notas"}</p>
              </div>
              <span className="text-[9px] text-muted-foreground hidden sm:block">{new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
              <Button
                size="sm"
                variant="ghost"
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
          description="Adicione vinhos que você quer experimentar ou adquirir."
          primaryAction={{ label: "Adicionar primeiro", onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <p className="text-[12px] text-muted-foreground text-center py-8">Nenhum resultado para "{search}"</p>
      )}
    </div>
  );
}
