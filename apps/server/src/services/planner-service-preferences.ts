import {
  userPreferencesSchema,
  type UserPreferences,
  type UserPreferencesUpdate,
} from "@timefraim/shared";
import { pool } from "../db/pool.ts";
import type { PlannerRepository } from "../repositories/planner-repository.ts";

const defaultPreferences: UserPreferences = userPreferencesSchema.parse({
  theme: "system",
  taskStartNotificationsEnabled: false,
  taskEndNotificationsEnabled: false,
});

export async function getUserPreferences(
  repository: PlannerRepository,
  userId: string,
): Promise<UserPreferences> {
  return (await repository.getUserPreferences(userId, pool)) ?? defaultPreferences;
}

export async function saveUserPreferences(
  repository: PlannerRepository,
  userId: string,
  update: UserPreferencesUpdate,
): Promise<UserPreferences> {
  const current = await getUserPreferences(repository, userId);
  return repository.upsertUserPreferences(userId, { ...current, ...update }, pool);
}
