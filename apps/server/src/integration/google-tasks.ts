import type { ScheduleBlock, Task } from "@timefraim/shared";
import {
  createGoogleClient,
  GOOGLE_TASKS_API,
  googleUrl,
  type GoogleConnection,
} from "./google-api-client.ts";
import type { GoogleTaskResource } from "./google-api-types.ts";

export function googleTasksUrl(taskId?: string, query?: Record<string, string | number | boolean | null | undefined>) {
  return googleUrl(GOOGLE_TASKS_API, ["lists", "@default", "tasks", ...(taskId ? [taskId] : [])], query);
}

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
  return createGoogleClient(connection);
}

export async function assertGoogleTasksAccess(connection: GoogleConnection | null): Promise<void> {
  const tasks = createGoogleTasksClient(connection);
  if (!tasks) {
    return;
  }

  await tasks.request("GET", googleUrl(GOOGLE_TASKS_API, ["users", "@me", "lists", "@default"]));
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
  // Status-only pushes carry no plannerDate/tzOffsetMinutes, so the
  // "TimeFraim: <time range>" notes footer cannot be rebuilt. Omit notes on
  // those patches; PATCH semantics keep Google's existing notes intact.
  const canRebuildNotes = typeof params.tzOffsetMinutes === "number" && Boolean(plannerDate);
  const includeNotes = canRebuildNotes || !params.block.googleTaskId;

  const requestBody = {
    title: params.task.title,
    status: params.task.status === "done" ? ("completed" as const) : ("needsAction" as const),
    ...(includeNotes ? { notes: buildGoogleTaskNotes({ ...params, plannerDate }) } : {}),
    ...(due ? { due } : {}),
  };

  if (params.block.googleTaskId) {
    await tasks.request("PATCH", googleTasksUrl(params.block.googleTaskId), requestBody);
    return params.block.googleTaskId;
  }

  const response = await tasks.request<GoogleTaskResource>("POST", googleTasksUrl(), requestBody);
  return response.id ?? null;
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

  await tasks.request("DELETE", googleTasksUrl(googleTaskId));
}
