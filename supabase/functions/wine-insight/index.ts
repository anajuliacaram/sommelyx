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

const FUNCTION_NAME = "wine-insight";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  let userId = "anonymous";

  try {
    const auth = await authenticateRequest(req, FUNCTION_NAME, requestId, startedAt);
    userId = auth.userId;

    const body = await req.json();
    const { alertType, wineName, style, grape, region, country, vintage, drinkFrom, drinkUntil } = body;

    if (!alertType || !wineName) {
      throw new FunctionError(400, "INVALID_REQUEST", "Informações insuficientes para gerar a análise.", {
        requestId,
        retryable: false,
      });
    }

    const currentYear = new Date().getFullYear();
    let userPrompt: string;

    if (alertType === "drink_now") {
      userPrompt = `Este vinho está na janela ideal de consumo (${drinkFrom || "?"}–${drinkUntil || "?"}, estamos em ${currentYear}).\n\nVinho: ${wineName}\nEstilo: ${style || "Não informado"}\nUva: ${grape || "Não informada"}\nRegião: ${region || "Não informada"}\nPaís: ${country || "Não informado"}\nSafra: ${vintage || "Não informada"}\n\nExplique por que este é o momento ideal para abri-lo e como melhor apreciá-lo.`;
    } else if (alertType === "past_peak") {
      const yearsOver = drinkUntil ? currentYear - drinkUntil : 0;
      userPrompt = `Este vinho passou da janela ideal de consumo (janela era ${drinkFrom || "?"}–${drinkUntil || "?"}, estamos em ${currentYear}, ${yearsOver} ano(s) além).\n\nVinho: ${wineName}\nEstilo: ${style || "Não informado"}\nUva: ${grape || "Não informada"}\nRegião: ${region || "Não informada"}\nPaís: ${country || "Não informado"}\nSafra: ${vintage || "Não informada"}\n\nExplique tecnicamente o que pode ter acontecido com o vinho e dê uma recomendação prática.`;
    } else {
      throw new FunctionError(400, "INVALID_REQUEST", "Tipo de alerta inválido para análise.", {
        requestId,
        retryable: false,
      });
    }

    const aiData = await openAiChatCompletion({
      messages: [
        {
          role: "system",
          content: "Você é um sommelier experiente e enólogo. Forneça uma análise técnica breve (2-3 frases) sobre o estado de evolução de um vinho. Use linguagem acessível e objetiva.",
        },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_wine_insight",
            description: "Retorna uma análise estruturada sobre o momento ideal de consumo do vinho.",
            parameters: {
              type: "object",
              properties: {
                insight: { type: "string" },
                recommendation: { type: "string" },
              },
              required: ["insight", "recommendation"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_wine_insight" } },
      temperature: 0.35,
      max_tokens: 700,
    }, { requestId, timeoutMs: 35_000 });

    const parsed = extractToolArguments(aiData);
    if (!parsed) {
      throw new FunctionError(422, "EMPTY_RESULT", "Não foi possível gerar a análise agora. Tente novamente.", {
        requestId,
        retryable: true,
      });
    }

    const result = {
      insight: typeof (parsed as any).insight === "string" ? (parsed as any).insight : "",
      recommendation: typeof (parsed as any).recommendation === "string" ? (parsed as any).recommendation : "",
    };

    await logAudit(userId, FUNCTION_NAME, 200, "success", Date.now() - startedAt, {
      request_id: requestId,
      alert_type: alertType,
      wine_name: wineName,
    });

    return jsonResponse(result);
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
