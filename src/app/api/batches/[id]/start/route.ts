import { db } from "@/db";
import { batches, batchSteps } from "@/db/schema";
import { jsonError, loadBatchDTO, parseId } from "@/lib/server-helpers";
import { and, asc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Manual Step-1 start. After PIN-verified creation the batch waits patiently;
 * only this explicit action begins step 1 — starting its server-timestamped
 * timer (timed steps) or opening its input collection (input steps).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return jsonError("מזהה אצווה לא תקין");

  const [batch] = await db.select().from(batches).where(eq(batches.id, id));
  if (!batch) return jsonError("האצווה לא נמצאה", 404);
  if (batch.status !== "active") return jsonError("האצווה אינה פעילה", 409);

  const [first] = await db
    .select()
    .from(batchSteps)
    .where(and(eq(batchSteps.batchId, id), ne(batchSteps.status, "completed")))
    .orderBy(asc(batchSteps.stepIndex))
    .limit(1);
  if (!first) return jsonError("אין שלב להתחיל באצווה זו", 409);
  if (first.stepIndex !== 0 || first.status !== "pending")
    return jsonError("האצווה כבר הופעלה", 409);

  const now = new Date();
  await db
    .update(batchSteps)
    .set({ status: "active", startedAt: now })
    .where(eq(batchSteps.id, first.id));

  const updated = await loadBatchDTO(id);
  return NextResponse.json({ serverTime: now.toISOString(), batch: updated });
}
