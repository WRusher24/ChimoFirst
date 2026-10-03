import { db } from "@/db";
import { batches, batchSteps, employees } from "@/db/schema";
import type {
  BatchDTO,
  EmployeeRole,
  StepDTO,
  StepStatus,
  BatchStatus,
} from "@/lib/types";
import { asc, eq, inArray } from "drizzle-orm";
import { FORMULAS_SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Standard Hebrew error response for API routes. */
export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Level-2 gate for formula-management endpoints.
 * Returns null when the caller holds a valid formulas session,
 * otherwise a ready-to-return 403 response.
 */
export async function requireFormulasAuth(): Promise<NextResponse | null> {
  const store = await cookies();
  const token = store.get(FORMULAS_SESSION_COOKIE)?.value;
  if (await verifyToken(token, "formulas")) return null;
  return jsonError("נדרש אימות מנהל כדי לצפות או לערוך מתכונים", 403);
}

type BatchRow = typeof batches.$inferSelect;
type StepRow = typeof batchSteps.$inferSelect;

export function toStepDTO(row: StepRow): StepDTO {
  return {
    id: row.id,
    stepIndex: row.stepIndex,
    title: row.title,
    instruction: row.instruction,
    durationSeconds: row.durationSeconds,
    status: row.status as StepStatus,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    elapsedMs: row.elapsedMs,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    stepType: row.stepType as StepDTO["stepType"],
    inputLabel: row.inputLabel,
    inputKind: row.inputKind as StepDTO["inputKind"],
    inputMin: row.inputMin,
    inputMax: row.inputMax,
    inputUnit: row.inputUnit,
    inputValue: row.inputValue,
  };
}

export function toBatchDTO(row: BatchRow, employeeName: string, steps: StepDTO[]): BatchDTO {
  return {
    id: row.id,
    batchNumber: row.batchNumber,
    status: row.status as BatchStatus,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    abortReason: row.abortReason,
    totalDurationSeconds: row.totalDurationSeconds,
    formulaId: row.formulaId,
    formulaName: row.formulaName,
    employeeId: row.employeeId,
    employeeName,
    steps,
  };
}

/** Loads a batch with its ordered steps and executing employee. */
export async function loadBatchDTO(id: number): Promise<BatchDTO | null> {
  const [batch] = await db.select().from(batches).where(eq(batches.id, id));
  if (!batch) return null;
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, batch.employeeId));
  const steps = await db
    .select()
    .from(batchSteps)
    .where(eq(batchSteps.batchId, id))
    .orderBy(asc(batchSteps.stepIndex));
  return toBatchDTO(
    batch,
    employee?.name ?? "עובד לא ידוע",
    steps.map(toStepDTO),
  );
}

/** Parses a positive-integer route param. Returns null when invalid. */
export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export { inArray };
export type { EmployeeRole };
