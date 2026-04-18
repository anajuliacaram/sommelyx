import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};



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
  /bom para acompanhar/i,
  /bom vinho para o dia a dia/i,
  /ideal para/i,
  /ideal com/i,
  /carne vermelha/i,
  /para pratos leves/i,
  /frutas vermelhas/i,
  /frutas escuras/i,
];

interface SpecificityContext {
  wineName?: string;
  producer?: string | null;
  region?: string | null;
  country?: string | null;
  style?: string | null;
  vintage?: number | null;
  grape?: string | null;
}

function normalizeForMatch(value?: string | number | null) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectSpecificAnchors(context?: SpecificityContext) {
  const strong = [
    context?.producer,
    context?.region,
    context?.country,
    context?.style,
    context?.vintage != null ? String(context.vintage) : null,
  ]
    .map(normalizeForMatch)
    .filter((anchor) => anchor.length > 2);

  const weak = [context?.wineName, context?.grape]
    .map(normalizeForMatch)
    .filter((anchor) => anchor.length > 2);

  return { strong, weak };
}

function countAnchorHits(text: string, anchors: string[]) {
  const normalized = normalizeForMatch(text);
  return anchors.filter((anchor) => normalized.includes(anchor)).length;
}

function hasSpecificLabelContext(texts: string[], context?: SpecificityContext) {
  const combined = texts.filter(Boolean).join(" ");
  if (!combined.trim()) return false;

  const { strong, weak } = collectSpecificAnchors(context);
  if (strong.length > 0) {
    return countAnchorHits(combined, strong) >= 1;
  }

  return countAnchorHits(combined, weak) >= 1;
}

const GENERIC_WINE_NAME_TOKENS = new Set([
  "vinho",
  "tinto",
  "branco",
  "rose",
  "rosé",
  "espumante",
  "seco",
  "seca",
  "leve",
  "medio",
  "médio",
  "encorpado",
  "corpo",
  "aromatico",
  "aromático",
  "fresco",
  "brut",
  "doce",
  "suave",
  "jovem",
]);

function isGenericWineName(name?: string | null) {
  const normalized = normalizeForMatch(name);
  if (!normalized) return true;
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const nonGeneric = tokens.filter((token) => !GENERIC_WINE_NAME_TOKENS.has(token));
  return nonGeneric.length === 0;
}

function validateWineSpecificity(
  texts: string[],
  wineName: string,
  grape?: string | null,
  context?: SpecificityContext,
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

  if (!hasSpecificLabelContext(texts, context ?? { wineName, grape })) {
    failures.push("Missing label-specific anchor");
  }

  return { passed: failures.length === 0, failures };
}

function analyzeDish(dish: string) {
  const lower = dish.toLowerCase();
  const result = {
    intensity: "média",
    fat: "moderada",
    protein: "",
    cooking: "",
    flavors: [] as string[],
  };

  if (lower.match(/grelhad|brasa|churras|assad|frit[oa]/)) {
    result.cooking = "grelhado/assado";
    result.intensity = "alta";
  } else if (lower.match(/cozid|vapor|refogad/)) {
    result.cooking = "cozido";
  } else if (lower.match(/cru|tartare|ceviche/)) {
    result.cooking = "cru";
    result.intensity = "leve";
  }

  if (lower.match(/carne|picanha|costela|bife|cordeiro/)) {
    result.protein = "vermelha";
    result.fat = "alta";
  } else if (lower.match(/frango|ave|peru/)) {
    result.protein = "branca";
    result.fat = "moderada";
  } else if (lower.match(/peixe|salmão|atum|camarão|bacalhau/)) {
    result.protein = "peixe";
    result.fat = "leve";
  } else if (lower.match(/ovo|omelete/)) {
    result.protein = "ovo";
    result.fat = "moderada";
  } else if (lower.match(/queijo|fondue/)) {
    result.protein = "laticínio";
    result.fat = "alta";
  }

  if (lower.match(/molho|creme/)) result.flavors.push("molho cremoso");
  if (lower.match(/tomate/)) result.flavors.push("acidez do tomate");
  if (lower.match(/limão|cítric|vinagre/)) result.flavors.push("acidez cítrica");
  if (lower.match(/pimenta|picante|apimentad/)) result.flavors.push("picância");

  return result;
}

const TECHNICAL_PATTERNS = [
  /acidez/i,
  /tanin/i,
  /corpo/i,
  /estrutura/i,
  /intensid/i,
  /textur/i,
  /gordur/i,
  /prote[ií]na/i,
  /molho/i,
  /umami/i,
  /paladar/i,
  /frescor/i,
];

function hasTechnicalLanguage(text?: string | null) {
  if (!text) return false;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

function scoreCellarWineForDish(wine: Record<string, unknown>, dish: string) {
  const analysis = analyzeDish(dish);
  const lowerDish = dish.toLowerCase();
  const style = String(wine.style || "").toLowerCase();
  const grape = String(wine.grape || "").toLowerCase();
  const region = String(wine.region || "").toLowerCase();
  const country = String(wine.country || "").toLowerCase();
  let score = 0;

  if (style === "tinto" && (analysis.protein === "vermelha" || analysis.fat === "alta")) score += 18;
  if ((style === "branco" || style === "espumante" || style === "rosé") && (analysis.protein === "peixe" || analysis.fat === "leve")) score += 18;
  if (style === "tinto" && analysis.intensity === "alta") score += 8;
  if ((style === "branco" || style === "rosé" || style === "espumante") && analysis.intensity === "leve") score += 8;
  if (grape && lowerDish.includes(grape)) score += 5;
  if (region && lowerDish.includes(region)) score += 3;
  if (country && lowerDish.includes(country)) score += 2;
  if (analysis.flavors.some((flavor) => lowerDish.includes(flavor.split(" ")[0]))) score += 4;
  if (String(wine.tannin || "").toLowerCase().includes("firm")) score += analysis.protein === "vermelha" ? 4 : 0;
  if (String(wine.acidity || "").toLowerCase().includes("alta")) score += analysis.fat === "alta" ? 4 : 2;

  return score;
}

function rankCellarWinesForDish(dish: string, wines: Record<string, unknown>[]) {
  return [...wines].sort((a, b) => scoreCellarWineForDish(b, dish) - scoreCellarWineForDish(a, dish));
}

async function callAI(
  _apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  tools: unknown[],
  _toolChoice: unknown,
  _signal: AbortSignal,
) {
  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
  const openaiModel = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
  const schema = (tools?.[0] as any)?.function?.parameters || {};

  const result = await callOpenAIResponses<any>({
    functionName: "wine-pairings",
    requestId: crypto.randomUUID(),
    apiKey: openaiKey,
    model: openaiModel,
    timeoutMs: 60_000,
    temperature: 0.35,
    instructions: systemPrompt,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: userPrompt }],
      },
    ],
    schema,
    maxOutputTokens: 5_000,
  });

  if (result.ok) {
    return { ok: true, status: 200, errText: "", parsed: result.parsed };
  }

  return { ok: false, status: result.status, errText: result.error, parsed: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
    console.log(`[wine-pairings] request_id=${requestId} openai_key=${maskSecret(OPENAI_API_KEY)} model=${OPENAI_MODEL}`);
    if (!OPENAI_API_KEY) {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 500, "internal_error", Date.now() - startTime, { reason: "missing_api_key" });
      return jsonResponse({ error: "Serviço de análise indisponível no momento. Tente novamente em instantes." }, 500);
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
- Referenciar pelo menos UM aspecto único deste rótulo (produtor, região, país, posicionamento, safra ou estilo)
- Se houver poucos dados, faça inferência cautelosa e escreva como tendência deste rótulo, não como regra genérica da uva
- Explicar a INTERAÇÃO FÍSICA entre vinho e prato (acidez × gordura, tanino × proteína, etc.)`;

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "wine-to-food") {
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${PROFILE_CONSTRUCTION_RULES}

FLUXO OBRIGATÓRIO:
1. Execute as 5 ETAPAS do perfil técnico para "${wineName}"
2. Use o perfil para gerar o campo "summary" do wineProfile — 2-3 frases que DIFERENCIEM "${wineName}" de outros vinhos da mesma uva "${wineGrape || ""}"
3. Defina pairingLogic como a síntese objetiva do que este vinho pede na mesa
4. Para CADA prato sugerido, explique a INTERAÇÃO FÍSICA entre o perfil técnico de "${wineName}" e os componentes do prato

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
3. Preencha pairingLogic com 2-4 frases objetivas explicando o que o vinho pede na mesa
4. Sugira 3-5 pratos, SEMPRE citando "${wineName}" pelo nome em CADA explicação
5. Varie entre entradas, pratos principais e queijos/sobremesa
6. Em CADA reason, cite ao menos 1 característica ESPECÍFICA de "${wineName}" (não da uva genérica)
7. Varie os harmony_type (contraste/semelhança/complemento/equilíbrio/limpeza)`;

    }
    const hasCellar = (userWines as any[] | undefined)?.length ? (userWines as any[]).length > 0 : false;
    if (mode === "food-to-wine") {
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

${PROFILE_CONSTRUCTION_RULES}

${hasCellar ? `REGRA CRÍTICA: O usuário tem vinhos NA ADEGA. Você DEVE:
1. Executar as 5 ETAPAS do perfil técnico para CADA vinho da adega
2. Usar o perfil técnico para determinar compatibilidade com o prato "${dish}"
3. Priorizar rótulos REAIS. NUNCA responda com categorias genéricas ("vinho branco seco")
4. Se NENHUM vinho da adega combina adequadamente, diga isso honestamente.
5. Para cada vinho, a explicação DEVE citar o nome do rótulo e uma característica específica dele.
6. Os vinhos já foram pré-filtrados localmente; você deve apenas explicar e ranquear os melhores.` : "Sugira tipos específicos de vinho com rótulos de referência."}

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

      const rankedCellarWines = hasCellar
        ? rankCellarWinesForDish(dish, (userWines as any[]).slice(0, 40)).slice(0, 8)
        : [];
      const cellarContext = hasCellar
        ? `\nVinhos na adega do usuário (pré-filtrados localmente por compatibilidade):\n${rankedCellarWines.map((w: any) => `- ${w.name} | Produtor: ${w.producer || "?"} | Uva: ${w.grape || "?"} | Região: ${w.region || "?"}, ${w.country || "?"} | Safra: ${w.vintage || "?"} | Estilo: ${w.style || "?"}`).join("\n")}`
        : "";
      userPrompt = `Prato: "${dish}"${cellarContext}

INSTRUÇÕES:
1. Decomponha "${dish}" tecnicamente (proteína, gordura, cocção, intensidade)
2. Para cada vinho, execute as 5 ETAPAS do perfil técnico
3. Na explicação, cite o NOME do vinho e explique por que ESTE rótulo específico funciona (ou não)
4. Em cada reason, mencione ao menos 1 aspecto que diferencia este rótulo de outro da mesma uva
5. Use compatibilityLabel honestamente — nem tudo é "Excelente escolha"
6. Sugira de 3 a 5 vinhos reais da adega, sem inventar categorias genéricas`;
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
                  minItems: 5,
                  maxItems: 5,
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
              pairingLogic: { type: "string", description: "Síntese técnica explicando o que o vinho pede e por quê" },
            },
            required: ["wineProfile", "pairings", "pairingLogic"],
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
              minItems: 5,
              maxItems: 5,
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
      const timeout = setTimeout(() => controller.abort(), 90_000);

      const retryHint = attempt > 0
        ? `\n\n⚠️ ATENÇÃO: Sua resposta anterior foi REJEITADA pela validação anti-genericidade. Problemas detectados:\n${validationResult.failures.map(f => `- ${f}`).join("\n")}\n\nREESSCREVA com mais especificidade sobre "${wineName}". Cite o nome do vinho, mencione produtor/região/posicionamento.`
        : "";

      const result = await callAI(
        OPENAI_API_KEY,
        systemPrompt,
        userPrompt + retryHint,
        tools,
        toolChoice,
        controller.signal,
      );

      clearTimeout(timeout);

      console.log({
        input: {
          mode,
          wineName: mode === "wine-to-food" ? wineName : null,
          dish: mode === "food-to-wine" ? dish : null,
          attempt: attempt + 1,
        },
        response: {
          ok: result.ok,
          status: result.status,
          errText: result.errText ? String(result.errText).slice(0, 240) : "",
        },
        parsed: result.parsed,
        error: result.ok ? null : result.errText,
      });

      if (!result.ok) {
        if (result.status === 429) return jsonResponse({ error: "Muitas requisições. Aguarde um momento e tente novamente." }, 429);
        if (result.status === 402) return jsonResponse({ error: "Créditos de IA esgotados." }, 402);
        console.error("AI gateway error:", result.status, result.errText);
        return jsonResponse({ error: "Serviço de análise instável agora. Aguarde alguns segundos e tente novamente." }, 500);
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
        if (lastParsed.pairingLogic) textsToValidate.push(lastParsed.pairingLogic);
        for (const p of (lastParsed.pairings || [])) {
          if (p.reason) textsToValidate.push(p.reason);
          if (p.harmony_label) textsToValidate.push(p.harmony_label);
        }
        validationResult = validateWineSpecificity(textsToValidate, wineName || "", wineGrape, {
          wineName,
          producer: wineProducer,
          region: wineRegion,
          country: wineCountry,
          style: wineStyle,
          vintage: wineVintage,
          grape: wineGrape,
        });
        if (!Array.isArray(lastParsed.pairings) || lastParsed.pairings.length < 1) {
          validationResult.failures.push(`Expected at least 1 pairing, received ${Array.isArray(lastParsed.pairings) ? lastParsed.pairings.length : 0}`);
          validationResult.passed = false;
        }
        if (typeof lastParsed.pairingLogic !== "string" || lastParsed.pairingLogic.trim().length < 45 || !hasTechnicalLanguage(lastParsed.pairingLogic)) {
          validationResult.failures.push("Pairing logic missing or too generic");
          validationResult.passed = false;
        }
        for (const p of (lastParsed.pairings || [])) {
          if (typeof p.reason !== "string" || p.reason.trim().length < 55 || !hasTechnicalLanguage(p.reason)) {
            validationResult.failures.push(`Pairing explanation too generic for ${String(p?.dish || "prato")}`);
            validationResult.passed = false;
          } else if (!hasSpecificLabelContext([p.reason, p.harmony_label, p.dish], {
            wineName,
            producer: wineProducer,
            region: wineRegion,
            country: wineCountry,
            style: wineStyle,
            vintage: wineVintage,
            grape: wineGrape,
          })) {
            validationResult.failures.push(`Pairing explanation missing label anchor for ${String(p?.dish || "prato")}`);
            validationResult.passed = false;
          }
        }
      } else {
        for (const s of (lastParsed.suggestions || [])) {
          if (s.reason) textsToValidate.push(s.reason);
        }
        // For food-to-wine, validate each wine's specificity
        const allPassed: boolean[] = [];
        const suggestions = Array.isArray(lastParsed.suggestions) ? lastParsed.suggestions : [];
        if (hasCellar && suggestions.some((s: any) => s.fromCellar !== true)) {
          validationResult.failures.push("All cellar suggestions must come from real wines in the cellar");
        }
        if (suggestions.length < 1) {
          validationResult.failures.push(`Expected at least 1 suggestion, received ${suggestions.length}`);
        }
        for (const s of suggestions) {
          const hasConcreteRef = Boolean(s.region || s.country || s.grape || s.vintage);
          if (!hasCellar && isGenericWineName(s.wineName) && !hasConcreteRef) {
            validationResult.failures.push(`Generic wine type without concrete reference: ${s.wineName || "vinho"}`);
          }
          const v = validateWineSpecificity([s.reason], s.wineName || "", s.grape, {
            wineName: s.wineName,
            producer: null,
            region: s.region ?? null,
            country: s.country ?? null,
            style: s.style ?? null,
            vintage: s.vintage ?? null,
            grape: s.grape ?? null,
          });
          const ok = v.passed &&
            typeof s.reason === "string" &&
            s.reason.trim().length >= 55 &&
            hasTechnicalLanguage(s.reason) &&
            hasSpecificLabelContext([s.reason, s.harmony_label, s.wineName], {
              wineName: s.wineName,
              producer: null,
              region: s.region ?? null,
              country: s.country ?? null,
              style: s.style ?? null,
              vintage: s.vintage ?? null,
              grape: s.grape ?? null,
            }) &&
            (typeof s.compatibilityLabel === "string" && ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem", "Escolha ousada", "Pouco indicado"].includes(s.compatibilityLabel)) &&
            typeof s.fromCellar === "boolean" &&
            (hasCellar || !isGenericWineName(s.wineName) || hasConcreteRef);
          allPassed.push(ok);
          if (!ok) validationResult.failures.push(...v.failures);
          if (typeof s.reason === "string" && (s.reason.trim().length < 55 || !hasTechnicalLanguage(s.reason))) {
            validationResult.failures.push(`Reasoning too generic for ${s.wineName || "vinho"}`);
          }
        }
        validationResult.passed = allPassed.length > 0 && allPassed.every(Boolean) && validationResult.failures.length === 0;
      }

      console.log(`Attempt ${attempt + 1}: validation ${validationResult.passed ? "PASSED" : "FAILED"} (${validationResult.failures.length} failures)`);

      if (validationResult.passed) break;

      if (attempt === MAX_ATTEMPTS - 1) {
        console.log("Max retries reached, no valid pairing response produced");
      }
    }

    const parsed = lastParsed || (mode === "wine-to-food" ? { pairings: [] } : { suggestions: [] });
    const parsedCount = mode === "wine-to-food"
      ? Array.isArray(parsed.pairings) ? parsed.pairings.length : 0
      : Array.isArray(parsed.suggestions) ? parsed.suggestions.length : 0;

    // Degradar com elegância: se temos qualquer resultado, devolver mesmo sem passar 100% na validação.
    if (!validationResult.passed && parsedCount > 0) {
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 200, "success_with_warnings", Date.now() - startTime, {
        mode,
        result_count: parsedCount,
        validation_failures: validationResult.failures.slice(0, 12),
      });
      return jsonResponse(parsed);
    }

    if (!validationResult.passed) {
      // Mensagem consultiva e específica por modo, com motivo + ação.
      const friendlyMessage = mode === "wine-to-food"
        ? "Não conseguimos sugerir pratos confiáveis para este vinho agora. Tente novamente em instantes ou informe um vinho com mais detalhes (uva, região, safra)."
        : "Não conseguimos sugerir vinhos para este prato agora. Tente reformular o prato (ex: 'risoto de funghi com parmesão') ou tente novamente em instantes.";
      await logToDb(supabaseUrl, serviceKey, userId, "wine-pairings", 422, "validation_error", Date.now() - startTime, {
        mode,
        reason: friendlyMessage,
        validation_failures: validationResult.failures.slice(0, 12),
      });
      return jsonResponse({ error: friendlyMessage, code: "ANALYSIS_NOT_SPECIFIC" }, 422);
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
    return jsonResponse({ error: "Não conseguimos completar a análise agora. Verifique sua conexão e tente novamente em instantes." }, 500);
  }
});
