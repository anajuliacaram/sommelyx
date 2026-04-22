import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  timeoutMs?: number;
  retries?: number;
  accessToken?: string | null;
};

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
  if (code === "AUTH_REQUIRED" || code === "AUTH_INVALID" || status === 401) return "Sessão expirada. Faça login novamente.";
  if (code === "AI_TIMEOUT" || status === 408) return "Tempo de resposta excedido. Tente novamente.";
  if (code === "FILE_INVALID") return "Arquivo inválido. Envie uma imagem ou PDF legível.";
  if (code === "IMAGE_TOO_LARGE") return "A imagem está muito grande. Tente uma foto mais leve.";
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

async function resolveAccessToken(preferredToken?: string | null, forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && preferredToken) return preferredToken;

  if (!forceRefresh) {
    const { data: { session } } = await supabase.auth.getSession();
    const currentToken = session?.access_token ?? null;
    if (currentToken) return currentToken;
  }

  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  { timeoutMs = 45_000, retries = 2, accessToken: explicitAccessToken }: InvokeOptions = {},
): Promise<T> {
  let attempt = 0;
  let forceTokenRefresh = false;

  while (true) {
    try {
      const accessToken = await resolveAccessToken(explicitAccessToken, forceTokenRefresh);
      if (!accessToken) {
        throw new EdgeFunctionError("Sessão expirada. Faça login novamente.", {
          status: 401,
          code: "AUTH_REQUIRED",
          retryable: false,
        });
      }

      console.log("[edge-invoke] request", {
        function: name,
        payloadKeys: Object.keys(body),
        hasAuthToken: Boolean(accessToken),
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      let data: unknown = null;
      let error: unknown = null;
      try {
        const result = await supabase.functions.invoke(name, {
          body,
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
          timeout: timeoutMs,
        });
        data = result.data;
        error = result.error;
      } finally {
        clearTimeout(timeout);
      }

      if (error) {
        const status = typeof (error as any)?.status === "number" ? (error as any).status : undefined;
        let parsed = parseErrorBody({}, status);

        try {
          if (typeof (error as any)?.context?.json === "function") {
            const errorBody = await (error as any).context.json();
            parsed = parseErrorBody(errorBody, status);
          } else if ((error as any)?.message && !(error as any).message.includes("non-2xx")) {
            parsed = parseErrorBody({ message: (error as any).message }, status);
          }
        } catch {
          // ignore parse errors
        }

        if (parsed.status === 401) {
          if (attempt < retries) {
            forceTokenRefresh = true;
            attempt++;
            await sleep(600 * Math.pow(2, attempt));
            continue;
          }
          parsed.retryable = false;
        }

        if (attempt < retries && (parsed.retryable ?? isRetriable(parsed.status))) {
          attempt++;
          await sleep(600 * Math.pow(2, attempt));
          continue;
        }

        throw new EdgeFunctionError(parsed.message, {
          status: parsed.status,
          code: parsed.code,
          requestId: parsed.requestId,
          retryable: parsed.retryable,
        });
      }

      if (isEdgeEnvelopeError(data)) {
        const parsed = parseErrorBody(data);
        if (parsed.status === 401 && attempt < retries) {
          forceTokenRefresh = true;
          attempt++;
          await sleep(600 * Math.pow(2, attempt));
          continue;
        }
        throw new EdgeFunctionError(parsed.message, {
          status: parsed.status,
          code: parsed.code,
          requestId: parsed.requestId,
          retryable: parsed.retryable,
        });
      }

      const unwrapped = unwrapResponseData<T>(data);
      console.log("[edge-invoke] response", {
        function: name,
        wrapped: isEdgeEnvelopeSuccess<T>(data),
      });
      return unwrapped;
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "";
      const retryable =
        err instanceof EdgeFunctionError
          ? (err.retryable ?? isRetriable(err.status))
          : rawMessage.includes("demorou") || isTransportErrorMessage(rawMessage) || isSdkRelayError(rawMessage) || isAbortErrorMessage(rawMessage);

      if (attempt < retries && retryable) {
        attempt++;
        await sleep(600 * Math.pow(2, attempt));
        continue;
      }

      if (err instanceof EdgeFunctionError) throw err;
      throw new EdgeFunctionError(classifyEdgeError(toErrorMessage(err)));
    }
  }
}
