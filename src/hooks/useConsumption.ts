import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

  return useQuery({
    queryKey: ["consumption", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consumption_log")
        .select("*")
        .order("consumed_at", { ascending: false });
      if (error) throw error;
      return data as ConsumptionEntry[];
    },
    enabled: !!user,
  });
}

export function useAddConsumption() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entry: Omit<ConsumptionInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("consumption_log")
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumption"] });
    },
  });
}

export function useDeleteConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consumption_log").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumption"] });
    },
  });
}
