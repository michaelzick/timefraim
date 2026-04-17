import { pool } from "../db/pool.js";
import { syncGoogleCalendarWindow } from "../integration/google-calendar.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import { endOfDay, startOfDay } from "../utils/date.js";
import {
  getGoogleConnection,
  readGoogleSyncCalendarIds,
} from "./planner-service-integrations.js";

function getSyncCalendarIds(repository: PlannerRepository): Promise<string[] | undefined> {
  return repository.getIntegrationToken("google", pool).then((row) => {
    return readGoogleSyncCalendarIds(row);
  });
}

export async function syncPlannerGoogleCalendar(
  repository: PlannerRepository,
  date: string,
  tzOffsetMinutes: number,
) {
  const connection = await getGoogleConnection(repository);
  const syncCalendarIds = await getSyncCalendarIds(repository);
  const range = {
    timeMin: startOfDay(date, tzOffsetMinutes).toISOString(),
    timeMax: endOfDay(date, tzOffsetMinutes).toISOString(),
  };
  const records = await syncGoogleCalendarWindow(connection, range, syncCalendarIds);

  const syncedExternalEventIds: string[] = [];
  for (const record of records) {
    syncedExternalEventIds.push(record.externalEventId);
    await repository.upsertCalendarEvent(
      {
        externalEventId: record.externalEventId,
        title: record.title,
        startAt: record.startAt,
        endAt: record.endAt,
        isAppManaged: record.isAppManaged,
        backgroundColor: record.backgroundColor,
        foregroundColor: record.foregroundColor,
        scheduleBlockId: record.scheduleBlockId,
        rawPayload: record.rawPayload,
        externalUpdatedAt: record.externalUpdatedAt,
        dismissedExternalUpdatedAt: null,
        sourceCalendarId: record.sourceCalendarId,
        sourceCalendarName: record.sourceCalendarName,
      },
      pool,
    );
  }

  const effectiveCalendarIds = syncCalendarIds ?? [connection?.calendarId ?? "primary"];
  await repository.deleteStaleCalendarEvents(
    { startAt: range.timeMin, endAt: range.timeMax },
    syncedExternalEventIds,
    effectiveCalendarIds,
    pool,
  );

  return repository.listCalendarEventsForRange({ startAt: range.timeMin, endAt: range.timeMax }, pool);
}
