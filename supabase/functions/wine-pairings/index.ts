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

const FUNCTION_NAME = "wine-pairings";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  let userId = "anonymous";

  try {
    const auth = await authenticateRequest(req, FUNCTION_NAME, requestId, startedAt);
    userId = auth.userId;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new FunctionError(400, "INVALID_REQUEST", "Não foi possível interpretar sua solicitação. Tente novamente.", {
        requestId,
        retryable: false,
      });
    }

    const { mode, wineName, wineStyle, wineGrape, wineRegion, dish, userWines } = body;
    let systemPrompt: string;
    let userPrompt: string;
    let tools: unknown[];
    let toolChoice: Record<string, unknown>;

    if (mode === "wine-to-food") {
      if (typeof wineName !== "string" || !wineName.trim()) {
        throw new FunctionError(400, "INVALID_REQUEST", "Informe um vinho para gerar harmonizações.", {
          requestId,
          retryable: false,
        });
      }

      systemPrompt = "Você é um sommelier experiente. Sugira harmonizações de pratos para um vinho com linguagem clara, objetiva e elegante.";
      userPrompt = `Vinho: ${wineName || "Desconhecido"}\nEstilo: ${wineStyle || "Não informado"}\nUva: ${wineGrape || "Não informada"}\nRegião: ${wineRegion || "Não informada"}\n\nSugira harmonizações ideais para este vinho.`;
      tools = [{
        type: "function",
        function: {
          name: "return_pairings",
          description: "Retorna harmonizações de pratos para um vinho.",
          parameters: {
            type: "object",
            properties: {
              pairings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dish: { type: "string" },
                    reason: { type: "string" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                  },
                  required: ["dish", "reason", "match"],
                  additionalProperties: false,
                },
              },
            },
            required: ["pairings"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_pairings" } };
    } else if (mode === "food-to-wine") {
      if (typeof dish !== "string" || !dish.trim()) {
        throw new FunctionError(400, "INVALID_REQUEST", "Informe um prato para encontrar o vinho ideal.", {
          requestId,
          retryable: false,
        });
      }

      systemPrompt = `Você é um sommelier experiente. O usuário quer saber quais vinhos combinam com um prato.${Array.isArray(userWines) && userWines.length ? " Priorize sugestões da adega dele quando houver boa combinação." : " Sugira tipos de vinho ideais."}`;
      const cellarContext = Array.isArray(userWines) && userWines.length
        ? `\nVinhos na adega do usuário:\n${userWines.slice(0, 30).map((w: any) => `- ${w.name} (${w.style || "?"}, ${w.grape || "?"}, ${w.region || "?"})`).join("\n")}`
        : "";
      userPrompt = `Prato escolhido: ${dish}${cellarContext}\n\nSugira vinhos ideais para este prato.`;
      tools = [{
        type: "function",
        function: {
          name: "return_wine_suggestions",
          description: "Retorna sugestões de vinhos para um prato.",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    wineName: { type: "string" },
                    style: { type: "string" },
                    reason: { type: "string" },
                    fromCellar: { type: "boolean" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                  },
                  required: ["wineName", "style", "reason", "fromCellar", "match"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_wine_suggestions" } };
    } else {
      throw new FunctionError(400, "INVALID_REQUEST", "Modo de harmonização inválido.", {
        requestId,
        retryable: false,
      });
    }

    const aiData = await openAiChatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: toolChoice,
      temperature: 0.35,
      max_tokens: 900,
    }, { requestId, timeoutMs: 40_000 });

    const parsed = extractToolArguments(aiData);
    if (!parsed) {
      throw new FunctionError(422, "EMPTY_RESULT", "Não foi possível gerar sugestões suficientes agora. Tente novamente.", {
        requestId,
        retryable: true,
      });
    }

    await logAudit(userId, FUNCTION_NAME, 200, "success", Date.now() - startedAt, {
      request_id: requestId,
      mode,
      suggestions: Array.isArray((parsed as any).pairings) ? (parsed as any).pairings.length : Array.isArray((parsed as any).suggestions) ? (parsed as any).suggestions.length : 0,
    });

    return jsonResponse(parsed);
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
