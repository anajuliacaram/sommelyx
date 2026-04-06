import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type WineLocation = {
  id: string;
  wine_id: string;
  user_id: string;
  profile_type: "personal" | "commercial" | null;
  sector: string | null;
  zone: string | null;
  level: string | null;
  position: string | null;
  manual_label: string | null;
  formatted_label: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type WineLocationEvent = {
  id: string;
  wine_id: string;
  user_id: string;
  created_by_user_id: string | null;
  profile_type: "personal" | "commercial" | null;
  action_type: string;
  from_location_id: string | null;
  to_location_id: string | null;
  previous_label: string | null;
  new_label: string | null;
  quantity_moved: number | null;
  responsible_name: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
};

export function useWineLocations(wineId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wine_locations", user?.id, wineId ?? "*"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      let q = (supabase as any)
        .from("wine_locations")
        .select("id,wine_id,user_id,profile_type,sector,zone,level,position,manual_label,formatted_label,quantity,created_at,updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (wineId) q = q.eq("wine_id", wineId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WineLocation[];
    },
    enabled: !!user,
  });
}

export function useWineLocationEvents(wineId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wine_location_events", user?.id, wineId ?? "*"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      let q = (supabase as any)
        .from("wine_location_events")
        .select("id,wine_id,user_id,created_by_user_id,profile_type,action_type,from_location_id,to_location_id,previous_label,new_label,quantity_moved,responsible_name,reason,notes,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (wineId) q = q.eq("wine_id", wineId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WineLocationEvent[];
    },
    enabled: !!user,
  });
}

export function useLocationOptions() {
  const { data } = useWineLocations();
  return {
    sectors: Array.from(new Set((data ?? []).map((l) => l.sector).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    zones: Array.from(new Set((data ?? []).map((l) => l.zone).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    levels: Array.from(new Set((data ?? []).map((l) => l.level).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    positions: Array.from(new Set((data ?? []).map((l) => l.position).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
  };
}

export function useCreateWineLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      wineId: string;
      sector?: string | null;
      zone?: string | null;
      level?: string | null;
      position?: string | null;
      manualLabel?: string | null;
      quantity?: number;
      responsibleName?: string | null;
      reason?: string | null;
      notes?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await (supabase as any).rpc("create_wine_location", {
        _wine_id: input.wineId,
        _sector: input.sector ?? null,
        _zone: input.zone ?? null,
        _level: input.level ?? null,
        _position: input.position ?? null,
        _manual_label: input.manualLabel ?? null,
        _quantity: input.quantity ?? 0,
        _responsible_name: input.responsibleName ?? null,
        _reason: input.reason ?? null,
        _notes: input.notes ?? null,
      });
      if (error) throw error;
      return { id: data as unknown as string };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["wine_locations"] });
      queryClient.invalidateQueries({ queryKey: ["wine_locations", user?.id, vars.wineId] });
      queryClient.invalidateQueries({ queryKey: ["wines"] });
      queryClient.invalidateQueries({ queryKey: ["wine_location_events"] });
    },
  });
}

export function useUpdateWineLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      updates: Partial<Pick<WineLocation, "sector" | "zone" | "level" | "position" | "manual_label">>;
      responsibleName?: string | null;
      reason?: string | null;
      notes?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).rpc("update_wine_location_meta", {
        _location_id: input.id,
        _sector: input.updates.sector ?? null,
        _zone: input.updates.zone ?? null,
        _level: input.updates.level ?? null,
        _position: input.updates.position ?? null,
        _manual_label: input.updates.manual_label ?? null,
        _responsible_name: input.responsibleName ?? null,
        _reason: input.reason ?? null,
        _notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wine_locations"] });
      queryClient.invalidateQueries({ queryKey: ["wine_location_events"] });
    },
  });
}

export function useDeleteWineLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("wine_locations").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wine_locations"] });
      queryClient.invalidateQueries({ queryKey: ["wines"] });
    },
  });
}

export function useTransferWineLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      wineId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: number;
      notes?: string;
      responsibleName?: string;
      reason?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).rpc("transfer_wine_location_quantity", {
        _wine_id: input.wineId,
        _from_location_id: input.fromLocationId,
        _to_location_id: input.toLocationId,
        _quantity: input.quantity,
        _notes: input.notes,
        _responsible_name: input.responsibleName,
        _reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wine_locations"] });
      queryClient.invalidateQueries({ queryKey: ["wine_location_events"] });
      queryClient.invalidateQueries({ queryKey: ["wines"] });
    },
  });
}
