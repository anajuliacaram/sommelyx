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
  const primaryModel = model && !/^gpt-/i.test(model)
    ? model
    : (Deno.env.get("LOVABLE_AI_MODEL")?.trim() || "google/gemini-2.5-flash");

  // Fallback ladder: if primary returns empty parsed output, try a more reliable model
  const fallbackModels = primaryModel === "google/gemini-2.5-pro"
    ? ["google/gemini-2.5-flash"]
    : primaryModel === "google/gemini-2.5-flash"
      ? ["google/gemini-2.5-pro"]
      : ["google/gemini-2.5-flash", "google/gemini-2.5-pro"];
  const modelChain = [primaryModel, ...fallbackModels.filter((m) => m !== primaryModel)];

  console.log(`[${functionName}] request_id=${requestId} provider=lovable models=${modelChain.join("|")} key=${maskSecret(lovableKey)} timeout_ms=${timeoutMs}`);

  if (!lovableKey) {
    return { ok: false, status: 500, error: "LOVABLE_API_KEY ausente. Habilite Lovable AI." };
  }

  const messages = toChatMessages(instructions, input);
  const toolName = functionName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60) || "respond";

  let lastRaw: any = null;
  let lastStatus = 500;
  let lastError = "Lovable AI request failed";

  for (let attempt = 0; attempt < modelChain.length; attempt++) {
    const currentModel = modelChain[attempt];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: currentModel,
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
      lastRaw = raw;

      if (!response.ok) {
        const message = typeof raw?.error?.message === "string"
          ? raw.error.message
          : typeof raw?.error === "string"
            ? raw.error
            : `Lovable AI request failed with status ${response.status}`;
        console.log(`[${functionName}] request_id=${requestId} attempt=${attempt + 1}/${modelChain.length} model=${currentModel} status=${response.status} error=${String(message).slice(0, 300)}`);
        lastStatus = response.status;
        lastError = String(message);
        // 429/402 are user-facing — return immediately, no fallback
        if (response.status === 429 || response.status === 402) {
          return { ok: false, status: response.status, error: lastError, raw };
        }
        // Other upstream errors: try next model
        continue;
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

      if (parsed && typeof parsed === "object") {
        console.log(`[${functionName}] request_id=${requestId} attempt=${attempt + 1}/${modelChain.length} model=${currentModel} status=${response.status} parsed=ok`);
        return { ok: true, parsed: parsed as T, raw };
      }

      console.log(`[${functionName}] request_id=${requestId} attempt=${attempt + 1}/${modelChain.length} model=${currentModel} status=${response.status} parsed=empty — trying fallback`);
      lastStatus = 422;
      lastError = "Lovable AI retornou resposta vazia ou inválida.";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lovable AI request failed";
      const isAbort = message.toLowerCase().includes("abort");
      console.log(`[${functionName}] request_id=${requestId} attempt=${attempt + 1}/${modelChain.length} model=${currentModel} error=${message}`);
      lastStatus = isAbort ? 504 : 500;
      lastError = isAbort ? "TIMEOUT" : message;
      if (isAbort) break; // don't retry on timeout
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false, status: lastStatus, error: lastError, raw: lastRaw };
}
