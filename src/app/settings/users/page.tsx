import { EmployeesClient } from "@/components/employees-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ניהול עובדים",
};

export default function UsersSettingsPage() {
  return <EmployeesClient />;
}
