export type NormalizedAppError = {
  code: string;
  userMessage: string;
  retryable: boolean;
  requestId?: string;
  status?: number;
  technicalMessage?: string;
};

export class AppError extends Error {
  code: string;
  userMessage: string;
  retryable: boolean;
  requestId?: string;
  status?: number;

  constructor(
    code: string,
    userMessage: string,
    opts?: { retryable?: boolean; requestId?: string; status?: number; message?: string },
  ) {
    super(opts?.message || userMessage);
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage;
    this.retryable = opts?.retryable ?? false;
    this.requestId = opts?.requestId;
    this.status = opts?.status;
  }
}

type ErrorLike = {
  message?: string;
  code?: string;
  requestId?: string;
  retryable?: boolean;
  status?: number;
};

const TRANSPORT_PATTERNS = [
  "failed to send a request to the edge function",
  "failed to fetch",
  "networkerror",
  "load failed",
  "network request failed",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrorLike(error: unknown): ErrorLike {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as ErrorLike).code,
      requestId: (error as ErrorLike).requestId,
      retryable: (error as ErrorLike).retryable,
      status: (error as ErrorLike).status,
    };
  }

  if (isObject(error)) {
    return {
      message: typeof error.message === "string" ? error.message : undefined,
      code: typeof error.code === "string" ? error.code : undefined,
      requestId: typeof error.requestId === "string" ? error.requestId : undefined,
      retryable: typeof error.retryable === "boolean" ? error.retryable : undefined,
      status: typeof error.status === "number" ? error.status : undefined,
    };
  }

  return {};
}

function isOfflineNow() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isTransportMessage(message: string) {
  const normalized = message.toLowerCase();
  return TRANSPORT_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function hasTimeoutMessage(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("tempo limite") || normalized.includes("timed out") || normalized.includes("abort");
}

function mapCodeToMessage(code?: string, fallback?: string) {
  switch (code) {
    case "AUTH_REQUIRED":
    case "AUTH_INVALID":
      return "Sua sessão expirou. Entre novamente para continuar.";
    case "FILE_MISSING":
    case "MISSING_IMAGE":
    case "INVALID_FILE":
    case "INVALID_FILE_TYPE":
      return "Não conseguimos ler esse arquivo. Tente outra imagem ou PDF mais nítido.";
    case "FILE_TOO_LARGE":
    case "IMAGE_TOO_LARGE":
      return "Esse arquivo é grande demais. Envie uma versão menor.";
    case "PARSE_ERROR":
    case "INVALID_REQUEST":
    case "INVALID_JSON":
      return "Não foi possível interpretar esse arquivo. Revise o conteúdo e tente novamente.";
    case "TIMEOUT":
    case "AI_TIMEOUT":
      return "A análise demorou mais do que o esperado. Tente novamente.";
    case "RATE_LIMIT":
    case "RATE_LIMITED":
    case "AI_RATE_LIMIT":
      return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
    case "EMPTY_RESULT":
    case "LABEL_NOT_IDENTIFIED":
    case "NO_WINES_FOUND":
      return "Não foi possível identificar dados suficientes nesse arquivo ou imagem.";
    case "UPSTREAM_ERROR":
    case "AI_UNAVAILABLE":
    case "AI_INVALID_RESPONSE":
    case "CONFIG_ERROR":
    case "INTERNAL_ERROR":
    case "SERVICE_UNAVAILABLE":
      return "O serviço está temporariamente indisponível. Tente novamente em instantes.";
    default:
      return fallback || "Não foi possível concluir a ação agora. Tente novamente.";
  }
}

export function normalizeAppError(error: unknown): NormalizedAppError {
  const { message, code, requestId, retryable, status } = readErrorLike(error);

  if (code) {
    return {
      code,
      userMessage: (error instanceof AppError && error.userMessage) ? error.userMessage : mapCodeToMessage(code, message),
      retryable: retryable ?? ["TIMEOUT", "AI_TIMEOUT", "AI_UNAVAILABLE", "AI_INVALID_RESPONSE", "RATE_LIMIT", "RATE_LIMITED", "AI_RATE_LIMIT", "UPSTREAM_ERROR", "SERVICE_UNAVAILABLE"].includes(code),
      requestId,
      status,
      technicalMessage: message,
    };
  }

  if (message && hasTimeoutMessage(message)) {
    return {
      code: "TIMEOUT",
      userMessage: mapCodeToMessage("TIMEOUT"),
      retryable: true,
      requestId,
      status,
      technicalMessage: message,
    };
  }

  if (message && isTransportMessage(message)) {
    return {
      code: isOfflineNow() ? "OFFLINE" : "SERVICE_UNAVAILABLE",
      userMessage: isOfflineNow()
        ? "Sem conexão. Verifique sua internet e tente novamente."
        : "O serviço não respondeu como esperado. Tente novamente em instantes.",
      retryable: true,
      requestId,
      status,
      technicalMessage: message,
    };
  }

  if (status === 401) {
    return {
      code: "AUTH_REQUIRED",
      userMessage: mapCodeToMessage("AUTH_REQUIRED"),
      retryable: false,
      requestId,
      status,
      technicalMessage: message,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    userMessage: mapCodeToMessage("INTERNAL_ERROR", message),
    retryable: retryable ?? false,
    requestId,
    status,
    technicalMessage: message,
  };
}
