export const AUTH_ERROR_CODES = {
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_CONSUMED: "AUTH_TOKEN_CONSUMED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_RATE_LIMITED: "AUTH_RATE_LIMITED",
  AUTH_INVITE_EMAIL_MISMATCH: "AUTH_INVITE_EMAIL_MISMATCH",
  AUTH_INVITE_INVALID: "AUTH_INVITE_INVALID",
  AUTH_CALLBACK_REJECTED: "AUTH_CALLBACK_REJECTED",
  AUTH_ACTIVE_ORG_INVALID: "AUTH_ACTIVE_ORG_INVALID",
  AUTH_FAILURE_TRANSIENT: "AUTH_FAILURE_TRANSIENT",
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export type NormalizedAuthError = {
  code: AuthErrorCode;
  userMessage: string;
  retryable: boolean;
  correlationId?: string;
  rawMessage?: string;
};

const AUTH_ERROR_META: Record<AuthErrorCode, { retryable: boolean; userMessage: string }> = {
  AUTH_TOKEN_EXPIRED: {
    retryable: true,
    userMessage: "This sign-in link expired. Request a new link and try again.",
  },
  AUTH_TOKEN_CONSUMED: {
    retryable: true,
    userMessage: "This sign-in link was already used. Request a new one.",
  },
  AUTH_TOKEN_INVALID: {
    retryable: true,
    userMessage: "This sign-in link is invalid. Request a new link and try again.",
  },
  AUTH_RATE_LIMITED: {
    retryable: true,
    userMessage: "Too many sign-in attempts. Please wait a moment and retry.",
  },
  AUTH_INVITE_EMAIL_MISMATCH: {
    retryable: false,
    userMessage: "This invitation is for a different email address.",
  },
  AUTH_INVITE_INVALID: {
    retryable: false,
    userMessage: "This invitation is invalid or expired.",
  },
  AUTH_CALLBACK_REJECTED: {
    retryable: false,
    userMessage: "This sign-in redirect was rejected for security reasons.",
  },
  AUTH_ACTIVE_ORG_INVALID: {
    retryable: true,
    userMessage: "Your organization context was stale and has been recovered.",
  },
  AUTH_FAILURE_TRANSIENT: {
    retryable: true,
    userMessage: "Authentication is temporarily unavailable. Please retry.",
  },
};

const FALLBACK_ERROR = AUTH_ERROR_CODES.AUTH_FAILURE_TRANSIENT;

const normalizeExternalCode = (rawCode: string | undefined | null): AuthErrorCode | undefined => {
  if (!rawCode) return undefined;
  const normalized = rawCode.toUpperCase();

  switch (normalized) {
    case "AUTH_TOKEN_EXPIRED":
    case "EXPIRED_TOKEN":
      return AUTH_ERROR_CODES.AUTH_TOKEN_EXPIRED;
    case "AUTH_TOKEN_CONSUMED":
      return AUTH_ERROR_CODES.AUTH_TOKEN_CONSUMED;
    case "AUTH_TOKEN_INVALID":
    case "INVALID_TOKEN":
      return AUTH_ERROR_CODES.AUTH_TOKEN_INVALID;
    case "AUTH_RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return AUTH_ERROR_CODES.AUTH_RATE_LIMITED;
    case "AUTH_INVITE_EMAIL_MISMATCH":
    case "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION":
      return AUTH_ERROR_CODES.AUTH_INVITE_EMAIL_MISMATCH;
    case "AUTH_INVITE_INVALID":
    case "INVITATION_NOT_FOUND":
      return AUTH_ERROR_CODES.AUTH_INVITE_INVALID;
    case "AUTH_CALLBACK_REJECTED":
    case "INVALID_CALLBACK_URL":
      return AUTH_ERROR_CODES.AUTH_CALLBACK_REJECTED;
    case "AUTH_ACTIVE_ORG_INVALID":
      return AUTH_ERROR_CODES.AUTH_ACTIVE_ORG_INVALID;
    case "AUTH_FAILURE_TRANSIENT":
      return AUTH_ERROR_CODES.AUTH_FAILURE_TRANSIENT;
    default:
      return undefined;
  }
};

const mapCodeFromMessage = (message: string | undefined): AuthErrorCode | undefined => {
  if (!message) return undefined;
  const lower = message.toLowerCase();

  if (lower.includes("expired") && lower.includes("token")) return AUTH_ERROR_CODES.AUTH_TOKEN_EXPIRED;
  if (lower.includes("invalid") && lower.includes("token")) return AUTH_ERROR_CODES.AUTH_TOKEN_INVALID;
  if (lower.includes("recipient of the invitation")) return AUTH_ERROR_CODES.AUTH_INVITE_EMAIL_MISMATCH;
  if (lower.includes("invitation") && lower.includes("not found")) return AUTH_ERROR_CODES.AUTH_INVITE_INVALID;
  if (lower.includes("callback") && lower.includes("url")) return AUTH_ERROR_CODES.AUTH_CALLBACK_REJECTED;
  if (lower.includes("too many requests")) return AUTH_ERROR_CODES.AUTH_RATE_LIMITED;
  return undefined;
};

type RawAuthErrorInput = {
  code?: string;
  message?: string;
  userMessage?: string;
  retryable?: boolean;
  correlationId?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

export const normalizeAuthError = (input: unknown): NormalizedAuthError => {
  const raw = (input || {}) as RawAuthErrorInput;
  const rawCode = raw.code || raw.error?.code;
  const rawMessage = raw.userMessage || raw.message || raw.error?.message;

  const code = normalizeExternalCode(rawCode) || mapCodeFromMessage(rawMessage) || FALLBACK_ERROR;
  const meta = AUTH_ERROR_META[code];

  return {
    code,
    userMessage: raw.userMessage || meta.userMessage,
    retryable: raw.retryable ?? meta.retryable,
    correlationId: raw.correlationId,
    rawMessage,
  };
};

export const normalizeAuthErrorFromQuery = (params: URLSearchParams): NormalizedAuthError | null => {
  const queryError = params.get("code") || params.get("error");
  if (!queryError) return null;

  const correlationId = params.get("correlationId") || undefined;
  return normalizeAuthError({
    code: queryError,
    correlationId,
  });
};

