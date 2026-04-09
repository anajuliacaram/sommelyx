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

REGRA ABSOLUTA — ANÁLISE DO RÓTULO ESPECÍFICO:
Você NUNCA está analisando uma uva. Você está analisando UM VINHO ESPECÍFICO com nome, produtor, região e história.

PROCESSO OBRIGATÓRIO — Antes de qualquer sugestão, execute esta análise interna:
1. PRODUTOR: Quem faz este vinho? É uma cooperativa grande, uma vinícola boutique, um produtor familiar? Qual a filosofia? (ex: Concha y Toro = escala industrial; Catena Zapata = altitude e terroir; Penfolds = blends de prestígio)
2. REGIÃO + CLIMA: De onde vem? Clima quente = mais corpo, menos acidez, taninos maduros. Clima frio = mais acidez, mais elegância, taninos mais firmes. Altitude = acidez preservada mesmo em clima quente.
3. POSICIONAMENTO: É entrada de linha (ex: Casillero del Diablo), linha premium (ex: Marqués de Casa Concha), ou ícone (ex: Don Melchor)? Isso define complexidade e preço.
4. SAFRA: Se informada, calcule a idade. Vinho jovem (<3 anos) = taninos ainda ásperos, frutado primário. Maduro (5-10) = taninos integrados, notas terciárias. Velho (>10) = fragilidade possível.
5. ESTRUTURA RESULTANTE: Com base em TUDO acima (não na uva genericamente), determine corpo, acidez, taninos e estilo gastronômico DESTE vinho específico.

EXEMPLO DE ANÁLISE CORRETA:
- Vinho: "Casillero del Diablo Carmenère 2022"
- Análise: "Produzido pela Concha y Toro no Valle Central chileno, é um vinho de escala comercial — espere corpo médio-encorpado, taninos acessíveis e macios (típicos da linha Casillero), com a nota herbácea sutil que é assinatura do Carmenère de clima quente. Sendo safra 2022, ainda jovem, o frutado escuro (ameixa, cereja preta) deve estar em primeiro plano. Posicionamento: entrada de linha, versátil e descomplicado."

EXEMPLO DO QUE É PROIBIDO:
- "Carmenère possui taninos firmes e notas de frutas escuras" ← Isso é Wikipedia. Não diferencia NENHUM Carmenère de outro.
- "Este vinho harmoniza bem com carnes" ← Genérico demais. QUAL interação? POR QUÊ este rótulo especificamente?

CADA SUGESTÃO DE PRATO deve:
- Começar citando o nome COMPLETO do vinho (ex: "O Casillero del Diablo Carmenère 2022...")
- Explicar a INTERAÇÃO FÍSICA específica (ex: "os taninos macios desta linha comercial não precisam de proteína pesada para se equilibrar — funcionam com pratos de intensidade média")
- Usar lógica de harmonização DIFERENTE por sugestão: Contraste / Semelhança / Complemento / Equilíbrio / Limpeza
- Referenciar algo que SÓ este rótulo/produtor/região teria

QUANDO A INFORMAÇÃO É LIMITADA (só o nome):
- Infira pelo nome: "Château" sugere Bordeaux/francês; "Reserve" sugere seleção superior; nomes em italiano sugerem Itália
- Use linguagem como "este rótulo tende a apresentar...", "pela origem, espera-se..."
- NUNCA invente dados. Trabalhe com o que tem, mas com inteligência contextual.

TESTE DE QUALIDADE — Antes de finalizar cada explicação, verifique:
"Se eu trocar o nome deste vinho por outro da mesma uva, esta frase ainda funciona?"
Se SIM → reescreva. A frase DEVE ser específica para ESTE rótulo.

REGRAS ENOLÓGICAS INVIOLÁVEIS:
1. Peso equivalente: corpo do vinho ∝ intensidade do prato
2. Tanino + peixe delicado = sabor metálico → PROIBIDO
3. Álcool alto + pimenta = amplifica ardência → PROIBIDO
4. Regionalidade: priorize quando fizer sentido (Chianti com ragù toscano, Albariño com frutos do mar galegos)

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

INSTRUÇÕES:
1. Primeiro, construa o perfil ESPECÍFICO deste rótulo seguindo o processo obrigatório (produtor → região → posicionamento → safra → estrutura)
2. Depois, sugira 6-8 pratos que funcionem com ESTE vinho específico
3. Em CADA explicação, cite "${wineName}" pelo nome e explique por que este RÓTULO (não a uva) funciona
4. Varie entre entradas, pratos principais e queijos/sobremesa
5. Aplique o teste de qualidade: se a frase funcionar para qualquer vinho da mesma uva, reescreva`;

    } else if (mode === "food-to-wine") {
      const hasCellar = userWines?.length > 0;
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${hasCellar ? `CONTEXTO: O usuário tem vinhos NA ADEGA. Você DEVE analisar cada rótulo INDIVIDUALMENTE e recomendar os melhores para este prato.

PROCESSO OBRIGATÓRIO PARA CADA VINHO DA ADEGA:
1. PRODUTOR: Identifique quem faz este vinho. Cooperativa grande? Vinícola boutique? Produtor familiar? (ex: se o nome contém "Reserva", "Gran Reserva", "Single Vineyard" = posicionamento superior)
2. REGIÃO: O que a região de origem diz sobre o estilo? (ex: Mendoza = corpo, fruta madura; Borgonha = elegância, acidez; Douro = concentração, robustez)
3. SAFRA: Se informada, calcule a idade e o que isso implica para taninos e evolução
4. POSICIONAMENTO: Entrada de linha vs premium vs ícone — isso define a complexidade esperada
5. ESTRUTURA: Com base em TUDO acima, determine o perfil PROVÁVEL deste rótulo específico

Se NENHUM vinho da adega é adequado, diga honestamente e sugira o perfil ideal.` : "Sugira rótulos específicos de referência (não categorias genéricas como 'vinho branco seco')."}

REGRA ABSOLUTA — ANÁLISE DO RÓTULO, NUNCA DA UVA:
- PROIBIDO: "Um Malbec argentino possui taninos aveludados..." ← Isso descreve TODOS os Malbecs
- CORRETO: "O Catena Zapata Malbec 2019, cultivado a ~1000m de altitude em Mendoza, desenvolve taninos mais refinados e acidez mais viva que Malbecs de planície — essa acidez extra é exatamente o que corta a gordura da picanha"

CADA EXPLICAÇÃO deve:
- Citar o vinho PELO NOME COMPLETO
- Explicar por que ESTE rótulo (não a uva) funciona ou não com o prato
- Referenciar a interação FÍSICA (gordura, sal, umami, textura, cocção do prato × corpo, acidez, taninos do vinho)
- Incluir algo que diferencie este rótulo de outros da mesma uva

TESTE DE QUALIDADE: "Se eu trocar o nome deste vinho por outro da mesma uva, esta frase ainda funciona?" Se SIM → reescreva.

QUANDO A INFORMAÇÃO É LIMITADA:
- Infira pelo nome e contexto disponível
- Use "este rótulo tende a...", "pela origem, espera-se..."
- NUNCA invente dados, mas trabalhe com inteligência contextual

JULGAMENTO HONESTO — use TODA a escala:
- Excelente escolha: harmonia excepcional, eleva ambos
- Alta compatibilidade: muito boa, recomendação segura
- Boa opção: funciona bem
- Funciona bem: aceitável mas não memorável
- Escolha ousada: arriscado, pode funcionar ou não
- Pouco indicado: não recomendo para este prato

NEM TODOS devem ser positivos. Se um vinho da adega é ruim para o prato, DIGA.

PROIBIDO: "[Uva] possui notas de...", "combina bem", "harmoniza perfeitamente", qualquer frase genérica que sirva para qualquer vinho.`;

      const cellarContext = hasCellar
        ? `\nVinhos na adega do usuário:\n${(userWines as any[]).map((w: any) => `- ${w.name} | Produtor: ${w.producer || "?"} | Uva: ${w.grape || "?"} | Região: ${w.region || "?"}, ${w.country || "?"} | Safra: ${w.vintage || "?"} | Estilo: ${w.style || "?"}`).join("\n")}`
        : "";
      userPrompt = `Prato: "${dish}"${cellarContext}

INSTRUÇÕES:
1. Analise o prato tecnicamente (proteína, gordura, cocção, intensidade)
2. Para CADA vinho sugerido, siga o processo obrigatório (produtor → região → safra → posicionamento → estrutura)
3. Cite o NOME COMPLETO do vinho e explique por que ESTE rótulo específico funciona (não a uva genérica)
4. Ordene do melhor ao pior match
5. Aplique o teste de qualidade: se a frase funcionar para qualquer vinho da mesma uva, reescreva
6. Use julgamento honesto — nem todos precisam ser positivos`;
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
