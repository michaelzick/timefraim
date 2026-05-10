import type { Queryable } from "../db/pool.js";
import { mapCalendarSyncRun } from "./planner-repository-mappers.js";
import { PlannerRepositoryCalendarStore } from "./planner-repository-calendar-store.js";

type CalendarSyncRunInput = {
  provider: "google";
  plannerDate: string;
  tzOffsetMinutes: number;
  sourceCalendarIds: string[];
};

export class PlannerRepositoryCalendarSyncStore extends PlannerRepositoryCalendarStore {
  async upsertCalendarSyncRun(input: CalendarSyncRunInput, db: Queryable) {
    try {
      const result = await db.query(
        `insert into public.calendar_sync_runs (
           provider,
           planner_date,
           tz_offset_minutes,
           source_calendar_ids
         )
         values ($1, $2, $3, $4::text[])
         on conflict (provider, planner_date, tz_offset_minutes, source_calendar_ids)
         do update
           set synced_at = timezone('utc', now())
         returning *`,
        [input.provider, input.plannerDate, input.tzOffsetMinutes, input.sourceCalendarIds],
      );
      return mapCalendarSyncRun(result.rows[0]);
    } catch (error) {
      if (isMissingCalendarSyncRunsTable(error)) {
        return null;
      }
      throw error;
    }
  }

  async getCalendarSyncRun(input: CalendarSyncRunInput, db: Queryable) {
    try {
      const result = await db.query(
        `select *
         from public.calendar_sync_runs
         where provider = $1
           and planner_date = $2
           and tz_offset_minutes = $3
           and source_calendar_ids = $4::text[]
         limit 1`,
        [input.provider, input.plannerDate, input.tzOffsetMinutes, input.sourceCalendarIds],
      );
      return result.rows[0] ? mapCalendarSyncRun(result.rows[0]) : null;
    } catch (error) {
      if (isMissingCalendarSyncRunsTable(error)) {
        return null;
      }
      throw error;
    }
  }

  async countHiddenCalendarEventsForRange(
    range: { startAt: string; endAt: string },
    sourceCalendarIds: string[],
    db: Queryable,
  ) {
    const result = await db.query(
      `select count(*)::int as hidden_count
       from public.calendar_events
       where start_at < $2 and end_at > $1
         and is_app_managed = false
         and (
           coalesce(array_length($3::text[], 1), 0) = 0
           or source_calendar_id is null
           or source_calendar_id = any($3::text[])
         )
         and dismissed_external_updated_at is not null
         and (
           external_updated_at is null
           or dismissed_external_updated_at is not distinct from external_updated_at
         )`,
      [range.startAt, range.endAt, sourceCalendarIds],
    );
    const row = result.rows[0] as { hidden_count?: unknown } | undefined;
    return Number(row?.hidden_count ?? 0);
  }
}

function isMissingCalendarSyncRunsTable(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "42P01";
}
