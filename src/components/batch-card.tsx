"use client";

import { Avatar, Badge } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatClockMs, formatTime } from "@/lib/format";
import {
  actionableStepOf,
  awaitingManualStart,
  batchElapsedMs,
  batchProgressOf,
  currentStepOf,
  elapsedMsOf,
  remainingMsOf,
} from "@/lib/timers";
import type { BatchDTO } from "@/lib/types";
import { useToast } from "@/components/providers";
import { motion } from "framer-motion";
import {
  AlarmClockCheck,
  ArrowLeft,
  Beaker,
  Loader2,
  Pause,
  Play,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function BatchCard({
  batch,
  serverNow,
  onChanged,
}: {
  batch: BatchDTO;
  serverNow: number;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [actionBusy, setActionBusy] = useState(false);

  const current = currentStepOf(batch);
  const actionable = actionableStepOf(batch);
  const isAwaitingStart = awaitingManualStart(batch);
  const remaining = current ? remainingMsOf(current, serverNow) : 0;
  const paused = current?.status === "paused";
  const isInputStep = current?.stepType === "input";
  const ready = !paused && current != null && !isInputStep && remaining <= 0;
  const progress = batchProgressOf(batch, serverNow);
  const doneCount = batch.steps.filter((s) => s.status === "completed").length;
  const totalCount = batch.steps.length;

  const togglePause = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await api.post(`/api/batches/${batch.id}/${paused ? "resume" : "pause"}`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_12px_32px_-16px_rgb(15_23_42/0.14)] transition-colors duration-200 ${
        ready
          ? "border-emerald-400"
          : paused
            ? "border-amber-400"
            : isAwaitingStart
              ? "border-sky-300"
              : "border-ink-600/70 hover:border-accent-400"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm font-bold tracking-wider text-accent-600">
          {batch.batchNumber}
        </span>
        {isAwaitingStart ? (
          <Badge tone="aqua" dot>
            מוכנה להתחלה
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
        )}
      </div>

      {/* Formula + employee */}
      <h3 className="mt-3 text-[17px] font-extrabold leading-snug text-ink-100">
        {batch.formulaName}
      </h3>
      <div className="mt-2 flex items-center gap-2 text-sm text-ink-300">
        <Avatar name={batch.employeeName} seed={batch.employeeId} size="sm" />
        <span className="truncate font-medium">{batch.employeeName}</span>
        <span className="text-ink-500">·</span>
        <span className="font-mono text-xs text-ink-400">
          {formatTime(batch.startedAt)}
        </span>
      </div>

      {/* Current step */}
      <div
        className={`mt-4 rounded-xl border px-4 py-3 ${
          isAwaitingStart
            ? "border-sky-200 bg-sky-50"
            : paused
              ? "border-amber-200 bg-amber-50"
              : ready
                ? "border-emerald-200 bg-emerald-50"
                : isInputStep
                  ? "border-amber-200 bg-amber-50"
                  : "border-ink-700/70 bg-ink-850"
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-xs text-ink-400">
          <span className="font-semibold">
            שלב <span className="font-mono">{Math.min(doneCount + 1, totalCount)}</span> מתוך{" "}
            <span className="font-mono">{totalCount}</span>
          </span>
          {ready && (
            <span className="flex items-center gap-1 font-bold text-emerald-600">
              <AlarmClockCheck className="h-3.5 w-3.5" />
              הזמן הסתיים
            </span>
          )}
          {isInputStep && (
            <span className="flex items-center gap-1 font-bold text-amber-600">
              <Beaker className="h-3.5 w-3.5" />
              בקרת איכות
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-bold text-ink-100">
          {actionable ? actionable.title : "—"}
        </p>
        {isAwaitingStart ? (
          <p className="mt-1.5 flex items-center gap-2 text-2xl font-bold text-accent-600">
            <PlayCircle className="h-7 w-7" />
            <span className="text-base font-bold">ממתינה ללחיצה על התחלה</span>
          </p>
        ) : isInputStep ? (
          <p className="mt-1 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-amber-700">זמן שהושקע בשלב</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-amber-700" dir="ltr">
              {current ? formatClockMs(elapsedMsOf(current, serverNow)) : "00:00"}
            </span>
          </p>
        ) : (
          <p
            className={`mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight ${
              paused ? "text-amber-600" : ready ? "text-emerald-600" : "text-ink-100"
            }`}
            dir="ltr"
            style={{ textAlign: "end" }}
          >
            {current ? formatClockMs(remaining) : "00:00"}
          </p>
        )}
      </div>

      {/* Overall progress */}
      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              paused
                ? "bg-amber-500"
                : "bg-gradient-to-l from-accent-400 to-accent-600"
            }`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[11px] text-ink-500">
          <span dir="ltr">{Math.round(progress * 100)}%</span>
          <span dir="ltr">{formatClockMs(batchElapsedMs(batch, serverNow))}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-ink-700/70 pt-4">
        {current && !isInputStep && !isAwaitingStart && (
          <button
            onClick={togglePause}
            disabled={actionBusy}
            className={`grid h-10 w-10 place-items-center rounded-xl border transition-all active:scale-95 disabled:opacity-40 ${
              paused
                ? "border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                : "border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
            }`}
            aria-label={paused ? "המשך טיימר" : "השהה טיימר"}
            title={paused ? "המשך טיימר" : "השהה טיימר"}
          >
            {actionBusy ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : paused ? (
              <Play className="h-[18px] w-[18px]" />
            ) : (
              <Pause className="h-[18px] w-[18px]" />
            )}
          </button>
        )}
        <Link
          href={`/batches/${batch.id}`}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink-800 text-sm font-bold text-ink-100 transition-colors hover:bg-sky-50 hover:text-accent-600"
        >
          {isAwaitingStart ? "פתיחה והתחלה" : "ניהול אצווה"}
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        </Link>
      </div>
    </motion.article>
  );
}
