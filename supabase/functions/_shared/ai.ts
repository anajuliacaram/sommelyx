export function stripMarkdownJsonFences(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function extractJSON<T = unknown>(raw: string): T {
  const cleaned = stripMarkdownJsonFences(raw);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");
    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1)) as T;
    }

    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1)) as T;
    }

    throw new Error("INVALID_AI_JSON");
  }
}
