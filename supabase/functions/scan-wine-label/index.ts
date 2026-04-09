import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticateRequest,
  corsHeaders,
  extractToolArguments,
  failResponse,
  FunctionError,
  jsonResponse,
  logAudit,
  openAiChatCompletion,
} from "../_shared/runtime.ts";

const FUNCTION_NAME = "scan-wine-label";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  let userId = "anonymous";

  try {
    const auth = await authenticateRequest(req, FUNCTION_NAME, requestId, startedAt);
    userId = auth.userId;

    if (!checkRateLimit(userId)) {
      throw new FunctionError(429, "RATE_LIMIT", "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.", {
        requestId,
        retryable: true,
      });
    }

    let payload: { imageBase64?: unknown } = {};
    try {
      payload = await req.json();
    } catch {
      throw new FunctionError(400, "INVALID_REQUEST", "Não foi possível ler sua solicitação. Tente novamente.", {
        requestId,
        retryable: false,
      });
    }

    const imageBase64Raw = payload?.imageBase64;
    if (!imageBase64Raw || typeof imageBase64Raw !== "string") {
      throw new FunctionError(400, "MISSING_IMAGE", "Envie uma foto do rótulo para analisar.", {
        requestId,
        retryable: false,
      });
    }

    const parsedImage = parseImageDataUrl(imageBase64Raw);
    const imageMime = parsedImage.mime;
    const imageBase64 = normalizeBase64(parsedImage.base64);
    if (imageBase64.length > MAX_IMAGE_SIZE) {
      throw new FunctionError(413, "IMAGE_TOO_LARGE", "Esse arquivo é grande demais. Envie uma versão menor.", {
        requestId,
        retryable: false,
      });
    }

    const aiData = await openAiChatCompletion({
      messages: [
        {
          role: "system",
          content: `Você é um especialista em leitura de rótulos de vinho. Analise a imagem do rótulo e extraia o máximo de informações com precisão. Use apenas o que estiver visível e confiável.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise este rótulo de vinho e extraia todas as informações possíveis." },
            { type: "image_url", image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_wine_label",
            description: "Retorna os dados extraídos do rótulo de vinho.",
            parameters: {
              type: "object",
              properties: {
                wine: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    producer: { type: "string" },
                    vintage: { type: "number" },
                    style: { type: "string" },
                    country: { type: "string" },
                    region: { type: "string" },
                    grape: { type: "string" },
                    food_pairing: { type: "string" },
                    tasting_notes: { type: "string" },
                    cellar_location: { type: "string" },
                    purchase_price: { type: "number" },
                    drink_from: { type: "number" },
                    drink_until: { type: "number" },
                  },
                  required: ["name"],
                },
              },
              required: ["wine"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_wine_label" } },
      temperature: 0.1,
      max_tokens: 1200,
    }, { requestId, timeoutMs: 60_000 });

    const parsed = extractToolArguments(aiData) as Record<string, unknown> | null;
    const wine = (parsed?.wine ?? parsed) as Record<string, unknown> | undefined;
    if (!wine || typeof wine !== "object") {
      throw new FunctionError(422, "LABEL_NOT_IDENTIFIED", "Não foi possível identificar esse rótulo com segurança. Tente outra foto ou cadastre manualmente.", {
        requestId,
        retryable: false,
      });
    }

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
      throw new FunctionError(422, "LABEL_NOT_IDENTIFIED", "Não foi possível identificar esse rótulo com segurança. Tente outra foto ou cadastre manualmente.", {
        requestId,
        retryable: false,
      });
    }

    await logAudit(userId, FUNCTION_NAME, 200, "success", Date.now() - startedAt, {
      request_id: requestId,
      wine_name: normalizedWine.name,
    });

    return jsonResponse({ ok: true, wine: normalizedWine, requestId });
  } catch (error) {
    const failure = error instanceof FunctionError
      ? error
      : new FunctionError(500, "INTERNAL_ERROR", "O serviço está temporariamente indisponível. Tente novamente em instantes.", {
          requestId,
          retryable: true,
          message: error instanceof Error ? error.message : "unknown_error",
        });

    console.error(`[${FUNCTION_NAME}] request_id=${requestId}`, failure.message);
    await logAudit(userId, FUNCTION_NAME, failure.status, "error", Date.now() - startedAt, {
      request_id: requestId,
      code: failure.code,
      technical_message: failure.message,
    });
    return failResponse(failure);
  }
});
