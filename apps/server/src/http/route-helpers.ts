import { dayQuerySchema } from "@timefraim/shared";
import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import type { ZodType } from "zod";
import { requireAuthenticatedUser, type AuthenticatedUser } from "./auth.js";
import { sendApiError, sendMappedError, setRequestIdHeader } from "./http-errors.js";
import { todayIsoDate } from "../utils/date.js";

type AuthenticatedHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  user: AuthenticatedUser,
) => unknown;

export function withAuthenticatedRoute(handler: AuthenticatedHandler): RouteHandlerMethod {
  return async (request, reply) => {
    setRequestIdHeader(reply, request);

    let user: AuthenticatedUser;
    try {
      user = await requireAuthenticatedUser(request.headers.authorization);
    } catch (error) {
      return sendMappedError(request, reply, error);
    }

    try {
      return await handler(request, reply, user);
    } catch (error) {
      return sendMappedError(request, reply, error);
    }
  };
}

export function parseDayQuery(query: unknown) {
  const result = dayQuerySchema.safeParse(query);
  return {
    date: result.success ? result.data.date : todayIsoDate(),
    tz: result.success ? (result.data.tz ?? 0) : 0,
  };
}

export function parseWithReply<T>(reply: FastifyReply, schema: ZodType<T>, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) {
    void sendApiError(reply, {
      code: "invalid_input",
      message: result.error.issues[0]?.message ?? "Invalid request",
    });
    return null;
  }

  return result.data;
}
