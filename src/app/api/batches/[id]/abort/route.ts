import { db } from "@/db";
import { batches, batchSteps } from "@/db/schema";
import { jsonError, loadBatchDTO, parseId } from "@/lib/server-helpers";
import { and, asc, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Abort an active batch with a mandatory reason note (archived in history). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return jsonError("מזהה אצווה לא תקין");

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const reason =
    body && typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 2 || reason.length > 300)
    return jsonError("יש לציין סיבת ביטול (2 עד 300 תווים)");

  const [batch] = await db.select().from(batches).where(eq(batches.id, id));
  if (!batch) return jsonError("האצווה לא נמצאה", 404);
  if (batch.status !== "active") return jsonError("האצווה אינה פעילה", 409);

  const now = new Date();

  // Freeze the currently running step so the record shows where it stopped.
  const [current] = await db
    .select()
    .from(batchSteps)
    .where(and(eq(batchSteps.batchId, id), ne(batchSteps.status, "completed")))
    .orderBy(asc(batchSteps.stepIndex))
    .limit(1);

  await db.transaction(async (tx) => {
    if (current && current.status === "active" && current.startedAt) {
      await tx
        .update(batchSteps)
        .set({
          status: "paused",
          elapsedMs:
            current.elapsedMs +
            (now.getTime() - current.startedAt.getTime()),
          startedAt: null,
        })
        .where(eq(batchSteps.id, current.id));
    }
    await tx
      .update(batches)
      .set({
        status: "aborted",
        abortReason: reason,
        completedAt: now,
        totalDurationSeconds: Math.max(
          0,
          Math.round((now.getTime() - batch.startedAt.getTime()) / 1000),
        ),
      })
      .where(eq(batches.id, id));
  });

  const updated = await loadBatchDTO(id);
  return NextResponse.json({ serverTime: now.toISOString(), batch: updated });
}
