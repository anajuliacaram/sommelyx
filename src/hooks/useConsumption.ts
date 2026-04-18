import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSommelyxData } from "@/lib/sommelyx-data";

export interface ConsumptionEntry {
  id: string;
  user_id: string;
  wine_id: string | null;
  source: "cellar" | "external";
  wine_name: string;
  producer: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  style: string | null;
  vintage: number | null;
  location: string | null;
  tasting_notes: string | null;
  rating: number | null;
  consumed_at: string;
  created_at: string;
}

export type ConsumptionInsert = Omit<ConsumptionEntry, "id" | "created_at">;

export function useConsumption() {
  const { user } = useAuth();
  const sommelyxData = getSommelyxData();

  return useQuery({
    queryKey: ["consumption", user?.id ?? "demo"],
    queryFn: async () => {
      // Authenticated user → ALWAYS read real data from Supabase (ignore demo data)
      if (user) {
        const { data, error } = await supabase
          .from("consumption_log")
          .select(
            "id,user_id,wine_id,source,wine_name,producer,country,region,grape,style,vintage,location,tasting_notes,rating,consumed_at,created_at",
          )
          .eq("user_id", user.id)
          .order("consumed_at", { ascending: false });
        if (error) throw error;
        console.log("[consumption] loaded:", data?.length ?? 0, "entries");
        return data as ConsumptionEntry[];
      }
      // Anonymous preview → fall back to demo data when present
      if (sommelyxData?.consumption?.length) {
        const now = new Date().toISOString();
        return sommelyxData.consumption.map((entry, index) => ({
          id: `${entry.wineId}-${index}`,
          user_id: "demo",
          wine_id: entry.wineId,
          source: "cellar" as const,
          wine_name: entry.wine_name,
          producer: null,
          country: null,
          region: null,
          grape: null,
          style: null,
          vintage: null,
          location: null,
          tasting_notes: null,
          rating: entry.rating ?? null,
          consumed_at: entry.consumed_at,
          created_at: now,
        })) as ConsumptionEntry[];
      }
      throw new Error("Not authenticated");
    },
    enabled: !!user || !!sommelyxData?.consumption?.length,
  });
}

export function useAddConsumption() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: Omit<ConsumptionInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const wineName = entry.wine_name?.trim();
      if (!wineName) throw new Error("Nome do vinho é obrigatório");
      if (!entry.consumed_at) throw new Error("Data de consumo é obrigatória");
      if (entry.rating !== null && entry.rating !== undefined) {
        if (!Number.isFinite(entry.rating) || entry.rating < 0 || entry.rating > 5) throw new Error("Avaliação inválida");
      }
      const { data, error } = await supabase
        .from("consumption_log")
        .insert({ ...entry, wine_name: wineName, user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumption"] });
    },
  });
}

export type ConsumptionUpdate = Partial<
  Pick<
    ConsumptionEntry,
    | "wine_name"
    | "style"
    | "rating"
    | "tasting_notes"
    | "location"
    | "vintage"
    | "producer"
    | "region"
    | "country"
    | "grape"
  >
>;

export function useUpdateConsumption() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ConsumptionUpdate }) => {
      if (!user) throw new Error("Not authenticated");
      if (updates.rating != null) {
        if (!Number.isFinite(updates.rating) || updates.rating < 0 || updates.rating > 5)
          throw new Error("Avaliação inválida");
      }
      const { error } = await supabase
        .from("consumption_log")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumption"] });
    },
  });
}

export function useDeleteConsumption() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("consumption_log").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumption"] });
    },
  });
}
