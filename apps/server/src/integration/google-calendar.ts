import type { ScheduleBlock, Task } from "@timefraim/shared";
import { google, type calendar_v3 } from "googleapis";
import { buildGoogleEventPayload } from "../services/planner-domain.js";
import { getGoogleOAuthClient } from "./google-auth.js";
import { loadGoogleColorPalette, resolveCalendarColors, resolveCalendarId, resolveEventColors, withCalendarFallback, type GoogleColorPalette, type GoogleColorValues } from "./google-calendar-helpers.js";

export type GoogleConnection = { accessToken: string; refreshToken: string | null; expiresAt: string | null; calendarId: string; plannerCalendarId: string; email: string };
export type GoogleEventRecord = { externalEventId: string; title: string; startAt: string; endAt: string; isAppManaged: boolean; backgroundColor: string | null; foregroundColor: string | null; rawPayload: Record<string, unknown>; scheduleBlockId: string | null; externalUpdatedAt: string | null; sourceCalendarId: string | null; sourceCalendarName: string | null };

function createGoogleCalendarClient(connection: GoogleConnection) {
  const auth = getGoogleOAuthClient(connection);
  return auth ? google.calendar({ version: "v3", auth }) : null;
}

function mapGoogleEventRecord(
  event: calendar_v3.Schema$Event,
  calendarColors: GoogleColorValues,
  colorPalette: GoogleColorPalette,
  sourceCalendarId: string | null,
  sourceCalendarName: string | null,
): GoogleEventRecord | null {
  if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
    return null;
  }

  const eventColors = resolveEventColors(event, calendarColors, colorPalette);
  return {
    externalEventId: event.id,
    title: event.summary ?? "Busy",
    startAt: event.start.dateTime,
    endAt: event.end.dateTime,
    isAppManaged: event.extendedProperties?.private?.origin === "timefraim",
    backgroundColor: eventColors.backgroundColor,
    foregroundColor: eventColors.foregroundColor,
    rawPayload: event as unknown as Record<string, unknown>,
    scheduleBlockId: event.extendedProperties?.private?.scheduleBlockId ?? null,
    externalUpdatedAt: event.updated ?? null,
    sourceCalendarId,
    sourceCalendarName,
  };
}

export type GoogleCalendarListEntry = { id: string; name: string; primary: boolean; backgroundColor: string | null };

export async function listGoogleCalendars(
  connection: GoogleConnection | null,
): Promise<GoogleCalendarListEntry[]> {
  if (!connection) {
    return [];
  }

  const calendar = createGoogleCalendarClient(connection);
  if (!calendar) {
    return [];
  }

  const entries: GoogleCalendarListEntry[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.calendarList.list({ pageToken });
    for (const item of response.data.items ?? []) {
      if (!item.id) continue;
      if (item.accessRole !== "owner" && item.accessRole !== "reader" && item.accessRole !== "writer" && item.accessRole !== "freeBusyReader") continue;
      entries.push({
        id: item.id,
        name: item.summary ?? item.id,
        primary: item.primary === true,
        backgroundColor: item.backgroundColor ?? null,
      });
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return entries;
}

export async function syncGoogleCalendarWindow(
  connection: GoogleConnection | null,
  range: { timeMin: string; timeMax: string },
  syncCalendarIds?: string[],
): Promise<GoogleEventRecord[]> {
  if (!connection) {
    return [];
  }

  const calendar = createGoogleCalendarClient(connection);
  if (!calendar) {
    return [];
  }

  const calendarIds = syncCalendarIds && syncCalendarIds.length > 0
    ? syncCalendarIds
    : [connection.calendarId];

  const colorPalette = await loadGoogleColorPalette(calendar);
  const allRecords: GoogleEventRecord[] = [];

  for (const rawCalendarId of calendarIds) {
    const resolvedId = await resolveCalendarId(calendar, rawCalendarId);
    const calendarColors = await resolveCalendarColors(calendar, rawCalendarId, colorPalette);

    let calendarName = rawCalendarId;
    try {
      const meta = await calendar.calendarList.get({ calendarId: resolvedId });
      calendarName = meta.data.summary ?? rawCalendarId;
    } catch {
      // keep rawCalendarId as the name
    }

    const response = await calendar.events.list({
      calendarId: resolvedId,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: range.timeMin,
      timeMax: range.timeMax,
    });

    const records = (response.data.items ?? [])
      .map((event) => mapGoogleEventRecord(event, calendarColors, colorPalette, resolvedId, calendarName))
      .filter((event): event is GoogleEventRecord => Boolean(event));

    allRecords.push(...records);
  }

  return allRecords;
}

export async function upsertGoogleScheduleBlock(params: {
  connection: GoogleConnection | null;
  task: Task;
  block: ScheduleBlock;
}): Promise<string | null> {
  if (!params.connection) {
    return null;
  }

  const calendar = createGoogleCalendarClient(params.connection);
  if (!calendar) {
    return null;
  }

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

  const calendar = createGoogleCalendarClient(connection);
  if (!calendar) {
    return;
  }

  const plannerCalendarId = await resolveCalendarId(calendar, connection.plannerCalendarId);
  const fallbackCalendarId = await resolveCalendarId(calendar, connection.calendarId);
  await withCalendarFallback([plannerCalendarId, fallbackCalendarId], (calendarId) =>
    calendar.events.delete({
      calendarId,
      eventId: googleEventId,
    }),
  );
}
