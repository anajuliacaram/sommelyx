import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { callOpenAIResponses } from "../_shared/openai.ts";
import { enforceAiRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNCTION_NAME = "scan-wine-label";
const MAX_IMAGE_SIZE = 1 * 1024 * 1024;
const AI_TIMEOUT_MS = 35_000;
const DEBUG_MODE = Deno.env.get("SCAN_WINE_LABEL_DEBUG") === "true";

type FailPayload = {
  success: false;
  message: string;
  error?: string;
  code: string;
  requestId: string;
  retryable?: boolean;
};

type ScanLabelRequest = {
  imageBase64?: unknown;
  mimeType?: unknown;
  fileName?: unknown;
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

async function logStep(
  userId: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  requestId: string,
  metadata?: Record<string, unknown>,
) {
  await logAudit(userId, statusCode, outcome, durationMs, {
    request_id: requestId,
    step: outcome,
    ...(metadata || {}),
  });
}

function normalizeBase64(input: string) {
  const trimmed = input.trim();
  const idx = trimmed.indexOf("base64,");
  if (idx !== -1) return trimmed.slice(idx + "base64,".length).trim();
  return trimmed;
}

function isValidBase64(input: string) {
  const cleaned = input.replace(/\s+/g, "");
  if (!cleaned || cleaned.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) return false;
  try {
    atob(cleaned);
    return true;
  } catch {
    return false;
  }
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

function sanitizePreview(value: unknown) {
  if (typeof value === "string") return value.slice(0, 500);
  try {
    return JSON.stringify(value).slice(0, 500);
  } catch {
    return String(value).slice(0, 500);
  }
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

function normalizeCountry(value: unknown) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  const lower = normalizeForMatch(v);
  if (/(brasil|brazil)/.test(lower)) return "Brasil";
  if (/(argentina)/.test(lower)) return "Argentina";
  if (/(chile)/.test(lower)) return "Chile";
  if (/(franca|france)/.test(lower)) return "França";
  if (/(italia|italy)/.test(lower)) return "Itália";
  if (/(portugal)/.test(lower)) return "Portugal";
  if (/(espanha|spain)/.test(lower)) return "Espanha";
  if (/(uruguai|uruguay)/.test(lower)) return "Uruguai";
  if (/(australia|austrália)/.test(lower)) return "Austrália";
  if (/(nova zelandia|new zealand)/.test(lower)) return "Nova Zelândia";
  if (/(eua|usa|estados unidos|united states)/.test(lower)) return "EUA";
  if (/(alemanha|germany)/.test(lower)) return "Alemanha";
  if (/(africa do sul|south africa)/.test(lower)) return "África do Sul";
  if (v.length <= 3 && !/[a-z]/i.test(v)) return null;
  return v;
}

const COUNTRY_BY_PRODUCER: Array<{ pattern: RegExp; country: string }> = [
  { pattern: /casa valduga/i, country: "Brasil" },
  { pattern: /miolo/i, country: "Brasil" },
  { pattern: /salton/i, country: "Brasil" },
  { pattern: /luiz argenta/i, country: "Brasil" },
  { pattern: /catena zapata/i, country: "Argentina" },
  { pattern: /rutini/i, country: "Argentina" },
  { pattern: /zuccardi/i, country: "Argentina" },
  { pattern: /concha y toro/i, country: "Chile" },
  { pattern: /montes/i, country: "Chile" },
  { pattern: /santa rita/i, country: "Chile" },
  { pattern: /cloudy bay/i, country: "Nova Zelândia" },
  { pattern: /villa maria/i, country: "Nova Zelândia" },
  { pattern: /antinori/i, country: "Itália" },
  { pattern: /gaja/i, country: "Itália" },
  { pattern: /ruffino/i, country: "Itália" },
  { pattern: /chateau|château/i, country: "França" },
  { pattern: /baron philippe/i, country: "França" },
  { pattern: /domaine/i, country: "França" },
  { pattern: /vega sicilia/i, country: "Espanha" },
  { pattern: /marques de riscal/i, country: "Espanha" },
];

function inferCountryFromProducer(producer?: string | null) {
  const normalized = normalizeForMatch(producer);
  if (!normalized) return null;
  for (const entry of COUNTRY_BY_PRODUCER) {
    if (entry.pattern.test(normalized) || entry.pattern.test(producer || "")) {
      return entry.country;
    }
  }
  return null;
}

function normalizeGrape(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const lower = normalizeForMatch(raw);
  if (!lower) return null;
  if (/(blend|corte|assemblage|field blend|coupage)/.test(lower)) return "Blend";
  const splitTokens = raw
    .split(/[,&/+]| e | and | com /i)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part.length > 2);
  if (splitTokens.length > 1) return "Blend";

  const knownSingleVarietals = [
    "cabernet sauvignon",
    "cabernet franc",
    "merlot",
    "malbec",
    "pinot noir",
    "syrah",
    "shiraz",
    "tannat",
    "tempranillo",
    "sangiovese",
    "nebbiolo",
    "chardonnay",
    "sauvignon blanc",
    "riesling",
    "pinot grigio",
    "pinot gris",
    "alvarinho",
    "albariño",
    "moscato",
    "moscato",
    "viognier",
    "chenin blanc",
    "verdejo",
    "assyrtiko",
  ];
  const found = knownSingleVarietals.find((varietal) => lower.includes(varietal));
  if (!found) return null;
  const explicitSingleMarkers = /(100%|100 pct|100 por cento|monovarietal|single varietal|varietal único|varietal unico)/.test(lower);
  if (explicitSingleMarkers) {
    return toTitleCase(found);
  }
  if (normalizeForMatch(raw) === found) {
    return toTitleCase(found);
  }
  if (splitTokens.length === 1 && normalizeForMatch(splitTokens[0]).includes(found)) {
    return toTitleCase(found);
  }
  return null;
}

function grapeConfidence(rawGrape: unknown, normalizedGrape: string | null) {
  const raw = typeof rawGrape === "string" ? rawGrape.trim() : "";
  if (!raw || !normalizedGrape) return 0;
  const lower = normalizeForMatch(raw);
  const normalizedLower = normalizeForMatch(normalizedGrape);
  const hasBlendSignal = /(blend|corte|assemblage|field blend|coupage)/.test(lower) || /[,/&+]|\be\b|\band\b|\bcom\b/i.test(raw);
  const explicitSingleMarkers = /(100%|100 pct|100 por cento|monovarietal|single varietal|varietal único|varietal unico)/.test(lower);

  if (normalizedGrape === "Blend") {
    return confidenceBucket(hasBlendSignal ? 0.85 : 0.78);
  }

  if (explicitSingleMarkers || lower === normalizedLower) {
    return confidenceBucket(0.92);
  }

  if (!hasBlendSignal && lower.includes(normalizedLower)) {
    return confidenceBucket(0.69);
  }

  return 0;
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

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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

function confidenceBucket(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function fieldConfidenceForString(value?: string | null, explicit = false) {
  if (!value || !value.trim()) return 0;
  return confidenceBucket(explicit ? 0.92 : 0.78);
}

function fieldConfidenceForNullable(value?: unknown, confidence = 0.8) {
  if (value == null || value === "") return 0;
  return confidenceBucket(confidence);
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
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization")!,
          },
        },
      },
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    const validatedUserId = user?.id;
    if (error || !validatedUserId) {
      console.error(`[${FUNCTION_NAME}] step: auth_failed request_id=${requestId}`, error);
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        reason: "invalid_token",
        auth_error: sanitizePreview(error),
      });
      return fail(401, {
        success: false,
        code: "AUTH_INVALID",
        message: "Sua sessão expirou. Faça login novamente para continuar.",
        requestId,
        retryable: false,
      });
    }

    userId = validatedUserId;
    console.log(`[${FUNCTION_NAME}] step: auth_ok request_id=${requestId} user_id=${userId}`);
    const rateLimit = await enforceAiRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logAudit(userId, 429, "rate_limited", Date.now() - startTime, {
        request_id: requestId,
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
      });
      return fail(429, {
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Limite de uso atingido. Tente novamente em breve.",
        requestId,
        retryable: true,
      });
    }

    let payload: ScanLabelRequest = {};
    try {
      payload = await req.json();
    } catch (parseError) {
      console.error(`[${FUNCTION_NAME}] step: request_json_failed request_id=${requestId}`, parseError);
      await logStep(userId, 400, "request_json_failed", Date.now() - startTime, requestId, {
        reason: "invalid_json",
        error: sanitizePreview(parseError),
      });
      return fail(400, {
        success: false,
        code: "INVALID_REQUEST",
        message: "Não foi possível ler sua solicitação. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    const imageBase64Raw = payload?.imageBase64;
    const payloadMimeType = typeof payload?.mimeType === "string" ? payload.mimeType.trim() : null;
    const payloadFileName = typeof payload?.fileName === "string" ? payload.fileName.trim() : null;
    console.log(`[${FUNCTION_NAME}] step: request_received request_id=${requestId} auth_present=${Boolean(authorization)} payload_keys=${Object.keys(payload || {}).join(",") || "none"} mime=${payloadMimeType || "unknown"} file=${payloadFileName || "unknown"} image_base64_length=${typeof imageBase64Raw === "string" ? imageBase64Raw.length : 0}`);
    if (!imageBase64Raw || typeof imageBase64Raw !== "string") {
      await logStep(userId, 400, "image_missing", Date.now() - startTime, requestId, { reason: "missing_image" });
      return fail(400, {
        success: false,
        code: "INVALID_IMAGE",
        message: "Envie uma foto do rótulo para analisar.",
        requestId,
        retryable: false,
      });
    }

    const parsedImage = parseImageDataUrl(imageBase64Raw);
    const imageMime = payloadMimeType || parsedImage.mime;
    const imageBase64 = normalizeBase64(parsedImage.base64);
    console.log(`[${FUNCTION_NAME}] step: image_normalized request_id=${requestId} mime=${imageMime} base64_length=${imageBase64.length}`);
    const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
    const sizeBytes = Math.floor((imageBase64.length * 3) / 4);
    console.log(`[${FUNCTION_NAME}] step: image_size_checked request_id=${requestId} size_bytes=${sizeBytes}`);

    if (!imageMime.startsWith("image/")) {
      console.error(`[${FUNCTION_NAME}] step: image_invalid request_id=${requestId} mime=${imageMime} base64_length=${imageBase64.length}`);
      await logStep(userId, 400, "image_invalid", Date.now() - startTime, requestId, {
        request_id: requestId,
        reason: "invalid_image_mime",
        image_mime: imageMime,
        base64_length: imageBase64.length,
        file_name: payloadFileName,
      });
      return fail(400, {
        success: false,
        code: "INVALID_IMAGE",
        message: "Arquivo inválido. Envie uma imagem legível do rótulo.",
        requestId,
        retryable: false,
      });
    }

    if (!base64Regex.test(imageBase64) || !isValidBase64(imageBase64)) {
      console.error(`[${FUNCTION_NAME}] step: image_base64_invalid request_id=${requestId} mime=${imageMime} base64_length=${imageBase64.length}`);
      await logStep(userId, 400, "image_base64_invalid", Date.now() - startTime, requestId, {
        request_id: requestId,
        reason: "invalid_image_base64",
        image_mime: imageMime,
        base64_length: imageBase64.length,
        file_name: payloadFileName,
      });
      return fail(400, {
        success: false,
        code: "INVALID_IMAGE_BASE64",
        message: "Arquivo inválido. Envie uma imagem legível do rótulo.",
        requestId,
        retryable: false,
      });
    }

    if (sizeBytes > MAX_IMAGE_SIZE) {
      console.error(`[${FUNCTION_NAME}] step: image_too_large request_id=${requestId} size_bytes=${sizeBytes}`);
      await logStep(userId, 413, "image_too_large", Date.now() - startTime, requestId, {
        reason: "image_too_large",
        size_bytes: sizeBytes,
        file_name: payloadFileName,
      });
      return fail(413, {
        success: false,
        code: "IMAGE_TOO_LARGE",
        message: "A imagem está muito grande. Tente novamente com uma foto mais leve.",
        requestId,
        retryable: false,
      });
    }

    console.log(`[${FUNCTION_NAME}] step: image_received request_id=${requestId} mime=${imageMime} size_bytes=${sizeBytes} base64_length=${imageBase64.length}`);
    await logStep(userId, 200, "image_received", Date.now() - startTime, requestId, {
      image_mime: imageMime,
      file_name: payloadFileName,
      base64_length: imageBase64.length,
      size_bytes: sizeBytes,
    });
    console.log(`[${FUNCTION_NAME}] step: image_validated request_id=${requestId} mime=${imageMime} size_bytes=${sizeBytes} base64_length=${imageBase64.length}`);
    await logStep(userId, 200, "image_validated", Date.now() - startTime, requestId, {
      image_mime: imageMime,
      file_name: payloadFileName,
      base64_length: imageBase64.length,
      size_bytes: sizeBytes,
    });

    const AI_MODEL = Deno.env.get("SCAN_WINE_LABEL_MODEL")?.trim() || "gpt-4o-mini";
    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    if (!openaiKey) {
      console.error(`[${FUNCTION_NAME}] step: ai_config_missing request_id=${requestId} missing=OPENAI_API_KEY`);
      await logStep(userId, 500, "ai_config_missing", Date.now() - startTime, requestId, {
        reason: "missing_openai_api_key",
        model: AI_MODEL,
      });
      return fail(502, {
        success: false,
        code: "AI_UNAVAILABLE",
        message: "Service temporarily unavailable",
        requestId,
        retryable: true,
      });
    }

    console.log(`[${FUNCTION_NAME}] step: ai_request_started request_id=${requestId} model=${AI_MODEL} image_size_bytes=${sizeBytes}`);

    const systemPrompt =
      `Você é um especialista em leitura de rótulos de vinho. Analise a imagem do rótulo e extraia SOMENTE informações que estejam EXPLICITAMENTE VISÍVEIS no rótulo.\n\n` +
      `Regras CRÍTICAS:\n` +
      `- Extraia APENAS texto que esteja impresso/escrito no rótulo da garrafa.\n` +
      `- NÃO INFIRA, NÃO ADIVINHE, NÃO DEDUZA informações que não estejam escritas no rótulo.\n` +
      `- Se o país NÃO está escrito no rótulo, retorne country como null. NÃO tente adivinhar baseado no nome do vinho ou produtor.\n` +
      `- Se a região NÃO está escrita no rótulo, retorne region como null. NÃO tente adivinhar.\n` +
      `- Se a uva NÃO está escrita no rótulo, retorne grape como null. NÃO associe "Malbec" automaticamente a "Mendoza" por exemplo.\n` +
      `- Se mais de uma uva aparecer no rótulo, retorne grape como "Blend".\n` +
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
      model: AI_MODEL,
      timeoutMs: AI_TIMEOUT_MS,
      temperature: 0.1,
      instructions: systemPrompt,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Analise este rótulo de vinho e extraia todas as informações possíveis." },
            { type: "input_image", image_url: `data:${imageMime};base64,${imageBase64}`, detail: "auto" },
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
            required: [
              "name",
              "producer",
              "vintage",
              "style",
              "country",
              "region",
              "grape",
              "food_pairing",
              "tasting_notes",
              "cellar_location",
              "purchase_price",
              "drink_from",
              "drink_until",
            ],
            additionalProperties: true,
          },
        },
        required: ["wine"],
        additionalProperties: true,
      },
      maxOutputTokens: 280,
    });

    const durationMs = Date.now() - startTime;

    if (!openaiResult.ok) {
      responsePreview = sanitizePreview(openaiResult.raw || openaiResult.error);
      const status = openaiResult.status;
      const timedOut = status === 504 || String(openaiResult.error).toLowerCase().includes("timeout");
      const parseFailed = status === 422 || openaiResult.error === "INVALID_AI_RESPONSE" || openaiResult.error === "EMPTY_AI_RESPONSE";
      const code = timedOut ? "AI_TIMEOUT" : parseFailed ? "AI_PARSE_ERROR" : "AI_UNAVAILABLE";
      const message = timedOut
        ? "A análise demorou mais do que o esperado. Tente novamente com uma foto mais nítida."
        : "Service temporarily unavailable";
      console.error(`[${FUNCTION_NAME}] step: ai_failed request_id=${requestId} status=${status} code=${code} preview=${responsePreview}`);
      await logStep(userId, timedOut ? 408 : 502, "ai_failed", durationMs, requestId, {
        ai_status: status,
        ai_error: sanitizePreview(openaiResult.error),
        ai_response_preview: responsePreview,
        timed_out: timedOut,
        parse_failed: parseFailed,
      });
      return fail(timedOut ? 408 : 502, {
        success: false,
        code,
        message,
        requestId,
        retryable: true,
      });
    }

    console.log(`[${FUNCTION_NAME}] step: ai_response_received request_id=${requestId} raw=${DEBUG_MODE ? sanitizePreview(openaiResult.raw) : "hidden"}`);
    console.log(`[${FUNCTION_NAME}] step: parse_started request_id=${requestId} awaiting_structured_output`);

    try {
      parsedArgs = openaiResult.parsed?.wine ? (openaiResult.parsed.wine as Record<string, unknown>) : (openaiResult.parsed as Record<string, unknown>);
    } catch (parseError) {
      console.error(`[${FUNCTION_NAME}] step: parse_failed request_id=${requestId}`, parseError);
      await logStep(userId, 422, "parse_failed", durationMs, requestId, {
        reason: "structured_parse_failed",
        error: sanitizePreview(parseError),
        raw_preview: DEBUG_MODE ? sanitizePreview(openaiResult.raw) : undefined,
      });
      return fail(422, {
        success: false,
        code: "AI_PARSE_ERROR",
        message: "Não foi possível interpretar a resposta da análise. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    if (!parsedArgs || typeof parsedArgs !== "object") {
      console.error(`[${FUNCTION_NAME}] step: parse_failed request_id=${requestId} reason=no_structured_output`);
      await logStep(userId, 422, "parse_failed", durationMs, requestId, {
        reason: "no_structured_output",
        raw_preview: DEBUG_MODE ? sanitizePreview(openaiResult.raw) : undefined,
      });
      return fail(422, {
        success: false,
        code: "AI_PARSE_ERROR",
        message: "Não foi possível interpretar a resposta da análise. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    const parsed = parsedArgs as Record<string, unknown>;
    const wine = (parsed?.wine ?? parsed) as Record<string, unknown>;
    console.log(`[${FUNCTION_NAME}] step: parse_succeeded request_id=${requestId} fields=${Object.keys(wine).join(",")} parsed_preview=${DEBUG_MODE ? sanitizePreview(parsed) : "hidden"}`);
    await logStep(userId, 200, "parse_succeeded", durationMs, requestId, {
      parsed_fields: Object.keys(wine),
    });

    const rawName = typeof wine.name === "string" ? wine.name.trim() : null;
    const rawProducer = typeof wine.producer === "string" ? wine.producer.trim() : null;
    const rawCountry = typeof wine.country === "string" ? wine.country.trim() : null;
    const rawRegion = typeof wine.region === "string" ? wine.region.trim() : null;
    const rawGrape = typeof wine.grape === "string" ? wine.grape.trim() : null;
    const canonicalCountry = normalizeCountry(rawCountry) || inferCountryFromProducer(rawProducer);
    const normalizedRegion = rawRegion && !isAbsurdRegionValue(rawRegion) ? rawRegion : null;
    const normalizedGrape = normalizeGrape(rawGrape);
    const hasExplicitCountry = Boolean(rawCountry && normalizeCountry(rawCountry));
    const hasMappedCountry = Boolean(!hasExplicitCountry && canonicalCountry && rawProducer);
    const countryConfidence = hasExplicitCountry ? 0.92 : hasMappedCountry ? 0.82 : 0;
    const regionConfidence = normalizedRegion ? 0.82 : 0;
    const grapeFieldConfidence = grapeConfidence(rawGrape, normalizedGrape);

    const normalizedWine = {
      name: rawName,
      producer: rawProducer,
      vintage: normalizeNumber(wine.vintage),
      style: normalizeStyle(wine.style),
      country: countryConfidence >= 0.7 ? canonicalCountry ?? null : null,
      region: regionConfidence >= 0.7 ? normalizedRegion : null,
      grape: grapeFieldConfidence >= 0.7 ? normalizedGrape : null,
      food_pairing: typeof wine.food_pairing === "string" ? wine.food_pairing.trim() : null,
      tasting_notes: typeof wine.tasting_notes === "string" ? wine.tasting_notes.trim() : null,
      cellar_location: typeof wine.cellar_location === "string" ? wine.cellar_location.trim() : null,
      purchase_price: normalizeNumber(wine.purchase_price),
      drink_from: normalizeNumber(wine.drink_from),
      drink_until: normalizeNumber(wine.drink_until),
    };

    const fieldConfidence = {
      name: fieldConfidenceForString(normalizedWine.name, true),
      producer: fieldConfidenceForString(normalizedWine.producer, true),
      vintage: fieldConfidenceForNullable(normalizedWine.vintage, 0.85),
      style: fieldConfidenceForNullable(normalizedWine.style, 0.82),
      country: countryConfidence,
      region: regionConfidence,
      grape: grapeFieldConfidence,
      food_pairing: fieldConfidenceForNullable(normalizedWine.food_pairing, 0.72),
      tasting_notes: fieldConfidenceForNullable(normalizedWine.tasting_notes, 0.72),
      cellar_location: fieldConfidenceForNullable(normalizedWine.cellar_location, 0.65),
      purchase_price: fieldConfidenceForNullable(normalizedWine.purchase_price, 0.7),
      drink_from: fieldConfidenceForNullable(normalizedWine.drink_from, 0.7),
      drink_until: fieldConfidenceForNullable(normalizedWine.drink_until, 0.7),
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
      console.error(`[${FUNCTION_NAME}] step: parse_failed request_id=${requestId} reason=insufficient_or_suspicious_label`);
      await logStep(userId, 422, "parse_failed", durationMs, requestId, {
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
    await logStep(userId, 200, "success", durationMs, requestId, {
      wine_name: normalizedWine.name || "unknown",
      strong_anchors: strongAnchors,
      weak_anchors: weakAnchors,
      region_missing_but_allowed: regionMissingButAllowed,
      region_explicitly_invalid: regionExplicitlyInvalid,
    });

    return ok({ wine: normalizedWine, confidence: fieldConfidence }, requestId);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : "unknown";
    const stack = error instanceof Error ? error.stack : undefined;
    const lower = errMsg.toLowerCase();
    const isAbort = lower.includes("aborted") || lower.includes("abort") || lower.includes("timeout");
    const isParseOrInferenceIssue = lower.includes("json") || lower.includes("parse") || lower.includes("structured") || lower.includes("confidence");
    const code = isAbort ? "AI_TIMEOUT" : isParseOrInferenceIssue ? "AI_PARSE_ERROR" : "AI_UNAVAILABLE";

    console.error(`[${FUNCTION_NAME}] step: fatal_error request_id=${requestId} user_id=${userId} code=${code} error=${errMsg}`, error);

    await logStep(userId, isAbort ? 408 : 500, "fatal_error", durationMs, requestId, {
      error: sanitizePreview(errMsg),
      stack: DEBUG_MODE ? sanitizePreview(stack) : undefined,
      aborted: isAbort,
      parse_or_inference_issue: isParseOrInferenceIssue,
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
        code: "AI_PARSE_ERROR",
        message: "Não foi possível interpretar a resposta da análise. Tente novamente.",
        requestId,
        retryable: true,
      });
    }

    return fail(502, {
      success: false,
      code: "AI_UNAVAILABLE",
      message: "Service temporarily unavailable",
      requestId,
      retryable: true,
    });
  }
});
