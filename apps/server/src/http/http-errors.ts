import type { ApiErrorCode } from "@timefraim/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticationError, isAuthorizationError } from "./auth.js";
import { isPlannerError } from "../services/planner-errors.js";

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

type ErrorResponseInput = {
  code: ApiErrorCode;
  message: string;
};

function getErrorResponse(error: unknown): ErrorResponseInput {
  if (isPlannerError(error)) {
    return { code: error.code, message: error.message };
  }

  if (isAuthenticationError(error)) {
    return { code: "unauthenticated", message: error.message };
  }

  if (isAuthorizationError(error)) {
    return { code: "forbidden", message: error.message };
  }

  return {
    code: "internal_error",
    message: "An unexpected server error occurred.",
  };
}

export function setRequestIdHeader(reply: FastifyReply, request: FastifyRequest) {
  reply.header("x-request-id", request.id);
  return request.id;
}

export function sendApiError(
  reply: FastifyReply,
  input: ErrorResponseInput,
): FastifyReply {
  const requestId = setRequestIdHeader(reply, reply.request);
  return reply.status(statusByCode[input.code]).send({
    code: input.code,
    message: input.message,
    requestId,
  });
}

export function sendMappedError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
): FastifyReply {
  const response = getErrorResponse(error);
  if (response.code === "internal_error") {
    request.log.error({ err: error, requestId: request.id }, "Unhandled route error");
  }

  return sendApiError(reply, response);
}
