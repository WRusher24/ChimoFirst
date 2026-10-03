import { db } from "@/db";
import { employees } from "@/db/schema";
import { hashPin } from "@/lib/pin";
import { jsonError } from "@/lib/server-helpers";
import type { EmployeeDTO, EmployeeRole } from "@/lib/types";
import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      role: employees.role,
      createdAt: employees.createdAt,
    })
    .from(employees)
    .orderBy(asc(employees.id));
  const payload: EmployeeDTO[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role as EmployeeRole,
    createdAt: r.createdAt.toISOString(),
  }));
  return NextResponse.json({
    serverTime: new Date().toISOString(),
    employees: payload,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return jsonError("בקשה לא תקינה");

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 60)
    return jsonError("שם העובד חייב להכיל 2 עד 60 תווים");

  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (!/^\d{4}$/.test(pin))
    return jsonError("קוד PIN חייב להכיל בדיוק 4 ספרות");

  const role = body.role === "supervisor" ? "supervisor" : "worker";

  const [existing] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.name, name));
  if (existing) return jsonError("עובד עם שם זהה כבר קיים במערכת", 409);

  const [created] = await db
    .insert(employees)
    .values({ name, role, pinHash: hashPin(pin) })
    .returning({
      id: employees.id,
      name: employees.name,
      role: employees.role,
      createdAt: employees.createdAt,
    });

  return NextResponse.json(
    {
      employee: {
        id: created.id,
        name: created.name,
        role: created.role as EmployeeRole,
        createdAt: created.createdAt.toISOString(),
      } satisfies EmployeeDTO,
    },
    { status: 201 },
  );
}
