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
  apiKey: string; // legacy/ignored — kept for signature compatibility
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

function parseJsonLoose(text: string) {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  // strip ```json fences if present
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(fenced);
  } catch {
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try { return JSON.parse(fenced.slice(start, end + 1)); } catch { return null; }
    }
    return null;
  }
}

// Map legacy OpenAI Responses input → Chat Completions messages
function toChatMessages(instructions: string, input: OpenAIMessageInput[]) {
  const messages: Array<{ role: string; content: any }> = [
    { role: "system", content: instructions },
  ];
  for (const item of input) {
    const role = item.role === "developer" ? "system" : item.role;
    const parts = (item.content || []).map((c) => {
      if (c.type === "input_text") return { type: "text", text: c.text };
      if (c.type === "input_image") return { type: "image_url", image_url: { url: c.image_url } };
      return null;
    }).filter(Boolean) as any[];
    // If only text, collapse into string for broader model compatibility
    if (parts.length === 1 && parts[0].type === "text") {
      messages.push({ role, content: parts[0].text });
    } else {
      messages.push({ role, content: parts });
    }
  }
  return messages;
}

export async function callOpenAIResponses<T>({
  functionName,
  requestId,
  apiKey: _legacyApiKey,
  model,
  timeoutMs = 60_000,
  temperature = 0.2,
  instructions,
  input,
  schema,
  maxOutputTokens = 4_000,
}: CallOptions<Record<string, unknown>>): Promise<{ ok: true; parsed: T; raw: any } | { ok: false; status: number; error: string; raw?: any }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")?.trim() || "";
  // Default to Gemini Flash (project standard) — overridable via env
  const resolvedModel = model && !/^gpt-/i.test(model)
    ? model
    : (Deno.env.get("LOVABLE_AI_MODEL")?.trim() || "google/gemini-2.5-flash");

  console.log(`[${functionName}] request_id=${requestId} provider=lovable model=${resolvedModel} key=${maskSecret(lovableKey)} timeout_ms=${timeoutMs}`);

  if (!lovableKey) {
    return { ok: false, status: 500, error: "LOVABLE_API_KEY ausente. Habilite Lovable AI." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const messages = toChatMessages(instructions, input);

    // Use tool calling for structured output (more reliable than json_schema across providers)
    const toolName = functionName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60) || "respond";
    const body: Record<string, unknown> = {
      model: resolvedModel,
      messages,
      temperature,
      max_tokens: maxOutputTokens,
      tools: [
        {
          type: "function",
          function: {
            name: toolName,
            description: "Return the structured response",
            parameters: schema,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: toolName } },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));

    if (!response.ok) {
      const message = typeof raw?.error?.message === "string"
        ? raw.error.message
        : typeof raw?.error === "string"
          ? raw.error
          : `Lovable AI request failed with status ${response.status}`;
      console.log(`[${functionName}] request_id=${requestId} provider=lovable status=${response.status} error=${String(message).slice(0, 300)}`);
      // Surface specific upstream codes (rate-limit / payment) explicitly
      const status = response.status === 429 || response.status === 402 ? response.status : response.status;
      return { ok: false, status, error: String(message), raw };
    }

    const choice = raw?.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];
    let parsed: any = null;
    if (toolCall?.function?.arguments) {
      parsed = parseJsonLoose(toolCall.function.arguments);
    }
    if (!parsed) {
      const text = typeof choice?.message?.content === "string" ? choice.message.content : "";
      parsed = parseJsonLoose(text);
    }

    console.log(`[${functionName}] request_id=${requestId} provider=lovable status=${response.status} parsed=${parsed ? "ok" : "empty"}`);

    if (!parsed || typeof parsed !== "object") {
      return { ok: false, status: 422, error: "Lovable AI retornou resposta vazia ou inválida.", raw };
    }

    return { ok: true, parsed: parsed as T, raw };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lovable AI request failed";
    const isAbort = message.toLowerCase().includes("abort");
    console.log(`[${functionName}] request_id=${requestId} provider=lovable error=${message}`);
    return { ok: false, status: isAbort ? 504 : 500, error: isAbort ? "TIMEOUT" : message };
  } finally {
    clearTimeout(timeout);
  }
}
