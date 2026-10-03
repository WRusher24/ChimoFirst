"use client";

import { motion, useAnimationControls } from "framer-motion";
import { Delete, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * Factory-floor PIN pad: oversized touch targets, keyboard support,
 * auto-submit on the 4th digit, and a shake animation on failure.
 */
export function PinPad({
  onSubmit,
  busy = false,
  errorNonce = 0,
  disabled = false,
}: {
  onSubmit: (pin: string) => void;
  busy?: boolean;
  errorNonce?: number;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState("");
  const controls = useAnimationControls();

  useEffect(() => {
    if (errorNonce > 0) {
      setDigits("");
      void controls.start({
        x: [0, -14, 14, -10, 10, -6, 6, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      });
    }
  }, [errorNonce, controls]);

  const push = (d: string) => {
    if (busy || disabled) return;
    const next = (digits + d).slice(0, 4);
    setDigits(next);
    if (next.length === 4) onSubmit(next);
  };

  const backspace = () => {
    if (busy || disabled) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  const clear = () => {
    if (busy || disabled) return;
    setDigits("");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) push(e.key);
      else if (e.key === "Backspace") backspace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, busy, disabled]);

  return (
    <motion.div animate={controls} className="mx-auto w-full max-w-[300px]">
      {/* Digit indicators */}
      <div className="mb-6 flex items-center justify-center gap-4" dir="ltr">
        {[0, 1, 2, 3].map((i) => {
          const filled = i < digits.length;
          return (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-all duration-150 ${
                filled
                  ? "scale-110 border-accent-500 bg-accent-500 shadow-[0_0_14px_rgba(2,132,199,0.45)]"
                  : "border-ink-500 bg-transparent"
              }`}
            />
          );
        })}
      </div>

      {/* Key grid */}
      <div className="grid grid-cols-3 gap-2.5" dir="ltr">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => push(k)}
            disabled={busy || disabled}
            className="grid h-14 place-items-center rounded-xl border border-ink-600 bg-white font-mono text-2xl font-semibold text-ink-100 shadow-sm transition-all duration-100 hover:border-accent-500 hover:bg-sky-50 active:scale-95 disabled:opacity-40"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          disabled={busy || disabled}
          className="grid h-14 place-items-center rounded-xl text-sm font-bold text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100 active:scale-95 disabled:opacity-40"
        >
          ניקוי
        </button>
        <button
          type="button"
          onClick={() => push("0")}
          disabled={busy || disabled}
          className="grid h-14 place-items-center rounded-xl border border-ink-600 bg-white font-mono text-2xl font-semibold text-ink-100 shadow-sm transition-all duration-100 hover:border-accent-500 hover:bg-sky-50 active:scale-95 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : "0"}
        </button>
        <button
          type="button"
          onClick={backspace}
          disabled={busy || disabled}
          aria-label="מחיקה"
          className="grid h-14 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100 active:scale-95 disabled:opacity-40"
        >
          <Delete className="h-6 w-6" />
        </button>
      </div>
    </motion.div>
  );
}
