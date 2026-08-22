const ALLOWED_METHODS = "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "authorization, content-type, apikey, x-client-info, mcp-session-id, mcp-protocol-version";
const EXPOSED_HEADERS = "x-request-id, mcp-session-id";

export type OriginPolicy = (origin: string | undefined) => boolean;

// Pure header builder so the policy can be unit tested without booting the
// runtime environment that cors.ts reads.
export function createCorsHeaders(origin: string | undefined, isAllowedOrigin: OriginPolicy): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Expose-Headers": EXPOSED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
