import { BatchDetailClient } from "@/components/batch-detail-client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "ניהול אצווה",
};

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isInteger(batchId) || batchId <= 0) notFound();
  return <BatchDetailClient batchId={batchId} />;
}
