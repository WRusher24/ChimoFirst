import { hashPin } from "@/lib/pin";
import type { InputKind, StepType } from "@/lib/types";
import { db } from "./index";
import { employees, formulaIngredients, formulas, formulaSteps } from "./schema";

const SEED_EMPLOYEES = [
  { name: "יוסי כהן", role: "worker", pin: "1234" },
  { name: "דנה לוי", role: "supervisor", pin: "2468" },
  { name: "אבי מזרחי", role: "worker", pin: "1379" },
  { name: "שרה אברהם", role: "worker", pin: "4321" },
  { name: "מוחמד חלבי", role: "worker", pin: "9876" },
];

interface SeedStep {
  title: string;
  instruction: string;
  stepType: StepType;
  durationSeconds?: number;
  inputLabel?: string;
  inputKind?: InputKind;
  inputMin?: number | null;
  inputMax?: number | null;
  inputUnit?: string | null;
}

const SEED_FORMULAS: Array<{
  name: string;
  description: string;
  ingredients: Array<{ name: string; amount: number; unit: string }>;
  steps: SeedStep[];
}> = [
  {
    name: "נוזל כביסה מרוכז — כימו פרש",
    description:
      "נוזל כביסה מרוכז לכביסה לבנה וצבעונית, ריח פרש עדין. מתאים לטמפרטורות 30°–60°.",
    ingredients: [
      { name: "מים מזוקקים", amount: 50, unit: "ליטר" },
      { name: "חומר פעיל שטח (LABSA)", amount: 5, unit: 'ק"ג' },
      { name: "סודה קאוסטית 50%", amount: 0.8, unit: 'ק"ג' },
      { name: "מלח (NaCl)", amount: 2, unit: 'ק"ג' },
      { name: "אנזימים מרוכזים", amount: 0.3, unit: 'ק"ג' },
      { name: "בושם פרש", amount: 0.2, unit: "ליטר" },
      { name: "צבע תכלת מזון", amount: 0.05, unit: 'ק"ג' },
    ],
    steps: [
      {
        title: "מילוי מים ראשוני",
        instruction:
          "מלאו 50 ליטר מים מזוקקים לכלי הערבוב הראשי והפעילו ערבוב איטי (40 סל״ד).",
        stepType: "timed",
        durationSeconds: 120,
      },
      {
        title: "הוספת חומר פעיל השטח",
        instruction:
          "הוסיפו 5 ק״ג LABSA בזרם איטי ורציף. ודאו שטמפרטורת התערובת אינה עולה על 40°C.",
        stepType: "timed",
        durationSeconds: 180,
      },
      {
        title: "מדידת טמפרטורת תערובת",
        instruction: "מדדו את טמפרטורת התערובת בעזרת מד-חום המעבדה ורשמו את הערך.",
        stepType: "input",
        inputLabel: "הזינו טמפרטורת תערובת",
        inputKind: "number",
        inputMin: 15,
        inputMax: 60,
        inputUnit: "°C",
      },
      {
        title: "כיוונון pH",
        instruction: "הוסיפו סודה קאוסטית בהדרגה וערבבו עד איזון. מדדו עם כרטיס pH.",
        stepType: "timed",
        durationSeconds: 150,
      },
      {
        title: "רישום רמת pH סופית",
        instruction: "מדדו את רמת ה־pH הסופית. יעד עבודה: בין 8.5 ל־9.0.",
        stepType: "input",
        inputLabel: "הזינו רמת pH נמדדת",
        inputKind: "number",
        inputMin: 0,
        inputMax: 14,
        inputUnit: "pH",
      },
      {
        title: "סינון ובקרת איכות",
        instruction:
          "העבירו את התערובת דרך מסננת 100 מיקרון למכל האחסון וקחו דגימה לבדיקת מעבדה.",
        stepType: "timed",
        durationSeconds: 90,
      },
    ],
  },
  {
    name: "סבון כלים לימון — כימו סיטרוס",
    description:
      "סבון כלים מרוכז בניחוח לימון סיטרוס, חיתוך שומנים מהיר, עדין לידיים.",
    ingredients: [
      { name: "מים מזוקקים", amount: 40, unit: "ליטר" },
      { name: "SLES (חומר פעיל שטח)", amount: 6, unit: 'ק"ג' },
      { name: "קוקומיד (מסשנת קצף)", amount: 1, unit: 'ק"ג' },
      { name: "גליצרין", amount: 0.5, unit: "ליטר" },
      { name: "מלח (NaCl)", amount: 1.5, unit: 'ק"ג' },
      { name: "שמן אתרי לימון", amount: 0.15, unit: "ליטר" },
      { name: "צבע צהוב לימון", amount: 0.03, unit: 'ק"ג' },
    ],
    steps: [
      {
        title: "מילוי מים והפעלת ערבוב",
        instruction: "מלאו 40 ליטר מים מזוקקים והפעילו ערבוב בינוני (60 סל״ד).",
        stepType: "timed",
        durationSeconds: 90,
      },
      {
        title: "המסת SLES",
        instruction:
          "הוסיפו 6 ק״ג SLES בהדרגה. המתינו להמסה מלאה — ללא גושים גלויים.",
        stepType: "timed",
        durationSeconds: 180,
      },
      {
        title: "הוספת קוקומיד וגליצרין",
        instruction: "הוסיפו קוקומיד וגליצרין לתערובת וערבבו עד אחידות מלאה.",
        stepType: "timed",
        durationSeconds: 120,
      },
      {
        title: "כיוונון צמיגות וניחוח",
        instruction:
          "הוסיפו מלח בהדרגה עד לצמיגות הרצויה, ואז שמן לימון וצבע. ערבוב איטי בלבד.",
        stepType: "timed",
        durationSeconds: 150,
      },
      {
        title: "מדידת pH דגימה",
        instruction: "קחו דגימה למעבדה ומדדו pH. יעד עבודה: בין 6.5 ל־7.5.",
        stepType: "input",
        inputLabel: "הזינו רמת pH של הדגימה",
        inputKind: "number",
        inputMin: 0,
        inputMax: 14,
        inputUnit: "pH",
      },
    ],
  },
  {
    name: "מנקה רצפות לבנדר — כימו לבנדר",
    description:
      "מנקה רצפות תכליתי בניחוח לבנדר, מבריק ללא שאריות. מדולל 1:40 בשימוש.",
    ingredients: [
      { name: "מים מזוקקים", amount: 45, unit: "ליטר" },
      { name: "חומר פעיל שטח לא-יוני", amount: 3, unit: 'ק"ג' },
      { name: "אמוניה מדוללת 5%", amount: 0.4, unit: "ליטר" },
      { name: "בושם לבנדר", amount: 0.25, unit: "ליטר" },
      { name: "צבע סגול", amount: 0.04, unit: 'ק"ג' },
    ],
    steps: [
      {
        title: "מילוי מים ראשוני",
        instruction: "מלאו 45 ליטר מים מזוקקים לכלי הערבוב והפעילו ערבוב איטי.",
        stepType: "timed",
        durationSeconds: 90,
      },
      {
        title: "הוספת חומר פעיל השטח",
        instruction: "הוסיפו 3 ק״ג חומר פעיל שטח לא-יוני וערבבו עד להמסה מלאה.",
        stepType: "timed",
        durationSeconds: 150,
      },
      {
        title: "הוספת אמוניה ובושם",
        instruction:
          "הוסיפו אמוניה מדוללת בזהירות (מוצר עילאי — כפפות חובה) ולאחר מכן בושם לבנדר וצבע.",
        stepType: "timed",
        durationSeconds: 120,
      },
      {
        title: "בקרת מעבדה סופית",
        instruction: "ערבבו 2 דקות נוספות, קחו דגימה למעבדה ורשמו את תוצאת הבדיקה.",
        stepType: "input",
        inputLabel: "הזינו הערת בקרת איכות (אושר / נדחה)",
        inputKind: "text",
        inputUnit: null,
      },
    ],
  },
];

export async function runSeed() {
  const existingEmployees = await db
    .select({ id: employees.id })
    .from(employees)
    .limit(1);
  if (existingEmployees.length === 0) {
    await db.insert(employees).values(
      SEED_EMPLOYEES.map((e) => ({
        name: e.name,
        role: e.role,
        pinHash: hashPin(e.pin),
      })),
    );
    console.log(`Seeded ${SEED_EMPLOYEES.length} employees.`);
  } else {
    console.log("Employees already exist — skipping employee seed.");
  }

  const existingFormulas = await db
    .select({ id: formulas.id })
    .from(formulas)
    .limit(1);
  if (existingFormulas.length === 0) {
    for (const f of SEED_FORMULAS) {
      const [created] = await db
        .insert(formulas)
        .values({ name: f.name, description: f.description })
        .returning();
      await db.insert(formulaSteps).values(
        f.steps.map((s, i) => ({
          formulaId: created.id,
          sortOrder: i,
          title: s.title,
          instruction: s.instruction,
          durationSeconds: s.stepType === "timed" ? (s.durationSeconds ?? 60) : 0,
          stepType: s.stepType,
          inputLabel: s.inputLabel ?? null,
          inputKind: s.inputKind ?? "number",
          inputMin: s.inputMin ?? null,
          inputMax: s.inputMax ?? null,
          inputUnit: s.inputUnit ?? null,
        })),
      );
      await db.insert(formulaIngredients).values(
        f.ingredients.map((ing, i) => ({
          formulaId: created.id,
          sortOrder: i,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        })),
      );
      console.log(`Seeded formula: ${f.name}`);
    }
  } else {
    console.log("Formulas already exist — skipping formula seed.");
  }
}

// Allow running directly: `npx tsx --env-file=.env src/db/seed.ts`
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  runSeed()
    .then(() => {
      console.log("Seed completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
