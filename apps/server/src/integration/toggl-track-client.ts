function getAuthHeader(apiToken: string): string {
  return `Basic ${Buffer.from(`${apiToken}:api_token`).toString("base64")}`;
}

export function getStringId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? `${value}` : null;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if ("errors" in payload && Array.isArray(payload.errors) && typeof payload.errors[0] === "string") {
    return payload.errors[0];
  }

  return null;
}

export async function togglRequest<T>(path: string, apiToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.track.toggl.com/api/v9${path}`, {
    ...init,
    headers: {
      Authorization: getAuthHeader(apiToken),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = await parseResponsePayload(response);
  if (!response.ok) {
    const detail = getErrorMessage(payload);
    throw new Error(detail ? `Toggl request failed: ${detail}` : `Toggl request failed with status ${response.status}`);
  }

  return payload as T;
}
