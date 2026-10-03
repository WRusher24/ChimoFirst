/**
 * Company-level authentication (Level 1) + Formula-management gate (Level 2).
 *
 * Stateless, tamper-proof session tokens:
 *   `chimo1.<scope>.<expiresAtUnix>.<base64url-HMAC-SHA256(scope.expiresAt)>`
 *
 * Works in BOTH the Edge runtime (middleware) and Node runtime (route
 * handlers) because it relies on the universal WebCrypto API.
 */

export type AuthScope = "app" | "formulas";

const encoder = new TextEncoder();

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function sessionSecret(): string {
  return (
    process.env.CHIMO_SESSION_SECRET ??
    "chimo-factory-session-secret-9f2c7ab1d4e8"
  );
}

export function adminUser(): string {
  return process.env.CHIMO_ADMIN_USER ?? "admin";
}

export function adminPassword(): string {
  return process.env.CHIMO_ADMIN_PASSWORD ?? "chimo-2026";
}

/** Timing-safe-ish string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) {
    // still compare against self to keep timing roughly constant
    let d = 0;
    for (let i = 0; i < bufA.length; i++) d |= bufA[i] ^ bufA[i];
    return d === 1 ? false : false;
  }
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

async function hmacSha256(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64url(signature);
}

export async function issueToken(scope: AuthScope, ttlSeconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${scope}.${exp}`;
  const sig = await hmacSha256(payload);
  return `chimo1.${payload}.${sig}`;
}

export async function verifyToken(
  token: string | undefined | null,
  scope: AuthScope,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [prefix, tokenScope, expRaw, sig] = parts;
  if (prefix !== "chimo1" || tokenScope !== scope) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return false;
  const expected = await hmacSha256(`${tokenScope}.${expRaw}`);
  return safeEqual(sig, expected);
}

export const APP_SESSION_COOKIE = "chimo_auth";
export const FORMULAS_SESSION_COOKIE = "chimo_formulas";
export const APP_SESSION_TTL = 60 * 60 * 12; // 12 hours
// Hard cap is a last-resort safety net only: the app actively deletes the
// formulas cookie on every navigation away, so access never truly persists.
export const FORMULAS_SESSION_TTL = 60 * 15; // 15 minutes
