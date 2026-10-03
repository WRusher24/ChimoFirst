import { FORMULAS_SESSION_COOKIE } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Immediately revokes formula-management access by deleting the unlock cookie.
 * Invoked by the app shell on every navigation away from /formulas and before
 * every navigation into it — guaranteeing on-click re-authentication.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FORMULAS_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
