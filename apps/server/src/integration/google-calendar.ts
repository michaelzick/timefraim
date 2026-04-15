import type { ScheduleBlock, Task } from "@timefraim/shared";
import { google, type calendar_v3 } from "googleapis";
import { buildGoogleEventPayload } from "../services/planner-domain.js";
import { getGoogleOAuthClient } from "./google-auth.js";
import {
  loadGoogleColorPalette,
  resolveCalendarColors,
  resolveCalendarId,
  resolveEventColors,
  withCalendarFallback,
  type GoogleColorPalette,
  type GoogleColorValues,
} from "./google-calendar-helpers.js";

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

function createGoogleCalendarClient(connection: GoogleConnection) {
  const auth = getGoogleOAuthClient(connection);
  return auth ? google.calendar({ version: "v3", auth }) : null;
}

function mapGoogleEventRecord(
  event: calendar_v3.Schema$Event,
  calendarColors: GoogleColorValues,
  colorPalette: GoogleColorPalette,
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
  };
}

export async function syncGoogleCalendarWindow(
  connection: GoogleConnection | null,
  range: { timeMin: string; timeMax: string },
): Promise<GoogleEventRecord[]> {
  if (!connection) {
    return [];
  }

  const calendar = createGoogleCalendarClient(connection);
  if (!calendar) {
    return [];
  }

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
    .map((event) => mapGoogleEventRecord(event, calendarColors, colorPalette))
    .filter((event): event is GoogleEventRecord => Boolean(event));
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
