const APP_ENVIRONMENT = process.env.NEXT_PUBLIC_APP_ENV || "production";
const RELEASE_API_URL = APP_ENVIRONMENT === "staging"
  ? "https://aws-test.clothify.ng"
  : "https://api.clothify.ng";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? RELEASE_API_URL
    : "http://localhost:3000")
).replace(/\/$/, "");

if (
  process.env.NODE_ENV === "production" &&
  API_BASE_URL !== RELEASE_API_URL
) {
  throw new Error(`The production admin build must use ${RELEASE_API_URL}.`);
}

export type ApiList<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AuthUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: "USER" | "MERCHANT" | "RIDER" | "ADMIN" | string;
  [key: string]: unknown;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: string;
  sessionId?: string;
  user: AuthUser;
};

export type AdminContext = {
  id: string;
  accountId: string;
  displayName?: string | null;
  roles: { key: string; name: string }[];
  permissions: string[];
};

export class ApiError extends Error {
  status: number;
  details: unknown;
  code: string;
  retryable: boolean;
  outcomeUnknown: boolean;
  kind: "auth" | "permission" | "network" | "timeout" | "validation" | "conflict" | "server" | "unknown";
  safeMessage: string;
  requestId?: string;

  constructor(message: string, status: number, details?: unknown, options: { code?: string; retryable?: boolean; outcomeUnknown?: boolean } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = options.code || `HTTP_${status}`;
    this.retryable = options.retryable ?? false;
    this.outcomeUnknown = options.outcomeUnknown ?? false;
    this.kind = this.code === "NETWORK_ERROR" ? "network" : this.code === "REQUEST_TIMEOUT" ? "timeout" : status === 401 ? "auth" : status === 403 ? "permission" : status === 409 ? "conflict" : status === 400 || status === 422 ? "validation" : status >= 500 ? "server" : "unknown";
    this.safeMessage = message;
    this.requestId = details && typeof details === "object" && "requestId" in details && typeof details.requestId === "string" ? details.requestId : undefined;
  }
}

export function toUserError(error: unknown, fallback = "Couldn't complete the request. Please try again.") {
  if (!(error instanceof ApiError)) return fallback;
  const reference = error.requestId && /^[A-Za-z0-9_-]{1,64}$/.test(error.requestId) ? ` Reference: ${error.requestId}.` : "";
  return `${error.safeMessage}${reference}`;
}

const ACCESS_TOKEN_KEY = "clothify_admin_access_token";
const REFRESH_TOKEN_KEY = "clothify_admin_refresh_token";
const SESSION_ID_KEY = "clothify_admin_session_id";
const USER_KEY = "clothify_admin_user";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  if (session.refreshToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  if (session.sessionId)
    localStorage.setItem(SESSION_ID_KEY, session.sessionId);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(USER_KEY);
}

const terminalRefreshCodes = new Set(["REFRESH_TOKEN_INVALID", "REFRESH_TOKEN_EXPIRED", "SESSION_REVOKED", "SESSION_EXPIRED", "INVALID_REFRESH_TOKEN", "ACCOUNT_SUSPENDED"]);
function backendCode(payload: unknown) {
  return payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string" ? payload.code : "UNKNOWN";
}
function safeMessage(status: number, code: string) {
  if (status === 401) return "Your session could not be confirmed. Please try again.";
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 429) return "Too many attempts. Try again after the allowed wait.";
  if (status === 409) return "This information has changed. Refresh and review before continuing.";
  if (status >= 500) return "Something went wrong. Please try again shortly.";
  if (code === "OTP_INCORRECT") return "That code is incorrect. Check it and try again.";
  if (code === "OTP_EXPIRED") return "This code has expired. Request a new code.";
  if (code === "WITHDRAWAL_STATE_CONFLICT") return "This withdrawal has changed. Refresh its status.";
  if (code === "MERCHANT_ONBOARDING_NOT_SUBMITTED") return "The merchant must finish and submit onboarding before approval.";
  if (code === "MERCHANT_DOCUMENTS_NOT_APPROVED") return "Review and approve the CAC document and all required business images first.";
  if (status === 400 || status === 422) return "Check the information entered and try again.";
  return "Couldn't complete the request. Please try again.";
}

async function boundedFetch(url: string, options: RequestInit, timeoutMs = 25_000) {
  const controller = new AbortController();
  const callerSignal = options.signal;
  const cancelFromCaller = () => controller.abort();
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener("abort", cancelFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const contentType = res.headers.get("content-type") || "";
    const payload = res.status === 204 ? null : contentType.includes("application/json")
      ? await res.json().catch(() => null) : await res.text();
    return { res, payload };
  } catch (error) {
    if (callerSignal?.aborted) throw new ApiError("", 0, undefined, { code: "REQUEST_CANCELLED" });
    if (controller.signal.aborted) throw new ApiError("This is taking longer than expected. Check the status before trying again.", 0, undefined, { code: "REQUEST_TIMEOUT", retryable: true, outcomeUnknown: true });
    throw new ApiError("Check your internet connection and try again.", 0, undefined, { code: "NETWORK_ERROR", retryable: true, outcomeUnknown: true });
  } finally { clearTimeout(timeout); callerSignal?.removeEventListener("abort", cancelFromCaller); }
}

export function requireAdminSession() {
  const token = getAccessToken();
  const user = getAuthUser();
  return Boolean(token && user?.role === "ADMIN");
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function getSessionId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_ID_KEY);
}

type RefreshResult = { kind: "refreshed"; accessToken: string } | { kind: "terminal" | "transient" | "stale" };
let refreshInFlight: Promise<RefreshResult> | null = null;

async function performSessionRefresh() {
  const refreshToken = getRefreshToken();
  const sessionId = getSessionId();
  const user = getAuthUser();
  if (!refreshToken || !sessionId || !user) return { kind: "transient" } as RefreshResult;

  const { res, payload: responseBody } = await boundedFetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, sessionId }),
  }, 12_000);

  const payload = responseBody && typeof responseBody === "object" && responseBody.success === true && "data" in responseBody
    ? responseBody.data
    : responseBody;
  if (!res.ok) return { kind: res.status === 401 && terminalRefreshCodes.has(backendCode(responseBody)) ? "terminal" : "transient" } as RefreshResult;
  if (!payload || typeof payload !== "object" || typeof payload.accessToken !== "string") return { kind: "transient" } as RefreshResult;
  if (getRefreshToken() !== refreshToken || getSessionId() !== sessionId || getAuthUser()?.id !== user.id) return { kind: "stale" } as RefreshResult;

  const nextSession: AuthSession = { ...payload, user };
  saveSession(nextSession);
  return { kind: "refreshed", accessToken: nextSession.accessToken } as RefreshResult;
}

function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = performSessionRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function toQuery(
  params?: Record<string, string | number | boolean | null | undefined>,
) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function requestOnce<T>(
  path: string,
  options: RequestInit & {
    query?: Record<string, string | number | boolean | null | undefined>;
  } = {},
  tokenOverride?: string | null,
): Promise<{ res: Response; payload: T | unknown; tokenUsed: string | null }> {
  const token = tokenOverride ?? getAccessToken();
  const query = toQuery(options.query);
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}${query}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body)
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const { res, payload } = await boundedFetch(url, { ...options, headers });
  return { res, payload, tokenUsed: token };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & {
    query?: Record<string, string | number | boolean | null | undefined>;
  } = {},
): Promise<T> {
  let { res, payload, tokenUsed } = await requestOnce<T>(path, options);

  if (res.status === 401 && tokenUsed && !path.startsWith("/auth/")) {
    const refreshed = await refreshSession().catch(() => ({ kind: "transient" as const }));
    if (refreshed.kind === "terminal") {
      if (getAccessToken() === tokenUsed) clearSession();
      throw new ApiError("Your session has expired. Please sign in again.", 401, payload, { code: "SESSION_EXPIRED" });
    }
    if (refreshed.kind === "refreshed") {
      if ((options.method || "GET").toUpperCase() !== "GET") {
        throw new ApiError("Session restored. Refresh the current record before trying again.", 401, payload, { code: "AUTH_REFRESHED_ACTION_REVIEW" });
      }
      ({ res, payload, tokenUsed } = await requestOnce<T>(
        path,
        options,
        refreshed.accessToken,
      ));
    } else {
      throw new ApiError("Couldn't confirm your session. Please try again.", 401, payload, { code: "SESSION_REFRESH_UNAVAILABLE", retryable: true });
    }
  }

  if (!res.ok) {
    const code = backendCode(payload);
    throw new ApiError(safeMessage(res.status, code), res.status, payload, { code, retryable: (options.method || "GET") === "GET" && (res.status === 408 || res.status === 429 || res.status >= 500), outcomeUnknown: (options.method || "GET") !== "GET" && (res.status === 408 || res.status >= 500) });
  }

  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    (payload as any).success === true &&
    "data" in payload
  ) {
    return (payload as any).data as T;
  }
  if (payload && typeof payload === "object" && "success" in payload && (payload as any).success === false) {
    throw new ApiError("Couldn't confirm the result. Check its status before trying again.", res.status, payload, { code: "UNEXPECTED_RESPONSE", outcomeUnknown: (options.method || "GET") !== "GET" });
  }
  if (res.status === 204) return undefined as T;
  if (payload === null || typeof payload === "string") {
    throw new ApiError("Couldn't confirm the result. Check its status before trying again.", res.status, undefined, { code: "UNEXPECTED_RESPONSE", outcomeUnknown: (options.method || "GET") !== "GET" });
  }
  return payload as T;
}

export async function adminLogin(identifier: string, password: string) {
  const trimmed = identifier.trim();
  const body = trimmed.includes("@")
    ? { email: trimmed.toLowerCase(), password }
    : { phone: trimmed, password };

  const session = await apiFetch<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (session.user?.role !== "ADMIN") {
    throw new ApiError(
      "This account is not an admin account.",
      403,
      session.user,
    );
  }

  saveSession(session);
  return session;
}

export function getAdminContext() {
  return apiFetch<AdminContext>("/admin/me");
}

export function formatNaira(value: number | string | null | undefined) {
  const minorUnits = Number(value || 0);
  const num = Number.isFinite(minorUnits) ? minorUnits / 100 : 0;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
}

export function formatTime(value?: string | Date | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function formatNigerianPhone(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  if (raw.startsWith("deleted_")) return raw;

  const compact = raw.replace(/[\s()-]/g, "");
  if (compact.startsWith("+234")) return `0${compact.slice(4)}`;
  if (compact.startsWith("234")) return `0${compact.slice(3)}`;
  if (/^[789]\d{9}$/.test(compact)) return `0${compact}`;
  return compact;
}

export function totalPages(total: number, limit: number) {
  return Math.max(
    1,
    Math.ceil((Number(total) || 0) / Math.max(1, Number(limit) || 1)),
  );
}
