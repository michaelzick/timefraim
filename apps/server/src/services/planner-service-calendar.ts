import type { CalendarSyncResult } from "@timefraim/shared";
import { pool } from "../db/pool.ts";
import { syncGoogleCalendarWindow } from "../integration/google-calendar.ts";
import type { PlannerRepository } from "../repositories/planner-repository.ts";
import {
  readGoogleConnection,
  readGoogleSyncCalendarIds,
} from "./planner-service-integrations.ts";
import {
  buildGoogleCalendarSyncScope,
  recordGoogleCalendarSync,
} from "./planner-service-calendar-sync.ts";
import { resolveDismissedExternalUpdatedAt } from "./planner-domain.ts";
import { syncGoogleTaskCompletionStatuses } from "./planner-service-google-tasks-sync.ts";

export async function syncPlannerGoogleCalendar(
  repository: PlannerRepository,
  date: string,
  tzOffsetMinutes: number,
  options: { restoreHidden?: boolean } = {},
): Promise<CalendarSyncResult> {
  const row = await repository.getIntegrationToken("google", pool);
  const connection = await readGoogleConnection(row, repository);
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
        dismissedExternalUpdatedAt: options.restoreHidden || !previousEvent
          ? null
          : resolveDismissedExternalUpdatedAt({
              previousExternalUpdatedAt: previousEvent.externalUpdatedAt,
              previousDismissedExternalUpdatedAt: previousEvent.dismissedExternalUpdatedAt,
              nextExternalUpdatedAt: record.externalUpdatedAt,
            }),
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

  try {
    await syncGoogleTaskCompletionStatuses({
      repository,
      connection,
      range: scope.range,
      tzOffsetMinutes,
    });
  } catch (error) {
    // A Google Tasks hiccup must not fail the calendar sync; the next 30s tick retries.
    console.error("google task completion sync failed", error);
  }

  const events = await repository.listCalendarEventsForRange(scope.range, pool);
  return {
    date,
    events,
    calendarSync: await recordGoogleCalendarSync(repository, scope),
  };
}
