import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Plus, Wine, ArrowDownRight, AlertTriangle, ShoppingCart, Filter, Search, MapPin, ArrowLeftRight } from "@/icons/lucide";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWines } from "@/hooks/useWines";
import { useWineLocationEvents } from "@/hooks/useWineLocations";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { cn } from "@/lib/utils";

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
      const { data, error } = await (supabase as any)
        .from("wine_events")
        .select("id,user_id,wine_id,event_type,quantity,notes,created_at,previous_quantity,new_quantity,quantity_delta,responsible_name,reason,profile_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; user_id: string; wine_id: string; event_type: string;
        quantity: number; notes: string | null; created_at: string;
        previous_quantity: number | null; new_quantity: number | null;
        quantity_delta: number | null; responsible_name: string | null;
        reason: string | null; profile_type: string | null;
      }>;
    },
    enabled: !!user,
  });
}

const eventConfig: Record<string, { label: string; icon: typeof Plus; color: string; bg: string; badge?: string }> = {
  stock_increase: { label: "Aumento de estoque", icon: Plus, color: "#6E1E2A", bg: "rgba(110,30,42,0.08)", badge: "Entrada" },
  stock_decrease: { label: "Redução de estoque", icon: ArrowDownRight, color: "#6E1E2A", bg: "rgba(110,30,42,0.08)", badge: "Saída" },
  stock_adjustment: { label: "Ajuste de estoque", icon: Filter, color: "#6E1E2A", bg: "rgba(110,30,42,0.08)", badge: "Ajuste" },
  stockout_registered: { label: "Ruptura registrada", icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.09)", badge: "Ruptura" },

  // Back-compat
  add: { label: "Adição de estoque", icon: Plus, color: "#6E1E2A", bg: "rgba(110,30,42,0.08)", badge: "Entrada" },
  open: { label: "Garrafa aberta", icon: Wine, color: "#8F2D56", bg: "rgba(143,45,86,0.06)", badge: "Abertura" },
  exit: { label: "Saída / Venda", icon: ShoppingCart, color: "#C9A86A", bg: "rgba(201,168,106,0.10)", badge: "Venda" },
};

const locationConfig: Record<string, { label: string; icon: typeof MapPin; color: string; bg: string; badge?: string }> = {
  created: { label: "Localização adicionada", icon: MapPin, color: "#6E1E2A", bg: "rgba(110,30,42,0.06)", badge: "Local" },
  meta_changed: { label: "Localização atualizada", icon: MapPin, color: "#6E1E2A", bg: "rgba(110,30,42,0.06)", badge: "Local" },
  transfer: { label: "Transferência na adega", icon: ArrowLeftRight, color: "#6E1E2A", bg: "rgba(110,30,42,0.06)", badge: "Transferência" },
};

export default function ActivityLogPage() {
  const { data: stockEvents, isLoading } = useWineEvents();
  const { data: locationEvents } = useWineLocationEvents();
  const { data: wines } = useWines();
  const [searchParams] = useSearchParams();
  const wineFilterId = searchParams.get("wine");
  const { profileType } = useAuth();
  const isCommercial = profileType === "commercial";

  const [q, setQ] = useState("");
  const [responsibleQ, setResponsibleQ] = useState("");
  const [reasonFilters, setReasonFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const wineMap = useMemo(() => {
    const map = new Map<string, string>();
    wines?.forEach(w => map.set(w.id, w.name));
    return map;
  }, [wines]);

  const mergedEvents = useMemo(() => {
    const s = (stockEvents ?? []).map((ev) => ({ kind: "stock" as const, ...ev }));
    const l = (locationEvents ?? []).map((ev) => ({ kind: "location" as const, ...ev }));
    return [...s, ...l].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [stockEvents, locationEvents]);

  const filteredEvents = useMemo(() => {
    if (!mergedEvents) return [];
    let list = mergedEvents;
    if (wineFilterId) list = list.filter((ev) => ev.wine_id === wineFilterId);

    const qn = q.trim().toLowerCase();
    const rn = responsibleQ.trim().toLowerCase();
    if (qn) {
      list = list.filter((ev) => (wineMap.get(ev.wine_id) ?? "").toLowerCase().includes(qn));
    }
    if (rn) {
      list = list.filter((ev) => ((ev as any).responsible_name ?? "").toLowerCase().includes(rn));
    }
    if (reasonFilters.length) {
      list = list.filter((ev) => reasonFilters.includes(((ev as any).reason ?? "")));
    }
    if (typeFilters.length) {
      list = list.filter((ev) => typeFilters.includes((ev.kind === "stock" ? (ev as any).event_type : (ev as any).action_type)));
    }
    if (fromDate) {
      const from = new Date(fromDate + "T00:00:00");
      list = list.filter((ev) => new Date(ev.created_at) >= from);
    }
    if (toDate) {
      const to = new Date(toDate + "T23:59:59");
      list = list.filter((ev) => new Date(ev.created_at) <= to);
    }
    return list;
  }, [mergedEvents, wineFilterId, q, responsibleQ, reasonFilters, typeFilters, fromDate, toDate, wineMap]);

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
    <div className="space-y-7 max-w-[1000px]">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="section-surface section-surface--full">
          <h1 className="t-title">Log de atividades</h1>
          <p className="t-subtitle mt-1.5">Registro completo de movimentações da sua adega</p>
        </div>
      </motion.div>

      {isCommercial ? (
        <div className="glass-card p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por vinho..."
                  className="h-10 pl-9 rounded-2xl"
                />
              </div>
              <div className="relative flex-1">
                <Input
                  value={responsibleQ}
                  onChange={(e) => setResponsibleQ(e.target.value)}
                  placeholder="Responsável..."
                  className="h-10 rounded-2xl"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              <MultiSelectDropdown
                title="Tipo"
                options={Array.from(new Set([
                  ...(stockEvents ?? []).map((e) => e.event_type),
                  ...(locationEvents ?? []).map((e) => e.action_type),
                ])).sort().map((v) => ({ label: eventConfig[v]?.label ?? locationConfig[v]?.label ?? v, value: v }))}
                selected={typeFilters}
                onChange={(v) => setTypeFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                onClear={() => setTypeFilters([])}
                searchPlaceholder="Buscar tipo..."
                searchable
              />
              <MultiSelectDropdown
                title="Motivo"
                options={Array.from(new Set([
                  ...(stockEvents ?? []).map((e) => e.reason).filter(Boolean) as string[],
                  ...(locationEvents ?? []).map((e) => e.reason).filter(Boolean) as string[],
                ])).sort().map((v) => ({ label: v, value: v }))}
                selected={reasonFilters}
                onChange={(v) => setReasonFilters((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])}
                onClear={() => setReasonFilters([])}
                searchPlaceholder="Buscar motivo..."
                searchable
              />
              <div className="flex items-center gap-2">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 rounded-xl" />
                <span className="text-[11px] text-muted-foreground">até</span>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                  const cfg =
                    ev.kind === "location"
                      ? (locationConfig[(ev as any).action_type] ?? locationConfig.meta_changed)
                      : (eventConfig[(ev as any).event_type] ?? eventConfig.exit);
                  const Icon = cfg.icon;
                  const wineName = wineMap.get(ev.wine_id) ?? "Vinho removido";
                  const time = new Date(ev.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                  const displayNotes = (ev as any).notes || "";
                  const responsible = (ev as any).responsible_name as string | null;
                  const reason = (ev as any).reason as string | null;

                  const prevQty = (ev as any).previous_quantity as number | null;
                  const nextQty = (ev as any).new_quantity as number | null;
                  const deltaQty = (ev as any).quantity_delta as number | null;

                  const prevLoc = (ev as any).previous_label as string | null;
                  const nextLoc = (ev as any).new_label as string | null;
                  const moved = (ev as any).quantity_moved as number | null;

                  return (
                    <div key={ev.id} className="glass-card p-3 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                          {cfg.badge ? (
                            <span className={cn("ml-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ring-1", (ev as any).event_type === "stockout_registered" ? "bg-destructive/10 text-destructive ring-destructive/20" : "bg-[#6E1E2A]/8 text-[#6E1E2A] ring-[#6E1E2A]/14")}>
                              {cfg.badge}
                            </span>
                          ) : null}
                          <span className="text-[9px] text-muted-foreground">· {time}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-foreground truncate">{wineName}</p>
                        {ev.kind === "stock" && isCommercial && prevQty != null && nextQty != null ? (
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                            <span>De: <span className="font-semibold text-foreground">{prevQty}</span></span>
                            <span>Para: <span className="font-semibold text-foreground">{nextQty}</span></span>
                            {deltaQty != null ? (
                              <span>Variação: <span className="font-semibold text-foreground">{deltaQty > 0 ? `+${deltaQty}` : `${deltaQty}`}</span></span>
                            ) : null}
                          </div>
                        ) : null}
                        {ev.kind === "location" ? (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {prevLoc ? <>De: <span className="font-semibold text-foreground">{prevLoc}</span></> : null}
                            {prevLoc && nextLoc ? <span className="text-muted-foreground"> · </span> : null}
                            {nextLoc ? <>Para: <span className="font-semibold text-foreground">{nextLoc}</span></> : null}
                            {moved != null ? <span className="text-muted-foreground"> · </span> : null}
                            {moved != null ? <>Qtd: <span className="font-semibold text-foreground">{moved}</span></> : null}
                          </div>
                        ) : null}
                        {isCommercial && (responsible || reason) ? (
                          <p className="mt-1 text-[10px] text-muted-foreground truncate">
                            {responsible ? <>Responsável: <span className="font-semibold text-foreground">{responsible}</span></> : null}
                            {responsible && reason ? <span className="text-muted-foreground"> · </span> : null}
                            {reason ? <>Motivo: <span className="font-semibold text-foreground">{reason}</span></> : null}
                          </p>
                        ) : null}
                        {displayNotes ? <p className="text-[9px] text-muted-foreground truncate mt-0.5">{displayNotes}</p> : null}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[12px] font-black text-foreground">
                          {ev.kind === "location"
                            ? (moved != null ? `↔ ${moved}` : "•")
                            : (deltaQty != null ? (deltaQty > 0 ? "+" : "") + String(deltaQty) : (((ev as any).event_type === "add" || (ev as any).event_type === "stock_increase") ? "+" : "−") + String((ev as any).quantity))}
                        </span>
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
