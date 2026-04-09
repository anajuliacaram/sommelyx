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
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

REGRA #1 — FALE DO RÓTULO, NUNCA DA UVA GENÉRICA:
- ERRADO: "Carmenère possui notas de frutas escuras e especiarias"
- CERTO: "O Casillero del Diablo Carmenère, produzido pela Concha y Toro no Valle Central chileno, tem um perfil mais comercial com taninos macios e leve nota herbácea que é marca registrada dos Carmenères de clima quente"

ANTES DE QUALQUER SUGESTÃO, construa um PERFIL MENTAL deste rótulo:
1. O que se sabe sobre ESTE produtor? (escala, filosofia, faixa de preço)
2. O que a REGIÃO de origem implica? (clima, solo, estilo típico)
3. Se tem SAFRA, qual a idade? Taninos integrados ou jovens?
4. Qual o POSICIONAMENTO do vinho? (entrada de linha, reserva, ícone)
5. Corpo, acidez, taninos PROVÁVEIS baseado em tudo acima

CADA EXPLICAÇÃO deve:
- Citar o NOME do vinho (não "este vinho" ou "o Carmenère")
- Referenciar características que SÓ este rótulo/produtor/região teria
- Explicar a INTERAÇÃO FÍSICA entre vinho e prato (ex: "os taninos ainda jovens do [nome] precisam de gordura para se suavizar")
- Usar uma lógica de harmonização DIFERENTE por sugestão: Contraste / Semelhança / Complemento / Equilíbrio / Limpeza

PROIBIDO ABSOLUTAMENTE:
- "[Uva] possui notas de..." — isso é Wikipedia, não sommelier
- "combina bem", "harmoniza perfeitamente", "complementa os sabores"
- Qualquer frase que funcione para QUALQUER vinho da mesma uva

REGRAS ENOLÓGICAS:
1. Peso equivalente: corpo do vinho ∝ intensidade do prato
2. Tanino + peixe delicado = metálico → NUNCA
3. Álcool alto + picante = desastre → NUNCA
4. Regionalidade: priorize quando fizer sentido (ex: Chianti com ragù toscano)

JULGAMENTO HONESTO — nem todo prato é "perfeito":
- perfeito: harmonia excepcional, elevam um ao outro
- muito bom: funciona muito bem, recomendação segura
- bom: funciona, mas não é memorável`;

      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Produtor: ${(body as any).wineProducer || "Não informado"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região/País: ${wineRegion || "Não informada"}
Safra: ${(body as any).wineVintage || "Não informada"}

Analise o perfil ESPECÍFICO deste rótulo (não da uva genérica) e sugira 6-8 pratos. Sempre cite "${wineName}" pelo nome nas explicações. Varie entre entradas, pratos principais e queijos/sobremesa.`;

    } else if (mode === "food-to-wine") {
      const hasCellar = userWines?.length > 0;
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${hasCellar ? `REGRA CRÍTICA: O usuário tem vinhos NA ADEGA. Você DEVE priorizar rótulos REAIS. Use o NOME EXATO de cada vinho sugerido. NUNCA responda com categorias genéricas ("vinho branco seco") se há vinhos reais compatíveis.

Se NENHUM vinho da adega combina adequadamente, diga isso honestamente e sugira o perfil ideal que o usuário deveria buscar.` : "Sugira tipos específicos de vinho com rótulos de referência."}

REGRA #1 — FALE DO RÓTULO, NUNCA DA UVA GENÉRICA:
- ERRADO: "Um Malbec argentino possui taninos aveludados..."
- CERTO: "O Catena Zapata Malbec 2019, do terroir de altitude de Mendoza (~1000m), desenvolve taninos mais refinados e acidez mais viva que Malbecs de planície, o que o torna ideal para..."

PARA CADA VINHO DA ADEGA, considere:
1. O que se sabe sobre o PRODUTOR? (escala, filosofia)
2. O que a REGIÃO implica sobre o estilo?
3. A SAFRA indica maturidade? (ex: 2018 = ~8 anos, taninos integrados)
4. O POSICIONAMENTO do vinho (linha básica vs reserva)

CADA EXPLICAÇÃO deve:
- Citar o vinho PELO NOME (não "este Malbec")
- Explicar por que ESTE rótulo específico funciona (ou não) com ESTE prato
- Referenciar componentes REAIS do prato (gordura, sal, umami, textura, cocção)
- Descrever a INTERAÇÃO FÍSICA (ex: "a acidez alta do [nome] corta a gordura da picanha")

JULGAMENTO HONESTO — use toda a escala:
- Excelente escolha: harmonia excepcional
- Alta compatibilidade: muito boa combinação
- Boa opção: funciona bem
- Funciona bem: aceitável
- Escolha ousada: pode funcionar mas é arriscado
- Pouco indicado: não recomendo

NEM TODOS os vinhos devem ser positivos. Se um vinho da adega é ruim para o prato, diga.

PROIBIDO: "[Uva] possui notas de...", "combina bem", "harmoniza", qualquer frase genérica.`;

      const cellarContext = hasCellar
        ? `\nVinhos na adega do usuário:\n${(userWines as any[]).map((w: any) => `- ${w.name} | Produtor: ${w.producer || "?"} | Uva: ${w.grape || "?"} | Região: ${w.region || "?"}, ${w.country || "?"} | Safra: ${w.vintage || "?"} | Estilo: ${w.style || "?"}`).join("\n")}`
        : "";
      userPrompt = `Prato: "${dish}"${cellarContext}

Analise o prato tecnicamente e sugira os melhores vinhos. Para cada um, cite o NOME do vinho e explique por que ESTE rótulo específico (não a uva genérica) funciona com este prato. Use julgamento honesto — nem todos precisam ser positivos.`;
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
                  complexity: { type: "string", enum: ["simples", "moderado", "complexo"], description: "Nível de complexidade do vinho" },
                  summary: { type: "string", description: "2-3 frases descrevendo o perfil ESPECÍFICO deste rótulo, citando o nome do vinho. Deve diferenciar de outros vinhos da mesma uva." },
                },
                required: ["body", "acidity", "tannin", "style", "summary"],
                additionalProperties: false,
              },
              pairings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dish: { type: "string", description: "Nome específico do prato com preparo" },
                    category: { type: "string", enum: ["classico", "afinidade", "contraste"], description: "Categoria da harmonização" },
                    reason: { type: "string", description: "2-3 frases técnicas citando o NOME do vinho e explicando a interação físico-química" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string", description: "Frase curta (ex: 'acidez que corta a gordura')" },
                    dish_profile: {
                      type: "object",
                      properties: {
                        intensity: { type: "string", enum: ["leve", "média", "alta"] },
                        texture: { type: "string", description: "Ex: cremosa, estruturada, leve, crocante" },
                        highlight: { type: "string", description: "Ex: gordura, proteína, acidez, umami, doçura" },
                      },
                      required: ["intensity", "texture", "highlight"],
                      additionalProperties: false,
                    },
                    recipe: {
                      type: "object",
                      description: "Receita resumida do prato",
                      properties: {
                        description: { type: "string", description: "1-2 frases sobre o prato" },
                        ingredients: { type: "array", items: { type: "string" }, description: "Lista de ingredientes principais (6-10)" },
                        steps: { type: "array", items: { type: "string" }, description: "5-8 passos de preparo curtos" },
                        wine_reason: { type: "string", description: "Por que este prato harmoniza com o vinho — resumo técnico curto citando o nome do vinho" },
                      },
                      required: ["description", "ingredients", "steps", "wine_reason"],
                      additionalProperties: false,
                    },
                  },
                  required: ["dish", "category", "reason", "match", "harmony_type", "harmony_label", "dish_profile", "recipe"],
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
                    compatibilityLabel: { type: "string", enum: ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem", "Escolha ousada", "Pouco indicado"] },
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
