import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Autenticação necessária" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse({ error: "Sessão inválida" }, 401);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }
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
      return jsonResponse({ error: "Mode inválido" }, 400);
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
      if (aiResponse.status === 429) return jsonResponse({ error: "Muitas requisições. Tente novamente em instantes." }, 429);
      if (aiResponse.status === 402) return jsonResponse({ error: "Créditos de IA esgotados." }, 402);
      const errText = await aiResponse.text().catch(() => "");
      console.error("AI gateway error:", aiResponse.status, errText);
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

    return jsonResponse(parsed);
  } catch (e) {
    console.error("wine-pairings error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
