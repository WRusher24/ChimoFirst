import {
  adminPassword,
  FORMULAS_SESSION_COOKIE,
  FORMULAS_SESSION_TTL,
  issueToken,
  safeEqual,
} from "@/lib/auth";
import { jsonError } from "@/lib/server-helpers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Level-2 gate: re-enter the master company password to manage formulas. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    password?: string;
  } | null;
  if (!body || typeof body.password !== "string" || body.password.length === 0) {
    return jsonError("יש להזין את סיסמת החברה");
  }
  if (!safeEqual(body.password, adminPassword())) {
    return jsonError("סיסמת החברה שגויה — הגישה לניהול מתכונים נדחתה", 403);
  }

  const token = await issueToken("formulas", FORMULAS_SESSION_TTL);
  const res = NextResponse.json({ ok: true });
  // Browser-SESSION cookie (no Max-Age/Expires): never persisted to disk.
  // The client additionally deletes it on every navigation away from the
  // formulas section, so re-entry always demands the password again.
  res.cookies.set(FORMULAS_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
