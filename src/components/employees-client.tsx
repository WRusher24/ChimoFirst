"use client";

import { useToast } from "@/components/providers";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { api, errorMessage, fetcher } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { EmployeeDTO } from "@/lib/types";
import {
  KeyRound,
  RotateCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

export function EmployeesClient() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{
    employees: EmployeeDTO[];
  }>("/api/employees", fetcher);

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"worker" | "supervisor">("worker");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const employees = data?.employees ?? [];

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      toast.error("יש להזין שם עובד (2 תווים לפחות)");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      toast.error("קוד PIN חייב להכיל בדיוק 4 ספרות");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/employees", { name: name.trim(), pin, role });
      toast.success(`העובד "${name.trim()}" נוסף למערכת`);
      setName("");
      setPin("");
      setRole("worker");
      await mutate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/api/employees/${deleteTarget.id}`);
      toast.success(`העובד "${deleteTarget.name}" הוסר מהמערכת`);
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="ניהול עובדים"
        subtitle="עובדי המפעל המורשים להפעיל אצוות — כל יצירת אצווה מחייבת אימות PIN אישי"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* ------------------------------ Add form ----------------------------- */}
        <Card className="p-5 lg:sticky lg:top-8">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-100">
            <UserPlus className="h-5 w-5 text-accent-500" />
            הוספת עובד חדש
          </h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-200">
                שם מלא <span className="text-rose-600">*</span>
              </label>
              <input
                className="field"
                placeholder="לדוגמה: דנה לוי / Dana Levy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-200">
                קוד PIN אישי <span className="text-rose-600">*</span>
              </label>
              <input
                className="field font-mono text-lg tracking-[0.4em]"
                dir="ltr"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                <KeyRound className="h-3 w-3" />
                בדיוק 4 ספרות — הקוד נשמר מוצפן ולעולם אינו מוצג שוב
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink-200">תפקיד</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRole("worker")}
                  className={`h-11 rounded-xl border text-sm font-bold transition-colors ${
                    role === "worker"
                      ? "border-accent-500 bg-sky-50 text-accent-600 ring-1 ring-accent-500/30"
                      : "border-ink-600 bg-white text-ink-400 hover:text-ink-100"
                  }`}
                >
                  עובד/ת ייצור
                </button>
                <button
                  onClick={() => setRole("supervisor")}
                  className={`h-11 rounded-xl border text-sm font-bold transition-colors ${
                    role === "supervisor"
                      ? "border-amber-400 bg-amber-50 text-amber-700 ring-1 ring-amber-300"
                      : "border-ink-600 bg-white text-ink-400 hover:text-ink-100"
                  }`}
                >
                  מפקח/ת
                </button>
              </div>
            </div>
            <Button className="w-full" size="lg" icon={UserPlus} loading={saving} onClick={handleCreate}>
              הוספה למפעל
            </Button>
          </div>
        </Card>

        {/* ------------------------------ List -------------------------------- */}
        <div>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-[132px]" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center">
              <p className="font-bold text-rose-700">לא ניתן לטעון את רשימת העובדים</p>
              <Button variant="ghost" icon={RotateCw} onClick={() => mutate()}>
                נסו שוב
              </Button>
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="אין עובדים במערכת"
              hint="הוסיפו את העובד הראשון באמצעות הטופס כדי שהצוות יוכל להתחיל אצוות."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {employees.map((e) => (
                <Card key={e.id} className="group flex items-center gap-3.5 p-4">
                  <Avatar name={e.name} seed={e.id} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-100">{e.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={e.role === "supervisor" ? "amber" : "slate"}>
                        {e.role === "supervisor" && (
                          <ShieldCheck className="h-3 w-3" />
                        )}
                        {e.role === "supervisor" ? "מפקח/ת" : "עובד/ת"}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-500">
                      הצטרף/ה ב־<span className="font-mono">{formatDate(e.createdAt)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(e)}
                    title="הסרת עובד"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            עובד המשויך לאצוות קיימות בהיסטוריה לא ניתן למחיקה — כדי לשמר את תקינות
            רישומי הייצור ואחריות מלאה על כל אצווה שבוצעה.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={deleting}
        title="הסרת עובד"
        message={
          <>
            האם להסיר את <span className="font-bold text-ink-100">{deleteTarget?.name}</span>{" "}
            מהמערכת? העובד לא יוכל עוד ליצור אצוות חדשות.
          </>
        }
        confirmLabel="הסרה"
      />
    </div>
  );
}
