import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callOpenAIResponses, maskSecret } from "../_shared/openai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

const MAX_CSV_SIZE = 2_000_000;
const FUNCTION_NAME = "parse-csv-wines";

async function logAudit(
  userId: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
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
      return new Response(JSON.stringify({ error: "Erro interno de configuração.", code: "CONFIG_ERROR" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = user.id;

    if (!checkRateLimit(userId)) {
      await logAudit(userId, 429, "rate_limited", Date.now() - startTime);
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
    console.log(`[parse-csv-wines] openai_key=${maskSecret(OPENAI_API_KEY)} model=${OPENAI_MODEL}`);
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
      return new Response(JSON.stringify({ error: "csvContent é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (csvContent.length > MAX_CSV_SIZE) {
      return new Response(JSON.stringify({ error: "Arquivo muito grande. Máximo 2MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = csvContent.replace(/\r\n/g, "\n").trim();
    const lines = normalized.split("\n").filter((l) => l.trim().length > 0);

    const header = lines[0] || "";
    const dataLines = lines.slice(1);
    const CHUNK_SIZE = 150;
    const MAX_CHUNKS = 5;

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

    const systemPrompt = `Você é um especialista em dados de vinhos. Receba conteúdo bruto de arquivo (CSV/TSV, planilha ou PDF) e extraia dados de vinhos mapeando colunas para campos corretos.

Campos: name (OBRIGATÓRIO), producer, vintage (number), style (tinto/branco/rose/espumante/sobremesa/fortificado), country, region, grape, quantity (number, padrão 1), purchase_price (number), cellar_location, drink_from (number), drink_until (number).

Regras:
1. Identifique colunas independente de nome/idioma/ordem.
2. Separe dados mistos (ex: "Malbec 2020" → grape + vintage).
3. Infira estilo pela uva/nome se ausente.
4. Normalize estilos para: tinto, branco, rose, espumante, sobremesa, fortificado.
5. Limpe preços (remova R$/$, vírgula→ponto).
6. Quantidade ausente = 1.
7. Ignore linhas vazias/totalizadores.
8. Não retorne cabeçalhos como vinho.
9. Prefira qualidade sobre quantidade.`;

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
        const cleaned = value.trim().replace(/\s/g, "").replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
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

    const toolDef = {
      type: "function" as const,
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
            notes: { type: "string" },
          },
          required: ["wines"],
        },
      },
    };

    async function callAi(chunkText: string): Promise<{ result?: any; errorStatus?: number }> {
      const result = await callOpenAIResponses<any>({
        functionName: FUNCTION_NAME,
        requestId: crypto.randomUUID(),
        apiKey: OPENAI_API_KEY,
        model: OPENAI_MODEL,
        timeoutMs: 60_000,
        temperature: 0.1,
        instructions: systemPrompt,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `Analise o conteúdo abaixo e extraia os dados de vinhos.\n\n${chunkText}` },
            ],
          },
        ],
        schema: toolDef.function.parameters as Record<string, unknown>,
        maxOutputTokens: 6_000,
      });

      if (!result.ok) {
        return { errorStatus: result.status };
      }

      return { result: result.parsed };
    }

    // ── PARALLEL chunk processing for speed ──
    console.log(`Processing ${chunks.length} chunk(s) in parallel...`);
    const chunkResults = await Promise.allSettled(chunks.map((chunk) => callAi(chunk)));

    const allWines: Array<Record<string, unknown>> = [];
    let column_mapping: Record<string, unknown> | undefined = undefined;
    const notes: string[] = [];
    const failures: number[] = [];

    for (const settled of chunkResults) {
      if (settled.status === "rejected") {
        failures.push(500);
        continue;
      }
      const { result, errorStatus } = settled.value;
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
          : status === 402 ? "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso."
          : "Não foi possível extrair dados do arquivo.";
      await logAudit(userId, status, "ai_error", Date.now() - startTime, { failures, chunks: chunks.length });
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...(status === 429 ? { "Retry-After": "60" } : {}) },
      });
    }

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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-csv-wines error:", err);
    await logAudit(userId, 500, "internal_error", Date.now() - startTime, {
      error: err instanceof Error ? err.message : "unknown",
    });
    return new Response(JSON.stringify({ error: "Erro interno ao processar arquivo." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
