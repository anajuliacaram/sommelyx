import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class FunctionError extends Error {
  status: number;
  code: string;
  userMessage: string;
  retryable: boolean;
  requestId?: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    userMessage: string,
    opts?: { retryable?: boolean; requestId?: string; message?: string; details?: Record<string, unknown> },
  ) {
    super(opts?.message || userMessage);
    this.name = "FunctionError";
    this.status = status;
    this.code = code;
    this.userMessage = userMessage;
    this.retryable = opts?.retryable ?? false;
    this.requestId = opts?.requestId;
    this.details = opts?.details;
  }
}

function getServiceRoleKey() {
  return Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || null;
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function failResponse(error: FunctionError) {
  return jsonResponse({
    ok: false,
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    retryable: error.retryable,
    requestId: error.requestId,
  }, error.status);
}

export async function logAudit(
  userId: string,
  functionName: string,
  statusCode: number,
  outcome: string,
  durationMs: number,
  metadata?: Record<string, unknown>,
) {
  if (!userId || userId === "anonymous") return;

  try {
    const serviceRole = getServiceRoleKey();
    if (!serviceRole) return;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRole,
    );

    await adminClient.from("edge_function_logs").insert({
      user_id: userId,
      function_name: functionName,
      status_code: statusCode,
      outcome,
      duration_ms: durationMs,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error(`[${functionName}] audit_log_failed`, error instanceof Error ? error.message : "unknown");
  }
}

export async function authenticateRequest(
  req: Request,
  functionName: string,
  requestId: string,
  startedAt: number,
): Promise<{ authHeader: string; token: string; userId: string }> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    await logAudit("anonymous", functionName, 401, "unauthorized", Date.now() - startedAt, {
      request_id: requestId,
      reason: "missing_authorization_header",
    });
    throw new FunctionError(401, "AUTH_REQUIRED", "Sua sessão expirou. Entre novamente para continuar.", {
      requestId,
      retryable: false,
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    await logAudit("anonymous", functionName, 401, "unauthorized", Date.now() - startedAt, {
      request_id: requestId,
      reason: "empty_bearer_token",
    });
    throw new FunctionError(401, "AUTH_REQUIRED", "Sua sessão expirou. Entre novamente para continuar.", {
      requestId,
      retryable: false,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const authKey = Deno.env.get("SUPABASE_ANON_KEY") || getServiceRoleKey();
  if (!supabaseUrl || !authKey) {
    throw new FunctionError(500, "CONFIG_ERROR", "O serviço está temporariamente indisponível. Tente novamente em instantes.", {
      requestId,
      retryable: true,
      message: "Supabase environment is not configured",
    });
  }

  const supabase = createClient(
    supabaseUrl,
    authKey,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    await logAudit("anonymous", functionName, 401, "unauthorized", Date.now() - startedAt, {
      request_id: requestId,
      reason: "invalid_token",
    });
    throw new FunctionError(401, "AUTH_INVALID", "Sua sessão expirou. Entre novamente para continuar.", {
      requestId,
      retryable: false,
    });
  }

  return { authHeader, token, userId: user.id };
}

function mapOpenAiFailure(status: number, requestId: string, bodyText: string) {
  if (status === 400) {
    return new FunctionError(400, "INVALID_REQUEST", "Não foi possível processar esse arquivo. Revise o conteúdo e tente novamente.", {
      requestId,
      retryable: false,
      message: `OpenAI returned 400: ${bodyText}`,
    });
  }

  if (status === 401 || status === 403) {
    return new FunctionError(500, "CONFIG_ERROR", "O serviço está temporariamente indisponível. Tente novamente em instantes.", {
      requestId,
      retryable: true,
      message: `OpenAI auth failed: ${bodyText}`,
    });
  }

  if (status === 408 || status === 504) {
    return new FunctionError(504, "TIMEOUT", "A análise demorou mais do que o esperado. Tente novamente.", {
      requestId,
      retryable: true,
      message: `OpenAI timeout: ${bodyText}`,
    });
  }

  if (status === 413) {
    return new FunctionError(413, "FILE_TOO_LARGE", "Esse arquivo é grande demais. Envie uma versão menor.", {
      requestId,
      retryable: false,
      message: `OpenAI payload too large: ${bodyText}`,
    });
  }

  if (status === 429) {
    return new FunctionError(429, "RATE_LIMIT", "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.", {
      requestId,
      retryable: true,
      message: `OpenAI rate limit: ${bodyText}`,
    });
  }

  return new FunctionError(502, "UPSTREAM_ERROR", "O serviço está temporariamente indisponível. Tente novamente em instantes.", {
    requestId,
    retryable: true,
    message: `OpenAI upstream error ${status}: ${bodyText}`,
  });
}

export async function openAiChatCompletion(
  payload: Record<string, unknown>,
  {
    requestId,
    model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
    timeoutMs = 60_000,
  }: {
    requestId: string;
    model?: string;
    timeoutMs?: number;
  },
) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new FunctionError(500, "CONFIG_ERROR", "O serviço está temporariamente indisponível. Tente novamente em instantes.", {
      requestId,
      retryable: true,
      message: "OPENAI_API_KEY is not configured",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        ...payload,
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw mapOpenAiFailure(response.status, requestId, bodyText.slice(0, 1000));
    }

    return await response.json();
  } catch (error) {
    if (error instanceof FunctionError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FunctionError(504, "TIMEOUT", "A análise demorou mais do que o esperado. Tente novamente.", {
        requestId,
        retryable: true,
      });
    }
    throw new FunctionError(502, "UPSTREAM_ERROR", "O serviço está temporariamente indisponível. Tente novamente em instantes.", {
      requestId,
      retryable: true,
      message: error instanceof Error ? error.message : "Unknown upstream error",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function extractToolArguments(aiData: any) {
  const toolCallArgs = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (typeof toolCallArgs === "string" && toolCallArgs.trim()) {
    return JSON.parse(toolCallArgs);
  }

  const content = aiData?.choices?.[0]?.message?.content || "";
  const jsonStart = content.indexOf("{");
  const jsonEnd = content.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    return JSON.parse(content.slice(jsonStart, jsonEnd + 1));
  }

  if (typeof content === "string" && content.trim()) {
    return JSON.parse(content);
  }

  return null;
}
