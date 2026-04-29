import type { GoogleCalendarSettings } from "@timefraim/shared";
import type { GoogleCalendarListEntry } from "../integration/google-calendar.js";
import { invalidInput } from "./planner-errors.js";

function sortGoogleCalendars(calendars: GoogleCalendarListEntry[]) {
  calendars.sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function getSelectableGoogleCalendars(
  calendars: GoogleCalendarListEntry[],
  plannerCalendarId: string,
) {
  return calendars.filter((calendar) => calendar.id !== plannerCalendarId);
}

function getDefaultSyncCalendarIds(calendars: GoogleCalendarListEntry[]) {
  const primaryCalendar = calendars.find((calendar) => calendar.primary);
  return primaryCalendar ? [primaryCalendar.id] : ["primary"];
}

function normalizeSyncCalendarIds(syncCalendarIds: string[]) {
  return [...new Set(syncCalendarIds.map((id) => id.trim()).filter(Boolean))];
}

export function validateSyncCalendarIds(
  syncCalendarIds: string[],
  calendars: GoogleCalendarListEntry[],
) {
  const normalizedIds = normalizeSyncCalendarIds(syncCalendarIds);
  const allowedIds = new Set(calendars.map((calendar) => calendar.id));
  const invalidIds = normalizedIds.filter((id) => !allowedIds.has(id));

  if (invalidIds.length > 0) {
    throw invalidInput("Selected Google calendars are invalid or no longer available");
  }

  if (normalizedIds.length === 0) {
    throw invalidInput("At least one Google calendar must remain selected");
  }

  return normalizedIds;
}

export function buildGoogleCalendarSettings(args: {
  calendars: GoogleCalendarListEntry[];
  plannerCalendarId: string;
  savedSyncCalendarIds?: string[];
  syncPlannerBlocksToCalendar: boolean;
}): GoogleCalendarSettings {
  const availableCalendars = getSelectableGoogleCalendars([...args.calendars], args.plannerCalendarId);
  sortGoogleCalendars(availableCalendars);

  const syncCalendarIds = args.savedSyncCalendarIds
    ? validateSyncCalendarIds(args.savedSyncCalendarIds, availableCalendars)
    : getDefaultSyncCalendarIds(availableCalendars);

  return {
    availableCalendars: availableCalendars.map((calendar) => ({
      id: calendar.id,
      name: calendar.name,
      primary: calendar.primary,
      backgroundColor: calendar.backgroundColor,
    })),
    syncCalendarIds,
    syncPlannerBlocksToCalendar: args.syncPlannerBlocksToCalendar,
    plannerCalendarId: args.plannerCalendarId,
  };
}
