import type { Queryable } from "../db/pool.js";
import { mapTimer } from "./planner-repository-mappers.js";
import { PlannerRepositoryDraftStore } from "./planner-repository-draft-store.js";

export class PlannerRepositoryTimerStore extends PlannerRepositoryDraftStore {
  async createTimerSession(
    input: { taskId?: string | null; calendarEventId?: string | null; startedAt: string; source: "manual" | "ai" | "sync" },
    db: Queryable,
  ) {
    const result = await db.query(
      `insert into public.timer_sessions (task_id, calendar_event_id, started_at, source)
       values ($1, $2, $3, $4)
       returning *`,
      [input.taskId ?? null, input.calendarEventId ?? null, input.startedAt, input.source],
    );
    return mapTimer(result.rows[0]);
  }

  async attachTogglEntry(timerSessionId: string, togglEntryId: string, db: Queryable) {
    const result = await db.query(
      `update public.timer_sessions
       set toggl_entry_id = $2
       where id = $1
       returning *`,
      [timerSessionId, togglEntryId],
    );
    return mapTimer(result.rows[0]);
  }

  async getActiveTimer(db: Queryable) {
    const result = await db.query(
      `select *
       from public.timer_sessions
       where ended_at is null
       order by started_at desc
       limit 1`,
    );
    return result.rows[0] ? mapTimer(result.rows[0]) : null;
  }

  async stopTimer(timerSessionId: string, endedAt: string, durationSeconds: number, db: Queryable) {
    const result = await db.query(
      `update public.timer_sessions
       set ended_at = $2, duration_seconds = $3
       where id = $1
       returning *`,
      [timerSessionId, endedAt, durationSeconds],
    );
    return mapTimer(result.rows[0]);
  }
}
