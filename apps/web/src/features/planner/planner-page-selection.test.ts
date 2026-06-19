import { describe, expect, it } from "vitest";
import { filterQueueTasks, filterTasksByCategory, selectDoneTasks } from "./planner-page-selection.js";
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

describe("filterQueueTasks", () => {
  it("returns unscheduled, non-done tasks matching the search", () => {
    const tasks = [
      buildTask({ id: "a", title: "Deep work", notes: null, status: "planned", scheduledBlockId: null }),
      buildTask({ id: "b", title: "Review roadmap", notes: null, status: "planned", scheduledBlockId: null }),
      buildTask({ id: "c", title: "Scheduled task", notes: null, status: "planned", scheduledBlockId: "block-1" }),
      buildTask({ id: "d", title: "Done task", notes: null, status: "done" }),
    ];

    expect(filterQueueTasks(tasks, "deep", "all").map((t) => t.id)).toEqual(["a"]);
  });

  it("filters by category when categoryFilter is set", () => {
    const tasks = [
      buildTask({ id: "a", title: "Personal errand", category: "personal", scheduledBlockId: null }),
      buildTask({ id: "b", title: "Client review", category: "work", scheduledBlockId: null }),
      buildTask({ id: "c", title: "Team sync", category: "work", scheduledBlockId: null }),
    ];

    expect(filterQueueTasks(tasks, "", "personal").map((t) => t.id)).toEqual(["a"]);
    expect(filterQueueTasks(tasks, "", "work").map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("returns all categories when filter is all", () => {
    const tasks = [
      buildTask({ id: "a", category: "personal", scheduledBlockId: null }),
      buildTask({ id: "b", category: "work", scheduledBlockId: null }),
    ];

    expect(filterQueueTasks(tasks, "", "all").map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("combines search and category filter", () => {
    const tasks = [
      buildTask({ id: "a", title: "Deep work", category: "personal", scheduledBlockId: null }),
      buildTask({ id: "b", title: "Deep work review", category: "work", scheduledBlockId: null }),
    ];

    expect(filterQueueTasks(tasks, "deep", "work").map((t) => t.id)).toEqual(["b"]);
  });

  it("defaults categoryFilter to all when omitted", () => {
    const tasks = [
      buildTask({ id: "a", category: "personal", scheduledBlockId: null }),
      buildTask({ id: "b", category: "work", scheduledBlockId: null }),
    ];

    expect(filterQueueTasks(tasks, "").map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("filterTasksByCategory", () => {
  it("returns all tasks when filter is all", () => {
    const tasks = [
      buildTask({ id: "a", category: "personal" }),
      buildTask({ id: "b", category: "work" }),
    ];

    expect(filterTasksByCategory(tasks, "all").map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("filters to a single category", () => {
    const tasks = [
      buildTask({ id: "a", category: "personal" }),
      buildTask({ id: "b", category: "work" }),
      buildTask({ id: "c", category: "personal" }),
    ];

    expect(filterTasksByCategory(tasks, "personal").map((t) => t.id)).toEqual(["a", "c"]);
    expect(filterTasksByCategory(tasks, "work").map((t) => t.id)).toEqual(["b"]);
  });

  it("returns empty array when no tasks match the category", () => {
    const tasks = [buildTask({ id: "a", category: "personal" })];

    expect(filterTasksByCategory(tasks, "work")).toEqual([]);
  });
});
