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
  } catch { /* Silent */ }
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
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin. Sua análise é técnica, precisa e orientada à decisão.

TAREFA: Sugira 6-8 pratos que harmonizam com o vinho fornecido. Organize em 3 categorias mentais:
- CLÁSSICOS: harmonizações tradicionais e comprovadas
- AFINIDADE AROMÁTICA: pratos que compartilham notas aromáticas
- CONTRASTE: opostos que se equilibram

ANTES DE SUGERIR, analise internamente o PERFIL TÉCNICO do vinho:
- Corpo (leve/médio/encorpado)
- Acidez (baixa/média/alta)
- Taninos se tinto (sedosos/firmes/estruturados)
- Álcool (leve <12% / moderado 12-14% / alto >14%)
- Aromas dominantes baseados na uva e região
- Estilo gastronômico (aperitivo, entrada, prato principal, sobremesa)

REGRA ZERO — ESPECIFICIDADE ABSOLUTA:
Cada explicação DEVE citar:
1. Pelo menos 2 propriedades ESPECÍFICAS do vinho (ex: "taninos aveludados de média intensidade", "acidez málica marcante")
2. Pelo menos 1 componente ESPECÍFICO do prato (ex: "a gordura intramuscular", "o umami do molho de soja")
3. A INTERAÇÃO FÍSICA entre eles (ex: "os taninos se suavizam ao encontrar a proteína, criando textura aveludada")

PROIBIDO: "combina bem", "harmoniza", "boa opção", "complementa os sabores" — qualquer frase genérica que sirva para qualquer vinho.

CADA sugestão DEVE usar uma lógica de harmonização DIFERENTE:
- Contraste: opostos que se equilibram (acidez vs gordura)
- Semelhança: texturas/intensidades que se espelham
- Complemento: aromas que se completam
- Equilíbrio: peso proporcional
- Limpeza: vinho reseta o paladar

REGRAS ENOLÓGICAS INVIOLÁVEIS:
1. Peso equivalente: corpo do vinho ∝ intensidade do prato
2. Tanino + peixe delicado = sabor metálico → NUNCA sugira
3. Álcool alto + picante = desastre → NUNCA sugira
4. Vinho doce com prato muito ácido = conflito → NUNCA sugira
5. Regionalidade: priorize quando aplicável

FORMATO DO "reason": 2-3 frases diretas e técnicas. Sem introduções vagas.`;

      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região: ${wineRegion || "Não informada"}

Analise o perfil técnico real deste vinho e sugira 6-8 pratos com explicações ÚNICAS e específicas. Varie entre pratos leves, médios e intensos. Inclua pelo menos 1 entrada, 4-5 pratos principais e 1 opção de queijos/sobremesa se apropriado.`;

    } else if (mode === "food-to-wine") {
      const hasCellar = userWines?.length > 0;
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${hasCellar ? `REGRA CRÍTICA: O usuário tem vinhos NA ADEGA. Você DEVE priorizar rótulos REAIS da adega. Para cada vinho da adega sugerido, use o NOME EXATO, a UVA, a REGIÃO e a SAFRA reais. NUNCA responda com categorias genéricas ("vinho branco seco") se há vinhos reais compatíveis.

Se NENHUM vinho da adega combina adequadamente, diga isso honestamente e sugira o perfil ideal que o usuário deveria buscar.` : "Sugira tipos específicos de vinho com rótulos de referência."}

ANTES DE SUGERIR, analise internamente o PERFIL DO PRATO:
- Proteína principal (vermelha, branca, peixe, vegetal, ovo, laticínio)
- Método de cocção (grelhado, frito, cozido, cru, assado, refogado)
- Gordura dominante (manteiga, azeite, gordura animal, leite de coco)
- Temperos/molhos (sal, ervas, especiarias, tomate, creme)
- Intensidade geral (leve, média, intensa)
- Sabores dominantes (umami, doce, ácido, amargo, salgado)

REGRA ZERO — ESPECIFICIDADE:
Para vinhos da adega: cite características TÍPICAS daquela uva naquela região (ex: "O Carmenère chileno tem taninos sedosos e notas herbáceas que...")
Para safras conhecidas: considere maturidade (ex: safra 2018 = ~8 anos, taninos já integrados)

CADA explicação DEVE:
1. Citar propriedades REAIS do vinho (taninos, acidez, corpo, álcool, aromas da uva)
2. Citar componentes REAIS do prato (gordura, sal, umami, textura, método de cocção)
3. Explicar a INTERAÇÃO FÍSICA entre eles
4. Ser IMPOSSÍVEL de copiar para outro par vinho/prato

PROIBIDO: "combina bem", "harmoniza", "boa opção", "complementa os sabores" — qualquer frase genérica.

CADA sugestão com lógica DIFERENTE: Contraste / Semelhança / Complemento / Equilíbrio / Limpeza

REGRAS ENOLÓGICAS INVIOLÁVEIS:
1. Peso equivalente
2. Tanino + peixe = metálico → NUNCA
3. Álcool alto + picante = amplifica ardência → NUNCA
4. NUNCA force um vinho da adega que não combina

Sugira 3-5 opções. Se há vinhos da adega compatíveis, pelo menos 3 devem ser da adega.`;

      const cellarContext = hasCellar
        ? `\nVinhos na adega do usuário:\n${(userWines as any[]).map((w: any) => `- ${w.name} (estilo: ${w.style || "?"}, uva: ${w.grape || "?"}, região: ${w.region || "?"}, país: ${w.country || "?"}, safra: ${w.vintage || "?"}, produtor: ${w.producer || "?"})`).join("\n")}`
        : "";
      userPrompt = `Prato: "${dish}"${cellarContext}

Analise o prato tecnicamente e sugira os melhores vinhos. Para cada um, explique a interação físico-química específica entre ESTE vinho e ESTE prato.`;
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
              wineProfile: {
                type: "object",
                description: "Technical profile of the wine analyzed",
                properties: {
                  body: { type: "string", enum: ["leve", "médio", "encorpado"] },
                  acidity: { type: "string", enum: ["baixa", "média", "alta"] },
                  tannin: { type: "string", enum: ["n/a", "sedosos", "firmes", "estruturados"] },
                  style: { type: "string", description: "Gastro style: aperitivo, versátil, gastronomico, sobremesa" },
                },
                required: ["body", "acidity", "tannin", "style"],
                additionalProperties: false,
              },
              pairings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dish: { type: "string", description: "Nome específico do prato com preparo" },
                    category: { type: "string", enum: ["classico", "afinidade", "contraste"], description: "Categoria da harmonização" },
                    reason: { type: "string", description: "2-3 frases técnicas sobre a interação físico-química" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string", description: "Frase curta (ex: 'acidez que corta a gordura')" },
                  },
                  required: ["dish", "category", "reason", "match", "harmony_type", "harmony_label"],
                  additionalProperties: false,
                },
              },
            },
            required: ["wineProfile", "pairings"],
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
              dishProfile: {
                type: "object",
                description: "Technical analysis of the dish",
                properties: {
                  protein: { type: "string" },
                  cooking: { type: "string" },
                  fat: { type: "string" },
                  intensity: { type: "string", enum: ["leve", "média", "intensa"] },
                },
                required: ["protein", "cooking", "fat", "intensity"],
                additionalProperties: false,
              },
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    wineName: { type: "string", description: "Nome EXATO do vinho (da adega) ou tipo detalhado" },
                    style: { type: "string", enum: ["tinto", "branco", "rosé", "espumante"] },
                    grape: { type: "string" },
                    vintage: { type: "number" },
                    region: { type: "string" },
                    country: { type: "string" },
                    reason: { type: "string", description: "2-3 frases técnicas ÚNICAS" },
                    fromCellar: { type: "boolean" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string" },
                    compatibilityLabel: { type: "string", enum: ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"] },
                  },
                  required: ["wineName", "style", "reason", "fromCellar", "match", "harmony_type", "harmony_label", "compatibilityLabel"],
                  additionalProperties: false,
                },
              },
            },
            required: ["dishProfile", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    ];

    const toolChoice = mode === "wine-to-food"
      ? { type: "function" as const, function: { name: "return_pairings" } }
      : { type: "function" as const, function: { name: "return_suggestions" } };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      signal: controller.signal,
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
        tools,
        tool_choice: toolChoice,
        temperature: 0.7,
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

    let parsed;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        parsed = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } else {
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

    if (mode === "wine-to-food" && (!Array.isArray(parsed.pairings) || parsed.pairings.length === 0)) {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "ai_empty_response", Date.now() - startTime);
      return jsonResponse({ pairings: [], wineProfile: parsed.wineProfile || null });
    }
    if (mode === "food-to-wine" && (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0)) {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "ai_empty_response", Date.now() - startTime);
      return jsonResponse({ suggestions: [], dishProfile: parsed.dishProfile || null });
    }

    await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "success", Date.now() - startTime, {
      mode,
      result_count: mode === "wine-to-food" ? parsed.pairings?.length : parsed.suggestions?.length,
    });

    return jsonResponse(parsed);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "unknown";
    const isAbort = errMsg.toLowerCase().includes("abort");
    console.error("wine-pairings error:", errMsg);
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", isAbort ? 504 : 500, "internal_error", Date.now() - startTime, { error: errMsg, aborted: isAbort });
    if (isAbort) {
      return jsonResponse({ error: "A harmonização demorou mais que o esperado. Tente novamente." }, 504);
    }
    return jsonResponse({ error: "Não conseguimos gerar a sugestão agora." }, 500);
  }
});
