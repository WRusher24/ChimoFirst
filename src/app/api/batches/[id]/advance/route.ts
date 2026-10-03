import { db } from "@/db";
import { batches, batchSteps } from "@/db/schema";
import { jsonError, loadBatchDTO, parseId } from "@/lib/server-helpers";
import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Advance to the next step. Two mutually-exclusive step kinds:
 *
 *  - TIMED steps: STRICTLY gated — the server recomputes the remaining time
 *    and refuses (409) while meaningful time is left. Steps can never be
 *    skipped.
 *  - INPUT steps: gated on a validated worker measurement (e.g. pH level).
 *    The value is permanently stored on the step for quality audits.
 *
 * Finishing the last step completes the batch.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return jsonError("מזהה אצווה לא תקין");

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const [batch] = await db.select().from(batches).where(eq(batches.id, id));
  if (!batch) return jsonError("האצווה לא נמצאה", 404);
  if (batch.status !== "active") return jsonError("האצווה אינה פעילה", 409);

  const steps = await db
    .select()
    .from(batchSteps)
    .where(eq(batchSteps.batchId, id))
    .orderBy(asc(batchSteps.stepIndex));
  const current = steps.find((s) => s.status !== "completed");
  if (!current) return jsonError("כל השלבים כבר הושלמו", 409);
  if (current.status === "pending")
    return jsonError('יש ללחוץ על "התחלת שלב 1" לפני התקדמות', 409);
  if (current.status === "paused")
    return jsonError("יש להמשיך את הטיימר לפני מעבר לשלב הבא", 409);
  if (current.status !== "active" || !current.startedAt)
    return jsonError("השלב אינו פעיל כרגע", 409);

  const now = new Date();
  let recordedInput: string | null = null;

  if (current.stepType === "input") {
    /* -------------------------- INPUT STEP GATE -------------------------- */
    const rawValue =
      typeof body.inputValue === "string" ? body.inputValue.trim() : "";
    if (!rawValue)
      return jsonError("יש להזין את הערך הנדרש לפני התקדמות לשלב הבא", 409);
    if (rawValue.length > 60) return jsonError("הערך שהוזן ארוך מדי");

    if (current.inputKind === "number") {
      const n = Number(rawValue);
      if (!Number.isFinite(n))
        return jsonError("הערך חייב להיות מספר תקין (ניתן להשתמש בנקודה עשרונית)", 409);
      if (current.inputMin !== null && n < current.inputMin)
        return jsonError(
          `הערך חייב להיות לפחות ${current.inputMin}${current.inputUnit ? ` ${current.inputUnit}` : ""}`,
          409,
        );
      if (current.inputMax !== null && n > current.inputMax)
        return jsonError(
          `הערך חייב להיות לכל היותר ${current.inputMax}${current.inputUnit ? ` ${current.inputUnit}` : ""}`,
          409,
        );
    }
    recordedInput = rawValue;
  } else {
    /* -------------------------- TIMED STEP GATE -------------------------- */
    const remaining =
      current.durationSeconds * 1000 -
      (current.elapsedMs + (now.getTime() - current.startedAt.getTime()));

    // Small grace window (< 1.5s) absorbs network latency; nothing beyond it.
    if (remaining > 1500) {
      return jsonError("לא ניתן להתקדם — ספירת הזמן של השלב טרם הסתיימה", 409);
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(batchSteps)
      .set({
        status: "completed",
        // Wall-clock time the worker actually spent on this step.
        elapsedMs:
          current.elapsedMs + (now.getTime() - current.startedAt!.getTime()),
        startedAt: null,
        completedAt: now,
        ...(recordedInput !== null ? { inputValue: recordedInput } : {}),
      })
      .where(eq(batchSteps.id, current.id));

    const next = steps.find((s) => s.stepIndex === current.stepIndex + 1);
    if (next) {
      await tx
        .update(batchSteps)
        .set({ status: "active", startedAt: now })
        .where(eq(batchSteps.id, next.id));
    } else {
      await tx
        .update(batches)
        .set({
          status: "completed",
          completedAt: now,
          totalDurationSeconds: Math.max(
            0,
            Math.round((now.getTime() - batch.startedAt.getTime()) / 1000),
          ),
        })
        .where(eq(batches.id, id));
    }
  });

  const updated = await loadBatchDTO(id);
  return NextResponse.json({ serverTime: now.toISOString(), batch: updated });
}
