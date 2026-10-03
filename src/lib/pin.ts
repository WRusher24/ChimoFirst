import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Hash a 4-digit employee PIN using salted scrypt.
 * Stored format: `<salt hex>:<hash hex>`.
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

/** Constant-time verification of a PIN against a stored hash. */
export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
