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

async function logToDb(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  functionName: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>,
) {
  try {
    const adminClient = createClient(supabaseUrl, serviceKey);
    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: functionName,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata || {},
    });
  } catch {
    // Silent fail for logging
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "unknown";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Sessão expirada. Faça login novamente.", code: "AUTH_REQUIRED" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      await logToDb(supabaseUrl, serviceKey, "unknown", "wine-pairings", 401, "unauthorized", Date.now() - startTime);
      return jsonResponse({ error: "Sessão expirada. Faça login novamente.", code: "AUTH_REQUIRED" }, 401);
    }
    userId = user.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 500, "internal_error", Date.now() - startTime, { reason: "missing_api_key" });
      return jsonResponse({ error: "Não conseguimos gerar a sugestão agora." }, 500);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 400, "validation_error", Date.now() - startTime);
      return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
    }
    const { mode, wineName, wineStyle, wineGrape, wineRegion, dish, userWines } = body;

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "wine-to-food") {
      systemPrompt = `Você é um sommelier profissional com 20+ anos de experiência em harmonizações. Sua missão é sugerir pratos que criem experiências gastronômicas memoráveis com o vinho fornecido.

REGRAS DE RACIOCÍNIO OBRIGATÓRIAS:
Para cada sugestão, você DEVE considerar internamente:
- Corpo do vinho (leve, médio, encorpado)
- Acidez (baixa, média, alta)
- Taninos (se tinto: macios, médios, firmes)
- Nível alcoólico
- Doçura residual
- Textura do prato (gorduroso, leve, cremoso, crocante)
- Método de preparo (grelhado, cru, assado, refogado, frito)
- Sabores dominantes do prato (umami, ácido, doce, amargo, salgado)

CADA sugestão DEVE usar uma LÓGICA DIFERENTE de harmonização. Nunca repita o mesmo raciocínio:
- Contraste (ex: acidez corta gordura)
- Semelhança (ex: texturas que se espelham)
- Complemento (ex: aromas que se completam)
- Equilíbrio de intensidade (ex: prato potente pede vinho potente)
- Limpeza de paladar (ex: efervescência limpa untuosidade)

FORMATO DA EXPLICAÇÃO (campo "reason"):
Linha 1: Tipo de harmonia em itálico mental (ex: "Harmonia por contraste.")
Linha 2-3: Explicação ESPECÍFICA mencionando características reais do vinho (acidez, tanino, aromas, corpo) e como interagem com o prato. Cite aromas, texturas, sensações.

NUNCA escreva explicações genéricas como "combina bem" ou "é uma boa opção". Cada explicação deve ser única, específica e revelar conhecimento real de sommelier.

Quando o vinho tem uva e região conhecidas, USE essas informações para personalizar (ex: "Os taninos aveludados típicos de Merlot do Vale do Loire...").

Responda APENAS em JSON válido:
{
  "pairings": [
    { "dish": "Nome do prato (específico, não genérico)", "reason": "Explicação completa de 2-3 frases com lógica real de harmonização", "match": "perfeito" | "muito bom" | "bom", "harmony_type": "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza" }
  ]
}
Sugira 4-5 pratos. Tom natural, humano, de sommelier — não acadêmico nem robótico.`;
      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região: ${wineRegion || "Não informada"}

Analise as características deste vinho (corpo, acidez, tanino, aromas prováveis) e sugira harmonizações com lógicas diferentes entre si. Cada explicação deve ser única e revelar raciocínio real de sommelier.`;
    } else if (mode === "food-to-wine") {
      systemPrompt = `Você é um sommelier profissional com 20+ anos de experiência. O usuário quer saber quais vinhos combinam com um prato específico.

${userWines?.length ? "O usuário tem vinhos na adega. PRIORIZE vinhos da adega dele e personalize a explicação para AQUELE vinho específico (mencione a uva, região, características). Também sugira 1-2 tipos gerais se necessário." : "Sugira tipos de vinho ideais com explicações detalhadas."}

REGRAS DE RACIOCÍNIO OBRIGATÓRIAS:
Para cada sugestão, analise internamente:
- Textura do prato (gorduroso, leve, cremoso, crocante)
- Método de preparo (grelhado, cru, assado, refogado, frito)
- Sabores dominantes (umami, ácido, doce, amargo, salgado)
- Intensidade do prato
- Qual perfil de vinho (corpo, acidez, tanino, aromas) melhor interage

CADA sugestão DEVE usar LÓGICA DIFERENTE:
- Contraste (acidez vs gordura, frescor vs peso)
- Semelhança (texturas que se espelham)
- Complemento (aromas que se completam)
- Equilíbrio de intensidade
- Limpeza de paladar

FORMATO DA EXPLICAÇÃO (campo "reason"):
Se é vinho da adega: mencione o nome do vinho e suas características reais. Ex: "Esse Carmenere tem taninos macios e notas herbáceas que acompanham o tempero verde do prato, enquanto seu corpo médio não compete com a delicadeza do molho."
Se é sugestão geral: explique o perfil ideal. Ex: "Um Riesling seco com alta acidez criaria um contraste refrescante com a gordura do porco, enquanto suas notas cítricas ecoam o limão do molho."

NUNCA use frases genéricas como "combina bem com carne" ou "boa opção para o prato".

Responda APENAS em JSON válido:
{
  "suggestions": [
    { "wineName": "Nome específico ou tipo detalhado", "style": "tinto|branco|rose|espumante", "reason": "Explicação de 2-3 frases com lógica real", "fromCellar": true/false, "match": "perfeito" | "muito bom" | "bom", "harmony_type": "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza" }
  ]
}
Sugira 3-5 opções. Tom natural, humano, de sommelier.`;
      const cellarContext = userWines?.length
        ? `\nVinhos na adega do usuário:\n${(userWines as any[]).map((w: any) => `- ${w.name} (${w.style || "?"}, uva: ${w.grape || "?"}, região: ${w.region || "?"}, safra: ${w.vintage || "?"})`).join("\n")}`
        : "";
      userPrompt = `Prato escolhido: ${dish}${cellarContext}\n\nAnalise a textura, método de preparo, intensidade e sabores dominantes deste prato. Sugira vinhos com lógicas de harmonização diferentes entre si. Cada explicação deve ser única e específica.`;
    } else {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 400, "validation_error", Date.now() - startTime, { mode });
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
      const errText = await aiResponse.text().catch(() => "");
      const outcome = aiResponse.status === 429 ? "rate_limited" : "ai_error";
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", aiResponse.status, outcome, Date.now() - startTime, { ai_status: aiResponse.status });

      if (aiResponse.status === 429) return jsonResponse({ error: "Muitas requisições. Aguarde um momento e tente novamente." }, 429);
      if (aiResponse.status === 402) return jsonResponse({ error: "Créditos de IA esgotados." }, 402);
      console.error("AI gateway error:", aiResponse.status, errText);
      return jsonResponse({ error: "Não conseguimos gerar a sugestão agora." }, 500);
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
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "ai_parse_error", Date.now() - startTime, { raw_length: content.length });
      // Return empty but valid structure so frontend triggers fallback
      parsed = mode === "wine-to-food" ? { pairings: [] } : { suggestions: [] };
    }

    // Validate response structure
    if (mode === "wine-to-food" && (!Array.isArray(parsed.pairings) || parsed.pairings.length === 0)) {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "ai_empty_response", Date.now() - startTime);
      return jsonResponse({ pairings: [] });
    }
    if (mode === "food-to-wine" && (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0)) {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "ai_empty_response", Date.now() - startTime);
      return jsonResponse({ suggestions: [] });
    }

    await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "success", Date.now() - startTime, {
      mode,
      result_count: mode === "wine-to-food" ? parsed.pairings?.length : parsed.suggestions?.length,
    });

    return jsonResponse(parsed);
  } catch (e) {
    console.error("wine-pairings error:", e);
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 500, "internal_error", Date.now() - startTime, { error: e instanceof Error ? e.message : "unknown" });
    return jsonResponse({ error: "Não conseguimos gerar a sugestão agora." }, 500);
  }
});
