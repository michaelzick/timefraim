import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.ts", () => ({
  env: { INTEGRATION_ENCRYPTION_KEY: "integration-crypto-test-secret" },
}));

const SECRET = "integration-crypto-test-secret";

import { decryptSecret, encryptSecret, maskSecret } from "./integration-crypto.ts";

// Reference implementation: the node:crypto code that wrote the rows already in
// the database. The WebCrypto port must stay byte-compatible with it.
function legacyKey() {
  return createHash("sha256").update(SECRET, "utf8").digest();
}

function legacyEncrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", legacyKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

function legacyDecrypt(payload: string) {
  const data = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", legacyKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}

describe("integration crypto", () => {
  it("round-trips a secret", async () => {
    const ciphertext = await encryptSecret("toggl-api-token-1234");
    expect(ciphertext).not.toContain("toggl");
    await expect(decryptSecret(ciphertext)).resolves.toBe("toggl-api-token-1234");
  });

  it("decrypts rows written by the legacy node:crypto implementation", async () => {
    await expect(decryptSecret(legacyEncrypt("legacy-token"))).resolves.toBe("legacy-token");
  });

  it("writes ciphertext the legacy implementation can read", async () => {
    expect(legacyDecrypt(await encryptSecret("new-token"))).toBe("new-token");
  });

  it("uses a fresh IV per encryption", async () => {
    expect(await encryptSecret("same")).not.toBe(await encryptSecret("same"));
  });

  it("rejects tampered ciphertext", async () => {
    const bytes = Buffer.from(await encryptSecret("untouched"), "base64");
    bytes[bytes.length - 1] ^= 0xff;
    await expect(decryptSecret(bytes.toString("base64"))).rejects.toThrow();
  });

  it("masks all but the last four characters", () => {
    expect(maskSecret("abcdef1234")).toBe("••••1234");
    expect(maskSecret("")).toBe("••••");
  });
});
