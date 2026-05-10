import type { CalendarSync } from "@timefraim/shared";
import { pool } from "../db/pool.js";
import type { GoogleConnection } from "../integration/google-calendar.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import { endOfDay, startOfDay } from "../utils/date.js";
import { getGoogleConnection, readGoogleSyncCalendarIds } from "./planner-service-integrations.js";

const NOT_SYNCED: CalendarSync = {
  status: "not_synced",
  syncedAt: null,
  hiddenEventCount: 0,
};

type GoogleCalendarSyncScope = {
  connection: GoogleConnection | null;
  range: { startAt: string; endAt: string };
  runInput: {
    provider: "google";
    plannerDate: string;
    tzOffsetMinutes: number;
    sourceCalendarIds: string[];
  };
  syncCalendarIds?: string[];
};

export function normalizeCalendarSyncIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

export function buildGoogleCalendarSyncScope(args: {
  connection: GoogleConnection | null;
  date: string;
  syncCalendarIds?: string[];
  tzOffsetMinutes: number;
}): GoogleCalendarSyncScope {
  const sourceCalendarIds = normalizeCalendarSyncIds(
    args.syncCalendarIds ?? [args.connection?.calendarId ?? "primary"],
  );

  return {
    connection: args.connection,
    range: {
      startAt: startOfDay(args.date, args.tzOffsetMinutes).toISOString(),
      endAt: endOfDay(args.date, args.tzOffsetMinutes).toISOString(),
    },
    runInput: {
      provider: "google",
      plannerDate: args.date,
      tzOffsetMinutes: args.tzOffsetMinutes,
      sourceCalendarIds,
    },
    syncCalendarIds: args.syncCalendarIds,
  };
}

export async function getGoogleCalendarSyncScope(
  repository: PlannerRepository,
  date: string,
  tzOffsetMinutes: number,
) {
  const [connection, row] = await Promise.all([
    getGoogleConnection(repository),
    repository.getIntegrationToken("google", pool),
  ]);
  return buildGoogleCalendarSyncScope({
    connection,
    date,
    syncCalendarIds: readGoogleSyncCalendarIds(row),
    tzOffsetMinutes,
  });
}

async function buildCalendarSync(
  repository: PlannerRepository,
  scope: GoogleCalendarSyncScope,
  syncedAt: string,
): Promise<CalendarSync> {
  const hiddenEventCount = await repository.countHiddenCalendarEventsForRange(
    scope.range,
    scope.runInput.sourceCalendarIds,
    pool,
  );

  return {
    status: hiddenEventCount > 0 ? "partially_synced" : "fully_synced",
    syncedAt,
    hiddenEventCount,
  };
}

export async function getGoogleCalendarSyncForDay(
  repository: PlannerRepository,
  date: string,
  tzOffsetMinutes: number,
) {
  const scope = await getGoogleCalendarSyncScope(repository, date, tzOffsetMinutes);
  if (!scope.connection) {
    return NOT_SYNCED;
  }

  const run = await repository.getCalendarSyncRun(scope.runInput, pool);
  return run ? buildCalendarSync(repository, scope, run.syncedAt) : NOT_SYNCED;
}

export async function recordGoogleCalendarSync(
  repository: PlannerRepository,
  scope: GoogleCalendarSyncScope,
) {
  const run = await repository.upsertCalendarSyncRun(scope.runInput, pool);
  return buildCalendarSync(repository, scope, run.syncedAt);
}
