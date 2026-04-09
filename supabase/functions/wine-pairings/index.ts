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
      systemPrompt = `Você é um sommelier profissional com 20+ anos de experiência. Fale de forma técnica mas acessível — como quem explica vinho para um amante de gastronomia, não para um leigo nem para um acadêmico.

VOZ E TOM:
- Use termos técnicos reais (acidez, tanino, corpo, retrogosto, mineralidade) mas sempre explique o EFEITO prático no paladar.
- Seja direto e claro. Frases como "a acidez alta corta a gordura do cordeiro, limpando o paladar entre cada garfada" são o tom ideal.
- NUNCA use linguagem vaga ("combina bem", "boa opção", "harmoniza perfeitamente"). Sempre diga POR QUE funciona.
- NUNCA repita a mesma estrutura de frase entre sugestões diferentes.
- Quando a uva e região são conhecidas, cite características TÍPICAS daquela combinação (ex: "Malbec argentino costuma ter taninos maduros e notas de ameixa preta que...").

RACIOCÍNIO DE HARMONIZAÇÃO:
Para cada sugestão, considere internamente:
- Corpo do vinho vs intensidade do prato
- Acidez vs gordura/untuosidade do prato
- Taninos vs proteína e textura
- Aromas do vinho vs sabores dominantes do prato
- Método de preparo (grelhado, cru, assado, refogado)

CADA sugestão DEVE usar uma LÓGICA DIFERENTE:
- Contraste: opostos que se equilibram (acidez vs gordura, frescor vs peso)
- Semelhança: texturas ou sabores que se espelham e amplificam
- Complemento: aromas diferentes que se completam (ex: defumado do vinho + tostado do preparo)
- Equilíbrio: intensidades proporcionais (prato potente pede vinho potente)
- Limpeza: o vinho "reseta" o paladar (efervescência, acidez alta)

FORMATO DO "reason":
Comece com o tipo de harmonia entre parênteses. Depois, 2-3 frases técnicas mas claras explicando a interação real entre vinho e prato.
Exemplo: "(Contraste) A acidez elevada desse Sauvignon Blanc funciona como um corte na gordura do queijo brie gratinado, limpando o paladar a cada garfada. As notas herbáceas do vinho ainda ecoam o tomilho do preparo."

Responda APENAS em JSON válido:
{
  "pairings": [
    { "dish": "Nome do prato específico", "reason": "Explicação técnica acessível de 2-3 frases", "match": "perfeito" | "muito bom" | "bom", "harmony_type": "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza" }
  ]
}
Sugira 4-5 pratos.`;
      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região: ${wineRegion || "Não informada"}

Considere as características típicas dessa uva e região. Sugira pratos com lógicas de harmonização diferentes entre si.`;
    } else if (mode === "food-to-wine") {
      systemPrompt = `Você é um sommelier profissional com 20+ anos de experiência. Fale de forma técnica mas acessível — termos reais de sommelier explicados de forma clara e direta.

${userWines?.length ? `O usuário tem vinhos na adega. PRIORIZE vinhos da adega dele — cite o nome do vinho e explique por que AQUELE vinho específico funciona (mencione uva, região, características típicas). Adicione 1-2 sugestões gerais se necessário.` : "Sugira tipos de vinho com explicações detalhadas sobre por que funcionam."}

VOZ E TOM:
- Técnico mas acessível. Use termos como acidez, tanino, corpo, mineralidade — mas sempre diga o EFEITO no paladar.
- Direto: "A acidez alta do Chablis corta a gordura da manteiga do linguado" — não "O Chablis combina bem com peixe".
- NUNCA repita a mesma lógica ou estrutura de frase entre sugestões.
- Para vinhos da adega, seja ESPECÍFICO: "Esse Carmenere tem taninos macios e notas de pimentão que acompanham o tempero verde do prato" — não "Um tinto encorpado combina com carne".

RACIOCÍNIO:
- Analise textura do prato (gorduroso, leve, cremoso, crocante)
- Método de preparo (grelhado, cru, assado, refogado, frito)
- Sabores dominantes (umami, ácido, doce, amargo, salgado)
- Qual perfil de vinho (corpo, acidez, tanino) melhor interage e POR QUÊ

CADA sugestão DEVE usar LÓGICA DIFERENTE:
- Contraste / Semelhança / Complemento / Equilíbrio / Limpeza

FORMATO DO "reason":
Comece com o tipo entre parênteses. Depois 2-3 frases claras e técnicas.
Exemplo para vinho da adega: "(Complemento) Esse Malbec da Mendoza tem notas de ameixa preta e cacau que conversam com o molho de redução do prato. Os taninos firmes abraçam a proteína da carne, enquanto o corpo encorpado não se perde diante do tempero."

Responda APENAS em JSON válido:
{
  "suggestions": [
    { "wineName": "Nome específico ou tipo detalhado", "style": "tinto|branco|rose|espumante", "reason": "Explicação técnica acessível de 2-3 frases", "fromCellar": true/false, "match": "perfeito" | "muito bom" | "bom", "harmony_type": "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza" }
  ]
}
Sugira 3-5 opções.`;
      const cellarContext = userWines?.length
        ? `\nVinhos na adega do usuário:\n${(userWines as any[]).map((w: any) => `- ${w.name} (${w.style || "?"}, uva: ${w.grape || "?"}, região: ${w.region || "?"}, safra: ${w.vintage || "?"})`).join("\n")}`
        : "";
      userPrompt = `Prato: ${dish}${cellarContext}\n\nAnalise a textura, preparo e sabores dominantes deste prato. Sugira vinhos com lógicas diferentes entre si.`;
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
