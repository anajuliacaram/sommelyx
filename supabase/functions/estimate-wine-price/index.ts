import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";


Deno.serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = req.headers.get("X-Client-Request-Id") || crypto.randomUUID();
  const startedAt = Date.now();

  const errorResponse = (status: number, code: string, message: string, retryable = false) =>
    new Response(JSON.stringify({ success: false, code, message, requestId, retryable }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Authenticate request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("[estimate-wine-price] auth_missing", { request_id: requestId, latency_ms: Date.now() - startedAt, retryable: false });
      return errorResponse(401, "AUTH_REQUIRED", "Sessão expirada. Faça login novamente.");
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.warn("[estimate-wine-price] auth_invalid", { request_id: requestId, latency_ms: Date.now() - startedAt, retryable: false });
      return errorResponse(401, "AUTH_REQUIRED", "Sessão expirada. Faça login novamente.");
    }

    const body = await req.json();
    const { name, producer, vintage, style, country, region, grape } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return errorResponse(400, "INVALID_REQUEST", "Nome do vinho é obrigatório.");
    }

    const cacheInput = {
      name: name.trim(),
      producer: producer || "",
      vintage: vintage || null,
      style: style || "",
      country: country || "",
      region: region || "",
      grape: grape || "",
    };
    const cached = await getCachedAiResponse<any>("estimate-wine-price", cacheInput, { userId: claimsData.claims.sub });
    if (cached.hit && cached.payload) {
      return new Response(
        JSON.stringify(cached.payload),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rateLimit = await checkRateLimit(claimsData.claims.sub, "estimate-wine-price");
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          code: rateLimit.degraded ? "AI_UNAVAILABLE" : "RATE_LIMIT",
          message: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
          requestId,
          retryable: true,
        }),
        { status: rateLimit.degraded ? 503 : 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wineDesc = [
      `Nome: ${name.trim()}`,
      producer ? `Produtor/Vinícola: ${producer}` : null,
      vintage ? `Safra: ${vintage}` : null,
      style ? `Estilo: ${style}` : null,
      grape ? `Uva: ${grape}` : null,
      country ? `País: ${country}` : null,
      region ? `Região: ${region}` : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = `Você é um especialista em vinhos e mercado vinícola brasileiro. Sua tarefa é estimar o preço médio de mercado de um vinho no Brasil, em Reais (R$).

REGRAS:
- Baseie-se PRINCIPALMENTE no nome do vinho e na vinícola/produtor, que são os maiores indicadores de faixa de preço.
- Considere também safra, uva, região e estilo como fatores secundários.
- Retorne APENAS um JSON no formato: {"preco_estimado_brl": NUMBER, "faixa_min": NUMBER, "faixa_max": NUMBER, "confianca": "alta"|"media"|"baixa", "fonte_referencia": "explicação curta"}
- O preço deve ser o valor médio praticado em lojas online e importadoras brasileiras em 2025-2026.
- Para vinhos premium conhecidos (ex: Opus One, Sassicaia, Penfolds Grange), use valores condizentes com o mercado de luxo.
- Para vinhos de entrada ou desconhecidos, estime com base nos comparáveis da mesma região/uva.
- Nunca retorne valores abaixo de R$30 ou acima de R$50.000 sem justificativa.
- Se não conhecer o vinho específico, use o produtor e a região para inferir a faixa.
- faixa_min e faixa_max devem formar uma faixa plausível em torno de preco_estimado_brl.
- Retorne SOMENTE o JSON, sem texto adicional.`;

    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const openaiModel = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
    console.log(`[estimate-wine-price] request_id=${requestId} openai_key=${maskSecret(openaiKey)} model=${openaiModel} attachment_type=none ocr_length=0 retries=0`);
    if (!openaiKey) {
      return errorResponse(500, "AI_UNAVAILABLE", "Serviço de IA indisponível.", true);
    }

    const result = await callOpenAIResponses<any>({
      functionName: "estimate-wine-price",
      requestId,
      apiKey: openaiKey,
      model: openaiModel,
      timeoutMs: 10_000,
      temperature: 0.3,
      instructions: systemPrompt,
      input: [{ role: "user", content: [{ type: "input_text", text: `Estime o preço de mercado no Brasil para este vinho:\n\n${wineDesc}` }] }],
      schema: {
        type: "object",
        properties: {
          preco_estimado_brl: { type: "number" },
          faixa_min: { type: "number" },
          faixa_max: { type: "number" },
          confianca: { type: "string", enum: ["alta", "media", "baixa"] },
          fonte_referencia: { type: "string" },
        },
        required: ["preco_estimado_brl", "faixa_min", "faixa_max", "confianca", "fonte_referencia"],
        additionalProperties: false,
      },
      maxOutputTokens: 200,
    });
    if (!result.ok) {
      console.warn("[estimate-wine-price] ai_failed", { request_id: requestId, status: result.status, latency_ms: Date.now() - startedAt, retryable: result.status === 429 || result.status >= 500 });
      if (result.status === 429) {
        return errorResponse(429, "RATE_LIMIT", "Muitas requisições. Tente novamente em instantes.", true);
      }
      if (result.status === 422) {
        return errorResponse(422, "PARSE_ERROR", "A resposta da IA veio em um formato inválido. Tente novamente.", true);
      }
      return errorResponse(result.status === 504 ? 408 : 502, result.status === 504 ? "AI_TIMEOUT" : "AI_UNAVAILABLE", result.status === 504 ? "A estimativa demorou muito. Tente novamente." : "Erro ao estimar preço.", true);
    }
    const parsed = result.parsed;
    const price = Number(parsed.preco_estimado_brl ?? parsed.estimated_price);

    if (!Number.isFinite(price) || price < 0) {
      return errorResponse(422, "PARSE_ERROR", "A resposta da IA veio em um formato inválido. Tente novamente.", true);
    }

    const roundedPrice = Math.round(price * 100) / 100;
    const rangeMinRaw = Number(parsed.faixa_min);
    const rangeMaxRaw = Number(parsed.faixa_max);
    const faixaMin = Number.isFinite(rangeMinRaw) && rangeMinRaw > 0 ? Math.round(rangeMinRaw * 100) / 100 : Math.round(roundedPrice * 0.82 * 100) / 100;
    const faixaMax = Number.isFinite(rangeMaxRaw) && rangeMaxRaw >= faixaMin ? Math.round(rangeMaxRaw * 100) / 100 : Math.round(roundedPrice * 1.22 * 100) / 100;
    const confidence = parsed.confianca || parsed.confidence || "media";
    const reasoning = parsed.fonte_referencia || parsed.reasoning || "";
    const response = {
      preco_estimado_brl: roundedPrice,
      faixa_min: faixaMin,
      faixa_max: faixaMax,
      confianca: confidence,
      fonte_referencia: reasoning,
      estimated_price: roundedPrice,
      confidence,
      reasoning,
    };
    await setCachedAiResponse("estimate-wine-price", cacheInput, response, { userId: claimsData.claims.sub });
    console.log("[estimate-wine-price] success", { request_id: requestId, latency_ms: Date.now() - startedAt, retryable: false });
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[estimate-wine-price] fatal_error", { request_id: requestId, latency_ms: Date.now() - startedAt, error: err instanceof Error ? err.message : String(err), retryable: true });
    return errorResponse(500, "AI_UNAVAILABLE", "Erro ao estimar preço.", true);
  }
});
