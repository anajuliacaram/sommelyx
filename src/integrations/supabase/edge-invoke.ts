import { supabase } from "./client";

type InvokeOptions = {
  timeoutMs?: number;
  retries?: number;
};

export class EdgeFunctionError extends Error {
  status?: number;
  code?: string;
  requestId?: string;
  retryable?: boolean;

  constructor(
    message: string,
    opts?: { status?: number; code?: string; requestId?: string; retryable?: boolean },
  ) {
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

function toErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Falha ao executar a ação. Tente novamente.";
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  { timeoutMs = 45_000, retries = 2 }: InvokeOptions = {},
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      // Try getSession first; if missing/expired, attempt a refresh (Safari ITP workaround).
      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !refreshData.session) {
          console.error("[edge-invoke] Sessão expirada. refreshSession falhou:", refreshErr?.message);
          throw new EdgeFunctionError(
            "Sua sessão expirou. Faça login novamente para continuar.",
            { status: 401, code: "SESSION_EXPIRED", retryable: false },
          );
        }
        accessToken = refreshData.session.access_token;
      }

      const invokePromise = supabase.functions.invoke(name, {
        body,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tempo limite excedido. Tente novamente.")), timeoutMs),
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      // supabase-js wraps non-2xx as `error`
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
          } else if (error.message && !error.message.includes("non-2xx")) {
            message = error.message;
          }
        } catch {
          // ignore parse errors
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
      // Retry only when the error is explicitly retryable (or status suggests retry).
      if (attempt < retries) {
        const status =
          err instanceof EdgeFunctionError
            ? err.status
            : typeof (err as any)?.status === "number"
              ? ((err as any).status as number)
              : undefined;
        const retryable =
          err instanceof EdgeFunctionError ? (err.retryable ?? isRetriable(status)) : isRetriable(status);

        if (retryable) {
          const backoff = 600 * Math.pow(2, attempt);
          attempt++;
          await sleep(backoff);
          continue;
        }
      }

      if (err instanceof EdgeFunctionError) throw err;
      throw new Error(toErrorMessage(err));
    }
  }
}
