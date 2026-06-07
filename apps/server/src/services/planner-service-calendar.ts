import type { CalendarSyncResult } from "@timefraim/shared";
import { pool } from "../db/pool.js";
import { syncGoogleCalendarWindow } from "../integration/google-calendar.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import {
  readGoogleConnection,
  readGoogleSyncCalendarIds,
} from "./planner-service-integrations.js";
import {
  buildGoogleCalendarSyncScope,
  recordGoogleCalendarSync,
} from "./planner-service-calendar-sync.js";
import { resolveDismissedExternalUpdatedAt } from "./planner-domain.js";
import { syncGoogleTaskCompletionStatuses } from "./planner-service-google-tasks-sync.js";

export async function syncPlannerGoogleCalendar(
  repository: PlannerRepository,
  date: string,
  tzOffsetMinutes: number,
): Promise<CalendarSyncResult> {
  const row = await repository.getIntegrationToken("google", pool);
  const connection = readGoogleConnection(row);
  const syncCalendarIds = readGoogleSyncCalendarIds(row);
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
    const previousEvent = record.isAppManaged
      ? null
      : await repository.getCalendarEventByExternalEventId(record.externalEventId, pool);
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
        dismissedExternalUpdatedAt: previousEvent
          ? resolveDismissedExternalUpdatedAt({
              previousExternalUpdatedAt: previousEvent.externalUpdatedAt,
              previousDismissedExternalUpdatedAt: previousEvent.dismissedExternalUpdatedAt,
              nextExternalUpdatedAt: record.externalUpdatedAt,
            })
          : null,
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

  await syncGoogleTaskCompletionStatuses({
    repository,
    connection,
    range: scope.range,
  });

  const events = await repository.listCalendarEventsForRange(scope.range, pool);
  return {
    date,
    events,
    calendarSync: await recordGoogleCalendarSync(repository, scope),
  };
}
