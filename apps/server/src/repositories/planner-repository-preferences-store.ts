import type { UserPreferences } from "@timefraim/shared";
import type { Queryable } from "../db/pool.js";
import { mapUserPreferences } from "./planner-repository-mappers.js";
import { PlannerRepositoryTimerStore } from "./planner-repository-timer-store.js";

export class PlannerRepositoryPreferencesStore extends PlannerRepositoryTimerStore {
  async getUserPreferences(userId: string, db: Queryable): Promise<UserPreferences | null> {
    const result = await db.query(
      `select * from public.user_preferences where user_id = $1 limit 1`,
      [userId],
    );
    return result.rows[0] ? mapUserPreferences(result.rows[0]) : null;
  }

  async upsertUserPreferences(
    userId: string,
    input: UserPreferences,
    db: Queryable,
  ): Promise<UserPreferences> {
    const result = await db.query(
      `insert into public.user_preferences (
         user_id,
         theme,
         task_start_notifications_enabled,
         task_end_notifications_enabled
       )
       values ($1, $2, $3, $4)
       on conflict (user_id)
       do update
         set theme = excluded.theme,
             task_start_notifications_enabled = excluded.task_start_notifications_enabled,
             task_end_notifications_enabled = excluded.task_end_notifications_enabled
       returning *`,
      [
        userId,
        input.theme,
        input.taskStartNotificationsEnabled,
        input.taskEndNotificationsEnabled,
      ],
    );
    return mapUserPreferences(result.rows[0]);
  }
}
