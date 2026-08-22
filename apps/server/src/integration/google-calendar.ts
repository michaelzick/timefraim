import type { ScheduleBlock, Task } from "@timefraim/shared";
import { buildGoogleEventPayload } from "../services/planner-domain.ts";
import {
  createGoogleClient,
  GOOGLE_CALENDAR_API,
  googleUrl,
  type GoogleClient,
  type GoogleConnection,
} from "./google-api-client.ts";
import type { GoogleEventResource, GoogleEventsListResponse } from "./google-api-types.ts";
import {
  getCalendarListItems,
  loadGoogleColorPalette,
  resolveCalendarColors,
  resolveCalendarId,
  resolveEventColors,
  withCalendarFallback,
  type GoogleColorPalette,
  type GoogleColorValues,
} from "./google-calendar-helpers.ts";

export type { GoogleConnection } from "./google-api-client.ts";

export type GoogleEventRecord = { externalEventId: string; title: string; startAt: string; endAt: string; isAppManaged: boolean; backgroundColor: string | null; foregroundColor: string | null; rawPayload: Record<string, unknown>; scheduleBlockId: string | null; externalUpdatedAt: string | null; sourceCalendarId: string | null; sourceCalendarName: string | null };

export type GoogleCalendarListEntry = { id: string; name: string; primary: boolean; backgroundColor: string | null };

const READABLE_ACCESS_ROLES = new Set(["owner", "reader", "writer", "freeBusyReader"]);

function eventsUrl(calendarId: string, eventId?: string, query?: Record<string, string | boolean | undefined>) {
  return googleUrl(GOOGLE_CALENDAR_API, ["calendars", calendarId, "events", ...(eventId ? [eventId] : [])], query);
}

function mapGoogleEventRecord(
  event: GoogleEventResource,
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
    rawPayload: event as Record<string, unknown>,
    scheduleBlockId: event.extendedProperties?.private?.scheduleBlockId ?? null,
    externalUpdatedAt: event.updated ?? null,
    sourceCalendarId,
    sourceCalendarName,
  };
}

async function listEventsInRange(client: GoogleClient, calendarId: string, range: { timeMin: string; timeMax: string }) {
  const events: GoogleEventResource[] = [];
  let pageToken: string | undefined;
  do {
    const response = await client.request<GoogleEventsListResponse>(
      "GET",
      eventsUrl(calendarId, undefined, {
        singleEvents: true,
        orderBy: "startTime",
        timeMin: range.timeMin,
        timeMax: range.timeMax,
        pageToken,
      }),
    );
    events.push(...(response.items ?? []));
    pageToken = response.nextPageToken ?? undefined;
  } while (pageToken);
  return events;
}

export async function listGoogleCalendars(
  connection: GoogleConnection | null,
): Promise<GoogleCalendarListEntry[]> {
  const client = createGoogleClient(connection);
  if (!client) {
    return [];
  }

  const items = await getCalendarListItems(client);
  return items.flatMap((item) => {
    if (!item.id || !READABLE_ACCESS_ROLES.has(item.accessRole ?? "")) {
      return [];
    }
    return [{
      id: item.id,
      name: item.summary ?? item.id,
      primary: item.primary === true,
      backgroundColor: item.backgroundColor ?? null,
    }];
  });
}

export async function syncGoogleCalendarWindow(
  connection: GoogleConnection | null,
  range: { timeMin: string; timeMax: string },
  syncCalendarIds?: string[],
): Promise<GoogleEventRecord[]> {
  const client = createGoogleClient(connection);
  if (!connection || !client) {
    return [];
  }

  const calendarIds = syncCalendarIds && syncCalendarIds.length > 0
    ? syncCalendarIds
    : [connection.calendarId];

  const colorPalette = await loadGoogleColorPalette(client);
  const calendarListItems = await getCalendarListItems(client);
  const allRecords: GoogleEventRecord[] = [];

  for (const rawCalendarId of calendarIds) {
    const resolvedId = await resolveCalendarId(client, rawCalendarId);
    const calendarColors = await resolveCalendarColors(client, rawCalendarId, colorPalette);
    const calendarMeta = calendarListItems.find((item) =>
      item.id === resolvedId || (resolvedId === "primary" && item.primary === true),
    );
    const calendarName = calendarMeta?.summary ?? rawCalendarId;

    const events = await listEventsInRange(client, resolvedId, range);
    const records = events
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
  const client = createGoogleClient(params.connection);
  if (!params.connection || !client) {
    return null;
  }

  const payload = buildGoogleEventPayload(params.task, params.block);
  const plannerCalendarId = await resolveCalendarId(client, params.connection.plannerCalendarId);
  const fallbackCalendarId = await resolveCalendarId(client, params.connection.calendarId);

  if (params.block.googleEventId) {
    const eventId = params.block.googleEventId;
    await withCalendarFallback([plannerCalendarId, fallbackCalendarId], (calendarId) =>
      client.request("PUT", eventsUrl(calendarId, eventId), payload),
    );
    return eventId;
  }

  const response = await client.request<GoogleEventResource>("POST", eventsUrl(plannerCalendarId), payload);
  return response.id ?? null;
}

export async function deleteGoogleScheduleBlock(
  connection: GoogleConnection | null,
  googleEventId: string | null | undefined,
): Promise<void> {
  const client = createGoogleClient(connection);
  if (!connection || !client || !googleEventId) {
    return;
  }

  const plannerCalendarId = await resolveCalendarId(client, connection.plannerCalendarId);
  const fallbackCalendarId = await resolveCalendarId(client, connection.calendarId);
  await withCalendarFallback([plannerCalendarId, fallbackCalendarId], (calendarId) =>
    client.request("DELETE", eventsUrl(calendarId, googleEventId)),
  );
}
