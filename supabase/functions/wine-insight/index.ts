import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
    console.log(`[wine-insight] openai_key=${maskSecret(OPENAI_API_KEY)} model=${OPENAI_MODEL}`);
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const body = await req.json();
    const { alertType, wineName, style, grape, region, country, vintage, drinkFrom, drinkUntil } = body;

    if (!alertType || !wineName) {
      return new Response(JSON.stringify({ error: "alertType e wineName são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentYear = new Date().getFullYear();

    const systemPrompt = `Você é um sommelier-mestre e enólogo brasileiro com 25 anos de experiência em degustação técnica e guarda de vinhos. Produza uma análise técnica REAL, ESPECÍFICA e ÚNICA para o vinho informado. Cada resposta deve parecer escrita por um especialista olhando aquele rótulo, não um texto genérico de catálogo.

REGRAS RÍGIDAS — NUNCA QUEBRE:
- PROIBIDO usar frases padronizadas como "este vinho é interessante", "ótimo momento para apreciar", "recomendo abrir em breve", "vinho de qualidade", "harmoniza bem com diversos pratos".
- PROIBIDO ser vago: substitua "boa estrutura" por "taninos médios-firmes com final levemente mentolado"; substitua "fruta madura" por "ameixa preta cozida e cassis em compota".
- OBRIGATÓRIO citar pelo menos 2 elementos técnicos REAIS da uva informada (perfil de taninos, acidez típica em g/L, álcool esperado, polifenóis, casca fina/grossa).
- OBRIGATÓRIO citar pelo menos 1 característica do terroir/região (clima continental/marítimo, altitude, tipo de solo: granito, calcário, basalto, terra rossa, etc).
- OBRIGATÓRIO mencionar o estágio evolutivo conforme a safra: anos transcorridos, fase aromática provável (primários frutados, secundários de fermentação, terciários de guarda), polimerização tânica.
- Use vocabulário enológico real: terciário, redução, bouquet, fenólicos, atenuação aromática, oxidação benéfica, polimerização, pirazinas, lactonas, microxigenação, brettanomyces, decantação ativa.
- Português brasileiro, tom de autoridade técnica, direto, sem floreios poéticos.
- NUNCA repita o nome do vinho no insight.

FORMATO DE SAÍDA:
- "insight": 3 a 4 frases densas e ESPECÍFICAS para esta combinação uva+região+safra. Deve soar técnico e único.
- "recommendation": 1 frase prática com NÚMERO concreto (temperatura em °C, tempo de decantação em minutos, prazo em semanas/meses, ou taça específica).

Responda APENAS em JSON válido.`;

    let userPrompt: string;

    if (alertType === "drink_now") {
      userPrompt = `Vinho na janela ideal de consumo. Janela: ${drinkFrom || "?"}–${drinkUntil || "?"}. Ano atual: ${currentYear}.

Nome: ${wineName}
Estilo: ${style || "Não informado"}
Uva: ${grape || "Não informada"}
Região: ${region || "Não informada"}
País: ${country || "Não informado"}
Safra: ${vintage || "Não informada"}

Análise pedida: explique tecnicamente por que ESTE vinho específico está no auge agora — cite a curva de evolução típica da uva/região, o estágio fenólico e aromático esperado após esse tempo, e o que o consumidor deve perceber na taça. Recomendação: temperatura ideal em °C e se decanta ou não, com justificativa.`;
    } else if (alertType === "past_peak") {
      const yearsOver = drinkUntil ? currentYear - drinkUntil : 0;
      userPrompt = `Vinho ${yearsOver > 0 ? `${yearsOver} ano(s) além` : "no limite"} da janela ideal. Janela: ${drinkFrom || "?"}–${drinkUntil || "?"}. Ano atual: ${currentYear}.

Nome: ${wineName}
Estilo: ${style || "Não informado"}
Uva: ${grape || "Não informada"}
Região: ${region || "Não informada"}
País: ${country || "Não informado"}
Safra: ${vintage || "Não informada"}

Análise pedida: avalie tecnicamente o estado provável — perda de fruta primária, evolução de terciários, risco de oxidação ou madeirização conforme a uva e o estilo. Seja honesto: ainda vale beber, está no limite, ou já passou? Recomendação: ação concreta (abrir em até X semanas, servir ligeiramente mais frio para mascarar oxidação, usar em redução culinária, etc.).`;
    } else {
      return new Response(JSON.stringify({ error: "alertType deve ser 'drink_now' ou 'past_peak'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await callOpenAIResponses<any>({
      functionName: "wine-insight",
      requestId: crypto.randomUUID(),
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      timeoutMs: 35_000,
      temperature: 0.55,
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
      maxOutputTokens: 600,
    });

    if (!result.ok) {
      if (result.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`OpenAI error: ${result.status} - ${result.error}`);
    }

    const parsed = result.parsed;

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
