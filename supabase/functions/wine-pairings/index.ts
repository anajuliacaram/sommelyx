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
    const { mode, wineName, wineStyle, wineGrape, wineRegion, dish, userWines } = body as Record<string, any>;

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "wine-to-food") {
      systemPrompt = `Você é um sommelier profissional com 20+ anos de experiência em restaurantes premiados. Tom: técnico mas acessível.

REGRA FUNDAMENTAL — ZERO TEMPLATES:
Cada explicação DEVE ser escrita do zero, específica para ESTE vinho e ESTE prato. NUNCA use frases pré-fabricadas. Se duas sugestões usarem lógica similar, reescreva com vocabulário e ângulo diferentes.

PROIBIDO (frases genéricas que NUNCA devem aparecer):
- "combina com carnes vermelhas"
- "harmoniza bem com o prato"
- "uma boa opção para acompanhar"
- "complementa os sabores"
- "a acidez do vinho combina"
Qualquer frase que poderia ser dita sobre QUALQUER vinho é proibida.

OBRIGATÓRIO em cada explicação:
1. Cite pelo menos 2 propriedades ESPECÍFICAS do vinho (ex: "taninos aveludados de média intensidade", "acidez cítrica marcante", "álcool moderado de 13%", "notas de cereja negra e tabaco")
2. Cite pelo menos 1 propriedade ESPECÍFICA do prato (ex: "a gordura intramuscular da picanha", "a untuosidade do molho béarnaise", "o umami intenso do cogumelo shiitake")
3. Explique a INTERAÇÃO FÍSICA entre vinho e prato (como o tanino reage com a proteína, como a acidez corta a gordura, como a textura cremosa espelha o corpo)

LÓGICA DE HARMONIZAÇÃO — cada sugestão DEVE usar uma diferente:
- Contraste: opostos que se equilibram (acidez alta vs gordura)
- Semelhança: texturas ou intensidades que se espelham
- Complemento: aromas que se completam (notas herbáceas do vinho + ervas do prato)
- Equilíbrio: peso proporcional entre vinho e prato
- Limpeza: o vinho reseta o paladar entre mordidas

REGRAS ENOLÓGICAS INVIOLÁVEIS:
1. PESO EQUIVALENTE: Corpo do vinho proporcional à intensidade do prato
2. ACIDEZ + GORDURA: Só funciona se o vinho TEM acidez alta comprovada
3. TANINO + PROTEÍNA: Taninos se suavizam com gordura animal. Tanino + peixe delicado = metálico
4. DOÇURA vs PICANTE: Residual sugar equilibra ardência. Álcool alto + picante = desastre
5. REGIONALIDADE: Priorize clássicos regionais quando aplicável

CONFLITOS PROIBIDOS:
- Tinto tânico com peixe branco delicado
- Tinto encorpado com salada crua leve
- Vinho doce com prato muito ácido
- Vinho muito alcoólico com comida picante
- Chardonnay com madeira com ceviche

SE NÃO TEM CERTEZA: Prefira clássicos seguros a combinações arriscadas.

FORMATO DO "reason":
3-4 frases. Comece descrevendo a característica do vinho que interage, depois como ela se encontra com o prato, depois o efeito no paladar. NUNCA comece com "(Contraste)" ou "(Semelhança)" — isso vai no campo harmony_type.

Responda APENAS em JSON válido:
{
  "pairings": [
    {
      "dish": "Nome específico do prato com preparo",
      "reason": "3-4 frases técnicas e específicas sobre a interação real entre ESTE vinho e ESTE prato",
      "match": "perfeito" | "muito bom" | "bom",
      "harmony_type": "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza",
      "harmony_label": "frase curta descrevendo o tipo de harmonia (ex: 'acidez que limpa o paladar', 'texturas que se espelham')"
    }
  ]
}
Sugira 4-5 pratos. Cada um com lógica DIFERENTE.`;
      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região: ${wineRegion || "Não informada"}

INSTRUÇÃO: Primeiro analise internamente o perfil REAL deste vinho — corpo, acidez, tanino, álcool, aromas típicos desta uva nesta região. Depois sugira APENAS pratos onde a interação físico-química entre vinho e prato é comprovada. Para cada sugestão, escreva uma explicação ÚNICA que não poderia ser usada para nenhum outro vinho.`;
    } else if (mode === "food-to-wine") {
      systemPrompt = `Você é um sommelier profissional com 20+ anos de experiência em restaurantes premiados. Tom: técnico mas acessível.

${userWines?.length ? `O usuário tem vinhos na adega. PRIORIZE vinhos da adega — mas SÓ sugira se REALMENTE harmoniza com o prato. Se nenhum vinho da adega combina, diga isso e sugira o perfil ideal.` : "Sugira tipos específicos de vinho com explicações detalhadas baseadas na interação real com o prato."}

REGRA FUNDAMENTAL — ZERO TEMPLATES:
Cada explicação DEVE ser escrita do zero, específica para ESTE vinho e ESTE prato. NUNCA repita a mesma frase ou estrutura entre sugestões diferentes.

PROIBIDO (frases genéricas):
- "combina com o prato"
- "harmoniza bem"
- "uma boa opção"
- "complementa os sabores do prato"
Qualquer frase aplicável a qualquer vinho é proibida.

OBRIGATÓRIO em cada explicação:
1. Cite propriedades REAIS do vinho sugerido (taninos, acidez, corpo, álcool, aromas específicos)
2. Cite propriedades REAIS do prato (gordura, sal, umami, textura, método de cocção, molho)
3. Explique a INTERAÇÃO entre eles (como o tanino reage com a proteína, como a acidez corta gordura específica)
4. Se é vinho da adega: use o NOME, UVA e REGIÃO reais para fundamentar. Não trate como tipo genérico.

PARA VINHOS DA ADEGA:
- Se a uva é conhecida, cite características TÍPICAS daquela uva (ex: "O Carmenère tem taninos de textura sedosa e notas de pimentão verde que...")
- Se a safra é conhecida, considere maturidade (ex: safra 2018 = 8 anos, taninos já integrados)
- NUNCA force um vinho da adega que não combina. Se não combina, explique POR QUÊ e sugira o perfil correto.

REGRAS ENOLÓGICAS INVIOLÁVEIS:
1. Peso equivalente: corpo do vinho = intensidade do prato
2. Acidez + gordura: só funciona se o vinho TEM acidez alta
3. Tanino + proteína: tanino com peixe = metálico, NUNCA sugira
4. Doçura + picante: vinho doce equilibra. Seco + álcool alto amplifica ardência
5. Regionalidade: priorize clássicos regionais

CONFLITOS PROIBIDOS:
- Tinto tânico com peixe branco delicado
- Tinto encorpado com salada crua
- Vinho doce com prato ácido
- Álcool alto com comida picante

CADA sugestão DEVE usar LÓGICA DIFERENTE:
Contraste / Semelhança / Complemento / Equilíbrio / Limpeza

Se dois vinhos são boas opções, explique razões COMPLETAMENTE DIFERENTES (um pela acidez, outro pela textura, outro pelo aroma).

FORMATO DO "reason":
3-4 frases. Específicas. Técnicas. Únicas para aquele vinho.

Responda APENAS em JSON válido:
{
  "suggestions": [
    {
      "wineName": "Nome específico do vinho ou tipo detalhado",
      "style": "tinto|branco|rosé|espumante",
      "grape": "uva principal se conhecida",
      "vintage": 2020,
      "region": "região se conhecida",
      "country": "país se conhecido",
      "reason": "3-4 frases técnicas e específicas",
      "fromCellar": true/false,
      "match": "perfeito" | "muito bom" | "bom",
      "harmony_type": "contraste" | "semelhança" | "complemento" | "equilíbrio" | "limpeza",
      "harmony_label": "frase curta descrevendo a harmonia"
    }
  ]
}
Sugira 3-5 opções.`;
      const cellarContext = userWines?.length
        ? `\nVinhos na adega do usuário:\n${(userWines as any[]).map((w: any) => `- ${w.name} (estilo: ${w.style || "?"}, uva: ${w.grape || "?"}, região: ${w.region || "?"}, país: ${w.country || "?"}, safra: ${w.vintage || "?"}, produtor: ${w.producer || "?"})`).join("\n")}`
        : "";
      userPrompt = `Prato: "${dish}"${cellarContext}

PASSO 1 — ANÁLISE OBRIGATÓRIA DO PRATO (faça internamente antes de sugerir):
- Qual é a proteína principal? (carne vermelha, branca, peixe, ovo, vegetal, laticínio)
- Qual o método de cocção? (grelhado, frito, cozido, cru, assado, refogado)
- Qual a gordura dominante? (manteiga, azeite, gordura animal, leite de coco)
- Quais temperos/molhos? (sal, ervas, especiarias, molho de tomate, creme)
- Qual a INTENSIDADE geral do prato? (leve, média, intensa)
- Quais sabores dominam? (umami, doce, ácido, amargo, salgado)

PASSO 2 — Para CADA vinho sugerido, sua explicação DEVE:
1. Citar como propriedades ESPECÍFICAS do vinho (ex: "taninos de textura sedosa", "acidez málica", "12.5% álcool") interagem com componentes REAIS do prato
2. Explicar O QUE ACONTECE no paladar (ex: "os taninos suavizam ao encontrar a gordura do ovo frito, criando uma textura aveludada")
3. Ser IMPOSSÍVEL de copiar para outro prato — se trocar o nome do prato e a frase ainda fizer sentido, está ERRADA
4. Se há vinhos IGUAIS na adega, sugira APENAS UM deles

PROIBIDO: "combina bem", "harmoniza com", "boa opção", "complementa os sabores". Cada frase DEVE ser específica o suficiente para não servir para nenhum outro vinho ou prato.`;
    } else {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 400, "validation_error", Date.now() - startTime, { mode });
      return jsonResponse({ error: "Mode inválido" }, 400);
    }

    const tools = mode === "wine-to-food" ? [
      {
        type: "function" as const,
        function: {
          name: "return_pairings",
          description: "Return dish pairing suggestions for a wine",
          parameters: {
            type: "object",
            properties: {
              pairings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dish: { type: "string", description: "Nome específico do prato com método de preparo" },
                    reason: { type: "string", description: "3-4 frases técnicas explicando a interação físico-química entre ESTE vinho e ESTE prato. Cite propriedades reais do vinho (taninos, acidez, corpo) e do prato (gordura, sal, textura). NUNCA use frases genéricas." },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string", description: "Frase curta descrevendo a harmonia (ex: 'acidez que corta a gordura')" },
                  },
                  required: ["dish", "reason", "match", "harmony_type", "harmony_label"],
                  additionalProperties: false,
                },
              },
            },
            required: ["pairings"],
            additionalProperties: false,
          },
        },
      },
    ] : [
      {
        type: "function" as const,
        function: {
          name: "return_suggestions",
          description: "Return wine suggestions for a dish",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    wineName: { type: "string", description: "Nome específico do vinho" },
                    style: { type: "string", enum: ["tinto", "branco", "rosé", "espumante"] },
                    grape: { type: "string", description: "Uva principal" },
                    vintage: { type: "number", description: "Safra" },
                    region: { type: "string" },
                    country: { type: "string" },
                    reason: { type: "string", description: "3-4 frases técnicas ÚNICAS explicando por que ESTE vinho combina com ESTE prato. Cite propriedades reais (taninos, acidez, corpo, aromas da uva). PROIBIDO usar frases genéricas como 'combina bem' ou 'harmoniza com'. Cada sugestão DEVE ter explicação completamente diferente." },
                    fromCellar: { type: "boolean" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string", description: "Frase curta descrevendo a harmonia" },
                  },
                  required: ["wineName", "style", "reason", "fromCellar", "match", "harmony_type", "harmony_label"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    ];

    const toolChoice = mode === "wine-to-food"
      ? { type: "function" as const, function: { name: "return_pairings" } }
      : { type: "function" as const, function: { name: "return_suggestions" } };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75_000);

    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: toolChoice,
        temperature: 0.75,
      }),
    });

    clearTimeout(timeout);

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
    
    // Try tool calling response first, then fall back to content parsing
    let parsed;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        parsed = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } else {
        // Fallback: parse from content
        const content = aiData.choices?.[0]?.message?.content || "";
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        } else {
          parsed = JSON.parse(content);
        }
      }
    } catch (parseErr) {
      console.error("AI parse error:", parseErr, JSON.stringify(aiData).slice(0, 500));
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "ai_parse_error", Date.now() - startTime);
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
