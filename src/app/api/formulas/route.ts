import { db } from "@/db";
import { formulaIngredients, formulas, formulaSteps } from "@/db/schema";
import {
  listFormulaSummaries,
  stepInsertValues,
  validateFormulaInput,
} from "@/lib/formula-service";
import { jsonError, requireFormulasAuth } from "@/lib/server-helpers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight summaries for every logged-in employee (needed to pick a
 * formula when starting a batch). Full recipe details and mutations stay
 * behind the Level-2 supervisor password.
 */
export async function GET() {
  const payload = await listFormulaSummaries();
  return NextResponse.json({
    serverTime: new Date().toISOString(),
    formulas: payload,
  });
}

/** Create formula — supervisors only (master company password session). */
export async function POST(req: NextRequest) {
  const gate = await requireFormulasAuth();
  if (gate) return gate;

  const body = await req.json().catch(() => null);
  const parsed = validateFormulaInput(body);
  if (!parsed.ok) return jsonError(parsed.error);
  const { value } = parsed;

  const created = await db.transaction(async (tx) => {
    const [formula] = await tx
      .insert(formulas)
      .values({ name: value.name, description: value.description })
      .returning({ id: formulas.id });

    await tx.insert(formulaSteps).values(stepInsertValues(formula.id, value));

    if (value.ingredients.length > 0) {
      await tx.insert(formulaIngredients).values(
        value.ingredients.map((ing, i) => ({
          formulaId: formula.id,
          sortOrder: i,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        })),
      );
    }
    return formula;
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
