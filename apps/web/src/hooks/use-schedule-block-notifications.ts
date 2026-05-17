import type { ScheduleBlock, Task } from "@timefraim/shared";
import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/utils";

const TICK_INTERVAL_MS = 15_000;

type NotificationKind = "start" | "end";

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

export function useScheduleBlockNotifications(params: {
  startEnabled: boolean;
  endEnabled: boolean;
  scheduleBlocks: ScheduleBlock[];
  tasksById: Map<string, Task>;
}) {
  const { startEnabled, endEnabled, scheduleBlocks, tasksById } = params;
  const firedRef = useRef<Set<string>>(new Set());
  const startEnabledSinceRef = useRef<number | null>(startEnabled ? Date.now() : null);
  const endEnabledSinceRef = useRef<number | null>(endEnabled ? Date.now() : null);
  const latestRef = useRef({ scheduleBlocks, tasksById });

  latestRef.current = { scheduleBlocks, tasksById };

  useEffect(() => {
    startEnabledSinceRef.current = startEnabled ? Date.now() : null;
  }, [startEnabled]);

  useEffect(() => {
    endEnabledSinceRef.current = endEnabled ? Date.now() : null;
  }, [endEnabled]);

  useEffect(() => {
    if ((!startEnabled && !endEnabled) || !canNotify()) return;

    const fireFor = (
      block: ScheduleBlock,
      kind: NotificationKind,
      isoTime: string,
      enabledSince: number | null,
      nowMs: number,
    ) => {
      if (enabledSince === null) return;
      const fireKey = `${block.id}:${kind}`;
      if (firedRef.current.has(fireKey)) return;
      const target = new Date(isoTime);
      const targetMs = target.getTime();
      if (Number.isNaN(targetMs)) return;
      if (targetMs <= enabledSince) return;
      if (targetMs > nowMs) return;
      if (!sameLocalDate(target, new Date(nowMs))) return;
      const task = latestRef.current.tasksById.get(block.taskId);
      const title = task?.title ?? "Scheduled task";
      const body =
        kind === "start"
          ? `Started · ${formatTime(isoTime)}`
          : `Ended · ${formatTime(isoTime)}`;
      try {
        new Notification(title, { body, tag: fireKey });
      } catch {
        // Notification constructor can throw in restricted contexts; ignore.
      }
      firedRef.current.add(fireKey);
    };

    const evaluate = () => {
      if (Notification.permission !== "granted") return;
      const nowMs = Date.now();
      for (const block of latestRef.current.scheduleBlocks) {
        if (startEnabled) {
          fireFor(block, "start", block.startAt, startEnabledSinceRef.current, nowMs);
        }
        if (endEnabled) {
          fireFor(block, "end", block.endAt, endEnabledSinceRef.current, nowMs);
        }
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
  }, [startEnabled, endEnabled]);
}
