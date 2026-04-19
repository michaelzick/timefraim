import type { CalendarEventView, DayPlan, Task, TogglIntegrationSettings } from "@timefraim/shared";
import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActiveTimerPanel } from "@/features/planner/active-timer-panel";
import { ActivityLogCard } from "@/features/planner/activity-log-card";
import { CalendarEventDetailCard } from "@/features/planner/calendar-event-detail-card";
import { TaskDetailCard } from "@/features/planner/task-detail-card";
import type { CalendarEventFormValues, TaskFormValues } from "@/features/planner/types";

type PlannerDetailColumnProps = {
  detailPanelRef: RefObject<HTMLDivElement | null>;
  detailForm: UseFormReturn<TaskFormValues>;
  calendarEventForm: UseFormReturn<CalendarEventFormValues>;
  selectedTask: Task | null;
  selectedCalendarEvent: CalendarEventView | null;
  dayPlan: DayPlan;
  activeTimerTaskId: string | null;
  activeTimerCalendarEventId: string | null;
  isMutating: boolean;
  togglSettings: TogglIntegrationSettings;
  onDeleteTask: () => void;
  onSaveTask: (values: TaskFormValues) => Promise<void>;
  onSaveCalendarEvent: (values: CalendarEventFormValues) => Promise<void>;
  onStartTimer: (taskId: string) => void;
  onStartEventTimer: (calendarEventId: string) => void;
  onStopTimer: () => void;
  onSelectTimerTask?: (taskId: string) => void;
};

export function PlannerDetailColumn({
  detailPanelRef,
  detailForm,
  calendarEventForm,
  selectedTask,
  selectedCalendarEvent,
  dayPlan,
  activeTimerTaskId,
  activeTimerCalendarEventId,
  isMutating,
  togglSettings,
  onDeleteTask,
  onSaveTask,
  onSaveCalendarEvent,
  onStartTimer,
  onStartEventTimer,
  onStopTimer,
  onSelectTimerTask,
}: PlannerDetailColumnProps) {
  return (
    <div className="xl:sticky xl:top-6 xl:self-start">
      <ScrollArea className="xl:h-[calc(100vh-3rem)]">
        <div className="space-y-6 xl:pr-2">
          <ActiveTimerPanel
            dayPlan={dayPlan}
            togglSettings={togglSettings}
            onStopTimer={onStopTimer}
            onSelectTimerTask={onSelectTimerTask}
          />
          {selectedCalendarEvent ? (
            <CalendarEventDetailCard
              detailPanelRef={detailPanelRef}
              event={selectedCalendarEvent}
              activeTimerCalendarEventId={activeTimerCalendarEventId}
              isMutating={isMutating}
              togglSettings={togglSettings}
              form={calendarEventForm}
              onSaveEvent={onSaveCalendarEvent}
              onStartEventTimer={onStartEventTimer}
              onStopTimer={onStopTimer}
            />
          ) : (
            <TaskDetailCard
              detailPanelRef={detailPanelRef}
              form={detailForm}
              selectedTask={selectedTask}
              activeTimerTaskId={activeTimerTaskId}
              isMutating={isMutating}
              togglSettings={togglSettings}
              onDeleteTask={onDeleteTask}
              onSaveTask={onSaveTask}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
            />
          )}
          <ActivityLogCard dayPlan={dayPlan} />
        </div>
      </ScrollArea>
    </div>
  );
}
