import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  timeoutMs?: number;
  retries?: number;
};

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
      const invokePromise = supabase.functions.invoke(name, { body });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tempo limite excedido. Tente novamente.")), timeoutMs),
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      // supabase-js wraps non-2xx as `error`
      if (error) {
        const status = typeof (error as any)?.status === "number" ? (error as any).status : undefined;
        // Try to extract the real error message from the response context
        let message = "Não foi possível completar a solicitação.";
        try {
          if (typeof (error as any)?.context?.json === "function") {
            const body = await (error as any).context.json();
            if (body?.error) message = String(body.error);
          } else if (error.message && !error.message.includes("non-2xx")) {
            message = error.message;
          }
        } catch { /* ignore parse errors */ }

        if (attempt < retries && isRetriable(status)) {
          const backoff = 600 * Math.pow(2, attempt);
          attempt++;
          await sleep(backoff);
          continue;
        }
        throw new Error(message);
      }

      if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
        const msg = String((data as Record<string, unknown>).error || "");
        if (msg) throw new Error(msg);
      }

      return data as T;
    } catch (err) {
      if (attempt < retries) {
        const backoff = 600 * Math.pow(2, attempt);
        attempt++;
        await sleep(backoff);
        continue;
      }
      throw new Error(toErrorMessage(err));
    }
  }
}

