import {
  auditLogSchema,
  calendarEventViewSchema,
  integrationStatusSchema,
  scheduleBlockSchema,
  syncDraftSchema,
  taskSchema,
  timerSessionSchema,
  type ActorRole,
  type DraftKind,
  type DraftStatus,
  type IntegrationStatus,
  type ScheduleBlockSource,
  type ScheduleBlockState,
  type TaskStatus,
} from "@timefraim/shared";
import { randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import type { Queryable } from "../db/pool.js";
import { asIso } from "../utils/date.js";

type IntegrationTokenRow = {
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | Date | null;
  metadata: Record<string, unknown>;
};

export type CalendarEventRecord = {
  id: string;
  externalEventId: string;
  title: string;
  startAt: string;
  endAt: string;
  isAppManaged: boolean;
  scheduleBlockId: string | null;
  rawPayload: Record<string, unknown>;
  externalUpdatedAt: string | null;
  dismissedExternalUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapTask(row: QueryResultRow) {
  return taskSchema.parse({
    id: row.id,
    title: row.title,
    notes: row.notes,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    scheduledBlockId: row.scheduled_block_id,
    togglProjectId: row.toggl_project_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  });
}

function mapScheduleBlock(row: QueryResultRow) {
  return scheduleBlockSchema.parse({
    id: row.id,
    taskId: row.task_id,
    startAt: asIso(row.start_at),
    endAt: asIso(row.end_at),
    source: row.source,
    state: row.state,
    googleEventId: row.google_event_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  });
}

function mapCalendarEventView(row: QueryResultRow) {
  return calendarEventViewSchema.parse({
    id: row.id,
    externalEventId: row.external_event_id,
    title: row.title,
    startAt: asIso(row.start_at),
    endAt: asIso(row.end_at),
    isAppManaged: row.is_app_managed,
  });
}

function mapCalendarEventRecord(row: QueryResultRow): CalendarEventRecord {
  return {
    id: row.id,
    externalEventId: row.external_event_id,
    title: row.title,
    startAt: asIso(row.start_at)!,
    endAt: asIso(row.end_at)!,
    isAppManaged: row.is_app_managed,
    scheduleBlockId: row.schedule_block_id,
    rawPayload: (row.raw_payload ?? {}) as Record<string, unknown>,
    externalUpdatedAt: asIso(row.external_updated_at),
    dismissedExternalUpdatedAt: asIso(row.dismissed_external_updated_at),
    createdAt: asIso(row.created_at)!,
    updatedAt: asIso(row.updated_at)!,
  };
}

function mapDraft(row: QueryResultRow) {
  return syncDraftSchema.parse({
    id: row.id,
    kind: row.kind,
    payload: row.payload,
    diffSummary: row.diff_summary,
    status: row.status,
    actorRole: row.actor_role,
    expiresAt: asIso(row.expires_at),
    createdAt: asIso(row.created_at),
    appliedAt: asIso(row.applied_at),
    rejectedAt: asIso(row.rejected_at),
  });
}

function mapTimer(row: QueryResultRow) {
  return timerSessionSchema.parse({
    id: row.id,
    taskId: row.task_id,
    togglEntryId: row.toggl_entry_id,
    startedAt: asIso(row.started_at),
    endedAt: asIso(row.ended_at),
    durationSeconds: row.duration_seconds,
    source: row.source,
  });
}

function mapAuditLog(row: QueryResultRow) {
  return auditLogSchema.parse({
    id: row.id,
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    diffSummary: row.diff_summary,
    payload: row.payload,
    createdAt: asIso(row.created_at),
  });
}

export class PlannerRepository {
  async listTasks(db: Queryable) {
    const result = await db.query(
      `select *
       from public.tasks
       where status <> 'archived'
       order by
         case status
           when 'in_progress' then 0
           when 'scheduled' then 1
           when 'planned' then 2
           when 'inbox' then 3
           when 'done' then 4
           else 5
         end,
         updated_at desc`,
    );
    return result.rows.map(mapTask);
  }

  async getTask(taskId: string, db: Queryable) {
    const result = await db.query(`select * from public.tasks where id = $1 limit 1`, [taskId]);
    return result.rows[0] ? mapTask(result.rows[0]) : null;
  }

  async createTask(
    input: {
      title: string;
      notes: string | null;
      estimatedMinutes: number;
      status: TaskStatus;
      togglProjectId: string | null;
    },
    db: Queryable,
  ) {
    const result = await db.query(
      `insert into public.tasks (title, notes, estimated_minutes, status, toggl_project_id)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [input.title, input.notes, input.estimatedMinutes, input.status, input.togglProjectId],
    );
    return mapTask(result.rows[0]);
  }

  async updateTask(
    taskId: string,
    patch: Partial<{
      title: string;
      notes: string | null;
      estimatedMinutes: number;
      status: TaskStatus;
      togglProjectId: string | null;
      scheduledBlockId: string | null;
    }>,
    db: Queryable,
  ) {
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
    if (typeof patch.togglProjectId !== "undefined") assign("toggl_project_id", patch.togglProjectId);
    if (typeof patch.scheduledBlockId !== "undefined") assign("scheduled_block_id", patch.scheduledBlockId);

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

  async createScheduleBlock(
    input: {
      taskId: string;
      startAt: string;
      endAt: string;
      source: ScheduleBlockSource;
      state: ScheduleBlockState;
    },
    db: Queryable,
  ) {
    const result = await db.query(
      `insert into public.schedule_blocks (task_id, start_at, end_at, source, state)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [input.taskId, input.startAt, input.endAt, input.source, input.state],
    );
    return mapScheduleBlock(result.rows[0]);
  }

  async updateScheduleBlock(
    scheduleBlockId: string,
    patch: Partial<{
      startAt: string;
      endAt: string;
      source: ScheduleBlockSource;
      state: ScheduleBlockState;
      googleEventId: string | null;
    }>,
    db: Queryable,
  ) {
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

  async upsertCalendarEvent(
    input: {
      externalEventId: string;
      title: string;
      startAt: string;
      endAt: string;
      isAppManaged: boolean;
      scheduleBlockId: string | null;
      rawPayload: Record<string, unknown>;
      externalUpdatedAt: string | null;
      dismissedExternalUpdatedAt: string | null;
    },
    db: Queryable,
  ) {
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

  async upsertIntegrationToken(
    provider: string,
    input: {
      accessToken: string | null;
      refreshToken: string | null;
      expiresAt: string | null;
      metadata: Record<string, unknown>;
    },
    db: Queryable,
  ) {
    await db.query(
      `insert into public.integration_tokens (provider, access_token, refresh_token, expires_at, metadata)
       values ($1, $2, $3, $4, $5)
       on conflict (provider)
       do update
         set access_token = excluded.access_token,
             refresh_token = excluded.refresh_token,
             expires_at = excluded.expires_at,
             metadata = excluded.metadata`,
      [provider, input.accessToken, input.refreshToken, input.expiresAt, input.metadata],
    );
  }

  async getIntegrationToken(provider: string, db: Queryable) {
    const result = await db.query(`select * from public.integration_tokens where provider = $1 limit 1`, [
      provider,
    ]);
    return (result.rows[0] as IntegrationTokenRow | undefined) ?? null;
  }

  async listIntegrationTokens(db: Queryable) {
    const result = await db.query(`select * from public.integration_tokens`);
    return result.rows as IntegrationTokenRow[];
  }

  async createDraft(
    input: {
      kind: DraftKind;
      payload: Record<string, unknown>;
      diffSummary: string;
      actorRole: ActorRole;
      expiresAt: string;
    },
    db: Queryable,
  ) {
    const id = randomUUID();
    const result = await db.query(
      `insert into public.sync_drafts (id, kind, payload, diff_summary, actor_role, expires_at)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [id, input.kind, input.payload, input.diffSummary, input.actorRole, input.expiresAt],
    );
    return mapDraft(result.rows[0]);
  }

  async getDraft(draftId: string, db: Queryable) {
    const result = await db.query(`select * from public.sync_drafts where id = $1 limit 1`, [draftId]);
    return result.rows[0] ? mapDraft(result.rows[0]) : null;
  }

  async listDrafts(status: DraftStatus | null, db: Queryable) {
    const result = status
      ? await db.query(
          `select *
           from public.sync_drafts
           where status = $1
           order by created_at desc
           limit 25`,
          [status],
        )
      : await db.query(
          `select *
           from public.sync_drafts
           order by created_at desc
           limit 25`,
        );
    return result.rows.map(mapDraft);
  }

  async updateDraftStatus(draftId: string, status: DraftStatus, db: Queryable) {
    const timestampColumn = status === "applied" ? "applied_at" : status === "rejected" ? "rejected_at" : null;
    const result = timestampColumn
      ? await db.query(
          `update public.sync_drafts
           set status = $2, ${timestampColumn} = timezone('utc', now())
           where id = $1
           returning *`,
          [draftId, status],
        )
      : await db.query(
          `update public.sync_drafts
           set status = $2
           where id = $1
           returning *`,
          [draftId, status],
        );
    return mapDraft(result.rows[0]);
  }

  async createTimerSession(
    input: { taskId: string; startedAt: string; source: ScheduleBlockSource },
    db: Queryable,
  ) {
    const result = await db.query(
      `insert into public.timer_sessions (task_id, started_at, source)
       values ($1, $2, $3)
       returning *`,
      [input.taskId, input.startedAt, input.source],
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

  async listRecentAuditLogs(db: Queryable) {
    const result = await db.query(
      `select *
       from public.audit_logs
       order by created_at desc
       limit 25`,
    );
    return result.rows.map(mapAuditLog);
  }

  async createAuditLog(
    input: {
      actorRole: ActorRole;
      action: string;
      entityType: string;
      entityId: string;
      diffSummary: string;
      payload: Record<string, unknown>;
    },
    db: Queryable,
  ) {
    const id = randomUUID();
    const result = await db.query(
      `insert into public.audit_logs (id, actor_role, action, entity_type, entity_id, diff_summary, payload)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, input.actorRole, input.action, input.entityType, input.entityId, input.diffSummary, input.payload],
    );
    return mapAuditLog(result.rows[0]);
  }

  getIntegrationStatus(rows: IntegrationTokenRow[], envStatus: Omit<IntegrationStatus, "googleConnected" | "googleEmail" | "googleCalendarId" | "togglConnected" | "togglWorkspaceId">): IntegrationStatus {
    const google = rows.find((row) => row.provider === "google");
    const toggl = rows.find((row) => row.provider === "toggl");
    return integrationStatusSchema.parse({
      googleConnected: Boolean(google?.access_token),
      googleEmail: typeof google?.metadata?.email === "string" ? google.metadata.email : null,
      googleCalendarId:
        typeof google?.metadata?.calendarId === "string" ? google.metadata.calendarId : "primary",
      togglConnected: Boolean(toggl?.access_token),
      togglWorkspaceId:
        typeof toggl?.metadata?.workspaceId === "string" ? toggl.metadata.workspaceId : null,
      mcpFullAccessConfigured: envStatus.mcpFullAccessConfigured,
      mcpReadOnlyConfigured: envStatus.mcpReadOnlyConfigured,
      tunnelBaseUrl: envStatus.tunnelBaseUrl,
    });
  }
}
