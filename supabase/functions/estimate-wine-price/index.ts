const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResp = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Estime o preço de mercado no Brasil para este vinho:\n\n${wineDesc}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI API error:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "Falha ao consultar inteligência" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = rawContent.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error("Could not parse AI response:", rawContent);
      return new Response(
        JSON.stringify({ error: "Resposta inválida da inteligência" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
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
