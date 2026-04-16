import {
  auditLogSchema,
  calendarEventViewSchema,
  scheduleBlockSchema,
  syncDraftSchema,
  taskSchema,
  timerSessionSchema,
  togglProjectOptionSchema,
  togglWorkspaceOptionSchema,
} from "@timefraim/shared";
import type { QueryResultRow } from "pg";
import { asIso } from "../utils/date.js";
import type { CalendarEventRecord, UserTogglConnectionRecord } from "./planner-repository-types.js";

export function mapTask(row: QueryResultRow) {
  return taskSchema.parse({
    id: row.id,
    title: row.title,
    notes: row.notes,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    priority: row.priority,
    scheduledBlockId: row.scheduled_block_id,
    togglProjectId: row.toggl_project_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  });
}

export function mapScheduleBlock(row: QueryResultRow) {
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

export function mapCalendarEventView(row: QueryResultRow) {
  return calendarEventViewSchema.parse({
    id: row.id,
    externalEventId: row.external_event_id,
    title: row.title,
    startAt: asIso(row.start_at),
    endAt: asIso(row.end_at),
    isAppManaged: row.is_app_managed,
    backgroundColor: row.background_color ?? null,
    foregroundColor: row.foreground_color ?? null,
    sourceCalendarId: row.source_calendar_id ?? null,
    sourceCalendarName: row.source_calendar_name ?? null,
  });
}

export function mapCalendarEventRecord(row: QueryResultRow): CalendarEventRecord {
  return {
    id: row.id,
    externalEventId: row.external_event_id,
    title: row.title,
    startAt: asIso(row.start_at)!,
    endAt: asIso(row.end_at)!,
    isAppManaged: row.is_app_managed,
    backgroundColor: row.background_color ?? null,
    foregroundColor: row.foreground_color ?? null,
    scheduleBlockId: row.schedule_block_id,
    rawPayload: (row.raw_payload ?? {}) as Record<string, unknown>,
    externalUpdatedAt: asIso(row.external_updated_at),
    dismissedExternalUpdatedAt: asIso(row.dismissed_external_updated_at),
    sourceCalendarId: row.source_calendar_id ?? null,
    sourceCalendarName: row.source_calendar_name ?? null,
    createdAt: asIso(row.created_at)!,
    updatedAt: asIso(row.updated_at)!,
  };
}

export function mapDraft(row: QueryResultRow) {
  return syncDraftSchema.parse({
    id: row.id,
    ownerUserId: row.owner_user_id,
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

export function mapTimer(row: QueryResultRow) {
  return timerSessionSchema.parse({
    id: row.id,
    taskId: row.task_id ?? null,
    calendarEventId: row.calendar_event_id ?? null,
    togglEntryId: row.toggl_entry_id,
    startedAt: asIso(row.started_at),
    endedAt: asIso(row.ended_at),
    durationSeconds: row.duration_seconds,
    source: row.source,
  });
}

export function mapAuditLog(row: QueryResultRow) {
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

export function mapUserTogglConnection(row: QueryResultRow): UserTogglConnectionRecord {
  return {
    userId: row.user_id,
    apiTokenCiphertext: row.api_token_ciphertext,
    apiTokenHint: row.api_token_hint,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    defaultProjectId: row.default_project_id,
    defaultProjectName: row.default_project_name,
    availableWorkspaces: togglWorkspaceOptionSchema.array().parse(row.available_workspaces ?? []),
    availableProjects: togglProjectOptionSchema.array().parse(row.available_projects ?? []),
    lastValidatedAt: asIso(row.last_validated_at),
    createdAt: asIso(row.created_at)!,
    updatedAt: asIso(row.updated_at)!,
  };
}
