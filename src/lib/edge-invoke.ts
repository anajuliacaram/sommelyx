import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  timeoutMs?: number;
  retries?: number;
  accessToken?: string | null;
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
  return status === 429 || status === 502 || status === 503 || status === 504;
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

function classifyEdgeError(message: string, status?: number): string {
  if (status === 401) return "Sua sessão expirou. Faça login novamente.";
  if (isTransportErrorMessage(message)) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return "Sem conexão. Verifique sua internet.";
    }
    return "O serviço está temporariamente indisponível. Tente novamente em instantes.";
  }
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
      
      // If no token at all, throw auth error immediately
      if (!accessToken) {
        throw new EdgeFunctionError("Sessão expirada. Faça login novamente.", { status: 401, code: "AUTH_REQUIRED", retryable: false });
      }

      console.log("payload", { function: name, body });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      let data: T | null = null;
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
        let message = "Não foi possível completar a solicitação.";
        let code: string | undefined;
        let requestId: string | undefined;
        let retryable: boolean | undefined;

        try {
          if (typeof (error as any)?.context?.json === "function") {
            const body = await (error as any).context.json();
            if (body?.error) message = String(body.error);
            else if (body?.message) message = String(body.message);
            if (body?.code) code = String(body.code);
            if (body?.requestId) requestId = String(body.requestId);
            if (body?.request_id) requestId = String(body.request_id);
            if (typeof body?.retryable === "boolean") retryable = body.retryable;
          } else if ((error as any)?.message && !(error as any).message.includes("non-2xx")) {
            message = (error as any).message;
          }
        } catch { /* ignore parse errors */ }

        // Classify the error for user-friendly message
        message = classifyEdgeError(message, status);

        if (status === 401) {
          code = code || "AUTH_REQUIRED";
          retryable = false;
          if (attempt < retries) {
            forceTokenRefresh = true;
            attempt++;
            await sleep(600 * Math.pow(2, attempt));
            continue;
          }
        }

        if (attempt < retries && (retryable ?? isRetriable(status))) {
          attempt++;
          await sleep(600 * Math.pow(2, attempt));
          continue;
        }

        throw new EdgeFunctionError(message, { status, code, requestId, retryable });
      }

      if (data && typeof data === "object") {
        const rec = data as Record<string, unknown>;
        if (rec.ok === false) {
          const msg = classifyEdgeError(
            String(rec.error || rec.message || ""),
            typeof rec.status === "number" ? (rec.status as number) : undefined,
          );
          throw new EdgeFunctionError(msg, {
            status: typeof rec.status === "number" ? (rec.status as number) : undefined,
            code: rec.code ? String(rec.code) : undefined,
            requestId: rec.requestId ? String(rec.requestId) : undefined,
            retryable: typeof rec.retryable === "boolean" ? (rec.retryable as boolean) : undefined,
          });
        }
        if ("error" in rec && rec.error) {
          throw new EdgeFunctionError(classifyEdgeError(String(rec.error)), {
            code: rec.code ? String(rec.code) : undefined,
            requestId: rec.requestId ? String(rec.requestId) : undefined,
            retryable: typeof rec.retryable === "boolean" ? (rec.retryable as boolean) : undefined,
          });
        }
      }

      console.log("response", { function: name, data });
      return data as T;
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "";
      const retryable =
        err instanceof EdgeFunctionError
          ? (err.retryable ?? isRetriable(err.status))
          : rawMessage.includes("demorou") || isTransportErrorMessage(rawMessage) || isSdkRelayError(rawMessage);

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
