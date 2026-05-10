import type { CalendarSyncResult } from "@timefraim/shared";
import { pool } from "../db/pool.js";
import { syncGoogleCalendarWindow } from "../integration/google-calendar.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import {
  getGoogleConnection,
  readGoogleSyncCalendarIds,
} from "./planner-service-integrations.js";
import {
  buildGoogleCalendarSyncScope,
  recordGoogleCalendarSync,
} from "./planner-service-calendar-sync.js";

function getSyncCalendarIds(repository: PlannerRepository): Promise<string[] | undefined> {
  return repository.getIntegrationToken("google", pool).then((row) => {
    return readGoogleSyncCalendarIds(row);
  });
}

export async function syncPlannerGoogleCalendar(
  repository: PlannerRepository,
  date: string,
  tzOffsetMinutes: number,
): Promise<CalendarSyncResult> {
  const connection = await getGoogleConnection(repository);
  const syncCalendarIds = await getSyncCalendarIds(repository);
  const scope = buildGoogleCalendarSyncScope({ connection, date, syncCalendarIds, tzOffsetMinutes });
  if (!connection) {
    const events = await repository.listCalendarEventsForRange(scope.range, pool);
    return {
      date,
      events,
      calendarSync: { status: "not_synced", syncedAt: null, hiddenEventCount: 0 },
    };
  }

  const records = await syncGoogleCalendarWindow(
    connection,
    { timeMin: scope.range.startAt, timeMax: scope.range.endAt },
    syncCalendarIds,
  );

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

  await repository.deleteStaleCalendarEvents(
    scope.range,
    syncedExternalEventIds,
    scope.runInput.sourceCalendarIds,
    pool,
  );

  const events = await repository.listCalendarEventsForRange(scope.range, pool);
  return {
    date,
    events,
    calendarSync: await recordGoogleCalendarSync(repository, scope),
  };
}
