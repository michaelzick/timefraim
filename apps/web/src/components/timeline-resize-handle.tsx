import {
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ScheduleBlock } from "@timefraim/shared";
import {
  getTimelineDurationMinutes,
  getTimelineResizePreview,
} from "@/components/timeline-geometry";
import { cn } from "@/lib/utils";

type TimelineResizePreview = ReturnType<typeof getTimelineResizePreview>;

type TimelineResizeHandleProps = {
  currentDurationMinutes: number;
  isResizing: boolean;
  previewDurationMinutes: number | null;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

export function TimelineResizeHandle({
  currentDurationMinutes,
  isResizing,
  previewDurationMinutes,
  onClick,
  onPointerDown,
}: TimelineResizeHandleProps) {
  const durationMinutes = previewDurationMinutes ?? currentDurationMinutes;

  return (
    <button
      type="button"
      aria-label="Resize scheduled task duration"
      data-testid="timeline-resize-handle"
      data-resizing={isResizing ? "true" : "false"}
      data-duration-minutes={durationMinutes}
      className={cn(
        "absolute inset-x-5 bottom-1 flex h-5 cursor-ns-resize touch-none items-center justify-center rounded-full",
        "text-[var(--planner-surface-meta)] transition hover:bg-black/10 hover:text-[var(--planner-surface-title)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--timeline-selection-ring)]",
        isResizing && "bg-black/10 text-[var(--planner-surface-title)]",
      )}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <span className="h-1 w-10 rounded-full bg-current opacity-70" />
    </button>
  );
}

export function useTimelineBlockResize({
  block,
  date,
  disabled,
  onResizeEnd,
}: {
  block: ScheduleBlock;
  date: string;
  disabled: boolean;
  onResizeEnd: (durationMinutes: number) => void;
}) {
  const [preview, setPreview] = useState<TimelineResizePreview | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const latestPreviewRef = useRef<TimelineResizePreview | null>(null);
  const currentDurationMinutes = getTimelineDurationMinutes(block.startAt, block.endAt);

  const clearResizeListeners = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => clearResizeListeners, [clearResizeListeners]);

  const stopClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (disabled || (typeof event.button === "number" && event.button !== 0)) {
        return;
      }

      event.preventDefault();
      clearResizeListeners();

      const pointerId = event.pointerId > 0 ? event.pointerId : null;
      const originY = event.clientY;
      const initialPreview = getTimelineResizePreview({
        date,
        startAt: block.startAt,
        endAt: block.endAt,
        deltaY: 0,
      });
      latestPreviewRef.current = initialPreview;
      setPreview(initialPreview);
      let hasResizeChange = false;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (pointerId !== null && moveEvent.pointerId !== pointerId) {
          return;
        }
        moveEvent.preventDefault();
        const nextPreview = getTimelineResizePreview({
          date,
          startAt: block.startAt,
          endAt: block.endAt,
          deltaY: moveEvent.clientY - originY,
        });
        hasResizeChange = nextPreview.durationMinutes !== initialPreview.durationMinutes;
        latestPreviewRef.current = nextPreview;
        setPreview(nextPreview);
      };

      const finishResize = (upEvent: PointerEvent) => {
        if (pointerId !== null && upEvent.pointerId !== pointerId) {
          return;
        }
        upEvent.preventDefault();
        const finalPreview = latestPreviewRef.current;
        clearResizeListeners();
        latestPreviewRef.current = null;
        setPreview(null);
        if (finalPreview && hasResizeChange && finalPreview.durationMinutes !== currentDurationMinutes) {
          onResizeEnd(finalPreview.durationMinutes);
        }
      };

      const cancelResize = (cancelEvent: PointerEvent) => {
        if (pointerId !== null && cancelEvent.pointerId !== pointerId) {
          return;
        }
        clearResizeListeners();
        latestPreviewRef.current = null;
        setPreview(null);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", finishResize);
      window.addEventListener("pointercancel", cancelResize);
      cleanupRef.current = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", finishResize);
        window.removeEventListener("pointercancel", cancelResize);
      };
    },
    [
      block.endAt,
      block.startAt,
      clearResizeListeners,
      currentDurationMinutes,
      date,
      disabled,
      onResizeEnd,
    ],
  );

  return {
    currentDurationMinutes,
    isResizing: Boolean(preview),
    previewDurationMinutes: preview?.durationMinutes ?? null,
    previewEndAt: preview?.endAt ?? null,
    resizeHandleProps: {
      onClick: stopClick,
      onPointerDown: handlePointerDown,
    },
  };
}
