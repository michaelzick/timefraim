import { deleteGoogleScheduleBlock, upsertGoogleScheduleBlock, type GoogleConnection } from "../integration/google-calendar.js";
import { deleteGoogleTask, upsertGoogleScheduledTask } from "../integration/google-tasks.js";
import { startTogglTimer, startTogglTimerForEvent, stopTogglTimer, type TogglConnection } from "../integration/toggl-track.js";
import { pool } from "../db/pool.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import type { SideEffect } from "./planner-service-types.js";

async function upsertGoogleCalendarBlock(
  repository: PlannerRepository,
  effect: Extract<SideEffect, { type: "google.upsert" }>,
  googleConnection: GoogleConnection | null,
) {
  const [task, block] = await Promise.all([
    repository.getTask(effect.taskId, pool),
    repository.getScheduleBlock(effect.scheduleBlockId, pool),
  ]);
  if (!task || !block) {
    return;
  }

  if (block.googleTaskId) {
    await deleteGoogleTask(googleConnection, block.googleTaskId);
  }

  const googleEventId = await upsertGoogleScheduleBlock({ connection: googleConnection, task, block });
  await repository.updateScheduleBlock(
    block.id,
    { googleEventId, googleTaskId: null, state: googleEventId ? "synced" : "confirmed" },
    pool,
  );
  await repository.upsertCalendarEvent(
    {
      externalEventId: googleEventId ?? `local-${block.id}`,
      title: task.title,
      startAt: block.startAt,
      endAt: block.endAt,
      isAppManaged: true,
      backgroundColor: null,
      foregroundColor: null,
      scheduleBlockId: block.id,
      rawPayload: { source: "timefraim", pendingSync: !googleEventId },
      externalUpdatedAt: null,
      dismissedExternalUpdatedAt: null,
      sourceCalendarId: null,
      sourceCalendarName: null,
    },
    pool,
  );
}

async function upsertGoogleTaskBlock(
  repository: PlannerRepository,
  effect: Extract<SideEffect, { type: "google.upsert" }>,
  googleConnection: GoogleConnection | null,
) {
  const [task, block] = await Promise.all([
    repository.getTask(effect.taskId, pool),
    repository.getScheduleBlock(effect.scheduleBlockId, pool),
  ]);
  if (!task || !block) {
    return;
  }

  if (block.googleEventId) {
    await deleteGoogleScheduleBlock(googleConnection, block.googleEventId);
  }
  await repository.deleteCalendarEventByScheduleBlockId(block.id, pool);

  const googleTaskId = await upsertGoogleScheduledTask({
    connection: googleConnection,
    task,
    block,
    plannerDate: effect.plannerDate,
    tzOffsetMinutes: effect.tzOffsetMinutes,
  });
  await repository.updateScheduleBlock(
    block.id,
    { googleEventId: null, googleTaskId, state: googleTaskId ? "synced" : "confirmed" },
    pool,
  );
}

async function deleteGoogleScheduleArtifacts(
  effect: Extract<SideEffect, { type: "google.delete" }>,
  googleConnection: GoogleConnection | null,
) {
  let firstError: unknown = null;
  if (effect.googleEventId) {
    try {
      await deleteGoogleScheduleBlock(googleConnection, effect.googleEventId);
    } catch (error) {
      firstError = error;
    }
  }
  if (effect.googleTaskId) {
    try {
      await deleteGoogleTask(googleConnection, effect.googleTaskId);
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) {
    throw firstError instanceof Error
      ? firstError
      : new Error("Google schedule delete failed");
  }
}

export async function runPlannerSideEffects(
  repository: PlannerRepository,
  sideEffects: SideEffect[],
  googleConnection: GoogleConnection | null,
  togglConnection: TogglConnection | null,
) {
  for (const effect of sideEffects) {
    if (effect.type === "google.upsert") {
      try {
        if (effect.target === "calendar_event") {
          await upsertGoogleCalendarBlock(repository, effect, googleConnection);
        } else {
          await upsertGoogleTaskBlock(repository, effect, googleConnection);
        }
      } catch (error) {
        await repository.updateScheduleBlock(effect.scheduleBlockId, { state: "failed" }, pool);
        console.error("Google schedule upsert failed", error);
      }
      continue;
    }

    if (effect.type === "google.delete") {
      try {
        await deleteGoogleScheduleArtifacts(effect, googleConnection);
      } catch (error) {
        console.error("Google schedule delete failed", error);
      }
      continue;
    }

    if (effect.type === "toggl.start") {
      const task = await repository.getTask(effect.taskId, pool);
      if (!task) {
        continue;
      }

      try {
        const result = await startTogglTimer({ connection: togglConnection, task, source: effect.source });
        if (result.togglEntryId) {
          await repository.attachTogglEntry(effect.timerSessionId, result.togglEntryId, pool);
        }
      } catch (error) {
        console.error("Toggl start failed", error);
      }
      continue;
    }

    if (effect.type === "toggl.start_event") {
      try {
        const result = await startTogglTimerForEvent({
          connection: togglConnection,
          eventTitle: effect.eventTitle,
          source: effect.source,
          togglProjectId: effect.togglProjectId,
        });
        if (result.togglEntryId) {
          await repository.attachTogglEntry(effect.timerSessionId, result.togglEntryId, pool);
        }
      } catch (error) {
        console.error("Toggl start (event) failed", error);
      }
      continue;
    }

    try {
      await stopTogglTimer(togglConnection, effect.togglEntryId);
    } catch (error) {
      console.error("Toggl stop failed", error);
    }
  }
}
