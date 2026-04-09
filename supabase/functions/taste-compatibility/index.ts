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

const FUNCTION_NAME = "taste-compatibility";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  let userId = "anonymous";

  try {
    const auth = await authenticateRequest(req, FUNCTION_NAME, requestId, startedAt);
    userId = auth.userId;

    const body = await req.json();
    const { targetWine, userCellar } = body;

    if (!targetWine || !Array.isArray(userCellar) || userCellar.length === 0) {
      return jsonResponse({ compatibility: null, label: "Sem dados suficientes", reason: "" });
    }

    const styleCount: Record<string, number> = {};
    const grapeCount: Record<string, number> = {};
    const countryCount: Record<string, number> = {};
    const regionCount: Record<string, number> = {};

    userCellar.forEach((w: any) => {
      if (w.style) styleCount[w.style] = (styleCount[w.style] || 0) + (w.quantity || 1);
      if (w.grape) grapeCount[w.grape] = (grapeCount[w.grape] || 0) + (w.quantity || 1);
      if (w.country) countryCount[w.country] = (countryCount[w.country] || 0) + (w.quantity || 1);
      if (w.region) regionCount[w.region] = (regionCount[w.region] || 0) + (w.quantity || 1);
    });

    const topN = (obj: Record<string, number>, n: number) =>
      Object.entries(obj).sort(([, a], [, b]) => b - a).slice(0, n).map(([k]) => k);

    const profileSummary = `Perfil do colecionador:\n- Estilos preferidos: ${topN(styleCount, 3).join(", ") || "variado"}\n- Uvas preferidas: ${topN(grapeCount, 5).join(", ") || "variado"}\n- Países preferidos: ${topN(countryCount, 3).join(", ") || "variado"}\n- Regiões preferidas: ${topN(regionCount, 4).join(", ") || "variado"}\n- Total de rótulos: ${userCellar.length}`;

    const aiData = await openAiChatCompletion({
      messages: [
        {
          role: "system",
          content: `Você é um sommelier que analisa compatibilidade de um vinho com o perfil de gosto de um colecionador.\nAvalie de 0 a 100 o quão compatível esse vinho é com o perfil descrito.`,
        },
        {
          role: "user",
          content: `${profileSummary}\n\nVinho a avaliar:\n- Nome: ${targetWine.name || "Desconhecido"}\n- Estilo: ${targetWine.style || "Não informado"}\n- Uva: ${targetWine.grape || "Não informada"}\n- País: ${targetWine.country || "Não informado"}\n- Região: ${targetWine.region || "Não informada"}\n- Produtor: ${targetWine.producer || "Não informado"}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_taste_compatibility",
            description: "Retorna compatibilidade do vinho com o perfil do usuário.",
            parameters: {
              type: "object",
              properties: {
                compatibility: { type: "number" },
                label: { type: "string" },
                reason: { type: "string" },
              },
              required: ["compatibility", "label", "reason"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_taste_compatibility" } },
      temperature: 0.2,
      max_tokens: 500,
    }, { requestId, timeoutMs: 30_000 });

    const parsed = extractToolArguments(aiData);
    if (!parsed) {
      throw new FunctionError(422, "EMPTY_RESULT", "Não foi possível calcular a compatibilidade agora. Tente novamente.", {
        requestId,
        retryable: true,
      });
    }

    const compatibility = typeof (parsed as any).compatibility === "number"
      ? Math.max(0, Math.min(100, Math.round((parsed as any).compatibility)))
      : null;
    const result = {
      compatibility,
      label: typeof (parsed as any).label === "string" ? (parsed as any).label : "Não disponível",
      reason: typeof (parsed as any).reason === "string" ? (parsed as any).reason : "",
    };

    await logAudit(userId, FUNCTION_NAME, 200, "success", Date.now() - startedAt, {
      request_id: requestId,
      compatibility,
      cellar_size: userCellar.length,
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
