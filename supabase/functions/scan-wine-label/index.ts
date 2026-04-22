import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callOpenAIResponses } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTION_NAME = "scan-wine-label";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const AI_TIMEOUT_MS = 60_000;


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
  success: false;
  message: string;
  error?: string;
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

function ok<T extends Record<string, unknown>>(data: T, requestId: string) {
  return jsonResponse(200, { success: true, data, requestId });
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

function parseImageDataUrl(input: string): { mime: string; base64: string } {
  const trimmed = input.trim();
  if (trimmed.startsWith("data:") && trimmed.includes(";base64,")) {
    const mime = trimmed.slice(5, trimmed.indexOf(";base64,")) || "image/jpeg";
    const base64 = trimmed.slice(trimmed.indexOf("base64,") + "base64,".length).trim();
    return { mime, base64 };
  }
  return { mime: "image/jpeg", base64: trimmed };
}

function extractJsonFromText(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
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

function normalizeForMatch(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ARTIFACT_TOKENS = new Set([
  "huawei",
  "samsung",
  "iphone",
  "xiaomi",
  "redmi",
  "galaxy",
  "pixel",
  "motorola",
  "oppo",
  "vivo",
  "screenshot",
  "dcim",
  "img",
  "camera",
  "photo",
  "pura",
]);

function hasArtifactToken(value: unknown) {
  const normalized = normalizeForMatch(value);
  if (!normalized) return false;
  return normalized.split(" ").some((token) => ARTIFACT_TOKENS.has(token));
}

function isAbsurdRegionValue(value: unknown) {
  const normalized = normalizeForMatch(value);
  if (!normalized) return false;
  if (normalized === "0") return true;
  if (/^\d+$/.test(normalized) && Number(normalized) === 0) return true;
  if (!/[a-z]/.test(normalized)) return true;
  return false;
}

function hasPlausibleWineSignal(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  const normalized = normalizeForMatch(value);
  if (!normalized) return false;
  if (hasArtifactToken(normalized)) return false;
  return normalized.replace(/[^a-z]/g, "").length >= 3;
}

function isStrongAnchor(value: unknown) {
  if (!hasPlausibleWineSignal(value)) return false;
  const normalized = normalizeForMatch(value);
  return normalized.length >= 3;
}

function isWeakAnchor(value: unknown) {
  if (!hasPlausibleWineSignal(value)) return false;
  return true;
}

function countWineAnchors(wine: Record<string, unknown>) {
  const strongAnchors = [
    isStrongAnchor(wine.producer) && !hasArtifactToken(wine.producer),
    isStrongAnchor(wine.country) && !hasArtifactToken(wine.country),
    isStrongAnchor(wine.region) && !hasArtifactToken(wine.region) && !isAbsurdRegionValue(wine.region),
  ].filter(Boolean).length;

  const weakAnchors = [
    isWeakAnchor(wine.grape),
    isWeakAnchor(wine.vintage),
    isWeakAnchor(wine.style),
  ].filter(Boolean).length;

  return { strongAnchors, weakAnchors };
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
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
    console.log(`[${FUNCTION_NAME}] request_received request_id=${requestId} has_auth=${Boolean(authHeader)}`);

    if (!authHeader?.startsWith("Bearer ")) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        reason: "missing_or_invalid_authorization_header",
      });
      return fail(401, {
        success: false,
        code: "AUTH_REQUIRED",
        message: "Sua sessão expirou. Faça login novamente para continuar.",
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    console.log(`[${FUNCTION_NAME}] auth_validation request_id=${requestId} valid=${Boolean(user)}`);
    if (userError || !user) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        reason: "invalid_token",
      });
      return fail(401, {
        success: false,
        code: "AUTH_INVALID",
        message: "Sua sessão não é válida. Faça login novamente para continuar.",
        requestId,
        retryable: false,
      });
    }

    userId = user.id;

    if (!checkRateLimit(userId)) {
      await logAudit(userId, 429, "rate_limited", Date.now() - startTime, { request_id: requestId });
      return fail(429, {
        success: false,
        code: "AI_RATE_LIMIT",
        message: "Muitas tentativas em pouco tempo. Tente novamente em instantes.",
        requestId,
        retryable: true,
      });
    }

    let payload: { imageBase64?: unknown } = {};
    try {
      payload = await req.json();
    } catch (parseError) {
      console.error(`[${FUNCTION_NAME}] request_json_error request_id=${requestId}`, parseError);
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { request_id: requestId, reason: "invalid_json" });
      return fail(400, {
        success: false,
        code: "INVALID_REQUEST",
        message: "Não foi possível ler sua solicitação. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    const imageBase64Raw = payload?.imageBase64;
    if (!imageBase64Raw || typeof imageBase64Raw !== "string") {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { request_id: requestId, reason: "missing_image" });
      return fail(400, {
        success: false,
        code: "FILE_INVALID",
        message: "Envie uma foto do rótulo para analisar.",
        requestId,
        retryable: false,
      });
    }

    const parsedImage = parseImageDataUrl(imageBase64Raw);
    const imageMime = parsedImage.mime;
    const imageBase64 = normalizeBase64(parsedImage.base64);
    const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
    const sizeBytes = Math.floor((imageBase64.length * 3) / 4);
    console.log(`[${FUNCTION_NAME}] payload_parsed request_id=${requestId} mime=${imageMime} base64_length=${imageBase64.length} size_bytes=${sizeBytes}`);

    if (!imageMime.startsWith("image/") || !base64Regex.test(imageBase64)) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, {
        request_id: requestId,
        reason: "invalid_image_payload",
        image_mime: imageMime,
      });
      return fail(400, {
        success: false,
        code: "FILE_INVALID",
        message: "Arquivo inválido. Envie uma imagem legível do rótulo.",
        requestId,
        retryable: false,
      });
    }

    if (sizeBytes > MAX_IMAGE_SIZE) {
      await logAudit(userId, 413, "validation_error", Date.now() - startTime, {
        request_id: requestId,
        reason: "image_too_large",
        size_bytes: sizeBytes,
      });
      return fail(413, {
        success: false,
        code: "IMAGE_TOO_LARGE",
        message: "A imagem está muito grande. Tente novamente com uma foto mais leve.",
        requestId,
        retryable: false,
      });
    }

    const AI_MODEL = Deno.env.get("LOVABLE_AI_MODEL")?.trim() || "google/gemini-3-flash-preview";
    console.log(`[${FUNCTION_NAME}] ai_request_sent request_id=${requestId} model=${AI_MODEL}`);

    const systemPrompt =
      `Você é um especialista em leitura de rótulos de vinho. Analise a imagem do rótulo e extraia SOMENTE informações que estejam EXPLICITAMENTE VISÍVEIS no rótulo.\n\n` +
      `Regras CRÍTICAS:\n` +
      `- Extraia APENAS texto que esteja impresso/escrito no rótulo da garrafa.\n` +
      `- NÃO INFIRA, NÃO ADIVINHE, NÃO DEDUZA informações que não estejam escritas no rótulo.\n` +
      `- Se o país NÃO está escrito no rótulo, retorne country como null. NÃO tente adivinhar baseado no nome do vinho ou produtor.\n` +
      `- Se a região NÃO está escrita no rótulo, retorne region como null. NÃO tente adivinhar.\n` +
      `- Se a uva NÃO está escrita no rótulo, retorne grape como null. NÃO associe "Malbec" automaticamente a "Mendoza" por exemplo.\n` +
      `- Se a safra NÃO está escrita no rótulo, retorne vintage como null.\n` +
      `- Cada campo deve conter SOMENTE o que está literalmente visível na imagem.\n` +
      `- "style" deve ser: tinto, branco, rose, espumante, sobremesa, fortificado. Deduza APENAS pela cor visível da garrafa/líquido ou se estiver escrito.\n` +
      `- País em português (França, Itália, Argentina, Portugal, Espanha, Chile etc) — mas SOMENTE se estiver indicado no rótulo.\n` +
      `- tasting_notes: 1-2 frases curtas em português (perfil esperado baseado no que está escrito no rótulo). Se não houver informação suficiente, retorne null.\n` +
      `- food_pairing: 2-3 sugestões em português. Se não houver informação suficiente, retorne null.\n` +
      `- Ignore totalmente texto de interface, screenshot, sistema, notificações, nome de aparelho, marcas de celular.\n` +
      `- Retorne APENAS JSON válido seguindo o schema abaixo (sem texto extra, sem markdown).\n` +
      `- É MELHOR retornar null do que retornar informação errada.\n\n` +
      `Schema JSON:\n` +
      `{\n` +
      `  "wine": {\n` +
      `    "name": "string",\n` +
      `    "producer": "string | null",\n` +
      `    "vintage": "number | null",\n` +
      `    "style": "tinto | branco | rose | espumante | sobremesa | fortificado | null",\n` +
      `    "country": "string | null",\n` +
      `    "region": "string | null",\n` +
      `    "grape": "string | null",\n` +
      `    "food_pairing": "string | null",\n` +
      `    "tasting_notes": "string | null",\n` +
      `    "cellar_location": "null",\n` +
      `    "purchase_price": "null",\n` +
      `    "drink_from": "number | null",\n` +
      `    "drink_until": "number | null"\n` +
      `  }\n` +
      `}`;

    let parsedArgs: Record<string, unknown> | null = null;
    let responsePreview: string | null = null;

    const openaiResult = await callOpenAIResponses<{ wine: Record<string, unknown> }>({
      functionName: FUNCTION_NAME,
      requestId,
      apiKey: "",
      model: AI_MODEL,
      timeoutMs: AI_TIMEOUT_MS,
      temperature: 0.1,
      instructions: systemPrompt,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analise este rótulo de vinho e extraia todas as informações possíveis." },
            { type: "input_image", image_url: `data:${imageMime};base64,${imageBase64}`, detail: "high" },
          ],
        },
      ],
      schema: {
        type: "object",
        properties: {
          wine: {
            type: "object",
            properties: {
              name: { type: "string" },
              producer: { type: "string" },
              vintage: { type: ["number", "null"] },
              style: { type: ["string", "null"] },
              country: { type: ["string", "null"] },
              region: { type: ["string", "null"] },
              grape: { type: ["string", "null"] },
              food_pairing: { type: ["string", "null"] },
              tasting_notes: { type: ["string", "null"] },
              cellar_location: { type: ["string", "null"] },
              purchase_price: { type: ["number", "null"] },
              drink_from: { type: ["number", "null"] },
              drink_until: { type: ["number", "null"] },
            },
            required: ["name"],
            additionalProperties: true,
          },
        },
        required: ["wine"],
        additionalProperties: true,
      },
      maxOutputTokens: 1_200,
    });

    const durationMs = Date.now() - startTime;

    if (!openaiResult.ok) {
      responsePreview = openaiResult.error;
      const status = openaiResult.status;
      console.error(`[${FUNCTION_NAME}] ai_response_error request_id=${requestId} status=${status} body=${String(responsePreview || "").slice(0, 240)}`);

      if (status === 429) {
        await logAudit(userId, 429, "ai_error", durationMs, { request_id: requestId, reason: "ai_rate_limit" });
        return fail(429, {
          success: false,
          code: "AI_RATE_LIMIT",
          message: "Muitas requisições agora. Tente novamente em instantes.",
          requestId,
          retryable: true,
        });
      }

      await logAudit(userId, status === 504 ? 408 : 502, "ai_error", durationMs, {
        request_id: requestId,
        ai_status: status,
        ai_body_preview: String(responsePreview || "").slice(0, 400),
      });
      return fail(status === 504 ? 408 : 502, {
        success: false,
        code: status === 504 ? "AI_TIMEOUT" : "AI_UNAVAILABLE",
        message: status === 504
          ? "A análise demorou mais do que o esperado. Tente novamente com uma foto mais nítida."
          : "A análise não pôde ser concluída agora. Tente novamente em instantes.",
        requestId,
        retryable: true,
      });
    }

    parsedArgs = openaiResult.parsed?.wine ? (openaiResult.parsed.wine as Record<string, unknown>) : (openaiResult.parsed as Record<string, unknown>);
    console.log(`[${FUNCTION_NAME}] ai_response_received request_id=${requestId} parsed=${Boolean(parsedArgs)}`);

    if (!parsedArgs || typeof parsedArgs !== "object") {
      await logAudit(userId, 422, "parse_error", durationMs, { request_id: requestId, reason: "no_structured_output" });
      return fail(422, {
        success: false,
        code: "PARSE_ERROR",
        message: "Não foi possível interpretar a resposta da análise. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    const parsed = parsedArgs as Record<string, unknown>;
    const wine = (parsed?.wine ?? parsed) as Record<string, unknown>;
    console.log(`[${FUNCTION_NAME}] parsing_step request_id=${requestId} fields=${Object.keys(wine).join(",")}`);

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

    const suspiciousName = hasArtifactToken(normalizedWine.name);
    const suspiciousProducer = hasArtifactToken(normalizedWine.producer);
    const { strongAnchors, weakAnchors } = countWineAnchors(normalizedWine);
    const hasEnoughWineContext = strongAnchors >= 1 || weakAnchors >= 2;
    const hasAnyWineContext = strongAnchors + weakAnchors > 0;
    const regionExplicitlyInvalid = isAbsurdRegionValue(normalizedWine.region);
    const regionMissingButAllowed = !normalizedWine.region || normalizeForMatch(normalizedWine.region) === "";

    if (
      !normalizedWine.name ||
      suspiciousName ||
      suspiciousProducer ||
      !hasEnoughWineContext ||
      !hasAnyWineContext ||
      regionExplicitlyInvalid
    ) {
      await logAudit(userId, 422, "ai_error", durationMs, {
        request_id: requestId,
        reason: "insufficient_or_suspicious_label",
        suspicious_name: suspiciousName,
        suspicious_producer: suspiciousProducer,
        strong_anchors: strongAnchors,
        weak_anchors: weakAnchors,
        region_missing_but_allowed: regionMissingButAllowed,
        region_explicitly_invalid: regionExplicitlyInvalid,
      });
      return fail(422, {
        success: false,
        code: "LABEL_NOT_IDENTIFIED",
        message: "Não foi possível identificar o rótulo com confiança. Tente outra foto, com o rótulo mais centralizado e sem elementos da interface na imagem.",
        requestId,
        retryable: false,
      });
    }

    console.log(`[${FUNCTION_NAME}] final_output request_id=${requestId} wine_name=${normalizedWine.name}`);
    await logAudit(userId, 200, "success", durationMs, {
      request_id: requestId,
      wine_name: normalizedWine.name || "unknown",
      strong_anchors: strongAnchors,
      weak_anchors: weakAnchors,
      region_missing_but_allowed: regionMissingButAllowed,
      region_explicitly_invalid: regionExplicitlyInvalid,
    });

    return ok({ wine: normalizedWine }, requestId);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : "unknown";
    const isAbort = errMsg.toLowerCase().includes("aborted") || errMsg.toLowerCase().includes("abort");
    const isParseOrInferenceIssue =
      errMsg.toLowerCase().includes("json") ||
      errMsg.toLowerCase().includes("parse") ||
      errMsg.toLowerCase().includes("structured") ||
      errMsg.toLowerCase().includes("confidence");

    console.error(`[${FUNCTION_NAME}] request_id=${requestId} user_id=${userId} error=${errMsg}`, error);

    await logAudit(userId, isAbort ? 408 : 500, "internal_error", durationMs, {
      request_id: requestId,
      error: errMsg,
      aborted: isAbort,
    });

    if (isAbort) {
      return fail(408, {
        success: false,
        code: "AI_TIMEOUT",
        message: "A análise demorou mais do que o esperado. Tente novamente com uma foto mais nítida.",
        requestId,
        retryable: true,
      });
    }

    if (isParseOrInferenceIssue) {
      return fail(422, {
        success: false,
        code: "PARSE_ERROR",
        message: "Não foi possível interpretar a resposta da análise. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    return fail(500, {
      success: false,
      code: "INTERNAL_ERROR",
      message: "A análise não pôde ser concluída agora. Tente novamente em instantes.",
      requestId,
      retryable: true,
    });
  }
});
