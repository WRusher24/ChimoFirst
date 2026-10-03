import { FormulaForm } from "@/components/formula-form";
import { FormulasGate } from "@/components/formulas-gate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מתכון חדש",
};

export default function NewFormulaPage() {
  return (
    <FormulasGate>
      <FormulaForm />
    </FormulasGate>
  );
}
