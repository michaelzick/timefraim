import type { ApiErrorCode } from "@timefraim/shared";
import { isAuthenticationError, isAuthorizationError } from "./auth.ts";
import { isPlannerError } from "../services/planner-errors.ts";

const statusByCode: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  dependency_unavailable: 503,
  timeout: 504,
  internal_error: 500,
};

export type ErrorResponse = {
  code: ApiErrorCode;
  message: string;
  status: number;
};

// Maps thrown errors to the wire shape every adapter sends. Unknown errors
// deliberately collapse to a generic message so internals never leak.
export function getErrorResponse(error: unknown): ErrorResponse {
  if (isPlannerError(error)) {
    return { code: error.code, message: error.message, status: statusByCode[error.code] };
  }

  if (isAuthenticationError(error)) {
    return { code: "unauthenticated", message: error.message, status: statusByCode.unauthenticated };
  }

  if (isAuthorizationError(error)) {
    return { code: "forbidden", message: error.message, status: statusByCode.forbidden };
  }

  return {
    code: "internal_error",
    message: "An unexpected server error occurred.",
    status: statusByCode.internal_error,
  };
}
