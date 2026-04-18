import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2 } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { useAddContact, useContacts, useDeleteContact } from "@/hooks/useBusinessData";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

const TYPE_COLORS = {
  cliente: { bg: "bg-success/10", text: "text-success" },
  fornecedor: { bg: "bg-accent/15", text: "text-accent" },
};

export default function RegistersPage() {
  const { data: contacts = [], isLoading } = useContacts();
  const addContact = useAddContact();
  const deleteContact = useDeleteContact();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"cliente" | "fornecedor">("cliente");
  const [contactInfo, setContactInfo] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q) || (c.contact_info ?? "").toLowerCase().includes(q));
  }, [contacts, search]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addContact.mutateAsync({ name: name.trim(), type, contact_info: contactInfo.trim() });
    setName("");
    setContactInfo("");
    setShowForm(false);
  };

  const handleRemove = async (id: string) => {
    await deleteContact.mutateAsync(id);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando cadastros…</div>;

  return (
    <div className="space-y-4 max-w-[900px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="t-title">Cadastros</h1>
            <p className="t-subtitle mt-1.5">Clientes e fornecedores da sua operação</p>
          </div>
          <Button variant="primary" size="sm" className="h-8 px-3 text-[11px] font-bold shrink-0" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3 w-3 mr-1" /> Novo cadastro
          </Button>
        </div>
      </motion.div>

      {showForm && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="glass-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Nome *" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-[12px]" />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "cliente" | "fornecedor")}
              className="h-9 rounded-xl border border-border/60 bg-background px-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="cliente">Cliente</option>
              <option value="fornecedor">Fornecedor</option>
            </select>
          </div>
          <Input placeholder="Contato (email / telefone / observação)" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className="h-9 text-[12px]" />
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-[11px]" onClick={handleAdd} disabled={!name.trim() || addContact.isPending}>
              Salvar
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </motion.div>
      )}

      {contacts.length > 0 && (
        <Input
          placeholder="Buscar cadastro…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-[12px] w-full sm:max-w-xs"
        />
      )}

      {filtered.length > 0 ? (
        <div className="space-y-1.5">
          {filtered.map((c, i) => (
            <motion.div key={c.id} className="glass-card p-3 flex items-center gap-3 group" initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[c.type].bg}`}>
                <Users className={`h-3.5 w-3.5 ${TYPE_COLORS[c.type].text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold truncate text-foreground">{c.name}</p>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${TYPE_COLORS[c.type].bg} ${TYPE_COLORS[c.type].text}`}>{c.type}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">{c.contact_info || "Sem contato"}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 md:h-7 md:w-7 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => handleRemove(c.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <PremiumEmptyState
          icon={Users}
          title="Base de cadastros"
          description="Organize seus clientes e fornecedores em um só lugar."
          primaryAction={{ label: "Novo cadastro", onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <p className="text-[12px] text-muted-foreground text-center py-8">Nenhum resultado para "{search}"</p>
      )}
    </div>
  );
}
