import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTION_NAME = "scan-wine-label";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB (tamanho aproximado da string base64)
const AI_TIMEOUT_MS = 35_000;
const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 120_000);

type FailPayload = {
  ok: false;
  error: string;
  code: string;
  requestId: string;
  retryable?: boolean;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(status: number, payload: FailPayload) {
  return jsonResponse(status, payload);
}

function getBearerToken(authHeader: string) {
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function normalizeBase64(input: string) {
  const trimmed = input.trim();
  const idx = trimmed.indexOf("base64,");
  if (idx !== -1) return trimmed.slice(idx + "base64,".length).trim();
  return trimmed;
}

function safeJsonParse(value: unknown): unknown | null {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function extractJsonFromText(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function normalizeStyle(value: unknown) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!v) return null;
  if (["tinto", "branco", "rose", "espumante", "sobremesa", "fortificado"].includes(v)) return v;
  if (v.includes("ros")) return "rose";
  if (v.includes("spark") || v.includes("espum") || v.includes("champ")) return "espumante";
  if (v.includes("fort") || v.includes("porto") || v.includes("sherry")) return "fortificado";
  if (v.includes("dess") || v.includes("sobrem")) return "sobremesa";
  if (v.includes("white") || v.includes("branc")) return "branco";
  if (v.includes("red") || v.includes("tint")) return "tinto";
  return v;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function logAudit(
  userId: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>,
) {
  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
    );

    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: FUNCTION_NAME,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata || {},
    });
  } catch (e) {
    console.error("Audit log failed:", e instanceof Error ? e.message : "unknown");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "anonymous";
  const requestId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        reason: "missing_or_invalid_authorization_header",
        has_authorization_header: Boolean(authHeader),
      });
      return fail(401, {
        ok: false,
        code: "AUTH_REQUIRED",
        error: "Sua sessão expirou. Faça login novamente para continuar.",
        requestId,
        retryable: false,
      });
    }

    const token = getBearerToken(authHeader);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Passar o token explicitamente evita falhas quando o header global não é aplicado.
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        reason: "invalid_token",
        supabase_error: userError ? { message: userError.message, status: (userError as any).status } : null,
        token_length: token?.length ?? 0,
      });
      return fail(401, {
        ok: false,
        code: "AUTH_INVALID",
        error: "Sua sessão não é válida. Faça login novamente para continuar.",
        requestId,
        retryable: false,
      });
    }

    userId = user.id;

    if (!checkRateLimit(userId)) {
      await logAudit(userId, 429, "rate_limited", Date.now() - startTime, { request_id: requestId });
      return fail(429, {
        ok: false,
        code: "RATE_LIMITED",
        error: "Muitas tentativas em pouco tempo. Tente novamente em instantes.",
        requestId,
        retryable: true,
      });
    }

    let payload: { imageBase64?: unknown } = {};
    try {
      payload = await req.json();
    } catch {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { request_id: requestId, reason: "invalid_json" });
      return fail(400, {
        ok: false,
        code: "INVALID_REQUEST",
        error: "Não foi possível ler sua solicitação. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    const imageBase64Raw = payload?.imageBase64;
    if (!imageBase64Raw || typeof imageBase64Raw !== "string") {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { request_id: requestId, reason: "missing_image" });
      return fail(400, {
        ok: false,
        code: "MISSING_IMAGE",
        error: "Envie uma foto do rótulo para analisar.",
        requestId,
        retryable: false,
      });
    }

    const imageBase64 = normalizeBase64(imageBase64Raw);
    if (imageBase64.length > MAX_IMAGE_SIZE) {
      await logAudit(userId, 413, "validation_error", Date.now() - startTime, {
        request_id: requestId,
        reason: "image_too_large",
        size_bytes: imageBase64.length,
      });
      return fail(413, {
        ok: false,
        code: "IMAGE_TOO_LARGE",
        error: "A imagem está muito grande. Tente novamente com uma foto mais leve.",
        requestId,
        retryable: false,
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const openaiModel = Deno.env.get("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL;

    if (!openaiKey) {
      console.error(`[${FUNCTION_NAME}] request_id=${requestId} missing OPENAI_API_KEY`);
      await logAudit(userId, 500, "internal_error", Date.now() - startTime, { request_id: requestId, reason: "missing_openai_key" });
      return fail(500, {
        ok: false,
        code: "CONFIG_ERROR",
        error: "A análise não pôde ser concluída agora. Tente novamente mais tarde.",
        requestId,
        retryable: true,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiModel,
        // Responses API: input items include text + image.
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  `Você é um especialista em leitura de rótulos de vinho. Analise a imagem do rótulo e extraia o máximo de informações com precisão.\n\n` +
                  `Regras:\n` +
                  `- Retorne APENAS JSON seguindo o schema (sem texto extra).\n` +
                  `- "style" deve ser: tinto, branco, rose, espumante, sobremesa, fortificado.\n` +
                  `- País em português (França, Itália, Argentina, Portugal, Espanha, Chile etc).\n` +
                  `- Se safra for desconhecida, deixe vintage/drink_from/drink_until como null.\n` +
                  `- tasting_notes: 1-2 frases curtas em português (perfil esperado).\n` +
                  `- food_pairing: 2-3 sugestões em português.\n` +
                  `- Leia todo texto visível no rótulo (frente e verso, se aparecer).`,
              },
            ],
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Analise este rótulo de vinho e extraia todas as informações possíveis." },
              { type: "input_image", image_url: `data:image/jpeg;base64,${imageBase64}` },
            ],
          },
        ],
        // Enforce a strict JSON schema output for reliability.
        format: {
          type: "json_schema",
          name: "wine_label",
          strict: true,
          schema: {
            type: "object",
            properties: {
              wine: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  producer: { type: "string" },
                  vintage: { anyOf: [{ type: "integer" }, { type: "null" }] },
                  style: {
                    anyOf: [
                      { type: "string", enum: ["tinto", "branco", "rose", "espumante", "sobremesa", "fortificado"] },
                      { type: "null" },
                    ],
                  },
                  country: { anyOf: [{ type: "string" }, { type: "null" }] },
                  region: { anyOf: [{ type: "string" }, { type: "null" }] },
                  grape: { anyOf: [{ type: "string" }, { type: "null" }] },
                  food_pairing: { anyOf: [{ type: "string" }, { type: "null" }] },
                  tasting_notes: { anyOf: [{ type: "string" }, { type: "null" }] },
                  cellar_location: { anyOf: [{ type: "string" }, { type: "null" }] },
                  purchase_price: { anyOf: [{ type: "number" }, { type: "null" }] },
                  drink_from: { anyOf: [{ type: "integer" }, { type: "null" }] },
                  drink_until: { anyOf: [{ type: "integer" }, { type: "null" }] },
                },
                required: ["name"],
              },
            },
            required: ["wine"],
          },
        },
        temperature: 0.1,
        max_output_tokens: 900,
      }),
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      if (response.status === 429) {
        await logAudit(userId, 429, "ai_error", durationMs, { request_id: requestId, reason: "ai_rate_limit" });
        return fail(429, {
          ok: false,
          code: "AI_RATE_LIMIT",
          error: "Muitas requisições agora. Tente novamente em instantes.",
          requestId,
          retryable: true,
        });
      }
      if (response.status === 402) {
        await logAudit(userId, 402, "ai_error", durationMs, { request_id: requestId, reason: "credits_exhausted" });
        return fail(402, {
          ok: false,
          code: "AI_CREDITS_EXHAUSTED",
          error: "A análise não está disponível no momento. Tente novamente mais tarde.",
          requestId,
          retryable: true,
        });
      }

      console.error(`[${FUNCTION_NAME}] request_id=${requestId} ai_status=${response.status} body=${bodyText.slice(0, 240)}`);
      await logAudit(userId, 502, "ai_error", durationMs, {
        request_id: requestId,
        ai_status: response.status,
        ai_body_preview: bodyText.slice(0, 400),
      });
      return fail(502, {
        ok: false,
        code: "AI_UNAVAILABLE",
        error: "A análise não pôde ser concluída agora. Tente novamente em instantes.",
        requestId,
        retryable: true,
      });
    }

    const data = await response.json().catch(() => null);
    if (!data) {
      await logAudit(userId, 502, "ai_error", durationMs, { request_id: requestId, reason: "invalid_ai_json" });
      return fail(502, {
        ok: false,
        code: "AI_INVALID_RESPONSE",
        error: "O serviço de análise retornou uma resposta inválida. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    // Responses API: prefer `output_text` when available, otherwise traverse `output[]`.
    const rawTextDirect = typeof (data as any)?.output_text === "string" ? String((data as any).output_text) : "";
    const outputItems = Array.isArray((data as any)?.output) ? (data as any).output : [];
    const firstMessage =
      outputItems.find((it: any) => it?.type === "message" && it?.role === "assistant") ??
      outputItems.find((it: any) => it?.type === "message") ??
      outputItems[0];
    const content = Array.isArray(firstMessage?.content) ? firstMessage.content : [];
    const textPart = content.find((c: any) => c?.type === "output_text") ?? null;
    const rawTextFromItems = typeof textPart?.text === "string" ? textPart.text : "";
    const rawText = rawTextDirect || rawTextFromItems;

    const parsedArgs = safeJsonParse(rawText) ?? extractJsonFromText(rawText);

    if (!parsedArgs || typeof parsedArgs !== "object") {
      await logAudit(userId, 422, "ai_error", durationMs, { request_id: requestId, reason: "no_structured_output" });
      return fail(422, {
        ok: false,
        code: "LABEL_NOT_IDENTIFIED",
        error: "Não foi possível identificar esse rótulo com segurança. Tente outra foto ou cadastre manualmente.",
        requestId,
        retryable: false,
      });
    }

    const parsed = parsedArgs as Record<string, unknown>;
    const wine = (parsed?.wine ?? parsed) as Record<string, unknown>;

    const normalizedWine = {
      name: typeof wine.name === "string" ? wine.name.trim() : null,
      producer: typeof wine.producer === "string" ? wine.producer.trim() : null,
      vintage: normalizeNumber(wine.vintage),
      style: normalizeStyle(wine.style),
      country: typeof wine.country === "string" ? wine.country.trim() : null,
      region: typeof wine.region === "string" ? wine.region.trim() : null,
      grape: typeof wine.grape === "string" ? wine.grape.trim() : null,
      food_pairing: typeof wine.food_pairing === "string" ? wine.food_pairing.trim() : null,
      tasting_notes: typeof wine.tasting_notes === "string" ? wine.tasting_notes.trim() : null,
      cellar_location: typeof wine.cellar_location === "string" ? wine.cellar_location.trim() : null,
      purchase_price: normalizeNumber(wine.purchase_price),
      drink_from: normalizeNumber(wine.drink_from),
      drink_until: normalizeNumber(wine.drink_until),
    };

    if (!normalizedWine.name) {
      await logAudit(userId, 422, "ai_error", durationMs, { request_id: requestId, reason: "missing_name" });
      return fail(422, {
        ok: false,
        code: "LABEL_NOT_IDENTIFIED",
        error: "Não foi possível identificar o nome do vinho com segurança. Tente outra foto ou cadastre manualmente.",
        requestId,
        retryable: false,
      });
    }

    await logAudit(userId, 200, "success", durationMs, {
      request_id: requestId,
      wine_name: normalizedWine.name || "unknown",
    });

    return jsonResponse(200, { ok: true, wine: normalizedWine, requestId });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : "unknown";
    const isAbort = errMsg.toLowerCase().includes("aborted") || errMsg.toLowerCase().includes("abort");

    console.error(`[${FUNCTION_NAME}] request_id=${requestId} user_id=${userId} error=${errMsg}`);

    await logAudit(userId, isAbort ? 504 : 500, "internal_error", durationMs, {
      request_id: requestId,
      error: errMsg,
      aborted: isAbort,
    });

    if (isAbort) {
      return fail(504, {
        ok: false,
        code: "AI_TIMEOUT",
        error: "A análise demorou mais do que o esperado. Tente novamente com uma foto mais nítida.",
        requestId,
        retryable: true,
      });
    }

    return fail(500, {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "A análise não pôde ser concluída agora. Tente novamente em instantes.",
      requestId,
      retryable: true,
    });
  }
});
