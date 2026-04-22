import { describe, expect, it } from "vitest";
import { selectDoneTasks } from "./planner-page-selection.js";
import { buildTask } from "@/test/fixtures";

describe("selectDoneTasks", () => {
  it("returns only tasks whose completedOnDate matches the viewed date", () => {
    const today = "2026-04-20";
    const tasks = [
      buildTask({ id: "a", status: "done", completedOnDate: today, updatedAt: "2026-04-20T10:00:00.000Z" }),
      buildTask({ id: "b", status: "done", completedOnDate: "2026-04-19", updatedAt: "2026-04-19T10:00:00.000Z" }),
      buildTask({ id: "c", status: "planned", completedOnDate: null }),
      buildTask({ id: "d", status: "done", completedOnDate: null }),
    ];

    const result = selectDoneTasks(tasks, today);

    expect(result.map((task) => task.id)).toEqual(["a"]);
  });

  it("sorts matching done tasks by updatedAt descending", () => {
    const today = "2026-04-20";
    const tasks = [
      buildTask({ id: "earlier", status: "done", completedOnDate: today, updatedAt: "2026-04-20T09:00:00.000Z" }),
      buildTask({ id: "later", status: "done", completedOnDate: today, updatedAt: "2026-04-20T12:00:00.000Z" }),
      buildTask({ id: "middle", status: "done", completedOnDate: today, updatedAt: "2026-04-20T10:30:00.000Z" }),
    ];

    expect(selectDoneTasks(tasks, today).map((task) => task.id)).toEqual(["later", "middle", "earlier"]);
  });

  it("returns an empty array when no task completed on the date", () => {
    const tasks = [
      buildTask({ id: "a", status: "done", completedOnDate: "2026-04-19" }),
      buildTask({ id: "b", status: "planned" }),
    ];

    expect(selectDoneTasks(tasks, "2026-04-20")).toEqual([]);
  });
});
