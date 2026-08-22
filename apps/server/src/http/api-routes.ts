import type { ZodType } from "zod";
import type { AuthenticatedUser } from "./auth.ts";
import { invalidInput } from "../services/planner-errors.ts";
import type { PlannerService } from "../services/planner-service.ts";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestContext = {
  params: Record<string, string | undefined>;
  query: unknown;
  body: unknown;
};

export type AuthenticatedContext = RequestContext & { user: AuthenticatedUser };

type PublicRoute = {
  method: ApiMethod;
  path: string;
  auth: "none";
  handler: (context: RequestContext, service: PlannerService) => unknown;
};

type ProtectedRoute = {
  method: ApiMethod;
  path: string;
  auth?: "user";
  handler: (context: AuthenticatedContext, service: PlannerService) => unknown;
};

// Framework-neutral route table shared by the Fastify server and the Supabase
// edge function. Adapters own transport concerns (bearer auth, request id,
// error mapping); handlers validate input and call the service.
export type ApiRoute = PublicRoute | ProtectedRoute;

export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw invalidInput(result.error.issues[0]?.message ?? "Invalid request");
  }
  return result.data;
}
