"use client";

import { useToast } from "@/components/providers";
import { StartBatchWizard } from "@/components/start-batch-wizard";
import { Badge, Button, Card, ConfirmDialog } from "@/components/ui";
import { api, errorMessage, fetcher } from "@/lib/api";
import { formatDate, formatDurationSeconds, formatNumber } from "@/lib/format";
import type { FormulaDTO } from "@/lib/types";
import {
  ArrowRight,
  Beaker,
  Clock3,
  FlaskConical,
  ListOrdered,
  Pencil,
  PlayCircle,
  Timer,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

export function FormulaDetailClient({ formulaId }: { formulaId: number }) {
  const router = useRouter();
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{ formula: FormulaDTO }>(
    `/api/formulas/${formulaId}`,
    fetcher,
  );

  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formula = data?.formula;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/api/formulas/${formulaId}`);
      toast.success("המתכון נמחק");
      router.push("/formulas");
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-[420px]" />
      </div>
    );
  }

  if (error || !formula) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-16 text-center">
        <XCircle className="h-10 w-10 text-rose-500" />
        <p className="text-lg font-bold text-rose-700">
          {error?.status === 403 ? "נדרש אימות מנהל לצפייה במתכון" : "המתכון לא נמצא במערכת"}
        </p>
        <Link href="/formulas">
          <Button variant="ghost" icon={ArrowRight}>
            חזרה למתכונים
          </Button>
        </Link>
      </div>
    );
  }

  const inputSteps = formula.steps.filter((s) => s.stepType === "input").length;

  return (
    <div>
      <Link
        href="/formulas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 transition-colors hover:text-accent-600"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה לרשימת המתכונים
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sky-50 text-accent-600 ring-1 ring-sky-200">
            <FlaskConical className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-ink-100 md:text-[28px]">
              {formula.name}
            </h1>
            {formula.description && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-400">
                {formula.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="slate">
                <ListOrdered className="h-3 w-3" />
                {formula.steps.length} שלבים
              </Badge>
              <Badge tone="aqua">
                <Clock3 className="h-3 w-3" />
                סה״כ{" "}
                <span className="font-mono">
                  {formatDurationSeconds(formula.totalDurationSeconds)}
                </span>
              </Badge>
              {inputSteps > 0 && (
                <Badge tone="amber">
                  <Beaker className="h-3 w-3" />
                  {inputSteps} שלבי בקרת איכות
                </Badge>
              )}
              <Badge tone="slate">
                <Beaker className="h-3 w-3" />
                {formula.ingredients.length} רכיבים
              </Badge>
              <Badge tone="slate">
                נוצר ב־<span className="font-mono">{formatDate(formula.createdAt)}</span>
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button icon={PlayCircle} size="lg" onClick={() => setWizardOpen(true)}>
            התחלת אצווה
          </Button>
          <Link href={`/formulas/${formula.id}/edit`}>
            <Button variant="ghost" icon={Pencil}>
              עריכה
            </Button>
          </Link>
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            מחיקה
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* --------------------------- Ingredients --------------------------- */}
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-100">
            <Beaker className="h-5 w-5 text-accent-500" />
            רכיבי ייצור
          </h2>
          {formula.ingredients.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-ink-500/60 bg-ink-850/50 px-4 py-8 text-center text-sm text-ink-500">
              לא הוגדרו רכיבים למתכון זה
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-700/60">
              {formula.ingredients.map((ing) => (
                <li key={ing.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm font-medium text-ink-200">{ing.name}</span>
                  <span className="shrink-0 font-mono text-sm font-bold text-accent-700" dir="ltr">
                    {formatNumber(ing.amount)} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ------------------------------ Steps ------------------------------ */}
        <Card className="p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-100">
            <ListOrdered className="h-5 w-5 text-accent-500" />
            שלבי הייצור
          </h2>
          <div className="relative mt-5 space-y-4 before:absolute before:inset-y-2 before:start-[15px] before:w-px before:bg-ink-600/50">
            {formula.steps.map((step, i) => (
              <div key={step.id} className="relative flex gap-4 ps-0">
                <span
                  className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-white font-mono text-sm font-bold ${
                    step.stepType === "input"
                      ? "border-sky-400 text-sky-600"
                      : "border-ink-500 text-ink-300"
                  }`}
                >
                  {i + 1}
                </span>
                <div
                  className={`min-w-0 flex-1 rounded-xl border p-4 ${
                    step.stepType === "input"
                      ? "border-sky-200 bg-sky-50/50"
                      : "border-ink-600/60 bg-ink-850/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-ink-100">{step.title}</p>
                    {step.stepType === "timed" ? (
                      <span
                        className="flex items-center gap-1 rounded-lg bg-ink-800 px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-ink-200"
                        dir="ltr"
                      >
                        <Timer className="h-3.5 w-3.5" />
                        {formatDurationSeconds(step.durationSeconds)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                        <Beaker className="h-3.5 w-3.5" />
                        שלב הזנת ערך
                      </span>
                    )}
                  </div>
                  {step.instruction && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">
                      {step.instruction}
                    </p>
                  )}
                  {step.stepType === "input" && step.inputLabel && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md border border-ink-600/60 bg-white px-2 py-1 font-bold text-ink-200">
                        {step.inputLabel}
                      </span>
                      {step.inputUnit && (
                        <span className="font-mono font-bold text-ink-400" dir="ltr">
                          [{step.inputUnit}]
                        </span>
                      )}
                      {(step.inputMin !== null || step.inputMax !== null) && (
                        <span className="font-mono text-ink-400" dir="ltr">
                          טווח: {step.inputMin ?? "-∞"} – {step.inputMax ?? "+∞"}
                        </span>
                      )}
                      <span className="text-ink-500">
                        ({step.inputKind === "number" ? "ערך מספרי" : "טקסט חופשי"})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <StartBatchWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        presetFormulaId={formula.id}
        onCreated={() => mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        busy={deleting}
        title="מחיקת מתכון"
        message={
          <>
            האם למחוק את המתכון{" "}
            <span className="font-bold text-ink-100">"{formula.name}"</span>?
            <br />
            לא ניתן למחוק מתכון שיש לו אצוות פעילות כרגע.
          </>
        }
        confirmLabel="מחיקה לצמיתות"
      />
    </div>
  );
}
