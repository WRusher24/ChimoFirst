import { db } from "@/db";
import { formulaIngredients, formulas, formulaSteps } from "@/db/schema";
import type {
  FormulaDTO,
  FormulaSummaryDTO,
  InputKind,
  StepType,
} from "@/lib/types";
import { asc, eq } from "drizzle-orm";

export interface FormulaStepInput {
  title: string;
  instruction: string;
  durationSeconds: number;
  stepType: StepType;
  inputLabel: string | null;
  inputKind: InputKind;
  inputMin: number | null;
  inputMax: number | null;
  inputUnit: string | null;
}

export interface FormulaInput {
  name: string;
  description: string;
  steps: FormulaStepInput[];
  ingredients: Array<{ name: string; amount: number; unit: string }>;
}

type ValidationResult =
  | { ok: true; value: FormulaInput }
  | { ok: false; error: string };

function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Rigorous, Hebrew-messaged validation of a formula payload (create & update). */
export function validateFormulaInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object")
    return { ok: false, error: "בקשה לא תקינה" };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (name.length < 2 || name.length > 80)
    return { ok: false, error: "שם המתכון חייב להכיל 2 עד 80 תווים" };

  const description =
    typeof b.description === "string" ? b.description.trim().slice(0, 600) : "";

  if (!Array.isArray(b.steps) || b.steps.length < 1 || b.steps.length > 60)
    return { ok: false, error: "המתכון חייב לכלול לפחות שלב אחד" };

  const steps: FormulaStepInput[] = [];
  for (let i = 0; i < b.steps.length; i++) {
    const s = b.steps[i] as Record<string, unknown> | null;
    if (!s || typeof s !== "object")
      return { ok: false, error: `שלב ${i + 1}: נתונים לא תקינים` };

    const title = typeof s.title === "string" ? s.title.trim() : "";
    if (title.length < 2 || title.length > 120)
      return { ok: false, error: `שלב ${i + 1}: כותרת חייבת להכיל 2 תווים לפחות` };

    const instruction =
      typeof s.instruction === "string" ? s.instruction.trim().slice(0, 600) : "";

    const stepType: StepType = s.stepType === "input" ? "input" : "timed";

    if (stepType === "timed") {
      const durationSeconds = Number(s.durationSeconds);
      if (
        !Number.isInteger(durationSeconds) ||
        durationSeconds < 1 ||
        durationSeconds > 86400
      )
        return {
          ok: false,
          error: `שלב ${i + 1}: משך השלב חייב להיות מספר שניות חיובי`,
        };
      steps.push({
        title,
        instruction,
        durationSeconds,
        stepType: "timed",
        inputLabel: null,
        inputKind: "number",
        inputMin: null,
        inputMax: null,
        inputUnit: null,
      });
    } else {
      const inputLabel =
        typeof s.inputLabel === "string" ? s.inputLabel.trim().slice(0, 80) : "";
      if (inputLabel.length < 2)
        return {
          ok: false,
          error: `שלב ${i + 1}: יש להגדיר תווית לשדה ההזנה (למשל "הזינו רמת pH")`,
        };
      const inputKind: InputKind = s.inputKind === "text" ? "text" : "number";
      const inputMin = inputKind === "number" ? toNullableNumber(s.inputMin) : null;
      const inputMax = inputKind === "number" ? toNullableNumber(s.inputMax) : null;
      if (s.inputMin !== null && s.inputMin !== undefined && s.inputMin !== "" && inputMin === null)
        return { ok: false, error: `שלב ${i + 1}: גבול תחתון חייב להיות מספר` };
      if (s.inputMax !== null && s.inputMax !== undefined && s.inputMax !== "" && inputMax === null)
        return { ok: false, error: `שלב ${i + 1}: גבול עליון חייב להיות מספר` };
      if (inputMin !== null && inputMax !== null && inputMin > inputMax)
        return { ok: false, error: `שלב ${i + 1}: הגבול התחתון גדול מהעליון` };
      const inputUnit =
        typeof s.inputUnit === "string" && s.inputUnit.trim()
          ? s.inputUnit.trim().slice(0, 20)
          : null;
      steps.push({
        title,
        instruction,
        durationSeconds: 0,
        stepType: "input",
        inputLabel,
        inputKind,
        inputMin,
        inputMax,
        inputUnit,
      });
    }
  }

  const ingredients: FormulaInput["ingredients"] = [];
  const rawIngredients = Array.isArray(b.ingredients) ? b.ingredients : [];
  if (rawIngredients.length > 100)
    return { ok: false, error: "רשימת הרכיבים ארוכה מדי" };
  for (let i = 0; i < rawIngredients.length; i++) {
    const ing = rawIngredients[i] as Record<string, unknown> | null;
    if (!ing || typeof ing !== "object") continue;
    const iname = typeof ing.name === "string" ? ing.name.trim() : "";
    if (!iname) continue; // silently skip empty ingredient rows
    if (iname.length > 80)
      return { ok: false, error: `רכיב מספר ${i + 1}: שם ארוך מדי` };
    const amount = Number(ing.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)
      return { ok: false, error: `רכיב "${iname}": כמות לא תקינה` };
    const unit =
      typeof ing.unit === "string" && ing.unit.trim()
        ? ing.unit.trim().slice(0, 20)
        : "יחידות";
    ingredients.push({ name: iname, amount, unit });
  }

  return { ok: true, value: { name, description, steps, ingredients } };
}

/** Assemble a full FormulaDTO (with steps + ingredients) by id. */
export async function getFormulaDTO(id: number): Promise<FormulaDTO | null> {
  const [formula] = await db.select().from(formulas).where(eq(formulas.id, id));
  if (!formula) return null;
  const steps = await db
    .select()
    .from(formulaSteps)
    .where(eq(formulaSteps.formulaId, id))
    .orderBy(asc(formulaSteps.sortOrder));
  const ingredients = await db
    .select()
    .from(formulaIngredients)
    .where(eq(formulaIngredients.formulaId, id))
    .orderBy(asc(formulaIngredients.sortOrder));
  return {
    id: formula.id,
    name: formula.name,
    description: formula.description,
    createdAt: formula.createdAt.toISOString(),
    steps: steps.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      title: s.title,
      instruction: s.instruction,
      durationSeconds: s.durationSeconds,
      stepType: s.stepType as StepType,
      inputLabel: s.inputLabel,
      inputKind: s.inputKind as InputKind,
      inputMin: s.inputMin,
      inputMax: s.inputMax,
      inputUnit: s.inputUnit,
    })),
    ingredients: ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
    })),
    totalDurationSeconds: steps.reduce((sum, s) => sum + s.durationSeconds, 0),
  };
}

/**
 * Lightweight formula summaries (no steps/ingredients detail).
 * Safe to expose to any logged-in employee for batch initiation;
 * the full recipe remains behind the Level-2 supervisor gate.
 */
export async function listFormulaSummaries(): Promise<FormulaSummaryDTO[]> {
  const rows = await db.select().from(formulas);
  const stepsRows = await db
    .select({
      formulaId: formulaSteps.formulaId,
      durationSeconds: formulaSteps.durationSeconds,
    })
    .from(formulaSteps);
  const ingredientRows = await db
    .select({ formulaId: formulaIngredients.formulaId })
    .from(formulaIngredients);

  const stepCount = new Map<number, number>();
  const duration = new Map<number, number>();
  for (const s of stepsRows) {
    stepCount.set(s.formulaId, (stepCount.get(s.formulaId) ?? 0) + 1);
    duration.set(s.formulaId, (duration.get(s.formulaId) ?? 0) + s.durationSeconds);
  }
  const ingredientCount = new Map<number, number>();
  for (const ing of ingredientRows) {
    ingredientCount.set(ing.formulaId, (ingredientCount.get(ing.formulaId) ?? 0) + 1);
  }

  return rows
    .sort((a, b) => b.id - a.id)
    .map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      stepCount: stepCount.get(f.id) ?? 0,
      ingredientCount: ingredientCount.get(f.id) ?? 0,
      totalDurationSeconds: duration.get(f.id) ?? 0,
    }));
}

/** Column values for inserting formula steps (shared by create & update). */
export function stepInsertValues(formulaId: number, input: FormulaInput) {
  return input.steps.map((s, i) => ({
    formulaId,
    sortOrder: i,
    title: s.title,
    instruction: s.instruction,
    durationSeconds: s.durationSeconds,
    stepType: s.stepType,
    inputLabel: s.inputLabel,
    inputKind: s.inputKind,
    inputMin: s.inputMin,
    inputMax: s.inputMax,
    inputUnit: s.inputUnit,
  }));
}
