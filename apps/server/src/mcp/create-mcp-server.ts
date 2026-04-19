import { dayQuerySchema } from "@timefraim/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMcpFullAccessTools } from "./register-mcp-full-access-tools.js";
import type { PlannerService } from "../services/planner-service.js";
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
      const dayPlan = await plannerService.getDayPlan(null, todayIsoDate());
      return {
        content: [{ type: "text", text: JSON.stringify(dayPlan.tasks, null, 2) }],
        structuredContent: { tasks: dayPlan.tasks },
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
      const dayPlan = await plannerService.getDayPlan(null, date ?? todayIsoDate());
      return {
        content: [{ type: "text", text: JSON.stringify(dayPlan.calendarEvents, null, 2) }],
        structuredContent: { calendarEvents: dayPlan.calendarEvents },
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
      const dayPlan = await plannerService.getDayPlan(null, date ?? todayIsoDate());
      return {
        content: [{ type: "text", text: JSON.stringify(dayPlan, null, 2) }],
        structuredContent: { dayPlan },
      };
    },
  );

  if (profile === "full-access") {
    registerMcpFullAccessTools(server, plannerService);
  }

  return server;
}
