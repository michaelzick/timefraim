import type { Task } from "@timefraim/shared";
import { useEffect, useRef } from "react";

type KeyboardShortcutArgs = {
  selectedTask: Task | null;
  onDuplicateTask: (task: Task) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

export function usePlannerKeyboardShortcuts({ selectedTask, onDuplicateTask }: KeyboardShortcutArgs) {
  const argsRef = useRef({ selectedTask, onDuplicateTask });
  argsRef.current = { selectedTask, onDuplicateTask };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "d") return;
      if (isEditableTarget(event.target)) return;
      const { selectedTask: task, onDuplicateTask: duplicate } = argsRef.current;
      if (!task) return;
      event.preventDefault();
      duplicate(task);
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);
}
