import { pool } from "../db/pool.js";
import { syncGoogleCalendarWindow } from "../integration/google-calendar.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import { endOfDay, startOfDay } from "../utils/date.js";
import { getGoogleConnection } from "./planner-service-integrations.js";

export async function syncPlannerGoogleCalendar(
  repository: PlannerRepository,
  date: string,
  tzOffsetMinutes: number,
) {
  const connection = await getGoogleConnection(repository);
  const range = {
    timeMin: startOfDay(date, tzOffsetMinutes).toISOString(),
    timeMax: endOfDay(date, tzOffsetMinutes).toISOString(),
  };
  const records = await syncGoogleCalendarWindow(connection, range);

  for (const record of records) {
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
      },
      pool,
    );
  }

  return repository.listCalendarEventsForRange({ startAt: range.timeMin, endAt: range.timeMax }, pool);
}
