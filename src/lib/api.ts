"use client";

/** Small typed fetch helpers shared by all client components and SWR hooks. */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let message = "שגיאה לא צפויה, נסו שוב";
  try {
    const data = (await res.json()) as { error?: string };
    if (data?.error) message = data.error;
    // Company session expired mid-shift → bounce back to the login screen.
    if (res.status === 401 && data?.error === "unauthorized") {
      if (typeof window !== "undefined") window.location.assign("/login");
    }
  } catch {
    /* keep default */
  }
  throw new ApiError(message, res.status);
}

/** SWR fetcher — returns parsed JSON or throws ApiError with a Hebrew message. */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) await parseError(res);
  return (await res.json()) as T;
}

async function request<T>(
  url: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) await parseError(res);
  return (await res.json()) as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url, "GET"),
  post: <T>(url: string, body?: unknown) => request<T>(url, "POST", body),
  put: <T>(url: string, body?: unknown) => request<T>(url, "PUT", body),
  del: <T>(url: string) => request<T>(url, "DELETE"),
};

/** Returns a Hebrew error message from any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "שגיאה לא צפויה, נסו שוב";
}
