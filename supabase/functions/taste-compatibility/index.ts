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
    const { targetWine, userCellar } = body;

    if (!targetWine || !userCellar?.length) {
      return new Response(JSON.stringify({ compatibility: null, label: "Sem dados suficientes" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a concise profile from user's cellar
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

    const profileSummary = `Perfil do colecionador:
- Estilos preferidos: ${topN(styleCount, 3).join(", ") || "variado"}
- Uvas preferidas: ${topN(grapeCount, 5).join(", ") || "variado"}
- Países preferidos: ${topN(countryCount, 3).join(", ") || "variado"}
- Regiões preferidas: ${topN(regionCount, 4).join(", ") || "variado"}
- Total de rótulos: ${userCellar.length}`;

    const systemPrompt = `Você é um sommelier que analisa compatibilidade de um vinho com o perfil de gosto de um colecionador.
Avalie de 0 a 100 o quão compatível esse vinho é com o perfil descrito.

Responda APENAS em JSON válido:
{
  "compatibility": 82,
  "label": "Alta chance de gostar",
  "reason": "Explicação curta de 1 frase em português"
}

Regras para label:
- 85-100: "Alta chance de gostar"
- 70-84: "Combina com seu perfil"  
- 50-69: "Pode surpreender"
- 30-49: "Fora do seu perfil habitual"
- 0-29: "Estilo bem diferente do seu"`;

    const userPrompt = `${profileSummary}

Vinho a avaliar:
- Nome: ${targetWine.name || "Desconhecido"}
- Estilo: ${targetWine.style || "Não informado"}
- Uva: ${targetWine.grape || "Não informada"}
- País: ${targetWine.country || "Não informado"}
- Região: ${targetWine.region || "Não informada"}
- Produtor: ${targetWine.producer || "Não informado"}`;

    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
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
      parsed = { compatibility: null, label: "Não disponível", reason: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Erro interno";
    console.error("taste-compatibility error:", errMsg);
    const sanitizedMsg = /api_key|lovable|config|supabase/i.test(errMsg)
      ? "Não foi possível calcular a compatibilidade agora."
      : errMsg;
    return new Response(JSON.stringify({ error: sanitizedMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
