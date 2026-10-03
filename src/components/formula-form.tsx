"use client";

import { useToast } from "@/components/providers";
import { Button, Card, PageHeader } from "@/components/ui";
import { api, errorMessage, fetcher } from "@/lib/api";
import type { FormulaDTO, InputKind, StepType } from "@/lib/types";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Beaker,
  GripVertical,
  Plus,
  Save,
  Timer,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

interface IngredientDraft {
  key: string;
  name: string;
  amount: string;
  unit: string;
}

interface StepDraft {
  key: string;
  stepType: StepType;
  title: string;
  instruction: string;
  minutes: string;
  seconds: string;
  inputLabel: string;
  inputKind: InputKind;
  inputMin: string;
  inputMax: string;
  inputUnit: string;
}

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}`;

const UNIT_SUGGESTIONS = ['ליטר', 'מ"ל', 'ק"ג', "גרם", "טיפות", "יחידות"];
const INPUT_UNIT_SUGGESTIONS = ["pH", "°C", "cP", "%", "mS/cm"];

function blankStep(): StepDraft {
  return {
    key: nextKey(),
    stepType: "timed",
    title: "",
    instruction: "",
    minutes: "1",
    seconds: "0",
    inputLabel: "",
    inputKind: "number",
    inputMin: "",
    inputMax: "",
    inputUnit: "",
  };
}

function blankIngredient(): IngredientDraft {
  return { key: nextKey(), name: "", amount: "", unit: 'ק"ג' };
}

export function FormulaForm({ formulaId }: { formulaId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = formulaId !== undefined;

  const { data, isLoading } = useSWR<{ formula: FormulaDTO }>(
    isEdit ? `/api/formulas/${formulaId}` : null,
    fetcher,
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [steps, setSteps] = useState<StepDraft[]>([blankStep()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data?.formula && !hydrated) {
      const f = data.formula;
      setName(f.name);
      setDescription(f.description);
      setIngredients(
        f.ingredients.map((ing) => ({
          key: nextKey(),
          name: ing.name,
          amount: String(ing.amount),
          unit: ing.unit,
        })),
      );
      setSteps(
        f.steps.map((s) => ({
          key: nextKey(),
          stepType: s.stepType,
          title: s.title,
          instruction: s.instruction,
          minutes: String(Math.floor(s.durationSeconds / 60)),
          seconds: String(s.durationSeconds % 60),
          inputLabel: s.inputLabel ?? "",
          inputKind: s.inputKind,
          inputMin: s.inputMin === null ? "" : String(s.inputMin),
          inputMax: s.inputMax === null ? "" : String(s.inputMax),
          inputUnit: s.inputUnit ?? "",
        })),
      );
      setHydrated(true);
    }
  }, [data, hydrated]);

  const totalSeconds = useMemo(
    () =>
      steps.reduce((sum, s) => {
        if (s.stepType !== "timed") return sum;
        const m = Number(s.minutes) || 0;
        const sec = Number(s.seconds) || 0;
        return sum + Math.max(0, m) * 60 + Math.max(0, sec);
      }, 0),
    [steps],
  );

  const updateStep = (key: string, patch: Partial<StepDraft>) =>
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const moveStep = (index: number, dir: -1 | 1) =>
    setSteps((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const removeStep = (key: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));

  const updateIngredient = (key: string, patch: Partial<IngredientDraft>) =>
    setIngredients((prev) =>
      prev.map((ing) => (ing.key === key ? { ...ing, ...patch } : ing)),
    );

  const removeIngredient = (key: string) =>
    setIngredients((prev) => prev.filter((ing) => ing.key !== key));

  const validate = (): string | null => {
    if (name.trim().length < 2) return "יש להזין שם מתכון (2 תווים לפחות)";
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.title.trim().length < 2) return `שלב ${i + 1}: חסרה כותרת להוראה`;
      if (s.stepType === "timed") {
        const m = Number(s.minutes) || 0;
        const sec = Number(s.seconds) || 0;
        if (m < 0 || sec < 0 || sec > 59 || m > 1440)
          return `שלב ${i + 1}: משך לא תקין (בדקו דקות ושניות)`;
        if (Math.floor(m) !== m || Math.floor(sec) !== sec)
          return `שלב ${i + 1}: יש להזין מספרים שלמים בלבד`;
        if (m * 60 + sec < 1) return `שלב ${i + 1}: משך השלב חייב להיות לפחות שנייה אחת`;
      } else {
        if (s.inputLabel.trim().length < 2)
          return `שלב ${i + 1}: יש להזין תווית לשדה ההזנה (למשל "הזינו רמת pH")`;
        if (s.inputKind === "number") {
          const hasMin = s.inputMin.trim() !== "";
          const hasMax = s.inputMax.trim() !== "";
          if (hasMin && !Number.isFinite(Number(s.inputMin)))
            return `שלב ${i + 1}: הגבול התחתון חייב להיות מספר`;
          if (hasMax && !Number.isFinite(Number(s.inputMax)))
            return `שלב ${i + 1}: הגבול העליון חייב להיות מספר`;
          if (hasMin && hasMax && Number(s.inputMin) > Number(s.inputMax))
            return `שלב ${i + 1}: הגבול התחתון גדול מהעליון`;
        }
      }
    }
    for (const ing of ingredients) {
      if (!ing.name.trim()) continue;
      const amount = Number(ing.amount);
      if (!Number.isFinite(amount) || amount <= 0)
        return `רכיב "${ing.name}": יש להזין כמות חיובית`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setFormError(err);
      toast.error(err);
      return;
    }
    setFormError(null);
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      steps: steps.map((s) => ({
        title: s.title.trim(),
        instruction: s.instruction.trim(),
        stepType: s.stepType,
        durationSeconds:
          s.stepType === "timed"
            ? (Number(s.minutes) || 0) * 60 + (Number(s.seconds) || 0)
            : 0,
        inputLabel: s.stepType === "input" ? s.inputLabel.trim() : null,
        inputKind: s.stepType === "input" ? s.inputKind : "number",
        inputMin:
          s.stepType === "input" && s.inputKind === "number" && s.inputMin.trim() !== ""
            ? Number(s.inputMin)
            : null,
        inputMax:
          s.stepType === "input" && s.inputKind === "number" && s.inputMax.trim() !== ""
            ? Number(s.inputMax)
            : null,
        inputUnit:
          s.stepType === "input" && s.inputUnit.trim() ? s.inputUnit.trim() : null,
      })),
      ingredients: ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name.trim(),
          amount: Number(ing.amount),
          unit: ing.unit.trim() || "יחידות",
        })),
    };
    try {
      if (isEdit) {
        await api.put(`/api/formulas/${formulaId}`, payload);
        toast.success("המתכון עודכן בהצלחה");
        router.push(`/formulas/${formulaId}`);
      } else {
        const res = await api.post<{ id: number }>("/api/formulas", payload);
        toast.success("המתכון נוצר בהצלחה ומוכן לייצור");
        router.push(`/formulas/${res.id}`);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && (isLoading || !hydrated)) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-[500px]" />
      </div>
    );
  }

  return (
    <div>
      <Link
        href={isEdit ? `/formulas/${formulaId}` : "/formulas"}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 transition-colors hover:text-accent-600"
      >
        <ArrowRight className="h-4 w-4" />
        {isEdit ? "חזרה למתכון" : "חזרה לרשימת המתכונים"}
      </Link>

      <PageHeader
        title={isEdit ? "עריכת מתכון" : "מתכון חדש"}
        subtitle={
          isEdit
            ? "שינויים ישפיעו על אצוות חדשות בלבד — אצוות שכבר רצות ממשיכות לפי העותק המקורי"
            : "הגדירו מתכון ייצור מלא: שלבים מתוזמנים קפדנית ושלבי בקרת איכות עם הזנת ערכים"
        }
      />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* ------------------------------ Basics ------------------------------ */}
        <Card className="p-5 md:p-6">
          <h2 className="mb-4 text-base font-extrabold text-ink-100">פרטי המתכון</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-200">
                שם המתכון <span className="text-rose-600">*</span>
              </label>
              <input
                className="field"
                placeholder="לדוגמה: נוזל כביסה מרוכז — כימו פרש"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
              <p className="mt-1 text-xs text-ink-500">
                ניתן לכתוב בעברית, באנגלית או בכל שילוב — Mixed names are welcome
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-200">תיאור</label>
              <textarea
                className="field min-h-[84px] resize-y"
                placeholder="תיאור קצר של המוצר הסופי, מאפיינים ושימושים"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={600}
              />
            </div>
          </div>
        </Card>

        {/* ---------------------------- Ingredients --------------------------- */}
        <Card className="p-5 md:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink-100">
              רכיבי ייצור <span className="text-sm font-medium text-ink-400">(אופציונלי)</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => setIngredients((prev) => [...prev, blankIngredient()])}
            >
              הוספת רכיב
            </Button>
          </div>
          <p className="mb-4 text-xs text-ink-500">
            רשימת חומרי הגלם והכמויות הנדרשות — תוצג בעמוד פרטי המתכון לעיון העובדים
          </p>

          {ingredients.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-500/60 bg-ink-850/50 px-4 py-6 text-center text-sm text-ink-500">
              לא הוגדרו רכיבים. לחצו על &quot;הוספת רכיב&quot; כדי להתחיל.
            </p>
          ) : (
            <div className="space-y-2.5">
              <div className="hidden grid-cols-[1fr_120px_130px_40px] gap-2.5 px-1 text-[11px] font-bold text-ink-500 sm:grid">
                <span>שם הרכיב</span>
                <span>כמות</span>
                <span>יחידת מידה</span>
                <span />
              </div>
              {ingredients.map((ing) => (
                <div
                  key={ing.key}
                  className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_120px_130px_40px]"
                >
                  <input
                    className="field col-span-2 sm:col-span-1"
                    placeholder="לדוגמה: מים מזוקקים / Deionized Water"
                    value={ing.name}
                    onChange={(e) => updateIngredient(ing.key, { name: e.target.value })}
                    maxLength={80}
                  />
                  <input
                    className="field font-mono"
                    dir="ltr"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(ing.key, { amount: e.target.value })}
                  />
                  <input
                    className="field"
                    list="unit-suggestions"
                    placeholder="יחידה"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(ing.key, { unit: e.target.value })}
                    maxLength={20}
                  />
                  <button
                    onClick={() => removeIngredient(ing.key)}
                    title="הסרת רכיב"
                    className="grid h-[42px] w-[42px] place-items-center rounded-lg text-ink-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <datalist id="unit-suggestions">
            {UNIT_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Card>

        {/* ------------------------------ Steps ------------------------------- */}
        <Card className="p-5 md:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink-100">
              שלבי הייצור <span className="text-rose-600">*</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              onClick={() => setSteps((prev) => [...prev, blankStep()])}
            >
              הוספת שלב
            </Button>
          </div>
          <p className="mb-4 text-xs text-ink-500">
            שלב מתוזמן: דורש טיימר מלא. שלב הזנת ערך: נעול עד שהעובד רושם מדידה
            (למשל pH) — הערך נשמר לביקורת איכות.
          </p>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`rounded-xl border p-4 transition-colors ${
                  step.stepType === "input"
                    ? "border-sky-300 bg-sky-50/40"
                    : "border-ink-600/70 bg-ink-850/40"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-ink-500" />
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-lg font-mono text-sm font-bold ${
                        step.stepType === "input"
                          ? "bg-sky-100 text-accent-600"
                          : "bg-ink-700/70 text-ink-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {/* ---- Step type toggle ---- */}
                    <div className="flex rounded-lg border border-ink-600 bg-white p-0.5">
                      <button
                        onClick={() => updateStep(step.key, { stepType: "timed" })}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                          step.stepType === "timed"
                            ? "bg-accent-600 text-white"
                            : "text-ink-400 hover:text-ink-100"
                        }`}
                      >
                        <Timer className="h-3.5 w-3.5" />
                        שלב מתוזמן
                      </button>
                      <button
                        onClick={() => updateStep(step.key, { stepType: "input" })}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                          step.stepType === "input"
                            ? "bg-sky-600 text-white"
                            : "text-ink-400 hover:text-ink-100"
                        }`}
                      >
                        <Beaker className="h-3.5 w-3.5" />
                        שלב הזנת ערך
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveStep(index, -1)}
                      disabled={index === 0}
                      title="הזזה למעלה"
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveStep(index, 1)}
                      disabled={index === steps.length - 1}
                      title="הזזה למטה"
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeStep(step.key)}
                      disabled={steps.length <= 1}
                      title="מחיקת שלב"
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  <input
                    className="field"
                    placeholder="כותרת השלב — לדוגמה: הוספת חומר פעיל השטח"
                    value={step.title}
                    onChange={(e) => updateStep(step.key, { title: e.target.value })}
                    maxLength={120}
                  />
                  <textarea
                    className="field min-h-[64px] resize-y text-[13px]"
                    placeholder="הוראות ביצוע מפורטות לעובד (אופציונלי)"
                    value={step.instruction}
                    onChange={(e) => updateStep(step.key, { instruction: e.target.value })}
                    maxLength={600}
                  />

                  {step.stepType === "timed" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-ink-300">
                        <Timer className="h-4 w-4 text-accent-500" />
                        משך מדויק:
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          className="field w-[76px] text-center font-mono"
                          dir="ltr"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="1440"
                          step="1"
                          value={step.minutes}
                          onChange={(e) => updateStep(step.key, { minutes: e.target.value })}
                        />
                        <span className="text-xs text-ink-400">דקות</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="field w-[76px] text-center font-mono"
                          dir="ltr"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="59"
                          step="1"
                          value={step.seconds}
                          onChange={(e) => updateStep(step.key, { seconds: e.target.value })}
                        />
                        <span className="text-xs text-ink-400">שניות</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-sky-200 bg-white p-3.5">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-ink-300">
                          תווית השדה לעובד <span className="text-rose-600">*</span>
                        </label>
                        <input
                          className="field"
                          placeholder='לדוגמה: "הזינו רמת pH" / "הזינו טמפרטורה"'
                          value={step.inputLabel}
                          onChange={(e) => updateStep(step.key, { inputLabel: e.target.value })}
                          maxLength={80}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold text-ink-300">סוג הערך</label>
                          <div className="flex rounded-lg border border-ink-600 p-0.5">
                            {(["number", "text"] as InputKind[]).map((kind) => (
                              <button
                                key={kind}
                                onClick={() => updateStep(step.key, { inputKind: kind })}
                                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                                  step.inputKind === kind
                                    ? "bg-sky-100 text-accent-700"
                                    : "text-ink-400 hover:text-ink-100"
                                }`}
                              >
                                {kind === "number" ? "מספרי (7.2)" : "טקסט חופשי"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-bold text-ink-300">
                            יחידת מידה (אופציונלי)
                          </label>
                          <input
                            className="field font-mono"
                            list="input-unit-suggestions"
                            placeholder="pH / °C"
                            value={step.inputUnit}
                            onChange={(e) => updateStep(step.key, { inputUnit: e.target.value })}
                            maxLength={20}
                          />
                        </div>
                      </div>
                      {step.inputKind === "number" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-ink-300">
                              גבול תחתון (אופציונלי)
                            </label>
                            <input
                              className="field font-mono"
                              dir="ltr"
                              type="number"
                              inputMode="decimal"
                              step="any"
                              placeholder="ללא הגבלה"
                              value={step.inputMin}
                              onChange={(e) => updateStep(step.key, { inputMin: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-ink-300">
                              גבול עליון (אופציונלי)
                            </label>
                            <input
                              className="field font-mono"
                              dir="ltr"
                              type="number"
                              inputMode="decimal"
                              step="any"
                              placeholder="ללא הגבלה"
                              value={step.inputMax}
                              onChange={(e) => updateStep(step.key, { inputMax: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] leading-relaxed text-ink-500">
                        השלב יישאר נעול עד שהעובד יזין ערך חוקי. הערך נשמר ביומן
                        ההיסטוריה ובייצוא ה־CSV לביקורות עתידיות.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <datalist id="input-unit-suggestions">
            {INPUT_UNIT_SUGGESTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Card>

        {/* ------------------------------ Footer ------------------------------ */}
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm text-ink-300">
            סה״כ זמן מתוזמן לאצווה:{" "}
            <span className="font-mono font-bold text-accent-700" dir="ltr">
              {String(Math.floor(totalSeconds / 3600))}:{String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")}:{String(totalSeconds % 60).padStart(2, "0")}
            </span>
            <span className="ms-2 text-xs text-ink-400">
              ({steps.filter((s) => s.stepType === "timed").length} שלבים מתוזמנים ·{" "}
              {steps.filter((s) => s.stepType === "input").length} שלבי בקרת איכות)
            </span>
            {formError && (
              <span className="ms-3 block font-semibold text-rose-600 sm:inline">{formError}</span>
            )}
          </p>
          <div className="flex gap-3">
            <Link href={isEdit ? `/formulas/${formulaId}` : "/formulas"}>
              <Button variant="ghost">ביטול</Button>
            </Link>
            <Button icon={Save} loading={saving} onClick={handleSubmit} size="lg">
              {isEdit ? "שמירת שינויים" : "יצירת המתכון"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
