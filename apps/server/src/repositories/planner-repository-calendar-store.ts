import type { Queryable } from "../db/pool.js";
import {
  mapCalendarEventRecord,
  mapCalendarEventView,
} from "./planner-repository-mappers.js";
import { PlannerRepositoryTaskStore } from "./planner-repository-task-store.js";
import type { UpsertCalendarEventInput } from "./planner-repository-types.js";

export class PlannerRepositoryCalendarStore extends PlannerRepositoryTaskStore {
  async listCalendarEventsForRange(range: { startAt: string; endAt: string }, db: Queryable) {
    const result = await db.query(
      `select *
       from public.calendar_events
       where start_at < $2 and end_at > $1
         and is_app_managed = false
         and (
           dismissed_external_updated_at is null
           or dismissed_external_updated_at is distinct from external_updated_at
         )
       order by start_at asc`,
      [range.startAt, range.endAt],
    );
    return result.rows.map(mapCalendarEventView);
  }

  async getCalendarEvent(calendarEventId: string, db: Queryable) {
    const result = await db.query(`select * from public.calendar_events where id = $1 limit 1`, [
      calendarEventId,
    ]);
    return result.rows[0] ? mapCalendarEventRecord(result.rows[0]) : null;
  }

  async getCalendarEventByExternalEventId(externalEventId: string, db: Queryable) {
    const result = await db.query(
      `select *
       from public.calendar_events
       where provider = 'google' and external_event_id = $1
       limit 1`,
      [externalEventId],
    );
    return result.rows[0] ? mapCalendarEventRecord(result.rows[0]) : null;
  }

  async upsertCalendarEvent(input: UpsertCalendarEventInput, db: Queryable) {
    const result = await db.query(
      `insert into public.calendar_events (
         provider,
         external_event_id,
         title,
         start_at,
         end_at,
         is_app_managed,
         schedule_block_id,
         raw_payload,
         external_updated_at,
         dismissed_external_updated_at
       )
       values ('google', $1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (provider, external_event_id)
       do update
         set title = excluded.title,
             start_at = excluded.start_at,
             end_at = excluded.end_at,
             is_app_managed = excluded.is_app_managed,
             schedule_block_id = excluded.schedule_block_id,
             raw_payload = excluded.raw_payload,
             external_updated_at = excluded.external_updated_at,
             dismissed_external_updated_at = excluded.dismissed_external_updated_at
       returning *`,
      [
        input.externalEventId,
        input.title,
        input.startAt,
        input.endAt,
        input.isAppManaged,
        input.scheduleBlockId,
        input.rawPayload,
        input.externalUpdatedAt,
        input.dismissedExternalUpdatedAt,
      ],
    );
    return mapCalendarEventRecord(result.rows[0]);
  }

  async deleteCalendarEventByScheduleBlockId(scheduleBlockId: string, db: Queryable) {
    await db.query(`delete from public.calendar_events where schedule_block_id = $1`, [scheduleBlockId]);
  }

  async dismissCalendarEvent(calendarEventId: string, db: Queryable) {
    const result = await db.query(
      `update public.calendar_events
       set dismissed_external_updated_at = external_updated_at
       where id = $1
       returning *`,
      [calendarEventId],
    );
    return result.rows[0] ? mapCalendarEventRecord(result.rows[0]) : null;
  }
}
