import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "../config/env.ts";

const payloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  user_metadata: z
    .object({
      full_name: z.string().optional(),
      avatar_url: z.string().url().optional(),
    })
    .optional(),
});

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

const JWKS = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
const JWT_SECRET = env.SUPABASE_JWT_SECRET ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET) : null;

function requireJwtSecret() {
  if (!JWT_SECRET) {
    throw new AuthenticationError("HS256 tokens require AUTH_JWT_SECRET to be configured");
  }
  return JWT_SECRET;
}

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
    throw new AuthenticationError("Missing bearer token");
  }

  let parsed: z.infer<typeof payloadSchema>;
  try {
    const header = decodeProtectedHeader(token);
    const { payload } = header.alg?.startsWith("HS")
      ? await jwtVerify(token, requireJwtSecret())
      : await jwtVerify(token, JWKS);
    parsed = payloadSchema.parse(payload);
  } catch {
    throw new AuthenticationError("Invalid bearer token");
  }

  if (parsed.email.toLowerCase() !== env.ALLOWED_EMAIL.toLowerCase()) {
    throw new AuthorizationError("This account is not allowed to access TimeFraim");
  }

  return {
    id: parsed.sub,
    email: parsed.email,
    displayName: parsed.user_metadata?.full_name ?? null,
    avatarUrl: parsed.user_metadata?.avatar_url ?? null,
  };
}

export function requireMcpProfile(authorizationHeader: string | undefined): "read-only" | "full-access" {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    throw new AuthenticationError("Missing MCP bearer token");
  }

  // Evaluate both comparisons so the response time does not reveal which token matched.
  const isFullAccess = secureEquals(token, env.MCP_BEARER_TOKEN);
  const isReadOnly = secureEquals(token, env.MCP_READ_ONLY_TOKEN);
  if (isFullAccess) {
    return "full-access";
  }
  if (isReadOnly) {
    return "read-only";
  }

  throw new AuthenticationError("Invalid MCP bearer token");
}

const textEncoder = new TextEncoder();

/** Constant-time string equality (runtime-neutral; no node:crypto on the edge). */
export function secureEquals(candidate: string, expected: string): boolean {
  const a = textEncoder.encode(candidate);
  const b = textEncoder.encode(expected);
  // Length is not secret for fixed-length tokens; compare bytes without early exit.
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
