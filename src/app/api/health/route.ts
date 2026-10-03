import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "up" | "down" = "up";
  try {
    await db.execute(sql`select 1`);
  } catch {
    dbStatus = "down";
  }
  return NextResponse.json({
    ok: true,
    service: "chimo",
    db: dbStatus,
    serverTime: new Date().toISOString(),
  });
}
