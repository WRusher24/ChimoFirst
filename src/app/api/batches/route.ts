import { randomUUID } from "crypto";
import { db } from "@/db";
import {
  batches,
  batchSteps,
  employees,
  formulas,
  formulaSteps,
} from "@/db/schema";
import { verifyPin } from "@/lib/pin";
import { jsonError, loadBatchDTO } from "@/lib/server-helpers";
import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Create a new production batch.
 * Requires: formulaId, employeeId and the employee's 4-digit PIN.
 * Copies the formula steps into immutable batch steps. Step 1 is created in
 * 'pending' state — the worker must explicitly press "התחלת שלב 1"
 * (POST /:id/start) before any timer or input collection begins.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return jsonError("בקשה לא תקינה");

  const formulaId = Number(body.formulaId);
  const employeeId = Number(body.employeeId);
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  if (!Number.isInteger(formulaId) || formulaId <= 0)
    return jsonError("יש לבחור נוסחה");
  if (!Number.isInteger(employeeId) || employeeId <= 0)
    return jsonError("יש לבחור עובד");
  if (!/^\d{4}$/.test(pin)) return jsonError("יש להזין קוד PIN בן 4 ספרות");

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId));
  if (!employee) return jsonError("העובד לא נמצא", 404);
  if (!verifyPin(pin, employee.pinHash))
    return jsonError("קוד PIN שגוי — בדקו ונסו שוב", 401);

  const [formula] = await db
    .select()
    .from(formulas)
    .where(eq(formulas.id, formulaId));
  if (!formula) return jsonError("הנוסחה לא נמצאה", 404);
  const steps = await db
    .select()
    .from(formulaSteps)
    .where(eq(formulaSteps.formulaId, formulaId))
    .orderBy(asc(formulaSteps.sortOrder));
  if (steps.length === 0)
    return jsonError("לא ניתן להתחיל אצווה — לנוסחה אין שלבים מוגדרים", 409);

  const now = new Date();
  const batchId = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(batches)
      .values({
        batchNumber: `TMP-${randomUUID()}`,
        formulaId: formula.id,
        employeeId: employee.id,
        formulaName: formula.name,
        startedAt: now,
      })
      .returning({ id: batches.id });

    const batchNumber = `CH-${String(1000 + inserted.id).padStart(4, "0")}`;
    await tx
      .update(batches)
      .set({ batchNumber })
      .where(eq(batches.id, inserted.id));

    await tx.insert(batchSteps).values(
      steps.map((s, i) => ({
        batchId: inserted.id,
        stepIndex: i,
        title: s.title,
        instruction: s.instruction,
        durationSeconds: s.durationSeconds,
        status: "pending",
        startedAt: null,
        stepType: s.stepType,
        inputLabel: s.inputLabel,
        inputKind: s.inputKind,
        inputMin: s.inputMin,
        inputMax: s.inputMax,
        inputUnit: s.inputUnit,
      })),
    );
    return inserted.id;
  });

  const batch = await loadBatchDTO(batchId);
  return NextResponse.json(
    { serverTime: new Date().toISOString(), batch },
    { status: 201 },
  );
}
