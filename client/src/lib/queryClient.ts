import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

/**
 * API base URL resolution
 *
 * Three modes:
 *   1. Local dev / sandbox web: API_BASE is "" (relative `/api/...`)
 *      or the deploy tool's `__PORT_5000__` proxy path.
 *   2. Native (iOS/Android): API_BASE must be an absolute URL pointing at
 *      the deployed backend's port-5000 proxy. Set VITE_API_BASE_URL at
 *      build time, or fall back to NATIVE_API_BASE_FALLBACK below.
 *
 * --- NATIVE BUILD INSTRUCTIONS ---
 * When you build the web bundle that will be wrapped into the native apps
 * (i.e. when `server.url` is removed from capacitor.config.ts and you want
 * the app to use the locally-bundled assets), set VITE_API_BASE_URL to the
 * full URL of the deployed backend's __PORT_5000__ proxy, for example:
 *
 *     VITE_API_BASE_URL="https://tapcard-e4j5.onrender.com" \
 *       npm run build && npx cap sync
 *
 * If `server.url` IS set in capacitor.config.ts (the default in this repo),
 * the native app loads the deployed web app directly and the relative
 * __PORT_5000__ path that the deploy tool injected at deploy time keeps
 * working – no env var needed.
 */
const NATIVE_API_BASE_FALLBACK =
  "https://tapcard-e4j5.onrender.com";

const RAW_PLACEHOLDER = "__PORT_5000__";

function resolveApiBase(): string {
  // Vite-injected env var wins everywhere it's defined.
  const envBase =
    (import.meta as any).env?.VITE_API_BASE_URL ||
    (import.meta as any).env?.VITE_API_BASE ||
    "";
  if (envBase) return String(envBase).replace(/\/$/, "");

  const placeholder = RAW_PLACEHOLDER;
  // Deploy tool replaces the placeholder in-place with a proxy path.
  // If the literal placeholder string is still here, we're running in
  // local dev where we can use relative paths.
  const fromBuild = placeholder.startsWith("__") ? "" : placeholder;

  // Capacitor.isNativePlatform() returns true on iOS/Android shells.
  if (typeof Capacitor !== "undefined" && Capacitor.isNativePlatform?.()) {
    if (!fromBuild) return NATIVE_API_BASE_FALLBACK.replace(/\/$/, "");
    // If the build was deployed, fromBuild is a relative proxy path
    // like "/computer/a/tapcard-xyz/port/5000". Native shells need an
    // absolute URL, so join it onto the deployed origin.
    if (fromBuild.startsWith("/")) {
      const origin = "https://www.perplexity.ai";
      return (origin + fromBuild).replace(/\/$/, "");
    }
    return fromBuild.replace(/\/$/, "");
  }
  return fromBuild;
}

export const API_BASE = resolveApiBase();

// Auth token holder. We can't use localStorage (sandbox blocks it), so we
// keep the token in a module-level variable + React context.
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}
export function getAuthToken(): string | null {
  return authToken;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let msg = text;
    try {
      const obj = JSON.parse(text);
      if (obj.error) msg = obj.error;
      else if (obj.message) msg = obj.message;
    } catch {}
    throw new Error(msg);
  }
}

function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { ...authHeaders() };
  if (data) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(`${API_BASE}${queryKey.join("/")}`, {
      headers: authHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
