import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for owner-supplied provider API keys at rest
 * (docs/05, docs/08). PROVIDER_KEY_ENCRYPTION_SECRET is accepted as either a
 * base64-encoded 32-byte key (e.g. from `openssl rand -base64 32`) or an
 * arbitrary passphrase, which is hashed down to 32 bytes as a fallback.
 *
 * Stored layout (single bytea column): [12-byte IV][16-byte auth tag][ciphertext].
 * Never log the plaintext key or this module's output in a way that could
 * end up in request logs.
 */

function deriveKey(): Buffer {
  const secret = getServerEnv().PROVIDER_KEY_ENCRYPTION_SECRET;
  try {
    const decoded = Buffer.from(secret, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // fall through to hash-derivation below
  }
  return createHash("sha256").update(secret).digest();
}

/** Returns base64 text, safe to store directly in a TEXT column. */
export function encryptProviderKey(plaintextKey: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintextKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Accepts the base64 text produced by encryptProviderKey. */
export function decryptProviderKey(stored: string): string {
  const key = deriveKey();
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function last4(plaintextKey: string): string {
  return plaintextKey.slice(-4);
}
