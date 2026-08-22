import { env } from "../config/env.ts";

export type GoogleConnection = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  calendarId: string;
  plannerCalendarId: string;
  email: string;
  // Called after a refresh-token exchange so the owner can persist the new
  // access token; without it every isolate re-refreshes an expired token.
  onTokensRefreshed?: (tokens: { accessToken: string; expiresAt: string }) => Promise<void> | void;
};

export type GoogleHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type GoogleClient = {
  request<T>(method: GoogleHttpMethod, url: string, body?: unknown): Promise<T>;
};

export const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
export const GOOGLE_TASKS_API = "https://tasks.googleapis.com/tasks/v1";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REQUEST_TIMEOUT_MS = 15_000;
const REFRESH_SKEW_MS = 60_000;

type QueryValue = string | number | boolean | null | undefined;

export class GoogleApiError extends Error {
  // googleapis exposed the HTTP status as `code`; the 404/410 fallbacks key on it.
  readonly code: number;

  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
    this.code = status;
  }
}

// Google resolves "@me" / "@default" aliases and "id@group.calendar.google.com"
// calendar IDs only when the "@" is literal; percent-encoding it yields a 404.
function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replaceAll("%40", "@");
}

export function googleUrl(base: string, segments: string[], query: Record<string, QueryValue> = {}) {
  const url = new URL(`${base}/${segments.map(encodePathSegment).join("/")}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as { error?: unknown; error_description?: unknown; message?: unknown };
  if (record.error && typeof record.error === "object" && "message" in record.error) {
    const message = (record.error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  for (const candidate of [record.error_description, record.error, record.message]) {
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return null;
}

export function createGoogleClient(connection: GoogleConnection | null): GoogleClient | null {
  if (!connection || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  let accessToken = connection.accessToken;
  let expiresAt = connection.expiresAt ? new Date(connection.expiresAt).getTime() : null;

  async function refreshAccessToken() {
    if (!connection?.refreshToken) {
      throw new GoogleApiError(401, "Google session expired. Sign in with Google again.");
    }
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: connection.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const payload = (await readJson(response)) as { access_token?: unknown; expires_in?: unknown } | null;
    if (!response.ok || typeof payload?.access_token !== "string") {
      throw new GoogleApiError(
        response.ok ? 401 : response.status,
        readErrorMessage(payload) ?? "Unable to refresh the Google access token",
      );
    }
    accessToken = payload.access_token;
    const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
    expiresAt = Date.now() + expiresIn * 1000;
    await connection.onTokensRefreshed?.({ accessToken, expiresAt: new Date(expiresAt).toISOString() });
  }

  function send(method: GoogleHttpMethod, url: string, body: unknown) {
    return fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  return {
    async request<T>(method: GoogleHttpMethod, url: string, body?: unknown): Promise<T> {
      const canRefresh = Boolean(connection?.refreshToken);
      if (canRefresh && expiresAt !== null && expiresAt - Date.now() <= REFRESH_SKEW_MS) {
        await refreshAccessToken();
      }

      let response = await send(method, url, body);
      if (response.status === 401 && canRefresh) {
        // The stored expiry is advisory (the web app sends its session expiry),
        // so a rejected token is the reliable refresh signal. Retry once.
        await refreshAccessToken();
        response = await send(method, url, body);
      }

      const payload = await readJson(response);
      if (!response.ok) {
        throw new GoogleApiError(
          response.status,
          readErrorMessage(payload) ?? `Google API request failed with status ${response.status}`,
        );
      }
      return payload as T;
    },
  };
}
