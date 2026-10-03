import { HistoryClient } from "@/components/history-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "היסטוריית ייצור",
};

export default function HistoryPage() {
  return <HistoryClient />;
}
