import { describe, expect, it, vi } from "vitest";
import type { UserPreferences } from "@timefraim/shared";

vi.mock("../db/pool.js", () => ({ pool: { query: vi.fn() } }));

import { getUserPreferences, saveUserPreferences } from "./planner-service-preferences.js";
import type { PlannerRepository } from "../repositories/planner-repository.js";

function makeRepository(overrides: {
  getUserPreferences?: (userId: string, db: unknown) => Promise<UserPreferences | null>;
  upsertUserPreferences?: (userId: string, input: UserPreferences, db: unknown) => Promise<UserPreferences>;
}): PlannerRepository {
  return overrides as unknown as PlannerRepository;
}

describe("planner-service-preferences", () => {
  it("returns default preferences when none are stored", async () => {
    const repository = makeRepository({ getUserPreferences: async () => null });

    const result = await getUserPreferences(repository, "user-1");

    expect(result).toEqual({
      theme: "system",
      taskStartNotificationsEnabled: false,
      taskEndNotificationsEnabled: false,
    });
  });

  it("merges a partial update over the current preferences", async () => {
    const stored: UserPreferences = {
      theme: "dark",
      taskStartNotificationsEnabled: true,
      taskEndNotificationsEnabled: false,
    };
    let upserted: UserPreferences | null = null;
    const repository = makeRepository({
      getUserPreferences: async () => stored,
      upsertUserPreferences: async (_userId, input) => {
        upserted = input;
        return input;
      },
    });

    await saveUserPreferences(repository, "user-1", { theme: "light" });

    expect(upserted).toEqual({
      theme: "light",
      taskStartNotificationsEnabled: true,
      taskEndNotificationsEnabled: false,
    });
  });

  it("applies an update over defaults when no preferences exist", async () => {
    let upserted: UserPreferences | null = null;
    const repository = makeRepository({
      getUserPreferences: async () => null,
      upsertUserPreferences: async (_userId, input) => {
        upserted = input;
        return input;
      },
    });

    await saveUserPreferences(repository, "user-1", { taskEndNotificationsEnabled: true });

    expect(upserted).toEqual({
      theme: "system",
      taskStartNotificationsEnabled: false,
      taskEndNotificationsEnabled: true,
    });
  });
});
