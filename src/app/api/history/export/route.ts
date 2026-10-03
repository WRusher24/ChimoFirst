import { db } from "@/db";
import { batches, batchSteps, employees } from "@/db/schema";
import { formatCsvDateTime } from "@/lib/format";
import { and, asc, desc, inArray, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

function escapeCsvCell(value: string | number | null | undefined): string {
  const v = value == null ? "" : String(value);
  return `"${v.replaceAll('"', '""')}"`;
}

/**
 * Download the full production log as a CSV file (Hebrew headers, UTF-8 BOM).
 * Includes every recorded quality-control input (e.g. measured pH levels)
 * so the file is audit-ready.
 */
export async function GET() {
  const rows = await db
    .select()
    .from(batches)
    .where(isNotNull(batches.completedAt))
    .orderBy(desc(batches.completedAt))
    .limit(5000);

  const employeeIds = [...new Set(rows.map((b) => b.employeeId))];
  const employeeRows = employeeIds.length
    ? await db.select().from(employees).where(inArray(employees.id, employeeIds))
    : [];
  const nameById = new Map(employeeRows.map((e) => [e.id, e.name]));

  const batchIds = rows.map((b) => b.id);
  const inputRows = batchIds.length
    ? await db
        .select()
        .from(batchSteps)
        .where(
          and(inArray(batchSteps.batchId, batchIds), isNotNull(batchSteps.inputValue)),
        )
        .orderBy(asc(batchSteps.stepIndex))
    : [];
  const inputsByBatch = new Map<number, string>();
  for (const s of inputRows) {
    const label = s.inputLabel ?? s.title;
    const unit = s.inputUnit ? ` ${s.inputUnit}` : "";
    const entry = `${label} = ${s.inputValue}${unit}`;
    const prev = inputsByBatch.get(s.batchId);
    inputsByBatch.set(s.batchId, prev ? `${prev} | ${entry}` : entry);
  }

  const header = [
    "מספר אצווה",
    "נוסחה",
    "עובד/ת",
    "שעת התחלה",
    "שעת סיום",
    "משך כולל (שניות)",
    "משך כולל (hh:mm:ss)",
    "סטטוס",
    "סיבת ביטול",
    "ערכי בקרת איכות שנרשמו",
  ];

  const lines = [header.map(escapeCsvCell).join(",")];
  for (const b of rows) {
    const dur = b.totalDurationSeconds ?? 0;
    const h = Math.floor(dur / 3600);
    const m = Math.floor((dur % 3600) / 60);
    const s = dur % 60;
    const hms = [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
    lines.push(
      [
        b.batchNumber,
        b.formulaName,
        nameById.get(b.employeeId) ?? "עובד לא ידוע",
        formatCsvDateTime(b.startedAt),
        b.completedAt ? formatCsvDateTime(b.completedAt) : "",
        b.totalDurationSeconds ?? "",
        hms,
        b.status === "completed" ? "הושלמה" : "בוטלה",
        b.abortReason ?? "",
        inputsByBatch.get(b.id) ?? "",
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const stamp = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chimo-history-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
