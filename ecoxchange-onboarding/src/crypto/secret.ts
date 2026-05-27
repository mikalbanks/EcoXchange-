import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from "node:crypto";

const ALGO: CipherGCMTypes = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;

function masterKey(): Buffer {
  const hex = process.env.ONBOARDING_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("ONBOARDING_ENCRYPTION_KEY is not set");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "ONBOARDING_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)",
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts plaintext with AES-256-GCM. Returns a single base64 blob of
 * `iv (12) || tag (16) || ciphertext`. The IV is random per call.
 */
export function encrypt(plaintext: string): string {
  const key = masterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decrypt(blob: string): string {
  const key = masterKey();
  const buf = Buffer.from(blob, "base64");
  if (buf.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("ciphertext too short");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ct = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8",
  );
}
