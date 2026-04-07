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

const MAX_CSV_SIZE = 2_000_000; // 2MB
const FUNCTION_NAME = "parse-csv-wines";

async function logAudit(
  userId: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  // Avoid writing DB logs for unauthenticated requests to prevent log-spam abuse.
  if (!userId || userId === "anonymous") return;

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: FUNCTION_NAME,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata || {},
    });
  } catch (e) {
    console.error("Audit log failed:", e instanceof Error ? e.message : "unknown");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  let userId = "anonymous";

  try {
    // ── JWT Authentication ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      await logAudit("anonymous", 500, "internal_error", Date.now() - startTime, {
        reason: "missing_supabase_env",
      });
      return new Response(JSON.stringify({ error: "Erro interno de configuração.", code: "CONFIG_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        reason: "empty_bearer_token",
      });
      return new Response(JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token using service role to avoid false 401 when anon key runtime env is missing or stale.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        reason: "token_validation_failed",
      });
      return new Response(JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = user.id;

    // ── Rate Limiting ──
    if (!checkRateLimit(userId)) {
      await logAudit(userId, 429, "rate_limited", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    // ── Input Validation ──
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      await logAudit(userId, 500, "internal_error", Date.now() - startTime, { reason: "missing_api_key" });
      return new Response(JSON.stringify({ error: "Erro de configuração do serviço." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { csvContent, fileName, fileType } = await req.json();
    if (!csvContent || typeof csvContent !== "string") {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, { reason: "missing_csv" });
      return new Response(JSON.stringify({ error: "csvContent é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (csvContent.length > MAX_CSV_SIZE) {
      await logAudit(userId, 400, "validation_error", Date.now() - startTime, {
        reason: "csv_too_large",
        size_bytes: csvContent.length,
      });
      return new Response(JSON.stringify({ error: "Arquivo CSV muito grande. Máximo 2MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = csvContent.replace(/\r\n/g, "\n").trim();
    const lines = normalized.split("\n").filter((l) => l.trim().length > 0);

    // Chunk input to keep token usage reasonable while still importing more than ~50 lines.
    const header = lines[0] || "";
    const dataLines = lines.slice(1);
    const CHUNK_SIZE = 120;
    const MAX_CHUNKS = 6; // max ~720 rows + header

    const chunks: string[] = [];
    if (lines.length <= CHUNK_SIZE + 1) {
      chunks.push(normalized);
    } else {
      for (let i = 0; i < MAX_CHUNKS; i++) {
        const slice = dataLines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        if (slice.length === 0) break;
        chunks.push([header, ...slice].join("\n"));
      }
    }

    const wasTruncated = dataLines.length > chunks.length * CHUNK_SIZE;

    const systemPrompt = `Você é um especialista em dados de vinhos. Sua tarefa é receber o conteúdo bruto de um arquivo (CSV/TSV, planilha convertida em texto ou texto extraído de PDF) e extrair os dados de vinhos, mapeando automaticamente as colunas para os campos corretos.

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
9. Se não conseguir identificar o nome do vinho em nenhuma coluna, use a coluna que parecer mais provável.
10. Se o conteúdo vier de PDF, trate como uma lista e extraia o máximo de campos possível a partir do texto.
11. Não retorne cabeçalhos como vinho (ex.: "nome", "produto", "descrição", "total", "subtotal").
12. Prefira qualidade: é melhor retornar menos linhas válidas do que várias linhas duvidosas.`;

    function normalizeStyle(value: unknown) {
      const v = typeof value === "string" ? value.trim().toLowerCase() : "";
      if (!v) return undefined;
      if (["tinto", "branco", "rose", "espumante", "sobremesa", "fortificado"].includes(v)) return v;
      if (v.includes("ros")) return "rose";
      if (v.includes("spark") || v.includes("espum") || v.includes("champ")) return "espumante";
      if (v.includes("fort") || v.includes("porto") || v.includes("sherry")) return "fortificado";
      if (v.includes("dess") || v.includes("sobrem")) return "sobremesa";
      if (v.includes("white") || v.includes("branc")) return "branco";
      if (v.includes("red") || v.includes("tint")) return "tinto";
      return v;
    }

    function normalizeNumber(value: unknown) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const cleaned = value
          .trim()
          .replace(/\s/g, "")
          .replace(/[^\d.,-]/g, "")
          .replace(/\.(?=\d{3}(?:\D|$))/g, "")
          .replace(",", ".");
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) return parsed;
      }
      return undefined;
    }

    function normalizeName(value: unknown) {
      const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
      if (!name) return "";
      const lower = name.toLowerCase();
      const blocked = ["nome", "produto", "vinho", "descrição", "descricao", "total", "subtotal", "preço", "preco", "quantidade"];
      if (blocked.includes(lower)) return "";
      if (/^(linha|row)\s*\d+$/i.test(name)) return "";
      if (name.length > 120) return "";
      return name;
    }

    async function callAi(chunkText: string) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.1,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                `Analise o conteúdo abaixo e extraia os dados de vinhos mapeando colunas corretamente. ` +
                `Retorne APENAS via tool_call.\n\n` +
                chunkText,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_wines",
                description: "Extract wine data from tabular or semi-structured content",
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
                      description: "Mapeamento das colunas originais para os campos do sistema",
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
        return { errorStatus: response.status as number };
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        const content = data.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim().startsWith("{")) {
          try {
            return { result: JSON.parse(content) };
          } catch {
            // ignore and fallback to status error below
          }
        }
        return { errorStatus: 422 as number };
      }

      const result = JSON.parse(toolCall.function.arguments);
      return { result };
    }

    const allWines: Array<Record<string, unknown>> = [];
    let column_mapping: Record<string, unknown> | undefined = undefined;
    const notes: string[] = [];
    const failures: number[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const { result, errorStatus } = await callAi(chunks[i]);
      if (errorStatus) {
        failures.push(errorStatus);
        continue;
      }
      if (result?.notes) notes.push(String(result.notes));
      if (!column_mapping && result?.column_mapping && typeof result.column_mapping === "object") {
        column_mapping = result.column_mapping as Record<string, unknown>;
      }
      const wines = Array.isArray(result?.wines) ? result.wines : [];
      for (const w of wines) {
        if (w && typeof w === "object") allWines.push(w as Record<string, unknown>);
      }
    }

    if (allWines.length === 0) {
      const status = failures.includes(429) ? 429 : failures.includes(402) ? 402 : 422;
      const message =
        status === 429 ? "Muitas requisições. Tente novamente em alguns segundos."
          : status === 402 ? "Créditos de IA esgotados."
          : "Não foi possível extrair dados do arquivo.";
      await logAudit(userId, status, "ai_error", Date.now() - startTime, { failures, chunks: chunks.length });
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...(status === 429 ? { "Retry-After": "60" } : {}) },
      });
    }

    // Normalize, default values, and dedupe.
    const dedup = new Map<string, Record<string, unknown>>();
    for (const w of allWines) {
      const name = normalizeName(w.name);
      if (!name) continue;

      const producer = typeof w.producer === "string" ? w.producer.trim() : "";
      const vintage = normalizeNumber(w.vintage);
      const key = `${name.toLowerCase()}|${producer.toLowerCase()}|${vintage ?? ""}`;
      const quantity = normalizeNumber(w.quantity);
      const purchasePrice = normalizeNumber(w.purchase_price);

      const normalizedWine: Record<string, unknown> = {
        name,
        producer: producer || undefined,
        vintage: vintage ?? undefined,
        style: normalizeStyle(w.style),
        country: typeof w.country === "string" ? w.country.trim() : undefined,
        region: typeof w.region === "string" ? w.region.trim() : undefined,
        grape: typeof w.grape === "string" ? w.grape.trim() : undefined,
        quantity: quantity && quantity > 0 ? Math.min(9_999, Math.trunc(quantity)) : 1,
        purchase_price: purchasePrice && purchasePrice >= 0 && purchasePrice <= 200_000 ? Number(purchasePrice.toFixed(2)) : undefined,
        cellar_location: typeof w.cellar_location === "string" ? w.cellar_location.trim() : undefined,
        drink_from: normalizeNumber(w.drink_from),
        drink_until: normalizeNumber(w.drink_until),
      };

      if (!dedup.has(key)) dedup.set(key, normalizedWine);
    }

    if (wasTruncated) {
      notes.push("Arquivo grande: importamos uma amostra para manter a qualidade. Se precisar, importe em partes.");
    }
    if (failures.length > 0) {
      notes.push("Algumas partes do arquivo não puderam ser analisadas. Tente novamente ou importe em partes menores.");
    }

    const result = {
      wines: Array.from(dedup.values()),
      column_mapping: column_mapping ?? {},
      notes: notes.filter(Boolean).join(" "),
      metadata: {
        fileName: typeof fileName === "string" ? fileName : null,
        fileType: typeof fileType === "string" ? fileType : null,
        chunks: chunks.length,
        truncated: wasTruncated,
      },
    };

    await logAudit(userId, 200, "success", Date.now() - startTime, {
      wines_extracted: result.wines.length,
      csv_lines: lines.length,
      chunks: chunks.length,
      truncated: wasTruncated,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-csv-wines error:", e instanceof Error ? e.message : "unknown");
    await logAudit(userId, 500, "internal_error", Date.now() - startTime);
    return new Response(
      JSON.stringify({ error: "Erro ao processar CSV. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
