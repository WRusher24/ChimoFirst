import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Heebo, IBM_Plex_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "כימו — מערכת ניהול אצוות ייצור",
    template: "%s · כימו",
  },
  description:
    "מערכת ניהול ומעקב אצוות ייצור בזמן אמת עבור מפעל דטרגנטים: מתכונים, בקרת איכות, טיימרים מדויקים, היסטוריה וייצוא נתונים.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
