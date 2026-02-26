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
      const { data, error } = await supabase
        .from("wines")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Wine[];
    },
    enabled: !!user,
  });
}

export function useWineMetrics() {
  const { data: wines, isLoading } = useWines();
  const currentYear = new Date().getFullYear();

  const totalBottles = wines?.reduce((sum, w) => sum + w.quantity, 0) ?? 0;
  const totalValue = wines?.reduce((sum, w) => sum + (w.current_value ?? w.purchase_price ?? 0) * w.quantity, 0) ?? 0;
  const drinkNow = wines?.filter(w => w.drink_from && w.drink_until && currentYear >= w.drink_from && currentYear <= w.drink_until).length ?? 0;
  const recentCount = wines?.filter(w => {
    const d = new Date(w.created_at);
    const now = new Date();
    return now.getTime() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
  }).length ?? 0;
  const lowStock = wines?.filter(w => w.quantity > 0 && w.quantity <= 2).length ?? 0;

  return { totalBottles, totalValue, drinkNow, recentCount, lowStock, wines: wines ?? [], isLoading };
}

export function useAddWine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (wine: Omit<WineInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("wines")
        .insert({ ...wine, user_id: user.id })
        .select()
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

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Wine, "id" | "created_at" | "updated_at" | "user_id">> }) => {
      const { error } = await supabase.from("wines").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wines"] });
    },
  });
}

export function useDeleteWine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wines").delete().eq("id", id);
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
    mutationFn: async ({ wineId, eventType, quantity, notes }: { wineId: string; eventType: string; quantity: number; notes?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error: eventError } = await supabase
        .from("wine_events")
        .insert({ wine_id: wineId, user_id: user.id, event_type: eventType, quantity, notes });
      if (eventError) throw eventError;

      const { data: wine } = await supabase.from("wines").select("quantity").eq("id", wineId).single();
      if (!wine) throw new Error("Wine not found");

      const newQty = eventType === "add" ? wine.quantity + quantity : Math.max(0, wine.quantity - quantity);
      const { error: updateError } = await supabase.from("wines").update({ quantity: newQty }).eq("id", wineId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wines"] });
    },
  });
}
