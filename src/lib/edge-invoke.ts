import { supabase } from "@/integrations/supabase/client";
import { aiDebugGroup, aiDebugLog } from "@/lib/ai-debug";

type InvokeOptions = {
  timeoutMs?: number;
  retries?: number;
  retryOnAbort?: boolean;
  requestId?: string;
  metadata?: {
    attachmentType?: string;
    ocrLength?: number;
    model?: string;
    flow?: string;
  };
};

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const EDGE_CACHE_TTL_MS = 5 * 60 * 1000;
const edgeResponseCache = new Map<string, CacheEntry>();

type EdgeEnvelopeSuccess<T> = {
  success: true;
  data: T;
  requestId?: string;
};

type EdgeEnvelopeError = {
  success: false;
  code?: string;
  message?: string;
  error?: string;
  requestId?: string;
  retryable?: boolean;
};

export class EdgeFunctionError extends Error {
  status?: number;
  code?: string;
  requestId?: string;
  debugId?: string;
  debug_id?: string;
  retryable?: boolean;
  rawBody?: unknown;
  functionName?: string;

  constructor(message: string, opts?: { status?: number; code?: string; requestId?: string; debugId?: string; retryable?: boolean; rawBody?: unknown; functionName?: string }) {
    super(message);
    this.name = "EdgeFunctionError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.requestId = opts?.requestId;
    this.debugId = opts?.debugId ?? opts?.requestId;
    this.debug_id = this.debugId;
    this.retryable = opts?.retryable;
    this.rawBody = opts?.rawBody;
    this.functionName = opts?.functionName;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`).join(",")}}`;
}

function getCacheKey(name: string, body: Record<string, unknown>) {
  return `${name}:${stableSerialize(body)}`;
}

function readEdgeCache<T>(cacheKey: string): T | null {
  const entry = edgeResponseCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    edgeResponseCache.delete(cacheKey);
    return null;
  }
  try {
    return structuredClone(entry.value) as T;
  } catch {
    return JSON.parse(JSON.stringify(entry.value)) as T;
  }
}

function writeEdgeCache(cacheKey: string, value: unknown) {
  try {
    edgeResponseCache.set(cacheKey, {
      expiresAt: Date.now() + EDGE_CACHE_TTL_MS,
      value: structuredClone(value),
    });
  } catch {
    edgeResponseCache.set(cacheKey, {
      expiresAt: Date.now() + EDGE_CACHE_TTL_MS,
      value: JSON.parse(JSON.stringify(value)),
    });
  }
}

function isRetriable(status?: number) {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

function isTransportErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed")
  );
}

function isSdkRelayError(message: string) {
  return message.toLowerCase().includes("failed to send a request to the edge function");
}

function isAbortErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("abort") ||
    normalized.includes("aborted") ||
    normalized.includes("aborterror") ||
    normalized.includes("signal is aborted")
  );
}

function normalizeEdgeCode(code?: string, status?: number) {
  const value = (code || "").trim().toUpperCase();
  if (value === "AUTH_INVALID") return "AUTH_REQUIRED";
  if (value === "EMPTY_AI_RESPONSE" || value === "INVALID_AI_RESPONSE" || value === "AI_PARSE_ERROR" || value === "JSON_PARSE_ERROR") {
    return "PARSE_ERROR";
  }
  if (value === "IMAGE_DECODE_FAILED" || value === "INVALID_IMAGE_BASE64" || value === "UNSUPPORTED_IMAGE_FORMAT" || value === "INVALID_IMAGE") {
    return "INVALID_IMAGE";
  }
  if (value === "INVALID_PDF") return "INVALID_PDF";
  if (value === "PDF_TOO_LARGE") return "FILE_TOO_LARGE";
  if (value === "PDF_TEXT_EMPTY") return "PDF_TEXT_EMPTY";
  if (value === "INVALID_CSV") return "INVALID_CSV";
  if (value === "INVALID_SPREADSHEET") return "INVALID_SPREADSHEET";
  if (value === "UNSUPPORTED_FILE_TYPE") return "UNSUPPORTED_FILE_TYPE";
  if (value === "TIMEOUT" || value === "REQUEST_TIMEOUT" || value === "ABORTED") {
    return "AI_TIMEOUT";
  }
  if (value === "AI_RATE_LIMIT" || value === "RATE_LIMITED") return "RATE_LIMIT";
  if (value === "INVALID_REQUEST_BODY") return "INVALID_REQUEST";
  if (value === "SERVICE_UNAVAILABLE" || value === "EDGE_FAILED" || value === "AI_UNAVAILABLE") {
    return "AI_UNAVAILABLE";
  }
  if (value) return value;
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 408) return "AI_TIMEOUT";
  if (status === 503 || status === 504) return "AI_UNAVAILABLE";
  return undefined;
}

function classifyEdgeError(message: string, status?: number, code?: string): string {
  const normalizedCode = normalizeEdgeCode(code, status);
  if (normalizedCode === "AUTH_REQUIRED") return "Sessão expirada. Faça login novamente.";
  if (normalizedCode === "AI_TIMEOUT") return "A análise demorou muito. Tente novamente.";
  if (normalizedCode === "RATE_LIMIT") return "Muitas requisições. Aguarde um momento e tente novamente.";
  if (normalizedCode === "NETWORK_ERROR") return "Sem conexão com internet";
  if (normalizedCode === "AI_UNAVAILABLE") return "Não conseguimos analisar no momento. Tente novamente.";
  if (normalizedCode === "INVALID_REQUEST") return "Não foi possível enviar a solicitação. Tente novamente.";
  if (normalizedCode === "INVALID_IMAGE") return "Imagem inválida ou ilegível.";
  if (normalizedCode === "PARSE_ERROR") return "Não conseguimos analisar este rótulo.";
  if (code === "FILE_INVALID") return "Arquivo inválido. Envie uma imagem ou PDF legível.";
  if (code === "INVALID_IMAGE") return "Imagem inválida. Envie uma foto legível do rótulo.";
  if (code === "INVALID_IMAGE_BASE64" || code === "IMAGE_DECODE_FAILED" || code === "UNSUPPORTED_IMAGE_FORMAT") return "Não conseguimos processar esta imagem. Tente outra foto do rótulo.";
  if (code === "INVALID_PDF") return "Não conseguimos ler este PDF. Tente enviar outro arquivo ou uma foto da carta.";
  if (code === "PDF_TEXT_EMPTY") return "Este PDF parece não ter texto legível. Vamos tentar leitura por imagem.";
  if (code === "INVALID_FILE_TYPE") return "Tipo de arquivo inválido. Envie uma imagem ou PDF compatível.";
  if (code === "INVALID_CSV") return "Não conseguimos ler este arquivo CSV. Verifique cabeçalhos e codificação.";
  if (code === "INVALID_SPREADSHEET") return "Não conseguimos ler esta planilha. Verifique o formato e tente novamente.";
  if (code === "UNSUPPORTED_FILE_TYPE") return "Este formato ainda não é suportado. Envie JPG, PNG, PDF ou CSV.";
  if (code === "INVALID_PDF") return "O PDF enviado não pôde ser lido. Tente outro arquivo.";
  if (code === "FILE_TOO_LARGE" || code === "IMAGE_TOO_LARGE") return "A imagem está muito grande. Tente uma foto mais leve.";
  if (code === "PDF_PARSE_FAILED") return "Não foi possível ler o PDF. Tente uma versão mais nítida ou uma imagem da carta.";
  if (code === "OCR_FAILED") return "Não foi possível aplicar OCR neste arquivo. Tente novamente com outra foto ou PDF.";
  if (code === "OCR_LOW_CONFIDENCE" || code === "OCR_EMPTY") return "Não foi possível ler texto suficiente no rótulo. Tente outra foto mais nítida.";
  if (code === "EMPTY_EXTRACTION") return "PDF não contém texto legível. Tente outro arquivo ou uma imagem da carta.";
  if (code === "AI_PARSE_ERROR" || code === "INVALID_AI_RESPONSE" || message.includes("INVALID_AI_RESPONSE") || message.includes("EMPTY_AI_RESPONSE")) {
    return "A resposta da IA veio em um formato inválido. Tente novamente em instantes.";
  }
  if (code === "LABEL_NOT_IDENTIFIED") return "Não foi possível identificar esse rótulo com segurança. Tente outra foto ou cadastre manualmente.";
  if (normalizedCode === "NETWORK_ERROR" || isTransportErrorMessage(message)) {
    return "Sem conexão com internet";
  }
  if (normalizedCode === "AI_TIMEOUT" || isAbortErrorMessage(message)) return "A análise demorou muito. Tente novamente.";
  if (isSdkRelayError(message)) return "A solicitação não pôde ser enviada. Tente novamente.";
  if (message.toLowerCase().includes("tempo limite")) return "Tempo excedido. Tente novamente em instantes.";
  if (status === 429) return "Muitas requisições. Aguarde um momento e tente novamente.";
  if (status === 402) return "Limite de uso atingido. Tente novamente mais tarde.";
  if (status === 503 || status === 504) return "O serviço está temporariamente indisponível. Tente novamente em instantes.";
  return message || "Não foi possível completar a solicitação.";
}

function toErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Falha ao executar a ação. Tente novamente.";
}

function isEdgeEnvelopeSuccess<T>(value: unknown): value is EdgeEnvelopeSuccess<T> {
  return Boolean(value) && typeof value === "object" && (value as Record<string, unknown>).success === true && "data" in (value as Record<string, unknown>);
}

function isEdgeEnvelopeError(value: unknown): value is EdgeEnvelopeError {
  return Boolean(value) && typeof value === "object" && (value as Record<string, unknown>).success === false;
}

function unwrapResponseData<T>(data: unknown): T {
  if (isEdgeEnvelopeSuccess<T>(data)) {
    return data.data;
  }
  return data as T;
}

function shouldCacheEdgeResponse(name: string, value: unknown) {
  if (name === "scan-wine-label") return false;
  if (!value || typeof value !== "object") return true;
  const record = value as Record<string, unknown>;
  if (record.fallback === true) return false;
  return true;
}

function parseErrorBody(body: any, fallbackStatus?: number) {
  const status = typeof body?.status === "number" ? body.status : fallbackStatus;
  const code = normalizeEdgeCode(body?.code ? String(body.code) : undefined, status);
  const requestId = body?.requestId ? String(body.requestId) : body?.request_id ? String(body.request_id) : undefined;
  const debugId = body?.debug_id ? String(body.debug_id) : body?.debugId ? String(body.debugId) : requestId;
  const retryable = typeof body?.retryable === "boolean" ? body.retryable : undefined;
  const rawMessage = typeof body?.message === "string"
    ? body.message
    : typeof body?.error === "string"
      ? body.error
      : "Não foi possível completar a solicitação.";

  return {
    status,
    code,
    requestId,
    debugId,
    retryable,
    rawBody: body,
    rawMessage,
    message: classifyEdgeError(rawMessage, status, code),
  };
}

async function resolveSession(forceRefresh = false) {
  if (forceRefresh) {
    try {
      await supabase.auth.refreshSession();
    } catch (error) {
      console.warn("[edge-invoke] refresh failed", error);
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

function parseTextResponse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function sanitizeForLog(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (trimmed.startsWith("data:")) {
      const [prefix, data = ""] = trimmed.split(",", 2);
      return `${prefix},[base64:${data.length}]`;
    }
    if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 120) {
      return `[base64:${trimmed.length}]`;
    }
    if (trimmed.length > 300) {
      return `${trimmed.slice(0, 300)}… [len=${trimmed.length}]`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => sanitizeForLog(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, sanitizeForLog(nested)]),
    );
  }

  return value;
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  { timeoutMs = 45_000, retries = 1, retryOnAbort = true, requestId: providedRequestId, metadata }: InvokeOptions = {},
): Promise<T> {
  const requestId = providedRequestId || crypto.randomUUID();
  const startedAt = Date.now();
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const cacheKey = getCacheKey(name, body);
  const endDebugGroup = aiDebugGroup(`[AI_EDGE] ${name} ${requestId}`, {
    event: "start",
    function: name,
    requestId,
    timeoutMs,
    retries,
    retryOnAbort,
    attachmentType: metadata?.attachmentType,
    ocrLength: metadata?.ocrLength,
    model: metadata?.model,
    flow: metadata?.flow,
  });
  if (name !== "scan-wine-label") {
    const cached = readEdgeCache<T>(cacheKey);
    if (cached !== null) {
      console.log("[edge-invoke] cache_hit", {
        function: name,
        requestId,
        durationMs: 0,
      });
      aiDebugLog("cache_hit", { function: name, requestId, latencyMs: 0 });
      endDebugGroup();
      return cached;
    }
  }

  try {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      let session = await resolveSession(attempt > 0);
      const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${name}`;
      aiDebugLog("request_attempt", {
        function: name,
        requestId,
        attempt,
        hasAuthToken: Boolean(session?.access_token),
        timeoutMs,
        retryOnAbort,
      });
      console.info("[EDGE_AUTH_STATE]", {
        function: name,
        requestId,
        attempt,
        hasAuthToken: Boolean(session?.access_token),
      });

      if (!session?.access_token) {
        console.warn("[EDGE_AUTH_MISSING]", { function: name, requestId, attempt, action: "refresh_session" });
        session = await resolveSession(true);
      }

      if (!session?.access_token) {
        console.warn("[EDGE_AUTH_MISSING]", { function: name, requestId, attempt, action: "fail" });
        throw new EdgeFunctionError("Sua sessão expirou. Faça login novamente.", {
          status: 401,
          code: "AUTH_REQUIRED",
          requestId,
          debugId: requestId,
          retryable: false,
          functionName: name,
        });
      }

      if (import.meta.env.DEV) {
        console.log("[EDGE_REQUEST_START]", {
          function: name,
          url,
          requestId,
          attempt,
          payload: sanitizeForLog(body),
          hasAuthToken: Boolean(session.access_token),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token ? "[present]" : "[missing]"}`,
          },
        });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            "X-Client-Request-Id": requestId,
          },
          body: JSON.stringify({
            ...body,
            clientRequestId: requestId,
          }),
          signal: controller.signal,
        });
        if (import.meta.env.DEV) {
          console.log("[EDGE_RESPONSE_STATUS]", {
            function: name,
            requestId,
            status: response.status,
          });
        }

        const text = await response.text();
        const parsedBody = parseTextResponse(text);
        if (import.meta.env.DEV) {
          console.log("[EDGE_RESPONSE_BODY]", {
            function: name,
            requestId,
            status: response.status,
            body: sanitizeForLog(parsedBody),
          });
        }

        if (!response.ok) {
          if (import.meta.env.DEV) {
            console.error("[EDGE_RESPONSE_ERROR]", {
              function: name,
              requestId,
              status: response.status,
              body: sanitizeForLog(parsedBody),
            });
          }
          const parsed = parseErrorBody(parsedBody, response.status);

          throw new EdgeFunctionError(parsed.message, {
            status: parsed.status ?? response.status,
            code: parsed.code ?? (response.status === 401 ? "AUTH_INVALID" : "EDGE_FAILED"),
            requestId: parsed.requestId,
            debugId: parsed.debugId,
            retryable: parsed.retryable ?? isRetriable(response.status),
            rawBody: parsed.rawBody ?? parsedBody,
            functionName: name,
          });
        }

        if (isEdgeEnvelopeError(parsedBody)) {
          const parsed = parseErrorBody(parsedBody);
          throw new EdgeFunctionError(parsed.message, {
            status: parsed.status,
            code: parsed.code,
            requestId: parsed.requestId,
            debugId: parsed.debugId,
            retryable: parsed.retryable,
            rawBody: parsed.rawBody ?? parsedBody,
            functionName: name,
          });
        }

        const unwrapped = unwrapResponseData<T>(parsedBody);
        if (shouldCacheEdgeResponse(name, unwrapped)) {
          writeEdgeCache(cacheKey, unwrapped);
        } else if (import.meta.env.DEV) {
          console.log("[edge-invoke] cache_skip", {
            function: name,
            requestId,
            reason: name === "scan-wine-label" ? "label_scan_not_cached" : "fallback_response_not_cached",
          });
        }
        if (import.meta.env.DEV) {
          console.log("[EDGE_REQUEST_SUCCESS]", {
            function: name,
            requestId,
            durationMs: Date.now() - startedAt,
            wrapped: isEdgeEnvelopeSuccess<T>(parsedBody),
          });
        }
        aiDebugLog("request_success", {
          function: name,
          requestId,
          attempt,
          latencyMs: Date.now() - startedAt,
          status: response.status,
        });
        return unwrapped;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "";
      // Do NOT retry transport errors (Failed to fetch / abort) for long-running calls:
      // the request likely already reached the function and is processing server-side.
      // Retrying duplicates expensive AI work and stacks load.
      const isTransportFailure = isTransportErrorMessage(rawMessage) || isAbortErrorMessage(rawMessage);
      const isAbort = isAbortErrorMessage(rawMessage);
      const isLongRunning = timeoutMs >= 60_000;
      const retryable =
        err instanceof EdgeFunctionError
          ? (err.code === "AUTH_REQUIRED" || err.code === "AUTH_INVALID")
            ? false
            : (err.retryable ?? isRetriable(err.status))
          : isAbort
            ? retryOnAbort && (isLongRunning ? false : true)
            : (isTransportFailure && isLongRunning)
            ? false
            : rawMessage.includes("demorou") || isTransportFailure || isSdkRelayError(rawMessage);

      console.warn("[EDGE_REQUEST_FAILURE_CLASSIFIED]", {
        function: name,
        requestId,
        attempt,
        message: rawMessage,
        isTransportFailure,
        isAbort,
        isLongRunning,
        retryable,
        code: err instanceof EdgeFunctionError ? err.code : undefined,
        status: err instanceof EdgeFunctionError ? err.status : undefined,
      });

      if (attempt < retries && retryable) {
        console.warn("[EDGE_REQUEST_RETRY]", {
          function: name,
          requestId,
          attempt,
          retryable,
          message: rawMessage,
        });
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }

      console.error("[EDGE_REQUEST_FAILED]", {
        function: name,
        requestId,
        durationMs: Date.now() - startedAt,
        code: err instanceof EdgeFunctionError ? err.code : undefined,
        status: err instanceof EdgeFunctionError ? err.status : undefined,
        rawBody: err instanceof EdgeFunctionError ? sanitizeForLog(err.rawBody) : undefined,
        message: rawMessage || toErrorMessage(err),
      });
      aiDebugLog("request_failure", {
        function: name,
        requestId,
        attempt,
        latencyMs: Date.now() - startedAt,
        code: err instanceof EdgeFunctionError ? err.code : undefined,
        status: err instanceof EdgeFunctionError ? err.status : undefined,
        retryable,
        message: rawMessage || toErrorMessage(err),
      });
      if (err instanceof EdgeFunctionError) throw err;
      const abortFailure = isAbortErrorMessage(rawMessage);
      const isTransport = isTransportErrorMessage(rawMessage) || isSdkRelayError(rawMessage);
      throw new EdgeFunctionError(classifyEdgeError(toErrorMessage(err)), {
        status: abortFailure ? 408 : undefined,
        code: abortFailure ? "AI_TIMEOUT" : isTransport ? "NETWORK_ERROR" : "AI_UNAVAILABLE",
        retryable: abortFailure ? retryOnAbort : isTransport,
        rawBody: rawMessage || toErrorMessage(err),
        functionName: name,
        requestId,
        debugId: requestId,
      });
    }
  }

  throw new EdgeFunctionError("Não foi possível completar a solicitação.");
  } finally {
    aiDebugLog("request_finally", {
      function: name,
      requestId,
      latencyMs: Date.now() - startedAt,
    });
    endDebugGroup();
  }
}
