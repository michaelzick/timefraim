import type { MiddlewareHandler } from "hono";
import { env } from "../../../apps/server/src/config/env.ts";
import { createOriginPolicy, isLocalSupabaseUrl } from "../../../apps/server/src/http/cors-policy.ts";
import { createCorsHeaders, type OriginPolicy } from "./cors-headers.ts";

// Same allowlist semantics as the Fastify server: APP_ORIGIN plus http
// localhost origins whenever the function runs against a local Supabase stack.
export function withCors(
  isAllowedOrigin: OriginPolicy = createOriginPolicy({
    allowedOrigins: env.APP_ORIGIN,
    allowLocalOrigins: isLocalSupabaseUrl(env.SUPABASE_URL),
  }),
): MiddlewareHandler {
  return async (c, next) => {
    const headers = createCorsHeaders(c.req.header("origin"), isAllowedOrigin);
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204, headers);
    }

    await next();
    for (const [name, value] of Object.entries(headers)) {
      c.header(name, value);
    }
  };
}
