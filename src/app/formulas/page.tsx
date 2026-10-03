import { FormulasClient } from "@/components/formulas-client";
import { FormulasGate } from "@/components/formulas-gate";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מתכוני ייצור",
};

export default function FormulasPage() {
  return (
    <FormulasGate>
      <FormulasClient />
    </FormulasGate>
  );
}
