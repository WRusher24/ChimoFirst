import { FormulaDetailClient } from "@/components/formula-detail-client";
import { FormulasGate } from "@/components/formulas-gate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "פרטי מתכון",
};

export default async function FormulaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const formulaId = Number(id);
  if (!Number.isInteger(formulaId) || formulaId <= 0) notFound();
  return (
    <FormulasGate>
      <FormulaDetailClient formulaId={formulaId} />
    </FormulasGate>
  );
}
