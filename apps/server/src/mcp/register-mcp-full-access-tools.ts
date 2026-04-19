import {
  scheduleBlockCreateSchema,
  scheduleBlockDeleteSchema,
  scheduleBlockUpdateSchema,
  taskDuplicatePayloadSchema,
  taskInputSchema,
  timerStartSchema,
} from "@timefraim/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PlannerService } from "../services/planner-service.js";

export function registerMcpFullAccessTools(server: McpServer, plannerService: PlannerService) {
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
        structuredContent: { draft },
      };
    },
  );

  server.registerTool(
    "propose_task_duplicate",
    {
      title: "Propose task duplicate",
      description: "Create a pending draft that duplicates an existing task.",
      inputSchema: taskDuplicatePayloadSchema.shape,
    },
    async (input) => {
      const draft = await plannerService.createDraft("task.duplicate", input, "assistant");
      return {
        content: [{ type: "text", text: JSON.stringify(draft, null, 2) }],
        structuredContent: { draft },
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
        structuredContent: { draft },
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
        structuredContent: { draft },
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
        structuredContent: { draft },
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
        structuredContent: { draft },
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
        structuredContent: { draft },
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
        structuredContent: { draft },
      };
    },
  );
}
