import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 120_000);

const MAX_CSV_SIZE = 1_000_000; // 1MB

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── JWT Authentication ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // ── Rate Limiting ──
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // ── Input Validation ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Erro de configuração do serviço." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { csvContent } = await req.json();
    if (!csvContent || typeof csvContent !== "string") {
      return new Response(JSON.stringify({ error: "csvContent é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (csvContent.length > MAX_CSV_SIZE) {
      return new Response(JSON.stringify({ error: "Arquivo CSV muito grande. Máximo 1MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to first 50 lines to keep token usage reasonable
    const lines = csvContent.trim().split("\n");
    const truncated = lines.slice(0, 51).join("\n");

    const systemPrompt = `Você é um especialista em dados de vinhos. Sua tarefa é receber o conteúdo bruto de um arquivo CSV/TSV/planilha e extrair os dados de vinhos, mapeando automaticamente as colunas para os campos corretos.

Os campos possíveis são:
- name (string, OBRIGATÓRIO): nome do vinho
- producer (string): produtor/vinícola
- vintage (number): safra/ano
- style (string): tipo do vinho (tinto, branco, rosé, espumante, sobremesa, fortificado)
- country (string): país de origem
- region (string): região
- grape (string): uva/casta principal
- quantity (number): quantidade de garrafas (padrão: 1)
- purchase_price (number): preço de compra (apenas número, sem símbolo de moeda)
- cellar_location (string): localização na adega
- drink_from (number): ano para começar a beber
- drink_until (number): ano limite para beber

Regras:
1. Analise o cabeçalho e os dados para identificar qual coluna corresponde a qual campo, independente do nome, idioma ou ordem das colunas.
2. Se uma coluna contiver dados mistos (ex: "Malbec 2020"), separe em campos distintos.
3. Se o estilo não estiver explícito, tente inferir pela uva ou nome (ex: "Champagne" → espumante).
4. Normalize estilos para: tinto, branco, rose, espumante, sobremesa, fortificado.
5. Limpe preços removendo símbolos (R$, $, €) e convertendo vírgula decimal para ponto.
6. Se quantidade estiver ausente, use 1.
7. SEMPRE retorne um array JSON válido de objetos com os campos mapeados.
8. Ignore linhas completamente vazias ou totalizadores.
9. Se não conseguir identificar o nome do vinho em nenhuma coluna, use a coluna que parecer mais provável.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analise este CSV e extraia os dados de vinhos mapeando as colunas corretamente. Retorne APENAS o JSON array, sem markdown nem explicação.\n\n${truncated}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_wines",
              description: "Extract wine data from CSV content",
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
                        country: { type: "string" },
                        region: { type: "string" },
                        grape: { type: "string" },
                        quantity: { type: "number" },
                        purchase_price: { type: "number" },
                        cellar_location: { type: "string" },
                        drink_from: { type: "number" },
                        drink_until: { type: "number" },
                      },
                      required: ["name"],
                    },
                  },
                  column_mapping: {
                    type: "object",
                    description:
                      "Mapeamento das colunas originais para os campos do sistema",
                    additionalProperties: { type: "string" },
                  },
                  notes: {
                    type: "string",
                    description: "Observações sobre decisões de mapeamento",
                  },
                },
                required: ["wines"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_wines" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ error: "Serviço de análise indisponível." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair dados do CSV." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-csv-wines error:", e instanceof Error ? e.message : "unknown");
    return new Response(
      JSON.stringify({ error: "Erro ao processar CSV. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
