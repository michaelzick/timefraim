import { calendarSyncQuerySchema, dayQuerySchema } from "@timefraim/shared";
import { todayIsoDate } from "../utils/date.ts";

export function parseDayQuery(query: unknown) {
  const result = dayQuerySchema.safeParse(query);
  return {
    date: result.success ? result.data.date : todayIsoDate(),
    tz: result.success ? (result.data.tz ?? 0) : 0,
  };
}

export function parseCalendarSyncQuery(query: unknown) {
  const result = calendarSyncQuerySchema.safeParse(query);
  return {
    date: result.success ? result.data.date : todayIsoDate(),
    restoreHidden: result.success ? (result.data.restoreHidden ?? false) : false,
    tz: result.success ? (result.data.tz ?? 0) : 0,
  };
}
