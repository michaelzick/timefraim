import type { ScheduleBlock, Task } from "@timefraim/shared";
import { useEffect, useRef } from "react";

const TICK_INTERVAL_MS = 15_000;
const STALE_CUTOFF_MS = 10 * 60 * 1000;

function sameLocalDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function useScheduleBlockEndNotification(params: {
  enabled: boolean;
  scheduleBlocks: ScheduleBlock[];
  tasksById: Map<string, Task>;
}) {
  const { enabled, scheduleBlocks, tasksById } = params;
  const firedRef = useRef<Set<string>>(new Set());
  const latestRef = useRef({ scheduleBlocks, tasksById });

  latestRef.current = { scheduleBlocks, tasksById };

  useEffect(() => {
    if (!enabled || !canNotify()) return;

    const evaluate = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      for (const block of latestRef.current.scheduleBlocks) {
        if (firedRef.current.has(block.id)) continue;
        const endTime = new Date(block.endAt);
        if (Number.isNaN(endTime.getTime())) continue;
        const diff = now.getTime() - endTime.getTime();
        if (diff < 0) continue;
        if (diff > STALE_CUTOFF_MS) {
          firedRef.current.add(block.id);
          continue;
        }
        if (!sameLocalDate(endTime, now)) continue;
        const task = latestRef.current.tasksById.get(block.taskId);
        const title = task?.title ?? "Scheduled task";
        try {
          new Notification("Task ended", { body: title, tag: block.id });
        } catch {
          // Notification constructor can throw in restricted contexts; ignore.
        }
        firedRef.current.add(block.id);
      }
    };

    evaluate();
    const interval = window.setInterval(evaluate, TICK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled]);
}
