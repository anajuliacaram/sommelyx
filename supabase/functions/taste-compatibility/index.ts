import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { callOpenAIResponses } from "../_shared/openai.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";


serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_MODEL = "gpt-4o-mini";
    console.log(`[taste-compatibility] provider=openai model=${AI_MODEL}`);

    const body = await req.json();
    const { targetWine, userCellar } = body;

    const cacheInput = {
      targetWine,
      userCellar: Array.isArray(userCellar)
        ? userCellar.slice(0, 50).map((wine: any) => ({
            id: wine?.id || null,
            name: wine?.name || "",
            producer: wine?.producer || "",
            region: wine?.region || "",
            country: wine?.country || "",
            grape: wine?.grape || "",
            style: wine?.style || "",
            vintage: wine?.vintage || null,
            quantity: wine?.quantity || 1,
          }))
        : [],
    };
    const cached = await getCachedAiResponse<any>("taste-compatibility", cacheInput);
    if (cached.hit && cached.payload) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimit = await checkRateLimit(user.id, "taste-compatibility");
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
        code: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
      }), {
        status: rateLimit.degraded ? 503 : 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!targetWine || !userCellar?.length) {
      return new Response(JSON.stringify({ compatibility: null, label: "Sem dados suficientes" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a concise profile from user's cellar
    const styleCount: Record<string, number> = {};
    const grapeCount: Record<string, number> = {};
    const countryCount: Record<string, number> = {};
    const regionCount: Record<string, number> = {};

    userCellar.forEach((w: any) => {
      if (w.style) styleCount[w.style] = (styleCount[w.style] || 0) + (w.quantity || 1);
      if (w.grape) grapeCount[w.grape] = (grapeCount[w.grape] || 0) + (w.quantity || 1);
      if (w.country) countryCount[w.country] = (countryCount[w.country] || 0) + (w.quantity || 1);
      if (w.region) regionCount[w.region] = (regionCount[w.region] || 0) + (w.quantity || 1);
    });

    const topN = (obj: Record<string, number>, n: number) =>
      Object.entries(obj).sort(([, a], [, b]) => b - a).slice(0, n).map(([k]) => k);

    const profileSummary = `Perfil do colecionador:
- Estilos preferidos: ${topN(styleCount, 3).join(", ") || "variado"}
- Uvas preferidas: ${topN(grapeCount, 5).join(", ") || "variado"}
- Países preferidos: ${topN(countryCount, 3).join(", ") || "variado"}
- Regiões preferidas: ${topN(regionCount, 4).join(", ") || "variado"}
- Total de rótulos: ${userCellar.length}`;

    const systemPrompt = `Você é um sommelier que analisa compatibilidade de um vinho com o perfil de gosto de um colecionador.
Avalie de 0 a 100 o quão compatível esse vinho é com o perfil descrito.

Responda APENAS em JSON válido:
{
  "compatibility": 82,
  "label": "Alta chance de gostar",
  "reason": "Explicação curta de 1 frase em português"
}

Regras para label:
- 85-100: "Alta chance de gostar"
- 70-84: "Combina com seu perfil"  
- 50-69: "Pode surpreender"
- 30-49: "Fora do seu perfil habitual"
- 0-29: "Estilo bem diferente do seu"`;

    const userPrompt = `${profileSummary}

Vinho a avaliar:
- Nome: ${targetWine.name || "Desconhecido"}
- Estilo: ${targetWine.style || "Não informado"}
- Uva: ${targetWine.grape || "Não informada"}
- País: ${targetWine.country || "Não informado"}
- Região: ${targetWine.region || "Não informada"}
- Produtor: ${targetWine.producer || "Não informado"}`;

    const result = await callOpenAIResponses<any>({
      functionName: "taste-compatibility",
      requestId: crypto.randomUUID(),
      apiKey: "",
      model: AI_MODEL,
      timeoutMs: 10_000,
      temperature: 0.2,
      instructions: systemPrompt,
      input: [{ role: "user", content: [{ type: "input_text", text: userPrompt }] }],
      schema: {
        type: "object",
        properties: {
          compatibility: { type: "number" },
          label: { type: "string" },
          reason: { type: "string" },
        },
        required: ["compatibility", "label", "reason"],
        additionalProperties: false,
      },
      maxOutputTokens: 200,
    });

    if (!result.ok) {
      if (result.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (result.status === 422) {
        return new Response(JSON.stringify({ error: "INVALID_AI_RESPONSE" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Não foi possível calcular a compatibilidade agora." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = result.parsed;

    await setCachedAiResponse("taste-compatibility", cacheInput, parsed);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Erro interno";
    console.error("taste-compatibility error:", errMsg);
    const sanitizedMsg = /api_key|lovable|config|supabase/i.test(errMsg)
      ? "Não foi possível calcular a compatibilidade agora."
      : errMsg;
    return new Response(JSON.stringify({ error: sanitizedMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
