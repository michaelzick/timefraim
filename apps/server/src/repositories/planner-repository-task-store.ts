import type { Queryable } from "../db/pool.js";
import {
  mapScheduleBlock,
  mapTask,
} from "./planner-repository-mappers.js";
import type {
  CreateScheduleBlockInput,
  CreateTaskInput,
  ScheduleBlockPatch,
  TaskPatch,
} from "./planner-repository-types.js";

export class PlannerRepositoryTaskStore {
  async listTasks(db: Queryable) {
    const result = await db.query(
      `select *
       from public.tasks
       order by
         case status
           when 'in_progress' then 0
           when 'scheduled' then 1
           when 'planned' then 2
           when 'inbox' then 2
           when 'done' then 4
           else 5
         end,
         case priority
           when 'urgent' then 0
           when 'high' then 1
           when 'medium' then 2
           when 'low' then 3
           else 4
         end,
         updated_at desc`,
    );
    return result.rows.map(mapTask);
  }

  async getTask(taskId: string, db: Queryable) {
    const result = await db.query(`select * from public.tasks where id = $1 limit 1`, [taskId]);
    return result.rows[0] ? mapTask(result.rows[0]) : null;
  }

  async createTask(input: CreateTaskInput, db: Queryable) {
    const result = await db.query(
      `insert into public.tasks (title, notes, estimated_minutes, status, priority, toggl_project_id, completed_on_date)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [
        input.title,
        input.notes,
        input.estimatedMinutes,
        input.status,
        input.priority,
        input.togglProjectId,
        input.completedOnDate ?? null,
      ],
    );
    return mapTask(result.rows[0]);
  }

  async updateTask(taskId: string, patch: TaskPatch, db: Queryable) {
    const fields: string[] = [];
    const values: unknown[] = [];
    const assign = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (typeof patch.title !== "undefined") assign("title", patch.title);
    if (typeof patch.notes !== "undefined") assign("notes", patch.notes);
    if (typeof patch.estimatedMinutes !== "undefined") assign("estimated_minutes", patch.estimatedMinutes);
    if (typeof patch.status !== "undefined") assign("status", patch.status);
    if (typeof patch.priority !== "undefined") assign("priority", patch.priority);
    if (typeof patch.togglProjectId !== "undefined") assign("toggl_project_id", patch.togglProjectId);
    if (typeof patch.scheduledBlockId !== "undefined") assign("scheduled_block_id", patch.scheduledBlockId);
    if (typeof patch.completedOnDate !== "undefined") assign("completed_on_date", patch.completedOnDate);

    if (fields.length === 0) {
      const current = await this.getTask(taskId, db);
      if (!current) {
        throw new Error(`Task ${taskId} not found`);
      }
      return current;
    }

    values.push(taskId);
    const result = await db.query(
      `update public.tasks
       set ${fields.join(", ")}
       where id = $${values.length}
       returning *`,
      values,
    );
    return mapTask(result.rows[0]);
  }

  async deleteTask(taskId: string, db: Queryable) {
    const result = await db.query(`delete from public.tasks where id = $1 returning *`, [taskId]);
    return result.rows[0] ? mapTask(result.rows[0]) : null;
  }

  async listScheduleBlocksForRange(range: { startAt: string; endAt: string }, db: Queryable) {
    const result = await db.query(
      `select *
       from public.schedule_blocks
       where start_at < $2 and end_at > $1
       order by start_at asc`,
      [range.startAt, range.endAt],
    );
    return result.rows.map(mapScheduleBlock);
  }

  async getScheduleBlock(scheduleBlockId: string, db: Queryable) {
    const result = await db.query(`select * from public.schedule_blocks where id = $1 limit 1`, [
      scheduleBlockId,
    ]);
    return result.rows[0] ? mapScheduleBlock(result.rows[0]) : null;
  }

  async getScheduleBlockByTaskId(taskId: string, db: Queryable) {
    const result = await db.query(`select * from public.schedule_blocks where task_id = $1 limit 1`, [taskId]);
    return result.rows[0] ? mapScheduleBlock(result.rows[0]) : null;
  }

  async createScheduleBlock(input: CreateScheduleBlockInput, db: Queryable) {
    const result = await db.query(
      `insert into public.schedule_blocks (task_id, start_at, end_at, source, state)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [input.taskId, input.startAt, input.endAt, input.source, input.state],
    );
    return mapScheduleBlock(result.rows[0]);
  }

  async updateScheduleBlock(scheduleBlockId: string, patch: ScheduleBlockPatch, db: Queryable) {
    const fields: string[] = [];
    const values: unknown[] = [];
    const assign = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (typeof patch.startAt !== "undefined") assign("start_at", patch.startAt);
    if (typeof patch.endAt !== "undefined") assign("end_at", patch.endAt);
    if (typeof patch.source !== "undefined") assign("source", patch.source);
    if (typeof patch.state !== "undefined") assign("state", patch.state);
    if (typeof patch.googleEventId !== "undefined") assign("google_event_id", patch.googleEventId);

    if (fields.length === 0) {
      const current = await this.getScheduleBlock(scheduleBlockId, db);
      if (!current) {
        throw new Error(`Schedule block ${scheduleBlockId} not found`);
      }
      return current;
    }

    values.push(scheduleBlockId);
    const result = await db.query(
      `update public.schedule_blocks
       set ${fields.join(", ")}
       where id = $${values.length}
       returning *`,
      values,
    );
    return mapScheduleBlock(result.rows[0]);
  }

  async deleteScheduleBlock(scheduleBlockId: string, db: Queryable) {
    const result = await db.query(`delete from public.schedule_blocks where id = $1 returning *`, [
      scheduleBlockId,
    ]);
    return result.rows[0] ? mapScheduleBlock(result.rows[0]) : null;
  }
}
