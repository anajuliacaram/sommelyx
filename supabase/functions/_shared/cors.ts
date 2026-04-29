const DEFAULT_ALLOWED_ORIGINS = [
  "https://sommelyx.com.br",
  "https://www.sommelyx.com.br",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function normalizeOrigin(origin: string | null | undefined) {
  return typeof origin === "string" ? origin.trim().replace(/\/$/, "") : "";
}

function getAllowedOrigins() {
  const envOrigin = normalizeOrigin(
    Deno.env.get("CORS_ALLOWED_ORIGIN") ||
      Deno.env.get("APP_URL") ||
      Deno.env.get("SITE_URL") ||
      Deno.env.get("VITE_APP_URL") ||
      null,
  );

  const origins = new Set(DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin));
  if (envOrigin) origins.add(envOrigin);
  const envAltOrigin = normalizeOrigin(Deno.env.get("CORS_ALLOWED_ORIGIN_DEV") || null);
  if (envAltOrigin) origins.add(envAltOrigin);
  return origins;
}

export function resolveCorsOrigin(requestOrigin: string | null | undefined) {
  const origin = normalizeOrigin(requestOrigin);
  if (!origin) return normalizeOrigin(Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || Deno.env.get("VITE_APP_URL") || "https://sommelyx.com.br");
  const allowed = getAllowedOrigins();
  return allowed.has(origin) ? origin : null;
}

export function createCorsHeaders(req: Request) {
  const origin = resolveCorsOrigin(req.headers.get("Origin"));
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function makeCorsResponse(req: Request, body: BodyInit | null = null, init?: ResponseInit) {
  return new Response(body, {
    ...init,
    headers: {
      ...createCorsHeaders(req),
      ...(init?.headers || {}),
    },
  });
}
