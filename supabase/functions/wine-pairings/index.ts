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
      systemPrompt = `Você é um sommelier profissional com 20+ anos de experiência. Fale de forma técnica mas acessível.

REGRA DE OURO — PRECISÃO ENOLÓGICA:
Você DEVE basear suas sugestões em PRINCÍPIOS REAIS de harmonização enológica. NUNCA invente combinações. Siga estas regras fundamentais:

1. PESO EQUIVALENTE: O corpo do vinho deve ser proporcional à intensidade do prato. Vinho leve (Vinho Verde, Muscadet) → pratos leves. Vinho encorpado (Barolo, Cabernet) → pratos intensos. NUNCA sugira um tinto encorpado com sashimi ou um branco leve com feijoada.

2. ACIDEZ CORTA GORDURA: Vinhos com acidez alta (Sauvignon Blanc, Champagne, Barbera) funcionam com pratos gordurosos. Vinhos com baixa acidez NÃO limpam o paladar — não sugira essa lógica se o vinho não tem acidez.

3. TANINO + PROTEÍNA: Taninos se suavizam com proteína e gordura animal. Mas taninos fortes CONFLITAM com peixes delicados e pratos ácidos — isso é um ERRO clássico, nunca cometa.

4. DOÇURA vs PICANTE/SALGADO: Vinhos doces (Riesling Spätlese, Moscato) equilibram comida picante ou muito salgada. Vinhos secos + comida muito picante = desastre (álcool amplifica a ardência).

5. REGIONALIDADE: Quando possível, priorize harmonizações regionais clássicas (Chianti + ragú toscano, Malbec + asado, Vinho Verde + bacalhau). São testadas por séculos.

6. CONFLITOS PROIBIDOS — NUNCA sugira:
   - Tinto tânico com peixe branco delicado (tanino + iodo = metálico)
   - Tinto encorpado com salada crua leve
   - Vinho doce com prato muito ácido (vinagre, limão forte)
   - Vinho muito alcoólico com comida picante
   - Branco amanteigado (Chardonnay com madeira) com ceviche ácido

7. SE NÃO TEM CERTEZA: Prefira sugestões clássicas e seguras a combinações "criativas" arriscadas. É melhor acertar no básico do que errar tentando surpreender.

VOZ E TOM:
- Técnico mas acessível. Use acidez, tanino, corpo, mineralidade — sempre explicando o EFEITO.
- NUNCA use linguagem vaga ("combina bem", "boa opção"). Sempre diga POR QUE funciona.
- Quando a uva e região são conhecidas, cite características TÍPICAS reais.

CADA sugestão DEVE usar uma LÓGICA DIFERENTE:
- Contraste: opostos que se equilibram (acidez vs gordura)
- Semelhança: texturas que se espelham
- Complemento: aromas que se completam
- Equilíbrio: intensidades proporcionais
- Limpeza: o vinho reseta o paladar

FORMATO DO "reason":
Comece com o tipo entre parênteses. Depois 2-3 frases explicando a interação REAL.

Responda APENAS em JSON válido:
{
  "pairings": [
    { "dish": "Nome do prato específico", "reason": "Explicação técnica de 2-3 frases", "match": "perfeito" | "muito bom" | "bom", "harmony_type": "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza" }
  ]
}
Sugira 4-5 pratos.`;
      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região: ${wineRegion || "Não informada"}

Primeiro, analise internamente o perfil real deste vinho (corpo, acidez, tanino, aromas típicos dessa uva/região). Depois sugira APENAS pratos que realmente funcionam segundo princípios enológicos. Se não conhece a uva, baseie-se no estilo informado.`;
    } else if (mode === "food-to-wine") {
      systemPrompt = `Você é um sommelier profissional com 20+ anos de experiência. Fale de forma técnica mas acessível.

${userWines?.length ? `O usuário tem vinhos na adega. PRIORIZE vinhos da adega — mas SÓ sugira se REALMENTE harmoniza com o prato segundo princípios enológicos. Se nenhum vinho da adega combina bem, diga isso e sugira o perfil ideal.` : "Sugira tipos de vinho com explicações detalhadas."}

REGRA DE OURO — PRECISÃO ENOLÓGICA:
Você DEVE basear suas sugestões em PRINCÍPIOS REAIS. NUNCA invente combinações.

1. PESO EQUIVALENTE: Corpo do vinho proporcional à intensidade do prato. NUNCA sugira tinto encorpado com prato delicado ou branco leve com prato pesado.

2. ACIDEZ CORTA GORDURA: Só funciona se o vinho TEM acidez alta. Não invente essa propriedade.

3. TANINO + PROTEÍNA: Taninos se suavizam com carne/gordura. Mas tanino + peixe delicado = erro metálico. NUNCA cometa.

4. DOÇURA vs PICANTE: Vinhos doces equilibram picante. Vinhos secos + muito álcool amplificam ardência — NUNCA sugira.

5. REGIONALIDADE: Priorize clássicos regionais testados por séculos quando aplicável.

6. CONFLITOS PROIBIDOS:
   - Tinto tânico com peixe branco delicado
   - Tinto encorpado com salada leve
   - Vinho doce com prato muito ácido
   - Vinho alcoólico com comida picante
   - Chardonnay com madeira com ceviche

7. HONESTIDADE: Se um vinho da adega NÃO combina com o prato pedido, NÃO force a sugestão. Diga que o perfil não é ideal e sugira o que seria melhor.

VOZ E TOM:
- Técnico mas acessível. Direto. Cite características reais do vinho.
- Para vinhos da adega: "Esse Carmenere tem taninos macios e notas de pimentão que..." — NUNCA "Um tinto encorpado combina com carne".

CADA sugestão DEVE usar LÓGICA DIFERENTE:
- Contraste / Semelhança / Complemento / Equilíbrio / Limpeza

FORMATO DO "reason":
Comece com o tipo entre parênteses. 2-3 frases com raciocínio real.

Responda APENAS em JSON válido:
{
  "suggestions": [
    { "wineName": "Nome específico ou tipo detalhado", "style": "tinto|branco|rose|espumante", "reason": "2-3 frases técnicas", "fromCellar": true/false, "match": "perfeito" | "muito bom" | "bom", "harmony_type": "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza" }
  ]
}
Sugira 3-5 opções.`;
      const cellarContext = userWines?.length
        ? `\nVinhos na adega do usuário:\n${(userWines as any[]).map((w: any) => `- ${w.name} (${w.style || "?"}, uva: ${w.grape || "?"}, região: ${w.region || "?"}, safra: ${w.vintage || "?"})`).join("\n")}`
        : "";
      userPrompt = `Prato: ${dish}${cellarContext}\n\nPrimeiro, analise internamente a textura, gordura, preparo e sabores dominantes deste prato. Depois sugira APENAS vinhos que realmente harmonizam segundo princípios enológicos. Se algum vinho da adega não combina, não force — sugira o perfil correto.`;
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
