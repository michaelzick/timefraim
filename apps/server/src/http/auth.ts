import { jwtVerify } from "jose";
import { z } from "zod";
import { env } from "../config/env.js";

const payloadSchema = z.object({
  email: z.string().email(),
  user_metadata: z
    .object({
      full_name: z.string().optional(),
      avatar_url: z.string().url().optional(),
    })
    .optional(),
});

export type AuthenticatedUser = {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

function getBearerToken(header: string | undefined) {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireAuthenticatedUser(authorizationHeader: string | undefined): Promise<AuthenticatedUser> {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    throw new Error("Missing bearer token");
  }

  const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });
  const parsed = payloadSchema.parse(payload);

  if (parsed.email.toLowerCase() !== env.ALLOWED_EMAIL.toLowerCase()) {
    throw new Error("This account is not allowed to access Schejewel");
  }

  return {
    email: parsed.email,
    displayName: parsed.user_metadata?.full_name ?? null,
    avatarUrl: parsed.user_metadata?.avatar_url ?? null,
  };
}

export function requireMcpProfile(authorizationHeader: string | undefined): "read-only" | "full-access" {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    throw new Error("Missing MCP bearer token");
  }

  if (token === env.MCP_BEARER_TOKEN) {
    return "full-access";
  }

  if (token === env.MCP_READ_ONLY_TOKEN) {
    return "read-only";
  }

  throw new Error("Invalid MCP bearer token");
}
