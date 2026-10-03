import { DashboardClient } from "@/components/dashboard-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "לוח ייצור",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
