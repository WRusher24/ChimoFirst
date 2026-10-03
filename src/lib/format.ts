/**
 * Centralized formatting helpers.
 * Every number/date displayed in the UI is rendered with Western digits (0-9)
 * by construction — we never rely on locale-dependent numbering systems.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Compact latin digit number formatter (thousands separators). */
const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatNumber(n: number): string {
  return nf.format(n);
}

/** mm:ss or h:mm:ss from a millisecond value (used by live countdowns). */
export function formatClockMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** mm:ss or h:mm:ss from whole seconds (durations in tables, formula cards). */
export function formatDurationSeconds(total: number | null | undefined): string {
  if (total == null || Number.isNaN(total)) return "—";
  const t = Math.floor(total);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

/** DD/MM/YYYY — always Western digits. */
export function formatDate(d: string | Date): string {
  const date = toDate(d);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** HH:MM (24h) — always Western digits. */
export function formatTime(d: string | Date): string {
  const date = toDate(d);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** HH:MM:SS (24h) — always Western digits. */
export function formatTimeWithSeconds(d: string | Date): string {
  const date = toDate(d);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
}

/** DD/MM/YYYY · HH:MM */
export function formatDateTime(d: string | Date): string {
  return `${formatDate(d)} · ${formatTime(d)}`;
}

/** YYYY-MM-DD HH:MM — Excel-friendly CSV timestamp. */
export function formatCsvDateTime(d: string | Date): string {
  const date = toDate(d);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Human duration label in Hebrew for long durations, e.g. "שעה ו־12 דקות". */
export function formatDurationLong(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return "—";
  const t = Math.floor(totalSeconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} שעות ו־${m} דקות` : `${h} שעות`;
  if (m >= 1) {
    const s = t % 60;
    return s > 0 ? `${m} דקות ו־${s} שניות` : `${m} דקות`;
  }
  return `${t} שניות`;
}
