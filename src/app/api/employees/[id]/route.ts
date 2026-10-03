import { db } from "@/db";
import { employees } from "@/db/schema";
import { jsonError, parseId } from "@/lib/server-helpers";
import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return jsonError("מזהה עובד לא תקין");

  const [target] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, id));
  if (!target) return jsonError("העובד לא נמצא", 404);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(employees);
  if (total <= 1) return jsonError("לא ניתן למחוק את העובד האחרון במערכת", 409);

  try {
    await db.delete(employees).where(eq(employees.id, id));
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "23503") {
      return jsonError("לא ניתן למחוק עובד המשויך לאצוות קיימות בהיסטוריה", 409);
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
