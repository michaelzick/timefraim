import type { ScheduleBlock, Task } from "@timefraim/shared";
import { google } from "googleapis";
import type { GoogleConnection } from "./google-calendar.js";
import { getGoogleOAuthClient } from "./google-auth.js";

function toGoogleTaskDue(plannerDate: string | null | undefined) {
  return plannerDate ? `${plannerDate}T00:00:00.000Z` : undefined;
}

function toLocalDate(isoString: string, tzOffsetMinutes: number) {
  return new Date(new Date(isoString).getTime() - tzOffsetMinutes * 60_000);
}

function toLocalDateKey(isoString: string, tzOffsetMinutes: number) {
  const local = toLocalDate(isoString, tzOffsetMinutes);
  return [
    local.getUTCFullYear(),
    String(local.getUTCMonth() + 1).padStart(2, "0"),
    String(local.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatLocalTime(isoString: string, tzOffsetMinutes: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(toLocalDate(isoString, tzOffsetMinutes));
}

function formatPlannerDate(plannerDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${plannerDate}T00:00:00.000Z`));
}

function formatDurationMinutes(startAt: string, endAt: string) {
  const minutes = Math.max(1, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000));
  return minutes === 1 ? "1 min" : `${minutes} min`;
}

function resolveGoogleTaskDate(params: {
  block: ScheduleBlock;
  plannerDate?: string;
  tzOffsetMinutes?: number;
}) {
  if (params.plannerDate) {
    return params.plannerDate;
  }
  if (typeof params.tzOffsetMinutes === "number") {
    return toLocalDateKey(params.block.startAt, params.tzOffsetMinutes);
  }
  return params.block.googleTaskId ? undefined : params.block.startAt.slice(0, 10);
}

function buildGoogleTaskNotes(params: {
  task: Task;
  block: ScheduleBlock;
  plannerDate: string | undefined;
  tzOffsetMinutes?: number;
}) {
  if (typeof params.tzOffsetMinutes !== "number" || !params.plannerDate) {
    return params.task.notes ?? undefined;
  }
  const timeRange = [
    formatPlannerDate(params.plannerDate),
    `${formatLocalTime(params.block.startAt, params.tzOffsetMinutes)} to ${formatLocalTime(params.block.endAt, params.tzOffsetMinutes)}`,
    `(${formatDurationMinutes(params.block.startAt, params.block.endAt)})`,
  ].join(" ");
  return [params.task.notes?.trim(), `TimeFraim: ${timeRange}`]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

export function createGoogleTasksClient(connection: GoogleConnection | null) {
  if (!connection) {
    return null;
  }

  const auth = getGoogleOAuthClient(connection);
  return auth ? google.tasks({ version: "v1", auth }) : null;
}

export async function assertGoogleTasksAccess(connection: GoogleConnection | null): Promise<void> {
  const tasks = createGoogleTasksClient(connection);
  if (!tasks) {
    return;
  }

  await tasks.tasklists.get({
    tasklist: "@default",
  });
}

export function getGoogleTasksAccessErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to access Google Tasks";
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("has not been used") || lowerMessage.includes("disabled")) {
    return "Google Tasks API is not enabled for this Google Cloud project. Enable tasks.googleapis.com, then save this setting again.";
  }
  if (lowerMessage.includes("insufficient authentication scopes")) {
    return "Google Tasks access is missing from the current Google session. Sign out, sign in again, and approve Google Tasks access.";
  }
  return `Unable to access Google Tasks: ${message}`;
}

export async function upsertGoogleScheduledTask(params: {
  connection: GoogleConnection | null;
  task: Task;
  block: ScheduleBlock;
  plannerDate?: string;
  tzOffsetMinutes?: number;
}): Promise<string | null> {
  const tasks = createGoogleTasksClient(params.connection);
  if (!tasks) {
    return null;
  }
  const plannerDate = resolveGoogleTaskDate(params);
  const due = toGoogleTaskDue(plannerDate);

  const requestBody = {
    title: params.task.title,
    notes: buildGoogleTaskNotes({ ...params, plannerDate }),
    status: params.task.status === "done" ? ("completed" as const) : ("needsAction" as const),
    ...(due ? { due } : {}),
  };

  if (params.block.googleTaskId) {
    await tasks.tasks.patch({
      tasklist: "@default",
      task: params.block.googleTaskId,
      requestBody,
    });
    return params.block.googleTaskId;
  }

  const response = await tasks.tasks.insert({
    tasklist: "@default",
    requestBody,
  });

  return response.data.id ?? null;
}

export async function deleteGoogleTask(
  connection: GoogleConnection | null,
  googleTaskId: string | null | undefined,
): Promise<void> {
  if (!googleTaskId) {
    return;
  }

  const tasks = createGoogleTasksClient(connection);
  if (!tasks) {
    return;
  }

  await tasks.tasks.delete({
    tasklist: "@default",
    task: googleTaskId,
  });
}
