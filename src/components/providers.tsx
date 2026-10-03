"use client";

import { getChimeUrl } from "@/lib/chime";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Chime — a real HTML <audio> element playing a synthesized WAV chime */
/* ------------------------------------------------------------------ */

const ChimeContext = createContext<{ playChime: () => void }>({
  playChime: () => {},
});

export function useChime() {
  return useContext(ChimeContext);
}

function ChimeProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(getChimeUrl());
  }, []);

  // Unlock autoplay restrictions on the first user interaction.
  useEffect(() => {
    if (!src) return;
    const unlock = () => {
      const el = audioRef.current;
      if (!el) return;
      el.muted = true;
      el.play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.muted = false;
        })
        .catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [src]);

  const playChime = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    try {
      // Never overlap: if the previous alert is still sounding, skip.
      if (!el.paused && !el.ended && el.currentTime > 0) return;
      el.currentTime = 0;
      void el.play().catch(() => {});
    } catch {
      /* audio not ready yet */
    }
  }, []);

  return (
    <ChimeContext.Provider value={{ playChime }}>
      {children}
      {src ? (
        <audio ref={audioRef} src={src} preload="auto" className="hidden" />
      ) : null}
    </ChimeContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />,
  error: <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />,
  info: <Info className="h-5 w-5 shrink-0 text-sky-400" />,
};

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-slate-700 bg-ink-100/95 px-4 py-3 text-white shadow-2xl shadow-ink-400/50 backdrop-blur"
            >
              {ICONS[t.kind]}
              <p className="text-sm leading-snug">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChimeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ChimeProvider>
  );
}
