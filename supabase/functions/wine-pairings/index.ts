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
    const { mode, wineName, wineStyle, wineGrape, wineRegion, dish, userWines } = body;

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "wine-to-food") {
      systemPrompt = `Você é um sommelier experiente. Sugira harmonizações de pratos para um vinho.
Responda APENAS em JSON válido com este formato:
{
  "pairings": [
    { "dish": "Nome do prato", "reason": "Explicação curta e natural em português", "match": "perfeito" | "muito bom" | "bom" }
  ]
}
Sugira 4-5 pratos. Linguagem natural e acessível, não técnica demais.`;
      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região: ${wineRegion || "Não informada"}

Sugira harmonizações ideais para este vinho.`;
    } else if (mode === "food-to-wine") {
      systemPrompt = `Você é um sommelier experiente. O usuário quer saber quais vinhos combinam com um prato.
${userWines?.length ? "Ele tem estes vinhos na adega. Priorize sugestões da adega dele, mas também sugira tipos gerais se necessário." : "Sugira tipos de vinho ideais."}
Responda APENAS em JSON válido com este formato:
{
  "suggestions": [
    { "wineName": "Nome do vinho ou tipo", "style": "tinto|branco|rose|espumante", "reason": "Explicação curta", "fromCellar": true/false, "match": "perfeito" | "muito bom" | "bom" }
  ]
}
Sugira 3-5 opções. Linguagem natural e acessível.`;
      const cellarContext = userWines?.length
        ? `\nVinhos na adega do usuário:\n${userWines.map((w: any) => `- ${w.name} (${w.style || "?"}, ${w.grape || "?"}, ${w.region || "?"})`).join("\n")}`
        : "";
      userPrompt = `Prato escolhido: ${dish}${cellarContext}\n\nSugira vinhos ideais para este prato.`;
    } else {
      return new Response(JSON.stringify({ error: "Mode inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
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

    // Extract JSON from response
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
      parsed = { pairings: [], suggestions: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wine-pairings error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
