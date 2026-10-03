import { FORMULAS_SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const token = store.get(FORMULAS_SESSION_COOKIE)?.value;
  const unlocked = await verifyToken(token, "formulas");
  return NextResponse.json({ unlocked });
}
