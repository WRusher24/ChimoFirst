import { db } from "@/db";
import { batches, batchSteps } from "@/db/schema";
import { jsonError, loadBatchDTO, parseId } from "@/lib/server-helpers";
import { and, asc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Pause the currently running step (freezes accumulated elapsed time). */
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

  const [current] = await db
    .select()
    .from(batchSteps)
    .where(and(eq(batchSteps.batchId, id), ne(batchSteps.status, "completed")))
    .orderBy(asc(batchSteps.stepIndex))
    .limit(1);
  if (!current) return jsonError("אין שלב פעיל באצווה זו", 409);
  if (current.stepType === "input")
    return jsonError("שלב הזנת ערך אינו ניתן להשהייה", 409);
  if (current.status === "pending")
    return jsonError('יש ללחוץ תחילה על "התחלת שלב 1"', 409);
  if (current.status === "paused")
    return jsonError("הטיימר כבר מושהה", 409);
  if (current.status !== "active" || !current.startedAt)
    return jsonError("השלב אינו רץ כרגע", 409);

  const now = new Date();
  const elapsedMs =
    current.elapsedMs + (now.getTime() - current.startedAt.getTime());

  await db
    .update(batchSteps)
    .set({ status: "paused", elapsedMs, startedAt: null })
    .where(eq(batchSteps.id, current.id));

  const updated = await loadBatchDTO(id);
  return NextResponse.json({ serverTime: now.toISOString(), batch: updated });
}
