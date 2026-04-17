import type { ComponentProps, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlannerPage } from "@/pages/planner-page";
import { buildDayPlan, buildTask, buildTogglSettings } from "@/test/fixtures";

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
  TimelineBoard: () => <div>timeline board</div>,
}));

const noopAsync = () => Promise.resolve(undefined);

function buildPlannerPageProps(overrides: Partial<ComponentProps<typeof PlannerPage>> = {}) {
  return {
    date: "2026-04-06",
    dayPlan: buildDayPlan(),
    isMutating: false,
    isSyncing: false,
    onDateChange: vi.fn(),
    onCreateTask: noopAsync,
    onUpdateTask: noopAsync,
    onDeleteTask: noopAsync,
    onCreateScheduleBlock: noopAsync,
    onUpdateScheduleBlock: noopAsync,
    onDeleteScheduleBlock: noopAsync,
    onDismissCalendarEvent: noopAsync,
    onUpdateCalendarEvent: noopAsync,
    onStartTimer: noopAsync,
    onStartEventTimer: noopAsync,
    onStopTimer: noopAsync,
    onSyncCalendar: noopAsync,
    togglSettings: buildTogglSettings(),
    ...overrides,
  };
}

describe("PlannerPage drag behavior", () => {
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
      });
    });
  });

  it("moves a scheduled block in quarter-hour increments while preserving duration", async () => {
    const user = userEvent.setup();
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

    render(<PlannerPage {...buildPlannerPageProps({ dayPlan, onUpdateScheduleBlock })} />);

    await user.click(screen.getByRole("button", { name: /trigger scheduled drag/i }));

    await waitFor(() => {
      expect(onUpdateScheduleBlock).toHaveBeenCalledWith("block-1", {
        startAt: "2026-04-06T17:15:00.000Z",
        endAt: "2026-04-06T18:00:00.000Z",
      });
    });
  });
});
