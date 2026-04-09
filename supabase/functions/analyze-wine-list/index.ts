import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
  const wines = Array.isArray(payload?.wines) ? payload.wines : [];
  return {
    wines: wines.map((wine: any) => ({
      name: String(wine?.name || "Vinho não identificado"),
      producer: wine?.producer ? String(wine.producer) : null,
      vintage: typeof wine?.vintage === "number" ? wine.vintage : null,
      style: wine?.style ? String(wine.style) : null,
      grape: wine?.grape ? String(wine.grape) : null,
      region: wine?.region ? String(wine.region) : null,
      price: typeof wine?.price === "number" ? wine.price : null,
      rating: typeof wine?.rating === "number" ? Math.max(0, Math.min(5, wine.rating)) : 0,
      description: wine?.description ? String(wine.description) : null,
      pairings: Array.isArray(wine?.pairings) ? wine.pairings.map((item: unknown) => String(item)) : [],
      verdict: wine?.verdict ? String(wine.verdict) : "Sem resumo",
      compatibility: typeof wine?.compatibility === "number" ? Math.max(0, Math.min(100, Math.round(wine.compatibility))) : 0,
      highlight: ["best-value", "top-pick", "adventurous"].includes(wine?.highlight) ? wine.highlight : null,
    })),
    topPick: payload?.topPick ? String(payload.topPick) : null,
    bestValue: payload?.bestValue ? String(payload.bestValue) : null,
  };
}

function normalizeMenuPayload(payload: any) {
  const dishes = Array.isArray(payload?.dishes) ? payload.dishes : [];
  return {
    dishes: dishes.map((dish: any) => ({
      name: String(dish?.name || "Prato não identificado"),
      price: typeof dish?.price === "number" ? dish.price : null,
      match: ["perfeito", "muito bom", "bom"].includes(dish?.match) ? dish.match : "bom",
      reason: dish?.reason ? String(dish.reason) : "Boa compatibilidade geral.",
      highlight: ["top-pick", "best-value"].includes(dish?.highlight) ? dish.highlight : null,
    })),
    summary: payload?.summary ? String(payload.summary) : "",
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
      systemPrompt = `Você é um sommelier especialista em leitura de cardápios. Use apenas o conteúdo legível do anexo e seja conservador quando algo estiver pouco nítido. Priorize precisão, velocidade e objetividade.`;
      userInstructions = `Analise o cardápio anexado e selecione apenas pratos que harmonizem pelo menos bem com o vinho "${wineName}". Explique a lógica sensorial de forma clara, sem inventar itens que não estejam legíveis.`;
      tools = [{
        type: "function",
        function: {
          name: "return_menu_analysis",
          description: "Retorna os pratos do cardápio que harmonizam com o vinho informado.",
          parameters: {
            type: "object",
            properties: {
              dishes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    match: { type: "string", enum: ["perfeito", "muito bom", "bom"] },
                    reason: { type: "string" },
                    highlight: { type: "string", enum: ["top-pick", "best-value"] },
                  },
                  required: ["name", "match", "reason"],
                  additionalProperties: false,
                },
              },
              summary: { type: "string" },
            },
            required: ["dishes", "summary"],
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

      systemPrompt = `Você é um sommelier especialista em cartas de vinhos de restaurante. Use apenas o conteúdo claramente legível do anexo, não invente rótulos ausentes e mantenha a saída estruturada.${profileContext}`;
      userInstructions = "Analise a carta anexada. Identifique os vinhos visíveis, estime os campos apenas quando houver evidência suficiente e devolva uma curadoria confiável e rápida.";
      tools = [{
        type: "function",
        function: {
          name: "return_wine_list_analysis",
          description: "Retorna a análise estruturada da carta de vinhos.",
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
                    style: { type: "string" },
                    grape: { type: "string" },
                    region: { type: "string" },
                    price: { type: "number" },
                    rating: { type: "number" },
                    description: { type: "string" },
                    pairings: { type: "array", items: { type: "string" } },
                    verdict: { type: "string" },
                    compatibility: { type: "number" },
                    highlight: { type: "string", enum: ["best-value", "top-pick", "adventurous"] },
                  },
                  required: ["name", "rating", "verdict", "compatibility"],
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
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: toolChoice,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return jsonResponse({ error: "Muitas requisições. Tente novamente em instantes." }, 429);
      }
      if (aiResponse.status === 402) {
        return jsonResponse({ error: "Créditos de IA esgotados." }, 402);
      }
      throw new Error(`AI gateway error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const parsed = extractToolArguments(aiData);

    if (!parsed) {
      throw new Error("Não foi possível interpretar a resposta da IA.");
    }

    return jsonResponse(isMenuMode ? normalizeMenuPayload(parsed) : normalizeWineListPayload(parsed));
  } catch (e) {
    console.error("analyze-wine-list error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
