import { db } from "@/db";
import { batches, batchSteps, employees } from "@/db/schema";
import { toBatchDTO, toStepDTO } from "@/lib/server-helpers";
import type { DashboardResponse } from "@/lib/types";
import { and, asc, count, eq, gte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Everything the production floor dashboard needs, in one payload. */
export async function GET() {
  const activeBatches = await db
    .select()
    .from(batches)
    .where(eq(batches.status, "active"))
    .orderBy(asc(batches.startedAt));

  const ids = activeBatches.map((b) => b.id);

  const stepsRows = ids.length
    ? await db
        .select()
        .from(batchSteps)
        .where(inArray(batchSteps.batchId, ids))
        .orderBy(asc(batchSteps.stepIndex))
    : [];

  const employeeIds = [...new Set(activeBatches.map((b) => b.employeeId))];
  const employeeRows = employeeIds.length
    ? await db
        .select()
        .from(employees)
        .where(inArray(employees.id, employeeIds))
    : [];
  const employeeNameById = new Map(employeeRows.map((e) => [e.id, e.name]));

  const stepsByBatch = new Map<number, typeof stepsRows>();
  for (const s of stepsRows) {
    const list = stepsByBatch.get(s.batchId) ?? [];
    list.push(s);
    stepsByBatch.set(s.batchId, list);
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [{ value: completedToday }] = await db
    .select({ value: count() })
    .from(batches)
    .where(
      and(eq(batches.status, "completed"), gte(batches.completedAt, startOfDay)),
    );

  const batchDTOs = activeBatches.map((b) => {
    const steps = (stepsByBatch.get(b.id) ?? []).map(toStepDTO);
    return toBatchDTO(b, employeeNameById.get(b.employeeId) ?? "עובד לא ידוע", steps);
  });

  const paused = batchDTOs.filter((b) => {
    const current = b.steps.find((s) => s.status !== "completed");
    return current?.status === "paused";
  }).length;

  const payload: DashboardResponse = {
    serverTime: new Date().toISOString(),
    stats: {
      active: batchDTOs.length,
      paused,
      completedToday: Number(completedToday),
    },
    batches: batchDTOs,
  };
  return NextResponse.json(payload);
}
