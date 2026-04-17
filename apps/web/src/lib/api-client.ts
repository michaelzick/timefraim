import { env } from "@/lib/env";

export const API_BASE_URL = env.apiBaseUrl;

export type Schema<T> = {
  parse: (value: unknown) => T;
};

type RequestOptions<TResponse, TBody> = {
  method?: string;
  body?: TBody;
  schema?: Schema<TResponse>;
};

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
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };
    throw new Error(error.message ?? `Request failed with status ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return options.schema ? options.schema.parse(json) : (json as TResponse);
}
