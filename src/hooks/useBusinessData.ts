import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export interface SaleRecord {
  id: string;
  user_id: string;
  wine_id: string | null;
  name: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface WishlistRecord {
  id: string;
  user_id: string;
  wine_name: string;
  notes: string | null;
  producer: string | null;
  vintage: number | null;
  style: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  target_price: number | null;
  image_url: string | null;
  ai_summary: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

type WishlistInsert = Database["public"]["Tables"]["wishlist"]["Insert"];

export interface ContactRecord {
  id: string;
  user_id: string;
  name: string;
  type: "cliente" | "fornecedor";
  contact_info: string | null;
  created_at: string;
}

export function useSales() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as SaleRecord[];
    },
    enabled: !!user,
  });
}

export function useAddSalesBatch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      sales: Array<{
        wine_id?: string | null;
        name: string;
        quantity: number;
        price: number;
      }>
    ) => {
      if (!user) throw new Error("Not authenticated");

      const payload = sales.map((sale) => ({
        user_id: user.id,
        wine_id: sale.wine_id ?? null,
        name: sale.name,
        quantity: sale.quantity,
        price: sale.price,
      }));

      const { error } = await supabase.from("sales" as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export function useWishlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as WishlistRecord[];
    },
    enabled: !!user,
  });
}

export function useAddWishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Omit<WishlistInsert, "user_id">) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("wishlist").insert({
        user_id: user.id,
        wine_name: entry.wine_name.trim(),
        notes: entry.notes?.trim() || null,
        producer: entry.producer?.trim() || null,
        vintage: entry.vintage ?? null,
        style: entry.style?.trim() || null,
        country: entry.country?.trim() || null,
        region: entry.region?.trim() || null,
        grape: entry.grape?.trim() || null,
        target_price: entry.target_price ?? null,
        image_url: entry.image_url?.trim() || null,
        ai_summary: entry.ai_summary?.trim() || null,
        source: entry.source ?? "manual",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useDeleteWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useContacts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ContactRecord[];
    },
    enabled: !!user,
  });
}

export function useAddContact() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: { name: string; type: "cliente" | "fornecedor"; contact_info?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("contacts" as any).insert({
        user_id: user.id,
        name: entry.name,
        type: entry.type,
        contact_info: entry.contact_info?.trim() || null,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
