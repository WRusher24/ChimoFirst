"use client";

import { GlobalTimerMonitor } from "@/components/global-timer-monitor";
import { formatTimeWithSeconds } from "@/lib/format";
import {
  ClipboardList,
  Droplets,
  FlaskConical,
  History,
  LayoutGrid,
  LogOut,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

const NAV_ITEMS = [
  { href: "/", label: "לוח ייצור", icon: LayoutGrid },
  { href: "/formulas", label: "מתכונים", icon: FlaskConical },
  { href: "/history", label: "היסטוריה", icon: History },
  { href: "/settings/users", label: "עובדים", icon: Users },
];

/** Window event that tells any mounted FormulasGate to lock instantly. */
export const FORMULAS_RELOCK_EVENT = "chimo:formulas-relock";

/** Revoke the formulas unlock cookie server-side (fire-and-forget safe). */
function lockFormulasServer(): Promise<void> {
  return fetch("/api/auth/formulas-lock", { method: "POST" })
    .then(() => undefined)
    .catch(() => undefined);
}

function notifyFormulasRelock() {
  window.dispatchEvent(new Event(FORMULAS_RELOCK_EVENT));
}

function LiveClock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      className={`font-mono tabular-nums tracking-wider ${className}`}
      suppressHydrationWarning
    >
      {now ? formatTimeWithSeconds(now) : "00:00:00"}
    </span>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-md shadow-sky-600/25 transition-transform duration-300 group-hover:scale-105">
        <Droplets className="h-6 w-6" strokeWidth={2.4} />
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block text-xl font-black tracking-tight text-ink-100">
            כימו
          </span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-ink-400">
            CHIMO MFG
          </span>
        </span>
      )}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/settings/users")
    return pathname.startsWith("/settings/users") || pathname === "/settings";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutBusy, setLogoutBusy] = useState(false);

  /*
   * STRICT FORMULAS RE-AUTH:
   * The moment the user leaves the /formulas section (any destination,
   * including back/forward buttons), the unlock cookie is revoked — the next
   * visit always prompts for the master company password from scratch.
   */
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (prev.startsWith("/formulas") && !pathname.startsWith("/formulas")) {
      void lockFormulasServer().then(notifyFormulasRelock);
    }
  }, [pathname]);

  /*
   * Clicking "מתכונים" (anywhere it appears) revokes access FIRST, then
   * navigates — guaranteeing an immediate password prompt on every click,
   * even if an unlock happened seconds earlier or the user re-clicks it.
   */
  const handleFormulasClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      void lockFormulasServer().then(() => {
        notifyFormulasRelock();
        router.push("/formulas");
      });
    },
    [router],
  );

  // The login screen renders without any application chrome (or monitor).
  if (pathname === "/login") {
    return <>{children}</>;
  }

  const logout = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const navLinkProps = (href: string) =>
    href === "/formulas" ? { onClick: handleFormulasClick } : {};

  return (
    <div className="min-h-dvh">
      {/* Global cross-page timer alarm engine — mounted on every app page */}
      <GlobalTimerMonitor />

      {/* Desktop / tablet sidebar — sits on the right in RTL */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[84px] flex-col border-e border-ink-600/70 bg-white/85 backdrop-blur-xl md:flex lg:w-[248px]">
        <div className="flex h-20 items-center justify-center px-4 lg:justify-start">
          <span className="lg:hidden">
            <Logo compact />
          </span>
          <span className="hidden lg:block">
            <Logo />
          </span>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                {...navLinkProps(item.href)}
                className={`relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-sky-50 font-bold text-accent-600 ring-1 ring-sky-100"
                    : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                } justify-center lg:justify-start`}
              >
                {active && (
                  <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-accent-500" />
                )}
                <item.icon
                  className={`h-[22px] w-[22px] shrink-0 ${active ? "text-accent-500" : ""}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className="hidden lg:inline">{item.label}</span>
                {item.href === "/formulas" && (
                  <ClipboardList className="ms-auto hidden h-3.5 w-3.5 text-ink-500 lg:inline" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-700/70 px-3 py-4 lg:px-5">
          <div className="hidden lg:block">
            <p className="text-xs text-ink-400">שעון משמרת</p>
            <LiveClock className="mt-0.5 block text-2xl font-semibold text-ink-100" />
          </div>
          <button
            onClick={logout}
            disabled={logoutBusy}
            title="יציאה מהמערכת"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-ink-600/80 px-3 py-2.5 text-sm font-bold text-ink-300 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 lg:justify-start"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">יציאה מהמערכת</span>
          </button>
          <p className="mt-3 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 lg:block">
            CHIMO OS v2.0
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ink-600/70 bg-white/85 px-4 backdrop-blur-xl md:hidden">
        <Logo />
        <div className="flex items-center gap-3">
          <LiveClock className="text-lg font-semibold text-ink-200" />
          <button
            onClick={logout}
            disabled={logoutBusy}
            title="יציאה מהמערכת"
            className="grid h-10 w-10 place-items-center rounded-xl border border-ink-600/80 text-ink-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pb-28 pt-5 sm:px-6 md:ms-[84px] md:px-7 md:pb-12 md:pt-8 lg:ms-[248px] lg:px-10">
        <div className="mx-auto w-full max-w-[1500px]">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-ink-600/70 bg-white/92 backdrop-blur-xl md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              {...navLinkProps(item.href)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-accent-600" : "text-ink-400"
              }`}
            >
              <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
