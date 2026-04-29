import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-debug-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WRAPPED_DEBUG = Deno.env.get("WRAPPED_DEBUG") === "true";
const DEBUG_SECRET = Deno.env.get("DEBUG_SECRET")?.trim() ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!WRAPPED_DEBUG) return json({ error: "Not found" }, 404);
  if (!DEBUG_SECRET) return json({ error: "Not found" }, 404);

  try {
    const debugSecret = req.headers.get("x-debug-secret")?.trim() ?? "";
    if (!debugSecret || debugSecret !== DEBUG_SECRET) {
      return json({ error: "Not found" }, 404);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Autenticação necessária" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userResp, error: userError } = await authClient.auth.getUser();
    if (userError || !userResp.user) {
      return json({ error: "Sessão inválida" }, 401);
    }

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("user_id")?.trim() || userResp.user.id;
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? "20") || 20, 20));
    const semester = Number(url.searchParams.get("semester") ?? "0");
    const year = Number(url.searchParams.get("year") ?? String(new Date().getFullYear()));

    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userResp.user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = Boolean(roleRow);

    if (targetUserId !== userResp.user.id && !isAdmin) {
      return json({ error: "Acesso negado" }, 403);
    }

    const { data: events, error } = await adminClient
      .from("events")
      .select("id,user_id,mode,entity_id,event_type,quantity,price,rating,context,created_at")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const groupedByType = (events ?? []).reduce<Record<string, number>>((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
      return acc;
    }, {});

    const payload: Record<string, unknown> = {
      user_id: targetUserId,
      grouped_by_type: groupedByType,
      events: events ?? [],
    };

    if (semester === 1 || semester === 2) {
      const { data: summary, error: summaryError } = await adminClient.rpc("count_events_by_type", {
        _user_id: targetUserId,
        _year: year,
        _semester: semester,
        _mode: null,
      });
      if (!summaryError) {
        payload.summary = summary;
      }
    }

    return json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[debug-events] error:", message);
    return json({ error: "Não foi possível carregar os eventos de debug." }, 500);
  }
});
