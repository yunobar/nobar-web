// Thin fetch wrapper for the album backend: cookie-based session + double-submit CSRF.
// The session lives in HttpOnly cookies (JS can't read them); the CSRF token is the only
// client-visible artifact and doubles as our "do I have a session?" signal.

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
const CSRF_KEY = "csrfToken";

export function getCsrfToken(): string | null {
  return localStorage.getItem(CSRF_KEY);
}
export function setCsrfToken(token: string): void {
  localStorage.setItem(CSRF_KEY, token);
}
export function clearCsrfToken(): void {
  localStorage.removeItem(CSRF_KEY);
}
export function hasSession(): boolean {
  return getCsrfToken() !== null;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

interface FetchOpts {
  body?: unknown;
  params?: Record<string, string | undefined>;
}

// ponytail: shared-promise single-flight (no subscriber queue); upgrade only if concurrent-401 replay ordering matters
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, { method: "PUT", credentials: "include" });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    const token = json?.data?.csrfToken ?? json?.csrfToken;
    if (token) setCsrfToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T = unknown>(
  method: string,
  path: string,
  opts: FetchOpts = {},
  isRetry = false
): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && method !== "HEAD") {
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && !isRetry) {
    refreshPromise ??= doRefresh();
    const ok = await refreshPromise;
    refreshPromise = null;
    if (ok) return apiFetch<T>(method, path, opts, true);
    // ponytail: reload-to-logout on refresh failure; swap for an onSessionExpired callback if a hard reload becomes unacceptable
    clearCsrfToken();
    window.location.reload();
    throw { message: "Session expired", statusCode: 401 } satisfies ApiError;
  }

  if (res.status === 204) return {} as T;

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      json?.error ?? json?.message ?? json?.data?.message ?? `Request failed (${res.status})`;
    throw { message, statusCode: res.status } satisfies ApiError;
  }
  return (json?.data ?? json) as T;
}
