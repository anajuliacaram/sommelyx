import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function maskSecret(value?: string | null) {
  if (!value) return "missing";
  const trimmed = value.trim();
  if (trimmed.length <= 6) return `${trimmed.slice(0, 2)}…`;
  return `${trimmed.slice(0, 6)}…`;
}

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")?.trim() || "";
    const AI_MODEL = Deno.env.get("AI_MODEL")?.trim() || "google/gemini-2.5-pro";
    console.log(`[parse-csv-wines] lovable_key=${maskSecret(LOVABLE_API_KEY)} model=${AI_MODEL}`);
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
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

    const systemPrompt = `Você é um SOMMELIER-DATA-SCIENTIST de elite. Receba conteúdo bruto de arquivo (CSV/TSV, planilha, PDF, Word ou texto) e extraia TODOS os dados de vinhos, MESMO quando o arquivo é desorganizado, sem cabeçalhos claros, ou misturado com texto livre.

Campos a extrair POR LINHA:
- name (OBRIGATÓRIO, string) — nome do rótulo (ex: "Don Perignon Vintage")
- producer (string) — vinícola/produtor (ex: "Moët & Chandon")
- vintage (number 1900-2026) — ano da safra
- style (string) — OBRIGATÓRIO inferir: tinto/branco/rose/espumante/sobremesa/fortificado
- country (string) — país de origem
- region (string) — região/denominação (ex: "Bordeaux", "Mendoza")
- grape (string) — uva(s) principal(is) (ex: "Malbec", "Cabernet Sauvignon")
- quantity (number ≥1, padrão 1) — quantas garrafas
- purchase_price (number, BRL) — preço pago
- cellar_location (string) — localização física se mencionada
- drink_from (number, ano) — janela de consumo início
- drink_until (number, ano) — janela de consumo fim

REGRAS DE EXTRAÇÃO AGRESSIVA (CRÍTICAS — não retornar só o nome!):

1. **NUNCA retorne só o name.** Se o conteúdo tem só nomes soltos, INFIRA produtor, estilo, país, região e uva pelo conhecimento enológico mundial.
   Exemplos OBRIGATÓRIOS de inferência:
   - "Don Perignon" → producer: "Moët & Chandon", style: "espumante", country: "França", region: "Champagne", grape: "Chardonnay/Pinot Noir"
   - "Catena Zapata Malbec 2018" → producer: "Catena Zapata", grape: "Malbec", vintage: 2018, style: "tinto", country: "Argentina", region: "Mendoza"
   - "Sassicaia 2015" → producer: "Tenuta San Guido", style: "tinto", country: "Itália", region: "Bolgheri", grape: "Cabernet Sauvignon/Cabernet Franc", vintage: 2015
   - "Cloudy Bay Sauvignon Blanc" → producer: "Cloudy Bay", grape: "Sauvignon Blanc", style: "branco", country: "Nova Zelândia", region: "Marlborough"
   - "Veuve Clicquot Brut" → producer: "Veuve Clicquot", style: "espumante", country: "França", region: "Champagne"

2. **Identifique colunas** independente de nome/idioma/ordem (Nome, Wine, Produto, Rótulo, Vinho = name; Tipo, Estilo, Categoria = style; Safra, Ano, Vintage = vintage; etc.).

3. **Separe dados mistos** (ex: "Malbec 2020" → grape: "Malbec" + vintage: 2020; "Tinto Reserva 750ml" → style: "tinto").

4. **Inferência de estilo é OBRIGATÓRIA** quando ausente:
   - Uva tinta (Malbec, Cabernet, Merlot, Syrah, Pinot Noir, Tempranillo, Sangiovese, Tannat) → "tinto"
   - Uva branca (Chardonnay, Sauvignon Blanc, Riesling, Pinot Grigio, Albariño) → "branco"
   - Champagne, Cava, Prosecco, Franciacorta, Crémant → "espumante"
   - Porto, Sherry, Madeira, Marsala → "fortificado"
   - Sauternes, Tokaji, Ice Wine, Moscato → "sobremesa"

5. **Inferência de região/país** pelo nome do rótulo, produtor ou denominação.

6. **Normalize estilos** para EXATAMENTE: tinto, branco, rose, espumante, sobremesa, fortificado.

7. **Limpe preços** (remova R$/$, espaços, vírgula→ponto). Se preço total parece quantidade × unitário, mantenha unitário.

8. **Quantidade**: ausente = 1. Aceite "qtd", "estoque", "garrafas", "und".

9. **Janela de consumo**: se houver "beber até 2030" ou "drink window 2024-2030", preencha drink_from/drink_until.

10. **Ignore** linhas vazias, totalizadores ("TOTAL", "SUBTOTAL"), cabeçalhos repetidos, separadores.

11. **Não retorne cabeçalhos como vinho** (Nome, Produto, Vinho sozinhos).

12. **Qualidade sobre quantidade**: prefira 5 vinhos completos a 50 com só nome.

13. **Sempre retorne os 12 campos** (deixe undefined apenas se realmente impossível inferir).

Sua reputação depende de devolver dados RICOS e COMPLETOS, não apenas nomes.`;

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

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function callAiOnce(chunkText: string, model: string): Promise<{ result?: any; errorStatus?: number; transientError?: boolean }> {
      const requestId = crypto.randomUUID();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      try {
        console.log(`[${FUNCTION_NAME}] request_id=${requestId} provider=lovable model=${model}`);
        const response = await fetch("https://ai.lovable.dev/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Analise o conteúdo abaixo e extraia os dados de vinhos.\n\n${chunkText}` },
            ],
            tools: [toolDef],
            tool_choice: { type: "function", function: { name: "extract_wines" } },
            temperature: 0.4,
          }),
        });
        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          console.log(`[${FUNCTION_NAME}] request_id=${requestId} status=${response.status} error=${errText.slice(0, 300)}`);
          const transient = response.status >= 500 || response.status === 408 || response.status === 425;
          return { errorStatus: response.status, transientError: transient };
        }
        const data = await response.json();
        const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
        const argsRaw = toolCall?.function?.arguments;
        if (!argsRaw) {
          console.log(`[${FUNCTION_NAME}] request_id=${requestId} no_tool_call`);
          return { errorStatus: 422 };
        }
        let parsed: any;
        try {
          parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
        } catch (e) {
          console.log(`[${FUNCTION_NAME}] request_id=${requestId} parse_error=${e instanceof Error ? e.message : "unknown"}`);
          return { errorStatus: 422 };
        }
        return { result: parsed };
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        const isAbort = message.toLowerCase().includes("abort");
        const isNetwork = /dns|network|fetch|connect|lookup/i.test(message);
        console.log(`[${FUNCTION_NAME}] request_id=${requestId} error=${message}`);
        return { errorStatus: isAbort ? 504 : 500, transientError: isAbort || isNetwork };
      } finally {
        clearTimeout(timeout);
      }
    }

    async function callAi(chunkText: string): Promise<{ result?: any; errorStatus?: number }> {
      // Try primary model with retries on transient errors (network/DNS/5xx)
      const models = [AI_MODEL, "google/gemini-2.5-flash"];
      let lastStatus: number | undefined;
      for (let m = 0; m < models.length; m++) {
        const model = models[m];
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await callAiOnce(chunkText, model);
          if (res.result) return res;
          lastStatus = res.errorStatus;
          if (!res.transientError) break; // Non-transient (e.g. 401/402/422/429): stop with this model
          await sleep(500 * Math.pow(2, attempt)); // 500ms, 1s, 2s
        }
      }
      return { errorStatus: lastStatus ?? 500 };
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
