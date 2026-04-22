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

  console.log("RAW OPENAI RESPONSE:", JSON.stringify(json));

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
  model,
  timeoutMs = 60_000,
  temperature = 0.2,
  instructions,
  input,
  schema,
  maxOutputTokens = 800,
}: CallOptions<Record<string, unknown>>): Promise<{ ok: true; parsed: T; raw: any } | { ok: false; status: number; error: string; raw?: any }> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim() || "";
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

    const json = await response.json();
    console.log("RAW OPENAI RESPONSE:", JSON.stringify(json));

    if (!response.ok) {
      const message = typeof json?.error?.message === "string"
        ? json.error.message
        : typeof json?.error === "string"
          ? json.error
          : `OpenAI request failed with status ${response.status}`;
      console.log(`[${functionName}] request_id=${requestId} model=${resolvedModel} status=${response.status} duration_ms=${Date.now() - startedAt} error=${String(message).slice(0, 300)}`);
      return { ok: false, status: response.status, error: String(message), raw: json };
    }

    const text =
      json.output?.[0]?.content?.[0]?.text ||
      json.output_text ||
      json.output?.map((o: any) =>
        o.content?.map((c: any) => c.text).join("")
      ).join("") ||
      null;

    if (!text || !text.trim()) {
      console.error("EMPTY AI RESPONSE:", json);
      return { ok: false, status: 422, error: "EMPTY_AI_RESPONSE", raw: json };
    }

    console.log("FINAL TEXT:", text);

    let parsed: T;
    try {
      parsed = JSON.parse(String(text));
    } catch (error) {
      console.error("Failed to parse AI response:", text);
      return { ok: false, status: 422, error: "INVALID_AI_RESPONSE", raw: json };
    }

    const usage = json?.usage || {};
    console.log(`[${functionName}] request_id=${requestId} model=${resolvedModel} status=${response.status} duration_ms=${Date.now() - startedAt} input_tokens=${usage?.input_tokens ?? usage?.prompt_tokens ?? "n/a"} output_tokens=${usage?.output_tokens ?? usage?.completion_tokens ?? "n/a"} parsed=ok`);
    console.log("FINAL RESPONSE:", parsed);
    return { ok: true, parsed, raw: json };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI request failed";
    const isAbort = message.toLowerCase().includes("abort");
    console.log(`[${functionName}] request_id=${requestId} model=${resolvedModel} duration_ms=${Date.now() - startedAt} error=${message}`);
    return { ok: false, status: isAbort ? 504 : 500, error: isAbort ? "TIMEOUT" : message };
  } finally {
    clearTimeout(timeout);
  }
}
