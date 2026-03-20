import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Trash2, Phone, Mail } from "lucide-react";
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

interface Contact {
  id: string;
  name: string;
  type: "cliente" | "fornecedor" | "produtor";
  email: string;
  phone: string;
  notes: string;
  addedAt: string;
}

const STORAGE_KEY = "sommelyx_registers";

function loadContacts(): Contact[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveContacts(items: Contact[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

const TYPE_COLORS = {
  cliente: { bg: "rgba(34,197,94,0.08)", color: "#16a34a" },
  fornecedor: { bg: "rgba(201,168,106,0.1)", color: "#C9A86A" },
  produtor: { bg: "rgba(143,45,86,0.06)", color: "#8F2D56" },
};

export default function RegistersPage() {
  const [contacts, setContacts] = useState<Contact[]>(loadContacts);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Contact["type"]>("cliente");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  const filtered = search
    ? contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const handleAdd = () => {
    if (!name.trim()) return;
    const newContact: Contact = {
      id: crypto.randomUUID(),
      name: name.trim(), type,
      email: email.trim(), phone: phone.trim(), notes: notes.trim(),
      addedAt: new Date().toISOString(),
    };
    const updated = [newContact, ...contacts];
    setContacts(updated);
    saveContacts(updated);
    setName(""); setEmail(""); setPhone(""); setNotes("");
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    saveContacts(updated);
  };

  return (
    <div className="space-y-4 max-w-[900px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Cadastros</h1>
          <p className="text-[11px] text-muted-foreground">Clientes, fornecedores e produtores</p>
        </div>
        <Button variant="premium" size="sm" className="h-8 px-3 text-[11px] font-bold" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Novo cadastro
        </Button>
      </motion.div>

      {showForm && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="glass-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Nome *" value={name} onChange={e => setName(e.target.value)} className="h-9 text-[12px]" />
            <select
              value={type} onChange={e => setType(e.target.value as Contact["type"])}
              className="h-9 rounded-xl border border-border/60 bg-background px-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="cliente">Cliente</option>
              <option value="fornecedor">Fornecedor</option>
              <option value="produtor">Produtor</option>
            </select>
            <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="h-9 text-[12px]" />
            <Input placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} className="h-9 text-[12px]" />
          </div>
          <Input placeholder="Notas" value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-[12px]" />
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-[11px]" onClick={handleAdd} disabled={!name.trim()}>Salvar</Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </motion.div>
      )}

      {contacts.length > 0 && (
        <Input placeholder="Buscar cadastro…" value={search} onChange={e => setSearch(e.target.value)} className="h-9 text-[12px] max-w-xs" />
      )}

      {filtered.length > 0 ? (
        <div className="space-y-1.5">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              className="glass-card p-3 flex items-center gap-3 group"
              initial="hidden" animate="visible" variants={fadeUp} custom={i + 2}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: TYPE_COLORS[c.type].bg }}>
                <Users className="h-3.5 w-3.5" style={{ color: TYPE_COLORS[c.type].color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold truncate text-foreground">{c.name}</p>
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{ background: TYPE_COLORS[c.type].bg, color: TYPE_COLORS[c.type].color }}>
                    {c.type}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "Sem contato"}
                </p>
              </div>
              <Button
                size="sm" variant="ghost"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
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
          description="Organize seus clientes, fornecedores e produtores em um só lugar."
          primaryAction={{ label: "Novo cadastro", onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <p className="text-[12px] text-muted-foreground text-center py-8">Nenhum resultado para "{search}"</p>
      )}
    </div>
  );
}
