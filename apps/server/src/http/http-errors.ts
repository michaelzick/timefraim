import type { FastifyReply, FastifyRequest } from "fastify";
import { getErrorResponse } from "./api-errors.ts";

export function setRequestIdHeader(reply: FastifyReply, request: FastifyRequest) {
  reply.header("x-request-id", request.id);
  return request.id;
}

export function sendMappedError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
): FastifyReply {
  const { code, message, status } = getErrorResponse(error);
  if (code === "internal_error") {
    request.log.error({ err: error, requestId: request.id }, "Unhandled route error");
  }

  const requestId = setRequestIdHeader(reply, request);
  return reply.status(status).send({ code, message, requestId });
}
