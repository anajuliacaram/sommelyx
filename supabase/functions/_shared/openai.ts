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
  apiKey?: string;
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

function previewJson(value: unknown, maxLength = 600) {
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= maxLength) return serialized;
    return `${serialized.slice(0, maxLength)}… [len=${serialized.length}]`;
  } catch {
    return "[unserializable]";
  }
}

function extractTextFromResponsesJson(json: any): string | null {
  return (
    json?.output?.[0]?.content?.[0]?.text ||
    json?.output_text ||
    json?.output?.flatMap?.((item: any) =>
      Array.isArray(item?.content)
        ? item.content.map((content: any) => content?.text).filter(Boolean)
        : []
    )?.join("") ||
    null
  );
}

function extractJsonFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }

  return null;
}

function mapInputToMessages(input: OpenAIMessageInput[]) {
  return input.map((message) => ({
    role: message.role,
    content: message.content.map((part) => {
      if (part.type === "input_text") {
        return { type: "text", text: part.text };
      }
      return { type: "image_url", image_url: { url: part.image_url, detail: part.detail ?? "auto" } };
    }),
  }));
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return { text, json: text ? JSON.parse(text) : null };
  } catch {
    return { text, json: null };
  }
}

async function callOpenAIChatFallback<T>({
  functionName,
  requestId,
  apiKey,
  model,
  timeoutMs,
  temperature,
  instructions,
  input,
  schema,
  maxOutputTokens,
}: CallOptions<Record<string, unknown>>): Promise<{ ok: true; parsed: T; raw: any } | { ok: false; status: number; error: string; raw?: any }> {
  const openaiKey = apiKey?.trim() || Deno.env.get("OPENAI_API_KEY")?.trim() || "";
  if (!openaiKey) {
    return { ok: false, status: 500, error: "OPENAI_API_KEY ausente." };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model?.trim() || "gpt-4o-mini",
        messages: [
          { role: "system", content: `${instructions}\n\nResponda somente em JSON válido seguindo o schema abaixo:\n${previewJson(schema, 1200)}` },
          ...mapInputToMessages(input),
        ],
        temperature,
        max_tokens: maxOutputTokens,
        response_format: { type: "json_object" },
      }),
    });

    const { text, json } = await readJsonResponse(response);
    if (!response.ok) {
      const message = typeof json?.error?.message === "string"
        ? json.error.message
        : typeof json?.error === "string"
          ? json.error
          : `OpenAI fallback request failed with status ${response.status}`;
      console.log(`[${functionName}] request_id=${requestId} fallback=chat status=${response.status} duration_ms=${Date.now() - startedAt} error=${String(message).slice(0, 300)}`);
      return { ok: false, status: response.status, error: String(message), raw: json ?? text };
    }

    const content = json?.choices?.[0]?.message?.content;
    const parsedText = typeof content === "string" ? content : Array.isArray(content) ? content.map((part: any) => part?.text ?? "").join("") : "";
    const parsed = extractJsonFromText(parsedText);
    if (!parsed) {
      return { ok: false, status: 422, error: "INVALID_AI_RESPONSE", raw: json ?? text };
    }

    console.log(`[${functionName}] request_id=${requestId} fallback=chat status=${response.status} duration_ms=${Date.now() - startedAt} parsed=ok`);
    return { ok: true, parsed: parsed as T, raw: json };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI fallback request failed";
    const isAbort = message.toLowerCase().includes("abort");
    console.log(`[${functionName}] request_id=${requestId} fallback=chat duration_ms=${Date.now() - startedAt} error=${message}`);
    return { ok: false, status: isAbort ? 504 : 500, error: isAbort ? "TIMEOUT" : message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOpenAI(prompt: string) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: prompt,
    }),
  });

  const json = await res.json();

  const text = json.output?.[0]?.content?.[0]?.text;

  if (!text) {
    throw new Error("Empty AI response");
  }

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (err) {
    console.error("PARSE ERROR:", text);
    throw new Error("Invalid AI JSON format");
  }
}

export async function callOpenAIResponses<T>({
  functionName,
  requestId,
  apiKey,
  model,
  timeoutMs = 60_000,
  temperature = 0.2,
  instructions,
  input,
  schema,
  maxOutputTokens = 800,
}: CallOptions<Record<string, unknown>>): Promise<{ ok: true; parsed: T; raw: any } | { ok: false; status: number; error: string; raw?: any }> {
  const openaiKey = apiKey?.trim() || Deno.env.get("OPENAI_API_KEY")?.trim() || "";
  const resolvedModel = model?.trim() || "gpt-4o-mini";
  const startedAt = Date.now();

  console.log(`[${functionName}] request_id=${requestId} provider=openai model=${resolvedModel} key=${maskSecret(openaiKey)} timeout_ms=${timeoutMs}`);

  if (!openaiKey) {
    return { ok: false, status: 500, error: "OPENAI_API_KEY ausente." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolvedModel,
        input: [
          { role: "system", content: [{ type: "input_text", text: instructions }] },
          ...input,
        ],
        temperature,
        max_output_tokens: maxOutputTokens,
        text: {
          format: {
            type: "json_schema",
            name: functionName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60) || "respond",
            schema,
            strict: true,
          },
        },
      }),
    });

    const { text, json } = await readJsonResponse(response);

    if (!response.ok) {
      const message = typeof json?.error?.message === "string"
        ? json.error.message
        : typeof json?.error === "string"
          ? json.error
          : `OpenAI request failed with status ${response.status}`;
      console.log(`[${functionName}] request_id=${requestId} model=${resolvedModel} status=${response.status} duration_ms=${Date.now() - startedAt} error=${String(message).slice(0, 300)}`);
      const fallback = await callOpenAIChatFallback<T>({
        functionName,
        requestId,
        model: resolvedModel,
        timeoutMs,
        temperature,
        instructions,
        input,
        schema,
        maxOutputTokens,
      });
      if (fallback.ok) return fallback;
      return { ok: false, status: fallback.status || response.status, error: fallback.error || String(message), raw: fallback.raw ?? json ?? text };
    }

    const extractedText = extractTextFromResponsesJson(json);

    if (!extractedText || !extractedText.trim()) {
      console.error("EMPTY AI RESPONSE:", json);
      const fallback = await callOpenAIChatFallback<T>({
        functionName,
        requestId,
        model: resolvedModel,
        timeoutMs,
        temperature,
        instructions,
        input,
        schema,
        maxOutputTokens,
      });
      if (fallback.ok) return fallback;
      return { ok: false, status: fallback.status || 422, error: fallback.error || "EMPTY_AI_RESPONSE", raw: fallback.raw ?? json };
    }

    let parsed: T;
    try {
      const maybeParsed = extractJsonFromText(String(extractedText));
      if (maybeParsed == null) throw new Error("INVALID_AI_RESPONSE");
      parsed = maybeParsed as T;
    } catch (error) {
      const fallback = await callOpenAIChatFallback<T>({
        functionName,
        requestId,
        model: resolvedModel,
        timeoutMs,
        temperature,
        instructions,
        input,
        schema,
        maxOutputTokens,
      });
      if (fallback.ok) return fallback;
      return { ok: false, status: fallback.status || 422, error: fallback.error || "INVALID_AI_RESPONSE", raw: fallback.raw ?? json };
    }

    const usage = json?.usage || {};
    console.log(`[${functionName}] request_id=${requestId} model=${resolvedModel} status=${response.status} duration_ms=${Date.now() - startedAt} input_tokens=${usage?.input_tokens ?? usage?.prompt_tokens ?? "n/a"} output_tokens=${usage?.output_tokens ?? usage?.completion_tokens ?? "n/a"} parsed=ok`);
    return { ok: true, parsed, raw: json };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI request failed";
    const isAbort = message.toLowerCase().includes("abort");
    console.log(`[${functionName}] request_id=${requestId} model=${resolvedModel} duration_ms=${Date.now() - startedAt} error=${message}`);
    const fallback = await callOpenAIChatFallback<T>({
      functionName,
      requestId,
      model: resolvedModel,
      timeoutMs,
      temperature,
      instructions,
      input,
      schema,
      maxOutputTokens,
    });
    if (fallback.ok) return fallback;
    return { ok: false, status: fallback.status || (isAbort ? 504 : 500), error: fallback.error || (isAbort ? "TIMEOUT" : message), raw: fallback.raw };
  } finally {
    clearTimeout(timeout);
  }
}
