import { GOOGLE_CALENDAR_API, googleUrl, type GoogleClient } from "./google-api-client.ts";
import type {
  GoogleCalendarListItem,
  GoogleCalendarListResponse,
  GoogleColorDefinition,
  GoogleColorsResponse,
  GoogleEventResource,
} from "./google-api-types.ts";

export type GoogleColorValues = {
  backgroundColor: string | null;
  foregroundColor: string | null;
};

export type GoogleColorPalette = {
  calendar: Record<string, GoogleColorValues>;
  event: Record<string, GoogleColorValues>;
};

const EMPTY_GOOGLE_COLORS: GoogleColorValues = {
  backgroundColor: null,
  foregroundColor: null,
};

const EMPTY_GOOGLE_COLOR_PALETTE: GoogleColorPalette = {
  calendar: {},
  event: {},
};

// One calendar sync resolves ids, colors, and names for several calendars;
// memoizing the list per client turns N list requests into one.
const calendarListCache = new WeakMap<GoogleClient, Promise<GoogleCalendarListItem[]>>();

function isNotFoundError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorWithStatus = error as { code?: unknown; status?: unknown };
  return errorWithStatus.code === 404 || errorWithStatus.status === 404;
}

async function fetchCalendarListItems(client: GoogleClient) {
  const items: GoogleCalendarListItem[] = [];
  let pageToken: string | undefined;
  do {
    const response = await client.request<GoogleCalendarListResponse>(
      "GET",
      googleUrl(GOOGLE_CALENDAR_API, ["users", "me", "calendarList"], { pageToken }),
    );
    items.push(...(response.items ?? []));
    pageToken = response.nextPageToken ?? undefined;
  } while (pageToken);
  return items;
}

export function getCalendarListItems(client: GoogleClient) {
  let cached = calendarListCache.get(client);
  if (!cached) {
    cached = fetchCalendarListItems(client);
    calendarListCache.set(client, cached);
  }
  return cached;
}

export async function resolveCalendarId(client: GoogleClient, calendarIdOrName: string) {
  const target = calendarIdOrName.trim();
  if (!target || target === "primary") {
    return "primary";
  }

  const items = await getCalendarListItems(client);
  const match = items.find((item) => item.id === target || item.summary === target);
  return match?.id ?? target;
}

async function resolveCalendarListEntry(
  client: GoogleClient,
  calendarIdOrName: string,
): Promise<GoogleCalendarListItem | null> {
  const target = calendarIdOrName.trim();
  const matchPrimary = !target || target === "primary";
  const items = await getCalendarListItems(client);
  const match = items.find((item) => {
    if (matchPrimary) {
      return item.primary === true || item.id === "primary";
    }

    return item.id === target || item.summary === target;
  });

  return match ?? null;
}

function mapGoogleColorEntries(
  entries: Record<string, GoogleColorDefinition> | null | undefined,
): Record<string, GoogleColorValues> {
  return Object.fromEntries(
    Object.entries(entries ?? {}).map(([key, value]) => [
      key,
      {
        backgroundColor: value.background ?? null,
        foregroundColor: value.foreground ?? null,
      },
    ]),
  );
}

export async function loadGoogleColorPalette(client: GoogleClient): Promise<GoogleColorPalette> {
  try {
    const response = await client.request<GoogleColorsResponse>(
      "GET",
      googleUrl(GOOGLE_CALENDAR_API, ["colors"]),
    );
    return {
      calendar: mapGoogleColorEntries(response.calendar),
      event: mapGoogleColorEntries(response.event),
    };
  } catch {
    return EMPTY_GOOGLE_COLOR_PALETTE;
  }
}

function resolveCalendarColorsFromEntry(
  entry: GoogleCalendarListItem | null,
  palette: GoogleColorPalette,
): GoogleColorValues {
  if (!entry) {
    return EMPTY_GOOGLE_COLORS;
  }

  const paletteColors = entry.colorId ? palette.calendar[entry.colorId] : undefined;
  return {
    backgroundColor: entry.backgroundColor ?? paletteColors?.backgroundColor ?? null,
    foregroundColor: entry.foregroundColor ?? paletteColors?.foregroundColor ?? null,
  };
}

export async function resolveCalendarColors(
  client: GoogleClient,
  calendarIdOrName: string,
  palette: GoogleColorPalette,
): Promise<GoogleColorValues> {
  try {
    const entry = await resolveCalendarListEntry(client, calendarIdOrName);
    return resolveCalendarColorsFromEntry(entry, palette);
  } catch {
    return EMPTY_GOOGLE_COLORS;
  }
}

export function resolveEventColors(
  event: GoogleEventResource,
  calendarColors: GoogleColorValues,
  palette: GoogleColorPalette,
): GoogleColorValues {
  const paletteColors = event.colorId ? palette.event[event.colorId] : undefined;
  return {
    backgroundColor: paletteColors?.backgroundColor ?? calendarColors.backgroundColor,
    foregroundColor: paletteColors?.foregroundColor ?? calendarColors.foregroundColor,
  };
}

export async function withCalendarFallback<T>(
  calendarIds: string[],
  operation: (calendarId: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (const calendarId of [...new Set(calendarIds.filter(Boolean))]) {
    try {
      return await operation(calendarId);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}
