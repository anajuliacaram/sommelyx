import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";

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
    if (!authHeader?.startsWith("Bearer ")) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        reason: "missing_or_invalid_authorization_header",
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        reason: "invalid_token",
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

    const parsedImage = parseImageDataUrl(imageBase64Raw);
    const imageMime = parsedImage.mime;
    const imageBase64 = normalizeBase64(parsedImage.base64);
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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
    console.log(`[${FUNCTION_NAME}] request_id=${requestId} openai_key=${maskSecret(OPENAI_API_KEY)} model=${OPENAI_MODEL}`);
    if (!OPENAI_API_KEY) {
      console.error(`[${FUNCTION_NAME}] request_id=${requestId} missing OPENAI_API_KEY`);
      await logAudit(userId, 500, "internal_error", Date.now() - startTime, { request_id: requestId, reason: "missing_api_key" });
      return fail(500, {
        ok: false,
        code: "CONFIG_ERROR",
        error: "O scanner está temporariamente indisponível. Tente novamente em instantes.",
        requestId,
        retryable: true,
      });
    }
      console.error(`[${FUNCTION_NAME}] request_id=${requestId} missing API keys`);
      await logAudit(userId, 500, "internal_error", Date.now() - startTime, { request_id: requestId, reason: "missing_api_key" });
      return fail(500, {
        ok: false,
        code: "CONFIG_ERROR",
        error: "O scanner está temporariamente indisponível. Tente novamente em instantes.",
        requestId,
        retryable: true,
      });
    }

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

    let durationMs = 0;
    let responseStatus = 200;
    let parsedArgs: Record<string, unknown> | null = null;
    let responsePreview: string | null = null;

    if (OPENAI_API_KEY) {
      const openaiResult = await callOpenAIResponses<{ wine: Record<string, unknown> }>({
        functionName: FUNCTION_NAME,
        requestId,
        apiKey: OPENAI_API_KEY,
        model: OPENAI_MODEL,
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

      if (!openaiResult.ok) {
        responsePreview = openaiResult.error;
        const status = openaiResult.status;
        console.log({
          input: { requestId, imageMime, imageBytes: imageBase64.length },
          response: { ok: false, status, body: responsePreview ? String(responsePreview).slice(0, 240) : null },
          parsed: null,
          error: responsePreview,
        });

        if (status === 429) {
          await logAudit(userId, 429, "ai_error", durationMs, { request_id: requestId, reason: "ai_rate_limit" });
          return fail(429, {
            ok: false,
            code: "AI_RATE_LIMIT",
            error: "Muitas requisições agora. Tente novamente em instantes.",
            requestId,
            retryable: true,
          });
        }
        if (status === 402) {
          await logAudit(userId, 402, "ai_error", durationMs, { request_id: requestId, reason: "credits_exhausted" });
          return fail(402, {
            ok: false,
            code: "AI_CREDITS_EXHAUSTED",
            error: "A análise não está disponível no momento. Tente novamente mais tarde.",
            requestId,
            retryable: true,
          });
        }

        await logAudit(userId, 502, "ai_error", durationMs, {
          request_id: requestId,
          ai_status: status,
          ai_body_preview: String(responsePreview || "").slice(0, 400),
        });
        return fail(502, {
          ok: false,
          code: "AI_UNAVAILABLE",
          error: "A análise não pôde ser concluída agora. Tente novamente em instantes.",
          requestId,
          retryable: true,
        });
      }

      parsedArgs = openaiResult.parsed?.wine ? (openaiResult.parsed.wine as Record<string, unknown>) : (openaiResult.parsed as Record<string, unknown>);
      responseStatus = 200;
      console.log({
        input: { requestId, imageMime, imageBytes: imageBase64.length },
        response: { ok: true, status: 200, body: null },
        parsed: parsedArgs,
        error: null,
      });
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

      const aiResponse = await fetch(AI_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Analise este rótulo de vinho e extraia todas as informações possíveis." },
                { type: "image_url", image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
              ],
            },
          ],
          temperature: 0.1,
        }),
      });

      clearTimeout(timeout);

      responseStatus = aiResponse.status;
      responsePreview = aiResponse.ok ? null : await aiResponse.text().catch(() => "");
      console.log({
        input: {
          requestId,
          imageMime,
          imageBytes: imageBase64.length,
        },
        response: {
          ok: aiResponse.ok,
          status: aiResponse.status,
          body: responsePreview ? String(responsePreview).slice(0, 240) : null,
        },
        parsed: null,
        error: aiResponse.ok ? null : responsePreview,
      });

      if (!aiResponse.ok) {
        const bodyText = responsePreview || "";

        if (aiResponse.status === 429) {
          await logAudit(userId, 429, "ai_error", durationMs, { request_id: requestId, reason: "ai_rate_limit" });
          return fail(429, {
            ok: false,
            code: "AI_RATE_LIMIT",
            error: "Muitas requisições agora. Tente novamente em instantes.",
            requestId,
            retryable: true,
          });
        }
        if (aiResponse.status === 402) {
          await logAudit(userId, 402, "ai_error", durationMs, { request_id: requestId, reason: "credits_exhausted" });
          return fail(402, {
            ok: false,
            code: "AI_CREDITS_EXHAUSTED",
            error: "A análise não está disponível no momento. Tente novamente mais tarde.",
            requestId,
            retryable: true,
          });
        }

        console.error(`[${FUNCTION_NAME}] request_id=${requestId} ai_status=${aiResponse.status} body=${bodyText.slice(0, 240)}`);
        await logAudit(userId, 502, "ai_error", durationMs, {
          request_id: requestId,
          ai_status: aiResponse.status,
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

      const aiData = await aiResponse.json().catch(() => null);
      if (!aiData) {
        await logAudit(userId, 502, "ai_error", durationMs, { request_id: requestId, reason: "invalid_ai_json" });
        return fail(502, {
          ok: false,
          code: "AI_INVALID_RESPONSE",
          error: "O serviço de análise retornou uma resposta inválida. Tente novamente.",
          requestId,
          retryable: true,
        });
      }

      const content = aiData.choices?.[0]?.message?.content || "";
      parsedArgs = extractJsonFromText(content);
    }

    durationMs = Date.now() - startTime;

    console.log({
      input: {
        requestId,
        imageMime,
        imageBytes: imageBase64.length,
      },
      response: {
        ok: true,
        status: responseStatus,
        body: null,
      },
      parsed: parsedArgs,
      error: null,
    });

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
        ok: false,
        code: "LABEL_NOT_IDENTIFIED",
        error: "Não foi possível identificar o rótulo com confiança. Tente outra foto, com o rótulo mais centralizado e sem elementos da interface na imagem.",
        requestId,
        retryable: false,
      });
    }

    if (regionMissingButAllowed) {
      await logAudit(userId, 200, "success", durationMs, {
        request_id: requestId,
        wine_name: normalizedWine.name || "unknown",
        region_missing_but_allowed: true,
        strong_anchors: strongAnchors,
        weak_anchors: weakAnchors,
      });
      return jsonResponse(200, { ok: true, wine: normalizedWine, requestId });
    }

    await logAudit(userId, 200, "success", durationMs, {
      request_id: requestId,
      wine_name: normalizedWine.name || "unknown",
      strong_anchors: strongAnchors,
      weak_anchors: weakAnchors,
      region_missing_but_allowed: false,
      region_explicitly_invalid: regionExplicitlyInvalid,
    });

    return jsonResponse(200, { ok: true, wine: normalizedWine, requestId });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : "unknown";
    const isAbort = errMsg.toLowerCase().includes("aborted") || errMsg.toLowerCase().includes("abort");
    const isParseOrInferenceIssue =
      errMsg.toLowerCase().includes("json") ||
      errMsg.toLowerCase().includes("parse") ||
      errMsg.toLowerCase().includes("structured") ||
      errMsg.toLowerCase().includes("confidence");

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

    if (isParseOrInferenceIssue) {
      return fail(422, {
        ok: false,
        code: "LABEL_NOT_IDENTIFIED",
        error: "Não foi possível identificar o rótulo com confiança. Tente outra foto, com o rótulo mais centralizado e sem elementos da interface na imagem.",
        requestId,
        retryable: false,
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
