import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

const FUNCTION_NAME = "wishlist-wine-assistant";
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

type AssistantResult = {
  wine_name: string | null;
  producer: string | null;
  vintage: number | null;
  style: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  target_price: number | null;
  ai_summary: string | null;
  notes: string | null;
  image_url: string | null;
};

function normalizeValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

async function getImageFromOpenFoodFacts(query: string) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,image_url,image_front_url,categories_tags`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  const best = products
    .map((product: Record<string, unknown>) => {
      const productName = String(product.product_name ?? "").toLowerCase();
      const brands = String(product.brands ?? "").toLowerCase();
      const categories = Array.isArray(product.categories_tags) ? product.categories_tags.join(" ").toLowerCase() : "";
      const imageUrl = String(product.image_url ?? product.image_front_url ?? "");
      const score = tokens.reduce((sum, token) => sum + (productName.includes(token) ? 3 : 0) + (brands.includes(token) ? 2 : 0), 0)
        + (/wine|vin|champagne|espumante/.test(categories) ? 2 : 0)
        + (imageUrl ? 2 : 0);

      return { imageUrl, score };
    })
    .filter((product: { imageUrl: string; score: number }) => product.imageUrl && product.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)[0];

  return best?.imageUrl ?? null;
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

    const { query, imageBase64 } = await req.json();
    const safeQuery = typeof query === "string" ? query.trim() : "";

    if (!safeQuery && (!imageBase64 || typeof imageBase64 !== "string")) {
      throw new FunctionError(400, "INVALID_REQUEST", "Informe um texto ou imagem para continuar.", {
        requestId,
        retryable: false,
      });
    }

    if (typeof imageBase64 === "string" && imageBase64.length > MAX_IMAGE_SIZE) {
      throw new FunctionError(413, "FILE_TOO_LARGE", "Esse arquivo é grande demais. Envie uma versão menor.", {
        requestId,
        retryable: false,
      });
    }

    const userContent: Array<Record<string, unknown>> = [];
    if (safeQuery) {
      userContent.push({ type: "text", text: `Texto informado pelo cliente: ${safeQuery}` });
    }
    if (typeof imageBase64 === "string" && imageBase64.trim().length > 0) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
      });
    }

    const aiData = await openAiChatCompletion({
      messages: [
        {
          role: "system",
          content: `Você é um especialista em vinhos e assistente de wishlist premium. Receba um texto livre do cliente e, opcionalmente, uma foto do rótulo. Devolva APENAS via tool_call os dados estruturados do vinho, usando null quando não souber com boa confiança.`,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_wishlist_wine",
            description: "Gerar sugestão estruturada para wishlist",
            parameters: {
              type: "object",
              properties: {
                suggestion: {
                  type: "object",
                  properties: {
                    wine_name: { type: "string" },
                    producer: { type: "string" },
                    vintage: { type: "number" },
                    style: { type: "string" },
                    country: { type: "string" },
                    region: { type: "string" },
                    grape: { type: "string" },
                    target_price: { type: "number" },
                    ai_summary: { type: "string" },
                    notes: { type: "string" },
                  },
                  required: ["wine_name"],
                },
              },
              required: ["suggestion"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "suggest_wishlist_wine" } },
      temperature: 0.2,
      max_tokens: 700,
    }, { requestId, timeoutMs: 60_000 });

    const parsed = extractToolArguments(aiData) as Record<string, unknown> | null;
    const suggestionRaw = (parsed?.suggestion ?? {}) as Record<string, unknown>;
    if (!suggestionRaw || !normalizeValue(suggestionRaw.wine_name)) {
      throw new FunctionError(422, "EMPTY_RESULT", "Não foi possível identificar dados suficientes nessa imagem ou descrição.", {
        requestId,
        retryable: true,
      });
    }

    const searchBasis = [normalizeValue(suggestionRaw.wine_name), normalizeValue(suggestionRaw.producer), normalizeValue(suggestionRaw.vintage)]
      .filter(Boolean)
      .join(" ")
      || safeQuery;

    const imageUrl = await getImageFromOpenFoodFacts(searchBasis);

    const result: AssistantResult = {
      wine_name: normalizeValue(suggestionRaw.wine_name),
      producer: normalizeValue(suggestionRaw.producer),
      vintage: normalizeNumber(suggestionRaw.vintage),
      style: normalizeStyle(suggestionRaw.style),
      country: normalizeValue(suggestionRaw.country),
      region: normalizeValue(suggestionRaw.region),
      grape: normalizeValue(suggestionRaw.grape),
      target_price: normalizeNumber(suggestionRaw.target_price),
      ai_summary: normalizeValue(suggestionRaw.ai_summary),
      notes: normalizeValue(suggestionRaw.notes),
      image_url: imageUrl,
    };

    await logAudit(userId, FUNCTION_NAME, 200, "success", Date.now() - startedAt, {
      request_id: requestId,
      query: safeQuery || "image_only",
      found_image: !!imageUrl,
      wine_name: result.wine_name,
    });

    return jsonResponse({ suggestion: result });
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
