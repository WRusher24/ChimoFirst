import type { BatchDTO, StepDTO } from "./types";

/**
 * Pure timer math, shared by server routes (authoritative validation) and the
 * client (live rendering). All computation is timestamp based, so countdowns
 * survive page refreshes and closed tabs with zero drift.
 */

/** Elapsed milliseconds of a step at a given (server-synced) point in time. */
export function elapsedMsOf(step: StepDTO, serverNow: number): number {
  if (step.status === "completed") return step.durationSeconds * 1000;
  if (step.status === "active" && step.startedAt) {
    return (
      step.elapsedMs + (serverNow - new Date(step.startedAt).getTime())
    );
  }
  return step.elapsedMs;
}

/** Remaining milliseconds of a step (may go below zero when overdue). */
export function remainingMsOf(step: StepDTO, serverNow: number): number {
  return step.durationSeconds * 1000 - elapsedMsOf(step, serverNow);
}

/** The step currently being executed (active or paused), if any. */
export function currentStepOf(batch: BatchDTO): StepDTO | undefined {
  return batch.steps.find((s) => s.status === "active" || s.status === "paused");
}

/**
 * The step the worker should act on next: the running one if present,
 * otherwise the first pending step (batch freshly created, awaiting the
 * manual "start step 1" click).
 */
export function actionableStepOf(batch: BatchDTO): StepDTO | undefined {
  return batch.steps.find((s) => s.status !== "completed");
}

/** True when the batch was created but step 1 was not started yet. */
export function awaitingManualStart(batch: BatchDTO): boolean {
  const first = batch.steps.find((s) => s.status !== "completed");
  return (
    batch.status === "active" &&
    !!first &&
    first.stepIndex === 0 &&
    first.status === "pending"
  );
}

/** Progress weight of a step: input steps count as a fixed 30s slice. */
function weightMsOf(step: StepDTO): number {
  return Math.max(step.durationSeconds * 1000, step.stepType === "input" ? 30000 : 0);
}

export function completedStepsCount(batch: BatchDTO): number {
  return batch.steps.filter((s) => s.status === "completed").length;
}

/** Planned total duration (timed steps only) in milliseconds. */
export function plannedTotalMs(batch: BatchDTO): number {
  return batch.steps.reduce((sum, s) => sum + s.durationSeconds * 1000, 0);
}

/** Overall weighted progress of a batch (0..1), including the running step. */
export function batchProgressOf(batch: BatchDTO, serverNow: number): number {
  const total = batch.steps.reduce((sum, s) => sum + weightMsOf(s), 0);
  if (total <= 0) return 0;
  let done = 0;
  for (const s of batch.steps) {
    if (s.status === "completed") done += weightMsOf(s);
    else done += Math.min(weightMsOf(s), elapsedMsOf(s, serverNow));
  }
  return Math.min(1, done / total);
}

/** Actually elapsed wall-clock time of a batch (start → finish or now). */
export function batchElapsedMs(batch: BatchDTO, serverNow: number): number {
  const start = new Date(batch.startedAt).getTime();
  const end = batch.completedAt
    ? new Date(batch.completedAt).getTime()
    : serverNow;
  return Math.max(0, end - start);
}
