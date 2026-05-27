import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../src/crypto/secret.js";

const ORIGINAL = process.env.ONBOARDING_ENCRYPTION_KEY;

describe("crypto/secret", () => {
  beforeEach(() => {
    process.env.ONBOARDING_ENCRYPTION_KEY =
      "0".repeat(64); // 32 bytes of zero, hex
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ONBOARDING_ENCRYPTION_KEY;
    else process.env.ONBOARDING_ENCRYPTION_KEY = ORIGINAL;
  });

  it("round-trips plaintext", () => {
    const pt = "se_live_abcdef1234567890";
    const ct = encrypt(pt);
    expect(ct).not.toBe(pt);
    expect(decrypt(ct)).toBe(pt);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const pt = "same secret";
    const a = encrypt(pt);
    const b = encrypt(pt);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(pt);
    expect(decrypt(b)).toBe(pt);
  });

  it("rejects an invalid key length", () => {
    process.env.ONBOARDING_ENCRYPTION_KEY = "abcd"; // too short
    expect(() => encrypt("x")).toThrow(/32 bytes/);
  });

  it("fails to decrypt with a different key", () => {
    const pt = "secret";
    const ct = encrypt(pt);
    // Rotate key
    process.env.ONBOARDING_ENCRYPTION_KEY = "f".repeat(64);
    expect(() => decrypt(ct)).toThrow();
  });
});
