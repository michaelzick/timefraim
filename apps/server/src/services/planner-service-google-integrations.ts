import type { GoogleCalendarSettings, GoogleCalendarSettingsUpdate } from "@timefraim/shared";
import { env } from "../config/env.ts";
import { pool } from "../db/pool.ts";
import { listGoogleCalendars, type GoogleConnection } from "../integration/google-calendar.ts";
import { assertGoogleTasksAccess, getGoogleTasksAccessErrorMessage } from "../integration/google-tasks.ts";
import type { PlannerRepository } from "../repositories/planner-repository.ts";
import { dependencyUnavailable } from "./planner-errors.ts";
import {
  buildGoogleCalendarSettings,
  getSelectableGoogleCalendars,
  validateSyncCalendarIds,
} from "./planner-service-google-settings.ts";
import {
  readGoogleConnection,
  readGoogleMetadata,
  readGooglePlannerSyncTarget,
  readGoogleSyncCalendarIds,
  writeGoogleTokens,
} from "./planner-service-google-tokens.ts";

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
  const previousPlannerSyncTarget = readGooglePlannerSyncTarget(existing);

  await writeGoogleTokens(
    repository,
    existing,
    {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
    },
    {
      email: input.email,
      calendarId: input.calendarId,
      plannerCalendarId: env.GOOGLE_PLANNER_CALENDAR_ID,
      plannerSyncTarget: previousPlannerSyncTarget,
      syncPlannerBlocksToCalendar: previousPlannerSyncTarget === "calendar_event",
      ...(previousSyncCalendarIds
        ? { syncCalendarIds: previousSyncCalendarIds }
        : {}),
    },
  );
}

export async function getGoogleCalendarSettings(repository: PlannerRepository): Promise<GoogleCalendarSettings> {
  const row = await repository.getIntegrationToken("google", pool);
  const connection = await readGoogleConnection(row);
  const plannerCalendarId = connection?.plannerCalendarId ?? env.GOOGLE_PLANNER_CALENDAR_ID;
  const savedSyncCalendarIds = readGoogleSyncCalendarIds(row);
  const plannerSyncTarget = readGooglePlannerSyncTarget(row);
  const allCalendars = await listGoogleCalendarsOrUnavailable(connection);
  const validSavedSyncCalendarIds = savedSyncCalendarIds?.filter((id) =>
    allCalendars.some((calendar) => calendar.id === id),
  );

  return buildGoogleCalendarSettings({
    calendars: allCalendars,
    plannerCalendarId,
    savedSyncCalendarIds: validSavedSyncCalendarIds?.length ? validSavedSyncCalendarIds : undefined,
    plannerSyncTarget,
  });
}

export async function saveGoogleCalendarSettings(
  repository: PlannerRepository,
  input: GoogleCalendarSettingsUpdate,
) {
  const row = await repository.getIntegrationToken("google", pool);
  const connection = await readGoogleConnection(row);

  if (!row || !connection) {
    throw dependencyUnavailable("Google integration not connected");
  }

  const allCalendars = await listGoogleCalendarsOrUnavailable(connection);
  const plannerCalendarId = connection.plannerCalendarId ?? env.GOOGLE_PLANNER_CALENDAR_ID;
  const availableCalendars = getSelectableGoogleCalendars(allCalendars, plannerCalendarId);
  const validatedSyncCalendarIds = validateSyncCalendarIds(input.syncCalendarIds, availableCalendars);

  if (input.plannerSyncTarget === "task") {
    await assertGoogleTasksReady(connection);
  }

  // Token columns pass through untouched (already ciphertext when flagged);
  // spreading the metadata keeps the encryption marker alongside the settings.
  await repository.upsertIntegrationToken(
    "google",
    {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      metadata: {
        ...readGoogleMetadata(row),
        syncCalendarIds: validatedSyncCalendarIds,
        plannerSyncTarget: input.plannerSyncTarget,
        syncPlannerBlocksToCalendar: input.plannerSyncTarget === "calendar_event",
      },
    },
    pool,
  );
}

async function assertGoogleTasksReady(connection: GoogleConnection) {
  try {
    await assertGoogleTasksAccess(connection);
  } catch (error) {
    throw dependencyUnavailable(getGoogleTasksAccessErrorMessage(error));
  }
}

async function listGoogleCalendarsOrUnavailable(connection: GoogleConnection | null) {
  try {
    return await listGoogleCalendars(connection);
  } catch (error) {
    throw dependencyUnavailable(
      error instanceof Error ? error.message : "Unable to list Google calendars",
    );
  }
}
