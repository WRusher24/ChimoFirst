import {
  adminPassword,
  adminUser,
  APP_SESSION_COOKIE,
  APP_SESSION_TTL,
  issueToken,
  safeEqual,
} from "@/lib/auth";
import { jsonError } from "@/lib/server-helpers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;
  if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
    return jsonError("יש להזין שם משתמש וסיסמה");
  }

  const userOk = safeEqual(body.username.trim(), adminUser());
  const passOk = safeEqual(body.password, adminPassword());
  if (!userOk || !passOk) {
    return jsonError("שם המשתמש או הסיסמה שגויים", 401);
  }

  const token = await issueToken("app", APP_SESSION_TTL);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(APP_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: APP_SESSION_TTL,
  });
  return res;
}
