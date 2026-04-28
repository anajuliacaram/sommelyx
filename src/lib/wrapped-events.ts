import { supabase } from "@/integrations/supabase/client";

export type WrappedMode = "personal" | "commercial";
export type WrappedEventType =
  | "added_to_cellar"
  | "bottle_opened"
  | "wine_rated"
  | "consumption_logged"
  | "sale_completed"
  | "stock_added";

export type WrappedEventRow = {
  id: string;
  user_id: string;
  mode: WrappedMode;
  entity_id: string;
  event_type: WrappedEventType;
  quantity: number;
  price: number | null;
  rating: number | null;
  context: Record<string, unknown> | null;
  created_at: string;
};

type WrappedDebugPayload = {
  userId: string;
  eventType: WrappedEventType;
  entityId: string;
  timestamp?: string;
  mode?: WrappedMode;
  quantity?: number;
  price?: number | null;
  rating?: number | null;
  context?: Record<string, unknown>;
};

function getWrappedDebugEnabled() {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const raw = env.VITE_WRAPPED_DEBUG ?? env.WRAPPED_DEBUG;
  return raw === true || raw === "true";
}

export function safeLogWrappedEvent(payload: WrappedDebugPayload) {
  if (!getWrappedDebugEnabled()) return;

  queueMicrotask(() => {
    try {
      const lines = [
        "[WRAPPED_EVENT]",
        `user_id: ${payload.userId}`,
        `event_type: ${payload.eventType}`,
        `entity_id: ${payload.entityId}`,
        `timestamp: ${payload.timestamp ?? new Date().toISOString()}`,
      ];
      if (payload.mode) lines.push(`mode: ${payload.mode}`);
      if (typeof payload.quantity === "number") lines.push(`quantity: ${payload.quantity}`);
      if (typeof payload.price === "number" || payload.price === null) lines.push(`price: ${payload.price ?? "null"}`);
      if (typeof payload.rating === "number" || payload.rating === null) lines.push(`rating: ${payload.rating ?? "null"}`);
      console.info(lines.join("\n"));
      if (payload.context && Object.keys(payload.context).length) {
        console.info("[WRAPPED_EVENT_CONTEXT]", payload.context);
      }
    } catch {
      // Never block user actions on debug logging.
    }
  });
}

export async function getRecentEvents(userId: string, limit = 20) {
  const { data, error } = await supabase.rpc("get_recent_events", {
    _user_id: userId,
    _limit: Math.max(1, Math.min(limit, 20)),
  });
  if (error) throw error;
  return (data ?? []) as WrappedEventRow[];
}

export async function countEventsByType(
  userId: string,
  semester: 1 | 2,
  year = new Date().getFullYear(),
  mode?: WrappedMode,
) {
  const { data, error } = await supabase.rpc("count_events_by_type", {
    _user_id: userId,
    _year: year,
    _semester: semester,
    _mode: mode ?? null,
  });
  if (error) throw error;
  return (data ?? {}) as Record<string, number> & {
    total?: number;
    year?: number;
    semester?: 1 | 2;
    mode?: WrappedMode | null;
  };
}
