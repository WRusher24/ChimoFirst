"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a ticking "now" synchronized to the server clock.
 * Every API payload carries `serverTime`; we derive the client↔server offset
 * from it so countdowns are rendered against authoritative server timestamps
 * and survive refreshes without drift.
 */
export function useServerNow(serverTime: string | undefined, tickMs = 200): number {
  const offsetRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (serverTime) {
      offsetRef.current = new Date(serverTime).getTime() - Date.now();
      setNow(Date.now()); // re-render immediately with the fresh offset
    }
  }, [serverTime]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);

  return now + offsetRef.current;
}
