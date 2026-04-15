import type { calendar_v3 } from "googleapis";

export type GoogleColorValues = {
  backgroundColor: string | null;
  foregroundColor: string | null;
};

export type GoogleColorPalette = {
  calendar: Record<string, GoogleColorValues>;
  event: Record<string, GoogleColorValues>;
};

type GoogleColorEntry = {
  background?: string | null;
  foreground?: string | null;
};

const EMPTY_GOOGLE_COLORS: GoogleColorValues = {
  backgroundColor: null,
  foregroundColor: null,
};

const EMPTY_GOOGLE_COLOR_PALETTE: GoogleColorPalette = {
  calendar: {},
  event: {},
};

function isNotFoundError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorWithStatus = error as { code?: unknown; status?: unknown };
  return errorWithStatus.code === 404 || errorWithStatus.status === 404;
}

export async function resolveCalendarId(calendar: calendar_v3.Calendar, calendarIdOrName: string) {
  const target = calendarIdOrName.trim();
  if (!target || target === "primary") {
    return "primary";
  }

  let pageToken: string | undefined;
  do {
    const response = await calendar.calendarList.list({ pageToken });
    const match = (response.data.items ?? []).find((item) => item.id === target || item.summary === target);
    if (match?.id) {
      return match.id;
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return target;
}

async function resolveCalendarListEntry(
  calendar: calendar_v3.Calendar,
  calendarIdOrName: string,
): Promise<calendar_v3.Schema$CalendarListEntry | null> {
  const target = calendarIdOrName.trim();
  const matchPrimary = !target || target === "primary";
  let pageToken: string | undefined;

  do {
    const response = await calendar.calendarList.list({ pageToken });
    const match = (response.data.items ?? []).find((item) => {
      if (matchPrimary) {
        return item.primary === true || item.id === "primary";
      }

      return item.id === target || item.summary === target;
    });

    if (match) {
      return match;
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return null;
}

function mapGoogleColorEntries(
  entries: Record<string, GoogleColorEntry> | null | undefined,
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

export async function loadGoogleColorPalette(calendar: calendar_v3.Calendar): Promise<GoogleColorPalette> {
  try {
    const response = await calendar.colors.get();
    return {
      calendar: mapGoogleColorEntries(response.data.calendar as Record<string, GoogleColorEntry> | null),
      event: mapGoogleColorEntries(response.data.event as Record<string, GoogleColorEntry> | null),
    };
  } catch {
    return EMPTY_GOOGLE_COLOR_PALETTE;
  }
}

function resolveCalendarColorsFromEntry(
  entry: calendar_v3.Schema$CalendarListEntry | null,
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
  calendar: calendar_v3.Calendar,
  calendarIdOrName: string,
  palette: GoogleColorPalette,
): Promise<GoogleColorValues> {
  try {
    const entry = await resolveCalendarListEntry(calendar, calendarIdOrName);
    return resolveCalendarColorsFromEntry(entry, palette);
  } catch {
    return EMPTY_GOOGLE_COLORS;
  }
}

export function resolveEventColors(
  event: calendar_v3.Schema$Event,
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
