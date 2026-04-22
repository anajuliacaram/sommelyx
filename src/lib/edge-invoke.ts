import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  timeoutMs?: number;
  retries?: number;
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
  retryable?: boolean;

  constructor(message: string, opts?: { status?: number; code?: string; requestId?: string; retryable?: boolean }) {
    super(message);
    this.name = "EdgeFunctionError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.requestId = opts?.requestId;
    this.retryable = opts?.retryable;
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

function classifyEdgeError(message: string, status?: number, code?: string): string {
  if (code === "AUTH_REQUIRED" || code === "AUTH_INVALID" || status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (code === "AI_TIMEOUT" || status === 408) return "Tempo de resposta excedido. Tente novamente.";
  if (code === "FILE_INVALID") return "Arquivo inválido. Envie uma imagem ou PDF legível.";
  if (code === "IMAGE_TOO_LARGE") return "A imagem está muito grande. Tente uma foto mais leve.";
  if (code === "INVALID_AI_RESPONSE" || message.includes("INVALID_AI_RESPONSE") || message.includes("EMPTY_AI_RESPONSE")) {
    return "A resposta da IA veio em um formato inválido. Tente novamente em instantes.";
  }
  if (code === "LABEL_NOT_IDENTIFIED") return "Não foi possível identificar esse rótulo com segurança. Tente outra foto ou cadastre manualmente.";
  if (isTransportErrorMessage(message)) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "Sem conexão. Verifique sua internet.";
    }
    return "O serviço está temporariamente indisponível. Tente novamente em instantes.";
  }
  if (isAbortErrorMessage(message)) return "Tempo de resposta excedido. Tente novamente.";
  if (isSdkRelayError(message)) return "A solicitação não pôde ser enviada. Tente novamente.";
  if (message.toLowerCase().includes("tempo limite")) return "Demorou mais que o esperado. Tente novamente.";
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

function parseErrorBody(body: any, fallbackStatus?: number) {
  const status = typeof body?.status === "number" ? body.status : fallbackStatus;
  const code = body?.code ? String(body.code) : undefined;
  const requestId = body?.requestId ? String(body.requestId) : body?.request_id ? String(body.request_id) : undefined;
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
    retryable,
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

  const { data } = await supabase.auth.getSession();
  const session = data?.session ?? null;
  console.log("SESSION:", session);
  return session;
}

function parseTextResponse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  { timeoutMs = 45_000, retries = 2 }: InvokeOptions = {},
): Promise<T> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const cacheKey = getCacheKey(name, body);
  const cached = readEdgeCache<T>(cacheKey);
  if (cached !== null) {
    console.log("[edge-invoke] cache_hit", {
      function: name,
      requestId,
      durationMs: 0,
    });
    return cached;
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const session = await resolveSession(attempt > 0);
      console.log("Sending token:", !!session?.access_token);
      console.log(`CALLING ${name} WITH TOKEN:`, !!session?.access_token);

      if (!session?.access_token) {
        console.error("NO TOKEN");
        console.warn("[edge-invoke] auth_missing", { function: name, requestId });
        throw new EdgeFunctionError("Sua sessão expirou. Faça login novamente.", {
          status: 401,
          code: "AUTH_REQUIRED",
          retryable: false,
        });
      }

      console.log("[edge-invoke] request", {
        function: name,
        requestId,
        attempt,
        payloadKeys: Object.keys(body),
        hasAuthToken: Boolean(session.access_token),
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${name}`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        console.log("EDGE STATUS:", response.status);

        const text = await response.text();
        const parsedBody = parseTextResponse(text);

        if (!response.ok) {
          console.error("EDGE ERROR:", text);
          const parsed = parseErrorBody(parsedBody, response.status);

          if (response.status === 401 && attempt < retries) {
            continue;
          }

          throw new EdgeFunctionError(parsed.message, {
            status: parsed.status ?? response.status,
            code: parsed.code ?? (response.status === 401 ? "AUTH_INVALID" : "EDGE_FAILED"),
            requestId: parsed.requestId,
            retryable: parsed.retryable ?? isRetriable(response.status),
          });
        }

        if (isEdgeEnvelopeError(parsedBody)) {
          const parsed = parseErrorBody(parsedBody);
          throw new EdgeFunctionError(parsed.message, {
            status: parsed.status,
            code: parsed.code,
            requestId: parsed.requestId,
            retryable: parsed.retryable,
          });
        }

        const unwrapped = unwrapResponseData<T>(parsedBody);
        writeEdgeCache(cacheKey, unwrapped);
        console.log("[edge-invoke] response", {
          function: name,
          requestId,
          durationMs: Date.now() - startedAt,
          wrapped: isEdgeEnvelopeSuccess<T>(parsedBody),
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
      const isLongRunning = timeoutMs >= 60_000;
      const retryable =
        err instanceof EdgeFunctionError
          ? (err.retryable ?? isRetriable(err.status))
          : (isTransportFailure && isLongRunning)
            ? false
            : rawMessage.includes("demorou") || isTransportFailure || isSdkRelayError(rawMessage);

      if (attempt < retries && retryable) {
        console.warn("[edge-invoke] retry", {
          function: name,
          requestId,
          attempt,
          retryable,
          message: rawMessage,
        });
        attempt++;
        await sleep(600 * Math.pow(2, attempt));
        continue;
      }

      console.error("[edge-invoke] failure", {
        function: name,
        requestId,
        durationMs: Date.now() - startedAt,
        message: rawMessage || toErrorMessage(err),
      });
      if (err instanceof EdgeFunctionError) throw err;
      throw new EdgeFunctionError(classifyEdgeError(toErrorMessage(err)));
    }
  }

  throw new EdgeFunctionError("Não foi possível completar a solicitação.");
}
