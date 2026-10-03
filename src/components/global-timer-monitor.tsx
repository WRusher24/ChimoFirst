"use client";

import { useChime } from "@/components/providers";
import { fetcher } from "@/lib/api";
import { currentStepOf, remainingMsOf } from "@/lib/timers";
import type { DashboardResponse } from "@/lib/types";
import { useServerNow } from "@/lib/use-server-now";
import { useEffect, useRef } from "react";
import useSWR from "swr";

/**
 * GlobalTimerMonitor — mounted once inside the AppShell, so it stays alive on
 * EVERY page (dashboard, history, employees, formulas, batch detail, …).
 *
 * It polls the dashboard feed and, using server-synced time, evaluates every
 * active batch's running timed step. The instant any step's countdown reaches
 * zero, the 3-second chime fires globally — regardless of where the user is.
 * Each step is announced exactly once, and the chime itself refuses to
 * overlap (see playChime in providers).
 */
export function GlobalTimerMonitor() {
  const { playChime } = useChime();

  // SWR shares the "/api/dashboard" cache with the dashboard page itself,
  // so this costs no extra requests while viewing the grid.
  const { data } = useSWR<DashboardResponse>("/api/dashboard", fetcher, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
  });
  const serverNow = useServerNow(data?.serverTime, 250);

  const announcedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;

    // Keys of steps that are still actively running — anything else gets
    // pruned so a completed/advanced step re-arms cleanly for the next one.
    const liveKeys = new Set<string>();
    for (const b of data.batches) {
      const cur = currentStepOf(b);
      if (cur) liveKeys.add(`${b.id}:${cur.id}`);
    }
    for (const key of announcedRef.current) {
      if (!liveKeys.has(key)) announcedRef.current.delete(key);
    }

    for (const batch of data.batches) {
      if (batch.status !== "active") continue;
      const cur = currentStepOf(batch);
      if (!cur || cur.status !== "active" || cur.stepType !== "timed") continue;

      const key = `${batch.id}:${cur.id}`;
      if (remainingMsOf(cur, serverNow) <= 0 && !announcedRef.current.has(key)) {
        announcedRef.current.add(key);
        playChime();
      }
    }
  }, [data, serverNow, playChime]);

  return null;
}
