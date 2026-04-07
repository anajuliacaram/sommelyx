import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const { imageBase64, userProfile } = body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Envie uma foto da carta de vinhos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileContext = userProfile
      ? `\nPerfil do usuário:
- Estilos preferidos: ${userProfile.topStyles?.join(", ") || "variado"}
- Uvas preferidas: ${userProfile.topGrapes?.join(", ") || "variado"}
- Países preferidos: ${userProfile.topCountries?.join(", ") || "variado"}
- Faixa de preço habitual: R$ ${userProfile.avgPrice || "variado"}`
      : "";

    const systemPrompt = `Você é um sommelier especialista analisando uma carta de vinhos de restaurante.
Identifique todos os vinhos visíveis na foto e para cada um forneça uma avaliação.
${profileContext}

Responda APENAS em JSON válido com este formato:
{
  "wines": [
    {
      "name": "Nome do vinho",
      "producer": "Produtor (se visível)",
      "vintage": 2020,
      "style": "tinto|branco|rose|espumante",
      "price": 89.90,
      "rating": 4.2,
      "verdict": "Texto curto: ex: Excelente custo-benefício, Escolha segura, Fora do comum",
      "compatibility": 85,
      "highlight": "best-value" | "top-pick" | "adventurous" | null
    }
  ],
  "topPick": "Nome do vinho recomendado como melhor escolha geral",
  "bestValue": "Nome do vinho com melhor custo-benefício"
}

Regras:
- rating de 0 a 5 (1 casa decimal)
- compatibility de 0 a 100 (baseado no perfil do usuário se disponível, senão avaliação geral de qualidade)
- verdict: máximo 6 palavras, linguagem natural
- highlight: marque no máximo 2-3 vinhos como destaque
- Se preço não visível, use null
- Ordene por rating decrescente`;

    // For image analysis, use gemini-2.5-flash which handles images well
    const aiResponse = await fetch(AI_URL, {
      method: "POST",
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
              { type: "text", text: "Analise esta carta de vinhos e avalie cada vinho encontrado." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
      } else {
        parsed = JSON.parse(content);
      }
    } catch {
      parsed = { wines: [], topPick: null, bestValue: null };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-wine-list error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
