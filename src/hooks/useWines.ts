import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Wine {
  id: string;
  user_id: string;
  name: string;
  producer: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  vintage: number | null;
  style: string | null;
  purchase_price: number | null;
  current_value: number | null;
  quantity: number;
  rating: number | null;
  drink_from: number | null;
  drink_until: number | null;
  cellar_location: string | null;
  food_pairing: string | null;
  tasting_notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type WineInsert = Omit<Wine, "id" | "created_at" | "updated_at">;

export function useWines() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wines", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("wines")
        .select(
          "id,user_id,name,producer,country,region,grape,vintage,style,purchase_price,current_value,quantity,rating,drink_from,drink_until,cellar_location,food_pairing,tasting_notes,image_url,created_at,updated_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Wine[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useWineMetrics() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  // Lightweight KPI query: only the 5 fields needed for cards
  const { data: kpiRows, isLoading: kpiLoading } = useQuery({
    queryKey: ["wines-kpi", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("wines")
        .select("quantity,current_value,purchase_price,drink_from,drink_until")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as Array<{
        quantity: number;
        current_value: number | null;
        purchase_price: number | null;
        drink_from: number | null;
        drink_until: number | null;
      }>;
    },
    enabled: !!user,
    staleTime: 30_000, // avoid refetch on every mount
  });

  // Full wine list (deferred) — used by secondary sections
  const { data: wines } = useWines();

  const totalBottles = kpiRows?.reduce((sum, w) => sum + w.quantity, 0) ?? 0;
  const totalValue = kpiRows?.reduce((sum, w) => sum + (w.current_value ?? w.purchase_price ?? 0) * w.quantity, 0) ?? 0;
  const drinkNow = kpiRows?.filter(w => w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until).length ?? 0;
  const recentCount = 0; // not used in KPIs, avoid extra query
  const lowStock = kpiRows?.filter(w => w.quantity > 0 && w.quantity <= 2).length ?? 0;

  return { totalBottles, totalValue, drinkNow, recentCount, lowStock, wines: wines ?? [], isLoading: kpiLoading };
}

export function useAddWine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (wine: Omit<WineInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const name = wine.name?.trim();
      if (!name) throw new Error("Nome do vinho é obrigatório");
      if (!Number.isFinite(wine.quantity) || wine.quantity < 0) throw new Error("Quantidade inválida");
      if (wine.vintage !== null && wine.vintage !== undefined) {
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(wine.vintage) || wine.vintage < 1900 || wine.vintage > currentYear + 1) {
          throw new Error("Safra inválida");
        }
      }
      const { data, error } = await supabase
        .from("wines")
        .insert({ ...wine, name, user_id: user.id } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wines"] });
    },
  });
}

export function useUpdateWine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Wine, "id" | "created_at" | "updated_at" | "user_id">> }) => {
      if (!user) throw new Error("Not authenticated");
      const safeUpdates = { ...updates } as typeof updates;
      if (typeof safeUpdates.name === "string") {
        const next = safeUpdates.name.trim();
        if (!next) throw new Error("Nome do vinho é obrigatório");
        safeUpdates.name = next;
      }
      if (typeof safeUpdates.quantity === "number" && (!Number.isFinite(safeUpdates.quantity) || safeUpdates.quantity < 0)) {
        throw new Error("Quantidade inválida");
      }
      if (typeof safeUpdates.purchase_price === "number" && (!Number.isFinite(safeUpdates.purchase_price) || safeUpdates.purchase_price < 0)) {
        throw new Error("Último valor pago inválido");
      }
      if (typeof safeUpdates.current_value === "number" && (!Number.isFinite(safeUpdates.current_value) || safeUpdates.current_value < 0)) {
        throw new Error("Valor atual inválido");
      }
      const { error } = await supabase.from("wines").update(safeUpdates as any).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wines"] });
    },
  });
}

export function useDeleteWine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("wines").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wines"] });
    },
  });
}

export function useWineEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      wineId,
      eventType,
      quantity,
      notes,
      responsibleName,
      reason,
      locationId,
    }: {
      wineId: string;
      eventType: string;
      quantity: number;
      notes?: string;
      responsibleName?: string;
      reason?: string;
      locationId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc("adjust_wine_quantity", {
        _wine_id: wineId,
        _user_id: user.id,
        _event_type: eventType,
        _quantity: quantity,
        _notes: notes ?? undefined,
        _responsible_name: responsibleName ?? undefined,
        _reason: reason ?? undefined,
        _location_id: locationId ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wines"] });
    },
  });
}
