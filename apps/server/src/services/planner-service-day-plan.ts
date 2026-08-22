import { dayPlanSchema, type IntegrationStatus } from "@timefraim/shared";
import { pool } from "../db/pool.ts";
import type { PlannerRepository } from "../repositories/planner-repository.ts";
import { endOfDay, startOfDay } from "../utils/date.ts";
import { resolveAuditLogDisplaySummaries } from "./planner-audit-log-display.ts";
import { getGoogleCalendarSyncForDay } from "./planner-service-calendar-sync.ts";
import { getAllowedPlannerUserId } from "./planner-service-integrations.ts";

export async function getPlannerDayPlan(args: {
  repository: PlannerRepository;
  userId: string | null;
  date: string;
  tzOffsetMinutes: number;
  getIntegrationStatus: (userId: string) => Promise<IntegrationStatus>;
}) {
  const effectiveUserId = args.userId ?? await getAllowedPlannerUserId(args.repository);
  const range = {
    startAt: startOfDay(args.date, args.tzOffsetMinutes).toISOString(),
    endAt: endOfDay(args.date, args.tzOffsetMinutes).toISOString(),
  };

  const [tasks, scheduleBlocks, calendarEvents, drafts, auditLogs, activeTimer, integrationStatus, calendarSync] =
    await Promise.all([
      args.repository.listTasks(pool),
      args.repository.listScheduleBlocksForRange(range, pool),
      args.repository.listCalendarEventsForRange(range, pool),
      args.repository.listDrafts("pending", effectiveUserId, pool),
      args.repository.listRecentAuditLogs(pool),
      args.repository.getActiveTimer(pool),
      args.getIntegrationStatus(effectiveUserId),
      getGoogleCalendarSyncForDay(args.repository, args.date, args.tzOffsetMinutes),
    ]);

  return dayPlanSchema.parse({
    date: args.date,
    tasks,
    scheduleBlocks,
    calendarEvents,
    drafts,
    auditLogs: resolveAuditLogDisplaySummaries(auditLogs, { tasks, scheduleBlocks, calendarEvents }),
    activeTimer,
    integrationStatus,
    calendarSync,
  });
}
