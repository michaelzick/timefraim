import type { ComponentProps, ReactNode } from "react";
import type { Task } from "@timefraim/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlannerPage } from "@/pages/planner-page";
import { buildDayPlan, buildDuplicateResult, buildTask, buildTogglSettings, noopDuplicate } from "@/test/fixtures";

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd?: (event: unknown) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onDragEnd?.({
            over: { data: { current: { slotIso: "2026-04-06T17:15:00.000Z" } } },
            active: {
              data: {
                current: {
                  dragType: "queue-task",
                  task: {
                    id: "task-1f8f9660-0000-4000-8000-000000000001",
                    title: "Plan launch week",
                    notes: "Outline the week and protect deep-work blocks.",
                    estimatedMinutes: 45,
                    status: "planned",
                    priority: "medium",
                    scheduledBlockId: null,
                    togglProjectId: null,
                    createdAt: "2026-04-06T08:00:00.000Z",
                    updatedAt: "2026-04-06T08:00:00.000Z",
                  },
                },
              },
            },
          })
        }
      >
        Trigger queue drag
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd?.({
            over: { data: { current: { slotIso: "2026-04-06T17:15:00.000Z" } } },
            active: {
              data: {
                current: {
                  dragType: "schedule-block",
                  scheduleBlock: {
                    id: "block-1",
                    taskId: "task-1f8f9660-0000-4000-8000-000000000001",
                    startAt: "2026-04-06T17:00:00.000Z",
                    endAt: "2026-04-06T17:45:00.000Z",
                    source: "manual",
                    state: "synced",
                    googleEventId: "google-event-1",
                    createdAt: "2026-04-06T08:00:00.000Z",
                    updatedAt: "2026-04-06T08:00:00.000Z",
                  },
                },
              },
            },
          })
        }
      >
        Trigger scheduled drag
      </button>
      {children}
    </div>
  ),
  DragOverlay: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PointerSensor: function PointerSensor() {},
  pointerWithin: () => [],
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: () => undefined,
    isOver: false,
  }),
  useSensor: () => ({}),
  useSensors: (...sensors: unknown[]) => sensors,
}));

vi.mock("@/components/timeline-board", () => ({
  TimelineBoard: ({
    tasks,
    onResizeTaskDuration,
  }: {
    tasks: Task[];
    onResizeTaskDuration: (task: Task, durationMinutes: number) => void;
  }) => (
    <div>
      <div>timeline board</div>
      {tasks[0] ? (
        <button type="button" onClick={() => onResizeTaskDuration(tasks[0], 60)}>
          Trigger timeline resize
        </button>
      ) : null}
    </div>
  ),
}));

const noopAsync = () => Promise.resolve(undefined);

function buildPlannerPageProps(overrides: Partial<ComponentProps<typeof PlannerPage>> = {}) {
  return {
    date: "2026-04-06",
    dayPlan: buildDayPlan(),
    isMutating: false,
    isSyncing: false,
    linkedGoogleEmail: "allowed@example.com",
    onDateChange: vi.fn(),
    onCreateTask: noopAsync,
    onUpdateTask: noopAsync,
    onDeleteTask: noopAsync,
    onCreateScheduleBlock: noopAsync,
    onUpdateScheduleBlock: noopAsync,
    onDeleteScheduleBlock: noopAsync,
    onDismissCalendarEvent: noopAsync,
    onUpdateCalendarEvent: noopAsync,
    onDuplicateTask: noopDuplicate,
    onDuplicateScheduleBlock: noopDuplicate,
    onStartTimer: noopAsync,
    onStartEventTimer: noopAsync,
    onStopTimer: noopAsync,
    onSyncCalendar: noopAsync,
    togglSettings: buildTogglSettings(),
    ...overrides,
  };
}

describe("PlannerPage drag behavior", () => {
  const plannerDate = "2026-04-06";
  const tzOffsetMinutes = new Date(`${plannerDate}T12:00:00`).getTimezoneOffset();

  it("creates a schedule block when a queue task drops on a quarter-hour slot", async () => {
    const user = userEvent.setup();
    const onCreateScheduleBlock = vi.fn().mockResolvedValue(undefined);

    render(<PlannerPage {...buildPlannerPageProps({ onCreateScheduleBlock })} />);

    await user.click(screen.getByRole("button", { name: /trigger queue drag/i }));

    await waitFor(() => {
      expect(onCreateScheduleBlock).toHaveBeenCalledWith({
        taskId: "task-1f8f9660-0000-4000-8000-000000000001",
        startAt: "2026-04-06T17:15:00.000Z",
        endAt: "2026-04-06T18:00:00.000Z",
        source: "manual",
        plannerDate,
        tzOffsetMinutes,
      });
    });
  });

  it("moves a scheduled block in quarter-hour increments while preserving duration", async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);
    const onUpdateScheduleBlock = vi.fn().mockResolvedValue(undefined);
    const dayPlan = buildDayPlan({
      tasks: [
        buildTask({
          status: "scheduled",
          scheduledBlockId: "block-1",
          priority: "high",
        }),
      ],
      scheduleBlocks: [
        {
          id: "block-1",
          taskId: "task-1f8f9660-0000-4000-8000-000000000001",
          startAt: "2026-04-06T17:00:00.000Z",
          endAt: "2026-04-06T17:45:00.000Z",
          source: "manual",
          state: "synced",
          googleEventId: "google-event-1",
          createdAt: "2026-04-06T08:00:00.000Z",
          updatedAt: "2026-04-06T08:00:00.000Z",
        },
      ],
    });

    render(<PlannerPage {...buildPlannerPageProps({ dayPlan, onUpdateScheduleBlock, onUpdateTask })} />);

    await user.click(screen.getByRole("button", { name: /trigger scheduled drag/i }));

    await waitFor(() => {
      expect(onUpdateScheduleBlock).toHaveBeenCalledWith("block-1", {
        startAt: "2026-04-06T17:15:00.000Z",
        endAt: "2026-04-06T18:00:00.000Z",
        plannerDate,
        tzOffsetMinutes,
      });
    });
    expect(onUpdateTask).not.toHaveBeenCalled();
  });

  it("duplicates the underlying task when option-dragging a scheduled block", async () => {
    const user = userEvent.setup();
    const onDuplicateTask = vi.fn().mockResolvedValue(
      buildDuplicateResult({
        kind: "task.duplicate",
        createdTaskId: "task-2f8f9660-0000-4000-8000-000000000002",
        createdScheduleBlockId: "block-2",
      }),
    );
    const onDuplicateScheduleBlock = vi.fn().mockResolvedValue(
      buildDuplicateResult({
        kind: "schedule_block.duplicate",
        createdScheduleBlockId: "block-2",
      }),
    );

    render(
      <PlannerPage
        {...buildPlannerPageProps({ onDuplicateTask, onDuplicateScheduleBlock })}
      />,
    );

    fireEvent.keyDown(window, { key: "Alt", altKey: true });
    await user.click(screen.getByRole("button", { name: /trigger scheduled drag/i }));
    fireEvent.keyUp(window, { key: "Alt", altKey: false });

    await waitFor(() => {
      expect(onDuplicateTask).toHaveBeenCalledWith(
        "task-1f8f9660-0000-4000-8000-000000000001",
        {
          startAt: "2026-04-06T17:15:00.000Z",
          endAt: "2026-04-06T18:00:00.000Z",
          plannerDate,
          tzOffsetMinutes,
        },
      );
    });
    expect(onDuplicateScheduleBlock).not.toHaveBeenCalled();
  });

  it("resizes a scheduled block through the task duration update path", async () => {
    const user = userEvent.setup();
    const onUpdateTask = vi.fn().mockResolvedValue(undefined);
    const onUpdateScheduleBlock = vi.fn().mockResolvedValue(undefined);
    const task = buildTask({
      estimatedMinutes: 30,
      status: "scheduled",
      scheduledBlockId: "block-1",
    });

    render(
      <PlannerPage
        {...buildPlannerPageProps({
          dayPlan: buildDayPlan({ tasks: [task] }),
          onUpdateTask,
          onUpdateScheduleBlock,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /trigger timeline resize/i }));

    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenCalledWith(task.id, {
        estimatedMinutes: 60,
        plannerDate,
        tzOffsetMinutes,
      });
    });
    expect(onUpdateScheduleBlock).not.toHaveBeenCalled();
  });
});
