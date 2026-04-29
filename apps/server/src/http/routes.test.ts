import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return {
    AuthenticationError,
    AuthorizationError,
    isAuthenticationError: (error: unknown) => error instanceof AuthenticationError,
    isAuthorizationError: (error: unknown) => error instanceof AuthorizationError,
    requireAuthenticatedUser: vi.fn(),
  };
});

vi.mock("./auth.js", () => ({
  ...authMock,
}));

import { registerAuthRoutes } from "./register-auth-routes.js";
import { registerIntegrationRoutes } from "./register-integration-routes.js";
import { registerPlannerRoutes } from "./register-planner-routes.js";
import { PlannerError } from "../services/planner-errors.js";
import type { PlannerService } from "../services/planner-service.js";

const { AuthenticationError, requireAuthenticatedUser } = authMock;

function createBasePlannerServiceMock() {
  return {
    applyChange: vi.fn().mockResolvedValue({ status: "applied", kind: "task.create", diffSummary: "Create task" }),
    confirmDraft: vi.fn().mockResolvedValue({ id: "draft-1" }),
    deleteOpenAiConnection: vi.fn().mockResolvedValue({ connected: false, apiKeyHint: null, model: "gpt-image-2" }),
    deleteTogglConnection: vi.fn().mockResolvedValue({ connected: false }),
    discoverTogglConnection: vi.fn().mockResolvedValue({ availableProjects: [], availableWorkspaces: [] }),
    getDayPlan: vi.fn().mockResolvedValue({ tasks: [] }),
    getIntegrationStatus: vi.fn().mockResolvedValue({
      googleConnected: true,
      googleEmail: "allowed@example.com",
      googleCalendarId: "primary",
      togglConnected: true,
      togglWorkspaceId: "workspace-1",
      togglWorkspaceName: "Personal",
      togglDefaultProjectId: "project-1",
      togglDefaultProjectName: "Deep Work",
      togglHasSavedToken: true,
      togglApiTokenHint: "••••7890",
      mcpFullAccessConfigured: true,
      mcpReadOnlyConfigured: true,
      tunnelBaseUrl: "https://example.ngrok.app",
    }),
    getOpenAiImageSettings: vi.fn().mockResolvedValue({ connected: false, apiKeyHint: null, model: "gpt-image-2" }),
    getTogglSettings: vi.fn().mockResolvedValue({ connected: true }),
    generateOpenAiImage: vi.fn().mockResolvedValue({
      imageBase64: "base64-image-data",
      mimeType: "image/png",
      revisedPrompt: null,
      model: "gpt-image-2",
    }),
    rejectDraft: vi.fn().mockResolvedValue({ id: "draft-1" }),
    saveGoogleSession: vi.fn().mockResolvedValue({ ok: true }),
    saveOpenAiConnection: vi.fn().mockResolvedValue({ connected: true, apiKeyHint: "••••1234", model: "gpt-image-2" }),
    saveTogglConnection: vi.fn().mockResolvedValue({ ok: true }),
    syncGoogleCalendar: vi.fn().mockResolvedValue([]),
  };
}

type PlannerServiceMock = ReturnType<typeof createBasePlannerServiceMock>;

function createPlannerServiceMock(overrides: Partial<PlannerServiceMock> = {}) {
  return {
    ...createBasePlannerServiceMock(),
    ...overrides,
  };
}

async function createApp(
  registerRoutes: (app: ReturnType<typeof Fastify>, service: PlannerService) => void,
  serviceOverrides: Partial<PlannerServiceMock> = {},
) {
  const app = Fastify();
  const plannerService = createPlannerServiceMock(serviceOverrides);
  registerRoutes(app, plannerService as unknown as PlannerService);
  return { app, plannerService };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("HTTP routes", () => {
  it("serves health and rejects unauthenticated auth requests", async () => {
    const { app, plannerService } = await createApp(registerAuthRoutes);
    requireAuthenticatedUser.mockRejectedValueOnce(new AuthenticationError("Missing bearer token"));

    const healthResponse = await app.inject({ method: "GET", url: "/health" });
    const authResponse = await app.inject({ method: "GET", url: "/api/auth/me" });

    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json()).toEqual({ ok: true });
    expect(authResponse.statusCode).toBe(401);
    expect(authResponse.json()).toMatchObject({
      code: "unauthenticated",
      message: "Missing bearer token",
      requestId: authResponse.headers["x-request-id"],
    });
    expect(plannerService.getIntegrationStatus).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns the signed-in auth session payload", async () => {
    const { app, plannerService } = await createApp(registerAuthRoutes);
    requireAuthenticatedUser.mockResolvedValueOnce({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: "https://example.com/avatar.png",
    });

    const response = await app.inject({ method: "GET", url: "/api/auth/me" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
        email: "allowed@example.com",
        displayName: "Allowed User",
        avatarUrl: "https://example.com/avatar.png",
      },
      integrationStatus: await plannerService.getIntegrationStatus.mock.results[0]?.value,
    });

    await app.close();
  });

  it("rejects invalid integration payloads and accepts valid Toggl config", async () => {
    const { app, plannerService } = await createApp(registerIntegrationRoutes);
    requireAuthenticatedUser.mockResolvedValue({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: null,
    });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/toggl/connect",
      payload: {},
    });
    const validResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/toggl/connect",
      payload: {
        apiToken: "test-token",
        workspaceId: "workspace-2",
        defaultProjectId: "project-7",
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toMatchObject({
      code: "invalid_input",
      requestId: invalidResponse.headers["x-request-id"],
    });
    expect(validResponse.statusCode).toBe(200);
    expect(plannerService.saveTogglConnection).toHaveBeenCalledWith("84a87ef5-f143-4b9b-9f6b-b7c608d72af0", {
      apiToken: "test-token",
      workspaceId: "workspace-2",
      defaultProjectId: "project-7",
    });

    await app.close();
  });

  it("validates OpenAI image payloads and forwards valid requests", async () => {
    const { app, plannerService } = await createApp(registerIntegrationRoutes);
    requireAuthenticatedUser.mockResolvedValue({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: null,
    });

    const invalidConnectResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/openai/connect",
      payload: {},
    });
    const validConnectResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/openai/connect",
      payload: { apiKey: "sk-test-1234" },
    });
    const validGenerateResponse = await app.inject({
      method: "POST",
      url: "/api/integrations/openai/images",
      payload: { prompt: "Paint a sunrise over the ocean." },
    });

    expect(invalidConnectResponse.statusCode).toBe(400);
    expect(validConnectResponse.statusCode).toBe(200);
    expect(validGenerateResponse.statusCode).toBe(200);
    expect(plannerService.saveOpenAiConnection).toHaveBeenCalledWith("sk-test-1234");
    expect(plannerService.generateOpenAiImage).toHaveBeenCalledWith("Paint a sunrise over the ocean.");

    await app.close();
  });

  it("rejects invalid planner payloads and accepts task creation", async () => {
    const { app, plannerService } = await createApp(registerPlannerRoutes);
    requireAuthenticatedUser.mockResolvedValue({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: null,
    });

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {},
    });
    const validResponse = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Deep work",
        notes: "Protect focus time",
        estimatedMinutes: 60,
        priority: "high",
        status: "planned",
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(validResponse.statusCode).toBe(200);
    expect(plannerService.applyChange).toHaveBeenCalledWith(
      "task.create",
      {
        title: "Deep work",
        notes: "Protect focus time",
        estimatedMinutes: 60,
        priority: "high",
        status: "planned",
      },
      "user",
      "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
    );

    await app.close();
  });

  it("maps known planner errors to structured HTTP responses", async () => {
    const taskId = "84a87ef5-f143-4b9b-9f6b-b7c608d72af0";
    const applyChange = vi
      .fn()
      .mockRejectedValue(new PlannerError("not_found", `Task ${taskId} not found`));
    const { app } = await createApp(registerPlannerRoutes, { applyChange });
    requireAuthenticatedUser.mockResolvedValue({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: null,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/tasks/${taskId}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "not_found",
      message: `Task ${taskId} not found`,
      requestId: response.headers["x-request-id"],
    });

    await app.close();
  });

  it("hides unexpected route failure details behind generic structured errors", async () => {
    const applyChange = vi
      .fn()
      .mockRejectedValue(new Error("database password leaked in stack trace"));
    const { app } = await createApp(registerPlannerRoutes, { applyChange });
    requireAuthenticatedUser.mockResolvedValue({
      id: "84a87ef5-f143-4b9b-9f6b-b7c608d72af0",
      email: "allowed@example.com",
      displayName: "Allowed User",
      avatarUrl: null,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Deep work",
        notes: "Protect focus time",
        estimatedMinutes: 60,
        priority: "high",
        status: "planned",
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "internal_error",
      message: "An unexpected server error occurred.",
      requestId: response.headers["x-request-id"],
    });
    expect(response.body).not.toContain("database password");

    await app.close();
  });
});
