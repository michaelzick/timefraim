import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { env } from "../config/env.js";
import { requireAuthenticatedUser } from "./auth.js";

const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

describe("http auth", () => {
  it("accepts HS256 Supabase access tokens in local development", async () => {
    const token = await new SignJWT({
      email: env.ALLOWED_EMAIL,
      user_metadata: {
        full_name: "Michael Zick",
        avatar_url: "https://example.com/avatar.png",
      },
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    await expect(requireAuthenticatedUser(`Bearer ${token}`)).resolves.toEqual({
      email: env.ALLOWED_EMAIL,
      displayName: "Michael Zick",
      avatarUrl: "https://example.com/avatar.png",
    });
  });
});
