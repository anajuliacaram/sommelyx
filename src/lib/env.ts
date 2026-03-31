const missingEnvMessage = (name: string) =>
  `Missing required environment variable: ${name}. Configure it in your local environment before starting Sommelyx.`;

export function getRequiredClientEnv(name: string) {
  const value = import.meta.env[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(missingEnvMessage(name));
  }

  return value.trim();
}

export function getOptionalClientEnv(name: string) {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
