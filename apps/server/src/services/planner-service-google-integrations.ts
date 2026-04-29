import type { GoogleCalendarSettings, GoogleCalendarSettingsUpdate } from "@timefraim/shared";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { listGoogleCalendars, type GoogleCalendarListEntry, type GoogleConnection } from "../integration/google-calendar.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";
import type { IntegrationTokenRow } from "../repositories/planner-repository-types.js";

type IntegrationRowWithMetadata = Pick<IntegrationTokenRow, "metadata"> | null | undefined;

function readGoogleMetadata(row: IntegrationRowWithMetadata) {
  return row?.metadata ?? {};
}

function readStringMetadata(row: IntegrationRowWithMetadata, key: string, fallback: string) {
  const value = readGoogleMetadata(row)[key];
  return typeof value === "string" ? value : fallback;
}

function readBooleanMetadata(row: IntegrationRowWithMetadata, key: string, fallback: boolean) {
  const value = readGoogleMetadata(row)[key];
  return typeof value === "boolean" ? value : fallback;
}

export function readGoogleSyncCalendarIds(row: IntegrationRowWithMetadata): string[] | undefined {
  const ids = readGoogleMetadata(row).syncCalendarIds;
  if (!Array.isArray(ids)) {
    return undefined;
  }

  const normalizedIds = ids.filter((id): id is string => typeof id === "string");
  return normalizedIds.length > 0 ? [...new Set(normalizedIds)] : undefined;
}

export function readGoogleSyncPlannerBlocksToCalendar(row: IntegrationRowWithMetadata) {
  return readBooleanMetadata(row, "syncPlannerBlocksToCalendar", true);
}

function buildGoogleConnection(row: IntegrationTokenRow | null): GoogleConnection | null {
  if (!row?.access_token) {
    return null;
  }

  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    calendarId: readStringMetadata(row, "calendarId", env.GOOGLE_CALENDAR_ID),
    plannerCalendarId: readStringMetadata(row, "plannerCalendarId", env.GOOGLE_PLANNER_CALENDAR_ID),
    email: readStringMetadata(row, "email", env.ALLOWED_EMAIL),
  };
}

function sortGoogleCalendars(calendars: GoogleCalendarListEntry[]) {
  calendars.sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return a.name.localeCompare(b.name);
  });
}

function getSelectableGoogleCalendars(calendars: GoogleCalendarListEntry[], plannerCalendarId: string) {
  return calendars.filter((calendar) => calendar.id !== plannerCalendarId);
}

function getDefaultSyncCalendarIds(calendars: GoogleCalendarListEntry[]) {
  const primaryCalendar = calendars.find((calendar) => calendar.primary);
  return primaryCalendar ? [primaryCalendar.id] : ["primary"];
}

function normalizeSyncCalendarIds(syncCalendarIds: string[]) {
  return [...new Set(syncCalendarIds.map((id) => id.trim()).filter(Boolean))];
}

function validateSyncCalendarIds(syncCalendarIds: string[], calendars: GoogleCalendarListEntry[]) {
  const normalizedIds = normalizeSyncCalendarIds(syncCalendarIds);
  const allowedIds = new Set(calendars.map((calendar) => calendar.id));
  const invalidIds = normalizedIds.filter((id) => !allowedIds.has(id));

  if (invalidIds.length > 0) {
    throw new Error("Selected Google calendars are invalid or no longer available");
  }

  if (normalizedIds.length === 0) {
    throw new Error("At least one Google calendar must remain selected");
  }

  return normalizedIds;
}

function buildGoogleCalendarSettings(args: {
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

export async function getGoogleConnection(repository: PlannerRepository): Promise<GoogleConnection | null> {
  const row = await repository.getIntegrationToken("google", pool);
  return buildGoogleConnection(row);
}

export async function getGoogleCalendarSyncState(repository: PlannerRepository) {
  const row = await repository.getIntegrationToken("google", pool);
  const connection = buildGoogleConnection(row);
  return {
    connection,
    syncPlannerBlocksToCalendar:
      Boolean(connection) && readGoogleSyncPlannerBlocksToCalendar(row),
  };
}

export async function saveGoogleSession(
  repository: PlannerRepository,
  input: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    email: string;
    calendarId: string;
  },
) {
  const existing = await repository.getIntegrationToken("google", pool);
  const previousSyncCalendarIds = readGoogleSyncCalendarIds(existing);
  const previousSyncPlannerBlocksToCalendar = readGoogleSyncPlannerBlocksToCalendar(existing);

  await repository.upsertIntegrationToken(
    "google",
    {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      metadata: {
        email: input.email,
        calendarId: input.calendarId,
        plannerCalendarId: env.GOOGLE_PLANNER_CALENDAR_ID,
        syncPlannerBlocksToCalendar: previousSyncPlannerBlocksToCalendar,
        ...(previousSyncCalendarIds
          ? { syncCalendarIds: previousSyncCalendarIds }
          : {}),
      },
    },
    pool,
  );
}

export async function getGoogleCalendarSettings(repository: PlannerRepository): Promise<GoogleCalendarSettings> {
  const row = await repository.getIntegrationToken("google", pool);
  const connection = buildGoogleConnection(row);
  const plannerCalendarId = connection?.plannerCalendarId ?? env.GOOGLE_PLANNER_CALENDAR_ID;
  const savedSyncCalendarIds = readGoogleSyncCalendarIds(row);
  const syncPlannerBlocksToCalendar = readGoogleSyncPlannerBlocksToCalendar(row);
  const allCalendars = await listGoogleCalendars(connection);
  const validSavedSyncCalendarIds = savedSyncCalendarIds?.filter((id) =>
    allCalendars.some((calendar) => calendar.id === id),
  );

  return buildGoogleCalendarSettings({
    calendars: allCalendars,
    plannerCalendarId,
    savedSyncCalendarIds: validSavedSyncCalendarIds?.length ? validSavedSyncCalendarIds : undefined,
    syncPlannerBlocksToCalendar,
  });
}

export async function saveGoogleCalendarSettings(
  repository: PlannerRepository,
  input: GoogleCalendarSettingsUpdate,
) {
  const row = await repository.getIntegrationToken("google", pool);
  const connection = buildGoogleConnection(row);

  if (!row || !connection) {
    throw new Error("Google integration not connected");
  }

  const allCalendars = await listGoogleCalendars(connection);
  const plannerCalendarId = connection.plannerCalendarId ?? env.GOOGLE_PLANNER_CALENDAR_ID;
  const availableCalendars = getSelectableGoogleCalendars(allCalendars, plannerCalendarId);
  const validatedSyncCalendarIds = validateSyncCalendarIds(input.syncCalendarIds, availableCalendars);

  await repository.upsertIntegrationToken(
    "google",
    {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      metadata: {
        ...readGoogleMetadata(row),
        syncCalendarIds: validatedSyncCalendarIds,
        syncPlannerBlocksToCalendar: input.syncPlannerBlocksToCalendar,
      },
    },
    pool,
  );
}
