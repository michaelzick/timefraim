import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CalendarSyncResult,
  DayPlan,
  TaskInput,
  TaskUpdate,
  TogglConnect,
  TogglDiscoverInput,
} from "@timefraim/shared";
import { api } from "@/lib/api";

type UpdateTaskInput = Omit<TaskUpdate, "taskId">;

type UsePlannerMutationsOptions = {
  date: string;
  token: string;
  onSuccess: () => Promise<void>;
};

export function usePlannerMutations({ date, token, onSuccess }: UsePlannerMutationsOptions) {
  const queryClient = useQueryClient();
  const dayPlanQueryKey = ["day-plan", token, date] as const;
  const createTaskMutation = useMutation({
    mutationFn: (values: TaskInput) => api.createTask(token, values),
    onSuccess,
  });
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: UpdateTaskInput }) =>
      api.updateTask(token, taskId, values),
    onSuccess,
  });
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.deleteTask(token, taskId),
    onSuccess,
  });
  const createScheduleBlockMutation = useMutation({
    mutationFn: api.createScheduleBlock.bind(api, token),
    onSuccess,
  });
  const updateScheduleBlockMutation = useMutation({
    mutationFn: ({ scheduleBlockId, values }: {
      scheduleBlockId: string;
      values: Parameters<typeof api.updateScheduleBlock>[2];
    }) => api.updateScheduleBlock(token, scheduleBlockId, values),
    onSuccess,
  });
  const deleteScheduleBlockMutation = useMutation({
    mutationFn: (scheduleBlockId: string) => api.deleteScheduleBlock(token, scheduleBlockId),
    onSuccess,
  });
  const dismissCalendarEventMutation = useMutation({
    mutationFn: (calendarEventId: string) => api.dismissCalendarEvent(token, calendarEventId),
    onMutate: async (calendarEventId) => {
      await queryClient.cancelQueries({ queryKey: dayPlanQueryKey });
      const previousDayPlan = queryClient.getQueryData<DayPlan>(dayPlanQueryKey);
      queryClient.setQueryData<DayPlan>(dayPlanQueryKey, (current) =>
        current
          ? {
              ...current,
              calendarEvents: current.calendarEvents.filter((event) => event.id !== calendarEventId),
            }
          : current,
      );
      return { previousDayPlan };
    },
    onError: (_error, _calendarEventId, context) => {
      if (context?.previousDayPlan) {
        queryClient.setQueryData(dayPlanQueryKey, context.previousDayPlan);
      }
    },
    onSuccess,
  });
  const confirmDraftMutation = useMutation({
    mutationFn: (draftId: string) => api.confirmDraft(token, draftId),
    onSuccess,
  });
  const rejectDraftMutation = useMutation({
    mutationFn: (draftId: string) => api.rejectDraft(token, draftId),
    onSuccess,
  });
  const startTimerMutation = useMutation({
    mutationFn: (taskId: string) => api.startTimer(token, { taskId, source: "manual" }),
    onSuccess,
  });
  const startEventTimerMutation = useMutation({
    mutationFn: (calendarEventId: string) => api.startEventTimer(token, { calendarEventId, source: "manual" }),
    onSuccess,
  });
  const stopTimerMutation = useMutation({
    mutationFn: () => api.stopTimer(token),
    onSuccess,
  });
  const syncCalendarMutation = useMutation({
    mutationFn: () => api.syncCalendar(token, date, new Date(`${date}T12:00:00`).getTimezoneOffset()),
    onSuccess: async (result: CalendarSyncResult) => {
      queryClient.setQueryData<DayPlan>(dayPlanQueryKey, (current) =>
        current
          ? {
              ...current,
              calendarEvents: result.events,
            }
          : current,
      );
      await onSuccess();
    },
  });
  const saveTogglMutation = useMutation({
    mutationFn: (values: TogglConnect) => api.saveTogglConnection(token, values),
    onSuccess,
  });
  const discoverTogglMutation = useMutation({
    mutationFn: (values: TogglDiscoverInput) => api.discoverTogglConnection(token, values),
  });
  const deleteTogglMutation = useMutation({
    mutationFn: () => api.deleteTogglConnection(token),
    onSuccess,
  });

  return {
    isMutating: [
      createTaskMutation,
      updateTaskMutation,
      deleteTaskMutation,
      createScheduleBlockMutation,
      updateScheduleBlockMutation,
      deleteScheduleBlockMutation,
      dismissCalendarEventMutation,
      confirmDraftMutation,
      rejectDraftMutation,
      startTimerMutation,
      startEventTimerMutation,
      stopTimerMutation,
    ].some((mutation) => mutation.isPending),
    isSavingToggl: saveTogglMutation.isPending || deleteTogglMutation.isPending,
    isDiscoveringToggl: discoverTogglMutation.isPending,
    isSyncing: syncCalendarMutation.isPending,
    actions: {
      createTask: (values: TaskInput) => createTaskMutation.mutateAsync(values),
      updateTask: (taskId: string, values: UpdateTaskInput) =>
        updateTaskMutation.mutateAsync({ taskId, values }),
      deleteTask: (taskId: string) => deleteTaskMutation.mutateAsync(taskId),
      createScheduleBlock: (values: Parameters<typeof api.createScheduleBlock>[1]) =>
        createScheduleBlockMutation.mutateAsync(values),
      updateScheduleBlock: (scheduleBlockId: string, values: Parameters<typeof api.updateScheduleBlock>[2]) =>
        updateScheduleBlockMutation.mutateAsync({ scheduleBlockId, values }),
      deleteScheduleBlock: (scheduleBlockId: string) => deleteScheduleBlockMutation.mutateAsync(scheduleBlockId),
      dismissCalendarEvent: (calendarEventId: string) => dismissCalendarEventMutation.mutateAsync(calendarEventId),
      confirmDraft: (draftId: string) => confirmDraftMutation.mutateAsync(draftId),
      rejectDraft: (draftId: string) => rejectDraftMutation.mutateAsync(draftId),
      discoverToggl: (values: TogglDiscoverInput) => discoverTogglMutation.mutateAsync(values),
      saveToggl: (values: TogglConnect) => saveTogglMutation.mutateAsync(values),
      deleteToggl: () => deleteTogglMutation.mutateAsync(),
      startTimer: (taskId: string) => startTimerMutation.mutateAsync(taskId),
      startEventTimer: (calendarEventId: string) => startEventTimerMutation.mutateAsync(calendarEventId),
      stopTimer: () => stopTimerMutation.mutateAsync(),
      syncCalendar: () => syncCalendarMutation.mutateAsync(),
    },
  };
}
