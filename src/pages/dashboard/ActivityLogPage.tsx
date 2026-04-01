import { useMemo } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Plus, Wine, ArrowDownRight, AlertTriangle, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWines } from "@/hooks/useWines";
import { useSearchParams } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 8 } as const,
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
} as const;

function useWineEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wine_events", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("wine_events")
        .select("id,user_id,wine_id,event_type,quantity,notes,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

const eventConfig: Record<string, { label: string; icon: typeof Plus; color: string; bg: string }> = {
  add: { label: "Adição de estoque", icon: Plus, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  open: { label: "Garrafa aberta", icon: Wine, color: "#8F2D56", bg: "rgba(143,45,86,0.06)" },
  exit: { label: "Saída / Venda", icon: ArrowDownRight, color: "#C9A86A", bg: "rgba(201,168,106,0.1)" },
};

function getEventMeta(notes: string | null) {
  if (notes?.startsWith("[RUPTURA")) return { type: "ruptura" as const, label: "Ruptura", icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.08)" };
  if (notes?.startsWith("[VENDA]")) return { type: "venda" as const, label: "Venda", icon: ShoppingCart, color: "#C9A86A", bg: "rgba(201,168,106,0.1)" };
  return null;
}

export default function ActivityLogPage() {
  const { data: events, isLoading } = useWineEvents();
  const { data: wines } = useWines();
  const [searchParams] = useSearchParams();
  const wineFilterId = searchParams.get("wine");

  const wineMap = useMemo(() => {
    const map = new Map<string, string>();
    wines?.forEach(w => map.set(w.id, w.name));
    return map;
  }, [wines]);

  // Group by date
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!wineFilterId) return events;
    return events.filter((ev) => ev.wine_id === wineFilterId);
  }, [events, wineFilterId]);

  const grouped = useMemo(() => {
    if (!filteredEvents.length) return [];
    const map = new Map<string, typeof filteredEvents>();
    filteredEvents.forEach(ev => {
      const d = new Date(ev.created_at);
      const key = d.toISOString().split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });

    return Array.from(map.entries()).map(([dateKey, items]) => {
      const d = new Date(dateKey + "T12:00:00");
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      let label: string;
      if (isToday) label = "Hoje";
      else if (isYesterday) label = "Ontem";
      else label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

      return { dateKey, label: label.charAt(0).toUpperCase() + label.slice(1), items };
    });
  }, [filteredEvents]);

  if (isLoading) return <div className="text-muted-foreground text-sm p-8">Carregando…</div>;

  return (
    <div className="space-y-4 max-w-[1000px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">Log de Atividades</h1>
        <p className="text-[11px] text-muted-foreground">Registro de todas as movimentações</p>
      </motion.div>

      {(!filteredEvents || filteredEvents.length === 0) ? (
        <div className="glass-card p-8 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-[12px] text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group, gi) => (
            <motion.div key={group.dateKey} initial="hidden" animate="visible" variants={fadeUp} custom={gi + 1}>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{group.label}</p>
              <div className="space-y-1">
                {group.items.map(ev => {
                  const meta = getEventMeta(ev.notes);
                  const cfg = meta
                    ? { label: meta.label, icon: meta.icon, color: meta.color, bg: meta.bg }
                    : eventConfig[ev.event_type] ?? eventConfig.exit;
                  const Icon = cfg.icon;
                  const wineName = wineMap.get(ev.wine_id) ?? "Vinho removido";
                  const time = new Date(ev.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                  // Clean notes for display
                  let displayNotes = ev.notes || "";
                  if (displayNotes.startsWith("[RUPTURA")) {
                    displayNotes = displayNotes.replace(/^\[RUPTURA [^\]]*\]\s*/, "");
                  } else if (displayNotes.startsWith("[VENDA]")) {
                    displayNotes = displayNotes.replace(/^\[VENDA\]\s*/, "");
                  }

                  return (
                    <div key={ev.id} className="glass-card p-3 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-[9px] text-muted-foreground">· {time}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-foreground truncate">{wineName}</p>
                        {displayNotes && <p className="text-[9px] text-muted-foreground truncate mt-0.5">{displayNotes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[12px] font-black text-foreground">{ev.event_type === "add" ? "+" : "−"}{ev.quantity}</span>
                        <p className="text-[8px] text-muted-foreground">un.</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
