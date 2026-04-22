import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { name, producer, vintage, style, country, region, grape } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Nome do vinho é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
- Retorne APENAS um JSON no formato: {"estimated_price": NUMBER, "confidence": "alta"|"media"|"baixa", "reasoning": "explicação curta"}
- O preço deve ser o valor médio praticado em lojas online e importadoras brasileiras em 2025-2026.
- Para vinhos premium conhecidos (ex: Opus One, Sassicaia, Penfolds Grange), use valores condizentes com o mercado de luxo.
- Para vinhos de entrada ou desconhecidos, estime com base nos comparáveis da mesma região/uva.
- Nunca retorne valores abaixo de R$30 ou acima de R$50.000 sem justificativa.
- Se não conhecer o vinho específico, use o produtor e a região para inferir a faixa.
- Retorne SOMENTE o JSON, sem texto adicional.`;

    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const openaiModel = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
    console.log(`[estimate-wine-price] openai_key=${maskSecret(openaiKey)} model=${openaiModel}`);
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await callOpenAIResponses<any>({
      functionName: "estimate-wine-price",
      requestId: crypto.randomUUID(),
      apiKey: openaiKey,
      model: openaiModel,
      timeoutMs: 30_000,
      temperature: 0.3,
      instructions: systemPrompt,
      input: [{ role: "user", content: [{ type: "input_text", text: `Estime o preço de mercado no Brasil para este vinho:\n\n${wineDesc}` }] }],
      schema: {
        type: "object",
        properties: {
          estimated_price: { type: "number" },
          confidence: { type: "string", enum: ["alta", "media", "baixa"] },
          reasoning: { type: "string" },
        },
        required: ["estimated_price", "confidence", "reasoning"],
        additionalProperties: false,
      },
      maxOutputTokens: 300,
    });
    if (!result.ok) {
      if (result.status === 422) {
        return new Response(
          JSON.stringify({ error: "INVALID_AI_RESPONSE" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao estimar preço." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const parsed = result.parsed;
    const price = Number(parsed.estimated_price);

    if (!Number.isFinite(price) || price < 0) {
      return new Response(
        JSON.stringify({ error: "Preço estimado inválido" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        estimated_price: Math.round(price * 100) / 100,
        confidence: parsed.confidence || "media",
        reasoning: parsed.reasoning || "",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("estimate-wine-price error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
