import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const IV_LENGTH_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getEncryptionKey() {
  if (!env.INTEGRATION_ENCRYPTION_KEY) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be set in the environment to use crypto functions.");
  }
  return createHash("sha256").update(env.INTEGRATION_ENCRYPTION_KEY, "utf8").digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(payload: string) {
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, IV_LENGTH_BYTES);
  const authTag = data.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_BYTES);
  const ciphertext = data.subarray(IV_LENGTH_BYTES + AUTH_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string) {
  const suffix = value.slice(-4);
  return suffix ? `••••${suffix}` : "••••";
}
