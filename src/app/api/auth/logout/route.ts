import { APP_SESSION_COOKIE, FORMULAS_SESSION_COOKIE } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const name of [APP_SESSION_COOKIE, FORMULAS_SESSION_COOKIE]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return res;
}
