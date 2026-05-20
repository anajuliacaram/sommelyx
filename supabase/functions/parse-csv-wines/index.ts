import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { callOpenAIResponses } from "../_shared/openai.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getCachedAiResponse, setCachedAiResponse, sha256Hex } from "../_shared/ai-cache.ts";


const MAX_CSV_SIZE = 1_000_000;
const MAX_ROWS = 200;
const MAX_CHUNKS = 5;
const PROCESSING_TIMEOUT_MS = 25_000;
const FUNCTION_NAME = "parse-csv-wines";

const DISTRIBUTOR_COUNTRY_MAP: Record<string, string> = {
  ARG: "Argentina",
  FRA: "França",
  CHI: "Chile",
  POR: "Portugal",
  ITA: "Itália",
  ESP: "Espanha",
  ALE: "Alemanha",
  AUS: "Austrália",
  USA: "Estados Unidos",
  URU: "Uruguai",
  BRA: "Brasil",
  AFR: "África do Sul",
};

const DISTRIBUTOR_STYLE_MAP: Record<string, string> = {
  TTO: "tinto",
  BCO: "branco",
  ROS: "rose",
  ESP: "espumante",
  SOB: "sobremesa",
  FOR: "fortificado",
};

const DISTRIBUTOR_GRAPE_EXPAND: Record<string, { name: string; grape: string }> = {
  "CABERNET FRANC": { name: "CABERNET FRANC", grape: "Cabernet Franc" },
  "CAB FRANC": { name: "CABERNET FRANC", grape: "Cabernet Franc" },
  "CAB SAUVI": { name: "CABERNET SAUVIGNON", grape: "Cabernet Sauvignon" },
  "PINOT NOIR": { name: "PINOT NOIR", grape: "Pinot Noir" },
  "PINOT NOI": { name: "PINOT NOIR", grape: "Pinot Noir" },
  "CARMENERE": { name: "CARMENERE", grape: "Carmenère" },
  "CHARDONNAY": { name: "CHARDONNAY", grape: "Chardonnay" },
  "ALVARINHO": { name: "ALVARINHO", grape: "Alvarinho" },
  "MALBEC": { name: "MALBEC", grape: "Malbec" },
  "BAROLO": { name: "BAROLO", grape: "Nebbiolo" },
  "CARM": { name: "CARMENERE", grape: "Carmenère" },
};

function fixEncoding(text: string) {
  return text
    .replace(/\uFFFD/g, "")
    .replace(/Ã§/g, "ç")
    .replace(/Ã£/g, "ã")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ãª/g, "ê")
    .replace(/Ã´/g, "ô")
    .replace(/Ãµ/g, "õ")
    .replace(/Ã‡/g, "Ç")
    .replace(/Ã/g, "Á");
}

function detectDelimiter(firstLine: string): string {
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
    "|": (firstLine.match(/\|/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ",";
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim().replace(/^"|"$/g, ""));
  return out;
}

function toDistributorTitleCase(str: string): string {
  const lowerWords = new Set(["de", "du", "da", "do", "di", "del", "des", "et", "e", "y", "van", "von", "the", "a", "an"]);
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const normalized = word
        .replace(/^nobrega$/i, "nóbrega")
        .replace(/^fume$/i, "fumé")
        .replace(/^fumé$/i, "fumé")
        .replace(/^carmenere$/i, "carmenère");
      if (index > 0 && lowerWords.has(normalized)) return normalized;
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

function parseBRPrice(raw: string | undefined): number | null {
  if (!raw) return null;
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
}

function inferDistributorProducer(name: string, producerCode: string | null): string | null {
  const upper = name.toUpperCase();
  const byCode: Record<string, string> = {
    CYT: "Concha y Toro",
    DMC: "Don Melchor",
  };
  if (producerCode && byCode[producerCode]) return byCode[producerCode];
  if (upper.startsWith("DOMAINE CHENE")) return "Domaine Chene";
  if (producerCode === "DSB" && upper.startsWith("CHABLIS")) return "Chablis/DSB";
  if (upper.startsWith("DON MELCHOR")) return "Don Melchor";
  if (upper.startsWith("TERRAS DA NÓBREGA")) return "Terras da Nóbrega";
  if (upper.startsWith("CHATEAUNEUF DU PAPE")) return "Chateauneuf du Pape";
  const words = name.split(/\s+/).filter(Boolean);
  return words[0] || null;
}

function parseDistributorDescription(desc: string): {
  name: string;
  producer: string | null;
  country: string | null;
  style: string | null;
  vintage: number | null;
  grape: string | null;
} | null {
  const upper = desc.toUpperCase().replace(/\s+/g, " ").trim();
  if (!upper.startsWith("VINHO")) return null;

  const parts = upper.replace(/^VINHO\s+/, "").split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;

  const countryCode = parts[0];
  const country = DISTRIBUTOR_COUNTRY_MAP[countryCode] ?? null;
  let idx = country ? 1 : 0;
  let producerCode: string | null = null;

  if (
    parts[idx] &&
    /^[A-Z]{2,4}$/.test(parts[idx]) &&
    !DISTRIBUTOR_STYLE_MAP[parts[idx]] &&
    !DISTRIBUTOR_COUNTRY_MAP[parts[idx]]
  ) {
    producerCode = parts[idx];
    idx++;
  }

  const vintageIdx = parts.findIndex((part, index) => index >= idx && /^(19|20)\d{2}$/.test(part));
  const vintage = vintageIdx >= 0 ? Number.parseInt(parts[vintageIdx], 10) : null;
  const styleIdx = parts.findIndex((part, index) => index >= idx && !!DISTRIBUTOR_STYLE_MAP[part]);
  const style = styleIdx >= 0 ? DISTRIBUTOR_STYLE_MAP[parts[styleIdx]] : null;
  const endIdx = Math.min(styleIdx >= 0 ? styleIdx : parts.length, vintageIdx >= 0 ? vintageIdx : parts.length);
  const nameTokens = parts.slice(idx, endIdx);
  if (nameTokens.length === 0) return null;

  let rawName = nameTokens.join(" ");
  let grape: string | null = null;
  const expansions = Object.entries(DISTRIBUTOR_GRAPE_EXPAND).sort((a, b) => b[0].length - a[0].length);
  for (const [abbr, expanded] of expansions) {
    if (rawName.includes(abbr)) {
      grape = grape || expanded.grape;
      rawName = rawName.replace(new RegExp(`\\b${abbr}\\b`, "g"), expanded.name);
    }
  }

  const name = toDistributorTitleCase(rawName);
  const producer = inferDistributorProducer(name, producerCode);
  return { name, producer, country, style, vintage, grape };
}

function isDistributorDataRow(cols: string[]): boolean {
  const item = cols[0]?.trim();
  const desc = cols[2]?.trim();
  return !!item && /^\d+$/.test(item) && !!desc && desc.length >= 5 && /^VINHO\b/i.test(desc);
}

function parseDistributorCsv(text: string): { wines: Array<Record<string, unknown>>; delimiter: string; ignoredRows: number; categories: string[] } {
  const normalized = fixEncoding(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const firstLine = lines.find((line) => line.trim().length > 0) || "";
  const delimiter = detectDelimiter(firstLine);
  const wines: Array<Record<string, unknown>> = [];
  const categories = new Set<string>();
  let ignoredRows = 0;
  let currentCategoria = "";

  for (const line of lines) {
    const cols = splitDelimitedLine(line, delimiter);
    const first = cols[0]?.trim() || "";
    const second = cols[1]?.trim() || "";

    if (!first && second && !/^\d+$/.test(second)) {
      const possibleCat = second.toLowerCase();
      if (!possibleCat.includes("quantidade") && possibleCat.length > 2) {
        currentCategoria = possibleCat;
        categories.add(possibleCat);
      }
      continue;
    }

    if (!isDistributorDataRow(cols)) {
      ignoredRows++;
      continue;
    }

    const parsed = parseDistributorDescription(cols[2]?.trim() || "");
    if (!parsed?.name) {
      ignoredRows++;
      continue;
    }

    const rawQuantity = Number.parseInt((cols[3] || "").trim(), 10);
    const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
    const price = parseBRPrice(cols[4]);
    wines.push({
      nome: parsed.name,
      name: parsed.name,
      produtor: parsed.producer,
      producer: parsed.producer,
      safra: parsed.vintage,
      vintage: parsed.vintage,
      quantidade: quantity,
      quantity,
      pais: parsed.country,
      country: parsed.country,
      estilo: parsed.style,
      style: parsed.style,
      uva: parsed.grape,
      grape: parsed.grape,
      preco_compra: price,
      purchase_price: price,
      categoria_distribuidor: currentCategoria || null,
      confidence: 0.85,
    });
  }

  return { wines, delimiter, ignoredRows, categories: Array.from(categories) };
}

function errorResponse(code: string, message: string, requestId: string, retryable = false) {
  return { success: false, code, message, requestId, retryable };
}

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
  const corsHeaders = createCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const deadlineAt = startTime + PROCESSING_TIMEOUT_MS;
  const requestId = req.headers.get("X-Client-Request-Id") || crypto.randomUUID();
  let userId = "anonymous";
  let inputSizeBytes = 0;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      await logAudit("anonymous", 401, "unauthorized", Date.now() - startTime, {
        request_id: requestId,
        input_size_bytes: 0,
        error_type: "AUTH_REQUIRED",
      });
      return new Response(JSON.stringify(errorResponse("AUTH_REQUIRED", "Sessão expirada. Faça login novamente.", requestId)), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify(errorResponse("AI_UNAVAILABLE", "Serviço temporariamente indisponível.", requestId, true)), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return new Response(JSON.stringify(errorResponse("AUTH_REQUIRED", "Sessão expirada. Faça login novamente.", requestId)), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = user.id;

    const { csvContent, fileName, fileType, parseMode, textBlocks, ocrUsed } = await req.json();
    if (!csvContent || typeof csvContent !== "string") {
      return new Response(JSON.stringify(errorResponse("INVALID_CSV", "O conteúdo CSV está ausente ou inválido.", requestId)), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBytes = new TextEncoder().encode(csvContent);
    inputSizeBytes = rawBytes.length;
    if (rawBytes.length > MAX_CSV_SIZE) {
      await logAudit(userId, 400, "invalid_input", Date.now() - startTime, {
        request_id: requestId,
        input_size_bytes: inputSizeBytes,
        error_type: "FILE_TOO_LARGE",
      });
      return new Response(JSON.stringify(errorResponse("FILE_TOO_LARGE", "O arquivo está muito pesado. Envie uma versão menor.", requestId)), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = fixEncoding(csvContent).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
    const detectedRows = Math.max(0, lines.length - 1);
    if (detectedRows > MAX_ROWS) {
      await logAudit(userId, 400, "invalid_input", Date.now() - startTime, {
        request_id: requestId,
        input_size_bytes: inputSizeBytes,
        error_type: "FILE_TOO_LARGE",
      });
      return new Response(JSON.stringify(errorResponse("FILE_TOO_LARGE", "O arquivo está muito pesado. Envie uma versão menor.", requestId)), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isSmartPdf = parseMode === "smart-pdf" || fileType === "application/pdf";
    console.info(`[${FUNCTION_NAME}] request_received`, {
      request_id: requestId,
      user_id: userId,
      fileName,
      fileType,
      input_size_bytes: inputSizeBytes,
      parseMode: isSmartPdf ? "smart-pdf" : "structured",
    });
    console.log(`[${FUNCTION_NAME}] request_id=${requestId} mode=${isSmartPdf ? "smart-pdf" : "structured"} input_chars=${normalized.length} input_lines=${lines.length} ocr_used=${ocrUsed ? "true" : "false"} attachment_type=${fileType || "csv"} ocr_length=${normalized.length} model=gpt-4o-mini timeout_source=none retryable=false retries=1`);

    const supportedFileTypes = new Set([
      "text/csv",
      "text/plain",
      "text/tab-separated-values",
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.oasis.opendocument.spreadsheet",
    ]);
    if (fileType && typeof fileType === "string" && !supportedFileTypes.has(fileType)) {
      return new Response(JSON.stringify(errorResponse("UNSUPPORTED_FILE_TYPE", "Este formato ainda não é suportado. Envie JPG, PNG, PDF ou CSV.", requestId)), {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheInput = {
      csvHash: await sha256Hex(normalized),
      fileType: typeof fileType === "string" ? fileType : "",
      parseMode: isSmartPdf ? "smart-pdf" : "structured",
      ocrUsed: !!ocrUsed,
      rowCount: detectedRows,
    };
    const cached = await getCachedAiResponse<any>("parse-csv-wines", cacheInput, { userId });
    if (cached.hit && cached.payload) {
      await logAudit(userId, 200, "cache_hit", Date.now() - startTime, {
        request_id: requestId,
        cached: true,
        rowCount: detectedRows,
        input_size_bytes: inputSizeBytes,
        error_type: null,
      });
      return new Response(JSON.stringify(cached.payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isSmartPdf) {
      const distributor = parseDistributorCsv(normalized);
      if (distributor.wines.length > 0) {
        const warnings = distributor.ignoredRows > 0
          ? [`${distributor.ignoredRows} linha(s) sem dados de vinho foram ignoradas.`]
          : [];
        const result = {
          wines: distributor.wines,
          vinhos: distributor.wines,
          total_encontrados: distributor.wines.length,
          avisos: warnings,
          column_mapping: {
            Item: "ignored",
            Produto: "product_code",
            "Descrição": "name",
            Quantidade: "quantity",
            "Valor Unitário": "purchase_price",
          },
          notes: warnings.join(" "),
          metadata: {
            fileName: typeof fileName === "string" ? fileName : null,
            fileType: typeof fileType === "string" ? fileType : null,
            parseMode: "distributor-csv",
            delimiter: distributor.delimiter,
            categories: distributor.categories,
            ocrUsed: false,
            chunks: 0,
            truncated: false,
          },
        };

        console.log(`[${FUNCTION_NAME}] request_id=${requestId} distributor_parser_wines=${result.wines.length} ignored_rows=${distributor.ignoredRows} delimiter=${JSON.stringify(distributor.delimiter)}`);
        await logAudit(userId, 200, "success", Date.now() - startTime, {
          request_id: requestId,
          parser: "distributor-csv",
          wines_extracted: result.wines.length,
          csv_lines: lines.length,
          input_size_bytes: inputSizeBytes,
          error_type: null,
        });
        await setCachedAiResponse("parse-csv-wines", cacheInput, result, { userId });
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const rateLimit = await checkRateLimit(userId, FUNCTION_NAME);
    if (!rateLimit.allowed) {
      await logAudit(userId, rateLimit.degraded ? 503 : 429, "rate_limited", Date.now() - startTime, {
        request_id: requestId,
        scope: rateLimit.scope,
        current_count: rateLimit.currentCount,
        reset_at: rateLimit.resetAt,
        degraded: rateLimit.degraded,
        input_size_bytes: inputSizeBytes,
        error_type: rateLimit.degraded ? "AI_RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
      });
      return new Response(JSON.stringify(errorResponse(rateLimit.degraded ? "AI_UNAVAILABLE" : "RATE_LIMIT", rateLimit.degraded ? "Serviço temporariamente indisponível." : "Limite de uso atingido.", requestId, true)), {
        status: rateLimit.degraded ? 503 : 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": rateLimit.degraded ? "30" : "60" },
      });
    }

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
      const CHUNK_SIZE = 60;

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
      await logAudit(userId, 408, "fallback_used", Date.now() - startTime, {
        request_id: requestId,
        input_size_bytes: inputSizeBytes,
        error_type: "AI_TIMEOUT",
      });
      return new Response(JSON.stringify(errorResponse("AI_TIMEOUT", "A leitura demorou mais que o esperado. Tente novamente.", requestId, true)), {
        status: 408,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (chunks.length === 0) {
      await logAudit(userId, 400, "invalid_input", Date.now() - startTime, {
        request_id: requestId,
        input_size_bytes: inputSizeBytes,
        error_type: "FILE_TOO_LARGE",
      });
      return new Response(JSON.stringify(errorResponse("FILE_TOO_LARGE", "O arquivo está muito pesado. Envie uma versão menor.", requestId)), {
        status: 413,
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
      try {
        console.log(`[${FUNCTION_NAME}] request_id=${requestId} provider=openai model=gpt-4o-mini chunk_chars=${chunkText.length}`);
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
          maxOutputTokens: isSmartPdf ? 1800 : 1400,
        });

        if (!result.ok) {
          const transient = result.status >= 500 || result.status === 408 || result.status === 425;
          return { errorStatus: result.status, transientError: transient };
        }

        return { result: result.parsed };
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        const isAbort = message.toLowerCase().includes("abort");
        console.log(`[${FUNCTION_NAME}] request_id=${requestId} duration_ms=${Date.now() - startTime} retryable=${isAbort} timeout_source=${isAbort ? "openai" : "none"} error=${message}`);
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
      return new Response(JSON.stringify(errorResponse("FILE_TOO_LARGE", "O arquivo está muito pesado. Envie uma versão menor.", requestId)), {
        status: 413,
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
      await logAudit(userId, status, "ai_error", Date.now() - startTime, {
        request_id: requestId,
        failures,
        chunks: chunks.length,
        input_size_bytes: inputSizeBytes,
        error_type: status === 429 ? "RATE_LIMIT_EXCEEDED" : status === 408 ? "AI_TIMEOUT" : "PARSE_ERROR",
      });
      return new Response(JSON.stringify(errorResponse(status === 429 ? "RATE_LIMIT" : status === 408 ? "AI_TIMEOUT" : failures.includes(422) ? "PARSE_ERROR" : "AI_UNAVAILABLE", message, requestId, true)), {
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

    const normalizedWines = Array.from(dedup.values());
    const warnings = notes.filter(Boolean);
    const result = {
      wines: normalizedWines,
      vinhos: normalizedWines,
      total_encontrados: normalizedWines.length,
      avisos: warnings,
      column_mapping: column_mapping ?? {},
      notes: warnings.join(" "),
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
    console.log(`[${FUNCTION_NAME}] request_id=${requestId} parsed_wines=${result.wines.length} rejected_rows=${rejectedRows} chunks=${chunks.length} latency_ms=${Date.now() - startTime}`);

    await logAudit(userId, 200, "success", Date.now() - startTime, {
      request_id: requestId,
      wines_extracted: result.wines.length,
      csv_lines: lines.length,
      chunks: chunks.length,
      truncated: wasTruncated,
      input_size_bytes: inputSizeBytes,
      error_type: null,
    });

    await setCachedAiResponse("parse-csv-wines", cacheInput, result, { userId });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-csv-wines error:", err);
    await logAudit(userId, 500, "internal_error", Date.now() - startTime, {
      request_id: requestId,
      error: err instanceof Error ? err.message : "unknown",
      input_size_bytes: inputSizeBytes,
      error_type: "INTERNAL_ERROR",
    });
      return new Response(JSON.stringify(errorResponse("INVALID_CSV", "Não conseguimos ler este arquivo CSV.", requestId)), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
});
