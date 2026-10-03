"use client";

import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { formatDateTime, formatDurationSeconds } from "@/lib/format";
import type { HistoryResponse, HistoryRowDTO } from "@/lib/types";
import {
  Archive,
  Ban,
  Beaker,
  CheckCircle2,
  Download,
  RotateCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

type StatusFilter = "all" | "completed" | "aborted";

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "הכל" },
  { key: "completed", label: "הושלמו" },
  { key: "aborted", label: "בוטלו" },
];

export function HistoryClient() {
  const { data, error, isLoading, mutate } = useSWR<HistoryResponse>(
    "/api/history",
    fetcher,
    { refreshInterval: 15000 },
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.batchNumber.toLowerCase().includes(q) ||
        r.formulaName.toLowerCase().includes(q) ||
        r.employeeName.toLowerCase().includes(q) ||
        (r.abortReason ?? "").toLowerCase().includes(q) ||
        r.inputs.some((inp) => `${inp.label}${inp.value}`.toLowerCase().includes(q))
      );
    });
  }, [data, query, filter]);

  const totals = useMemo(() => {
    const all = data?.rows ?? [];
    return {
      all: all.length,
      completed: all.filter((r) => r.status === "completed").length,
      aborted: all.filter((r) => r.status === "aborted").length,
    };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="היסטוריית ייצור"
        subtitle="ארכיון קבוע של כל האצוות — כולל ערכי בקרת איכות שנרשמו — זמין לייצוא בכל עת"
        actions={
          <a href="/api/history/export" download>
            <Button icon={Download} variant="success" size="lg">
              ייצוא CSV
            </Button>
          </a>
        }
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            className="field ps-10"
            placeholder="חיפוש לפי מספר אצווה, מתכון, עובד או ערך QC…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 rounded-xl border border-ink-600/70 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                filter === f.key
                  ? "bg-sky-50 text-accent-600 ring-1 ring-sky-200"
                  : "text-ink-400 hover:text-ink-100"
              }`}
            >
              {f.label}{" "}
              <span className="font-mono text-xs opacity-70">
                {f.key === "all"
                  ? totals.all
                  : f.key === "completed"
                    ? totals.completed
                    : totals.aborted}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center">
          <p className="font-bold text-rose-700">לא ניתן לטעון את ההיסטוריה</p>
          <Button variant="ghost" icon={RotateCw} onClick={() => mutate()}>
            נסו שוב
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={query || filter !== "all" ? "לא נמצאו תוצאות מתאימות" : "ההיסטוריה עדיין ריקה"}
          hint={
            query || filter !== "all"
              ? "נסו לשנות את נוסח החיפוש או את המסנן."
              : "אצוות שיושלמו או יבוטלו יופיעו כאן באופן אוטומטי ויישמרו לצמיתות."
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-ink-600/70 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-600/70 bg-ink-850/70 text-xs font-bold text-ink-400">
                  <th className="px-4 py-3 text-start font-bold">מספר אצווה</th>
                  <th className="px-4 py-3 text-start font-bold">מתכון</th>
                  <th className="px-4 py-3 text-start font-bold">עובד/ת</th>
                  <th className="px-4 py-3 text-start font-bold">התחלה</th>
                  <th className="px-4 py-3 text-start font-bold">סיום</th>
                  <th className="px-4 py-3 text-start font-bold">משך כולל</th>
                  <th className="px-4 py-3 text-start font-bold">סטטוס</th>
                  <th className="px-4 py-3 text-start font-bold">בקרת איכות / הערות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/60">
                {rows.map((r) => (
                  <HistoryTableRow key={r.id} row={r} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/batches/${r.id}`}
                className="block rounded-2xl border border-ink-600/70 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-accent-600">
                    {r.batchNumber}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 font-bold text-ink-100">{r.formulaName}</p>
                <p className="mt-1 text-xs text-ink-400">{r.employeeName}</p>
                {r.inputs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.inputs.map((inp, i) => (
                      <Badge key={i} tone="aqua">
                        <Beaker className="h-3 w-3" />
                        {inp.label}: <span className="font-mono">{inp.value}{inp.unit ? ` ${inp.unit}` : ""}</span>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-between border-t border-ink-700/60 pt-3 font-mono text-xs text-ink-400">
                  <span dir="ltr">{formatDateTime(r.startedAt)}</span>
                  <span dir="ltr" className="font-bold text-ink-100">
                    {formatDurationSeconds(r.totalDurationSeconds)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "completed" | "aborted" | "active" }) {
  if (status === "completed")
    return (
      <Badge tone="emerald" dot>
        <CheckCircle2 className="h-3 w-3" />
        הושלמה
      </Badge>
    );
  if (status === "aborted")
    return (
      <Badge tone="rose" dot>
        <Ban className="h-3 w-3" />
        בוטלה
      </Badge>
    );
  return (
    <Badge tone="aqua" dot>
      פעילה
    </Badge>
  );
}

function HistoryTableRow({ row: r }: { row: HistoryRowDTO }) {
  return (
    <tr className="transition-colors hover:bg-sky-50/40">
      <td className="px-4 py-3.5">
        <Link
          href={`/batches/${r.id}`}
          className="font-mono font-bold text-accent-600 underline-offset-4 hover:underline"
        >
          {r.batchNumber}
        </Link>
      </td>
      <td className="px-4 py-3.5 font-semibold text-ink-100">{r.formulaName}</td>
      <td className="px-4 py-3.5 text-ink-300">{r.employeeName}</td>
      <td className="px-4 py-3.5 font-mono text-xs text-ink-400" dir="ltr" style={{ textAlign: "start" }}>
        {r.completedAt ? formatDateTime(r.startedAt) : formatDateTime(r.startedAt)}
      </td>
      <td className="px-4 py-3.5 font-mono text-xs text-ink-400" dir="ltr" style={{ textAlign: "start" }}>
        {r.completedAt ? formatDateTime(r.completedAt) : "—"}
      </td>
      <td className="px-4 py-3.5 font-mono text-xs font-bold text-ink-100" dir="ltr" style={{ textAlign: "start" }}>
        {formatDurationSeconds(r.totalDurationSeconds)}
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={r.status} />
      </td>
      <td className="max-w-[260px] px-4 py-3.5">
        {r.inputs.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {r.inputs.map((inp, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700"
                title={`${inp.stepTitle}: ${inp.label} = ${inp.value}${inp.unit ? ` ${inp.unit}` : ""}`}
              >
                <Beaker className="h-3 w-3" />
                {inp.label}:{" "}
                <span className="font-mono" dir="ltr">
                  {inp.value}
                  {inp.unit ? ` ${inp.unit}` : ""}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-ink-500">{r.abortReason ?? "—"}</span>
        )}
      </td>
    </tr>
  );
}
