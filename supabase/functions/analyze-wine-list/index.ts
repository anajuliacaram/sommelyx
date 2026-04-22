import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";
import { callOpenAIResponses } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UserProfileSchema = z.object({
  topStyles: z.array(z.string()).optional(),
  topGrapes: z.array(z.string()).optional(),
  topCountries: z.array(z.string()).optional(),
  avgPrice: z.number().optional(),
}).optional();

const BodySchema = z.object({
  imageBase64: z.string().min(64).optional(),
  extractedText: z.string().min(20).optional(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  userProfile: UserProfileSchema,
  mode: z.enum(["menu-for-wine"]).optional(),
  wineName: z.string().min(1).max(200).optional(),
}).refine((value) => Boolean(value.imageBase64 || value.extractedText), {
  message: "Envie uma imagem ou PDF legível",
  path: ["imageBase64"],
}).refine((value) => value.mode !== "menu-for-wine" || Boolean(value.wineName), {
  message: "Informe o vinho para analisar o cardápio",
  path: ["wineName"],
});

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
    // silent on logging failures
  }
}

// ── Anti-Genericity Validation (same as wine-pairings) ──
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
  /gastron/i,
];

const COMPARATIVE_PATTERNS = [
  /compar/i,
  /\bcarta\b/i,
  /\boutros\b/i,
  /\bentre\b/i,
  /\bmelhor\b/i,
  /\bmenos\b/i,
  /\bmais\b/i,
  /\bdentro da carta\b/i,
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

    const mentionsWine = lower.includes(wineNameLower) ||
      wineNameLower.split(" ").filter(w => w.length > 3).some(w => lower.includes(w));

    if (!mentionsWine && texts.length <= 10) {
      failures.push(`Missing wine name reference: "${text.slice(0, 60)}..."`);
    }

    for (const pattern of GENERIC_PATTERNS) {
      if (pattern.test(text)) {
        failures.push(`Generic pattern found: "${text.slice(0, 60)}..."`);
        break;
      }
    }

    if (grapeClean && grapeClean.length > 3) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
      const genericSentences = sentences.filter(s => {
        const sl = s.toLowerCase();
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

function hasTechnicalLanguage(text?: string | null) {
  if (!text) return false;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

function hasGenericWineLanguage(text?: string | null) {
  if (!text) return false;
  return GENERIC_PATTERNS.some((pattern) => pattern.test(text));
}

function hasComparativeLanguage(text?: string | null) {
  if (!text) return false;
  return COMPARATIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function isLenientMenuAnalysis(data: any, wineName?: string | null): boolean {
  const dishes = Array.isArray(data?.dishes) ? data.dishes : [];
  if (dishes.length < 1) return false;
  return dishes.every((item: any) =>
    typeof item?.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item?.reason === "string" &&
    item.reason.trim().length >= 35 &&
    !hasGenericWineLanguage(item.reason) &&
    hasTechnicalLanguage(item.reason) &&
    hasSpecificLabelContext([item.reason, data?.summary], { wineName: wineName || "" }),
  );
}

function isLenientWineListAnalysis(data: any): boolean {
  const wines = Array.isArray(data?.wines) ? data.wines : [];
  if (wines.length < 1) return false;
  return wines.every((w: any) => {
    const reasoning = typeof w?.reasoning === "string" ? w.reasoning.trim() : "";
    const description = typeof w?.description === "string" ? w.description.trim() : "";
    const coreText = reasoning || description;
    const itemContext = {
      wineName: w.name,
      producer: w.producer ?? null,
      region: w.region ?? null,
      country: (w as any).country ?? null,
      style: w.style ?? null,
      vintage: w.vintage ?? null,
      grape: w.grape ?? null,
    };
    const hasCoreText = coreText.length >= 60 &&
      hasTechnicalLanguage(coreText) &&
      !hasGenericWineLanguage(coreText) &&
      hasSpecificLabelContext([coreText, w?.verdict], itemContext);

    const pairings = Array.isArray(w?.pairings) ? w.pairings : [];
    const pairingsOk = pairings.length >= 2 && pairings.every((pairing: any) => {
      const why = typeof pairing?.why === "string" ? pairing.why : "";
      return (
        typeof pairing?.dish === "string" &&
        pairing.dish.trim().length > 0 &&
        why.trim().length >= 20 &&
        hasTechnicalLanguage(why) &&
        !hasGenericWineLanguage(why) &&
        hasSpecificLabelContext([why, pairing.dish], itemContext)
      );
    });

    const compatOk = typeof w?.compatibilityLabel === "string" &&
      ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"].includes(w.compatibilityLabel);

    const labelsOk = Array.isArray(w?.comparativeLabels) && w.comparativeLabels.length >= 1;

    return (
      typeof w?.name === "string" &&
      w.name.trim().length > 0 &&
      hasCoreText &&
      pairingsOk &&
      compatOk &&
      labelsOk
    );
  });
}

function extractToolArguments(aiData: any) {
  const toolCallArgs = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (typeof toolCallArgs === "string" && toolCallArgs.trim()) return JSON.parse(toolCallArgs);

  const content = aiData?.choices?.[0]?.message?.content || "";
  const jsonStart = content.indexOf("{");
  const jsonEnd = content.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    return JSON.parse(content.slice(jsonStart, jsonEnd + 1));
  }

  if (typeof content === "string" && content.trim()) return JSON.parse(content);
  return null;
}

function normalizeWineListPayload(payload: any) {
  const rawWines = Array.isArray(payload?.wines) ? payload.wines : [];
  const validCompatLabels = ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"];

  const wines = rawWines.map((wine: any) => ({
    name: String(wine?.name || "Vinho não identificado"),
    producer: wine?.producer ? String(wine.producer) : null,
    vintage: typeof wine?.vintage === "number" ? wine.vintage : null,
    style: wine?.style ? String(wine.style) : null,
    grape: wine?.grape ? String(wine.grape) : null,
    region: wine?.region ? String(wine.region) : null,
    price: typeof wine?.price === "number" ? wine.price : null,
    rating: typeof wine?.rating === "number" ? Math.max(0, Math.min(5, wine.rating)) : 0,
    description: wine?.description ? String(wine.description) : null,
    reasoning: wine?.reasoning ? String(wine.reasoning) : null,
    pairings: (Array.isArray(wine?.pairings) ? wine.pairings : []).slice(0, 5).map((p: any) => {
      if (typeof p === "object" && p !== null) {
        return { dish: String(p.dish || ""), why: String(p.why || p.reason || "") };
      }
      return { dish: String(p), why: "" };
    }),
    verdict: wine?.verdict ? String(wine.verdict) : "Sem resumo",
    compatibilityLabel: validCompatLabels.includes(wine?.compatibilityLabel) ? wine.compatibilityLabel : "Boa opção",
    highlight: ["best-value", "top-pick", "adventurous", "lightest", "boldest", "most-complex", "easiest"].includes(wine?.highlight) ? wine.highlight : null,
    body: wine?.body ? String(wine.body) : null,
    acidity: wine?.acidity ? String(wine.acidity) : null,
    tannin: wine?.tannin ? String(wine.tannin) : null,
    occasion: wine?.occasion ? String(wine.occasion) : null,
    comparativeLabels: Array.isArray(wine?.comparativeLabels) ? wine.comparativeLabels.filter((l: any) => typeof l === "string").slice(0, 3) : [],
  }));

  const normalizeToken = (value?: string | null) => (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const bodyRank = (value?: string | null) => {
    const v = normalizeToken(value);
    if (v.includes("leve")) return 0;
    if (v.includes("encorp")) return 2;
    if (v.includes("médio") || v.includes("medio") || v.includes("medium")) return 1;
    return null;
  };
  const tanninRank = (value?: string | null) => {
    const v = normalizeToken(value);
    if (v.includes("suave") || v.includes("sedos") || v.includes("baixo")) return 0;
    if (v.includes("firme") || v.includes("estrutur") || v.includes("robust") || v.includes("alto")) return 2;
    if (v.includes("médio") || v.includes("medio") || v.includes("moderad")) return 1;
    return null;
  };
  const scoreForTopPick = (wine: any) => (wine.rating || 0) * 10 + (wine.highlight === "top-pick" ? 8 : 0) + (wine.highlight === "best-value" ? 4 : 0);
  const scoreForValue = (wine: any) => {
    if (typeof wine.price !== "number" || wine.price <= 0) return wine.rating || 0;
    return (wine.rating || 0) * 10 + Math.max(0, 600 / wine.price);
  };

  const wineNames = new Set(wines.map((wine: any) => wine.name));
  const derivedTopPick = wines.slice().sort((a: any, b: any) => scoreForTopPick(b) - scoreForTopPick(a))[0]?.name || null;
  const derivedBestValue = wines.slice().sort((a: any, b: any) => scoreForValue(b) - scoreForValue(a))[0]?.name || null;
  const finalTopPick = payload?.topPick && wineNames.has(String(payload.topPick)) ? String(payload.topPick) : derivedTopPick;
  const finalBestValue = payload?.bestValue && wineNames.has(String(payload.bestValue)) ? String(payload.bestValue) : derivedBestValue;

  const bodyRanks = wines
    .map((wine: any, index: number) => ({ index, rank: bodyRank(wine.body) }))
    .filter((entry: any) => entry.rank !== null);
  const tanninRanks = wines
    .map((wine: any, index: number) => ({ index, rank: tanninRank(wine.tannin) }))
    .filter((entry: any) => entry.rank !== null);

  const lightestIndex = bodyRanks.length > 0 ? bodyRanks.slice().sort((a: any, b: any) => a.rank - b.rank)[0].index : -1;
  const boldestIndex = bodyRanks.length > 0 ? bodyRanks.slice().sort((a: any, b: any) => b.rank - a.rank)[0].index : -1;
  const easiestIndex = tanninRanks.length > 0 ? tanninRanks.slice().sort((a: any, b: any) => a.rank - b.rank)[0].index : -1;
  const complexIndex = wines
    .map((wine: any, index: number) => ({ index, score: (wine.highlight === "most-complex" ? 3 : 0) + (wine.rating || 0) }))
    .sort((a: any, b: any) => b.score - a.score)[0]?.index ?? -1;

  return {
    wines: wines.map((wine: any, index: number) => {
      const derivedLabels = new Set<string>(Array.isArray(wine.comparativeLabels) ? wine.comparativeLabels : []);
      if (wine.name === finalTopPick) derivedLabels.add("melhor escolha da carta");
      if (wine.name === finalBestValue) derivedLabels.add("melhor custo-benefício");
      if (index === lightestIndex) derivedLabels.add("mais leve");
      if (index === boldestIndex) derivedLabels.add("mais encorpado");
      if (index === easiestIndex) derivedLabels.add("mais fácil de beber");
      if (index === complexIndex) derivedLabels.add("mais complexo");
      return {
        ...wine,
        comparativeLabels: Array.from(derivedLabels).slice(0, 3),
      };
    }),
    topPick: finalTopPick,
    bestValue: finalBestValue,
  };
}

function normalizeMenuPayload(payload: any) {
  const dishes = Array.isArray(payload?.dishes) ? payload.dishes : [];
  const validCompatLabels = ["Combinação perfeita", "Alta compatibilidade", "Harmonização elegante", "Boa opção", "Escolha ousada", "Pouco indicado"];
  return {
    dishes: dishes.map((dish: any) => ({
      name: String(dish?.name || "Prato não identificado"),
      price: typeof dish?.price === "number" ? dish.price : null,
      match: ["perfeito", "muito bom", "bom"].includes(dish?.match) ? dish.match : "bom",
      reason: dish?.reason ? String(dish.reason) : "Boa compatibilidade geral.",
      highlight: ["top-pick", "best-value"].includes(dish?.highlight) ? dish.highlight : null,
      compatibilityLabel: validCompatLabels.includes(dish?.compatibilityLabel) ? dish.compatibilityLabel : null,
      harmony_type: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"].includes(dish?.harmony_type) ? dish.harmony_type : null,
      harmony_label: dish?.harmony_label ? String(dish.harmony_label) : null,
      dish_profile: dish?.dish_profile ? {
        intensity: dish.dish_profile.intensity ? String(dish.dish_profile.intensity) : null,
        texture: dish.dish_profile.texture ? String(dish.dish_profile.texture) : null,
        highlight: dish.dish_profile.highlight ? String(dish.dish_profile.highlight) : null,
      } : null,
      recipe: dish?.recipe ? {
        description: String(dish.recipe.description || ""),
        ingredients: Array.isArray(dish.recipe.ingredients) ? dish.recipe.ingredients.map(String) : [],
        steps: Array.isArray(dish.recipe.steps) ? dish.recipe.steps.map(String) : [],
        wine_reason: String(dish.recipe.wine_reason || ""),
      } : null,
    })),
    summary: payload?.summary ? String(payload.summary) : "",
    wineProfile: payload?.wineProfile ? {
      body: payload.wineProfile.body ? String(payload.wineProfile.body) : null,
      acidity: payload.wineProfile.acidity ? String(payload.wineProfile.acidity) : null,
      tannin: payload.wineProfile.tannin ? String(payload.wineProfile.tannin) : null,
      style: payload.wineProfile.style ? String(payload.wineProfile.style) : null,
      complexity: payload.wineProfile.complexity ? String(payload.wineProfile.complexity) : null,
      summary: payload.wineProfile.summary ? String(payload.wineProfile.summary) : null,
    } : null,
  };
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


    const parsedBody = BodySchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return jsonResponse({ error: parsedBody.error.flatten().fieldErrors }, 400);
    }

    const { imageBase64, extractedText, mimeType, fileName, userProfile, mode, wineName } = parsedBody.data;

    const cleanBase64 = imageBase64?.includes(",")
      ? imageBase64.split(",")[1].replace(/\s/g, "")
      : imageBase64?.replace(/\s/g, "");

    const isMenuMode = mode === "menu-for-wine";
    const inputSummary = [
      fileName ? `Arquivo: ${fileName}` : null,
      mimeType ? `Tipo: ${mimeType}` : null,
      extractedText ? "Entrada principal: texto extraído de PDF/anexo" : null,
      cleanBase64 ? "Entrada complementar: imagem renderizada/comprimida" : null,
    ].filter(Boolean).join("\n");

    let systemPrompt: string;
    let userInstructions: string;
    let tools: unknown[];
    let toolChoice: Record<string, unknown>;

    if (isMenuMode) {
      systemPrompt = `Você é um sommelier de nível Master Sommelier com 25+ anos em restaurantes estrelados Michelin.

REGRA #1 — FALE DO RÓTULO, NUNCA DA UVA GENÉRICA:
Ao explicar cada harmonização, cite o vinho "${wineName}" PELO NOME. Não diga "este vinho" ou descreva a uva genericamente.

ANTES DE ANALISAR O CARDÁPIO, construa um PERFIL MENTAL do vinho "${wineName}":
1. O que se sabe sobre o produtor? (escala, filosofia)
2. O que a região/país implica sobre o estilo?
3. Corpo, acidez, taninos PROVÁVEIS
4. Qual o posicionamento do vinho? (entrada de linha, reserva, ícone)

PARA CADA PRATO DO CARDÁPIO:
- Explique a INTERAÇÃO FÍSICA entre "${wineName}" e o prato (acidez × gordura, tanino × proteína, intensidade × intensidade)
- Use uma lógica de harmonização DIFERENTE por prato: Contraste / Semelhança / Complemento / Equilíbrio / Limpeza
- Forneça perfil do prato (intensidade, textura, destaque)
- Inclua receita resumida para cada prato

CLASSIFICAÇÃO (usar toda a escala):
- Combinação perfeita / Alta compatibilidade / Harmonização elegante / Boa opção / Escolha ousada / Pouco indicado

ORDENAR do melhor para o pior. Nem todos devem ser positivos.

PROIBIDO: "[Uva] possui notas de...", "combina bem", frases genéricas.
Use apenas pratos LEGÍVEIS no cardápio. Não invente itens.`;

      userInstructions = `Analise o cardápio anexado como sommelier para o vinho "${wineName}". Selecione 5-8 pratos, ordene por qualidade de harmonização, forneça explicações técnicas citando "${wineName}" pelo nome, perfil do prato e receita resumida.`;
      tools = [{
        type: "function",
        function: {
          name: "return_menu_analysis",
          description: "Retorna os pratos do cardápio que harmonizam com o vinho informado, com análise de sommelier.",
          parameters: {
            type: "object",
            properties: {
              wineProfile: {
                type: "object",
                description: "Perfil técnico do vinho analisado",
                properties: {
                  body: { type: "string", enum: ["leve", "médio", "encorpado"] },
                  acidity: { type: "string", enum: ["baixa", "média", "alta"] },
                  tannin: { type: "string", enum: ["n/a", "sedosos", "firmes", "estruturados"] },
                  style: { type: "string" },
                  complexity: { type: "string", enum: ["simples", "moderado", "complexo"] },
                  summary: { type: "string", description: "2-3 frases sobre o perfil ESPECÍFICO deste rótulo" },
                },
                required: ["body", "acidity", "tannin", "summary"],
                additionalProperties: false,
              },
              dishes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    reason: { type: "string", description: "2-3 frases técnicas citando o NOME do vinho e explicando a interação" },
                    highlight: { type: "string", enum: ["top-pick", "best-value"] },
                    compatibilityLabel: { type: "string", enum: ["Combinação perfeita", "Alta compatibilidade", "Harmonização elegante", "Boa opção", "Escolha ousada", "Pouco indicado"] },
                    harmony_type: { type: "string", enum: ["contraste", "semelhança", "complemento", "equilíbrio", "limpeza"] },
                    harmony_label: { type: "string", description: "Frase curta (ex: 'acidez que corta a gordura')" },
                    dish_profile: {
                      type: "object",
                      properties: {
                        intensity: { type: "string", enum: ["leve", "média", "alta"] },
                        texture: { type: "string" },
                        highlight: { type: "string" },
                      },
                      required: ["intensity", "texture", "highlight"],
                      additionalProperties: false,
                    },
                    recipe: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        ingredients: { type: "array", items: { type: "string" } },
                        steps: { type: "array", items: { type: "string" } },
                        wine_reason: { type: "string" },
                      },
                      required: ["description", "ingredients", "steps", "wine_reason"],
                      additionalProperties: false,
                    },
                  },
                  required: ["name", "match", "reason", "compatibilityLabel", "harmony_type", "harmony_label", "dish_profile", "recipe"],
                  additionalProperties: false,
                },
              },
              summary: { type: "string" },
            },
            required: ["wineProfile", "dishes", "summary"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_menu_analysis" } };
    } else {
      const profileContext = userProfile
        ? `\nPerfil do usuário:
- Estilos preferidos: ${userProfile.topStyles?.join(", ") || "variado"}
- Uvas preferidas: ${userProfile.topGrapes?.join(", ") || "variado"}
- Países preferidos: ${userProfile.topCountries?.join(", ") || "variado"}
- Faixa de preço habitual: R$ ${userProfile.avgPrice || "variado"}`
        : "";

      systemPrompt = `Você é um sommelier profissional analisando uma carta de vinhos para ajudar o cliente a decidir rapidamente o que pedir.${profileContext}

REGRA #1 — FALE DO RÓTULO, NUNCA DA UVA GENÉRICA:
- ERRADO: "Sauvignon Blanc possui notas cítricas e minerais"
- CERTO: "O Cloudy Bay Sauvignon Blanc, da região de Marlborough na Nova Zelândia, é referência mundial nessa uva — espere um perfil intensamente aromático com maracujá e capim-limão, corpo leve-médio e acidez cortante"

PARA CADA VINHO da carta, construa um PERFIL MENTAL:
1. O que se sabe sobre ESTE produtor/vinícola?
2. O que a REGIÃO de origem implica sobre o estilo?
3. Qual o POSICIONAMENTO do vinho? (entrada de linha, premium, ícone)
4. Como ele se compara aos OUTROS vinhos desta carta?

REGRAS DE ANÁLISE:
1. DESCRIÇÃO ESPECÍFICA: Corpo, acidez, taninos, estilo gastronômico e ocasião ideal. Cite o NOME do vinho, não "este vinho". Referencie o que diferencia ESTE rótulo de outros da mesma uva.
   Em cada explicação, mencione pelo menos um anchor do rótulo (produtor, região, país, safra ou linha/posicionamento). Se faltar dado, faça inferência cautelosa e diga que está estimando pelo contexto do rótulo.

2. COMPARAÇÃO RELATIVA: Compare dentro da carta. Atribua labels comparativas derivadas do conjunto analisado e use no máximo 3 por vinho. Priorize: "melhor escolha da carta", "melhor custo-benefício", "mais leve", "mais encorpado", "mais complexo", "mais fácil de beber".

3. COMPATIBILIDADE SEMÂNTICA: "Excelente escolha", "Alta compatibilidade", "Boa opção" ou "Funciona bem". Nem todos podem ser "Excelente".

4. REASONING OBRIGATÓRIO: escreva uma justificativa comparativa curta, 2-4 frases, com lógica técnica real. O reasoning precisa:
   - comparar este vinho com outros da carta
   - citar acidez, tanino, corpo, estrutura ou ocasião
   - citar pelo menos um anchor específico do rótulo (produtor, região, país, safra ou linha/posicionamento)
   - explicar quando escolher este rótulo versus os demais

5. HARMONIZAÇÃO: 3-5 pratos com lógica sensorial real (ex: "a acidez do [nome] corta a gordura da picanha"). Cada prato precisa ter uma justificativa específica e diferente.

6. VEREDICTO: Frase opinativa DIRETA como sommelier falaria. Ex: "O [nome] é a escolha óbvia se você vai pedir carne — estrutura para aguentar e taninos que pedem gordura" ou "Honestamente, o [nome] está caro para o que entrega — prefira o [outro] por metade do preço".

7. JULGAMENTO HONESTO: Nem todo vinho merece nota alta. Se um vinho é mediano, diga.

PROIBIDO: "bom equilíbrio entre fruta e madeira", "[Uva] possui notas de...", qualquer frase que sirva para qualquer vinho da mesma uva.
Use apenas conteúdo legível do anexo. Não invente rótulos.`;

      userInstructions = "Analise a carta de vinhos como sommelier. Para cada vinho, fale do RÓTULO ESPECÍFICO (não da uva genérica), compare com os demais, dê veredicto opinativo e sugira 3-5 harmonizações citando o nome do vinho na explicação.";

      tools = [{
        type: "function",
        function: {
          name: "return_wine_list_analysis",
          description: "Retorna a análise estruturada e comparativa da carta de vinhos.",
          parameters: {
            type: "object",
            properties: {
              wines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    producer: { type: "string" },
                    vintage: { type: "number" },
                    style: { type: "string", description: "Ex: Tinto, Branco, Rosé, Espumante" },
                    grape: { type: "string" },
                    region: { type: "string" },
                    price: { type: "number" },
                    rating: { type: "number", description: "0-5" },
                    body: { type: "string", description: "Leve, Médio, Encorpado" },
                    acidity: { type: "string", description: "Baixa, Média, Alta, Vibrante" },
                    tannin: { type: "string", description: "Suave, Médio, Firme, Robusto (tintos)" },
                    occasion: { type: "string", description: "Breve descrição da ocasião ideal. Ex: 'Aperitivo descontraído', 'Jantar especial', 'Almoço casual'" },
                    description: { type: "string", description: "Análise técnica útil para decisão — evite genéricos" },
                    reasoning: { type: "string", description: "2-4 frases comparando este vinho com outros da carta e explicando a decisão técnica" },
                    pairings: {
                      type: "array",
                      minItems: 3,
                      maxItems: 5,
                      items: {
                        type: "object",
                        properties: {
                          dish: { type: "string" },
                          why: { type: "string", description: "Lógica sensorial breve" },
                        },
                        required: ["dish", "why"],
                        additionalProperties: false,
                      },
                      description: "3-5 harmonizações com explicação",
                    },
                    verdict: { type: "string", description: "Frase direta opinativa como sommelier falaria ao cliente" },
                    compatibilityLabel: { type: "string", enum: ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"] },
                    highlight: { type: "string", enum: ["best-value", "top-pick", "adventurous", "lightest", "boldest", "most-complex", "easiest"] },
                    comparativeLabels: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: ["melhor escolha da carta", "melhor custo-benefício", "mais leve", "mais encorpado", "mais complexo", "mais fácil de beber"],
                      },
                      minItems: 1,
                      maxItems: 3,
                      description: "Labels comparativas derivadas do conjunto analisado",
                    },
                  },
                  required: ["name", "rating", "verdict", "compatibilityLabel", "description", "reasoning", "pairings"],
                  additionalProperties: false,
                },
              },
              topPick: { type: "string" },
              bestValue: { type: "string" },
            },
            required: ["wines"],
            additionalProperties: false,
          },
        },
      }];
      toolChoice = { type: "function", function: { name: "return_wine_list_analysis" } };
    }

    const userContent: Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: `${userInstructions}\n\n${inputSummary}` },
    ];

    if (extractedText) {
      userContent.push({
        type: "text",
        text: `Texto extraído do anexo:\n${extractedText}`,
      });
    }

    if (cleanBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
      });
    }

    console.log(`Calling AI gateway for ${isMenuMode ? "menu" : "wine list"} analysis...`);

    // ── Retry loop with anti-genericity validation ──
    // Keep total runtime under edge function/client timeout (~60s).
    const MAX_ATTEMPTS = 1;
    let lastParsed: any = null;
    let validationResult: { passed: boolean; failures: string[] } = { passed: false, failures: [] };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);

      const retryHint = attempt > 0
        ? `\n\n⚠️ ATENÇÃO: Sua resposta anterior foi REJEITADA pela validação anti-genericidade. Problemas detectados:\n${validationResult.failures.map(f => `- ${f}`).join("\n")}\n\nREESSCREVA com mais especificidade sobre cada rótulo. Cite nomes dos vinhos, mencione produtores/regiões/posicionamento. Mesmo com leitura parcial, devolva a melhor análise possível mantendo a estrutura.`
        : "";

      const messagesForAI = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: retryHint
          ? [...userContent, { type: "text" as const, text: retryHint }]
          : userContent },
      ];
      let parsed: any = null;
      let responseStatus = 200;
      let responseBodyPreview: string | null = null;

      const openaiResult = await callOpenAIResponses<any>({
        functionName: "analyze-wine-list",
        requestId: crypto.randomUUID(),
        apiKey: "",
        model: Deno.env.get("LOVABLE_AI_MODEL")?.trim() || "google/gemini-2.5-flash",
        timeoutMs: 90_000,
        temperature: 0.2,
        instructions: systemPrompt,
        input: messagesForAI.map((message) => ({
          role: message.role,
          content: Array.isArray(message.content)
            ? message.content.map((part: any) => {
              if (part.type === "text") return { type: "input_text" as const, text: String(part.text || "") };
              if (part.type === "image_url") return { type: "input_image" as const, image_url: String(part.image_url?.url || ""), detail: "high" as const };
              return { type: "input_text" as const, text: "" };
            }).filter((part: any) => part.type === "input_text" ? part.text.trim().length > 0 : Boolean(part.image_url))
            : [{ type: "input_text" as const, text: String(message.content || "") }],
        })),
        schema: (tools[0] as any)?.function?.parameters || {},
        maxOutputTokens: 8_000,
      });

      if (!openaiResult.ok) {
        responseStatus = openaiResult.status;
        responseBodyPreview = openaiResult.error;
        console.log({
          input: {
            mode: isMenuMode ? "menu-for-wine" : "wine-list",
            wineName: isMenuMode ? wineName : null,
            attempt: attempt + 1,
          },
          response: {
            ok: false,
            status: responseStatus,
            body: responseBodyPreview ? String(responseBodyPreview).slice(0, 240) : null,
          },
          parsed: null,
          error: responseBodyPreview,
        });

        if (responseStatus === 429) {
          return jsonResponse({ error: "Muitas requisições. Tente novamente em instantes." }, 429);
        }
        if (responseStatus === 402) {
          return jsonResponse({ error: "Créditos de IA esgotados." }, 402);
        }
        if (responseStatus === 422) {
          return jsonResponse({ error: "A análise retornou um formato inválido. Tente novamente em instantes." }, 422);
        }
        throw new Error(`AI error: ${responseStatus} - ${responseBodyPreview || ""}`);
      }

      parsed = openaiResult.parsed;
      responseStatus = 200;

      clearTimeout(timeout);

      if (!parsed) {
        console.error("AI parse error on attempt", attempt);
        continue;
      }

      lastParsed = parsed;

      // ── Validate anti-genericity ──
      const textsToValidate: string[] = [];
      if (isMenuMode) {
        if (lastParsed.wineProfile?.summary) textsToValidate.push(lastParsed.wineProfile.summary);
        for (const d of (lastParsed.dishes || [])) {
          if (d.reason) textsToValidate.push(d.reason);
        }
        validationResult = validateWineSpecificity(textsToValidate, wineName || "", null, { wineName });
        if (!validationResult.passed || !Array.isArray(lastParsed.dishes) || lastParsed.dishes.length < 1) {
          if (Array.isArray(lastParsed.dishes) && lastParsed.dishes.length < 1) {
            validationResult.failures.push(`Expected at least 1 dish, received ${lastParsed.dishes.length}`);
          }
          validationResult.passed = false;
        }
        if (!validationResult.passed && isLenientMenuAnalysis(lastParsed, wineName || "")) {
          validationResult.passed = true;
        }
      } else {
        for (const w of (lastParsed.wines || [])) {
          if (w.description) textsToValidate.push(w.description);
          if (w.verdict) textsToValidate.push(w.verdict);
          if (w.reasoning) textsToValidate.push(w.reasoning);
          for (const p of (Array.isArray(w.pairings) ? w.pairings : [])) {
            if (p?.why) textsToValidate.push(p.why);
          }
        }
        // For wine list, validate each wine individually
        const allPassed: boolean[] = [];
        for (const w of (lastParsed.wines || [])) {
          const wTexts = [w.description, w.verdict, w.reasoning, ...(Array.isArray(w.pairings) ? w.pairings.map((p: any) => p?.why).filter(Boolean) : [])].filter(Boolean);
          if (wTexts.length > 0) {
            const v = validateWineSpecificity(wTexts, w.name || "", w.grape, {
              wineName: w.name,
              producer: w.producer ?? null,
              region: w.region ?? null,
              country: (w as any).country ?? null,
              style: w.style ?? null,
              vintage: w.vintage ?? null,
              grape: w.grape ?? null,
            });
            const wineSpecificFailures: string[] = [...v.failures];

            if (typeof w.reasoning !== "string" || w.reasoning.trim().length < 80) {
              wineSpecificFailures.push(`Reasoning too short or missing for ${w.name || "vinho"}`);
            } else if (!hasComparativeLanguage(w.reasoning) || !hasTechnicalLanguage(w.reasoning)) {
              wineSpecificFailures.push(`Reasoning lacks comparative or technical language for ${w.name || "vinho"}`);
            }

            if (!Array.isArray(w.pairings) || w.pairings.length < 1) {
              wineSpecificFailures.push(`Expected at least 1 pairing for ${w.name || "vinho"}`);
            } else {
              for (const pairing of w.pairings) {
                const why = typeof pairing?.why === "string" ? pairing.why : "";
                if (why.trim().length < 25 || !hasTechnicalLanguage(why) || hasGenericWineLanguage(why)) {
                  wineSpecificFailures.push(`Pairing explanation too generic for ${w.name || "vinho"} -> ${String(pairing?.dish || "")}`);
                }
              }
            }

            if (!Array.isArray(w.comparativeLabels) || w.comparativeLabels.length < 1) {
              wineSpecificFailures.push(`Comparative labels missing for ${w.name || "vinho"}`);
            }

            const compatOk = typeof w.compatibilityLabel === "string" && ["Excelente escolha", "Alta compatibilidade", "Boa opção", "Funciona bem"].includes(w.compatibilityLabel);
            if (!compatOk) {
              wineSpecificFailures.push(`Compatibility label invalid for ${w.name || "vinho"}`);
            }

            const passed = v.passed && wineSpecificFailures.length === 0;
            allPassed.push(passed);
            if (!passed) validationResult.failures.push(...wineSpecificFailures);
          }
        }
        validationResult.passed = allPassed.length > 0 && allPassed.every(Boolean);
        if (!validationResult.passed && isLenientWineListAnalysis(lastParsed)) {
          validationResult.passed = true;
        }
      }

      console.log(`Attempt ${attempt + 1}: validation ${validationResult.passed ? "PASSED" : "FAILED"} (${validationResult.failures.length} failures)`);

      if (validationResult.passed) break;

      if (attempt === MAX_ATTEMPTS - 1) {
        console.log("Max retries reached, no valid analysis produced");
      }
    }

    if (!lastParsed) {
      throw new Error("Não foi possível interpretar a resposta da IA.");
    }

    const parsedCount = isMenuMode
      ? Array.isArray(lastParsed.dishes) ? lastParsed.dishes.length : 0
      : Array.isArray(lastParsed.wines) ? lastParsed.wines.length : 0;

    if (!validationResult.passed && parsedCount > 0) {
      return jsonResponse(isMenuMode ? normalizeMenuPayload(lastParsed) : normalizeWineListPayload(lastParsed));
    }

    if (!validationResult.passed) {
      const friendlyMessage = isMenuMode
        ? "Não conseguimos analisar este cardápio agora. Tente uma foto com melhor iluminação e foco nos pratos, ou tente novamente em instantes."
        : "Não conseguimos analisar esta carta de vinhos agora. Tente uma foto mais nítida da carta ou tente novamente em instantes.";
      await logToDb(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", user.id, "analyze-wine-list", 422, "validation_error", 0, {
        reason: friendlyMessage,
        validation_failures: validationResult.failures.slice(0, 12),
        mode,
      });
      return jsonResponse({ error: friendlyMessage, code: "ANALYSIS_NOT_SPECIFIC" }, 422);
    }

    return jsonResponse(isMenuMode ? normalizeMenuPayload(lastParsed) : normalizeWineListPayload(lastParsed));
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Erro interno";
    const isAbort = errMsg.toLowerCase().includes("abort");
    console.error("analyze-wine-list error:", errMsg);
    if (isAbort) {
      return jsonResponse({ error: "A análise demorou mais que o esperado. Tente novamente em instantes." }, 504);
    }
    return jsonResponse({ error: "Não conseguimos completar a análise agora. Verifique sua conexão e tente novamente." }, 500);
  }
});
