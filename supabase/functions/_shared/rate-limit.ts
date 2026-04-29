import { createClient } from "npm:@supabase/supabase-js@2.49.1";

type Scope = "minute" | "day";

type RateLimitRow = {
  allowed: boolean;
  current_count: number;
  remaining: number;
  window_start: string;
  reset_at: string;
};

type ConsumeResult = {
  allowed: boolean;
  degraded: boolean;
  currentCount?: number;
  remaining?: number;
  windowStart?: string;
  resetAt?: string;
};

function adminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

async function consumeScope(
  userId: string,
  endpoint: string,
  scope: Scope,
  limit: number,
  windowSeconds: number,
) {
  const client = adminClient();
  if (!client) {
    return { allowed: false, degraded: true } as ConsumeResult;
  }

  const { data, error } = await client.rpc("consume_ai_rate_limit", {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_scope: scope,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.warn(`[rate-limit] scope=${scope} endpoint=${endpoint} rpc_failed`, error.message);
    return { allowed: false, degraded: true } as ConsumeResult;
  }

  const row = Array.isArray(data) ? (data[0] as RateLimitRow | undefined) : (data as RateLimitRow | null);
  if (!row) {
    return { allowed: false, degraded: true } as ConsumeResult;
  }

  return {
    allowed: Boolean(row.allowed),
    degraded: false,
    currentCount: Number(row.current_count ?? 0),
    remaining: Number(row.remaining ?? 0),
    windowStart: row.window_start,
    resetAt: row.reset_at,
  } as ConsumeResult;
}

export async function checkRateLimit(userId: string, endpoint: string) {
  const minute = await consumeScope(userId, endpoint, "minute", 10, 60);
  if (!minute.allowed) {
    return {
      allowed: false,
      scope: "minute" as const,
      currentCount: minute.currentCount ?? 10,
      remaining: 0,
      resetAt: minute.resetAt ?? null,
      degraded: minute.degraded ?? true,
    };
  }

  const day = await consumeScope(userId, endpoint, "day", 100, 24 * 60 * 60);
  if (!day.allowed) {
    return {
      allowed: false,
      scope: "day" as const,
      currentCount: day.currentCount ?? 100,
      remaining: 0,
      resetAt: day.resetAt ?? null,
      degraded: day.degraded ?? true,
    };
  }

  return {
    allowed: true,
    scope: null as null,
    currentCount: Math.max(minute.currentCount ?? 0, day.currentCount ?? 0),
    remaining: Math.min(minute.remaining ?? 10, day.remaining ?? 100),
    resetAt: minute.resetAt ?? day.resetAt ?? null,
    degraded: false,
  };
}

export const enforceAiRateLimit = checkRateLimit;
