"use client";

import { api, errorMessage } from "@/lib/api";
import { motion, useAnimationControls } from "framer-motion";
import { Droplets, Loader2, LockKeyhole, ShieldCheck, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

/**
 * Company Login (Level-1 authentication). Every visitor must present the
 * master company username & password before any factory screen is reachable.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controls = useAnimationControls();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { username: username.trim(), password });
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPassword("");
      void controls.start({
        x: [0, -14, 14, -10, 10, -6, 6, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-lg shadow-sky-600/25">
            <Droplets className="h-9 w-9" strokeWidth={2.2} />
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-ink-100">כימו</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-400">
            CHIMO MFG · BATCH OS
          </p>
        </div>

        {/* Card */}
        <motion.div
          animate={controls}
          className="rounded-3xl border border-ink-600/70 bg-white p-7 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_24px_60px_-24px_rgb(15_23_42/0.25)]"
        >
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-200">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-ink-100">כניסה ארגונית מאובטחת</h2>
              <p className="text-xs text-ink-400">
                הגישה מוגבלת לעובדי החברה המורשים בלבד
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-200">
                שם משתמש ארגוני
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  className="field ps-10"
                  dir="ltr"
                  style={{ textAlign: "start" }}
                  placeholder="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-200">סיסמה</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  className="field ps-10"
                  dir="ltr"
                  style={{ textAlign: "start" }}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-sm font-semibold text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !username.trim() || !password}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-600 text-base font-bold text-white shadow-md shadow-sky-700/25 transition-all hover:bg-accent-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              כניסה למערכת
            </button>
          </form>
        </motion.div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          כל הפעולות במערכת מתועדות ומשויכות לעובד המבצע
        </p>
      </motion.div>
    </div>
  );
}
