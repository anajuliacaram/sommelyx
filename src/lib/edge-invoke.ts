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
    normalized.includes("failed to send a request to the edge function") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed")
  );
}

function humanizeEdgeErrorMessage(message: string) {
  if (isTransportErrorMessage(message)) {
    return "Não foi possível conectar com a inteligência do Sommelyx agora. Verifique sua conexão e tente novamente.";
  }
  return message || "Não foi possível completar a solicitação.";
}

function toErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Falha ao executar a ação. Tente novamente.";
}

async function resolveAccessToken(preferredToken?: string | null, forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && preferredToken) return preferredToken;

  if (!forceRefresh) {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentToken = sessionData.session?.access_token ?? null;
    if (currentToken) return currentToken;
  }

  // Fallback for cases where session is momentarily stale but recoverable.
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
      // Prefer explicit Authorization; fallback to invoke default headers if token is temporarily unavailable.
      const accessToken = await resolveAccessToken(explicitAccessToken, forceTokenRefresh);
      const invokePromise = supabase.functions.invoke(name, accessToken
        ? {
            body,
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        : { body });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tempo limite excedido. Tente novamente.")), timeoutMs),
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      // supabase-js wraps non-2xx as `error`
      if (error) {
        const status = typeof (error as any)?.status === "number" ? (error as any).status : undefined;
        // Try to extract the real error message from the response context
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
          } else if (error.message && !error.message.includes("non-2xx")) {
            message = error.message;
          }
        } catch { /* ignore parse errors */ }

        if (status === 401 && (!message || /unauthorized/i.test(message))) {
          message = "Sua sessão expirou. Faça login novamente para continuar.";
          if (!code) code = "AUTH_REQUIRED";
          retryable = false;
        }

        message = humanizeEdgeErrorMessage(message);

        // If auth failed, force a token refresh and retry before surfacing session-expired to the user.
        if (status === 401 && attempt < retries) {
          forceTokenRefresh = true;
          const backoff = 600 * Math.pow(2, attempt);
          attempt++;
          await sleep(backoff);
          continue;
        }

        if (attempt < retries && (retryable ?? isRetriable(status))) {
          const backoff = 600 * Math.pow(2, attempt);
          attempt++;
          await sleep(backoff);
          continue;
        }
        throw new EdgeFunctionError(message, { status, code, requestId, retryable });
      }

      if (data && typeof data === "object") {
        const rec = data as Record<string, unknown>;
        if (rec.ok === false) {
          const msg = String(rec.error || rec.message || "Não foi possível completar a solicitação.");
          throw new EdgeFunctionError(msg, {
            status: typeof rec.status === "number" ? (rec.status as number) : undefined,
            code: rec.code ? String(rec.code) : undefined,
            requestId: rec.requestId ? String(rec.requestId) : undefined,
            retryable: typeof rec.retryable === "boolean" ? (rec.retryable as boolean) : undefined,
          });
        }
        if ("error" in rec && rec.error) {
          throw new EdgeFunctionError(String(rec.error), {
            code: rec.code ? String(rec.code) : undefined,
            requestId: rec.requestId ? String(rec.requestId) : undefined,
            retryable: typeof rec.retryable === "boolean" ? (rec.retryable as boolean) : undefined,
          });
        }
      }

      return data as T;
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "";
      const retryable =
        err instanceof EdgeFunctionError
          ? (err.retryable ?? isRetriable(err.status))
          : rawMessage.includes("Tempo limite") || isTransportErrorMessage(rawMessage);

      if (attempt < retries && retryable) {
        const backoff = 600 * Math.pow(2, attempt);
        attempt++;
        await sleep(backoff);
        continue;
      }
      // Preserve structured edge errors (requestId/code/retryable) for UX + suporte.
      if (err instanceof EdgeFunctionError) throw err;
      throw new Error(humanizeEdgeErrorMessage(toErrorMessage(err)));
    }
  }
}
