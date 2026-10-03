"use client";

import { BatchCard } from "@/components/batch-card";
import { useToast } from "@/components/providers";
import { StartBatchWizard } from "@/components/start-batch-wizard";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { fetcher } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { DashboardResponse } from "@/lib/types";
import { useServerNow } from "@/lib/use-server-now";
import {
  Activity,
  CheckCircle2,
  PauseOctagon,
  Plus,
  RotateCw,
  Waves,
} from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  tone: "aqua" | "amber" | "emerald";
}) {
  const tones = {
    aqua: "bg-sky-50 text-accent-600 ring-sky-200",
    amber: "bg-amber-50 text-amber-600 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink-600/70 bg-white px-5 py-4 shadow-[0_1px_2px_rgb(15_23_42/0.05),0_12px_32px_-16px_rgb(15_23_42/0.14)]">
      <span className={`grid h-12 w-12 place-items-center rounded-xl ring-1 ${tones[tone]}`}>
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <div>
        <p className="font-mono text-2xl font-bold tabular-nums text-ink-100" dir="ltr" style={{ textAlign: "start" }}>
          {value}
        </p>
        <p className="text-xs font-medium text-ink-400">{label}</p>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const toast = useToast();
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(
    "/api/dashboard",
    fetcher,
    { refreshInterval: 8000, revalidateOnFocus: true },
  );
  const serverNow = useServerNow(data?.serverTime);

  /*
   * Timer audio alerts fire globally from <GlobalTimerMonitor />, which lives
   * in the app shell and stays mounted on every page — so no per-page audio
   * logic is needed here anymore.
   */

  useEffect(() => {
    if (error) toast.error("שגיאה בטעינת נתוני הלוח");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const stats = data?.stats;

  return (
    <div>
      <PageHeader
        title="לוח ייצור"
        subtitle={
          <>
            {"יום עבודה · "}
            <span className="font-mono">{formatDate(new Date())}</span>
            {" · כל האצוות הפעילות כרגע ברצפת הייצור"}
          </>
        }
        actions={
          <Button size="lg" icon={Plus} onClick={() => setWizardOpen(true)}>
            אצווה חדשה
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Activity}
          label="אצוות פעילות כעת"
          value={stats?.active ?? 0}
          tone="aqua"
        />
        <StatCard
          icon={PauseOctagon}
          label="אצוות מושהות"
          value={stats?.paused ?? 0}
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="אצוות שהושלמו היום"
          value={stats?.completedToday ?? 0}
          tone="emerald"
        />
      </div>

      {/* Batches grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[320px]" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center">
          <p className="font-bold text-rose-700">לא ניתן לטעון את נתוני הלוח</p>
          <Button variant="ghost" icon={RotateCw} onClick={() => mutate()}>
            נסו שוב
          </Button>
        </div>
      ) : data && data.batches.length === 0 ? (
        <EmptyState
          icon={Waves}
          title="רצפת הייצור שקטה כרגע"
          hint="אין אצוות פעילות. צרו אצווה חדשה כדי להפעיל את קו הייצור — ניתן להריץ מספר אצוות במקביל ללא הגבלה."
          action={
            <Button size="lg" icon={Plus} onClick={() => setWizardOpen(true)}>
              יצירת אצווה ראשונה
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              serverNow={serverNow}
              onChanged={() => mutate()}
            />
          ))}
        </div>
      )}

      <StartBatchWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => mutate()}
      />
    </div>
  );
}
