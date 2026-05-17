import { z } from "zod";

export const themeModeSchema = z.enum(["light", "dark", "system"]);

export const userPreferencesSchema = z.object({
  theme: themeModeSchema,
  taskStartNotificationsEnabled: z.boolean(),
  taskEndNotificationsEnabled: z.boolean(),
});

export const userPreferencesUpdateSchema = userPreferencesSchema.partial();

export type ThemeMode = z.infer<typeof themeModeSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserPreferencesUpdate = z.infer<typeof userPreferencesUpdateSchema>;
