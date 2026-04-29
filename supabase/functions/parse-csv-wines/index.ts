import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { callOpenAIResponses } from "../_shared/openai.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_CSV_SIZE = 1_000_000;
const MAX_ROWS = 200;
const MAX_CHUNKS = 5;
const PROCESSING_TIMEOUT_MS = 10_000;
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
  const deadlineAt = startTime + PROCESSING_TIMEOUT_MS;
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

    const rateLimit = await checkRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logAudit(userId, rateLimit.degraded ? 503 : 429, "rate_limited", Date.now() - startTime, {
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
      });
      return new Response(JSON.stringify({
        error: rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.",
        code: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
        retryable: true,
      }), {
        status: rateLimit.degraded ? 503 : 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": rateLimit.degraded ? "30" : "60" },
      });
    }

    const { csvContent, fileName, fileType, parseMode, textBlocks, ocrUsed } = await req.json();
    if (!csvContent || typeof csvContent !== "string") {
      return new Response(JSON.stringify({ error: "csvContent é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBytes = new TextEncoder().encode(csvContent);
    if (rawBytes.length > MAX_CSV_SIZE) {
      return new Response(JSON.stringify({
        error: "Arquivo muito grande ou muitas linhas.",
        code: "IMPORT_LIMIT_EXCEEDED",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = csvContent.replace(/\r\n/g, "\n").trim();
    const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
    const detectedRows = Math.max(0, lines.length - 1);
    if (detectedRows > MAX_ROWS) {
      return new Response(JSON.stringify({
        error: "Arquivo muito grande ou muitas linhas.",
        code: "IMPORT_LIMIT_EXCEEDED",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isSmartPdf = parseMode === "smart-pdf" || fileType === "application/pdf";
    console.log(`[${FUNCTION_NAME}] mode=${isSmartPdf ? "smart-pdf" : "structured"} input_chars=${normalized.length} input_lines=${lines.length} ocr_used=${ocrUsed ? "true" : "false"}`);

    const chunks: string[] = [];
    const CHUNK_CHAR_LIMIT = isSmartPdf ? 12_000 : 8_500;

    if (isSmartPdf) {
      const source = normalized.length > 0 ? normalized : Array.isArray(textBlocks) ? JSON.stringify(textBlocks) : "";
      if (source.length <= CHUNK_CHAR_LIMIT) {
        chunks.push(source);
      } else {
        for (let i = 0; i < MAX_CHUNKS; i++) {
          if (Date.now() > deadlineAt) break;
          const start = i * CHUNK_CHAR_LIMIT;
          const slice = source.slice(start, start + CHUNK_CHAR_LIMIT);
          if (!slice) break;
          chunks.push(slice);
        }
      }
    } else {
      const header = lines[0] || "";
      const dataLines = lines.slice(1);
      const CHUNK_SIZE = 120;

      if (lines.length <= CHUNK_SIZE + 1) {
        chunks.push(normalized);
      } else {
        for (let i = 0; i < MAX_CHUNKS; i++) {
          if (Date.now() > deadlineAt) break;
          const slice = dataLines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          if (slice.length === 0) break;
          chunks.push([header, ...slice].join("\n"));
        }
      }
    }

    const wasTruncated = isSmartPdf ? normalized.length > chunks.length * CHUNK_CHAR_LIMIT : lines.slice(1).length > chunks.length * 120;

    if (Date.now() > deadlineAt) {
      return new Response(JSON.stringify({
        error: "Tempo excedido",
        code: "TIMEOUT",
      }), {
        status: 408,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (chunks.length === 0) {
      return new Response(JSON.stringify({
        error: "Arquivo muito grande ou muitas linhas.",
        code: "IMPORT_LIMIT_EXCEEDED",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseSystemPrompt = `Você é um SOMMELIER-DATA-SCIENTIST de elite. Receba conteúdo bruto de arquivo (CSV/TSV, planilha, PDF, Word ou texto) e extraia TODOS os dados de vinhos, MESMO quando o arquivo é desorganizado, sem cabeçalhos claros, ou misturado com texto livre.

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

12. **CABEÇALHOS DE SEÇÃO = PRODUTOR/VINÍCOLA**: Quando encontrar uma linha em CAIXA ALTA isolada (sem preço, sem quantidade) seguida de várias linhas de vinhos abaixo (ex: "FECOVITA - BUENOS AIRES", "FINCA LA LUZ - MENDOZA", "BODEGA NORTON", "CHATEAU MARGAUX"), trate essa linha como o **produtor (vinícola)** dos vinhos imediatamente abaixo dela, até encontrar o próximo cabeçalho. NÃO inclua o cabeçalho como um vinho — apenas use-o como produtor para preencher o campo \`producer\` das linhas seguintes que ainda não têm produtor explícito.
   - Exemplo: linha "FECOVITA - BUENOS AIRES" + abaixo "Malbec Reserva 2020 R$ 89,90" → vinho com name: "Malbec Reserva 2020", producer: "FECOVITA", region: "Buenos Aires", vintage: 2020, style: "tinto", country: "Argentina".
   - Mantenha a parte antes do hífen/traço como produtor, e a parte depois como região, quando aplicável.

13. **IGNORE PRODUTOS QUE NÃO SÃO VINHO**: azeite, azeite de oliva, vinagre, destilados (gin, vodka, whisky, rum, cachaça, tequila), licores genéricos não-vínicos, cervejas, refrigerantes, água, sucos, conservas, alimentos. Só retorne vinhos, espumantes, fortificados (Porto, Sherry, Madeira) e vinhos de sobremesa.

14. **Qualidade sobre quantidade**: prefira 5 vinhos completos a 50 com só nome.

15. **Sempre retorne os 12 campos** (deixe undefined apenas se realmente impossível inferir).

Sua reputação depende de devolver dados RICOS e COMPLETOS, não apenas nomes.`;

    const smartPdfSystemPrompt = `Você está interpretando um CATÁLOGO PDF de distribuidor de vinhos com layout não tabular, blocos por produtor e preços em coluna separada.

REGRAS ESPECÍFICAS DO PDF:
- Detecte blocos de produtor quando encontrar linhas em caixa alta isoladas.
- Associe os vinhos imediatamente abaixo do bloco de produtor.
- Use a coluna ou valores alinhados à direita como preço.
- Ignore títulos repetidos, seções, totalizadores, palavras como EXCLUSIVO e linhas de navegação.
- Preserve apenas itens de vinho, espumante, fortificado e sobremesa.
- Extraia name, producer, country, type, vintage e price.
- Normalize casing em Title Case.
- Retorne apenas vinhos válidos com name e price.

Você ainda deve seguir todas as demais regras de extração, normalização e deduplicação do prompt base.`;

    const systemPrompt = isSmartPdf ? `${smartPdfSystemPrompt}\n\n${baseSystemPrompt}` : baseSystemPrompt;

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
                required: [
                  "name",
                  "producer",
                  "vintage",
                  "style",
                  "country",
                  "region",
                  "grape",
                  "quantity",
                  "purchase_price",
                  "cellar_location",
                  "drink_from",
                  "drink_until",
                ],
              },
            },
            column_mapping: {
              type: "object",
              description: "Mapeamento das colunas originais para os campos do sistema",
              additionalProperties: { type: "string" },
            },
            notes: { type: "string" },
          },
          required: ["wines", "column_mapping", "notes"],
        },
      },
    };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function callAiOnce(chunkText: string): Promise<{ result?: any; errorStatus?: number; transientError?: boolean }> {
      const requestId = crypto.randomUUID();
      try {
        console.log(`[${FUNCTION_NAME}] request_id=${requestId} provider=openai model=gpt-4o-mini`);
        const result = await callOpenAIResponses<any>({
          functionName: FUNCTION_NAME,
          requestId,
          model: "gpt-4o-mini",
          timeoutMs: 9_000,
          temperature: 0.4,
          instructions: systemPrompt,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Analise o conteúdo abaixo e extraia os dados de vinhos.\n\n${chunkText}`,
                },
              ],
            },
          ],
          schema: toolDef.function.parameters,
          maxOutputTokens: 800,
        });

        if (!result.ok) {
          const transient = result.status >= 500 || result.status === 408 || result.status === 425;
          return { errorStatus: result.status, transientError: transient };
        }

        return { result: result.parsed };
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        const isAbort = message.toLowerCase().includes("abort");
        console.log(`[${FUNCTION_NAME}] request_id=${requestId} error=${message}`);
        return { errorStatus: isAbort ? 504 : 500, transientError: isAbort };
      }
    }

    async function callAi(chunkText: string): Promise<{ result?: any; errorStatus?: number }> {
      let lastStatus: number | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (Date.now() > deadlineAt) return { errorStatus: 504 };
        const res = await callAiOnce(chunkText);
        if (res.result) return res;
        lastStatus = res.errorStatus;
        if (!res.transientError) break;
        await sleep(500 * Math.pow(2, attempt));
      }
      return { errorStatus: lastStatus ?? 500 };
    }

    if (chunks.length > MAX_CHUNKS) {
      return new Response(JSON.stringify({
        error: "Arquivo muito grande ou muitas linhas.",
        code: "IMPORT_LIMIT_EXCEEDED",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      if (Date.now() > deadlineAt) {
        failures.push(504);
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
      const status = failures.includes(429) ? 429 : failures.includes(402) ? 402 : failures.includes(504) ? 408 : 422;
      const message =
        status === 429 ? "Muitas requisições. Tente novamente em alguns segundos."
          : status === 402 ? "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso."
          : status === 408 ? "Tempo excedido"
          : failures.includes(422) ? "INVALID_AI_RESPONSE" : "Não foi possível extrair dados do arquivo.";
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
        parseMode: isSmartPdf ? "smart-pdf" : "structured",
        ocrUsed: !!ocrUsed,
        chunks: chunks.length,
        truncated: wasTruncated,
      },
    };

    const rejectedRows = Math.max(0, allWines.length - result.wines.length);
    console.log(`[${FUNCTION_NAME}] parsed_wines=${result.wines.length} rejected_rows=${rejectedRows} chunks=${chunks.length}`);

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
