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

// ── Anti-Genericity Validation ──
const GENERIC_PATTERNS = [
  /cabernet sauvignon (?:possui|tem|apresenta|é conhecid)/i,
  /merlot (?:possui|tem|apresenta|é conhecid)/i,
  /chardonnay (?:possui|tem|apresenta|é conhecid)/i,
  /pinot noir (?:possui|tem|apresenta|é conhecid)/i,
  /sauvignon blanc (?:possui|tem|apresenta|é conhecid)/i,
  /carmenère (?:possui|tem|apresenta|é conhecid)/i,
  /malbec (?:possui|tem|apresenta|é conhecid)/i,
  /sangiovese (?:possui|tem|apresenta|é conhecid)/i,
  /syrah (?:possui|tem|apresenta|é conhecid)/i,
  /tempranillo (?:possui|tem|apresenta|é conhecid)/i,
  /nebbiolo (?:possui|tem|apresenta|é conhecid)/i,
  /combina (?:muito )?bem/i,
  /harmoniza perfeitamente/i,
  /complementa os sabores/i,
  /é? um vinho (?:versátil|equilibrado|elegante) que/i,
  /notas? de frutas (?:vermelhas|escuras|tropicais|cítricas) e/i,
];

function validateWineSpecificity(
  texts: string[],
  wineName: string,
  grape?: string | null,
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  const wineNameLower = wineName.toLowerCase();
  const grapeClean = grape?.toLowerCase().replace(/\s+/g, " ").trim() || "";

  for (const text of texts) {
    if (!text || text.length < 20) continue;
    const lower = text.toLowerCase();

    // Check if wine name is actually mentioned
    const mentionsWine = lower.includes(wineNameLower) || 
      wineNameLower.split(" ").filter(w => w.length > 3).some(w => lower.includes(w));

    if (!mentionsWine && texts.length <= 10) {
      failures.push(`Missing wine name reference: "${text.slice(0, 60)}..."`);
    }

    // Check for generic grape descriptions
    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(text)) {
        failures.push(`Generic pattern found: "${text.slice(0, 60)}..."`);
        break;
      }
    }

    // Check if explanation is just about the grape (only the grape, nothing about producer/region/style)
    if (grapeClean && grapeClean.length > 3) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
      const genericSentences = sentences.filter(s => {
        const sl = s.toLowerCase();
        // Sentence mentions grape but NOT the wine name or region-specific terms
        return sl.includes(grapeClean) && !mentionsWine && 
          !sl.match(/regiã|produtor|safra|rótulo|vinícola|região|vale |serra |douro|bordeaux|toscana|mendoza|napa|rioja|barossa|maipo|casablanca|colchagua/i);
      });
      if (genericSentences.length > sentences.length / 2) {
        failures.push(`Grape-only description without label context`);
      }
    }
  }

  return { passed: failures.length === 0, failures };
}

async function callAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  tools: unknown[],
  toolChoice: unknown,
  signal: AbortSignal,
) {
  const aiResponse = await fetch(AI_URL, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
      temperature: 0.75,
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text().catch(() => "");
    return { ok: false, status: aiResponse.status, errText, parsed: null };
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
  } catch {
    parsed = null;
  }

  return { ok: true, status: 200, errText: "", parsed };
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
    const wineProducer = (body as any).wineProducer || null;
    const wineVintage = (body as any).wineVintage || null;
    const wineCountry = (body as any).wineCountry || null;

    // ── Wine Technical Profile Construction Instructions ──
    const PROFILE_CONSTRUCTION_RULES = `
CONSTRUÇÃO OBRIGATÓRIA DO PERFIL TÉCNICO (WineTechnicalProfile):
Antes de responder QUALQUER coisa, você DEVE construir internamente um perfil técnico para cada vinho mencionado.

PROCESSO OBRIGATÓRIO EM 5 ETAPAS:
ETAPA 1 — IDENTIFICAÇÃO DO PRODUTOR: Quem é ${wineProducer || "o produtor"}? Qual a filosofia, escala, posicionamento? É entrada de linha, reserva, gran reserva, ícone?
ETAPA 2 — CONTEXTO REGIONAL: ${wineRegion || "A região"} + ${wineCountry || "o país"} implicam que tipo de clima, solo, tradição?
ETAPA 3 — POSICIONAMENTO: Este é um vinho de R$30 ou R$300? O nome/linha sugere qual segmento?
ETAPA 4 — SAFRA: ${wineVintage || "A safra"} — o que isso significa para evolução, taninos, frescor?
ETAPA 5 — ESTRUTURA RESULTANTE: Com base nas 4 etapas anteriores (NÃO na uva genérica), defina:
  - body: leve/médio/encorpado
  - acidity: baixa/média/alta
  - tannin: n/a/sedosos/firmes/estruturados
  - style: elegante/potente/gastronômico/frutado/mineral/etc
  - complexity: simples/moderado/complexo

REGRAS ABSOLUTAS:
1. PRIORIDADE: o rótulo "${wineName}" específico, NUNCA a uva "${wineGrape || ""}" isolada
2. Don Melchor ≠ qualquer Cabernet. Testamatta ≠ qualquer Sangiovese. Barolo ≠ qualquer Nebbiolo.
3. Se faltam dados, INFIRA com base em: origem, estilo típico daquela região, posicionamento do rótulo
4. Use linguagem como "O ${wineName} tende a apresentar..." quando inferindo
5. NUNCA faça afirmações absolutas sem dados suficientes

ANTI-GENERICIDADE (VALIDAÇÃO AUTOMÁTICA NO SERVIDOR):
⚠️ O servidor VALIDA automaticamente suas respostas. Se detectar:
- Frases que funcionariam para qualquer vinho da mesma uva
- Descrições genéricas da uva sem contexto do rótulo
- Ausência do nome "${wineName}" nas explicações
→ A resposta será REJEITADA e você será chamado novamente.

PROIBIDO (causa rejeição automática):
- "[Uva] possui notas de..."
- "[Uva] é conhecida por..."  
- "combina bem", "harmoniza perfeitamente", "complementa os sabores"
- "um vinho versátil/equilibrado/elegante que..."
- Qualquer frase que funcione para QUALQUER vinho da mesma uva
- Descrever "notas de frutas vermelhas/escuras/tropicais e..." sem contexto do rótulo

OBRIGATÓRIO em CADA explicação:
- Citar "${wineName}" pelo nome (não "este vinho" ou "o ${wineGrape || "vinho"}")
- Referenciar pelo menos UM aspecto único deste rótulo (produtor, região, posicionamento, safra)
- Explicar a INTERAÇÃO FÍSICA entre vinho e prato (acidez × gordura, tanino × proteína, etc.)`;

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "wine-to-food") {
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${PROFILE_CONSTRUCTION_RULES}

FLUXO OBRIGATÓRIO:
1. Execute as 5 ETAPAS do perfil técnico para "${wineName}"
2. Use o perfil para gerar o campo "summary" do wineProfile — 2-3 frases que DIFERENCIEM "${wineName}" de outros vinhos da mesma uva "${wineGrape || ""}"
3. Para CADA prato sugerido, explique a INTERAÇÃO FÍSICA entre o perfil técnico de "${wineName}" e os componentes do prato

O summary DEVE:
- Começar com "O ${wineName}..." ou "Este ${wineName}..."
- Mencionar o produtor/região/posicionamento
- Explicar o que DIFERENCIA este rótulo de outros da mesma uva
- NUNCA ser uma descrição genérica da uva

REGRAS ENOLÓGICAS:
1. Peso equivalente: corpo do vinho ∝ intensidade do prato
2. Tanino + peixe delicado = metálico → NUNCA
3. Álcool alto + picante = desastre → NUNCA
4. Regionalidade: priorize quando fizer sentido

JULGAMENTO HONESTO — nem todo prato é "perfeito":
- perfeito: harmonia excepcional, elevam um ao outro
- muito bom: funciona muito bem, recomendação segura
- bom: funciona, mas não é memorável`;

      userPrompt = `Vinho: ${wineName || "Desconhecido"}
Produtor: ${wineProducer || "Não informado"}
Estilo: ${wineStyle || "Não informado"}
Uva: ${wineGrape || "Não informada"}
Região: ${wineRegion || "Não informada"}
País: ${wineCountry || "Não informado"}
Safra: ${wineVintage || "Não informada"}

INSTRUÇÕES:
1. Execute as 5 ETAPAS do perfil técnico para "${wineName}" — NÃO pule nenhuma etapa
2. Preencha wineProfile.summary com 2-3 frases ESPECÍFICAS sobre "${wineName}" (começando com "O ${wineName}...")
3. Sugira 6-8 pratos, SEMPRE citando "${wineName}" pelo nome em CADA explicação
4. Varie entre entradas, pratos principais e queijos/sobremesa
5. Em CADA reason, cite ao menos 1 característica ESPECÍFICA de "${wineName}" (não da uva genérica)
6. Varie os harmony_type (contraste/semelhança/complemento/equilíbrio/limpeza)`;

    } else if (mode === "food-to-wine") {
      const hasCellar = userWines?.length > 0;
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${PROFILE_CONSTRUCTION_RULES}

${hasCellar ? `REGRA CRÍTICA: O usuário tem vinhos NA ADEGA. Você DEVE:
1. Executar as 5 ETAPAS do perfil técnico para CADA vinho da adega
2. Usar o perfil técnico para determinar compatibilidade com o prato "${dish}"
3. Priorizar rótulos REAIS. NUNCA responda com categorias genéricas ("vinho branco seco")
4. Se NENHUM vinho da adega combina adequadamente, diga isso honestamente.
5. Para cada vinho, a explicação DEVE citar o nome do rótulo e uma característica específica dele.` : "Sugira tipos específicos de vinho com rótulos de referência."}

FLUXO OBRIGATÓRIO:
1. Analise "${dish}" tecnicamente (proteína, gordura, cocção, intensidade, texturas)
2. Para cada vinho candidato, execute as 5 ETAPAS do perfil técnico
3. Compare perfil do vinho vs perfil do prato usando lógica técnica:
   - acidez × gordura
   - tanino × proteína
   - intensidade × intensidade
   - textura × textura
4. Classifique honestamente cada sugestão

JULGAMENTO HONESTO — use toda a escala:
- Excelente escolha: harmonia excepcional
- Alta compatibilidade: muito boa combinação
- Boa opção: funciona bem
- Funciona bem: aceitável
- Escolha ousada: pode funcionar mas é arriscado
- Pouco indicado: não recomendo

NEM TODOS os vinhos devem ser positivos. Se um vinho é ruim para o prato, diga.`;

      const cellarContext = hasCellar
        ? `\nVinhos na adega do usuário:\n${(userWines as any[]).map((w: any) => `- ${w.name} | Produtor: ${w.producer || "?"} | Uva: ${w.grape || "?"} | Região: ${w.region || "?"}, ${w.country || "?"} | Safra: ${w.vintage || "?"} | Estilo: ${w.style || "?"}`).join("\n")}`
        : "";
      userPrompt = `Prato: "${dish}"${cellarContext}

INSTRUÇÕES:
1. Decomponha "${dish}" tecnicamente (proteína, gordura, cocção, intensidade)
2. Para cada vinho, execute as 5 ETAPAS do perfil técnico
3. Na explicação, cite o NOME do vinho e explique por que ESTE rótulo específico funciona (ou não)
4. Em cada reason, mencione ao menos 1 aspecto que diferencia este rótulo de outro da mesma uva
5. Use compatibilityLabel honestamente — nem tudo é "Excelente escolha"`;
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
                description: "Technical profile of the specific wine label analyzed",
                properties: {
                  body: { type: "string", enum: ["leve", "médio", "encorpado"] },
                  acidity: { type: "string", enum: ["baixa", "média", "alta"] },
                  tannin: { type: "string", enum: ["n/a", "sedosos", "firmes", "estruturados"] },
                  style: { type: "string", description: "Estilo gastronômico: elegante, potente, gastronômico, frutado, mineral, etc" },
                  complexity: { type: "string", enum: ["simples", "moderado", "complexo"] },
                  summary: { type: "string", description: "2-3 frases ESPECÍFICAS sobre ESTE rótulo, começando com o nome do vinho. Deve diferenciar de outros da mesma uva." },
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
                    category: { type: "string", enum: ["classico", "afinidade", "contraste"] },
                    reason: { type: "string", description: "2-3 frases técnicas citando o NOME do vinho e explicando a interação físico-química específica deste rótulo com o prato" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string", description: "Frase curta técnica (ex: 'acidez que corta a gordura')" },
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
                        description: { type: "string" },
                        ingredients: { type: "array", items: { type: "string" } },
                        steps: { type: "array", items: { type: "string" } },
                        wine_reason: { type: "string", description: "Por que este prato harmoniza com o vinho — citando o nome do rótulo" },
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
                    wineName: { type: "string", description: "Nome EXATO do vinho da adega ou tipo detalhado" },
                    style: { type: "string", enum: ["tinto", "branco", "rosé", "espumante"] },
                    grape: { type: "string" },
                    vintage: { type: "number" },
                    region: { type: "string" },
                    country: { type: "string" },
                    reason: { type: "string", description: "2-3 frases técnicas ÚNICAS citando o NOME do rótulo e aspectos específicos dele" },
                    fromCellar: { type: "boolean" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string" },
                    compatibilityLabel: { type: "string", enum: ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem", "Escolha ousada", "Pouco indicado"] },
                    wineProfile: {
                      type: "object",
                      description: "Perfil técnico deste rótulo específico",
                      properties: {
                        body: { type: "string", enum: ["leve", "médio", "encorpado"] },
                        acidity: { type: "string", enum: ["baixa", "média", "alta"] },
                        tannin: { type: "string", enum: ["n/a", "sedosos", "firmes", "estruturados"] },
                        style: { type: "string" },
                      },
                      required: ["body", "acidity", "tannin", "style"],
                      additionalProperties: false,
                    },
                  },
                  required: ["wineName", "style", "reason", "fromCellar", "match", "harmony_type", "harmony_label", "compatibilityLabel", "wineProfile"],
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

    // ── Retry loop with anti-genericity validation ──
    const MAX_ATTEMPTS = 2;
    let lastParsed: any = null;
    let validationResult: { passed: boolean; failures: string[] } = { passed: false, failures: [] };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55_000);

      const retryHint = attempt > 0
        ? `\n\n⚠️ ATENÇÃO: Sua resposta anterior foi REJEITADA pela validação anti-genericidade. Problemas detectados:\n${validationResult.failures.map(f => `- ${f}`).join("\n")}\n\nREESSCREVA com mais especificidade sobre "${wineName}". Cite o nome do vinho, mencione produtor/região/posicionamento.`
        : "";

      const result = await callAI(
        LOVABLE_API_KEY,
        systemPrompt,
        userPrompt + retryHint,
        tools,
        toolChoice,
        controller.signal,
      );

      clearTimeout(timeout);

      if (!result.ok) {
        if (result.status === 429) return jsonResponse({ error: "Muitas requisições. Aguarde um momento e tente novamente." }, 429);
        if (result.status === 402) return jsonResponse({ error: "Créditos de IA esgotados." }, 402);
        console.error("AI gateway error:", result.status, result.errText);
        return jsonResponse({ error: "Não conseguimos gerar a sugestão agora." }, 500);
      }

      if (!result.parsed) {
        console.error("AI parse error on attempt", attempt);
        continue;
      }

      lastParsed = result.parsed;

      // ── Validate anti-genericity ──
      const textsToValidate: string[] = [];
      if (mode === "wine-to-food") {
        if (lastParsed.wineProfile?.summary) textsToValidate.push(lastParsed.wineProfile.summary);
        for (const p of (lastParsed.pairings || [])) {
          if (p.reason) textsToValidate.push(p.reason);
        }
        validationResult = validateWineSpecificity(textsToValidate, wineName || "", wineGrape);
      } else {
        for (const s of (lastParsed.suggestions || [])) {
          if (s.reason) textsToValidate.push(s.reason);
        }
        // For food-to-wine, validate each wine's specificity
        const allPassed: boolean[] = [];
        for (const s of (lastParsed.suggestions || [])) {
          if (s.reason) {
            const v = validateWineSpecificity([s.reason], s.wineName || "", s.grape);
            allPassed.push(v.passed);
            if (!v.passed) validationResult.failures.push(...v.failures);
          }
        }
        validationResult.passed = allPassed.length === 0 || allPassed.filter(p => p).length >= allPassed.length * 0.6;
      }

      console.log(`Attempt ${attempt + 1}: validation ${validationResult.passed ? "PASSED" : "FAILED"} (${validationResult.failures.length} failures)`);

      if (validationResult.passed) break;

      // If last attempt, use what we have
      if (attempt === MAX_ATTEMPTS - 1) {
        console.log("Max retries reached, using best result available");
      }
    }

    const parsed = lastParsed || (mode === "wine-to-food" ? { pairings: [] } : { suggestions: [] });

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
      validation_passed: validationResult.passed,
      validation_failures: validationResult.failures.length,
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
