import { db } from "@/db";
import { batches, batchSteps, employees } from "@/db/schema";
import type {
  BatchStatus,
  HistoryResponse,
  HistoryRowDTO,
  RecordedInputDTO,
} from "@/lib/types";
import { and, asc, desc, inArray, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Permanent archive of completed & aborted batches (newest first). */
export async function GET() {
  const rows = await db
    .select()
    .from(batches)
    .where(isNotNull(batches.completedAt))
    .orderBy(desc(batches.completedAt))
    .limit(1000);

  const employeeIds = [...new Set(rows.map((b) => b.employeeId))];
  const employeeRows = employeeIds.length
    ? await db.select().from(employees).where(inArray(employees.id, employeeIds))
    : [];
  const nameById = new Map(employeeRows.map((e) => [e.id, e.name]));

  // Recorded quality-control inputs per batch.
  const batchIds = rows.map((b) => b.id);
  const inputRows = batchIds.length
    ? await db
        .select()
        .from(batchSteps)
        .where(
          and(inArray(batchSteps.batchId, batchIds), isNotNull(batchSteps.inputValue)),
        )
        .orderBy(asc(batchSteps.stepIndex))
    : [];
  const inputsByBatch = new Map<number, RecordedInputDTO[]>();
  for (const s of inputRows) {
    const list = inputsByBatch.get(s.batchId) ?? [];
    list.push({
      stepTitle: s.title,
      label: s.inputLabel ?? s.title,
      value: s.inputValue ?? "",
      unit: s.inputUnit,
    });
    inputsByBatch.set(s.batchId, list);
  }

  const payload: HistoryRowDTO[] = rows.map((b) => ({
    id: b.id,
    batchNumber: b.batchNumber,
    status: b.status as BatchStatus,
    formulaName: b.formulaName,
    employeeName: nameById.get(b.employeeId) ?? "עובד לא ידוע",
    startedAt: b.startedAt.toISOString(),
    completedAt: b.completedAt ? b.completedAt.toISOString() : null,
    totalDurationSeconds: b.totalDurationSeconds,
    abortReason: b.abortReason,
    inputs: inputsByBatch.get(b.id) ?? [],
  }));

  const response: HistoryResponse = {
    serverTime: new Date().toISOString(),
    rows: payload,
  };
  return NextResponse.json(response);
}
