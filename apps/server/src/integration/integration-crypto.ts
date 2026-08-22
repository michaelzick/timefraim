import { env } from "../config/env.ts";

const IV_LENGTH_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

async function deriveKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function getEncryptionKey() {
  const secret = env.INTEGRATION_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be set in the environment to use crypto functions.");
  }
  let key = keyCache.get(secret);
  if (!key) {
    key = deriveKey(secret);
    keyCache.set(secret, key);
  }
  return key;
}

function concatBytes(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

// Stored layout is base64(iv || authTag || ciphertext) — the format the
// original node:crypto implementation wrote — so existing rows keep decrypting.
// WebCrypto returns ciphertext || authTag, hence the splice below.
export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getEncryptionKey(), encoder.encode(value)),
  );
  const ciphertext = sealed.subarray(0, sealed.length - AUTH_TAG_BYTES);
  const authTag = sealed.subarray(sealed.length - AUTH_TAG_BYTES);
  return bytesToBase64(concatBytes(iv, authTag, ciphertext));
}

export async function decryptSecret(payload: string) {
  const data = base64ToBytes(payload);
  const iv = data.subarray(0, IV_LENGTH_BYTES);
  const authTag = data.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_BYTES);
  const ciphertext = data.subarray(IV_LENGTH_BYTES + AUTH_TAG_BYTES);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    await getEncryptionKey(),
    concatBytes(ciphertext, authTag),
  );
  return decoder.decode(plain);
}

export function maskSecret(value: string) {
  const suffix = value.slice(-4);
  return suffix ? `••••${suffix}` : "••••";
}
