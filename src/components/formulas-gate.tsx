"use client";

import { FORMULAS_RELOCK_EVENT } from "@/components/app-shell";
import { Button } from "@/components/ui";
import { api, errorMessage, fetcher } from "@/lib/api";
import { motion, useAnimationControls } from "framer-motion";
import { FlaskConical, KeyRound, ShieldAlert } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import useSWR from "swr";

/**
 * Level-2 gate around the Formula Management section.
 * Any navigation into /formulas* renders a lock screen until the master
 * company password is re-entered. The API itself is independently guarded,
 * so the lock screen is a UX layer on top of real server enforcement.
 */
export function FormulasGate({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR<{ unlocked: boolean }>(
    "/api/auth/formulas-status",
    fetcher,
  );

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const controls = useAnimationControls();

  // The app shell emits a relock event whenever the מתכונים nav item is
  // clicked or the user leaves the section → slam the gate shut instantly.
  useEffect(() => {
    const onRelock = () => {
      void mutate({ unlocked: false }, { revalidate: false });
      setPassword("");
      setFormError(null);
    };
    window.addEventListener(FORMULAS_RELOCK_EVENT, onRelock);
    return () => window.removeEventListener(FORMULAS_RELOCK_EVENT, onRelock);
  }, [mutate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.post("/api/auth/formulas-unlock", { password });
      setPassword("");
      await mutate({ unlocked: true }, { revalidate: false });
    } catch (err) {
      setFormError(errorMessage(err));
      setPassword("");
      void controls.start({
        x: [0, -14, 14, -10, 10, -6, 6, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md pt-16">
        <div className="skeleton h-[380px]" />
      </div>
    );
  }

  if (error || !data?.unlocked) {
    return (
      <div className="mx-auto flex max-w-md justify-center pt-10 md:pt-16">
        <motion.div
          animate={controls}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl border border-ink-600/70 bg-white p-7 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.22)]"
        >
          <div className="flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
              <ShieldAlert className="h-8 w-8" strokeWidth={2} />
            </span>
            <h1 className="mt-4 text-xl font-black text-ink-100">
              אזור מוגבל — ניהול מתכונים
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-400">
              גישה לצפייה, יצירה ועריכה של מתכוני ייצור מותרת למפקחים בלבד.
              <br />
              נדרשת הזנת סיסמת החברה מחדש בכל כניסה לאזור.
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                className="field ps-10"
                dir="ltr"
                style={{ textAlign: "start" }}
                type="password"
                placeholder="סיסמת החברה"
                autoComplete="off"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </div>
            {formError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-700">
                {formError}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!password}
              loading={busy}
              icon={FlaskConical}
            >
              פתיחת אזור המתכונים
            </Button>
            <p className="pt-1 text-center text-xs text-ink-500">
              האזור יינעל מחדש אוטומטית עם היציאה ממנו — ללא שמירת הרשאה קבועה
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
