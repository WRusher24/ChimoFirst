import { FormulaForm } from "@/components/formula-form";
import { FormulasGate } from "@/components/formulas-gate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "עריכת מתכון",
};

export default async function EditFormulaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const formulaId = Number(id);
  if (!Number.isInteger(formulaId) || formulaId <= 0) notFound();
  return (
    <FormulasGate>
      <FormulaForm formulaId={formulaId} />
    </FormulasGate>
  );
}
