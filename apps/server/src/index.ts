import "./config/load-dotenv.ts";
import cors from "@fastify/cors";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import Fastify from "fastify";
import { env } from "./config/env.ts";
import { registerHttpRoutes } from "./http/routes.ts";
import { requireMcpProfile } from "./http/auth.ts";
import { createMcpServer } from "./mcp/create-mcp-server.ts";
import { PlannerService } from "./services/planner-service.ts";

const app = Fastify({
  logger: env.NODE_ENV !== "test",
});

const plannerService = new PlannerService();
const configuredOrigins = new Set(env.APP_ORIGIN);

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) {
    return true;
  }

  if (configuredOrigins.has(origin)) {
    return true;
  }

  if (env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin);
      if (url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost")) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

const mcpSessions = new Map<
  string,
  {
    transport: StreamableHTTPServerTransport;
  }
>();

await app.register(cors, {
  origin(origin, callback) {
    callback(null, isAllowedOrigin(origin));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "Mcp-Session-Id"],
  credentials: true,
  exposedHeaders: ["Mcp-Session-Id"],
});

void registerHttpRoutes(app, plannerService);

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
      return reply.status(400).send({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: no valid MCP session was provided",
        },
        id: null,
      });
    }

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (nextSessionId) => {
          mcpSessions.set(nextSessionId, { transport: transport! });
        },
      });
      const server = createMcpServer(plannerService, profile);
      await server.connect(transport);
    }

    void reply.hijack();
    await transport.handleRequest(request.raw, reply.raw, request.body);
  } catch (error) {
    app.log.error(error);
    if (!reply.sent) {
      return reply.status(401).send({
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
  return reply.status(405).header("Allow", "POST").send("Method Not Allowed");
});

const address = await app.listen({
  port: env.PORT,
  host: env.HOST,
});

app.log.info(`TimeFraim server listening on ${address}`);
