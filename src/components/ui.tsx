"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X, type LucideIcon } from "lucide-react";
import {
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

/* ---------------------------------- Badge --------------------------------- */

type Tone = "aqua" | "emerald" | "amber" | "rose" | "slate" | "navy";

const TONE_CLASSES: Record<Tone, string> = {
  aqua: "bg-sky-50 text-sky-700 border-sky-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  navy: "bg-slate-800 text-white border-slate-700",
};

export function Badge({
  tone = "slate",
  children,
  className = "",
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-ink-600/70 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.05),0_12px_32px_-16px_rgb(15_23_42/0.14)] ${className}`}
    >
      {children}
    </div>
  );
}

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "ghost" | "danger" | "subtle" | "success";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-600 text-white hover:bg-accent-500 shadow-md shadow-sky-700/20 disabled:shadow-none",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-700/20 disabled:shadow-none",
  ghost:
    "border border-ink-600 bg-white text-ink-200 hover:bg-ink-800 hover:border-ink-500",
  subtle: "text-ink-400 hover:bg-ink-700/60 hover:text-ink-100",
  danger:
    "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-400",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const sizes = {
    sm: "h-9 px-3.5 text-[13px] rounded-lg gap-1.5",
    md: "h-11 px-5 text-sm rounded-xl gap-2",
    lg: "h-[52px] px-7 text-base rounded-xl gap-2.5",
  };
  return (
    <button
      className={`inline-flex select-none items-center justify-center font-bold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin" />
      ) : Icon ? (
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
      ) : null}
      {children}
    </button>
  );
}

/* ---------------------------------- Modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-100/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={`flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl border border-ink-600/60 bg-white shadow-2xl shadow-ink-400/40 sm:rounded-3xl`}
          >
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-4 border-b border-ink-700/70 px-6 py-4">
                <div>
                  {title && (
                    <h2 className="text-lg font-extrabold text-ink-100">{title}</h2>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-700/50 hover:text-ink-100"
                  aria-label="סגירה"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- ConfirmDialog ------------------------------ */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "אישור",
  busy = false,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} maxWidth="max-w-md">
      <div className="text-center">
        <h3 className="text-lg font-extrabold text-ink-100">{title}</h3>
        <div className="mt-2 text-sm leading-relaxed text-ink-300">{message}</div>
        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={busy}
          >
            ביטול
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------------- Avatar --------------------------------- */

const AVATAR_GRADIENTS = [
  "from-sky-400 to-blue-600",
  "from-cyan-400 to-teal-600",
  "from-violet-400 to-purple-600",
  "from-amber-400 to-orange-600",
  "from-rose-400 to-pink-600",
  "from-emerald-400 to-green-600",
  "from-blue-400 to-indigo-600",
  "from-fuchsia-400 to-fuchsia-600",
];

export function Avatar({
  name,
  seed,
  size = "md",
  className = "",
}: {
  name: string;
  seed?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hash =
    seed ??
    [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const gradient = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };
  return (
    <span
      className={`grid shrink-0 select-none place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${gradient} ${sizes[size]} ${className}`}
    >
      {initials}
    </span>
  );
}

/* ------------------------------- EmptyState ------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-500/60 bg-white/60 px-6 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-200">
        <Icon className="h-8 w-8" strokeWidth={1.8} />
      </span>
      <h3 className="mt-5 text-lg font-extrabold text-ink-100">{title}</h3>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-ink-400">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* -------------------------------- PageHeader ------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-100 md:text-[28px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
