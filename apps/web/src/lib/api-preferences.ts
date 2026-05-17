import {
  userPreferencesSchema,
  userPreferencesUpdateSchema,
  type UserPreferences,
  type UserPreferencesUpdate,
} from "@timefraim/shared";
import { request } from "@/lib/api-client";

export const preferencesApi = {
  getPreferences: (token: string, signal?: AbortSignal) =>
    request<UserPreferences>("/api/preferences", token, {
      schema: userPreferencesSchema,
      signal,
    }),
  savePreferences: (token: string, body: UserPreferencesUpdate) =>
    request<UserPreferences, UserPreferencesUpdate>("/api/preferences", token, {
      method: "PUT",
      body: userPreferencesUpdateSchema.parse(body),
      schema: userPreferencesSchema,
    }),
};
