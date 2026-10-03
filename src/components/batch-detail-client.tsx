"use client";

import { useChime, useToast } from "@/components/providers";
import { Avatar, Badge, Button, Card, Modal } from "@/components/ui";
import { api, errorMessage, fetcher } from "@/lib/api";
import {
  formatClockMs,
  formatDateTime,
  formatDurationSeconds,
  formatTime,
} from "@/lib/format";
import {
  awaitingManualStart,
  batchElapsedMs,
  batchProgressOf,
  currentStepOf,
  elapsedMsOf,
  plannedTotalMs,
  remainingMsOf,
} from "@/lib/timers";
import type { BatchDetailResponse, StepDTO } from "@/lib/types";
import { useServerNow } from "@/lib/use-server-now";
import { motion } from "framer-motion";
import {
  AlarmClockCheck,
  ArrowLeft,
  ArrowRight,
  Ban,
  Beaker,
  CheckCircle2,
  Circle,
  ExternalLink,
  Flag,
  Lock,
  Pause,
  Play,
  PlayCircle,
  RotateCw,
  Send,
  Timer,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

type ActionKind = "start" | "pause" | "resume" | "advance" | "abort";

export function BatchDetailClient({ batchId }: { batchId: number }) {
  const toast = useToast();
  const { playChime } = useChime();

  const { data, error, isLoading, mutate } = useSWR<BatchDetailResponse>(
    `/api/batches/${batchId}`,
    fetcher,
    { refreshInterval: 8000, revalidateOnFocus: true },
  );
  const serverNow = useServerNow(data?.serverTime, 200);

  const batch = data?.batch;
  const current = batch ? currentStepOf(batch) : undefined;
  const isAwaitingStart = batch ? awaitingManualStart(batch) : false;
  const isInputStep = current?.stepType === "input";
  const remaining = current ? remainingMsOf(current, serverNow) : 0;
  const paused = current?.status === "paused";
  const ready =
    !!current && !paused && current.stepType === "timed" && remaining <= 0;
  const isLastStep =
    !!batch && !!current && current.stepIndex === batch.steps.length - 1;
  const stepTotalMs = current ? Math.max(current.durationSeconds * 1000, 1) : 1;
  const fill = current
    ? Math.min(1, Math.max(0, 1 - remaining / stepTotalMs))
    : 0;
  const doneCount = batch
    ? batch.steps.filter((s) => s.status === "completed").length
    : 0;

  /* Chime exactly once per timed step when its countdown reaches zero */
  const chimeFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!batch || batch.status !== "active" || !current) return;
    if (current.status !== "active" || current.stepType !== "timed") return;
    const key = `${batch.id}:${current.id}`;
    if (remainingMsOf(current, serverNow) <= 0) {
      if (chimeFiredRef.current !== key) {
        chimeFiredRef.current = key;
        playChime();
      }
    }
  }, [batch, current, serverNow, playChime]);

  const [busy, setBusy] = useState<ActionKind | null>(null);
  const [abortOpen, setAbortOpen] = useState(false);
  const [abortReason, setAbortReason] = useState("");
  const [abortError, setAbortError] = useState<string | null>(null);

  /* QC input state */
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const stepKey = current?.id ?? 0;
  useEffect(() => {
    setInputValue("");
    setInputError(null);
  }, [stepKey]);

  const run = async (kind: ActionKind, fn: () => Promise<BatchDetailResponse>) => {
    if (busy) return;
    setBusy(kind);
    try {
      const res = await fn();
      await mutate(res, { revalidate: false });
      return res;
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const post = (suffix: string, body?: unknown) =>
    api.post<BatchDetailResponse>(`/api/batches/${batchId}/${suffix}`, body);

  const handleStart = () => {
    void run("start", () => post("start")).then((res) => {
      if (res) toast.info("שלב 1 הופעל — בהצלחה");
    });
  };

  const handleAdvance = () => {
    void run("advance", () => post("advance")).then((res) => {
      if (!res) return;
      afterAdvance(res);
    });
  };

  const handleInputSubmit = () => {
    if (!current) return;
    const value = inputValue.trim();
    if (!value) {
      setInputError("יש להזין ערך לפני התקדמות");
      return;
    }
    if (current.inputKind === "number") {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        setInputError("הערך חייב להיות מספר תקין");
        return;
      }
      if (current.inputMin !== null && n < current.inputMin) {
        setInputError(
          `הערך חייב להיות לפחות ${current.inputMin}${current.inputUnit ? ` ${current.inputUnit}` : ""}`,
        );
        return;
      }
      if (current.inputMax !== null && n > current.inputMax) {
        setInputError(
          `הערך חייב להיות לכל היותר ${current.inputMax}${current.inputUnit ? ` ${current.inputUnit}` : ""}`,
        );
        return;
      }
    }
    setInputError(null);
    void run("advance", () => post("advance", { inputValue: value })).then((res) => {
      if (!res) return;
      toast.success(`הערך נשמר לתיעוד בקרת האיכות`);
      afterAdvance(res);
    });
  };

  const afterAdvance = (res: BatchDetailResponse) => {
    if (res.batch.status === "completed") {
      playChime();
      toast.success(`אצווה ${res.batch.batchNumber} הושלמה בהצלחה`);
    } else {
      const next = currentStepOf(res.batch);
      if (next?.stepType === "input") {
        playChime();
        toast.info(`הגעתם לשלב בקרת איכות: ${next.title}`);
      } else {
        toast.info(next ? `שלב חדש התחיל: ${next.title}` : "התקדמות נרשמה");
      }
    }
  };

  const handleAbort = () => {
    const reason = abortReason.trim();
    if (reason.length < 2) {
      setAbortError("יש לציין סיבת ביטול קצרה");
      return;
    }
    void run("abort", () => post("abort", { reason })).then((res) => {
      if (res) {
        setAbortOpen(false);
        setAbortReason("");
        setAbortError(null);
        toast.info(`אצווה ${res.batch.batchNumber} בוטלה ונשמרה בהיסטוריה`);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-64" />
        <div className="skeleton h-[420px]" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-16 text-center">
        <XCircle className="h-10 w-10 text-rose-500" />
        <p className="text-lg font-bold text-rose-700">
          {error?.status === 404 ? "האצווה לא נמצאה במערכת" : "שגיאה בטעינת האצווה"}
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" icon={RotateCw} onClick={() => mutate()}>
            נסו שוב
          </Button>
          <Link href="/">
            <Button variant="subtle" icon={ArrowRight}>
              חזרה ללוח
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ------------------------------ Header ------------------------------ */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 transition-colors hover:text-accent-600"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה ללוח הייצור
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono text-3xl font-bold tracking-tight text-accent-600 md:text-4xl">
            {batch.batchNumber}
          </span>
          {batch.status === "active" &&
            (isAwaitingStart ? (
              <Badge tone="slate" dot>
                טרם הופעלה
              </Badge>
            ) : paused ? (
              <Badge tone="amber" dot>
                מושהה
              </Badge>
            ) : isInputStep ? (
              <Badge tone="amber" dot className="animate-pulse-soft">
                ממתינה להזנת ערך
              </Badge>
            ) : ready ? (
              <Badge tone="emerald" dot className="animate-pulse-soft">
                מוכנה להתקדמות
              </Badge>
            ) : (
              <Badge tone="aqua" dot className="animate-pulse-soft">
                פעילה
              </Badge>
            ))}
          {batch.status === "completed" && (
            <Badge tone="emerald" dot>
              הושלמה
            </Badge>
          )}
          {batch.status === "aborted" && (
            <Badge tone="rose" dot>
              בוטלה
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <span className="font-semibold text-ink-200">{batch.formulaName}</span>
          {batch.formulaId && (
            <Link
              href={`/formulas/${batch.formulaId}`}
              className="inline-flex items-center gap-1 rounded-lg border border-ink-600/70 bg-white px-2.5 py-1 text-xs font-semibold text-ink-300 transition-colors hover:border-accent-400 hover:text-accent-600"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              צפייה במתכון
            </Link>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ============================ Main column =========================== */}
        <div>
          {/* ---------- Ready-to-start hero (manual Step 1 start) ---------- */}
          {batch.status === "active" && isAwaitingStart && (
            <Card className="relative overflow-hidden border-sky-300">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-50 to-white" aria-hidden />
              <div className="relative p-6 text-center md:p-10">
                <Badge tone="aqua">האצווה נוצרה בהצלחה ומוכנה להפעלה</Badge>
                <h2 className="mt-4 text-2xl font-black text-ink-100 md:text-[28px]">
                  {batch.steps[0]?.title}
                </h2>
                {batch.steps[0]?.instruction && (
                  <p className="mx-auto mt-2 max-w-2xl leading-relaxed text-ink-300">
                    {batch.steps[0].instruction}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-center gap-2 font-mono text-sm text-ink-400">
                  <Timer className="h-4 w-4" />
                  {batch.steps[0]?.stepType === "timed" ? (
                    <span dir="ltr">
                      {formatDurationSeconds(batch.steps[0].durationSeconds)}
                    </span>
                  ) : (
                    <span>שלב הזנת ערך — בקרת איכות</span>
                  )}
                </div>
                <div className="mt-8">
                  <Button
                    size="lg"
                    icon={PlayCircle}
                    loading={busy === "start"}
                    onClick={handleStart}
                    className="px-12 text-lg"
                  >
                    התחלת שלב 1
                  </Button>
                  <p className="mt-3 text-xs text-ink-400">
                    הטיימר והתיעוד יתחילו רק לאחר לחיצה — אין הפעלה אוטומטית
                  </p>
                </div>
                <div className="mt-8 flex justify-center">
                  <Button variant="danger" icon={Ban} onClick={() => setAbortOpen(true)}>
                    ביטול אצווה
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ---------- INPUT STEP hero (quality control) ---------- */}
          {batch.status === "active" && current && isInputStep && !isAwaitingStart && (
            <Card className="glow-accent relative overflow-hidden border-amber-300">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-50 to-white" aria-hidden />
              <div className="relative p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="amber">
                    <Beaker className="h-3 w-3" />
                    שלב בקרת איכות — שלב <span className="font-mono">{current.stepIndex + 1}</span> מתוך{" "}
                    <span className="font-mono">{batch.steps.length}</span>
                  </Badge>
                  <span className="font-mono text-xs text-ink-400" dir="ltr">
                    {formatClockMs(elapsedMsOf(current, serverNow))} בשלב
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-black text-ink-100 md:text-[28px]">
                  {current.title}
                </h2>
                {current.instruction && (
                  <p className="mt-2 max-w-2xl leading-relaxed text-ink-300">
                    {current.instruction}
                  </p>
                )}

                <div className="mx-auto mt-7 max-w-md">
                  <label className="mb-2 block text-center text-base font-extrabold text-ink-100">
                    {current.inputLabel ?? current.title}
                  </label>
                  <div className="flex items-stretch gap-2" dir="ltr">
                    <input
                      className="field h-16 flex-1 text-center font-mono text-3xl font-bold tabular-nums"
                      dir="ltr"
                      type={current.inputKind === "number" ? "number" : "text"}
                      inputMode={current.inputKind === "number" ? "decimal" : "text"}
                      step="any"
                      placeholder={current.inputKind === "number" ? "0.0" : "הזינו ערך…"}
                      value={inputValue}
                      autoFocus
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setInputError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleInputSubmit();
                      }}
                      disabled={busy === "advance"}
                    />
                    {current.inputUnit && (
                      <span className="grid w-16 place-items-center rounded-xl border border-ink-600 bg-ink-850 font-mono text-lg font-bold text-ink-300">
                        {current.inputUnit}
                      </span>
                    )}
                  </div>

                  {(current.inputMin !== null || current.inputMax !== null) && (
                    <p className="mt-2 text-center text-xs font-semibold text-ink-400">
                      טווח מותר:{" "}
                      <span className="font-mono" dir="ltr">
                        {current.inputMin ?? "-∞"} – {current.inputMax ?? "+∞"}
                        {current.inputUnit ? ` ${current.inputUnit}` : ""}
                      </span>
                    </p>
                  )}
                  {inputError && (
                    <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm font-semibold text-rose-700">
                      {inputError}
                    </p>
                  )}

                  <Button
                    size="lg"
                    variant="primary"
                    icon={Send}
                    loading={busy === "advance"}
                    disabled={!inputValue.trim()}
                    onClick={handleInputSubmit}
                    className="mt-5 w-full"
                  >
                    {isLastStep ? "שמירת ערך וסגירת אצווה" : "שמירת ערך והתקדמות"}
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
                    <Lock className="h-3.5 w-3.5" />
                    לא ניתן להתקדם בלי לרשום ערך — הערך נשמר לצמיתות לצורכי ביקורת איכות
                  </p>
                </div>

                <div className="mt-7 flex justify-center">
                  <Button variant="danger" icon={Ban} onClick={() => setAbortOpen(true)}>
                    ביטול אצווה
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ---------- TIMED hero: live countdown with liquid fill ---------- */}
          {batch.status === "active" && current && !isInputStep && !isAwaitingStart && (
            <Card
              className={`relative overflow-hidden ${
                ready ? "border-emerald-400" : paused ? "border-amber-300" : ""
              }`}
            >
              {/* Liquid fill animation (fills the card as time elapses) */}
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div
                  className={`absolute inset-x-0 bottom-0 h-full transition-transform duration-300 ease-linear ${
                    paused
                      ? "bg-gradient-to-t from-amber-100 to-amber-50/20"
                      : ready
                        ? "bg-gradient-to-t from-emerald-100 to-emerald-50/20"
                        : "bg-gradient-to-t from-sky-100 to-sky-50/20"
                  }`}
                  style={{ transform: `translateY(${(1 - fill) * 100}%)` }}
                />
              </div>

              <div className="relative p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={ready ? "emerald" : paused ? "amber" : "aqua"}>
                    שלב <span className="font-mono">{current.stepIndex + 1}</span> מתוך{" "}
                    <span className="font-mono">{batch.steps.length}</span>
                  </Badge>
                  {paused && (
                    <Badge tone="amber" dot>
                      הטיימר מושהה
                    </Badge>
                  )}
                  {ready && (
                    <Badge tone="emerald" dot className="animate-pulse-soft">
                      <AlarmClockCheck className="h-3.5 w-3.5" />
                      הזמן הסתיים — ניתן להתקדם
                    </Badge>
                  )}
                </div>

                <h2 className="mt-4 text-2xl font-black text-ink-100 md:text-[28px]">
                  {current.title}
                </h2>
                {current.instruction && (
                  <p className="mt-2 max-w-2xl leading-relaxed text-ink-300">
                    {current.instruction}
                  </p>
                )}

                {/* Countdown */}
                <p
                  dir="ltr"
                  className={`mt-6 text-center font-mono text-7xl font-bold tabular-nums tracking-tight md:text-8xl ${
                    paused ? "text-amber-600" : ready ? "text-emerald-600" : "text-ink-100"
                  }`}
                >
                  {formatClockMs(remaining)}
                </p>

                {/* Step progress bar */}
                <div className="mx-auto mt-5 h-2 max-w-md overflow-hidden rounded-full bg-ink-700/70">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
                      paused ? "bg-amber-500" : ready ? "bg-emerald-500" : "bg-accent-500"
                    }`}
                    style={{ width: `${Math.round(fill * 100)}%` }}
                  />
                </div>

                {/* Controls */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  {paused ? (
                    <Button
                      variant="ghost"
                      icon={Play}
                      loading={busy === "resume"}
                      onClick={() => void run("resume", () => post("resume"))}
                    >
                      המשך טיימר
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      icon={Pause}
                      loading={busy === "pause"}
                      onClick={() => void run("pause", () => post("pause"))}
                    >
                      השהייה
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant={ready ? "success" : "primary"}
                    disabled={!ready}
                    loading={busy === "advance"}
                    icon={ready ? (isLastStep ? Flag : ArrowLeft) : Lock}
                    onClick={handleAdvance}
                  >
                    {isLastStep ? "סיום שלב וסגירת אצווה" : "סיום שלב והתקדמות"}
                  </Button>

                  <Button variant="danger" icon={Ban} onClick={() => setAbortOpen(true)}>
                    ביטול אצווה
                  </Button>
                </div>
                {!ready && (
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
                    <Lock className="h-3.5 w-3.5" />
                    כפתור ההתקדמות נעול וייפתח אוטומטית כשהספירה תגיע ל־
                    <span className="font-mono">00:00</span> — לא ניתן לדלג על שלבים
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* ---------- Completed hero ---------- */}
          {batch.status === "completed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl border border-emerald-300 bg-emerald-50 p-8 text-center shadow-[0_1px_2px_rgb(15_23_42/0.05),0_12px_32px_-16px_rgb(15_23_42/0.14)]"
            >
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 ring-1 ring-emerald-300">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </span>
              <h2 className="mt-4 text-2xl font-black text-ink-100">
                האצווה הושלמה בהצלחה
              </h2>
              <p className="mt-1 text-ink-300">
                כל {batch.steps.length} השלבים בוצעו ונרשמו בהיסטוריית הייצור
              </p>
              <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-3 text-center">
                <SummaryCell label="זמן התחלה" value={formatTime(batch.startedAt)} />
                <SummaryCell
                  label="זמן סיום"
                  value={batch.completedAt ? formatTime(batch.completedAt) : "—"}
                />
                <SummaryCell
                  label="משך כולל"
                  value={formatDurationSeconds(batch.totalDurationSeconds)}
                />
              </div>
              {batch.steps.some((s) => s.inputValue) && (
                <div className="mx-auto mt-4 max-w-lg rounded-xl border border-emerald-200 bg-white px-5 py-4 text-start">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Beaker className="h-3.5 w-3.5" />
                    ערכי בקרת איכות שנרשמו
                  </p>
                  <ul className="mt-2 space-y-1">
                    {batch.steps
                      .filter((s) => s.inputValue)
                      .map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-ink-300">{s.inputLabel ?? s.title}</span>
                          <span className="font-mono font-bold text-ink-100" dir="ltr">
                            {s.inputValue}
                            {s.inputUnit ? ` ${s.inputUnit}` : ""}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/history">
                  <Button variant="ghost">צפייה בהיסטוריה</Button>
                </Link>
                <Link href="/">
                  <Button>חזרה ללוח הייצור</Button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* ---------- Aborted hero ---------- */}
          {batch.status === "aborted" && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-8 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_12px_32px_-16px_rgb(15_23_42/0.14)]">
              <div className="flex flex-col items-center text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-rose-100 ring-1 ring-rose-300">
                  <Ban className="h-9 w-9 text-rose-600" />
                </span>
                <h2 className="mt-4 text-2xl font-black text-ink-100">האצווה בוטלה</h2>
                <div className="mt-4 w-full max-w-lg rounded-xl border border-rose-200 bg-white px-5 py-4">
                  <p className="text-xs font-bold text-rose-600">סיבת הביטול</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-200">
                    {batch.abortReason}
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/history">
                    <Button variant="ghost">צפייה בהיסטוריה</Button>
                  </Link>
                  <Link href="/">
                    <Button variant="primary">חזרה ללוח הייצור</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------- Timeline ---------------------------- */}
          <h3 className="mb-3 mt-8 flex items-center gap-2 text-base font-extrabold text-ink-100">
            <Timer className="h-5 w-5 text-accent-500" />
            רשימת השלבים
          </h3>
          <div className="space-y-3">
            {batch.steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                serverNow={serverNow}
                totalSteps={batch.steps.length}
              />
            ))}
          </div>
        </div>

        {/* ============================= Sidebar ============================= */}
        <aside className="space-y-4 lg:sticky lg:top-8">
          <Card className="p-5">
            <h3 className="text-sm font-extrabold text-ink-300">פרטי האצווה</h3>
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={batch.employeeName} seed={batch.employeeId} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-bold text-ink-100">{batch.employeeName}</p>
                <p className="text-xs text-ink-400">מפעיל/ת האצווה</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 border-t border-ink-700/70 pt-4 text-sm">
              <InfoRow label="נוצרה" value={formatDateTime(batch.startedAt)} mono />
              <InfoRow
                label="זמן מתוכנן"
                value={formatDurationSeconds(plannedTotalMs(batch) / 1000)}
                mono
              />
              <InfoRow
                label={batch.status === "active" ? "זמן שחלף" : "משך כולל"}
                value={
                  batch.status === "active"
                    ? formatClockMs(batchElapsedMs(batch, serverNow))
                    : formatDurationSeconds(batch.totalDurationSeconds)
                }
                mono
              />
              <InfoRow
                label="שלבים שבוצעו"
                value={`${doneCount}/${batch.steps.length}`}
                mono
              />
              {batch.steps.some((s) => s.stepType === "input") && (
                <InfoRow
                  label="מדידות QC"
                  value={String(
                    batch.steps.filter((s) => s.stepType === "input").length,
                  )}
                  mono
                />
              )}
            </dl>

            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-accent-400 to-accent-600 transition-[width] duration-500"
                  style={{
                    width: `${Math.round(batchProgressOf(batch, serverNow) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-end font-mono text-[11px] text-ink-400" dir="ltr">
                {Math.round(batchProgressOf(batch, serverNow) * 100)}%
              </p>
            </div>
          </Card>

          {batch.status === "active" && (
            <Card className="border-amber-200 bg-amber-50 p-4">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-amber-800">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                כללי בטיחות: השלבים מתבצעים ברצף קפדני — שלבים מתוזמנים דורשים טיימר מלא,
                ושלבי בקרת איכות דורשים רישום ערך. הטיימרים מסונכרנים לשרת ולכן שרידים
                גם ברענון העמוד או בסגירת הדפדפן.
              </p>
            </Card>
          )}
        </aside>
      </div>

      {/* --------------------------- Abort dialog --------------------------- */}
      <Modal
        open={abortOpen}
        onClose={busy ? () => {} : () => setAbortOpen(false)}
        title={`ביטול אצווה ${batch.batchNumber}`}
        subtitle="האצווה תועבר לארכיון ההיסטוריה עם סיבת הביטול ולא ניתן יהיה להפעילה שוב"
        maxWidth="max-w-lg"
      >
        <label className="mb-2 block text-sm font-bold text-ink-200">
          סיבת הביטול <span className="text-rose-600">*</span>
        </label>
        <textarea
          className="field min-h-[110px] resize-y"
          placeholder="לדוגמה: נגמר חומר הגלם LABSA במחסן / תקלה במשאבת ההזנה"
          value={abortReason}
          onChange={(e) => {
            setAbortReason(e.target.value);
            setAbortError(null);
          }}
          maxLength={300}
          autoFocus
        />
        {abortError && (
          <p className="mt-2 text-sm font-semibold text-rose-600">{abortError}</p>
        )}
        <div className="mt-5 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setAbortOpen(false)}
            disabled={busy !== null}
          >
            חזרה
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={busy === "abort"}
            onClick={handleAbort}
          >
            אישור ביטול האצווה
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------ Sub components ----------------------------- */

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-white px-3 py-3">
      <p className="text-[11px] font-semibold text-ink-400">{label}</p>
      <p className="mt-1 font-mono text-base font-bold tabular-nums text-ink-100" dir="ltr">
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd
        className={`font-semibold text-ink-100 ${mono ? "font-mono tabular-nums" : ""}`}
        dir="ltr"
      >
        {value}
      </dd>
    </div>
  );
}

function StepRow({
  step,
  serverNow,
  totalSteps,
}: {
  step: StepDTO;
  serverNow: number;
  totalSteps: number;
}) {
  const isCompleted = step.status === "completed";
  const isActive = step.status === "active";
  const isPaused = step.status === "paused";
  const isInput = step.stepType === "input";
  const remaining = remainingMsOf(step, serverNow);

  return (
    <div
      className={`flex items-start gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
        isCompleted
          ? "border-emerald-200 bg-emerald-50/60"
          : isActive
            ? isInput
              ? "border-amber-300 bg-amber-50/70"
              : "glow-accent border-accent-400 bg-sky-50/60"
            : isPaused
              ? "border-amber-300 bg-amber-50/70"
              : "border-ink-700/60 bg-white opacity-60"
      }`}
    >
      <span
        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
          isCompleted
            ? "bg-emerald-100 text-emerald-600"
            : isActive
              ? isInput
                ? "bg-amber-100 text-amber-600"
                : "bg-sky-100 text-accent-600"
              : isPaused
                ? "bg-amber-100 text-amber-600"
                : "bg-ink-700/70 text-ink-500"
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : isInput ? (
          <Beaker className="h-5 w-5" />
        ) : isActive ? (
          <Timer className="h-5 w-5" />
        ) : isPaused ? (
          <Pause className="h-4.5 w-4.5" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p
            className={`font-bold ${
              isCompleted
                ? "text-emerald-800/80 line-through decoration-emerald-400/60"
                : isActive || isPaused
                  ? "text-ink-100"
                  : "text-ink-400"
            }`}
          >
            <span className="font-mono text-xs text-ink-500">
              {step.stepIndex + 1}.
            </span>{" "}
            {step.title}
          </p>
          {!isInput && (
            <span className="font-mono text-[11px] text-ink-500" dir="ltr">
              {formatDurationSeconds(step.durationSeconds)}
            </span>
          )}
          {isInput && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
              בקרת איכות
            </span>
          )}
        </div>
        {step.instruction && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">
            {step.instruction}
          </p>
        )}
        {(isActive || isPaused) && !isInput && (
          <p
            className={`mt-1.5 font-mono text-lg font-bold tabular-nums ${
              isPaused
                ? "text-amber-600"
                : remaining <= 0
                  ? "text-emerald-600"
                  : "text-accent-600"
            }`}
            dir="ltr"
            style={{ textAlign: "start" }}
          >
            {formatClockMs(remaining)}
          </p>
        )}
        {isInput && isActive && (
          <p className="mt-1.5 text-[13px] font-bold text-amber-700">
            {step.inputLabel ?? "הזינו ערך"} — ממתין להזנה
          </p>
        )}
        {isCompleted && step.inputValue && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
            <Beaker className="h-3.5 w-3.5" />
            {step.inputLabel ?? "ערך"}:{" "}
            <span className="font-mono" dir="ltr">
              {step.inputValue}
              {step.inputUnit ? ` ${step.inputUnit}` : ""}
            </span>
          </p>
        )}
        {isCompleted && step.completedAt && (
          <p className="mt-1 text-[11px] text-emerald-700/70">
            הושלם ב־<span className="font-mono">{formatTime(step.completedAt)}</span>
          </p>
        )}
        {!isCompleted && !isActive && !isPaused && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
            <Lock className="h-3 w-3" />
            {step.stepIndex === 0 ? "יופעל בלחיצה על התחלת שלב 1" : "ייפתח לאחר השלמת השלב הקודם"}
          </p>
        )}
      </div>

      <span className="mt-1 hidden shrink-0 font-mono text-xs text-ink-500 sm:block" dir="ltr">
        {step.stepIndex + 1}/{totalSteps}
      </span>
    </div>
  );
}
