type DebugPayload = Record<string, unknown>;

function sanitize(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("data:")) {
      const [prefix, data = ""] = trimmed.split(",", 2);
      return `${prefix},[base64:${data.length}]`;
    }
    if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 120) {
      return `[base64:${trimmed.length}]`;
    }
    if (trimmed.length > 400) return `${trimmed.slice(0, 400)}... [len=${trimmed.length}]`;
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 12).map(sanitize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, sanitize(nested)]),
    );
  }
  return value;
}

export function aiDebugGroup(label: string, payload?: DebugPayload) {
  if (!import.meta.env.DEV) return () => {};
  console.groupCollapsed(label);
  if (payload) console.info(sanitize(payload));
  return () => console.groupEnd();
}

export function aiDebugLog(event: string, payload?: DebugPayload) {
  if (!import.meta.env.DEV) return;
  console.info(`[AI_DEBUG] ${event}`, sanitize(payload || {}));
}
