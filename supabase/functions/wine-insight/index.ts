import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
    console.log(`[wine-insight] openai_key=${maskSecret(OPENAI_API_KEY)} lovable_key=${maskSecret(LOVABLE_API_KEY)} model=${OPENAI_MODEL}`);
    if (!LOVABLE_API_KEY && !OPENAI_API_KEY) throw new Error("AI provider not configured");

    const body = await req.json();
    const { alertType, wineName, style, grape, region, country, vintage, drinkFrom, drinkUntil } = body;

    if (!alertType || !wineName) {
      return new Response(JSON.stringify({ error: "alertType e wineName são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentYear = new Date().getFullYear();

    const systemPrompt = `Você é um sommelier experiente e enólogo. Forneça uma análise técnica breve (2-3 frases) sobre o estado de evolução de um vinho.
Seja específico com base na uva, região e safra quando disponíveis.
Use linguagem acessível mas com autoridade técnica.
Responda APENAS em JSON válido:
{
  "insight": "Texto da análise técnica",
  "recommendation": "Uma recomendação prática curta (1 frase)"
}`;

    let userPrompt: string;

    if (alertType === "drink_now") {
      userPrompt = `Este vinho está na janela ideal de consumo (${drinkFrom || "?"}–${drinkUntil || "?"}, estamos em ${currentYear}).

Vinho: ${wineName}
Estilo: ${style || "Não informado"}
Uva: ${grape || "Não informada"}
Região: ${region || "Não informada"}
País: ${country || "Não informado"}
Safra: ${vintage || "Não informada"}

Explique por que este é o momento ideal para abri-lo, com base nas características de evolução da uva/região/estilo. Sugira como melhor apreciá-lo.`;
    } else if (alertType === "past_peak") {
      const yearsOver = drinkUntil ? currentYear - drinkUntil : 0;
      userPrompt = `Este vinho passou da janela ideal de consumo (janela era ${drinkFrom || "?"}–${drinkUntil || "?"}, estamos em ${currentYear}, ${yearsOver} ano(s) além).

Vinho: ${wineName}
Estilo: ${style || "Não informado"}
Uva: ${grape || "Não informada"}
Região: ${region || "Não informada"}
País: ${country || "Não informado"}
Safra: ${vintage || "Não informada"}

Explique tecnicamente o que pode ter acontecido com o vinho (oxidação, perda de frescor, taninos, etc.) com base na uva e estilo. Dê uma recomendação prática (abrir logo, usar em culinária, etc.).`;
    } else {
      return new Response(JSON.stringify({ error: "alertType deve ser 'drink_now' ou 'past_peak'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    if (OPENAI_API_KEY) {
      const result = await callOpenAIResponses<any>({
        functionName: "wine-insight",
        requestId: crypto.randomUUID(),
        apiKey: OPENAI_API_KEY,
        model: OPENAI_MODEL,
        timeoutMs: 30_000,
        temperature: 0.6,
        instructions: systemPrompt,
        input: [{ role: "user", content: [{ type: "input_text", text: userPrompt }] }],
        schema: {
          type: "object",
          properties: {
            insight: { type: "string" },
            recommendation: { type: "string" },
          },
          required: ["insight", "recommendation"],
          additionalProperties: false,
        },
        maxOutputTokens: 300,
      });

      if (!result.ok) {
        if (result.status === 429) {
          return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (result.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI provider error: ${result.status} - ${result.error}`);
      }

      parsed = result.parsed;
    } else {
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
          temperature: 0.6,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      try {
        const jsonStart = content.indexOf("{");
        const jsonEnd = content.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
        } else {
          parsed = JSON.parse(content);
        }
      } catch {
        parsed = { insight: content.trim(), recommendation: "" };
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "Erro interno";
    console.error("wine-insight error:", errMsg);
    const sanitizedMsg = /api_key|lovable|config|supabase/i.test(errMsg)
      ? "Não foi possível gerar a análise agora. Tente novamente."
      : errMsg;
    return new Response(JSON.stringify({ error: sanitizedMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
