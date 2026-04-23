import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSommelyxData } from "@/lib/sommelyx-data";
import { normalizeWineData, normalizeWineText } from "@/lib/wine-normalization";

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

const WINE_LABEL_BUCKET = "wine-label-images";

function extractWineLabelStoragePath(imageUrl?: string | null) {
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (!url) return null;

  const patterns = [
    /\/storage\/v1\/object\/sign\/wine-label-images\/([^?]+)/i,
    /\/storage\/v1\/object\/public\/wine-label-images\/([^?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }

  return null;
}

async function normalizeWineImageUrl(imageUrl?: string | null) {
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (!url) return null;

  if (!/^https?:\/\//i.test(url)) {
    return url;
  }

  const storagePath = extractWineLabelStoragePath(url);
  if (!storagePath) {
    return url;
  }

  try {
    const { data, error } = await supabase.storage.from(WINE_LABEL_BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);
    if (!error && data?.signedUrl) {
      if (import.meta.env.DEV) {
        console.debug("[useWines] image_url_refreshed", {
          storagePath,
          original: url,
          refreshed: data.signedUrl,
        });
      }
      return data.signedUrl;
    }
    if (import.meta.env.DEV) {
      console.debug("[useWines] image_url_refresh_failed", {
        storagePath,
        original: url,
        error: error?.message ?? null,
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug("[useWines] image_url_refresh_threw", {
        storagePath,
        original: url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return url;
}

async function normalizeFetchedWine(wine: Wine) {
  const refreshedImageUrl = await normalizeWineImageUrl(wine.image_url);
  return normalizeWineData({
    ...wine,
    image_url: refreshedImageUrl,
  });
}

function sanitizeWineInsertPayload(wine: Omit<WineInsert, "user_id">, userId: string) {
  return {
    user_id: userId,
    name: normalizeWineText(wine.name),
    producer: normalizeWineText(wine.producer) ?? null,
    country: normalizeWineText(wine.country) ?? null,
    region: normalizeWineText(wine.region) ?? null,
    grape: normalizeWineText(wine.grape) ?? null,
    vintage: wine.vintage ?? null,
    style: typeof wine.style === "string" ? wine.style.trim().toLowerCase() : wine.style ?? null,
    purchase_price: wine.purchase_price ?? null,
    current_value: wine.current_value ?? null,
    quantity: wine.quantity,
    rating: wine.rating ?? null,
    drink_from: wine.drink_from ?? null,
    drink_until: wine.drink_until ?? null,
    cellar_location: wine.cellar_location ?? null,
    food_pairing: wine.food_pairing ?? null,
    tasting_notes: wine.tasting_notes ?? null,
    image_url: wine.image_url ?? null,
  };
}

function sanitizeWineUpdatePayload(updates: Partial<Omit<Wine, "id" | "created_at" | "updated_at" | "user_id">>) {
  const allowedKeys = [
    "name",
    "producer",
    "country",
    "region",
    "grape",
    "vintage",
    "style",
    "purchase_price",
    "current_value",
    "quantity",
    "rating",
    "drink_from",
    "drink_until",
    "cellar_location",
    "food_pairing",
    "tasting_notes",
    "image_url",
  ] as const;

  return Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowedKeys.includes(key as (typeof allowedKeys)[number])),
  ) as Partial<Omit<Wine, "id" | "created_at" | "updated_at" | "user_id">>;
}

export function useWines() {
  const { user } = useAuth();
  const sommelyxData = getSommelyxData();

  return useQuery({
    queryKey: ["wines", user?.id ?? "demo"],
    queryFn: async () => {
      if (user) {
        const { data, error } = await supabase
          .from("wines")
          .select("id,user_id,name,producer,country,region,grape,vintage,style,purchase_price,current_value,quantity,rating,drink_from,drink_until,cellar_location,food_pairing,tasting_notes,image_url,created_at,updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const normalized = await Promise.all((data as Wine[]).map((wine) => normalizeFetchedWine(wine)));
        return normalized;
      }
      if (sommelyxData?.wines?.length) {
        const now = new Date().toISOString();
        return Promise.all(sommelyxData.wines.map(async (wine) => normalizeWineData({
          id: wine.id,
          user_id: "demo",
          name: wine.name,
          producer: wine.producer,
          country: wine.country,
          region: wine.region,
          grape: wine.grape,
          vintage: wine.vintage,
          style: wine.style,
          purchase_price: wine.purchase_price,
          current_value: wine.current_value,
          quantity: wine.quantity,
          rating: wine.rating,
          drink_from: wine.drink_from,
          drink_until: wine.drink_until,
          cellar_location: wine.location,
          food_pairing: wine.pairing ?? null,
          tasting_notes: null,
          image_url: await normalizeWineImageUrl(wine.image_url ?? null),
          created_at: now,
          updated_at: now,
        }))) as Promise<Wine[]>;
      }
      throw new Error("Not authenticated");
    },
    enabled: !!user || !!sommelyxData?.wines?.length,
    staleTime: 30_000,
  });
}

export function useWineMetrics() {
  const { user } = useAuth();
  const sommelyxData = getSommelyxData();
  const currentYear = new Date().getFullYear();

  // Lightweight KPI query: only the 5 fields needed for cards
  const { data: kpiRows, isLoading: kpiLoading } = useQuery({
    queryKey: ["wines-kpi", user?.id ?? "demo"],
    queryFn: async () => {
      if (user) {
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
      }
      if (sommelyxData?.wines?.length) {
        return sommelyxData.wines.map((w) => ({
          quantity: w.quantity,
          current_value: w.current_value,
          purchase_price: w.purchase_price,
          drink_from: w.drink_from,
          drink_until: w.drink_until,
        }));
      }
      throw new Error("Not authenticated");
    },
    enabled: !!user || !!sommelyxData?.wines?.length,
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
      let actorUserId = user?.id ?? null;
      if (!actorUserId) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          throw new Error("Sessão expirada. Faça login novamente para continuar.");
        }
        actorUserId = authData.user.id;
      }
      const name = wine.name?.trim();
      if (!name) throw new Error("Nome do vinho é obrigatório");
      if (!Number.isFinite(wine.quantity) || wine.quantity < 0) throw new Error("Quantidade inválida");
      if (wine.quantity > 9_999) throw new Error("Quantidade acima do limite permitido");
      if (wine.purchase_price !== null && wine.purchase_price !== undefined) {
        if (!Number.isFinite(wine.purchase_price) || wine.purchase_price < 0) {
          throw new Error("Último valor pago inválido");
        }
        if (wine.purchase_price > 200_000) {
          throw new Error("Último valor pago acima do limite permitido");
        }
      }
      if (wine.vintage !== null && wine.vintage !== undefined) {
        const currentYear = new Date().getFullYear();
        if (!Number.isInteger(wine.vintage) || wine.vintage < 1900 || wine.vintage > currentYear + 1) {
          throw new Error("Safra inválida");
        }
      }
      console.log("NORMALIZED:", normalizeWineData(wine, { log: false }));
      const payload = sanitizeWineInsertPayload(wine, actorUserId);

      const { data, error } = await supabase
        .from("wines")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wines"] });
      queryClient.invalidateQueries({ queryKey: ["wines-kpi"] });
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
        const next = normalizeWineText(safeUpdates.name);
        if (!next) throw new Error("Nome do vinho é obrigatório");
        safeUpdates.name = next;
      }
      if (typeof safeUpdates.producer === "string") safeUpdates.producer = normalizeWineText(safeUpdates.producer) ?? null;
      if (typeof safeUpdates.country === "string") safeUpdates.country = normalizeWineText(safeUpdates.country) ?? null;
      if (typeof safeUpdates.region === "string") safeUpdates.region = normalizeWineText(safeUpdates.region) ?? null;
      if (typeof safeUpdates.grape === "string") safeUpdates.grape = normalizeWineText(safeUpdates.grape) ?? null;
      if (typeof safeUpdates.cellar_location === "string") safeUpdates.cellar_location = normalizeWineText(safeUpdates.cellar_location) ?? null;
      if (typeof safeUpdates.food_pairing === "string") safeUpdates.food_pairing = normalizeWineText(safeUpdates.food_pairing) ?? null;
      if (typeof safeUpdates.tasting_notes === "string") safeUpdates.tasting_notes = normalizeWineText(safeUpdates.tasting_notes) ?? null;
      if (typeof safeUpdates.quantity === "number" && (!Number.isFinite(safeUpdates.quantity) || safeUpdates.quantity < 0)) {
        throw new Error("Quantidade inválida");
      }
      if (typeof safeUpdates.purchase_price === "number" && (!Number.isFinite(safeUpdates.purchase_price) || safeUpdates.purchase_price < 0)) {
        throw new Error("Último valor pago inválido");
      }
      if (typeof safeUpdates.current_value === "number" && (!Number.isFinite(safeUpdates.current_value) || safeUpdates.current_value < 0)) {
        throw new Error("Valor atual inválido");
      }
      if (typeof safeUpdates.style === "string") safeUpdates.style = safeUpdates.style.trim().toLowerCase();
      console.log("NORMALIZED:", normalizeWineData(safeUpdates, { log: false }));
      const payload = sanitizeWineUpdatePayload(safeUpdates);
      const { error } = await supabase.from("wines").update(payload as any).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wines"] });
      queryClient.invalidateQueries({ queryKey: ["wines-kpi"] });
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
      queryClient.invalidateQueries({ queryKey: ["wines-kpi"] });
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
      queryClient.invalidateQueries({ queryKey: ["wines-kpi"] });
    },
  });
}
