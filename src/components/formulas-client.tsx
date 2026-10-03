"use client";

import { useToast } from "@/components/providers";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { api, errorMessage, fetcher } from "@/lib/api";
import { formatDurationSeconds } from "@/lib/format";
import type { FormulaSummaryDTO } from "@/lib/types";
import {
  Beaker,
  Clock3,
  ExternalLink,
  FlaskConical,
  ListOrdered,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

export function FormulasClient() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{
    formulas: FormulaSummaryDTO[];
  }>("/api/formulas", fetcher);
  const [deleteTarget, setDeleteTarget] = useState<FormulaSummaryDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formulas = data?.formulas ?? [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/api/formulas/${deleteTarget.id}`);
      toast.success(`המתכון "${deleteTarget.name}" נמחק`);
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="מתכוני ייצור"
        subtitle="ניהול מתכוני הדטרגנטים: רכיבים, שלבים מתוזמנים ושלבי בקרת איכות"
        actions={
          <Link href="/formulas/new">
            <Button size="lg" icon={Plus}>
              מתכון חדש
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[240px]" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center">
          <p className="font-bold text-rose-700">לא ניתן לטעון את רשימת המתכונים</p>
          <Button variant="ghost" icon={RotateCw} onClick={() => mutate()}>
            נסו שוב
          </Button>
        </div>
      ) : formulas.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="עדיין לא הוגדרו מתכונים"
          hint="צרו את מתכון הייצור הראשון — עם רשימת רכיבים, שלבים מתוזמנים ושלבי בקרת איכות."
          action={
            <Link href="/formulas/new">
              <Button icon={Plus}>יצירת מתכון ראשון</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {formulas.map((f) => (
            <Card
              key={f.id}
              className="group flex flex-col p-5 transition-colors hover:border-accent-400"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-accent-600 ring-1 ring-sky-200">
                  <FlaskConical className="h-[22px] w-[22px]" />
                </span>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link
                    href={`/formulas/${f.id}/edit`}
                    title="עריכה"
                    className="grid h-9 w-9 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    title="מחיקה"
                    onClick={() => setDeleteTarget(f)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="mt-3 text-lg font-extrabold leading-snug text-ink-100">
                {f.name}
              </h3>
              <p className="mt-1 line-clamp-2 min-h-[2.5em] text-sm leading-relaxed text-ink-400">
                {f.description || "ללא תיאור"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="slate">
                  <ListOrdered className="h-3 w-3" />
                  {f.stepCount} שלבים
                </Badge>
                <Badge tone="aqua">
                  <Clock3 className="h-3 w-3" />
                  <span className="font-mono">
                    {formatDurationSeconds(f.totalDurationSeconds)}
                  </span>
                </Badge>
                <Badge tone="slate">
                  <Beaker className="h-3 w-3" />
                  {f.ingredientCount} רכיבים
                </Badge>
              </div>

              <Link
                href={`/formulas/${f.id}`}
                className="mt-5 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink-800 text-sm font-bold text-ink-100 transition-colors hover:bg-sky-50 hover:text-accent-600"
              >
                <ExternalLink className="h-4 w-4" />
                פרטי מתכון
              </Link>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={deleting}
        title="מחיקת מתכון"
        message={
          <>
            האם למחוק את המתכון{" "}
            <span className="font-bold text-ink-100">"{deleteTarget?.name}"</span>?
            <br />
            היסטוריית אצוות קיימת לא תיפגע.
          </>
        }
        confirmLabel="מחיקה לצמיתות"
      />
    </div>
  );
}
