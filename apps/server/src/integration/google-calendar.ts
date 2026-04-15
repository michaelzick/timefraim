import type { ScheduleBlock, Task } from "@timefraim/shared";
import { google, type calendar_v3 } from "googleapis";
import { env } from "../config/env.js";
import { buildGoogleEventPayload } from "../services/planner-domain.js";

export type GoogleConnection = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  calendarId: string;
  plannerCalendarId: string;
  email: string;
};

export type GoogleEventRecord = {
  externalEventId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAppManaged: boolean;
  backgroundColor: string | null;
  foregroundColor: string | null;
  rawPayload: Record<string, unknown>;
  scheduleBlockId: string | null;
  externalUpdatedAt: string | null;
};

type GoogleColorValues = {
  backgroundColor: string | null;
  foregroundColor: string | null;
};

type GoogleColorPalette = {
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

function getOAuthClient(connection: GoogleConnection) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  const client = new google.auth.OAuth2({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken ?? undefined,
    expiry_date: connection.expiresAt ? new Date(connection.expiresAt).getTime() : undefined,
  });

  return client;
}

function isNotFoundError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorWithStatus = error as { code?: unknown; status?: unknown };
  return errorWithStatus.code === 404 || errorWithStatus.status === 404;
}

async function resolveCalendarId(calendar: calendar_v3.Calendar, calendarIdOrName: string) {
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
  entries: Record<string, { background?: string | null; foreground?: string | null }> | null | undefined,
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

async function loadGoogleColorPalette(calendar: calendar_v3.Calendar): Promise<GoogleColorPalette> {
  try {
    const response = await calendar.colors.get();
    return {
      calendar: mapGoogleColorEntries(response.data.calendar as Record<
        string,
        { background?: string | null; foreground?: string | null }
      > | null),
      event: mapGoogleColorEntries(response.data.event as Record<
        string,
        { background?: string | null; foreground?: string | null }
      > | null),
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

async function resolveCalendarColors(
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

function resolveEventColors(
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

async function withCalendarFallback<T>(
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

export async function syncGoogleCalendarWindow(
  connection: GoogleConnection | null,
  range: { timeMin: string; timeMax: string },
): Promise<GoogleEventRecord[]> {
  if (!connection) {
    return [];
  }

  const auth = getOAuthClient(connection);
  if (!auth) {
    return [];
  }

  const calendar = google.calendar({ version: "v3", auth });
  const [calendarId, colorPalette] = await Promise.all([
    resolveCalendarId(calendar, connection.calendarId),
    loadGoogleColorPalette(calendar),
  ]);
  const calendarColors = await resolveCalendarColors(calendar, connection.calendarId, colorPalette);
  const response = await calendar.events.list({
    calendarId,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: range.timeMin,
    timeMax: range.timeMax,
  });

  return (response.data.items ?? [])
    .filter((event) => event.id && event.start?.dateTime && event.end?.dateTime)
    .map((event) => {
      const eventColors = resolveEventColors(event, calendarColors, colorPalette);
      return {
        externalEventId: event.id!,
        title: event.summary ?? "Busy",
        startAt: event.start!.dateTime!,
        endAt: event.end!.dateTime!,
        isAppManaged: event.extendedProperties?.private?.origin === "timefraim",
        backgroundColor: eventColors.backgroundColor,
        foregroundColor: eventColors.foregroundColor,
        rawPayload: event as unknown as Record<string, unknown>,
        scheduleBlockId: event.extendedProperties?.private?.scheduleBlockId ?? null,
        externalUpdatedAt: event.updated ?? null,
      };
    });
}

export async function upsertGoogleScheduleBlock(params: {
  connection: GoogleConnection | null;
  task: Task;
  block: ScheduleBlock;
}): Promise<string | null> {
  if (!params.connection) {
    return null;
  }

  const auth = getOAuthClient(params.connection);
  if (!auth) {
    return null;
  }

  const calendar = google.calendar({ version: "v3", auth });
  const payload = buildGoogleEventPayload(params.task, params.block);
  const plannerCalendarId = await resolveCalendarId(calendar, params.connection.plannerCalendarId);
  const fallbackCalendarId = await resolveCalendarId(calendar, params.connection.calendarId);

  if (params.block.googleEventId) {
    await withCalendarFallback([plannerCalendarId, fallbackCalendarId], (calendarId) =>
      calendar.events.update({
        calendarId,
        eventId: params.block.googleEventId!,
        requestBody: payload,
      }),
    );
    return params.block.googleEventId;
  }

  const response = await calendar.events.insert({
    calendarId: plannerCalendarId,
    requestBody: payload,
  });

  return response.data.id ?? null;
}

export async function deleteGoogleScheduleBlock(
  connection: GoogleConnection | null,
  googleEventId: string | null | undefined,
): Promise<void> {
  if (!connection || !googleEventId) {
    return;
  }

  const auth = getOAuthClient(connection);
  if (!auth) {
    return;
  }

  const calendar = google.calendar({ version: "v3", auth });
  const plannerCalendarId = await resolveCalendarId(calendar, connection.plannerCalendarId);
  const fallbackCalendarId = await resolveCalendarId(calendar, connection.calendarId);
  await withCalendarFallback([plannerCalendarId, fallbackCalendarId], (calendarId) =>
    calendar.events.delete({
      calendarId,
      eventId: googleEventId,
    }),
  );
}
