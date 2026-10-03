import {
  APP_SESSION_COOKIE,
  verifyToken,
} from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Global company gate: every page and API route (except the public login
 * screen, login/logout endpoints and the health probe) requires a valid
 * signed company session cookie.
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(APP_SESSION_COOKIE)?.value;
  const ok = await verifyToken(token, "app");
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  const next = req.nextUrl.pathname + req.nextUrl.search;
  if (next && next !== "/") loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth/login|api/auth/logout|api/health).*)",
  ],
};
