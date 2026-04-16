import { deleteGoogleScheduleBlock, upsertGoogleScheduleBlock, type GoogleConnection } from "../integration/google-calendar.js";
import { createGoogleTask } from "../integration/google-tasks.js";
import { startTogglTimer, startTogglTimerForEvent, stopTogglTimer, type TogglConnection } from "../integration/toggl-track.js";
import { pool } from "../db/pool.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import type { SideEffect } from "./planner-service-types.js";

export async function runPlannerSideEffects(
  repository: PlannerRepository,
  sideEffects: SideEffect[],
  googleConnection: GoogleConnection | null,
  togglConnection: TogglConnection | null,
) {
  for (const effect of sideEffects) {
    if (effect.type === "google.upsert") {
      const [task, block] = await Promise.all([
        repository.getTask(effect.taskId, pool),
        repository.getScheduleBlock(effect.scheduleBlockId, pool),
      ]);
      if (!task || !block) {
        continue;
      }

      try {
        const googleEventId = await upsertGoogleScheduleBlock({ connection: googleConnection, task, block });
        await repository.updateScheduleBlock(
          block.id,
          { googleEventId, state: googleEventId ? "synced" : "confirmed" },
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
      } catch (error) {
        await repository.updateScheduleBlock(block.id, { state: "failed" }, pool);
        console.error("Google schedule upsert failed", error);
      }
      continue;
    }

    if (effect.type === "google.delete") {
      try {
        await deleteGoogleScheduleBlock(googleConnection, effect.googleEventId);
      } catch (error) {
        console.error("Google schedule delete failed", error);
      }
      continue;
    }

    if (effect.type === "google.task.create") {
      const task = await repository.getTask(effect.taskId, pool);
      if (!task) {
        continue;
      }

      try {
        await createGoogleTask({
          connection: googleConnection,
          title: task.title,
          notes: task.notes,
          plannerDate: effect.plannerDate,
        });
      } catch (error) {
        console.error("Google task create failed", error);
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
