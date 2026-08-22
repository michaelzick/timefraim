import { Hono } from "hono";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getErrorResponse } from "../../../apps/server/src/http/api-errors.ts";
import { requireMcpProfile } from "../../../apps/server/src/http/auth.ts";
import { createMcpServer } from "../../../apps/server/src/mcp/create-mcp-server.ts";
import { PlannerService } from "../../../apps/server/src/services/planner-service.ts";
import { withCors } from "../_shared/cors.ts";

const plannerService = new PlannerService();
const app = new Hono();
app.use("*", withCors());

function jsonRpcError(status: number, code: number, message: string) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Stateless MCP: every POST gets a fresh server + transport, so any isolate can
// answer any request and no session map is needed. Clients that send
// Mcp-Session-Id are tolerated; the server never issues one.
app.post("/mcp", async (c) => {
  let profile: "read-only" | "full-access";
  try {
    profile = requireMcpProfile(c.req.header("authorization"));
  } catch (error) {
    return jsonRpcError(401, -32001, getErrorResponse(error).message);
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await createMcpServer(plannerService, profile).connect(transport);
  return transport.handleRequest(c.req.raw);
});

app.on(["GET", "DELETE"], "/mcp", (c) => c.text("Method Not Allowed", 405, { Allow: "POST" }));

Deno.serve(app.fetch);
