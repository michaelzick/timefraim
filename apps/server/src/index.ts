import cors from "@fastify/cors";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { env } from "./config/env.js";
import { registerHttpRoutes } from "./http/routes.js";
import { requireMcpProfile } from "./http/auth.js";
import { createMcpServer } from "./mcp/create-mcp-server.js";
import { PlannerService } from "./services/planner-service.js";

const app = Fastify({
  logger: env.NODE_ENV !== "test",
});

const plannerService = new PlannerService();
const mcpSessions = new Map<
  string,
  {
    transport: StreamableHTTPServerTransport;
  }
>();

await app.register(cors, {
  origin: [env.APP_ORIGIN],
  credentials: true,
  exposedHeaders: ["Mcp-Session-Id"],
});

await registerHttpRoutes(app, plannerService);

app.post("/mcp", async (request, reply) => {
  try {
    const profile = requireMcpProfile(request.headers.authorization);
    const sessionIdHeader = request.headers["mcp-session-id"];
    const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId) {
      transport = mcpSessions.get(sessionId)?.transport;
    }

    if (!transport && !isInitializeRequest(request.body)) {
      reply.status(400).send({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: no valid MCP session was provided",
        },
        id: null,
      });
      return;
    }

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (nextSessionId) => {
          mcpSessions.set(nextSessionId, { transport: transport! });
        },
      });
      const server = createMcpServer(plannerService, profile);
      await server.connect(transport);
    }

    reply.hijack();
    await transport.handleRequest(request.raw, reply.raw, request.body);
  } catch (error) {
    app.log.error(error);
    if (!reply.sent) {
      reply.status(401).send({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: (error as Error).message,
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (request, reply) => {
  reply.status(405).header("Allow", "POST").send("Method Not Allowed");
});

const address = await app.listen({
  port: env.PORT,
  host: "127.0.0.1",
});

app.log.info(`TimeFraim server listening on ${address}`);
