/**
 * Next.js instrumentation hook — runs once when the server boots.
 * Idempotently seeds starter employees + standard detergent formulas so the
 * app is instantly testable on first load. Never blocks or crashes boot.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { runSeed } = await import("@/db/seed");
      await runSeed();
    } catch (err) {
      console.error("[chimo] Auto-seed skipped:", err);
    }
  }
}
