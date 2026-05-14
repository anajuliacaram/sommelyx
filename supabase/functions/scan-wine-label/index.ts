import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { callOpenAIResponses } from "../_shared/openai.ts";
import { createCorsHeaders, makeCorsResponse } from "../_shared/cors.ts";
import { getCachedAiResponse, setCachedAiResponse, sha256Hex } from "../_shared/ai-cache.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { INVALID_INPUT_ERROR, validateImagePayload } from "../_shared/payload-validation.ts";


const FUNCTION_NAME = "scan-wine-label";
const MAX_IMAGE_SIZE = 1 * 1024 * 1024;
const AI_TIMEOUT_MS = 24_000;
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

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  return makeCorsResponse(req, JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function ok<T extends Record<string, unknown>>(req: Request, data: T, requestId: string) {
  void requestId;
  return jsonResponse(req, 200, data);
}

function fail(req: Request, status: number, payload: FailPayload) {
  return jsonResponse(req, status, payload);
}

function validationFailureToResponse(reason?: string) {
  switch (reason) {
    case "invalid_base64":
      return { status: 400, code: "INVALID_IMAGE_BASE64", message: "A imagem enviada não pôde ser lida corretamente." };
    case "payload_too_large":
      return { status: 413, code: "FILE_TOO_LARGE", message: "A imagem está muito grande. Tente uma foto mais leve." };
    case "unsupported_mime_type":
      return { status: 415, code: "UNSUPPORTED_IMAGE_FORMAT", message: "Formato de imagem não suportado." };
    case "missing_mime_type":
      return { status: 400, code: "INVALID_IMAGE", message: "Formato da imagem ausente ou inválido." };
    default:
      return { status: 400, code: "INVALID_IMAGE", message: "Arquivo de imagem inválido." };
  }
}

function extractCanonicalWineResponse(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const wine = source.wine && typeof source.wine === "object" ? source.wine as Record<string, unknown> : source;

  return {
    name: typeof wine.name === "string" ? wine.name.trim() : "",
    producer: typeof wine.producer === "string" ? wine.producer.trim() || null : null,
    country: typeof wine.country === "string" ? wine.country.trim() || null : null,
    region: typeof wine.region === "string" ? wine.region.trim() || null : null,
    grape: typeof wine.grape === "string" ? wine.grape.trim() || null : null,
    vintage: normalizeNumber(wine.vintage),
    style: normalizeStyle(wine.style),
    drink_from: normalizeNumber(wine.drink_from),
    drink_until: normalizeNumber(wine.drink_until),
    estimated_price: normalizeNumber(wine.estimated_price),
    purchase_price: normalizeNumber(wine.purchase_price),
    food_pairing: typeof wine.food_pairing === "string" ? wine.food_pairing.trim() || null : null,
    cellar_location: typeof wine.cellar_location === "string" ? wine.cellar_location.trim() || null : null,
  };
}

function adminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
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

function normalizeOcrText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function isGenericLabelValue(value: unknown) {
  const normalized = normalizeForMatch(value);
  return (
    !normalized ||
    normalized === "nao identificado" ||
    normalized === "vinho nao identificado" ||
    normalized === "vinho sem nome" ||
    normalized === "wine without name" ||
    normalized === "unidentified" ||
    normalized === "unknown" ||
    /^linha [a-z0-9]+$/.test(normalized)
  );
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

function hasValidWineExtraction(wine: Record<string, unknown>) {
  const hasName = typeof wine.name === "string" && wine.name.trim() && !isGenericLabelValue(wine.name) && !hasArtifactToken(wine.name);
  const hasProducer = typeof wine.producer === "string" && wine.producer.trim() && !isGenericLabelValue(wine.producer) && !hasArtifactToken(wine.producer);
  const strongAnchors = [
    wine.country,
    wine.region,
    wine.grape,
  ].filter((value) => {
    return typeof value === "string" && value.trim() && !isGenericLabelValue(value) && !hasArtifactToken(value);
  }).length;
  const supportingAnchors = [
    wine.vintage,
    wine.style,
  ].filter((value) => {
    if (typeof value === "number") return Number.isFinite(value);
    return typeof value === "string" && value.trim() && !isGenericLabelValue(value) && !hasArtifactToken(value);
  }).length;
  return Boolean(hasName || hasProducer || (strongAnchors >= 1 && strongAnchors + supportingAnchors >= 2));
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
    const client = adminClient();
    if (!client) return;
    await client.from("edge_function_logs").insert({
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
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "anonymous";
  const requestId = req.headers.get("X-Client-Request-Id") || crypto.randomUUID();
  let sizeBytes = 0;
  let imageMime = "";
  let imageBase64 = "";
  let payloadFileName: string | null = null;

  try {
    const authorization = req.headers.get("Authorization");
    console.info(`[${FUNCTION_NAME}] step: auth_status request_id=${requestId} auth_present=${Boolean(authorization)}`);
    if (!authorization) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        reason: "missing_or_invalid_authorization_header",
        input_size_bytes: 0,
        error_type: "AUTH_REQUIRED",
      });
      return fail(req, 401, {
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
        input_size_bytes: 0,
        error_type: "AUTH_INVALID",
      });
      return fail(req, 401, {
        success: false,
        code: "AUTH_INVALID",
        message: "Sua sessão expirou. Faça login novamente para continuar.",
        requestId,
        retryable: false,
      });
    }

    userId = validatedUserId;
    console.log(`[${FUNCTION_NAME}] step: auth_ok request_id=${requestId} user_id=${userId}`);
    let payload: ScanLabelRequest = {};
    try {
      payload = await req.json();
    } catch (parseError) {
      console.error(`[${FUNCTION_NAME}] step: request_json_failed request_id=${requestId}`, parseError);
      await logStep(userId, 400, "request_json_failed", Date.now() - startTime, requestId, {
        reason: "invalid_json",
        error: sanitizePreview(parseError),
        input_size_bytes: 0,
        error_type: "PARSE_ERROR",
      });
      return fail(req, 400, {
        success: false,
        code: INVALID_INPUT_ERROR.code,
        message: INVALID_INPUT_ERROR.message,
        requestId,
        retryable: true,
      });
    }

    const imageBase64Raw = payload?.imageBase64;
    const payloadMimeType = typeof payload?.mimeType === "string" ? payload.mimeType.trim() : null;
    payloadFileName = typeof payload?.fileName === "string" ? payload.fileName.trim() : null;
    console.info(`[${FUNCTION_NAME}] step: request_received request_id=${requestId} auth_present=${Boolean(authorization)} payload_keys=${Object.keys(payload || {}).join(",") || "none"} mime=${payloadMimeType || "unknown"} file=${payloadFileName || "unknown"} image_base64_length=${typeof imageBase64Raw === "string" ? imageBase64Raw.length : 0}`);
    if (!imageBase64Raw || typeof imageBase64Raw !== "string") {
      await logStep(userId, 400, "image_missing", Date.now() - startTime, requestId, {
        reason: "missing_image",
        input_size_bytes: 0,
        error_type: "INVALID_IMAGE",
      });
      return fail(req, 400, {
        success: false,
        code: "INVALID_IMAGE",
        message: "Arquivo de imagem inválido.",
        requestId,
        retryable: false,
      });
    }

    let validation;
    try {
      validation = validateImagePayload(imageBase64Raw, payloadMimeType, { maxBytes: MAX_IMAGE_SIZE });
    } catch (validationError) {
      console.error(`[${FUNCTION_NAME}] step: image_validation_failed request_id=${requestId}`, validationError);
      await logStep(userId, 400, "image_invalid", Date.now() - startTime, requestId, {
        request_id: requestId,
        reason: "validation_exception",
        file_name: payloadFileName,
        input_size_bytes: 0,
        error_type: "INVALID_IMAGE",
      });
      return fail(req, 400, {
        success: false,
        code: "INVALID_IMAGE",
        message: "Arquivo de imagem inválido.",
        requestId,
        retryable: false,
      });
    }
    const validationResult = validation.ok
      ? {
          ok: true,
          mimeType: validation.mimeType,
          base64Length: validation.base64.length,
          byteLength: validation.byteLength,
        }
      : {
          ok: false,
          reason: validation.reason,
          ...validationFailureToResponse(validation.reason),
        };
    console.info(`[${FUNCTION_NAME}] step: validation_result request_id=${requestId} ok=${validationResult.ok} reason=${validation.ok ? "valid" : validation.reason} mime=${payloadMimeType || "unknown"} base64_length=${typeof imageBase64Raw === "string" ? imageBase64Raw.length : 0}`);
    if (!validation.ok) {
      const failure = validationFailureToResponse(validation.reason);
      console.error(`[${FUNCTION_NAME}] step: image_invalid request_id=${requestId} final_error_code=${failure.code} reason=${validation.reason}`);
      await logStep(userId, failure.status, "image_invalid", Date.now() - startTime, requestId, {
        request_id: requestId,
        reason: validation.reason,
        file_name: payloadFileName,
        input_size_bytes: 0,
        error_type: failure.code,
      });
      return fail(req, failure.status, {
        success: false,
        code: failure.code,
        message: failure.message,
        requestId,
        retryable: failure.status >= 500 || failure.status === 429,
      });
    }

    imageMime = validation.mimeType;
    imageBase64 = validation.base64;
    sizeBytes = validation.byteLength;
    console.info(`[${FUNCTION_NAME}] step: image_normalized request_id=${requestId} mime=${imageMime} base64_length=${imageBase64.length}`);
    console.info(`[${FUNCTION_NAME}] step: image_size_checked request_id=${requestId} size_bytes=${sizeBytes}`);

    console.info(`[${FUNCTION_NAME}] step: image_received request_id=${requestId} mime=${imageMime} size_bytes=${sizeBytes} base64_length=${imageBase64.length}`);
    await logStep(userId, 200, "image_received", Date.now() - startTime, requestId, {
      image_mime: imageMime,
      file_name: payloadFileName,
      base64_length: imageBase64.length,
      size_bytes: sizeBytes,
      input_size_bytes: sizeBytes,
      error_type: null,
    });
    console.info(`[${FUNCTION_NAME}] step: image_validated request_id=${requestId} mime=${imageMime} size_bytes=${sizeBytes} base64_length=${imageBase64.length}`);
    await logStep(userId, 200, "image_validated", Date.now() - startTime, requestId, {
      image_mime: imageMime,
      file_name: payloadFileName,
      base64_length: imageBase64.length,
      size_bytes: sizeBytes,
      input_size_bytes: sizeBytes,
      error_type: null,
    });

    const cacheInput = {
      imageHash: await sha256Hex(imageBase64),
      mimeType: imageMime,
    };
    const cached = await getCachedAiResponse<unknown>(
      FUNCTION_NAME,
      cacheInput,
      { userId },
    );
    if (cached.hit && cached.payload) {
      console.log(`[${FUNCTION_NAME}] step: cache_hit request_id=${requestId} input_hash=${cached.inputHash}`);
      const cachedWine = extractCanonicalWineResponse(cached.payload);
      if (!hasValidWineExtraction(cachedWine)) {
        console.warn(`[${FUNCTION_NAME}] [SCAN FAILURE REASON] request_id=${requestId} reason=cached_payload_invalid`);
        await logAudit(userId, 422, "cached_payload_invalid", Date.now() - startTime, {
          request_id: requestId,
          file_name: payloadFileName,
          image_mime: imageMime,
          input_size_bytes: sizeBytes,
          error_type: "LABEL_NOT_IDENTIFIED",
        });
        return fail(req, 422, {
          success: false,
          code: "LABEL_NOT_IDENTIFIED",
          message: "Não foi possível identificar esse rótulo com segurança.",
          requestId,
          retryable: true,
        });
      }
      await logAudit(userId, 200, "cache_hit", Date.now() - startTime, {
        request_id: requestId,
        file_name: payloadFileName,
        image_mime: imageMime,
        input_size_bytes: sizeBytes,
        error_type: null,
      });
      return ok(req, cachedWine, requestId);
    }
    console.log(`[${FUNCTION_NAME}] step: cache_miss request_id=${requestId} input_hash=${cached.inputHash} degraded=${cached.degraded}`);

    const rateLimit = await checkRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logAudit(userId, 429, "rate_limited", Date.now() - startTime, {
        request_id: requestId,
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
        input_size_bytes: sizeBytes,
        error_type: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
      });
      return fail(req, rateLimit.degraded ? 503 : 429, {
        success: false,
        code: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
        message: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
        requestId,
        retryable: true,
      });
    }

    const AI_MODEL = Deno.env.get("SCAN_WINE_LABEL_MODEL")?.trim() || "gpt-4o-mini";
    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    if (!openaiKey) {
      console.error(`[${FUNCTION_NAME}] step: ai_config_missing request_id=${requestId} missing=OPENAI_API_KEY`);
      await logStep(userId, 500, "ai_config_missing", Date.now() - startTime, requestId, {
        reason: "missing_openai_api_key",
        model: AI_MODEL,
        input_size_bytes: sizeBytes,
        error_type: "AI_UNAVAILABLE",
      });
      return fail(req, 502, {
        success: false,
        code: "AI_UNAVAILABLE",
        message: "Service temporarily unavailable",
        requestId,
        retryable: true,
      });
    }

    console.info(`[${FUNCTION_NAME}] step: ai_request_started request_id=${requestId} model=${AI_MODEL} image_size_bytes=${sizeBytes}`);

    const ocrPrompt =
      `Você é um OCR técnico para rótulos de vinho.\n` +
      `Transcreva SOMENTE texto realmente visível na imagem, preservando quebras de linha úteis.\n` +
      `Ignore interface, notificações, nome de aparelho, marcas d'água e elementos fora do rótulo.\n` +
      `Não corrija para marcas famosas, não complete palavras incertas e não invente texto.\n` +
      `Se não houver texto legível, retorne ocr_text como string vazia e confidence baixo.`;

    const ocrResult = await callOpenAIResponses<{ ocr_text: string; text_blocks: string[]; confidence: number }>({
      functionName: `${FUNCTION_NAME}-ocr`,
      requestId,
      model: AI_MODEL,
      timeoutMs: AI_TIMEOUT_MS,
      temperature: 0,
      instructions: ocrPrompt,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Transcreva o texto visível no rótulo desta garrafa." },
            { type: "input_image", image_url: `data:${imageMime};base64,${imageBase64}`, detail: "high" },
          ],
        },
      ],
      schema: {
        type: "object",
        properties: {
          ocr_text: { type: "string" },
          text_blocks: { type: "array", items: { type: "string" } },
          confidence: { type: "number" },
        },
        required: ["ocr_text", "text_blocks", "confidence"],
        additionalProperties: false,
      },
      maxOutputTokens: 700,
    });

    if (!ocrResult.ok) {
      const status = ocrResult.status;
      const timedOut = status === 504 || String(ocrResult.error).toLowerCase().includes("timeout");
      const code = timedOut ? "AI_TIMEOUT" : "OCR_FAILED";
      console.error(`[${FUNCTION_NAME}] [SCAN FAILURE REASON] request_id=${requestId} reason=ocr_failed code=${code} status=${status} preview=${sanitizePreview(ocrResult.raw || ocrResult.error)}`);
      await logStep(userId, timedOut ? 408 : 502, "ocr_failed", Date.now() - startTime, requestId, {
        ai_status: status,
        ai_error: sanitizePreview(ocrResult.error),
        ai_response_preview: sanitizePreview(ocrResult.raw),
        input_size_bytes: sizeBytes,
        error_type: code,
      });
      return fail(req, timedOut ? 408 : 502, {
        success: false,
        code,
        message: timedOut ? "A análise demorou muito. Tente novamente." : "Não foi possível aplicar OCR neste rótulo.",
        requestId,
        retryable: true,
      });
    }

    const ocrText = normalizeOcrText(ocrResult.parsed?.ocr_text);
    const ocrConfidence = confidenceBucket(Number(ocrResult.parsed?.confidence));
    console.info(`[${FUNCTION_NAME}] [SCAN RAW OCR] request_id=${requestId} confidence=${ocrConfidence} text=${DEBUG_MODE ? sanitizePreview(ocrText) : `[len=${ocrText.length}]`}`);

    if (!ocrText || ocrText.length < 4 || ocrConfidence < 0.2) {
      console.warn(`[${FUNCTION_NAME}] [SCAN FAILURE REASON] request_id=${requestId} reason=ocr_low_confidence confidence=${ocrConfidence} text_length=${ocrText.length}`);
      await logStep(userId, 422, "ocr_low_confidence", Date.now() - startTime, requestId, {
        ocr_confidence: ocrConfidence,
        ocr_text_length: ocrText.length,
        input_size_bytes: sizeBytes,
        error_type: "OCR_LOW_CONFIDENCE",
      });
      return fail(req, 422, {
        success: false,
        code: "OCR_LOW_CONFIDENCE",
        message: "Não foi possível ler texto suficiente no rótulo.",
        requestId,
        retryable: true,
      });
    }

    const systemPrompt =
      `Você é um especialista em extração estruturada de rótulos de vinho a partir de OCR.\n\n` +
      `Regras CRÍTICAS:\n` +
      `- Use o OCR fornecido como fonte primária e extraia APENAS informações ancoradas nele.\n` +
      `- Use a imagem apenas para conferir leitura, nunca para inventar campos ausentes.\n` +
      `- NÃO INFIRA, NÃO ADIVINHE, NÃO DEDUZA informações que não estejam escritas no OCR/rótulo.\n` +
      `- Se o país NÃO está escrito, retorne country como null. NÃO tente adivinhar baseado no nome do vinho ou produtor.\n` +
      `- Se a região NÃO está escrita, retorne region como null. NÃO tente adivinhar.\n` +
      `- Se a uva NÃO está escrita, retorne grape como null. NÃO associe "Malbec" automaticamente a "Mendoza" por exemplo.\n` +
      `- Se mais de uma uva aparecer no rótulo, retorne grape como "Blend".\n` +
      `- Se a safra NÃO está escrita, retorne vintage como null.\n` +
      `- "style" deve ser: tinto, branco, rose, espumante, sobremesa, fortificado. Use null se não estiver escrito ou visualmente claro.\n` +
      `- País em português (França, Itália, Argentina, Portugal, Espanha, Chile etc) somente se estiver indicado no OCR/rótulo.\n` +
      `- tasting_notes e food_pairing devem ser null, exceto se houver texto explícito no rótulo que sustente isso.\n` +
      `- name pode ser string vazia se o nome do vinho não estiver legível; não use placeholders.\n` +
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
            { type: "input_text", text: `OCR bruto do rótulo:\n${ocrText}` },
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
              producer: { type: ["string", "null"] },
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
            additionalProperties: false,
          },
        },
        required: ["wine"],
        additionalProperties: false,
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
      console.error(`[${FUNCTION_NAME}] step: ai_failed request_id=${requestId} status=${status} final_error_code=${code} preview=${responsePreview}`);
      await logStep(userId, timedOut ? 408 : 502, "extraction_failed", durationMs, requestId, {
        ai_status: status,
        ai_error: sanitizePreview(openaiResult.error),
        ai_response_preview: responsePreview,
        timed_out: timedOut,
        parse_failed: parseFailed,
        step_failed: "ai_failed",
        error_code: code,
      });
      return fail(req, timedOut ? 408 : parseFailed ? 422 : 502, {
        success: false,
        code,
        message: timedOut ? "A análise demorou muito. Tente novamente." : "Não foi possível extrair dados confiáveis deste rótulo.",
        requestId,
        retryable: true,
      });
    }

    console.info(`[${FUNCTION_NAME}] step: ai_response_received request_id=${requestId} ok=true raw=${DEBUG_MODE ? sanitizePreview(openaiResult.raw) : "hidden"}`);
    console.info(`[${FUNCTION_NAME}] step: parse_started request_id=${requestId} awaiting_structured_output`);

    try {
      parsedArgs = openaiResult.parsed?.wine ? (openaiResult.parsed.wine as Record<string, unknown>) : (openaiResult.parsed as Record<string, unknown>);
    } catch (parseError) {
      console.error(`[${FUNCTION_NAME}] step: parse_failed request_id=${requestId} final_error_code=AI_PARSE_ERROR`, parseError);
      await logStep(userId, 422, "extraction_failed", durationMs, requestId, {
        reason: "structured_parse_failed",
        error: sanitizePreview(parseError),
        raw_preview: DEBUG_MODE ? sanitizePreview(openaiResult.raw) : undefined,
        step_failed: "structured_parse_failed",
        error_code: "AI_PARSE_ERROR",
        input_size_bytes: sizeBytes,
        error_type: "PARSE_ERROR",
      });
      return fail(req, 422, {
        success: false,
        code: "AI_PARSE_ERROR",
        message: "Não foi possível interpretar a resposta da análise.",
        requestId,
        retryable: true,
      });
    }

    if (!parsedArgs || typeof parsedArgs !== "object") {
      console.error(`[${FUNCTION_NAME}] step: parse_failed request_id=${requestId} reason=no_structured_output final_error_code=AI_PARSE_ERROR`);
      await logStep(userId, 422, "extraction_failed", durationMs, requestId, {
        reason: "no_structured_output",
        raw_preview: DEBUG_MODE ? sanitizePreview(openaiResult.raw) : undefined,
        step_failed: "no_structured_output",
        error_code: "AI_PARSE_ERROR",
        input_size_bytes: sizeBytes,
        error_type: "PARSE_ERROR",
      });
      return fail(req, 422, {
        success: false,
        code: "AI_PARSE_ERROR",
        message: "Não foi possível interpretar a resposta da análise.",
        requestId,
        retryable: true,
      });
    }

    const parsed = parsedArgs as Record<string, unknown>;
    const wine = (parsed?.wine ?? parsed) as Record<string, unknown>;
    console.info(`[${FUNCTION_NAME}] step: parse_succeeded request_id=${requestId} fields=${Object.keys(wine).join(",")} parsed_preview=${DEBUG_MODE ? sanitizePreview(parsed) : "hidden"}`);
    await logStep(userId, 200, "parse_succeeded", durationMs, requestId, {
      parsed_fields: Object.keys(wine),
      input_size_bytes: sizeBytes,
      error_type: null,
    });

    const rawName = typeof wine.name === "string" ? wine.name.trim() : null;
    const rawProducer = typeof wine.producer === "string" ? wine.producer.trim() : null;
    const rawCountry = typeof wine.country === "string" ? wine.country.trim() : null;
    const rawRegion = typeof wine.region === "string" ? wine.region.trim() : null;
    const rawGrape = typeof wine.grape === "string" ? wine.grape.trim() : null;
    const rawFoodPairing = typeof wine.food_pairing === "string" ? wine.food_pairing.trim() : null;
    const rawTastingNotes = typeof wine.tasting_notes === "string" ? wine.tasting_notes.trim() : null;
    const rawEstimatedPrice = normalizeNumber((wine as Record<string, unknown>).estimated_price);
    const rawPurchasePrice = normalizeNumber(wine.purchase_price);
    const canonicalCountry = normalizeCountry(rawCountry);
    const normalizedRegion = rawRegion && !isAbsurdRegionValue(rawRegion) ? rawRegion : null;
    const normalizedGrape = normalizeGrape(rawGrape);
    const hasExplicitCountry = Boolean(rawCountry && normalizeCountry(rawCountry));
    const countryConfidence = hasExplicitCountry ? 0.92 : 0;
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
      estimated_price: rawEstimatedPrice ?? rawPurchasePrice ?? null,
      purchase_price: rawPurchasePrice,
      food_pairing: rawFoodPairing,
      cellar_location: typeof wine.cellar_location === "string" ? wine.cellar_location.trim() : null,
      drink_from: normalizeNumber(wine.drink_from),
      drink_until: normalizeNumber(wine.drink_until),
      ocr_text: ocrText,
      ocr_confidence: ocrConfidence,
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
      tasting_notes: fieldConfidenceForNullable(rawTastingNotes, 0.72),
      cellar_location: fieldConfidenceForNullable(normalizedWine.cellar_location, 0.65),
      purchase_price: fieldConfidenceForNullable(normalizedWine.purchase_price, 0.7),
      estimated_price: fieldConfidenceForNullable(normalizedWine.estimated_price, 0.7),
      drink_from: fieldConfidenceForNullable(normalizedWine.drink_from, 0.7),
      drink_until: fieldConfidenceForNullable(normalizedWine.drink_until, 0.7),
    };

    const suspiciousName = hasArtifactToken(normalizedWine.name);
    const suspiciousProducer = hasArtifactToken(normalizedWine.producer);
    const { strongAnchors, weakAnchors } = countWineAnchors(normalizedWine);
    const hasNameSignal = Boolean(normalizedWine.name && normalizedWine.name.trim() && !suspiciousName);
    const hasEnoughWineContext = hasNameSignal || strongAnchors >= 1 || weakAnchors >= 1;
    const hasAnyWineContext = hasNameSignal || strongAnchors + weakAnchors > 0;
    const regionExplicitlyInvalid = isAbsurdRegionValue(normalizedWine.region);
    const regionMissingButAllowed = !normalizedWine.region || normalizeForMatch(normalizedWine.region) === "";
    const hasValidExtraction = hasValidWineExtraction(normalizedWine);

    if (
      suspiciousName ||
      suspiciousProducer ||
      !hasEnoughWineContext ||
      !hasAnyWineContext ||
      !hasValidExtraction ||
      regionExplicitlyInvalid
    ) {
      console.error(`[${FUNCTION_NAME}] [SCAN FAILURE REASON] request_id=${requestId} reason=insufficient_or_suspicious_label final_error_code=LABEL_NOT_IDENTIFIED`);
      await logStep(userId, 422, "extraction_failed", durationMs, requestId, {
        reason: "insufficient_or_suspicious_label",
        suspicious_name: suspiciousName,
        suspicious_producer: suspiciousProducer,
        strong_anchors: strongAnchors,
        weak_anchors: weakAnchors,
        region_missing_but_allowed: regionMissingButAllowed,
        region_explicitly_invalid: regionExplicitlyInvalid,
        step_failed: "insufficient_or_suspicious_label",
        error_code: "LABEL_NOT_IDENTIFIED",
        input_size_bytes: sizeBytes,
        error_type: "PARSE_ERROR",
      });
      return fail(req, 422, {
        success: false,
        code: "LABEL_NOT_IDENTIFIED",
        message: "Não foi possível identificar esse rótulo com segurança.",
        requestId,
        retryable: true,
      });
    }

    const normalizedNameKey = normalizeForMatch(normalizedWine.name);
    const isGenericLabelName =
      normalizedNameKey === "nao identificado" ||
      normalizedNameKey === "não identificado" ||
      normalizedNameKey === "unknown" ||
      normalizedNameKey === "unidentified" ||
      normalizedNameKey === "vinho sem nome" ||
      normalizedNameKey === "wine without name";

    if (normalizedWine.name && (isGenericLabelName || fieldConfidence.name < 0.5)) {
      console.error(`[${FUNCTION_NAME}] [SCAN FAILURE REASON] request_id=${requestId} reason=generic_or_low_confidence_name name=${normalizedWine.name || "unknown"} final_error_code=LABEL_NOT_IDENTIFIED`);
      await logStep(userId, 422, "extraction_failed", durationMs, requestId, {
        reason: "generic_or_low_confidence_name",
        step_failed: "generic_or_low_confidence_name",
        error_code: "LABEL_NOT_IDENTIFIED",
        input_size_bytes: sizeBytes,
        error_type: "PARSE_ERROR",
        wine_name: normalizedWine.name || null,
      });
      return fail(req, 422, {
        success: false,
        code: "LABEL_NOT_IDENTIFIED",
        message: "Não foi possível identificar esse rótulo com segurança.",
        requestId,
        retryable: true,
      });
    }

    const finalWine = {
      ...normalizedWine,
      confidence: fieldConfidence,
    };
    console.info(`[${FUNCTION_NAME}] [SCAN AI RESPONSE] request_id=${requestId} parsed=${DEBUG_MODE ? sanitizePreview(wine) : "hidden"}`);
    console.info(`[${FUNCTION_NAME}] [SCAN NORMALIZED DATA] request_id=${requestId} normalized=${DEBUG_MODE ? sanitizePreview(finalWine) : sanitizePreview({ name: finalWine.name, producer: finalWine.producer, country: finalWine.country, region: finalWine.region, grape: finalWine.grape, vintage: finalWine.vintage, style: finalWine.style, ocr_confidence: finalWine.ocr_confidence })}`);
    console.info(`[${FUNCTION_NAME}] final_output request_id=${requestId} wine_name=${normalizedWine.name} final_error_code=none`);
    await logStep(userId, 200, "success", durationMs, requestId, {
      wine_name: normalizedWine.name || "unknown",
      strong_anchors: strongAnchors,
      weak_anchors: weakAnchors,
      region_missing_but_allowed: regionMissingButAllowed,
      region_explicitly_invalid: regionExplicitlyInvalid,
      input_size_bytes: sizeBytes,
      error_type: null,
    });

    await setCachedAiResponse(FUNCTION_NAME, cacheInput, finalWine, { userId });

    return ok(req, finalWine, requestId);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : "unknown";
    const stack = error instanceof Error ? error.stack : undefined;
    const lower = errMsg.toLowerCase();
    const isAbort = lower.includes("aborted") || lower.includes("abort") || lower.includes("timeout");
    const isParseOrInferenceIssue = lower.includes("json") || lower.includes("parse") || lower.includes("structured") || lower.includes("confidence");
    const code = isAbort ? "AI_TIMEOUT" : isParseOrInferenceIssue ? "AI_PARSE_ERROR" : "AI_UNAVAILABLE";

    console.error(`[${FUNCTION_NAME}] step: fatal_error request_id=${requestId} user_id=${userId} code=${code} final_error_code=${code} error=${errMsg}`, error);

    await logStep(userId, isAbort ? 408 : 500, "fatal_error", durationMs, requestId, {
      error: sanitizePreview(errMsg),
      stack: DEBUG_MODE ? sanitizePreview(stack) : undefined,
      aborted: isAbort,
      parse_or_inference_issue: isParseOrInferenceIssue,
      input_size_bytes: sizeBytes,
      error_type: isAbort ? "AI_TIMEOUT" : isParseOrInferenceIssue ? "AI_PARSE_ERROR" : "AI_UNAVAILABLE",
    });

    await logStep(userId, isAbort ? 408 : 500, "failure", durationMs, requestId, {
      step_failed: isAbort ? "timeout" : isParseOrInferenceIssue ? "parse_or_inference_issue" : "internal_error",
      error_code: code,
      error: sanitizePreview(errMsg),
      stack: DEBUG_MODE ? sanitizePreview(stack) : undefined,
      input_size_bytes: sizeBytes,
      error_type: code,
    });
    return fail(req, isAbort ? 408 : 500, {
      success: false,
      code,
      message: isAbort ? "A análise demorou muito. Tente novamente." : "Não foi possível analisar este rótulo.",
      requestId,
      retryable: true,
    });
  }
});
