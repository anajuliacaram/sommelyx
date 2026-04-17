export function getRequiredClientEnv(name: string) {
  const value = import.meta.env[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    console.warn("Missing env:", name);
    return "";
  }

  return value.trim();
}

export function getOptionalClientEnv(name: string) {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
