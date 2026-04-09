import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.25.76";
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

const FUNCTION_NAME = "analyze-wine-list";

const UserProfileSchema = z.object({
  topStyles: z.array(z.string()).optional(),
  topGrapes: z.array(z.string()).optional(),
  topCountries: z.array(z.string()).optional(),
  avgPrice: z.number().optional(),
}).optional();

const BodySchema = z.object({
  imageBase64: z.string().min(64).optional(),
  extractedText: z.string().min(20).optional(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  userProfile: UserProfileSchema,
  mode: z.enum(["menu-for-wine"]).optional(),
  wineName: z.string().min(1).max(200).optional(),
}).refine((value) => Boolean(value.imageBase64 || value.extractedText), {
  message: "Envie uma imagem ou PDF legível",
  path: ["imageBase64"],
}).refine((value) => value.mode !== "menu-for-wine" || Boolean(value.wineName), {
  message: "Informe o vinho para analisar o cardápio",
  path: ["wineName"],
});

function normalizeWineListPayload(payload: any) {
  const wines = Array.isArray(payload?.wines) ? payload.wines : [];
  return {
    wines: wines.map((wine: any) => ({
      name: String(wine?.name || "Vinho não identificado"),
      producer: wine?.producer ? String(wine.producer) : null,
      vintage: typeof wine?.vintage === "number" ? wine.vintage : null,
      style: wine?.style ? String(wine.style) : null,
      grape: wine?.grape ? String(wine.grape) : null,
      region: wine?.region ? String(wine.region) : null,
      price: typeof wine?.price === "number" ? wine.price : null,
      rating: typeof wine?.rating === "number" ? Math.max(0, Math.min(5, wine.rating)) : 0,
      description: wine?.description ? String(wine.description) : null,
      pairings: Array.isArray(wine?.pairings) ? wine.pairings.map((item: unknown) => String(item)) : [],
      verdict: wine?.verdict ? String(wine.verdict) : "Sem resumo",
      compatibility: typeof wine?.compatibility === "number" ? Math.max(0, Math.min(100, Math.round(wine.compatibility))) : 0,
      highlight: ["best-value", "top-pick", "adventurous"].includes(wine?.highlight) ? wine.highlight : null,
    })),
    topPick: payload?.topPick ? String(payload.topPick) : null,
    bestValue: payload?.bestValue ? String(payload.bestValue) : null,
  };
}

function normalizeMenuPayload(payload: any) {
  const dishes = Array.isArray(payload?.dishes) ? payload.dishes : [];
  return {
    dishes: dishes.map((dish: any) => ({
      name: String(dish?.name || "Prato não identificado"),
      price: typeof dish?.price === "number" ? dish.price : null,
      match: ["perfeito", "muito bom", "bom"].includes(dish?.match) ? dish.match : "bom",
      reason: dish?.reason ? String(dish.reason) : "Boa compatibilidade geral.",
      highlight: ["top-pick", "best-value"].includes(dish?.highlight) ? dish.highlight : null,
    })),
    summary: payload?.summary ? String(payload.summary) : "",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  let userId = "anonymous";

  try {
    const auth = await authenticateRequest(req, FUNCTION_NAME, requestId, startedAt);
    userId = auth.userId;

    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      throw new FunctionError(400, "INVALID_REQUEST", "Não conseguimos ler esse arquivo. Tente outra imagem ou PDF mais nítido.", {
        requestId,
        retryable: false,
        message: JSON.stringify(parsedBody.error.flatten().fieldErrors),
      });
    }

    const { imageBase64, extractedText, mimeType, fileName, userProfile, mode, wineName } = parsedBody.data;
    const cleanBase64 = imageBase64?.includes(",")
      ? imageBase64.split(",")[1].replace(/\s/g, "")
      : imageBase64?.replace(/\s/g, "");
    const isMenuMode = mode === "menu-for-wine";

    const inputSummary = [
      fileName ? `Arquivo: ${fileName}` : null,
      mimeType ? `Tipo: ${mimeType}` : null,
      extractedText ? "Entrada principal: texto extraído do anexo" : null,
      cleanBase64 ? "Entrada complementar: imagem renderizada/comprimida" : null,
    ].filter(Boolean).join("\n");

    let systemPrompt: string;
    let userInstructions: string;
    let tools: unknown[];
    let toolChoice: Record<string, unknown>;

    if (isMenuMode) {
      systemPrompt = "Você é um sommelier especialista em leitura de cardápios. Use apenas o conteúdo legível do anexo e seja conservador quando algo estiver pouco nítido. Priorize precisão, velocidade e objetividade.";
      userInstructions = `Analise o cardápio anexado e selecione apenas pratos que harmonizem pelo menos bem com o vinho \"${wineName}\". Explique a lógica sensorial de forma clara, sem inventar itens que não estejam legíveis.`;
      tools = [{
        type: "function",
        function: {
          name: "return_menu_analysis",
          description: "Retorna os pratos do cardápio que harmonizam com o vinho informado.",
          parameters: {
            type: "object",
            properties: {
              dishes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    reason: { type: "string" },
                    highlight: { type: "string", enum: ["top-pick", "best-value"] },
                  },
                  required: ["name", "match", "reason"],
                  additionalProperties: false,
                },
              },
              summary: { type: "string" },
            },
            required: ["dishes", "summary"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_menu_analysis" } };
    } else {
      const profileContext = userProfile
        ? `\nPerfil do usuário:\n- Estilos preferidos: ${userProfile.topStyles?.join(", ") || "variado"}\n- Uvas preferidas: ${userProfile.topGrapes?.join(", ") || "variado"}\n- Países preferidos: ${userProfile.topCountries?.join(", ") || "variado"}\n- Faixa de preço habitual: R$ ${userProfile.avgPrice || "variado"}`
        : "";

      systemPrompt = `Você é um sommelier especialista em cartas de vinhos de restaurante. Use apenas o conteúdo claramente legível do anexo, não invente rótulos ausentes e mantenha a saída estruturada.${profileContext}`;
      userInstructions = "Analise a carta anexada. Identifique os vinhos visíveis, estime os campos apenas quando houver evidência suficiente e devolva uma curadoria confiável e rápida.";
      tools = [{
        type: "function",
        function: {
          name: "return_wine_list_analysis",
          description: "Retorna a análise estruturada da carta de vinhos.",
          parameters: {
            type: "object",
            properties: {
              wines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    producer: { type: "string" },
                    vintage: { type: "number" },
                    style: { type: "string" },
                    grape: { type: "string" },
                    region: { type: "string" },
                    price: { type: "number" },
                    rating: { type: "number" },
                    description: { type: "string" },
                    pairings: { type: "array", items: { type: "string" } },
                    verdict: { type: "string" },
                    compatibility: { type: "number" },
                    highlight: { type: "string", enum: ["best-value", "top-pick", "adventurous"] },
                  },
                  required: ["name", "rating", "verdict", "compatibility"],
                  additionalProperties: false,
                },
              },
              topPick: { type: "string" },
              bestValue: { type: "string" },
            },
            required: ["wines"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_wine_list_analysis" } };
    }

    const userContent: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: `${userInstructions}\n\n${inputSummary}` },
    ];

    if (extractedText) {
      userContent.push({ type: "text", text: `Texto extraído do anexo:\n${extractedText}` });
    }

    if (cleanBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
      });
    }

    const aiData = await openAiChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      tools,
      tool_choice: toolChoice,
      temperature: 0.25,
      max_tokens: 1800,
    }, { requestId, timeoutMs: 75_000 });

    const parsed = extractToolArguments(aiData);
    if (!parsed) {
      throw new FunctionError(422, "EMPTY_RESULT", "Não foi possível identificar dados suficientes nesse arquivo ou imagem.", {
        requestId,
        retryable: true,
      });
    }

    const responseBody = isMenuMode ? normalizeMenuPayload(parsed) : normalizeWineListPayload(parsed);
    await logAudit(userId, FUNCTION_NAME, 200, "success", Date.now() - startedAt, {
      request_id: requestId,
      mode: isMenuMode ? "menu-for-wine" : "wine-list",
      file_name: fileName,
      mime_type: mimeType,
      has_image: Boolean(cleanBase64),
      has_text: Boolean(extractedText),
      result_count: isMenuMode ? responseBody.dishes.length : responseBody.wines.length,
    });

    return jsonResponse(responseBody);
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
