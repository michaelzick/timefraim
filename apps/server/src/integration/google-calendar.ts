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
  rawPayload: Record<string, unknown>;
  scheduleBlockId: string | null;
  externalUpdatedAt: string | null;
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
  const calendarId = await resolveCalendarId(calendar, connection.calendarId);
  const response = await calendar.events.list({
    calendarId,
    singleEvents: true,
    orderBy: "startTime",
    timeMin: range.timeMin,
    timeMax: range.timeMax,
  });

  return (response.data.items ?? [])
    .filter((event) => event.id && event.start?.dateTime && event.end?.dateTime)
    .map((event) => ({
      externalEventId: event.id!,
      title: event.summary ?? "Busy",
      startAt: event.start!.dateTime!,
      endAt: event.end!.dateTime!,
      isAppManaged: event.extendedProperties?.private?.origin === "timefraim",
      rawPayload: event as unknown as Record<string, unknown>,
      scheduleBlockId: event.extendedProperties?.private?.scheduleBlockId ?? null,
      externalUpdatedAt: event.updated ?? null,
    }));
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
