import { apiErrorSchema, type ApiError, type ApiErrorCode } from "@timefraim/shared";
import { env } from "@/lib/env";

export const API_BASE_URL = env.apiBaseUrl;

export type Schema<T> = {
  parse: (value: unknown) => T;
};

type RequestOptions<TResponse, TBody> = {
  method?: string;
  body?: TBody;
  schema?: Schema<TResponse>;
  signal?: AbortSignal;
};

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly requestId: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function getFallbackErrorCode(status: number): ApiErrorCode {
  if (status === 400) return "invalid_input";
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status === 503) return "dependency_unavailable";
  if (status === 504) return "timeout";
  if (status >= 500) return "internal_error";
  return "internal_error";
}

function readLegacyMessage(payload: unknown) {
  return typeof payload === "object"
    && payload !== null
    && "message" in payload
    && typeof payload.message === "string"
    ? payload.message
    : null;
}

async function readApiError(response: Response): Promise<ApiError> {
  const requestId = response.headers.get("x-request-id") ?? "unknown";
  const fallback = {
    code: getFallbackErrorCode(response.status),
    message: `Request failed with status ${response.status}`,
    requestId,
  };
  const payload = (await response.json().catch(() => null)) as unknown;
  const parsed = apiErrorSchema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    ...fallback,
    message: readLegacyMessage(payload) ?? fallback.message,
  };
}

export function withQuery(
  path: string,
  query: Record<string, string | number | boolean | null | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "undefined" || value === null) {
      continue;
    }

    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export async function request<TResponse, TBody = never>(
  path: string,
  token: string,
  options: RequestOptions<TResponse, TBody> = {},
): Promise<TResponse> {
  const hasBody = typeof options.body !== "undefined";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiRequestError(response.status, error.code, error.requestId, error.message);
  }

  const json = (await response.json()) as unknown;
  return options.schema ? options.schema.parse(json) : (json as TResponse);
}
