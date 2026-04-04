import {
  dayQuerySchema,
  scheduleBlockCreateSchema,
  scheduleBlockDeleteSchema,
  scheduleBlockUpdateSchema,
  taskInputSchema,
  timerStartSchema,
} from "@timefraim/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlannerService } from "../services/planner-service.js";
import { todayIsoDate } from "../utils/date.js";

export function createMcpServer(plannerService: PlannerService, profile: "read-only" | "full-access") {
  const server = new McpServer(
    {
      name: `timefraim-${profile}`,
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "Return all current tasks in the planner.",
      inputSchema: {},
    },
    async () => {
      const dayPlan = await plannerService.getDayPlan(todayIsoDate());
      return {
        content: [{ type: "text", text: JSON.stringify(dayPlan.tasks, null, 2) }],
        structuredContent: dayPlan.tasks,
      };
    },
  );

  server.registerTool(
    "list_calendar_view",
    {
      title: "List calendar view",
      description: "Return the combined Google Calendar blockers for a given day.",
      inputSchema: {
        date: dayQuerySchema.shape.date.optional(),
      },
    },
    async ({ date }) => {
      const dayPlan = await plannerService.getDayPlan(date ?? todayIsoDate());
      return {
        content: [{ type: "text", text: JSON.stringify(dayPlan.calendarEvents, null, 2) }],
        structuredContent: dayPlan.calendarEvents,
      };
    },
  );

  server.registerTool(
    "get_day_plan",
    {
      title: "Get day plan",
      description: "Return the full daily planning snapshot.",
      inputSchema: {
        date: dayQuerySchema.shape.date.optional(),
      },
    },
    async ({ date }) => {
      const dayPlan = await plannerService.getDayPlan(date ?? todayIsoDate());
      return {
        content: [{ type: "text", text: JSON.stringify(dayPlan, null, 2) }],
        structuredContent: dayPlan,
      };
    },
  );

  if (profile === "full-access") {
    server.registerTool(
      "propose_task_create",
      {
        title: "Propose task create",
        description: "Create a pending draft for a new task.",
        inputSchema: taskInputSchema.shape,
      },
      async (input) => {
        const draft = await plannerService.createDraft("task.create", input, "assistant");
        return {
          content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
          structuredContent: draft,
        };
      },
    );

    server.registerTool(
      "propose_schedule_block_create",
      {
        title: "Propose schedule block create",
        description: "Create a pending draft for a new scheduled work block.",
        inputSchema: scheduleBlockCreateSchema.shape,
      },
      async (input) => {
        const draft = await plannerService.createDraft("schedule_block.create", input, "assistant");
        return {
          content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
          structuredContent: draft,
        };
      },
    );

    server.registerTool(
      "propose_schedule_block_update",
      {
        title: "Propose schedule block update",
        description: "Create a pending draft for moving or resizing a schedule block.",
        inputSchema: scheduleBlockUpdateSchema.shape,
      },
      async (input) => {
        const draft = await plannerService.createDraft("schedule_block.update", input, "assistant");
        return {
          content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
          structuredContent: draft,
        };
      },
    );

    server.registerTool(
      "propose_schedule_block_delete",
      {
        title: "Propose schedule block delete",
        description: "Create a pending draft for deleting a scheduled block.",
        inputSchema: scheduleBlockDeleteSchema.shape,
      },
      async (input) => {
        const draft = await plannerService.createDraft("schedule_block.delete", input, "assistant");
        return {
          content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
          structuredContent: draft,
        };
      },
    );

    server.registerTool(
      "confirm_draft",
      {
        title: "Confirm draft",
        description: "Apply a pending draft after explicit user approval.",
        inputSchema: {
          draftId: z.string().uuid(),
        },
      },
      async ({ draftId }) => {
        const draft = await plannerService.confirmDraft(draftId, "assistant");
        return {
          content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
          structuredContent: draft,
        };
      },
    );

    server.registerTool(
      "start_task_timer",
      {
        title: "Start task timer",
        description: "Start a Toggl-backed timer for a task by creating and applying a timer draft.",
        inputSchema: timerStartSchema.shape,
      },
      async (input) => {
        const draft = await plannerService.createDraft("timer.start", input, "assistant");
        return {
          content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
          structuredContent: draft,
        };
      },
    );

    server.registerTool(
      "stop_active_timer",
      {
        title: "Stop active timer",
        description: "Stop the currently running timer by creating a pending draft.",
        inputSchema: {},
      },
      async () => {
        const draft = await plannerService.createDraft("timer.stop", { source: "ai" }, "assistant");
        return {
          content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
          structuredContent: draft,
        };
      },
    );
  }

  return server;
}
