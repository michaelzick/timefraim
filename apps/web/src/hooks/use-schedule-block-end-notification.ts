import type { ScheduleBlock, Task } from "@timefraim/shared";
import { useEffect, useRef } from "react";

const TICK_INTERVAL_MS = 15_000;

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
  const enabledSinceRef = useRef<number | null>(enabled ? Date.now() : null);
  const latestRef = useRef({ scheduleBlocks, tasksById });

  latestRef.current = { scheduleBlocks, tasksById };

  useEffect(() => {
    if (!enabled) {
      enabledSinceRef.current = null;
      return;
    }

    enabledSinceRef.current = Date.now();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !canNotify()) return;

    const evaluate = () => {
      if (Notification.permission !== "granted") return;
      const enabledSince = enabledSinceRef.current;
      if (enabledSince === null) return;
      const now = new Date();
      const nowMs = now.getTime();
      for (const block of latestRef.current.scheduleBlocks) {
        if (firedRef.current.has(block.id)) continue;
        const endTime = new Date(block.endAt);
        const endTimeMs = endTime.getTime();
        if (Number.isNaN(endTimeMs)) continue;
        if (endTimeMs <= enabledSince) continue;
        if (endTimeMs > nowMs) continue;
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

    const handleFocus = () => {
      evaluate();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        evaluate();
      }
    };

    evaluate();
    const interval = window.setInterval(evaluate, TICK_INTERVAL_MS);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);
}
