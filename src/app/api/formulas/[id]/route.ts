import { db } from "@/db";
import {
  batches,
  formulaIngredients,
  formulas,
  formulaSteps,
} from "@/db/schema";
import {
  getFormulaDTO,
  stepInsertValues,
  validateFormulaInput,
} from "@/lib/formula-service";
import { jsonError, parseId, requireFormulasAuth } from "@/lib/server-helpers";
import { and, count, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Full formula details (steps + ingredients) — supervisors only. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFormulasAuth();
  if (gate) return gate;

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return jsonError("מזהה מתכון לא תקין");
  const formula = await getFormulaDTO(id);
  if (!formula) return jsonError("המתכון לא נמצא", 404);
  return NextResponse.json({ serverTime: new Date().toISOString(), formula });
}

/** Update formula — supervisors only. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFormulasAuth();
  if (gate) return gate;

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return jsonError("מזהה מתכון לא תקין");

  const [existing] = await db
    .select({ id: formulas.id })
    .from(formulas)
    .where(eq(formulas.id, id));
  if (!existing) return jsonError("המתכון לא נמצא", 404);

  const body = await req.json().catch(() => null);
  const parsed = validateFormulaInput(body);
  if (!parsed.ok) return jsonError(parsed.error);
  const { value } = parsed;

  await db.transaction(async (tx) => {
    await tx
      .update(formulas)
      .set({
        name: value.name,
        description: value.description,
        updatedAt: new Date(),
      })
      .where(eq(formulas.id, id));

    await tx.delete(formulaSteps).where(eq(formulaSteps.formulaId, id));
    await tx.insert(formulaSteps).values(stepInsertValues(id, value));

    await tx
      .delete(formulaIngredients)
      .where(eq(formulaIngredients.formulaId, id));
    if (value.ingredients.length > 0) {
      await tx.insert(formulaIngredients).values(
        value.ingredients.map((ing, i) => ({
          formulaId: id,
          sortOrder: i,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        })),
      );
    }
  });

  return NextResponse.json({ ok: true });
}

/** Delete formula — supervisors only. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireFormulasAuth();
  if (gate) return gate;

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return jsonError("מזהה מתכון לא תקין");

  const [existing] = await db
    .select({ id: formulas.id })
    .from(formulas)
    .where(eq(formulas.id, id));
  if (!existing) return jsonError("המתכון לא נמצא", 404);

  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(batches)
    .where(and(eq(batches.formulaId, id), eq(batches.status, "active")));
  if (activeCount > 0)
    return jsonError("לא ניתן למחוק מתכון שיש לו אצוות פעילות כרגע", 409);

  await db.delete(formulas).where(eq(formulas.id, id));
  return NextResponse.json({ ok: true });
}
