import { dayQuerySchema } from "@timefraim/shared";
import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import type { ZodType } from "zod";
import { requireAuthenticatedUser, type AuthenticatedUser } from "./auth.js";
import { todayIsoDate } from "../utils/date.js";

type AuthenticatedHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  user: AuthenticatedUser,
) => unknown;

export function withAuthenticatedRoute(handler: AuthenticatedHandler): RouteHandlerMethod {
  return async (request, reply) => {
    let user: AuthenticatedUser;
    try {
      user = await requireAuthenticatedUser(request.headers.authorization);
    } catch (error) {
      reply.status(401).send({ message: (error as Error).message });
      return null;
    }

    return handler(request, reply, user);
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
    reply.status(400).send({ message: result.error.issues[0]?.message ?? "Invalid request" });
    return null;
  }

  return result.data;
}
