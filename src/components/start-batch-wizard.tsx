"use client";

import { PinPad } from "@/components/pin-pad";
import { useToast } from "@/components/providers";
import { Avatar, Badge, Button, EmptyState, Modal } from "@/components/ui";
import { api, errorMessage, fetcher } from "@/lib/api";
import { formatDurationSeconds } from "@/lib/format";
import type { BatchDTO, EmployeeDTO, FormulaSummaryDTO } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  FlaskConical,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

type WizardStep = 0 | 1 | 2;

const STEP_LABELS = ["בחירת מתכון", "בחירת עובד", "אימות PIN"];

export function StartBatchWizard({
  open,
  onClose,
  presetFormulaId = null,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  presetFormulaId?: number | null;
  onCreated?: (batch: BatchDTO) => void;
}) {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<WizardStep>(0);
  const [formulaId, setFormulaId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);

  const { data: formulasData } = useSWR<{ formulas: FormulaSummaryDTO[] }>(
    open ? "/api/formulas" : null,
    fetcher,
  );
  const { data: employeesData } = useSWR<{ employees: EmployeeDTO[] }>(
    open ? "/api/employees" : null,
    fetcher,
  );

  const formulas = formulasData?.formulas ?? [];
  const employees = employeesData?.employees ?? [];

  useEffect(() => {
    if (open) {
      setStep(presetFormulaId ? 1 : 0);
      setFormulaId(presetFormulaId);
      setEmployeeId(null);
      setPinError(null);
      setBusy(false);
    }
  }, [open, presetFormulaId]);

  const selectedFormula = formulas.find((f) => f.id === formulaId) ?? null;
  const selectedEmployee = employees.find((e) => e.id === employeeId) ?? null;

  const submitPin = async (pin: string) => {
    if (!formulaId || !employeeId || busy) return;
    setBusy(true);
    setPinError(null);
    try {
      const res = await api.post<{ batch: BatchDTO }>("/api/batches", {
        formulaId,
        employeeId,
        pin,
      });
      toast.success(`אצווה ${res.batch.batchNumber} נוצרה — לחצו "התחלת שלב 1" כדי להתחיל`);
      onClose();
      onCreated?.(res.batch);
      router.push(`/batches/${res.batch.id}`);
    } catch (err) {
      setPinError(errorMessage(err));
      setErrorNonce((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  const stepMotion = {
    initial: { opacity: 0, x: -18 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 18 },
    transition: { duration: 0.18 },
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title="יצירת אצווה חדשה"
      maxWidth="max-w-3xl"
    >
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                i === step
                  ? "border-sky-200 bg-sky-50 text-accent-600"
                  : i < step
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-ink-700 text-ink-400"
              }`}
            >
              <span className="font-mono">{i + 1}</span> {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight className="h-4 w-4 rotate-180 text-ink-500" />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ---------------- Step 0: choose formula ---------------- */}
        {step === 0 && (
          <motion.div key="formula" {...stepMotion}>
            {formulasData && formulas.length === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title="עדיין לא הוגדרו מתכונים"
                hint="מפקח יכול ליצור מתכון ראשון באזור המתכונים (דורש סיסמת חברה)."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {formulas.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFormulaId(f.id);
                      setStep(1);
                    }}
                    className={`rounded-2xl border p-4 text-start transition-all duration-150 hover:-translate-y-0.5 ${
                      formulaId === f.id
                        ? "border-accent-500 bg-sky-50 ring-1 ring-accent-500/30"
                        : "border-ink-600 bg-white hover:border-accent-400 hover:bg-sky-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-accent-600 ring-1 ring-sky-200">
                        <FlaskConical className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold leading-snug text-ink-100">{f.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone="slate">{f.stepCount} שלבים</Badge>
                          <Badge tone="aqua">
                            <Timer className="h-3 w-3" />
                            <span className="font-mono">
                              {formatDurationSeconds(f.totalDurationSeconds)}
                            </span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ---------------- Step 1: choose employee ---------------- */}
        {step === 1 && (
          <motion.div key="employee" {...stepMotion}>
            {employeesData && employees.length === 0 ? (
              <EmptyState
                icon={Users}
                title="אין עובדים במערכת"
                hint="יש להוסיף עובדים עם קוד PIN לפני יצירת אצווה."
                action={
                  <Link href="/settings/users">
                    <Button>ניהול עובדים</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {employees.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setEmployeeId(e.id);
                      setStep(2);
                    }}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-start transition-all duration-150 hover:-translate-y-0.5 ${
                      employeeId === e.id
                        ? "border-accent-500 bg-sky-50 ring-1 ring-accent-500/30"
                        : "border-ink-600 bg-white hover:border-accent-400 hover:bg-sky-50/50"
                    }`}
                  >
                    <Avatar name={e.name} seed={e.id} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink-100">{e.name}</p>
                      <Badge
                        tone={e.role === "supervisor" ? "amber" : "slate"}
                        className="mt-1"
                      >
                        {e.role === "supervisor" ? "מפקח/ת" : "עובד/ת"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6">
              <Button
                variant="subtle"
                icon={ArrowRight}
                onClick={() => setStep(presetFormulaId ? step : 0)}
                disabled={!!presetFormulaId}
              >
                חזרה לבחירת מתכון
              </Button>
            </div>
          </motion.div>
        )}

        {/* ---------------- Step 2: PIN verification ---------------- */}
        {step === 2 && (
          <motion.div key="pin" {...stepMotion}>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <Badge tone="aqua" className="px-3.5 py-1.5 text-sm">
                {selectedFormula?.name ?? "מתכון"}
              </Badge>
              <ChevronRight className="h-4 w-4 rotate-180 text-ink-500" />
              <Badge tone="slate" className="px-3.5 py-1.5 text-sm">
                {selectedEmployee?.name ?? "עובד"}
              </Badge>
            </div>

            <div className="mb-5 flex items-center justify-center gap-2 text-center">
              <ShieldCheck className="h-5 w-5 text-accent-500" />
              <p className="text-sm font-semibold text-ink-300">
                הזינו את קוד ה-PIN האישי (4 ספרות) לאימות ויצירת האצווה
              </p>
            </div>

            <PinPad onSubmit={submitPin} busy={busy} errorNonce={errorNonce} />

            {pinError && (
              <p className="mt-4 text-center text-sm font-semibold text-rose-600">
                {pinError}
              </p>
            )}

            <div className="mt-6 flex justify-start">
              <Button
                variant="subtle"
                icon={ArrowRight}
                onClick={() => {
                  setPinError(null);
                  setStep(1);
                }}
                disabled={busy}
              >
                חזרה לבחירת עובד
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
