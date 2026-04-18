export type OpenAIImageInput = {
  type: "input_image";
  image_url: string;
  detail?: "high" | "low" | "auto";
};

export type OpenAITextInput = {
  type: "input_text";
  text: string;
};

export type OpenAIMessageInput = {
  role: "system" | "developer" | "user";
  content: Array<OpenAITextInput | OpenAIImageInput>;
};

type CallOptions<TSchema extends Record<string, unknown>> = {
  functionName: string;
  requestId: string;
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  temperature?: number;
  instructions: string;
  input: OpenAIMessageInput[];
  schema: TSchema;
  maxOutputTokens?: number;
};

export function maskSecret(value?: string | null) {
  if (!value) return "missing";
  const trimmed = value.trim();
  if (trimmed.length <= 6) return `${trimmed.slice(0, 2)}…`;
  return `${trimmed.slice(0, 6)}…`;
}

function extractOutputText(raw: any): string {
  if (!raw) return "";
  if (typeof raw.output_text === "string" && raw.output_text.trim()) return raw.output_text.trim();

  const parts: string[] = [];
  const output = Array.isArray(raw.output) ? raw.output : [];
  for (const item of output) {
    if (!item || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (!content) continue;
      if (typeof content.text === "string" && content.text.trim()) parts.push(content.text.trim());
      if (typeof content.output_text === "string" && content.output_text.trim()) parts.push(content.output_text.trim());
    }
  }
  return parts.join("\n").trim();
}

function parseJsonLoose(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function callOpenAIResponses<T>({
  functionName,
  requestId,
  apiKey,
  model = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini",
  timeoutMs = 60_000,
  temperature = 0.2,
  instructions,
  input,
  schema,
  maxOutputTokens = 4_000,
}: CallOptions<Record<string, unknown>>): Promise<{ ok: true; parsed: T; raw: any } | { ok: false; status: number; error: string; raw?: any }> {
  console.log("AI request:", {
    functionName,
    requestId,
    provider: "openai",
    model,
    inputMessages: input.length,
    timeoutMs,
  });
  console.log(`[${functionName}] request_id=${requestId} provider=openai model=${model} openai_key=${maskSecret(apiKey)} timeout_ms=${timeoutMs}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        temperature,
        max_output_tokens: maxOutputTokens,
        text: {
          format: {
            type: "json_schema",
            name: functionName,
            strict: true,
            schema,
          },
        },
      }),
    });

    const raw = await response.json().catch(async () => ({
      error: await response.text().catch(() => ""),
    }));

    if (!response.ok) {
      const message = typeof raw?.error?.message === "string"
        ? raw.error.message
        : typeof raw?.error === "string"
          ? raw.error
          : `OpenAI request failed with status ${response.status}`;
      console.log(`[${functionName}] request_id=${requestId} provider=openai status=${response.status} error=${String(message).slice(0, 300)}`);
      return { ok: false, status: response.status, error: String(message), raw };
    }

    const text = extractOutputText(raw);
    const parsed = parseJsonLoose(text);

    console.log("AI response:", {
      functionName,
      requestId,
      provider: "openai",
      status: response.status,
      outputPreview: text ? text.slice(0, 260) : null,
    });
    console.log({
      function: functionName,
      requestId,
      provider: "openai",
      response_status: response.status,
      output_preview: text ? text.slice(0, 260) : null,
      parsed,
      error: parsed ? null : "no_structured_output",
    });

    if (!parsed || typeof parsed !== "object") {
      return {
        ok: false,
        status: 422,
        error: "OpenAI returned an empty or invalid structured response.",
        raw,
      };
    }

    return { ok: true, parsed: parsed as T, raw };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI request failed";
    const isAbort = message.toLowerCase().includes("abort");
    console.log(`[${functionName}] request_id=${requestId} provider=openai error=${message}`);
    return {
      ok: false,
      status: isAbort ? 504 : 500,
      error: isAbort ? "TIMEOUT" : message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
